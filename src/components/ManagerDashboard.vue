<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { db, Reimbursement } from '../services/db';
import { Check, X, FileText, ListFilter, AlertCircle, TrendingUp, CheckCircle, PieChart, BarChart2, Users } from '@lucide/vue';
import Chart from 'chart.js/auto';

const props = defineProps<{
  userId: string;
  subView: string;
}>();

const emit = defineEmits<{
  (e: 'view-claim', reim: Reimbursement): void;
  (e: 'view-receipt', data: { receiptPath: string; code: string; checksum: string; mimeType: string; uploadedAt: string }): void;
}>();

// Get claims pending manager approval
const pendingClaims = computed(() => {
  return db.getReimbursements().filter(r => r.status === 'pending_manager');
});

// Get team summary logs
const actedClaims = computed(() => {
  const logs = db.getApprovalLogs().filter(l => l.actor_id === props.userId);
  const ids = logs.map(l => l.reimbursement_id);
  return db.getReimbursements().filter(r => ids.includes(r.id));
});

const totalPendingCount = computed(() => pendingClaims.value.length);
const totalPendingVal = computed(() => pendingClaims.value.reduce((acc, r) => acc + Number(r.amount), 0));
const totalActedCount = computed(() => actedClaims.value.length);

const teamTotalApprovedVal = computed(() => {
  // All claims that are paid or pending payment
  return db.getReimbursements()
    .filter(r => ['pending_finance', 'pending_payment', 'paid', 'archived'].includes(r.status))
    .reduce((acc, r) => acc + Number(r.amount), 0);
});

// Helper to get receipt for reimbursement
const getReceipt = (reimId: string) => {
  return db.getReceiptForReimbursement(reimId);
};

const handleReceiptClick = (event: Event, reim: Reimbursement) => {
  event.stopPropagation(); // Stop card click navigation
  const receipt = getReceipt(reim.id);
  if (receipt) {
    emit('view-receipt', {
      receiptPath: receipt.receipt_path,
      code: reim.code,
      checksum: receipt.checksum,
      mimeType: receipt.mime_type,
      uploadedAt: receipt.uploaded_at
    });
  }
};

const getEmployeeName = (empId: string) => {
  return db.getUserById(empId)?.full_name || 'Karyawan';
};

const categories = computed(() => db.getCategories());
const getCategoryName = (catId: number) => {
  return categories.value.find(c => c.id === catId)?.category_name || 'Lain-lain';
};

const showActionModal = ref(false);
const actionTargetReim = ref<Reimbursement | null>(null);
const actionType = ref<'approve' | 'reject'>('approve');
const actionNotes = ref('');
const noteError = ref('');
const showToast = ref(false);
const toastMessage = ref('');

const openActionModal = (event: Event, reim: Reimbursement, type: 'approve' | 'reject') => {
  event.stopPropagation();
  actionTargetReim.value = reim;
  actionType.value = type;
  actionNotes.value = '';
  noteError.value = '';
  showActionModal.value = true;
};

const isSubmitting = ref(false);

const submitAction = async () => {
  if (isSubmitting.value) return;
  if (!actionTargetReim.value) return;
  if (actionType.value === 'reject' && !actionNotes.value.trim()) {
    noteError.value = 'Alasan penolakan harus diisi!';
    return;
  }
  
  try {
    isSubmitting.value = true;
    const approve = actionType.value === 'approve';
    await db.actManager(actionTargetReim.value.id, props.userId, approve ? 'approved' : 'rejected', actionNotes.value);
    showActionModal.value = false;
    
    toastMessage.value = `Pengajuan ${actionTargetReim.value.code} berhasil ${approve ? 'disetujui' : 'ditolak'}.`;
    showToast.value = true;
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    console.error(err);
    noteError.value = 'Gagal menyimpan keputusan persetujuan.';
  } finally {
    isSubmitting.value = false;
  }
};

// CHART INITIALIZATION
let managerCatChart: Chart | null = null;
let managerTeamChart: Chart | null = null;

