<script setup lang="ts">
import { ref } from 'vue';
import { db, Reimbursement } from '../services/db';
import { X, CreditCard } from '@lucide/vue';

const props = defineProps<{
  show: boolean;
  reimbursement?: Reimbursement;
  treasuryId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'paid'): void;
}>();

const bankName = ref<string>('Bank Central Asia (BCA)');
const referenceNo = ref<string>('TRF-' + Math.floor(100000000 + Math.random() * 900000000));
const payError = ref<string>('');

const isSubmitting = ref(false);

const handlePay = async () => {
  if (isSubmitting.value) return;
  payError.value = '';
  if (!bankName.value.trim()) {
    payError.value = 'Nama bank harus diisi.';
    return;
  }
  if (!referenceNo.value.trim()) {
    payError.value = 'Nomor referensi transfer harus diisi.';
    return;
  }
  if (!props.reimbursement) return;

  try {
    isSubmitting.value = true;
    await db.actTreasury(
      props.reimbursement.id,
      props.treasuryId,
      bankName.value,
      referenceNo.value
    );
    emit('paid');
    emit('close');
  } catch (err) {
    console.error(err);
    payError.value = 'Gagal memproses pembayaran.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div v-if="show && reimbursement" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Eksekusi Pembayaran</h3>
        <button class="icon-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div style="background-color: var(--theme-color-light); padding: 12px; border-radius: var(--radius-sm); border: 1px solid rgba(0, 137, 123, 0.2); display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--color-treasury); font-weight: 700;">Reimbursement Target</span>
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">{{ reimbursement.code }}</span>
        <span style="font-size: 1.1rem; font-weight: 700; color: var(--color-treasury);">Rp{{ reimbursement.amount.toLocaleString('id-ID') }}</span>
      </div>

      <!-- Payout Details -->
      <div class="form-group">
        <label class="form-label">Bank Pengirim</label>
        <div style="padding: 10px 12px; background-color: var(--bg-app); border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-primary); font-weight: 600;">
          Bank Central Asia (BCA) - 230-99120-19
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Nomor Referensi Bank (Ref No.)</label>
        <input v-model="referenceNo" type="text" class="form-input" placeholder="Masukkan nomor referensi transfer" :disabled="isSubmitting" />
        <div v-if="payError" style="color: #EF4444; font-size: 0.7rem; font-weight: 600; margin-top: 4px;">{{ payError }}</div>
      </div>

      <!-- Actions -->
      <button class="btn-primary" @click="handlePay" :disabled="isSubmitting" style="margin-top: 8px; width: 100%;">
        <span v-if="isSubmitting">Memproses...</span>
        <span v-else style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
          <CreditCard :size="16" /> Konfirmasi & Bayar
        </span>
      </button>
    </div>
  </div>
</template>
