<script setup lang="ts">
import { computed } from 'vue';
import { db, Reimbursement, Category, User, ApprovalLog, VerificationLog, Payment, LedgerEntry, Archive } from '../services/db';
import { X, Calendar, DollarSign, Tag, Info, UserCheck, ShieldAlert, Award, FileSpreadsheet, Landmark, FileText, CheckCircle } from '@lucide/vue';

const props = defineProps<{
  show: boolean;
  reimbursement: Reimbursement | undefined;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'view-archive', reim: Reimbursement): void;
}>();

const employee = computed<User | undefined>(() => {
  return props.reimbursement ? db.getUserById(props.reimbursement.employee_id) : undefined;
});

const department = computed(() => {
  if (!employee.value) return '-';
  const depts = db.getDepartments();
  return depts.find(d => d.id === employee.value?.department_id)?.department_name || '-';
});

const category = computed<Category | undefined>(() => {
  return props.reimbursement ? db.getCategories().find(c => c.id === props.reimbursement?.category_id) : undefined;
});

const approvalLogs = computed<ApprovalLog[]>(() => {
  return props.reimbursement ? db.getApprovalLogs().filter(l => l.reimbursement_id === props.reimbursement?.id) : [];
});

const verificationLogs = computed<VerificationLog[]>(() => {
  return props.reimbursement ? db.getVerificationLogs().filter(l => l.reimbursement_id === props.reimbursement?.id) : [];
});

const payment = computed<Payment | undefined>(() => {
  return props.reimbursement ? db.getPayments().find(p => p.reimbursement_id === props.reimbursement?.id) : undefined;
});

import { useAuth } from '../services/auth';

const { activeRoleId } = useAuth();

const showLedger = computed(() => {
  return activeRoleId.value !== null && [3, 4].includes(activeRoleId.value); // Exclude Admin (5)
});

const ledgerEntries = computed<LedgerEntry[]>(() => {
  return props.reimbursement ? db.getLedgerEntries().filter(l => l.reimbursement_id === props.reimbursement?.id) : [];
});

const archive = computed<Archive | undefined>(() => {
  return props.reimbursement ? db.getArchives().find(a => a.reimbursement_id === props.reimbursement?.id) : undefined;
});

const receipt = computed(() => {
  return props.reimbursement ? db.getReceiptForReimbursement(props.reimbursement.id) : undefined;
});

const getActorName = (actorId: string) => {
  return db.getUserById(actorId)?.full_name || 'System';
};

