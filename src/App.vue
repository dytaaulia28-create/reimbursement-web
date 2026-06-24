<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useAuth } from './services/auth';
import { db, Reimbursement } from './services/db';

// Import Layout / Common Components
import AppHeader from './components/AppHeader.vue';
import LoginSignup from './components/LoginSignup.vue';

// Import Role Dashboards
import EmployeeDashboard from './components/EmployeeDashboard.vue';
import ManagerDashboard from './components/ManagerDashboard.vue';
import FinanceDashboard from './components/FinanceDashboard.vue';
import TreasuryDashboard from './components/TreasuryDashboard.vue';
import AdminDashboard from './components/AdminDashboard.vue';

// Import Modals
import ClaimModal from './components/ClaimModal.vue';
import PaymentModal from './components/PaymentModal.vue';
import DetailModal from './components/DetailModal.vue';
import ReceiptViewer from './components/ReceiptViewer.vue';
import ArchiveViewer from './components/ArchiveViewer.vue';

// Import Icons for Navigation
import { 
  Home, ClipboardList, CheckSquare, ShieldCheck, CreditCard, Settings, User, Plus,
  Clock, BarChart2, FileText, Users, Activity, PlusCircle, AlertCircle
} from '@lucide/vue';

const { user, activeRoleId, activeRoleName } = useAuth();

// Modal States
const showClaimModal = ref(false);
const editingReimbursement = ref<Reimbursement | undefined>(undefined);

const showPaymentModal = ref(false);
const payingReimbursement = ref<Reimbursement | undefined>(undefined);

const showDetailModal = ref(false);
const detailedReimbursement = ref<Reimbursement | undefined>(undefined);

const showReceiptViewer = ref(false);
const zoomReceipt = ref<{ receipt_path: string; code: string; checksum: string; mime_type: string; uploaded_at: string } | undefined>(undefined);

const showArchiveViewer = ref(false);
const archiveReimbursement = ref<Reimbursement | undefined>(undefined);

const handleViewArchive = (reim: Reimbursement) => {
  archiveReimbursement.value = reim;
  showArchiveViewer.value = true;
};

// Active Tab inside dashboards (driven by Bottom Nav)
const activeSubView = ref('home');

// Triggered when active role switches
watch(activeRoleId, (newRole) => {
  activeSubView.value = 'home';
  updateThemeColors(newRole);
});

const updateThemeColors = (roleId: number | null) => {
  const root = document.documentElement;
  if (roleId === 1) { // Employee
    root.style.setProperty('--theme-color', 'var(--color-employee)');
    root.style.setProperty('--theme-color-light', 'rgba(30, 136, 229, 0.1)');
    root.style.setProperty('--theme-color-hover', '#1565C0');
  } else if (roleId === 2) { // Manager
    root.style.setProperty('--theme-color', 'var(--color-manager)');
    root.style.setProperty('--theme-color-light', 'rgba(46, 125, 50, 0.1)');
    root.style.setProperty('--theme-color-hover', '#1B5E20');
  } else if (roleId === 3) { // Finance
    root.style.setProperty('--theme-color', 'var(--color-finance)');
    root.style.setProperty('--theme-color-light', 'rgba(94, 53, 177, 0.1)');
    root.style.setProperty('--theme-color-hover', '#4527A0');
  } else if (roleId === 4) { // Treasury
    root.style.setProperty('--theme-color', 'var(--color-treasury)');
    root.style.setProperty('--theme-color-light', 'rgba(0, 137, 123, 0.1)');
    root.style.setProperty('--theme-color-hover', '#004D40');
  } else if (roleId === 5) { // Admin
    root.style.setProperty('--theme-color', 'var(--color-admin)');
    root.style.setProperty('--theme-color-light', 'rgba(71, 85, 105, 0.1)');
    root.style.setProperty('--theme-color-hover', '#334155');
  }
};

// Handlers for Claim Modals
const openNewClaim = () => {
  editingReimbursement.value = undefined;
  showClaimModal.value = true;
};

const openEditClaim = (reim: Reimbursement) => {
  editingReimbursement.value = reim;
  showClaimModal.value = true;
};

