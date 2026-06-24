<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { db, Reimbursement } from '../services/db';
import { Check, X, FileText, ListFilter, AlertCircle, BarChart2, PieChart, Download, ArrowUpRight, TrendingUp, BookOpen } from '@lucide/vue';
import Chart from 'chart.js/auto';

const props = defineProps<{
  userId: string;
  subView: string;
}>();

const emit = defineEmits<{
  (e: 'view-claim', reim: Reimbursement): void;
  (e: 'view-receipt', data: { receiptPath: string; code: string; checksum: string; mimeType: string; uploadedAt: string }): void;
}>();

// Finance queue: pending finance verification
const queueClaims = computed(() => {
  return db.getReimbursements().filter(r => r.status === 'pending_finance');
});

// All reimbursements for analytics
const allClaims = computed(() => db.getReimbursements());

// Paid/verified claims for Journal Vouchers
const voucherClaims = computed(() => {
  return allClaims.value.filter(r => ['pending_payment', 'paid', 'archived'].includes(r.status));
});

// KPI Calculations
const totalVerifiedVal = computed(() => {
  return voucherClaims.value.reduce((acc, r) => acc + Number(r.amount), 0);
});

const totalPendingVal = computed(() => {
  return queueClaims.value.reduce((acc, r) => acc + Number(r.amount), 0);
});

// Get receipt info
const getReceipt = (reimId: string) => {
  return db.getReceiptForReimbursement(reimId);
};