const timelineSteps = computed(() => {
  if (!props.reimbursement) return [];
  const status = props.reimbursement.status;

  // Step 1: Diajukan
  const step1 = {
    label: 'Diajukan',
    state: 'completed',
    time: props.reimbursement.created_at,
    color: 'green',
    desc: `Pengajuan reimbursement berhasil dibuat oleh ${employee.value?.full_name || 'Karyawan'}.`
  };

  // Step 2: Persetujuan Atasan (Dynamically transitions label and color)
  let step2Label = 'Pending Atasan';
  let step2State = 'pending';
  let step2Time = '';
  let step2Color = 'gray';
  let step2Desc = 'Menunggu persetujuan Atasan.';

  const managerLog = approvalLogs.value.find(l => l.stage === 'manager' || l.stage === 'approval');
  if (managerLog) {
    step2Time = managerLog.acted_at;
    if (managerLog.decision === 'approved') {
      step2Label = 'Disetujui Atasan';
      step2State = 'completed';
      step2Color = 'green';
      step2Desc = `Disetujui oleh Atasan (${getActorName(managerLog.actor_id)}).`;
    } else {
      step2Label = 'Ditolak Atasan';
      step2State = 'rejected';
      step2Color = 'red';
      step2Desc = `Ditolak oleh Atasan (${getActorName(managerLog.actor_id)})${managerLog.notes ? `: "${managerLog.notes}"` : ''}`;
    }
  } else if (status === 'pending_manager') {
    step2Label = 'Pending Atasan';
    step2State = 'active';
    step2Color = 'orange';
    step2Desc = 'Sedang ditinjau oleh Atasan/Manager.';
  } else if (['pending_finance', 'rejected_finance', 'pending_payment', 'paid', 'archived'].includes(status)) {
    step2Label = 'Disetujui Atasan';
    step2State = 'completed';
    step2Color = 'green';
    step2Desc = 'Disetujui oleh Atasan.';
  }

  const step2 = {
    label: step2Label,
    state: step2State,
    time: step2Time,
    color: step2Color,
    desc: step2Desc
  };

  // Step 3: Verifikasi Finance (Dynamically transitions label and color)
  let step3Label = 'Pending Finance';
  let step3State = 'pending';
  let step3Time = '';
  let step3Color = 'gray';
  let step3Desc = 'Menunggu verifikasi Finance.';

  const financeLog = verificationLogs.value[0];
  if (financeLog) {
    step3Time = financeLog.verified_at;
    if (financeLog.decision === 'verified') {
      step3Label = 'Disetujui Finance';
      step3State = 'completed';
      step3Color = 'green';
      step3Desc = `Lolos kebijakan kepatuhan oleh Finance (${getActorName(financeLog.actor_id)}).`;
    } else {
      step3Label = 'Ditolak Finance';
      step3State = 'rejected';
      step3Color = 'red';
      step3Desc = `Ditolak kebijakan oleh Finance (${getActorName(financeLog.actor_id)})${financeLog.notes ? `: "${financeLog.notes}"` : ''}`;
    }
  } else if (status === 'pending_finance') {
    step3Label = 'Pending Finance';
    step3State = 'active';
    step3Color = 'orange';
    step3Desc = 'Sedang diverifikasi oleh tim Finance.';
  } else if (['pending_payment', 'paid', 'archived'].includes(status)) {
    step3Label = 'Disetujui Finance';
    step3State = 'completed';
    step3Color = 'green';
    step3Desc = 'Lolos kebijakan kepatuhan oleh Finance.';
  }

  const step3 = {
    label: step3Label,
    state: step3State,
    time: step3Time,
    color: step3Color,
    desc: step3Desc
  };

  // Step 4: Pembayaran (Dynamically transitions label and color)
  let step4Label = 'Pending Pembayaran';
  let step4State = 'pending';
  let step4Time = '';
  let step4Color = 'gray';
  let step4Desc = 'Menunggu pembayaran.';

  if (payment.value) {
    step4Label = 'Pembayaran Berhasil';
    step4State = 'completed';
    step4Time = payment.value.paid_at;
    step4Color = 'green';
    step4Desc = `Dana telah berhasil ditransfer via ${payment.value.bank_name}.`;
  } else if (status === 'pending_payment') {
    step4Label = 'Pending Pembayaran';
    step4State = 'active';
    step4Color = 'orange';
    step4Desc = 'Menunggu transfer dana oleh Treasury.';
  } else if (status === 'paid' || status === 'archived') {
    step4Label = 'Pembayaran Berhasil';
    step4State = 'completed';
    step4Color = 'green';
    step4Desc = 'Dana reimbursement telah ditransfer ke rekening Anda.';
  }

  const step4 = {
    label: step4Label,
    state: step4State,
    time: step4Time,
    color: step4Color,
    desc: step4Desc
  };

  return [step1, step2, step3, step4];
});
</script>