const openViewClaim = (reim: Reimbursement) => {
  detailedReimbursement.value = reim;
  showDetailModal.value = true;
};

const openReceiptZoom = (data: any) => {
  zoomReceipt.value = data;
  showReceiptViewer.value = true;
};

const openPayClaim = (reim: Reimbursement) => {
  payingReimbursement.value = reim;
  showPaymentModal.value = true;
};

// Refresh & Gesture Management
const forceRefresh = ref(0);
const handleDataChanged = async () => {
  await db.refresh();
  forceRefresh.value++;
};

const isRefreshing = ref(false);
const pullDistance = ref(0);
const startY = ref(0);
const pullThreshold = 65;

const handleTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value) return;
  const bodyEl = document.querySelector('.app-body');
  if (bodyEl && bodyEl.scrollTop === 0) {
    startY.value = e.touches[0].clientY;
  } else {
    startY.value = -1;
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (startY.value === -1 || isRefreshing.value) return;
  const currentY = e.touches[0].clientY;
  const diff = currentY - startY.value;
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.4, pullThreshold + 20);
  }
};

const handleTouchEnd = () => {
  if (startY.value === -1 || isRefreshing.value) return;
  if (pullDistance.value >= pullThreshold) {
    triggerRefresh();
  } else {
    pullDistance.value = 0;
  }
  startY.value = -1;
};

const triggerRefresh = async () => {
  isRefreshing.value = true;
  pullDistance.value = pullThreshold;
  
  await db.refresh();
  
  forceRefresh.value++;
  isRefreshing.value = false;
  pullDistance.value = 0;
};

const handleTabClick = (tabId: string) => {
  if (tabId === 'home') {
    activeSubView.value = 'home';
    triggerRefresh();
  } else {
    activeSubView.value = tabId;
  }
};

// Live clock
const currentTime = ref(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
let clockInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  updateThemeColors(activeRoleId.value);
  clockInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, 1000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
});

const iconMap: Record<string, any> = {
  Home,
  ClipboardList,
  CheckSquare,
  ShieldCheck,
  CreditCard,
  Settings,
  User,
  Plus,
  Clock,
  BarChart2,
  FileText,
  Users,
  Activity,
  PlusCircle
};

interface TabItem {
  id: string;
  label: string;
  icon: string;
  isFab?: boolean;
  badge?: boolean;
}

const getTabsForRole = (roleId: number): TabItem[] => {
  if (roleId === 1) { // Karyawan
    return [
      { id: 'home', label: 'Beranda', icon: 'Home' },
      { id: 'claims', label: 'Pengajuan', icon: 'ClipboardList' },
      { id: 'ajukan', label: 'Ajukan', icon: 'PlusCircle', isFab: true },
      { id: 'insight', label: 'Insight', icon: 'BarChart2' },
      { id: 'profile', label: 'Profil', icon: 'User' }
    ];
  } else if (roleId === 2) { // Atasan
    return [
      { id: 'home', label: 'Beranda', icon: 'Home' },
      { id: 'approvals', label: 'Persetujuan', icon: 'CheckSquare', badge: true },
      { id: 'history', label: 'Riwayat', icon: 'Clock' },
      { id: 'reports', label: 'Laporan', icon: 'BarChart2' },
      { id: 'profile', label: 'Profil', icon: 'User' }
    ];
  } else if (roleId === 3) { // Finance
    return [
      { id: 'home', label: 'Beranda', icon: 'Home' },
      { id: 'verification', label: 'Verifikasi', icon: 'ShieldCheck', badge: true },
      { id: 'voucher', label: 'Voucher', icon: 'FileText' },
      { id: 'reports', label: 'Laporan', icon: 'BarChart2' },
      { id: 'profile', label: 'Profil', icon: 'User' }
    ];
  } else if (roleId === 4) { // Treasury
    return [
      { id: 'home', label: 'Beranda', icon: 'Home' },
      { id: 'queue', label: 'Payment Queue', icon: 'CreditCard', badge: true },
      { id: 'history', label: 'Riwayat', icon: 'Clock' },
      { id: 'accounts', label: 'Rekening', icon: 'CreditCard' },
      { id: 'profile', label: 'Profil', icon: 'User' }
    ];
  } else { // Admin
    return [
      { id: 'home', label: 'Beranda', icon: 'Home' },
      { id: 'settings', label: 'Pengaturan', icon: 'Settings' },
      { id: 'users', label: 'Pengguna', icon: 'Users' },
      { id: 'audit', label: 'Audit Log', icon: 'Activity' },
      { id: 'profile', label: 'Profil', icon: 'User' }
    ];
  }
};