const handleReceiptClick = (event: Event, reim: Reimbursement) => {
  event.stopPropagation();
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
const actionType = ref<'verify' | 'reject'>('verify');
const actionNotes = ref('');
const noteError = ref('');
const showToast = ref(false);
const toastMessage = ref('');

const openActionModal = (event: Event, reim: Reimbursement, type: 'verify' | 'reject') => {
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
  
  try {
    isSubmitting.value = true;
    const verify = actionType.value === 'verify';
    await db.actFinance(actionTargetReim.value.id, props.userId, verify ? 'verified' : 'rejected', actionNotes.value.trim() || '');
    showActionModal.value = false;
    
    toastMessage.value = `Pengajuan ${actionTargetReim.value.code} ${verify ? 'terverifikasi' : 'ditolak'}.`;
    showToast.value = true;
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    console.error(err);
    noteError.value = 'Gagal menyimpan keputusan verifikasi.';
  } finally {
    isSubmitting.value = false;
  }
};

// Report Export Simulation
const exportReport = () => {
  const headers = ['Kode', 'Tanggal', 'Karyawan', 'Kategori', 'Deskripsi', 'Nominal', 'Status'];
  const rows = allClaims.value.map(r => [
    r.code,
    r.transaction_date,
    getEmployeeName(r.employee_id),
    getCategoryName(r.category_id),
    r.description,
    r.amount,
    r.status
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ReimHub_Laporan_Finance_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


// CHART INITIALIZATION
let catChartInstance: Chart | null = null;
let deptChartInstance: Chart | null = null;

const renderCharts = () => {
  setTimeout(() => {
    const catCanvas = document.getElementById('catChart') as HTMLCanvasElement;
    const deptCanvas = document.getElementById('deptChart') as HTMLCanvasElement;

    if (!catCanvas || !deptCanvas) return;

    if (catChartInstance) catChartInstance.destroy();
    if (deptChartInstance) deptChartInstance.destroy();

    const catLabels = categories.value.map(c => c.category_name);
    const catData = categories.value.map(c => {
      return allClaims.value.filter(r => r.category_id === c.id && !['draft', 'rejected_manager', 'rejected_finance'].includes(r.status)).reduce((acc, r) => acc + Number(r.amount), 0);
    });

    catChartInstance = new Chart(catCanvas, {
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

    const depts = db.getDepartments();
    const deptLabels = depts.map(d => d.department_name.substring(0, 10) + '..');
    const deptData = depts.map(d => {
      const usersInDept = db.getUsers().filter(u => u.department_id === d.id).map(u => u.id);
      return allClaims.value.filter(r => usersInDept.includes(r.employee_id) && !['draft', 'rejected_manager', 'rejected_finance'].includes(r.status)).reduce((acc, r) => acc + Number(r.amount), 0);
    });

    deptChartInstance = new Chart(deptCanvas, {
      type: 'bar',
      data: {
        labels: deptLabels,
        datasets: [{
          label: 'Pengeluaran (Rp)',
          data: deptData,
          backgroundColor: '#5E35B1',
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

const activeVerificationTab = ref<'queue' | 'history'>('queue');

const verificationHistory = computed(() => {
  const logs = db.getVerificationLogs();
  return [...logs]
    .sort((a, b) => new Date(b.verified_at).getTime() - new Date(a.verified_at).getTime())
    .map(log => {
      const reim = db.getReimbursements().find(r => r.id === log.reimbursement_id);
      return {
        log,
        reim
      };
    })
    .filter(item => item.reim !== undefined) as { log: any; reim: Reimbursement }[];
});
</script>

<template>
  <div>
    <!-- SUBVIEW: BERANDA (HOME) -->
    <div v-if="subView === 'home' || !subView">
      <!-- Finance Stats Grid -->
      <div class="metrics-grid">
        <div class="metric-card" style="border-left-color: var(--color-finance);">
          <span class="metric-title"><AlertCircle :size="12" style="vertical-align: middle;" /> Antrean Verifikasi</span>
          <span class="metric-val">{{ queueClaims.length }} Klaim</span>
        </div>
        <div class="metric-card" style="border-left-color: #10B981;">
          <span class="metric-title"><TrendingUp :size="12" style="vertical-align: middle;" /> Total Lolos Verif</span>
          <span class="metric-val">Rp{{ totalVerifiedVal.toLocaleString('id-ID') }}</span>
        </div>
      </div>

      <!-- Quick Pending Queue -->
      <div class="list-section-title">
        <span>Antrean Verifikasi Kepatuhan (Terbaru)</span>
      </div>

      <div v-if="queueClaims.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        Tidak ada pengajuan menunggu verifikasi finance. Bersih!
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in queueClaims.slice(0, 3)" 
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
              title="Klik untuk Zoom"
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
            <div class="quick-action-buttons" style="display: flex; gap: 6px;">
              <button 
                class="btn-primary" 
                style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; background-color: var(--color-finance); box-shadow: none;"
                @click="openActionModal($event, reim, 'verify')"
              >
                Lolos
              </button>
              <button 
                class="btn-secondary" 
                style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; border-color: #EF4444; color: #EF4444; background: white;"
                @click="openActionModal($event, reim, 'reject')"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Verification History -->
      <div class="list-section-title" style="margin-top: 24px;">
        <span>Riwayat Verifikasi Terbaru</span>
      </div>

      <div v-if="verificationHistory.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        Belum ada riwayat verifikasi.
      </div>

      <div v-else class="reimbursement-list">
        <div 
          v-for="item in verificationHistory.slice(0, 3)" 
          :key="item.log.id" 
          class="reimb-card"
          @click="$emit('view-claim', item.reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <img 
              v-if="getReceipt(item.reim.id)" 
              :src="getReceipt(item.reim.id)?.receipt_path" 
              class="receipt-thumbnail" 
              @click="handleReceiptClick($event, item.reim)"
              title="Klik untuk Zoom"
            />
            <div v-else class="category-icon-circle">
              <FileText :size="18" />
            </div>

            <div class="reimb-info">
              <div class="reimb-code">
                {{ item.reim.code }}
                <span 
                  :class="item.log.decision === 'verified' ? 'badge-verified' : 'badge-rejected'"
                  style="font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px;"
                  :style="item.log.decision === 'verified' ? { backgroundColor: '#E8F5E9', color: '#2E7D32' } : { backgroundColor: '#FFEBEE', color: '#C62828' }"
                >
                  {{ item.log.decision === 'verified' ? 'Lolos' : 'Ditolak' }}
                </span>
              </div>
              <div class="reimb-desc">{{ item.reim.description }}</div>
              <div class="reimb-meta">
                Oleh: <strong>{{ getEmployeeName(item.reim.employee_id) }}</strong>
                <span v-if="item.log.notes" style="display: block; font-style: italic; color: var(--text-secondary); margin-top: 2px; font-size: 0.7rem;">
                  Catatan: "{{ item.log.notes }}"
                </span>
              </div>
            </div>
          </div>
          <div class="reimb-card-right" style="text-align: right; justify-content: center;">
            <span class="reimb-amount">Rp{{ item.reim.amount.toLocaleString('id-ID') }}</span>
            <span style="font-size: 0.6rem; color: var(--text-tertiary); display: block; margin-top: 4px;">
              {{ new Date(item.log.verified_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: VERIFIKASI (FULL QUEUE & HISTORY) -->
    <div v-else-if="subView === 'verification'">
      <!-- Sub-tabs for Verification Queue vs History -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px; background: rgba(0, 0, 0, 0.05); padding: 4px; border-radius: var(--radius-md);">
        <button 
          @click="activeVerificationTab = 'queue'"
          style="flex: 1; padding: 8px; font-size: 0.75rem; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-family: 'Outfit', sans-serif;"
          :style="activeVerificationTab === 'queue' ? { background: 'white', fontWeight: '700', color: 'var(--color-finance)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { background: 'transparent', color: 'var(--text-secondary)' }"
        >
          Antrean ({{ queueClaims.length }})
        </button>
        <button 
          @click="activeVerificationTab = 'history'"
          style="flex: 1; padding: 8px; font-size: 0.75rem; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-family: 'Outfit', sans-serif;"
          :style="activeVerificationTab === 'history' ? { background: 'white', fontWeight: '700', color: 'var(--color-finance)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { background: 'transparent', color: 'var(--text-secondary)' }"
        >
          Riwayat Verifikasi ({{ verificationHistory.length }})
        </button>
      </div>

      <!-- Segment 1: Queue -->
      <div v-if="activeVerificationTab === 'queue'">
        <div class="list-section-title">
          <span>Antrean Verifikasi Kepatuhan</span>
          <ListFilter :size="16" style="color: var(--text-secondary);" />
        </div>

        <div v-if="queueClaims.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
          Tidak ada pengajuan menunggu verifikasi finance. Bersih!
        </div>

        <div class="reimbursement-list">
          <div 
            v-for="reim in queueClaims" 
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
                title="Klik untuk Zoom"
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
                  {{ getCategoryName(reim.category_id) }} • Rp{{ reim.amount.toLocaleString('id-ID') }}
                </div>
              </div>
            </div>

            <div class="reimb-card-right">
              <div class="quick-action-buttons" style="flex-direction: column; gap: 6px;">
                <button 
                  class="btn-primary" 
                  style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; background-color: var(--color-finance); box-shadow: none;"
                  @click="openActionModal($event, reim, 'verify')"
                >
                  Lolos
                </button>
                <button 
                  class="btn-secondary" 
                  style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; border-color: #EF4444; color: #EF4444; background: white;"
                  @click="openActionModal($event, reim, 'reject')"
                >
                  Tolak
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Segment 2: History -->
      <div v-else>
        <div class="list-section-title">
          <span>Riwayat Keputusan Verifikasi</span>
        </div>

        <div v-if="verificationHistory.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
          Belum ada riwayat verifikasi yang diproses.
        </div>

        <div class="reimbursement-list">
          <div 
            v-for="item in verificationHistory" 
            :key="item.log.id" 
            class="reimb-card"
            @click="$emit('view-claim', item.reim)"
            style="cursor: pointer;"
          >
            <div class="reimb-card-left">
              <img 
                v-if="getReceipt(item.reim.id)" 
                :src="getReceipt(item.reim.id)?.receipt_path" 
                class="receipt-thumbnail" 
                @click="handleReceiptClick($event, item.reim)"
                title="Klik untuk Zoom"
              />
              <div v-else class="category-icon-circle">
                <FileText :size="18" />
              </div>

              <div class="reimb-info">
                <div class="reimb-code">
                  {{ item.reim.code }}
                  <span 
                    :class="item.log.decision === 'verified' ? 'badge-verified' : 'badge-rejected'"
                    style="font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px;"
                    :style="item.log.decision === 'verified' ? { backgroundColor: '#E8F5E9', color: '#2E7D32' } : { backgroundColor: '#FFEBEE', color: '#C62828' }"
                  >
                    {{ item.log.decision === 'verified' ? 'Lolos' : 'Ditolak' }}
                  </span>
                </div>
                <div class="reimb-desc">{{ item.reim.description }}</div>
                <div class="reimb-meta">
                  Oleh: <strong>{{ getEmployeeName(item.reim.employee_id) }}</strong>
                  <span v-if="item.log.notes" style="display: block; font-style: italic; color: var(--text-secondary); margin-top: 2px; font-size: 0.7rem;">
                    Catatan: "{{ item.log.notes }}"
                  </span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">
                  {{ getCategoryName(item.reim.category_id) }} • Rp{{ item.reim.amount.toLocaleString('id-ID') }}
                </div>
              </div>
            </div>

            <div class="reimb-card-right" style="text-align: right; justify-content: center;">
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-primary);">
                Rp{{ item.reim.amount.toLocaleString('id-ID') }}
              </span>
              <span style="font-size: 0.6rem; color: var(--text-tertiary); display: block; margin-top: 4px;">
                {{ new Date(item.log.verified_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: VOUCHER (GENERAL LEDGER POSTINGS) -->
    <div v-else-if="subView === 'voucher'">
      <div class="list-section-title">
        <span>Buku Jurnal Umum (General Ledger)</span>
      </div>

      <div v-if="voucherClaims.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Belum ada voucher jurnal yang diposting.
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div 
          v-for="reim in voucherClaims" 
          :key="reim.id"
          class="card"
          style="margin-bottom: 0; padding: 14px;"
        >
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 0.8rem; color: var(--color-finance); display: flex; align-items: center; gap: 4px;">
              <BookOpen :size="14" /> JV-HLS-{{ reim.code.split('-')[1] }}
            </span>
            <span style="font-size: 0.7rem; color: var(--text-tertiary);">
              Status Reimburse: <strong style="text-transform: uppercase;">{{ reim.status.replace('_', ' ') }}</strong>
            </span>
          </div>

          <!-- Journal posting details table -->
          <table style="width: 100%; font-size: 0.7rem; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px dashed var(--border-color); color: var(--text-secondary);">
                <th style="padding: 4px 0;">Akun / Deskripsi</th>
                <th style="padding: 4px 0; text-align: right;">Debet (Rp)</th>
                <th style="padding: 4px 0; text-align: right;">Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Debit Entry -->
              <tr>
                <td style="padding: 6px 0;">
                  <strong style="color: var(--text-primary);">5101.01 - Beban Reimbursement</strong>
                  <div style="color: var(--text-tertiary); font-size: 0.6rem; padding-left: 6px;">
                    Deskripsi: {{ reim.description }} ({{ getCategoryName(reim.category_id) }})
                  </div>
                </td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #2E7D32;">
                  {{ reim.amount.toLocaleString('id-ID') }}
                </td>
                <td style="padding: 6px 0; text-align: right; color: var(--text-tertiary);">-</td>
              </tr>
              <!-- Credit Entry -->
              <tr>
                <td style="padding: 6px 0; padding-left: 14px;">
                  <strong v-if="reim.status === 'paid' || reim.status === 'archived'" style="color: var(--text-primary);">1101.01 - Kas / Bank HLS</strong>
                  <strong v-else style="color: var(--text-primary);">2101.01 - Utang Karyawan</strong>
                  <div style="color: var(--text-tertiary); font-size: 0.6rem; padding-left: 6px;">
                    Pihak ke-3: {{ getEmployeeName(reim.employee_id) }}
                  </div>
                </td>
                <td style="padding: 6px 0; text-align: right; color: var(--text-tertiary);">-</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #C62828;">
                  {{ reim.amount.toLocaleString('id-ID') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: LAPORAN (ANALYTICS) -->
    <div v-else-if="subView === 'reports'">
      <div style="margin-bottom: 16px;">
        <button class="btn-primary" style="width: 100%; font-size: 0.8rem; padding: 10px; background-color: var(--color-finance);" @click="exportReport">
          <Download :size="14" /> Ekspor Laporan (CSV)
        </button>
      </div>

      <!-- Charts Section -->
      <div class="card" style="margin-bottom: 16px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <PieChart :size="16" /> Distribusi Kategori Pengeluaran
        </h4>
        <div style="height: 180px; position: relative;">
          <canvas id="catChart"></canvas>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
          <BarChart2 :size="16" /> Pengeluaran per Departemen
        </h4>
        <div style="height: 180px; position: relative;">
          <canvas id="deptChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Custom Verification / Rejection Action Modal -->
    <div v-if="showActionModal && actionTargetReim" class="modal-overlay" style="z-index: 1100;" @click.self="showActionModal = false">
      <div class="modal-content" style="max-width: 400px; margin: auto; border-radius: var(--radius-md); padding: 20px;">
        <div class="modal-header">
          <h3 class="modal-title" :style="{ color: actionType === 'verify' ? 'var(--color-finance)' : '#EF4444' }">
            {{ actionType === 'verify' ? 'Konfirmasi Verifikasi Kepatuhan' : 'Alasan Penolakan Kebijakan' }}
          </h3>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; background: var(--theme-color-light); padding: 8px; border-radius: 4px;">
          Pengajuan: <strong>{{ actionTargetReim.code }}</strong><br>
          Nominal: <strong>Rp{{ actionTargetReim.amount.toLocaleString('id-ID') }}</strong>
        </div>
        <div class="form-group">
          <label class="form-label">{{ actionType === 'verify' ? 'Catatan Verifikasi (Kepatuhan Polis - Opsional)' : 'Alasan Penolakan (Opsional)' }}</label>
          <textarea 
            v-model="actionNotes" 
            class="form-input" 
            rows="3" 
            placeholder="Masukkan catatan atau alasan (opsional)..."
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
            :style="{ backgroundColor: actionType === 'verify' ? 'var(--color-finance)' : '#EF4444' }"
            @click="submitAction"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">Memproses...</span>
            <span v-else>{{ actionType === 'verify' ? 'Loloskan Kebijakan' : 'Tolak Kebijakan' }}</span>
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

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
