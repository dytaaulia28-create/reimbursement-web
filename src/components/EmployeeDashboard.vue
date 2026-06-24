<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { db, Reimbursement } from '../services/db';
import { useAuth } from '../services/auth';
import { Plus, ListFilter, FileText, CheckCircle, Clock, AlertCircle, Edit, Trash2, ChevronRight, PieChart, PlusCircle } from '@lucide/vue';
import Chart from 'chart.js/auto';

const props = defineProps<{
  userId: string;
  subView: string;
}>();

const emit = defineEmits<{
  (e: 'new-claim'): void;
  (e: 'edit-claim', reim: Reimbursement): void;
  (e: 'view-claim', reim: Reimbursement): void;
  (e: 'change-tab', tabId: string): void;
}>();

const { user } = useAuth();
const reimbursements = computed(() => {
  return db.getReimbursements().filter(r => r.employee_id === props.userId);
});

// Categories cache
const categories = computed(() => db.getCategories());
const getCategoryName = (catId: number) => {
  return categories.value.find(c => c.id === catId)?.category_name || 'Lain-lain';
};

// Calculations for metrics
const stats = computed(() => {
  const list = reimbursements.value;
  
  const totalCount = list.length;
  
  const pendingList = list.filter(r => ['pending_manager', 'pending_finance', 'pending_payment'].includes(r.status));
  const pendingCount = pendingList.length;
  const pendingVal = pendingList.reduce((acc, r) => acc + Number(r.amount), 0);
  
  const approvedList = list.filter(r => ['paid', 'archived'].includes(r.status));
  const approvedCount = approvedList.length;
  const approvedVal = approvedList.reduce((acc, r) => acc + Number(r.amount), 0);
  
  const rejectedList = list.filter(r => ['rejected_manager', 'rejected_finance'].includes(r.status));
  const rejectedCount = rejectedList.length;
  const rejectedVal = rejectedList.reduce((acc, r) => acc + Number(r.amount), 0);
  
  return {
    totalCount,
    pendingCount,
    pendingVal,
    approvedCount,
    approvedVal,
    rejectedCount,
    rejectedVal
  };
});

const showDeleteConfirm = ref(false);
const draftToDelete = ref<Reimbursement | null>(null);
const showToast = ref(false);
const toastMessage = ref('');

const handleDelete = (event: Event, reim: Reimbursement) => {
  event.stopPropagation();
  draftToDelete.value = reim;
  showDeleteConfirm.value = true;
};

const executeDelete = () => {
  if (draftToDelete.value) {
    db.deleteReimbursement(draftToDelete.value.id);
    showDeleteConfirm.value = false;
    toastMessage.value = `Draft pengajuan ${draftToDelete.value.code} berhasil dihapus.`;
    showToast.value = true;
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

const handleCardClick = (reim: Reimbursement) => {
  if (reim.status === 'draft') {
    emit('edit-claim', reim);
  } else {
    emit('view-claim', reim);
  }
};

// Search & Filter state for claims list
const searchQuery = ref('');
const filterStatus = ref('all');

const filteredReimbursements = computed(() => {
  let list = reimbursements.value;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(r => r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }
  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'proses') {
      list = list.filter(r => ['pending_manager', 'pending_finance', 'pending_payment'].includes(r.status));
    } else if (filterStatus.value === 'dibayar') {
      list = list.filter(r => ['paid', 'archived'].includes(r.status));
    } else if (filterStatus.value === 'ditolak') {
      list = list.filter(r => ['rejected_manager', 'rejected_finance'].includes(r.status));
    } else if (filterStatus.value === 'draft') {
      list = list.filter(r => r.status === 'draft');
    }
  }
  return list;
});

