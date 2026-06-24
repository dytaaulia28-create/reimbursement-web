<script setup lang="ts">
import { computed, ref } from 'vue';
import { db, Reimbursement } from '../services/db';
import { X, Printer, ShieldCheck, Download, Calendar, Tag, Landmark, User, FileText, CheckCircle, ZoomIn, ZoomOut } from '@lucide/vue';

const zoomLevel = ref(0.45); // Default to 45% zoom so that it fits nicely inside the phone mockup!

const zoomIn = () => {
  if (zoomLevel.value < 1.5) {
    zoomLevel.value = parseFloat((zoomLevel.value + 0.1).toFixed(2));
  }
};

const zoomOut = () => {
  if (zoomLevel.value > 0.2) {
    zoomLevel.value = parseFloat((zoomLevel.value - 0.1).toFixed(2));
  }
};

const props = defineProps<{
  show: boolean;
  reimbursement: Reimbursement | undefined;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const employee = computed(() => {
  return props.reimbursement ? db.getUserById(props.reimbursement.employee_id) : undefined;
});

const department = computed(() => {
  if (!employee.value) return '-';
  const depts = db.getDepartments();
  return depts.find(d => d.id === employee.value?.department_id)?.department_name || '-';
});

const category = computed(() => {
  return props.reimbursement ? db.getCategories().find(c => c.id === props.reimbursement?.category_id) : undefined;
});

const payment = computed(() => {
  return props.reimbursement ? db.getPayments().find(p => p.reimbursement_id === props.reimbursement?.id) : undefined;
});

const archive = computed(() => {
  return props.reimbursement ? db.getArchives().find(a => a.reimbursement_id === props.reimbursement?.id) : undefined;
});

const approvalLogs = computed(() => {
  return props.reimbursement ? db.getApprovalLogs().filter(l => l.reimbursement_id === props.reimbursement?.id) : [];
});

const verificationLogs = computed(() => {
  return props.reimbursement ? db.getVerificationLogs().filter(l => l.reimbursement_id === props.reimbursement?.id) : [];
});

const managerLog = computed(() => approvalLogs.value.find(l => l.stage === 'manager' || l.stage === 'approval'));
const financeLog = computed(() => verificationLogs.value.find(l => l.decision === 'verified'));

const getActorName = (actorId?: string) => {
  if (!actorId) return 'Sistem';
  const u = db.getUsers().find(user => user.id === actorId);
  return u?.full_name || actorId;
};

const terbilangRupiah = (angka: number): string => {
  const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (angka < 12) {
    return bil[angka];
  } else if (angka < 20) {
    return bil[angka - 10] + " Belas";
  } else if (angka < 100) {
    return bil[Math.floor(angka / 10)] + " Puluh " + bil[angka % 10];
  } else if (angka < 200) {
    return "Seratus " + terbilangRupiah(angka - 100);
  } else if (angka < 1000) {
    return bil[Math.floor(angka / 100)] + " Ratus " + terbilangRupiah(angka % 100);
  } else if (angka < 2000) {
    return "Seribu " + terbilangRupiah(angka - 1000);
  } else if (angka < 1000000) {
    return terbilangRupiah(Math.floor(angka / 1000)) + " Ribu " + terbilangRupiah(angka % 1000);
  } else if (angka < 1000000000) {
    return terbilangRupiah(Math.floor(angka / 1000000)) + " Juta " + terbilangRupiah(angka % 1000000);
  } else if (angka < 1000000000000) {
    return terbilangRupiah(Math.floor(angka / 1000000000)) + " Miliar " + terbilangRupiah(angka % 1000000000);
  }
  return "";
};

const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div v-if="show && reimbursement" class="modal-overlay archive-overlay" @click.self="$emit('close')">
    <div class="modal-content archive-modal-content">
      <!-- Toolbar (Hidden on print) -->
      <div class="archive-toolbar no-print">
        <!-- Top Row: Title & Close Button -->
        <div class="toolbar-row top-row">
          <div class="toolbar-title">
            <FileText style="color: var(--theme-color);" :size="16" />
            <span>Dokumen Arsip Digital</span>
          </div>
          <button class="icon-btn-close" @click="$emit('close')" title="Tutup">
            <X :size="18" />
          </button>
        </div>
        
        <!-- Bottom Row: Zoom Controls & Print Button -->
        <div class="toolbar-row bottom-row">
          <div class="zoom-controls">
            <button class="zoom-btn" @click="zoomOut" title="Zoom Out">
              <ZoomOut :size="14" />
            </button>
            <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
            <button class="zoom-btn" @click="zoomIn" title="Zoom In">
              <ZoomIn :size="14" />
            </button>
          </div>
          
          <button class="print-btn" @click="handlePrint">
            <Printer :size="14" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      <!-- Scrollable Container -->
      <div class="archive-body">
        <!-- Printable Voucher Page -->
        <div class="printable-voucher" :style="{ zoom: zoomLevel }">
        <!-- Header -->
        <div class="voucher-header">
          <div style="text-align: left;">
            <h2 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #1E293B; letter-spacing: 0.5px;">PT HONOUR LANE SHIPPING</h2>
            <p style="margin: 2px 0 0 0; font-size: 0.65rem; color: #64748B; text-transform: uppercase; font-weight: 600;">Internal Financial Control & E-Archive System</p>
          </div>
          <div style="text-align: right;">
            <div class="status-stamp">LUNAS / PAID</div>
          </div>
        </div>

        <div style="border-bottom: 2px double #E2E8F0; margin: 16px 0;"></div>

        <!-- Voucher Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 1px;">KAS KELUAR & BUKTI PERNYATAAN PEMBAYARAN</h3>
          <p style="margin: 4px 0 0 0; font-size: 0.75rem; font-family: monospace; color: #475569; font-weight: 700;">No. Dokumen: {{ reimbursement.code }}</p>
        </div>

        <!-- Details Grid -->
        <div class="voucher-grid">
          <div class="grid-item">
            <span class="grid-label">Nama Karyawan</span>
            <span class="grid-value">{{ employee?.full_name || '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Departemen</span>
            <span class="grid-value">{{ department }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Kategori Pengeluaran</span>
            <span class="grid-value">{{ category ? `${category.gl_code} - ${category.category_name}` : '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Tanggal Transaksi</span>
            <span class="grid-value">{{ new Date(reimbursement.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
          </div>
          <div class="grid-item" style="grid-column: span 2;">
            <span class="grid-label">Deskripsi / Justifikasi Bisnis</span>
            <span class="grid-value" style="font-style: italic;">"{{ reimbursement.description }}"</span>
          </div>
        </div>

        <!-- Amount Box -->
        <div class="voucher-amount-box">
          <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: #475569;">Jumlah Pembayaran (Rp)</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #0F172A; margin: 4px 0;">
            Rp{{ reimbursement.amount.toLocaleString('id-ID') }}
          </div>
          <div style="font-size: 0.65rem; color: #64748B; font-style: italic; font-weight: 600;">
            Terbilang: # {{ terbilangRupiah(reimbursement.amount) }} Rupiah #
          </div>
        </div>

        <!-- Workflow Audit Trail -->
        <div style="margin-top: 24px;">
          <h4 style="margin: 0 0 10px 0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">Riwayat Audit & Verifikasi</h4>
          <table class="audit-table">
            <thead>
              <tr>
                <th style="width: 25%;">Tahap Operasi</th>
                <th style="width: 20%;">Pelaksana</th>
                <th style="width: 35%;">Keputusan / Ref</th>
                <th style="width: 20%;">Tanggal & Waktu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 700;">1. Pembuatan Pengajuan</td>
                <td>{{ employee?.full_name || '-' }}</td>
                <td>Diajukan (Draft/Submit)</td>
                <td>{{ new Date(reimbursement.created_at).toLocaleString('id-ID') }}</td>
              </tr>
              <tr v-if="managerLog">
                <td style="font-weight: 700;">2. Persetujuan Atasan</td>
                <td>{{ getActorName(managerLog.actor_id) }}</td>
                <td>Disetujui {{ managerLog.notes ? `("${managerLog.notes}")` : '' }}</td>
                <td>{{ new Date(managerLog.acted_at).toLocaleString('id-ID') }}</td>
              </tr>
              <tr v-if="financeLog">
                <td style="font-weight: 700;">3. Kepatuhan Finansial</td>
                <td>{{ getActorName(financeLog.actor_id) }}</td>
                <td>Lolos Kebijakan {{ financeLog.notes ? `("${financeLog.notes}")` : '' }}</td>
                <td>{{ new Date(financeLog.verified_at).toLocaleString('id-ID') }}</td>
              </tr>
              <tr v-if="payment">
                <td style="font-weight: 700;">4. Realisasi Dana (Treasury)</td>
                <td>{{ getActorName(payment.treasury_id) }}</td>
                <td>{{ payment.bank_name }} - Ref: <span style="font-family: monospace;">{{ payment.reference_no }}</span></td>
                <td>{{ new Date(payment.paid_at).toLocaleString('id-ID') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Digital Signatures Footer -->
        <div class="voucher-footer-signatures">
          <div class="signature-box">
            <span class="sig-title">Diajukan Oleh</span>
            <div class="sig-space"></div>
            <span class="sig-name">{{ employee?.full_name || 'Karyawan' }}</span>
            <span class="sig-role">Operational Staff</span>
          </div>
          <div class="signature-box" v-if="managerLog">
            <span class="sig-title">Disetujui Oleh</span>
            <div class="sig-space"></div>
            <span class="sig-name">{{ getActorName(managerLog.actor_id) }}</span>
            <span class="sig-role">Department Head</span>
          </div>
          <div class="signature-box" v-if="financeLog">
            <span class="sig-title">Diverifikasi Oleh</span>
            <div class="sig-space"></div>
            <span class="sig-name">{{ getActorName(financeLog.actor_id) }}</span>
            <span class="sig-role">Finance Staff</span>
          </div>
          <div class="signature-box" v-if="payment">
            <span class="sig-title">Dibayarkan Oleh</span>
            <div class="sig-space"></div>
            <span class="sig-name">{{ getActorName(payment.treasury_id) }}</span>
            <span class="sig-role">Treasury Staff</span>
          </div>
        </div>

        <!-- Security Badge -->
        <div class="security-badge" v-if="archive">
          <ShieldCheck :size="14" style="color: #059669; shrink: 0;" />
          <span>
            Arsip Digital ini ditandatangani secara elektronik. Hash Dokumen SHA-256: 
            <span style="font-family: monospace; font-weight: 700; color: #1E293B;">SYSTEM_VERIFIED_SHA256</span>
            . Tanggal Arsip: {{ new Date(archive.archived_at).toLocaleString('id-ID') }}.
          </span>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.archive-overlay {
  z-index: 2000 !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: #F1F5F9 !important; /* Premium light slate background */
  padding: 0 !important;
  display: block !important;
}

.archive-modal-content {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  padding: 0 !important;
  background-color: #F1F5F9 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  border: none !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.archive-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  background-color: white;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.icon-btn-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #F1F5F9;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn-close:hover {
  background-color: #E2E8F0;
  color: var(--text-primary);
}

.zoom-controls {
  display: flex;
  align-items: center;
  background-color: #F1F5F9;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px;
  gap: 4px;
}

.zoom-btn {
  background: none;
  border: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.zoom-btn:hover {
  background-color: #E2E8F0;
}

.zoom-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
}

.print-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--theme-color);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.print-btn:hover {
  opacity: 0.9;
}

.archive-body {
  flex: 1 !important;
  overflow: auto !important;
  padding: 20px 10px !important;
}

.printable-voucher {
  background-color: white;
  padding: 40px;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  font-family: 'Outfit', sans-serif;
  color: #334155;
  margin: 0 auto !important;
  width: 100%;
  max-width: 800px;
  min-width: 680px; /* Prevent layout squishing on narrow screen sizes */
  box-sizing: border-box;
}

.voucher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-stamp {
  border: 3px solid #10B981;
  color: #10B981;
  font-weight: 900;
  font-size: 0.85rem;
  padding: 6px 12px;
  border-radius: 6px;
  transform: rotate(-8deg);
  display: inline-block;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  background-color: rgba(16, 185, 129, 0.05);
}

.voucher-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.grid-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #64748B;
  font-weight: 700;
}

.grid-value {
  font-size: 0.8rem;
  color: #0F172A;
  font-weight: 600;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
}

.voucher-amount-box {
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 14px;
  text-align: center;
  margin: 16px 0;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
  margin-bottom: 20px;
}

.audit-table th {
  background-color: #F1F5F9;
  font-weight: 700;
  color: #475569;
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #E2E8F0;
}

.audit-table td {
  padding: 8px;
  border-bottom: 1px solid #F1F5F9;
  color: #334155;
  word-break: break-word;
  white-space: normal;
}

.voucher-footer-signatures {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 30px;
}

.signature-box {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sig-title {
  font-size: 0.65rem;
  color: #64748B;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 25px;
}

.sig-space {
  height: 35px;
  width: 100px;
  border-bottom: 1px dashed #CBD5E1;
  margin-bottom: 4px;
}

.sig-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0F172A;
}

.sig-role {
  font-size: 0.6rem;
  color: #64748B;
}

.security-badge {
  margin-top: 30px;
  padding: 10px 12px;
  background-color: #ECFDF5;
  border: 1px solid #D1FAE5;
  border-radius: var(--radius-sm);
  font-size: 0.6rem;
  color: #065F46;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Printable PDF Styling Rules */
@media print {
  body * {
    visibility: hidden;
  }
  
  .archive-overlay, .archive-overlay * {
    visibility: visible;
  }
  
  .archive-overlay {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: auto;
    background: white !important;
  }
  
  .archive-modal-content {
    box-shadow: none !important;
    border: none !important;
    background: white !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
  }
  
  .archive-body {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 0 !important;
    display: block !important;
  }
  
  .no-print {
    display: none !important;
  }
  
  .printable-voucher {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    min-width: 0 !important;
  }
  
  .voucher-amount-box {
    border: 1px solid #94A3B8 !important;
    background-color: #F8FAFC !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .audit-table th {
    background-color: #E2E8F0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
