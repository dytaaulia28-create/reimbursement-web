<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { db, User, Category, AuditLog } from '../services/db';
import { ShieldAlert, ListCollapse, Users, Tag, Check, Trash2, Edit } from '@lucide/vue';

const props = defineProps<{
  userId: string;
  subView: string;
}>();

const activeTab = ref<'categories' | 'users' | 'audit'>(
  (props.subView as any) === 'settings' ? 'categories' : (props.subView as any) || 'categories'
);

watch(() => props.subView, (newVal) => {
  if (['categories', 'users', 'audit'].includes(newVal)) {
    activeTab.value = newVal as any;
  }
}, { immediate: true });

const showConfirmModal = ref(false);
const confirmType = ref<'category' | 'user' | 'alert'>('category');
const confirmMessage = ref('');
const targetCatId = ref<number | null>(null);
const targetUserId = ref<string | null>(null);

const showToast = ref(false);
const toastMessage = ref('');

const catError = ref('');
const userError = ref('');

const triggerToast = (msg: string) => {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2000);
};


// Categories Management
const categories = computed(() => db.getCategories());
const newCatName = ref('');
const newCatGl = ref('');
const editingCatId = ref<number | null>(null);

const startEditCat = (cat: Category) => {
  editingCatId.value = cat.id;
  newCatName.value = cat.category_name;
  newCatGl.value = cat.gl_code;
  catError.value = '';
};

const cancelEditCat = () => {
  editingCatId.value = null;
  newCatName.value = '';
  newCatGl.value = '';
  catError.value = '';
};

const saveCat = async () => {
  catError.value = '';
  if (!newCatName.value.trim() || !newCatGl.value.trim()) {
    catError.value = 'Nama Kategori dan Kode GL harus diisi.';
    return;
  }
  if (editingCatId.value !== null) {
    await db.updateCategory(editingCatId.value, {
      category_name: newCatName.value.trim(),
      gl_code: newCatGl.value.trim()
    });
    triggerToast('Kategori berhasil diperbarui.');
  } else {
    await db.addCategory({
      category_name: newCatName.value.trim(),
      gl_code: newCatGl.value.trim()
    });
    triggerToast('Kategori berhasil ditambahkan.');
  }
  cancelEditCat();
};

const deleteCat = (id: number) => {
  confirmType.value = 'category';
  targetCatId.value = id;
  confirmMessage.value = 'Apakah Anda yakin ingin menghapus kategori ini?';
  showConfirmModal.value = true;
};

// Users management
const users = computed(() => db.getUsers());
const roles = computed(() => db.getRoles());
const depts = computed(() => db.getDepartments());

const getRoleName = (roleId: number) => {
  return roles.value.find(r => r.id === roleId)?.role_name || '-';
};

const getDeptName = (deptId?: number) => {
  if (!deptId) return '-';
  return depts.value.find(d => d.id === deptId)?.department_name || '-';
};

// User Form Refs
const editingUserId = ref<string | null>(null);
const formUserId = ref('');
const formUserFullName = ref('');
const formUserEmail = ref('');
const formUserPassword = ref('');
const formUserRoleId = ref(1);
const formUserDeptId = ref<number | undefined>(1);
const formUserStatus = ref<'active' | 'inactive'>('active');