<template>
  <div v-if="show && reimbursement" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content" style="max-height: 90%; gap: 14px;">
      <div class="modal-header">
        <h3 class="modal-title">Rincian Pengajuan</h3>
        <button class="icon-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <!-- Core Details Card -->
      <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.1rem; font-weight: 700; color: var(--theme-color);">{{ reimbursement.code }}</span>
          <span :class="['status-pill', 'status-' + reimbursement.status]">
            {{ db.getFriendlyStatusLabel(reimbursement.status, activeRoleId) }}
          </span>
        </div>

        <div class="detail-item">
          <div class="detail-label"><UserCheck :size="14" style="margin-right: 4px; vertical-align: middle;" /> Karyawan</div>
          <div class="detail-value">{{ employee?.full_name || '-' }} ({{ department }})</div>
        </div>

        <div class="detail-item">
          <div class="detail-label"><Tag :size="14" style="margin-right: 4px; vertical-align: middle;" /> Kategori</div>
          <div class="detail-value">{{ category?.category_name || '-' }} ({{ category?.gl_code || '-' }})</div>
        </div>

        <div class="detail-item">
          <div class="detail-label"><Calendar :size="14" style="margin-right: 4px; vertical-align: middle;" /> Tanggal Transaksi</div>
          <div class="detail-value">{{ new Date(reimbursement.transaction_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label"><DollarSign :size="14" style="margin-right: 4px; vertical-align: middle;" /> Total Nominal</div>
          <div class="detail-value" style="color: var(--text-primary); font-weight: 700;">Rp{{ reimbursement.amount.toLocaleString('id-ID') }}</div>
        </div>

        <div class="form-group" style="margin-top: 4px;">
          <label class="form-label" style="font-size: 0.75rem; color: var(--text-secondary);">Deskripsi Keperluan:</label>
          <div style="background-color: #F8FAFC; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-primary); line-height: 1.4;">
            {{ reimbursement.description }}
          </div>
        </div>
      </div>

      <!-- BUKTI STRUK TRANSACTION RECEIPT -->
      <div v-if="receipt" style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Bukti Struk Transaksi</span>
        <div style="width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; background-color: #0F172A; display: flex; align-items: center; justify-content: center; padding: 8px;">
          <img :src="receipt.receipt_path" alt="Struk Bukti" style="max-width: 100%; max-height: 260px; object-fit: contain; border-radius: 4px;" />
        </div>
      </div>

      <!-- VISUAL TIMELINE TRACKER (FOOD DELIVERY STYLE) -->
      <div v-if="activeRoleId === 1" style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Status Pengajuan (Timeline)</span>
        
        <div style="display: flex; flex-direction: column; background: #F8FAFC; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px 14px 4px 16px;">
          <div 
            v-for="(step, idx) in timelineSteps" 
            :key="idx" 
            style="display: flex; position: relative; gap: 14px; padding-bottom: 20px;"
          >
            <!-- Vertical line connector -->
            <div 
              v-if="idx < timelineSteps.length - 1" 
              style="position: absolute; left: 6px; top: 16px; bottom: 0; width: 2px;"
              :style="{ backgroundColor: step.state === 'completed' ? '#10B981' : '#CBD5E1' }"
            ></div>

            <!-- Bullet point (circle) -->
            <div 
              class="timeline-dot"
              :class="{
                'dot-completed': step.color === 'green',
                'dot-active': step.color === 'orange',
                'dot-rejected': step.color === 'red',
                'dot-pending': step.color === 'gray'
              }"
            ></div>

            <!-- Step content -->
            <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; margin-top: -2px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <span 
                  style="font-size: 0.75rem; font-weight: 700;"
                  :style="
                    step.color === 'green' ? { color: '#059669' } :
                    step.color === 'orange' ? { color: '#D97706' } :
                    step.color === 'red' ? { color: '#DC2626' } :
                    { color: 'var(--text-secondary)' }
                  "
                >
                  {{ step.label }}
                </span>
                <span v-if="step.time" style="font-size: 0.65rem; color: var(--text-tertiary); white-space: nowrap;">
                  {{ new Date(step.time).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) }} {{ new Date(step.time).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) }}
                </span>
              </div>
              <span style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">
                {{ step.desc }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- PAYOUT RECEIPT SECTION -->
      <div v-if="payment" style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Tanda Terima Pembayaran</span>
        <div class="card" style="margin-bottom: 0; background-color: #F0FDF4; border: 1px solid rgba(46, 125, 50, 0.2); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
            <span style="color: var(--text-secondary);"><Landmark :size="12" style="margin-right: 4px; vertical-align: middle;" /> Bank Asal</span>
            <span style="font-weight: 700; color: var(--text-primary);">{{ payment.bank_name }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
            <span style="color: var(--text-secondary);"><Info :size="12" style="margin-right: 4px; vertical-align: middle;" /> Ref. Bank</span>
            <span style="font-weight: 700; font-family: monospace; color: var(--text-primary);">{{ payment.reference_no }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
            <span style="color: var(--text-secondary);"><CheckCircle :size="12" style="margin-right: 4px; vertical-align: middle;" /> Tanggal Bayar</span>
            <span style="font-weight: 600; color: var(--text-primary);">{{ new Date(payment.paid_at).toLocaleString('id-ID') }}</span>
          </div>
        </div>
      </div>

      <!-- GENERAL LEDGER JOURNAL ENTRIES -->
      <div v-if="showLedger && ledgerEntries.length" style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Voucher Jurnal Ledger</span>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; border: 1px solid var(--border-color); background-color: white;">
          <thead>
            <tr style="background-color: #F8FAFC; border-bottom: 1px solid var(--border-color); font-weight: 700; text-align: left;">
              <th style="padding: 6px;">Akun GL</th>
              <th style="padding: 6px; text-align: right;">Debit (Rp)</th>
              <th style="padding: 6px; text-align: right;">Kredit (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in ledgerEntries" :key="entry.id" style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 6px;">
                <div style="font-weight: 600;">{{ entry.account_code }}</div>
                <div style="font-size: 0.65rem; color: var(--text-secondary);">{{ entry.memo }}</div>
              </td>
              <td style="padding: 6px; text-align: right; color: var(--color-manager); font-weight: 600;">
                {{ entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : '-' }}
              </td>
              <td style="padding: 6px; text-align: right; color: var(--color-finance); font-weight: 600;">
                {{ entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ELECTRONIC ARCHIVES INFO -->
      <div v-if="archive && activeRoleId !== 5" style="display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Metadata Arsip Elektronik</span>
        <div style="background-color: #F1F5F9; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; display: flex; flex-direction: column; gap: 4px; font-size: 0.7rem; color: var(--text-secondary);">
          <div><FileText :size="12" style="margin-right: 4px; vertical-align: middle;" /> <strong>Path File PDF:</strong> <span style="font-family: monospace; color: var(--text-primary);">{{ archive.archive_path }}</span></div>
          <div><Calendar :size="12" style="margin-right: 4px; vertical-align: middle;" /> <strong>Tanggal Arsip:</strong> {{ new Date(archive.archived_at).toLocaleString('id-ID') }}</div>
          <div><Award :size="12" style="margin-right: 4px; vertical-align: middle;" /> <strong>Digital Signature:</strong> <span style="color: var(--color-manager); font-weight: 700;">SYSTEM_VERIFIED_SHA256</span></div>
          
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button 
              class="btn-primary" 
              style="flex: 1; padding: 6px 10px; font-size: 0.7rem; background-color: var(--theme-color); border-radius: 4px; box-shadow: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;"
              @click="reimbursement && emit('view-archive', reimbursement)"
            >
              <FileText :size="12" /> Lihat Dokumen Arsip
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid white;
  z-index: 1;
  margin-top: 2px;
  flex-shrink: 0;
}

.dot-completed {
  background-color: #10B981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.dot-active {
  background-color: #F59E0B;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
  animation: dotPulse 1.5s infinite alternate;
}

.dot-rejected {
  background-color: #EF4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.dot-pending {
  background-color: #CBD5E1;
  box-shadow: 0 0 0 1px #CBD5E1;
}

@keyframes dotPulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2);
  }
  100% {
    transform: scale(1.05);
    box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.4);
  }
}
</style>