const renderCharts = () => {
  setTimeout(() => {
    const catCanvas = document.getElementById('managerCatChart') as HTMLCanvasElement;
    const teamCanvas = document.getElementById('managerTeamChart') as HTMLCanvasElement;

    if (!catCanvas || !teamCanvas) return;

    if (managerCatChart) managerCatChart.destroy();
    if (managerTeamChart) managerTeamChart.destroy();

    // 1. Category Chart Data
    const catLabels = categories.value.map(c => c.category_name);
    const catData = categories.value.map(c => {
      return db.getReimbursements()
        .filter(r => r.category_id === c.id && !['draft', 'rejected_manager', 'rejected_finance'].includes(r.status))
        .reduce((acc, r) => acc + Number(r.amount), 0);
    });

    managerCatChart = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: catLabels,
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
            labels: { font: { family: 'Outfit', size: 10 } }
          }
        }
      }
    });

    // 2. Team Spending Chart
    const employees = db.getUsers().filter(u => u.role_id === 1);
    const teamLabels = employees.map(e => e.full_name);
    const teamData = employees.map(e => {
      return db.getReimbursements()
        .filter(r => r.employee_id === e.id && !['draft', 'rejected_manager', 'rejected_finance'].includes(r.status))
        .reduce((acc, r) => acc + Number(r.amount), 0);
    });

    managerTeamChart = new Chart(teamCanvas, {
      type: 'bar',
      data: {
        labels: teamLabels,
        datasets: [{
          label: 'Total Pengajuan (Rp)',
          data: teamData,
          backgroundColor: '#2E7D32',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { font: { family: 'Outfit', size: 9 } }
          },
          x: {
            ticks: { font: { family: 'Outfit', size: 8 } }
          }
        }
      }
    });
  }, 100);
};

watch(() => props.subView, (newVal) => {
  if (newVal === 'reports') {
    renderCharts();
  }
});

watch([() => db.getCategories(), () => db.getUsers(), () => db.getReimbursements()], () => {
  if (props.subView === 'reports') {
    renderCharts();
  }
}, { deep: true });

onMounted(() => {
  if (props.subView === 'reports') {
    renderCharts();
  }
});
</script>

