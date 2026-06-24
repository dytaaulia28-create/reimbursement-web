<script setup lang="ts">
import { X, ShieldCheck, Calendar, FileType } from '@lucide/vue';

defineProps<{
  receipt: any;
  code: string;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const formatUploadedAt = (dateStr: any) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID');
};
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content" style="max-height: 90%; gap: 12px;">
      <div class="modal-header">
        <h3 class="modal-title">Bukti Struk - {{ code }}</h3>
        <button class="icon-btn" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div v-if="receipt" style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
        <div style="width: 100%; height: 320px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); background-color: #0F172A; display: flex; align-items: center; justify-content: center;">
          <img :src="receipt.receipt_path || receipt.receiptPath" alt="Struk Reimbursement" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>

        <div style="width: 100%; background-color: #F8FAFC; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary);">
            <ShieldCheck :size="14" style="color: var(--color-manager);" />
            <span style="font-weight: 600;">Checksum SHA-256:</span>
          </div>
          <div style="font-family: monospace; font-size: 0.65rem; background: #E2E8F0; padding: 6px; border-radius: 4px; word-break: break-all; color: #1E293B;">
            {{ receipt.checksum }}
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary);">
              <FileType :size="12" />
              <span>Mime-Type:</span>
            </div>
            <span style="font-weight: 600;">{{ receipt.mime_type || receipt.mimeType || 'image/jpeg' }}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary);">
              <Calendar :size="12" />
              <span>Diupload Pada:</span>
            </div>
            <span style="font-weight: 600;">{{ formatUploadedAt(receipt.uploaded_at || receipt.uploadedAt) }}</span>
          </div>
        </div>
      </div>
      <div v-else style="padding: 24px; text-align: center; color: var(--text-tertiary);">
        Bukti struk tidak ditemukan.
      </div>
    </div>
  </div>
</template>