const startEditUser = (u: User) => {
  editingUserId.value = u.id;
  formUserId.value = u.id;
  formUserFullName.value = u.full_name;
  formUserEmail.value = u.email;
  formUserPassword.value = u.password || '';
  formUserRoleId.value = u.role_id;
  formUserDeptId.value = u.department_id;
  formUserStatus.value = u.status;
  userError.value = '';

  // Scroll the app body back to the top so the form is visible
  const bodyEl = document.querySelector('.app-body');
  if (bodyEl) {
    bodyEl.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const cancelEditUser = () => {
  editingUserId.value = null;
  formUserId.value = '';
  formUserFullName.value = '';
  formUserEmail.value = '';
  formUserPassword.value = '';
  formUserRoleId.value = 1;
  formUserDeptId.value = 1;
  formUserStatus.value = 'active';
  userError.value = '';
};

const saveUser = async () => {
  userError.value = '';
  if (!formUserFullName.value.trim() || !formUserEmail.value.trim()) {
    userError.value = 'Nama Lengkap dan Email harus diisi.';
    return;
  }
  if (!formUserPassword.value.trim()) {
    userError.value = 'Password harus diisi.';
    return;
  }
  
  const deptIdVal = formUserDeptId.value;
  let parsedDeptId: number | undefined = undefined;
  if (deptIdVal !== undefined && deptIdVal !== null && String(deptIdVal) !== 'undefined' && String(deptIdVal) !== '') {
    parsedDeptId = Number(deptIdVal);
  }

  if (editingUserId.value !== null) {
    await db.updateUser(editingUserId.value, {
      full_name: formUserFullName.value.trim(),
      email: formUserEmail.value.trim(),
      password: formUserPassword.value.trim(),
      role_id: Number(formUserRoleId.value),
      department_id: parsedDeptId,
      status: formUserStatus.value
    });
    triggerToast('Pengguna berhasil diperbarui.');
  } else {
    const id = formUserId.value.trim();
    if (!id) {
      userError.value = 'ID Pengguna harus diisi.';
      return;
    }
    const exists = db.getUserById(id);
    if (exists) {
      userError.value = 'ID Pengguna sudah terdaftar di sistem.';
      return;
    }
    
    await db.addUser({
      id,
      full_name: formUserFullName.value.trim(),
      email: formUserEmail.value.trim(),
      password: formUserPassword.value.trim(),
      role_id: Number(formUserRoleId.value),
      department_id: parsedDeptId,
      status: 'active'
    });
    triggerToast('Pengguna berhasil ditambahkan.');
  }
  cancelEditUser();
};

const deleteUser = (id: string) => {
  if (id === props.userId) {
    confirmType.value = 'alert';
    confirmMessage.value = 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.';
    showConfirmModal.value = true;
    return;
  }
  confirmType.value = 'user';
  targetUserId.value = id;
  confirmMessage.value = `Apakah Anda yakin ingin menghapus pengguna dengan ID ${id}?`;
  showConfirmModal.value = true;
};

const submitConfirm = async () => {
  if (confirmType.value === 'category' && targetCatId.value !== null) {
    await db.deleteCategory(targetCatId.value);
    triggerToast('Kategori berhasil dihapus.');
  } else if (confirmType.value === 'user' && targetUserId.value !== null) {
    await db.deleteUser(targetUserId.value);
    triggerToast('Pengguna berhasil dihapus.');
  }
  showConfirmModal.value = false;
};

// Audit logs
const auditLogs = computed<AuditLog[]>(() => {
  return db.getAuditLogs();
});
</script>

<template>
  <div>
    <!-- Tab Selector (Admin) -->
    <div style="display: flex; background-color: #E2E8F0; padding: 4px; border-radius: var(--radius-sm); margin-bottom: 16px; overflow-x: auto; gap: 4px;">
      <button 
        style="flex: 1; padding: 8px 6px; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
        :style="activeTab === 'categories' ? { backgroundColor: 'white', color: 'var(--color-admin)', boxShadow: 'var(--shadow-sm)' } : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }"
        @click="activeTab = 'categories'"
      >
        Kategori ({{ categories.length }})
      </button>
      <button 
        style="flex: 1; padding: 8px 6px; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
        :style="activeTab === 'users' ? { backgroundColor: 'white', color: 'var(--color-admin)', boxShadow: 'var(--shadow-sm)' } : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }"
        @click="activeTab = 'users'"
      >
        Pengguna ({{ users.length }})
      </button>
      <button 
        style="flex: 1; padding: 8px 6px; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
        :style="activeTab === 'audit' ? { backgroundColor: 'white', color: 'var(--color-admin)', boxShadow: 'var(--shadow-sm)' } : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }"
        @click="activeTab = 'audit'"
      >
        Audit Log
      </button>
    </div>

    <!-- 2. CATEGORIES EDITOR -->
    <div v-if="activeTab === 'categories'">
      <div class="list-section-title">
        <span>Kelola Kategori Pengeluaran</span>
        <Tag :size="16" />
      </div>

      <!-- Add/Edit Category Form -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border-left: 4px solid var(--color-admin);">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-admin); letter-spacing: 0.5px;">
          {{ editingCatId !== null ? 'EDIT KATEGORI' : 'TAMBAH KATEGORI BARU' }}
        </span>
        <div style="display: flex; gap: 8px;">
          <input v-model="newCatName" type="text" class="form-input" placeholder="Nama Kategori (contoh: Internet)" style="flex: 2; padding: 8px;" />
          <input v-model="newCatGl" type="text" class="form-input" placeholder="Kode GL (contoh: 5006-NET)" style="flex: 1; padding: 8px;" />
        </div>
        <div v-if="catError" style="color: #EF4444; font-size: 0.7rem; font-weight: 600; margin-top: 2px;">{{ catError }}</div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" style="background-color: var(--color-admin); padding: 8px; font-size: 0.8rem; box-shadow: none; flex: 1;" @click="saveCat">
            {{ editingCatId !== null ? 'Simpan Perubahan' : 'Tambah Kategori' }}
          </button>
          <button v-if="editingCatId !== null" class="btn-secondary" style="padding: 8px; font-size: 0.8rem; flex: 1;" @click="cancelEditCat">
            Batal
          </button>
        </div>
      </div>

      <!-- Categories List -->
      <div class="reimbursement-list" style="margin-top: 10px;">
        <div v-for="cat in categories" :key="cat.id" class="reimb-card" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
          <div class="reimb-card-left">
            <div class="category-icon-circle" style="width: 32px; height: 32px; background-color: var(--theme-color-light); color: var(--color-admin);">
              <Tag :size="14" />
            </div>
            <div class="reimb-info">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">{{ cat.category_name }}</span>
              <span style="font-size: 0.7rem; font-family: monospace; color: var(--text-tertiary);">{{ cat.gl_code }}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button 
              style="border: none; background: rgba(71, 85, 105, 0.1); color: var(--color-admin); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
              @click="startEditCat(cat)"
              title="Edit Kategori"
            >
              <Edit :size="12" />
            </button>
            <button 
              style="border: none; background: rgba(239, 68, 68, 0.1); color: #EF4444; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
              @click="deleteCat(cat.id)"
              title="Hapus Kategori"
            >
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. USERS MANAGEMENT -->
    <div v-if="activeTab === 'users'">
      <div class="list-section-title">
        <span>Pengguna Sistem (RBAC)</span>
        <Users :size="16" />
      </div>

      <!-- Add/Edit User Form -->
      <div class="card" style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border-left: 4px solid var(--color-admin); margin-bottom: 12px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-admin); letter-spacing: 0.5px;">
          {{ editingUserId !== null ? 'EDIT ANGGOTA / JABATAN' : 'TAMBAH ANGGOTA BARU' }}
        </span>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <input 
              v-model="formUserId" 
              type="text" 
              class="form-input" 
              placeholder="ID (contoh: K0002)" 
              :disabled="editingUserId !== null"
              style="padding: 8px; flex: 1;" 
            />
            <input 
              v-model="formUserFullName" 
              type="text" 
              class="form-input" 
              placeholder="Nama Lengkap" 
              style="padding: 8px; flex: 2;" 
            />
          </div>
          <input 
            v-model="formUserEmail" 
            type="email" 
            class="form-input" 
            placeholder="Email (contoh: budi@reimhub.com)" 
            style="padding: 8px;" 
          />
          <input 
            v-model="formUserPassword" 
            type="password" 
            class="form-input" 
            placeholder="Password" 
            style="padding: 8px;" 
          />
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">Role</label>
              <select v-model="formUserRoleId" class="form-input" style="padding: 6px 8px; font-size: 0.75rem; height: 32px;">
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.role_name }}</option>
              </select>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">Divisi</label>
              <select v-model="formUserDeptId" class="form-input" style="padding: 6px 8px; font-size: 0.75rem; height: 32px;">
                <option :value="undefined">-</option>
                <option v-for="d in depts" :key="d.id" :value="d.id">{{ d.department_name }}</option>
              </select>
            </div>
            <div v-if="editingUserId !== null" style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              <label style="font-size: 0.65rem; font-weight: bold; color: var(--text-secondary);">Status</label>
              <select v-model="formUserStatus" class="form-input" style="padding: 6px 8px; font-size: 0.75rem; height: 32px;">
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>
        <div v-if="userError" style="color: #EF4444; font-size: 0.7rem; font-weight: 600; margin-top: 4px; padding-left: 2px;">{{ userError }}</div>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button class="btn-primary" style="background-color: var(--color-admin); padding: 8px; font-size: 0.8rem; box-shadow: none; flex: 1;" @click="saveUser">
            {{ editingUserId !== null ? 'Simpan Anggota' : 'Tambah Anggota' }}
          </button>
          <button class="btn-secondary" style="padding: 8px; font-size: 0.8rem; flex: 1;" @click="cancelEditUser">
            Batal / Reset
          </button>
        </div>
      </div>

      <!-- Users List -->
      <div class="reimbursement-list">
        <div v-for="user in users" :key="user.id" class="reimb-card" style="padding: 12px; align-items: flex-start; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">{{ user.full_name }}</span>
              <span style="font-size: 0.65rem; font-family: monospace; color: var(--text-tertiary);">({{ user.id }})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span 
                style="padding: 2px 8px; font-size: 0.65rem; font-weight: 600; border-radius: 4px;"
                :style="user.status === 'active' ? { color: '#10B981', background: '#E8F5E9' } : { color: '#EF4444', background: '#FEF2F2' }"
              >
                {{ user.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </div>
          
          <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px; width: 100%;">
            <div>Email: <strong style="color: var(--text-primary);">{{ user.email }}</strong></div>
            <div>Role: <span class="role-badge" style="margin-top: 0; padding: 1px 6px;">{{ getRoleName(user.role_id) }}</span></div>
            <div>Divisi: <strong style="color: var(--text-primary);">{{ getDeptName(user.department_id) }}</strong></div>
          </div>

          <div style="display: flex; gap: 8px; width: 100%; border-top: 1px solid var(--border-color); padding-top: 8px; justify-content: flex-end;">
            <button 
              class="link-btn" 
              style="color: var(--color-admin); font-size: 0.7rem;"
              @click="startEditUser(user)"
            >
              <Edit :size="12" /> Edit Info
            </button>
            <button 
              v-if="user.id !== props.userId"
              class="link-btn" 
              style="color: #EF4444; font-size: 0.7rem;"
              @click="deleteUser(user.id)"
            >
              <Trash2 :size="12" /> Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. SYSTEM AUDIT TRAIL -->
    <div v-if="activeTab === 'audit'">
      <div class="list-section-title">
        <span>Audit Trail (Immutable Logs)</span>
        <ShieldAlert :size="16" />
      </div>

      <div class="audit-list">
        <div v-for="log in auditLogs" :key="log.id" class="audit-item">
          <div class="audit-meta">
            <span class="audit-action">{{ log.action }}</span>
            <span>{{ new Date(log.created_at).toLocaleTimeString('id-ID') }}</span>
          </div>
          <div class="audit-detail">{{ (log as any).detail || `Aksi pada ${log.entity} ID: ${log.entity_id}` }}</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.6rem; color: var(--text-tertiary); margin-top: 4px;">
            <span>Aktor: <strong>{{ log.actor_name || 'System' }}</strong></span>
            <span>IP: {{ log.ip_address }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" style="z-index: 1100;" @click.self="showConfirmModal = false">
      <div class="modal-content" style="max-width: 400px; margin: auto; border-radius: var(--radius-md); padding: 20px;">
        <div class="modal-header">
          <h3 class="modal-title" :style="{ color: confirmType === 'alert' ? 'var(--text-primary)' : '#EF4444' }">
            {{ confirmType === 'alert' ? 'Pemberitahuan' : 'Konfirmasi Tindakan' }}
          </h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 16px 0;">
          {{ confirmMessage }}
        </p>
        <div style="display: flex; gap: 10px;">
          <button v-if="confirmType !== 'alert'" class="btn-secondary" style="flex: 1; padding: 10px;" @click="showConfirmModal = false">Batal</button>
          <button v-if="confirmType !== 'alert'" class="btn-primary" style="flex: 1; padding: 10px; background-color: #EF4444; box-shadow: none;" @click="submitConfirm">Ya, Hapus</button>
          <button v-else class="btn-primary" style="flex: 1; padding: 10px; background-color: var(--color-admin); box-shadow: none;" @click="showConfirmModal = false">OK</button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="custom-toast">
      {{ toastMessage }}
    </div>
  </div>
</template>