// Chart initialization for employee insight
let employeeChart: Chart | null = null;
const renderInsightChart = () => {
  setTimeout(() => {
    const ctx = document.getElementById('employeeInsightChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (employeeChart) employeeChart.destroy();
    
    // Group spending by category
    const catData = categories.value.map(c => {
      return reimbursements.value
        .filter(r => r.category_id === c.id && ['paid', 'archived'].includes(r.status))
        .reduce((acc, r) => acc + Number(r.amount), 0);
    });
    
    employeeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories.value.map(c => c.category_name),
        datasets: [{
          data: catData,
          backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#10B981'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Outfit', size: 11 } }
          }
        }
      }
    });
  }, 100);
};

watch(() => props.subView, (newVal) => {
  if (newVal === 'insight') {
    renderInsightChart();
  }
});

watch([() => db.getCategories(), () => db.getReimbursements()], () => {
  if (props.subView === 'insight') {
    renderInsightChart();
  }
}, { deep: true });

onMounted(() => {
  if (props.subView === 'insight') {
    renderInsightChart();
  }
});
</script>

<template>
  <div>
    <!-- SUBVIEW: BERANDA (HOME) -->
    <div v-if="subView === 'home' || !subView">
      <!-- 4 Columns Stats Grid from WhatsApp image -->
      <div class="metrics-grid-four">
        <div class="metric-card-mini">
          <div class="mini-icon blue"><FileText :size="14" /></div>
          <span class="mini-title">Total Pengajuan</span>
          <span class="mini-val">{{ stats.totalCount }}</span>
          <span class="mini-sub text-tertiary">Semua waktu</span>
        </div>
        <div class="metric-card-mini">
          <div class="mini-icon orange"><Clock :size="14" /></div>
          <span class="mini-title">Menunggu</span>
          <span class="mini-val">{{ stats.pendingCount }}</span>
          <span class="mini-sub" style="color: #F59E0B;">Rp{{ stats.pendingVal.toLocaleString('id-ID') }}</span>
        </div>
        <div class="metric-card-mini">
          <div class="mini-icon green"><CheckCircle :size="14" /></div>
          <span class="mini-title">Disetujui</span>
          <span class="mini-val">{{ stats.approvedCount }}</span>
          <span class="mini-sub" style="color: #10B981;">Rp{{ stats.approvedVal.toLocaleString('id-ID') }}</span>
        </div>
        <div class="metric-card-mini">
          <div class="mini-icon red"><AlertCircle :size="14" /></div>
          <span class="mini-title">Ditolak</span>
          <span class="mini-val">{{ stats.rejectedCount }}</span>
          <span class="mini-sub" style="color: #EF4444;">Rp{{ stats.rejectedVal.toLocaleString('id-ID') }}</span>
        </div>
      </div>

      <!-- Recent Submissions List -->
      <div class="list-section-title" style="margin-top: 24px;">
        <span>Pengajuan Reimburse</span>
        <button class="link-btn" @click="$emit('change-tab', 'claims')">
          Lihat Semua <ChevronRight :size="14" />
        </button>
      </div>

      <div v-if="reimbursements.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        Belum ada pengajuan reimbursement.
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in reimbursements.slice(0, 4)" 
          :key="reim.id" 
          class="reimb-card"
          @click="handleCardClick(reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <div class="category-icon-circle">
              <FileText :size="18" />
            </div>
            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div class="reimb-meta">
                {{ getCategoryName(reim.category_id) }} • {{ new Date(reim.transaction_date).toLocaleDateString('id-ID') }}
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <span :class="['status-pill', 'status-' + reim.status]">
              {{ db.getFriendlyStatusLabel(reim.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Cards -->
      <div class="large-action-cards" style="margin-top: 24px;">
        <div class="large-action-card" @click="$emit('new-claim')">
          <div class="action-card-icon-box blue">
            <PlusCircle :size="22" />
          </div>
          <div class="action-card-text">
            <h4>Ajukan Reimburse Baru</h4>
            <p>Upload bukti transaksi dan ajukan reimburse</p>
          </div>
          <ChevronRight :size="16" class="arrow-right" />
        </div>

        <div class="large-action-card" @click="$emit('change-tab', 'insight')">
          <div class="action-card-icon-box green">
            <CheckCircle :size="22" />
          </div>
          <div class="action-card-text">
            <h4>Insight Pengeluaran Saya</h4>
            <p>Lihat ringkasan & tren pengeluaran pribadi</p>
          </div>
          <ChevronRight :size="16" class="arrow-right" />
        </div>
      </div>
    </div>

    <!-- SUBVIEW: PENGAJUAN (CLAIMS LIST) -->
    <div v-else-if="subView === 'claims'">
      <div class="list-section-title">
        <span>Semua Pengajuan</span>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-box" style="display: flex; gap: 8px; margin-bottom: 16px;">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="form-input" 
          placeholder="Cari pengajuan..." 
          style="flex: 2; font-size: 0.8rem; padding: 8px 12px;"
        />
        <select v-model="filterStatus" class="form-select" style="flex: 1; font-size: 0.8rem; padding: 8px 12px; height: 38px;">
          <option value="all">Semua</option>
          <option value="draft">Draft</option>
          <option value="proses">Proses</option>
          <option value="dibayar">Dibayar</option>
          <option value="ditolak">Ditolak</option>
        </select>
      </div>

      <div v-if="filteredReimbursements.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Tidak ada pengajuan yang sesuai filter.
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in filteredReimbursements" 
          :key="reim.id" 
          class="reimb-card"
          @click="handleCardClick(reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <div class="category-icon-circle">
              <FileText :size="18" />
            </div>
            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div class="reimb-meta">
                {{ getCategoryName(reim.category_id) }} • {{ new Date(reim.transaction_date).toLocaleDateString('id-ID') }}
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <span :class="['status-pill', 'status-' + reim.status]">
                {{ db.getFriendlyStatusLabel(reim.status) }}
              </span>
              <!-- Show Edit and Delete buttons for Draft only -->
              <div v-if="reim.status === 'draft'" style="display: flex; gap: 4px;">
                <button 
                  class="action-circle-btn btn-edit" 
                  @click.stop="emit('edit-claim', reim)"
                  title="Edit Pengajuan"
                  style="width: 24px; height: 24px; background: rgba(30, 136, 229, 0.1); color: var(--color-employee); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                >
                  <Edit :size="12" />
                </button>
                <button 
                  v-if="reim.status === 'draft'"
                  class="action-circle-btn btn-delete" 
                  @click.stop="handleDelete($event, reim)"
                  title="Hapus Draft"
                  style="width: 24px; height: 24px; background: rgba(239, 68, 68, 0.1); color: #EF4444; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: INSIGHT (ANALYTICS) -->
    <div v-else-if="subView === 'insight'">
      <div class="list-section-title">
        <span>Insight Pengeluaran Saya</span>
      </div>

      <div class="card" style="margin-bottom: 16px; padding: 16px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <PieChart :size="16" /> Distribusi Pengeluaran (Klaim Lunas)
        </h4>
        <div style="height: 200px; position: relative; display: flex; align-items: center; justify-content: center;">
          <canvas id="employeeInsightChart" style="max-height: 180px;"></canvas>
        </div>
      </div>


    </div>

    <!-- Custom Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm && draftToDelete" class="modal-overlay" style="z-index: 1100;" @click.self="showDeleteConfirm = false">
      <div class="modal-content" style="max-width: 400px; margin: auto; border-radius: var(--radius-md); padding: 20px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: #EF4444;">Konfirmasi Hapus</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0 16px 0;">
          Apakah Anda yakin ingin menghapus draft pengajuan <strong>{{ draftToDelete.code }}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div style="display: flex; gap: 10px;">
          <button class="btn-secondary" style="flex: 1; padding: 10px;" @click="showDeleteConfirm = false">Batal</button>
          <button class="btn-primary" style="flex: 1; padding: 10px; background-color: #EF4444; box-shadow: none;" @click="executeDelete">Hapus Draft</button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="custom-toast">
      {{ toastMessage }}
    </div>
  </div>
</template>