const getBadgeCount = (tabId: string) => {
  if (tabId === 'approvals') {
    return db.getReimbursements().filter(r => r.status === 'pending_manager').length;
  }
  if (tabId === 'verification') {
    return db.getReimbursements().filter(r => r.status === 'pending_finance').length;
  }
  if (tabId === 'queue') {
    return db.getReimbursements().filter(r => r.status === 'pending_payment').length;
  }
  return 0;
};
</script>

<template>
  <div class="app-container" :key="forceRefresh">
    <!-- Camera Notch bezel -->
    <div class="app-notch"></div>

    <!-- Phone Status Bar with Clock -->
    <div class="phone-status-bar">
      <span class="status-bar-time">{{ currentTime }}</span>
    </div>

    <!-- Main View Canvas -->
    <main 
      class="app-body"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Pull-to-refresh indicator -->
      <div 
        v-if="user"
        class="pull-to-refresh-indicator" 
        :style="{ 
          height: pullDistance + 'px', 
          opacity: pullDistance > 10 ? 1 : 0, 
          transition: startY === -1 ? 'height 0.3s ease, opacity 0.3s ease' : 'none' 
        }"
      >
        <div v-if="isRefreshing" class="ptr-spinner"></div>
        <span v-else class="ptr-text" style="font-size: 0.7rem;">
          {{ pullDistance >= pullThreshold ? 'Lepaskan untuk Refresh' : 'Tarik untuk Refresh' }}
        </span>
      </div>

      <!-- Connection Error Banner -->
      <div v-if="db.dbError.value" style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-md); padding: 12px; margin: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 0.75rem; color: #991B1B; animation: fadeIn 0.3s ease;">
        <div style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
          <AlertCircle :size="16" /> Koneksi Database Supabase Gagal
        </div>
        <div>
          Gagal terhubung ke database. Proyek Supabase Anda mungkin dinonaktifkan (paused) karena masa aktif gratis habis, atau ada gangguan internet.
        </div>
        <div style="font-family: monospace; font-size: 0.65rem; background: rgba(0,0,0,0.05); padding: 4px; border-radius: 4px; overflow: auto; max-height: 50px;">
          Error: {{ db.dbError.value }}
        </div>
        <button class="btn-primary" style="background-color: #EF4444; padding: 6px 12px; font-size: 0.7rem; align-self: flex-end; box-shadow: none;" @click="db.refresh()">
          Coba Hubungkan Ulang
        </button>
      </div>

      <!-- If not logged in, display Login/Sign-up screen -->
      <div v-if="!user">
        <LoginSignup />
      </div>

      <!-- If logged in, show authenticated workspaces -->
      <div v-else>
        <!-- App Profile Header -->
        <AppHeader />

        <!-- Profile View (Alternative View) -->
        <div v-if="activeSubView === 'profile'" class="card" style="margin-top: 10px; display: flex; flex-direction: column; gap: 12px; animation: slideUp 0.2s;">
          <div style="text-align: center; padding: 12px 0;">
            <div class="avatar" style="width: 72px; height: 72px; font-size: 1.8rem; margin: 0 auto 12px auto;">
              {{ user ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U' }}
            </div>
            <h3 style="font-weight: 700;">{{ user?.full_name }}</h3>
            <span class="role-badge">{{ activeRoleName }}</span>
          </div>
          <div class="detail-item">
            <div class="detail-label">Email</div>
            <div class="detail-value">{{ user?.email }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status Akun</div>
            <div class="detail-value" style="color: #10B981; font-weight: bold;">{{ user?.status.toUpperCase() }}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Perusahaan</div>
            <div class="detail-value">PT HONOUR LANE SHIPPING</div>
          </div>
        </div>

        <!-- ACTIVE ROLE DASHBOARD VIEW -->
        <div v-else>
          <!-- 1. Employee Dashboard -->
          <EmployeeDashboard 
            v-if="activeRoleId === 1" 
            :user-id="user?.id || ''"
            :sub-view="activeSubView"
            @new-claim="openNewClaim"
            @edit-claim="openEditClaim"
            @view-claim="openViewClaim"
            @change-tab="activeSubView = $event"
          />

          <!-- 2. Manager Dashboard -->
          <ManagerDashboard 
            v-else-if="activeRoleId === 2" 
            :user-id="user?.id || ''"
            :sub-view="activeSubView"
            @view-claim="openViewClaim"
            @view-receipt="openReceiptZoom"
          />

          <!-- 3. Finance Dashboard -->
          <FinanceDashboard 
            v-else-if="activeRoleId === 3" 
            :user-id="user?.id || ''"
            :sub-view="activeSubView"
            @view-claim="openViewClaim"
            @view-receipt="openReceiptZoom"
          />

          <!-- 4. Treasury Dashboard -->
          <TreasuryDashboard 
            v-else-if="activeRoleId === 4" 
            :user-id="user?.id || ''"
            :sub-view="activeSubView"
            @pay-claim="openPayClaim"
            @view-claim="openViewClaim"
          />

          <!-- 5. Admin Dashboard -->
          <AdminDashboard 
            v-else-if="activeRoleId === 5" 
            :user-id="user?.id || ''"
            :sub-view="activeSubView"
          />
        </div>
      </div>
    </main>

    <!-- BOTTOM TAB NAVIGATION -->
    <nav v-if="user" class="bottom-nav">
      <template v-for="tab in getTabsForRole(activeRoleId || 1)" :key="tab.id">
        <!-- Floating FAB button in center for Ajukan -->
        <div v-if="tab.isFab" class="fab-container">
          <button class="fab-btn" @click="openNewClaim" title="Ajukan Reimbursement">
            <Plus />
          </button>
        </div>
        
        <!-- Standard Tab Button -->
        <div 
          v-else
          class="nav-item" 
          :class="{ active: activeSubView === tab.id }"
          @click="handleTabClick(tab.id)"
        >
          <component :is="iconMap[tab.icon]" class="nav-icon" />
          <span>{{ tab.label }}</span>
          
          <!-- Red Badge Counter -->
          <div v-if="tab.badge && getBadgeCount(tab.id) > 0" class="badge-counter" style="top: -6px; right: 10px;">
            {{ getBadgeCount(tab.id) }}
          </div>
        </div>
      </template>
    </nav>

    <!-- SYSTEM MODALS CONTAINER -->

    <!-- Claim Modal (Create / Edit) -->
    <ClaimModal 
      :show="showClaimModal"
      :reimbursement="editingReimbursement"
      :employee-id="user?.id || ''"
      @close="showClaimModal = false"
      @saved="handleDataChanged"
    />

    <!-- Payment Execution Modal -->
    <PaymentModal 
      :show="showPaymentModal"
      :reimbursement="payingReimbursement"
      :treasury-id="user?.id || ''"
      @close="showPaymentModal = false"
      @paid="handleDataChanged"
    />

    <!-- Claim Details Modal -->
    <DetailModal 
      :show="showDetailModal"
      :reimbursement="detailedReimbursement"
      @close="showDetailModal = false"
      @view-archive="handleViewArchive"
    />

    <!-- Receipt Zoom Modal -->
    <ReceiptViewer 
      v-if="showReceiptViewer"
      :receipt="(zoomReceipt as any)"
      :code="zoomReceipt ? zoomReceipt.code : ''"
      @close="showReceiptViewer = false"
    />

    <!-- E-Archive Viewer Modal -->
    <ArchiveViewer
      :show="showArchiveViewer"
      :reimbursement="archiveReimbursement"
      @close="showArchiveViewer = false"
    />
  </div>
</template>