<template>
  <div>
    <!-- SUBVIEW: BERANDA (HOME) -->
    <div v-if="subView === 'home' || !subView">
      <!-- Manager Stats Grid -->
      <div class="metrics-grid">
        <div class="metric-card" style="border-left-color: var(--color-manager);">
          <span class="metric-title"><AlertCircle :size="12" style="vertical-align: middle;" /> Antrean Approval</span>
          <span class="metric-val">{{ totalPendingCount }} Pengajuan</span>
        </div>
        <div class="metric-card" style="border-left-color: #1565C0;">
          <span class="metric-title"><TrendingUp :size="12" style="vertical-align: middle;" /> Nominal Antrean</span>
          <span class="metric-val">Rp{{ totalPendingVal.toLocaleString('id-ID') }}</span>
        </div>
      </div>

      <!-- Quick Summary List of Pending Claims -->
      <div class="list-section-title">
        <span>Antrean Persetujuan Atasan (Terbaru)</span>
      </div>

      <div v-if="pendingClaims.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        Tidak ada antrean persetujuan reimbursement. Kerja bagus!
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in pendingClaims.slice(0, 3)" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <img 
              v-if="getReceipt(reim.id)" 
              :src="getReceipt(reim.id)?.receipt_path" 
              class="receipt-thumbnail" 
              @click="handleReceiptClick($event, reim)"
              title="Lihat struk ukuran penuh"
            />
            <div v-else class="category-icon-circle">
              <FileText :size="18" />
            </div>

            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div class="reimb-meta">
                Oleh: <strong>{{ getEmployeeName(reim.employee_id) }}</strong>
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <div class="quick-action-buttons">
              <button class="action-circle-btn btn-reject" @click="openActionModal($event, reim, 'reject')" title="Tolak">
                <X :size="14" />
              </button>
              <button class="action-circle-btn btn-approve" @click="openActionModal($event, reim, 'approve')" title="Setujui">
                <Check :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: PERSETUJUAN (QUEUE) -->
    <div v-else-if="subView === 'approvals'">
      <div class="list-section-title">
        <span>Antrean Persetujuan Atasan</span>
        <ListFilter :size="16" style="color: var(--text-secondary);" />
      </div>

      <div v-if="pendingClaims.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Tidak ada antrean persetujuan reimbursement. Kerja bagus!
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in pendingClaims" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <img 
              v-if="getReceipt(reim.id)" 
              :src="getReceipt(reim.id)?.receipt_path" 
              class="receipt-thumbnail" 
              @click="handleReceiptClick($event, reim)"
              title="Lihat struk ukuran penuh"
            />
            <div v-else class="category-icon-circle">
              <FileText :size="18" />
            </div>

            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div class="reimb-meta">
                Oleh: <strong>{{ getEmployeeName(reim.employee_id) }}</strong>
              </div>
              <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">
                {{ getCategoryName(reim.category_id) }} • {{ new Date(reim.transaction_date).toLocaleDateString('id-ID') }}
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <div class="quick-action-buttons">
              <button class="action-circle-btn btn-reject" @click="openActionModal($event, reim, 'reject')" title="Tolak">
                <X :size="14" />
              </button>
              <button class="action-circle-btn btn-approve" @click="openActionModal($event, reim, 'approve')" title="Setujui">
                <Check :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: RIWAYAT (HISTORY) -->
    <div v-else-if="subView === 'history'">
      <div class="list-section-title">
        <span>Riwayat Approval Saya</span>
      </div>

      <div v-if="actedClaims.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Belum ada riwayat persetujuan yang dicatat.
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in actedClaims" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <div class="category-icon-circle" style="background-color: rgba(46, 125, 50, 0.1); color: var(--color-manager);">
              <CheckCircle :size="18" />
            </div>
            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div class="reimb-meta">
                Oleh: <strong>{{ getEmployeeName(reim.employee_id) }}</strong>
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <span :class="['status-pill', 'status-' + reim.status]">
              {{ db.getFriendlyStatusLabel(reim.status, 2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: LAPORAN (REPORTS) -->
    <div v-else-if="subView === 'reports'">
      <div class="list-section-title">
        <span>Laporan Pengeluaran Tim</span>
      </div>

      <div class="card" style="margin-bottom: 16px; padding: 16px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <PieChart :size="16" /> Distribusi Kategori Pengeluaran Tim
        </h4>
        <div style="height: 180px; position: relative; display: flex; align-items: center; justify-content: center;">
          <canvas id="managerCatChart" style="max-height: 160px;"></canvas>
        </div>
      </div>

      <div class="card" style="padding: 16px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <BarChart2 :size="16" /> Pengeluaran per Anggota Tim
        </h4>
        <div style="height: 180px; position: relative;">
          <canvas id="managerTeamChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Custom Approval / Rejection Action Modal -->
    <div v-if="showActionModal && actionTargetReim" class="modal-overlay" style="z-index: 1100;" @click.self="showActionModal = false">
      <div class="modal-content" style="max-width: 400px; margin: auto; border-radius: var(--radius-md); padding: 20px;">
        <div class="modal-header">
          <h3 class="modal-title" :style="{ color: actionType === 'approve' ? 'var(--color-manager)' : '#EF4444' }">
            {{ actionType === 'approve' ? 'Catatan Persetujuan' : 'Alasan Penolakan' }}
          </h3>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; background: var(--theme-color-light); padding: 8px; border-radius: 4px;">
          Pengajuan: <strong>{{ actionTargetReim.code }}</strong><br>
          Nominal: <strong>Rp{{ actionTargetReim.amount.toLocaleString('id-ID') }}</strong>
        </div>
        <div class="form-group">
          <label class="form-label">{{ actionType === 'approve' ? 'Catatan (Opsional)' : 'Alasan Penolakan (Wajib)' }}</label>
          <textarea 
            v-model="actionNotes" 
            class="form-input" 
            rows="3" 
            placeholder="Masukkan catatan Anda di sini..."
            style="resize: none;"
            :disabled="isSubmitting"
          ></textarea>
          <div v-if="noteError" style="color: #EF4444; font-size: 0.7rem; font-weight: 600; margin-top: 4px;">{{ noteError }}</div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 16px;">
          <button class="btn-secondary" style="flex: 1; padding: 10px;" @click="!isSubmitting && (showActionModal = false)" :disabled="isSubmitting">Batal</button>
          <button 
            class="btn-primary" 
            style="flex: 1; padding: 10px; box-shadow: none;" 
            :style="{ backgroundColor: actionType === 'approve' ? 'var(--color-manager)' : '#EF4444' }"
            @click="submitAction"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">Memproses...</span>
            <span v-else>{{ actionType === 'approve' ? 'Setujui' : 'Tolak Pengajuan' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="custom-toast">
      {{ toastMessage }}
    </div>
  </div>
</template>
