<script setup lang="ts">
import { ref, computed } from 'vue';
import { db, Reimbursement } from '../services/db';
import { CreditCard, Landmark, CheckCircle, Info, ListFilter, DollarSign, ArrowUpRight, ShieldCheck } from '@lucide/vue';

const props = defineProps<{
  userId: string;
  subView: string;
}>();

const emit = defineEmits<{
  (e: 'pay-claim', reim: Reimbursement): void;
  (e: 'view-claim', reim: Reimbursement): void;
}>();

// Payout queue: reimbursements pending payment execution
const paymentQueue = computed(() => {
  return db.getReimbursements().filter(r => r.status === 'pending_payment');
});

// Payout history: payments executed by this treasury officer
const paymentHistory = computed(() => {
  const pays = db.getPayments().filter(p => p.treasury_id === props.userId);
  const ids = pays.map(p => p.reimbursement_id);
  return db.getReimbursements().filter(r => ids.includes(r.id));
});

const totalQueueCount = computed(() => paymentQueue.value.length);
const totalQueueVal = computed(() => paymentQueue.value.reduce((acc, r) => acc + Number(r.amount), 0));
const totalHistoryCount = computed(() => paymentHistory.value.length);

const getEmployeeName = (empId: string) => {
  return db.getUserById(empId)?.full_name || 'Karyawan';
};

// Mock Employee Bank Details for Demo purposes
const getEmployeeBankDetail = (empId: string) => {
  const emp = db.getUserById(empId);
  if (emp?.full_name === 'Dudul') {
    return 'BCA - 8920192031 a.n. Dudul';
  }
  return 'Bank Mandiri - 1320092819201 a.n. ' + (emp?.full_name || 'Karyawan');
};

const categories = computed(() => db.getCategories());
const getCategoryName = (catId: number) => {
  return categories.value.find(c => c.id === catId)?.category_name || 'Lain-lain';
};

const openPaymentModal = (event: Event, reim: Reimbursement) => {
  event.stopPropagation();
  emit('pay-claim', reim);
};

// Corporate bank account balances
const bankAccounts = computed(() => db.getBankAccounts());
</script>

<template>
  <div>
    <!-- SUBVIEW: BERANDA (HOME) -->
    <div v-if="subView === 'home' || !subView">
      <!-- Treasury Stats Grid -->
      <div class="metrics-grid">
        <div class="metric-card" style="border-left-color: var(--color-treasury);">
          <span class="metric-title"><Info :size="12" style="vertical-align: middle;" /> Antrean Bayar</span>
          <span class="metric-val">{{ totalQueueCount }} Klaim</span>
        </div>
        <div class="metric-card" style="border-left-color: #10B981;">
          <span class="metric-title"><DollarSign :size="12" style="vertical-align: middle;" /> Nominal Antrean</span>
          <span class="metric-val">Rp{{ totalQueueVal.toLocaleString('id-ID') }}</span>
        </div>
      </div>

      <!-- Quick Pending Payment Queue -->
      <div class="list-section-title">
        <span>Antrean Payout (Terbaru)</span>
      </div>

      <div v-if="paymentQueue.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.8rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        Tidak ada antrean pembayaran. Semua tagihan sudah ditransfer!
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in paymentQueue.slice(0, 3)" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left" style="align-items: flex-start;">
            <div class="category-icon-circle" style="background-color: rgba(0, 137, 123, 0.1); color: var(--color-treasury);">
              <Landmark :size="18" />
            </div>

            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                Penerima: <strong>{{ getEmployeeName(reim.employee_id) }}</strong>
              </div>
            </div>
          </div>

          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <button 
              class="btn-primary" 
              style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background-color: var(--color-treasury); margin-top: 6px; box-shadow: none;"
              @click="openPaymentModal($event, reim)"
            >
              <CreditCard :size="12" /> Bayar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: PAYMENT QUEUE (FULL) -->
    <div v-else-if="subView === 'queue'">
      <div class="list-section-title">
        <span>Antrean Payout</span>
        <ListFilter :size="16" style="color: var(--text-secondary);" />
      </div>

      <div v-if="paymentQueue.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Tidak ada antrean pembayaran. Semua tagihan sudah ditransfer!
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in paymentQueue" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left" style="align-items: flex-start;">
            <div class="category-icon-circle" style="background-color: rgba(0, 137, 123, 0.1); color: var(--color-treasury);">
              <Landmark :size="18" />
            </div>

            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                Penerima: <strong>{{ getEmployeeName(reim.employee_id) }}</strong>
              </div>
              <div style="font-size: 0.72rem; color: var(--color-treasury); font-weight: 600; margin-top: 2px;">
                {{ getEmployeeBankDetail(reim.employee_id) }}
              </div>
            </div>
          </div>

          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <button 
              class="btn-primary" 
              style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background-color: var(--color-treasury); margin-top: 6px; box-shadow: none;"
              @click="openPaymentModal($event, reim)"
            >
              <CreditCard :size="12" /> Bayar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: RIWAYAT (HISTORY) -->
    <div v-else-if="subView === 'history'">
      <div class="list-section-title">
        <span>Histori Pembayaran Saya</span>
      </div>

      <div v-if="paymentHistory.length === 0" style="padding: 32px; text-align: center; color: var(--text-tertiary);">
        Belum ada riwayat transfer pembayaran yang Anda proses.
      </div>

      <div class="reimbursement-list">
        <div 
          v-for="reim in paymentHistory" 
          :key="reim.id" 
          class="reimb-card"
          @click="$emit('view-claim', reim)"
          style="cursor: pointer;"
        >
          <div class="reimb-card-left">
            <div class="category-icon-circle" style="color: #10B981; background-color: rgba(16, 185, 129, 0.1);">
              <CheckCircle :size="18" />
            </div>
            <div class="reimb-info">
              <div class="reimb-code">{{ reim.code }}</div>
              <div class="reimb-desc">{{ reim.description }}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">
                Penerima: {{ getEmployeeName(reim.employee_id) }}
              </div>
            </div>
          </div>
          <div class="reimb-card-right">
            <span class="reimb-amount">Rp{{ reim.amount.toLocaleString('id-ID') }}</span>
            <span class="status-pill status-paid">TUNTAS</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SUBVIEW: REKENING (BANK ACCOUNTS) -->
    <div v-else-if="subView === 'accounts'">
      <div class="list-section-title">
        <span>Rekening Kas & Treasury Perusahaan</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div 
          v-for="acc in bankAccounts" 
          :key="acc.id"
          class="card"
          style="margin-bottom: 0;"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">{{ acc.bank }}</h4>
              <p style="font-size: 0.7rem; color: var(--text-secondary);">No. Rek: {{ acc.accountNo }}</p>
            </div>
            <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(0, 137, 123, 0.1); color: var(--color-treasury); font-weight: 700;">
              OPERASIONAL
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <p style="font-size: 0.6rem; color: var(--text-tertiary); text-transform: uppercase;">Saldo Terkini</p>
              <p style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">Rp{{ acc.balance.toLocaleString('id-ID') }}</p>
            </div>
            <span style="font-size: 0.65rem; color: var(--text-secondary);">
              a.n. {{ acc.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
