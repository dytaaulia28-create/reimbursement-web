<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { db, Category, Reimbursement } from '../services/db';
import { X, Upload, Check, FileText } from '@lucide/vue';

const props = defineProps<{
  show: boolean;
  reimbursement?: Reimbursement;
  employeeId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const categories = computed(() => db.getCategories());
const categoryId = ref<number>(1);
const description = ref<string>('');
const amount = ref<number>(0);
const getLocalDateString = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

const transactionDate = ref<string>(getLocalDateString());

const fileInput = ref<HTMLInputElement | null>(null);
const receiptImage = ref<string>('');

watch([categories, () => props.show], ([cats, isVisible]) => {
  if (isVisible) {
    if (props.reimbursement) {
      categoryId.value = props.reimbursement.category_id;
      description.value = props.reimbursement.description;
      amount.value = props.reimbursement.amount;
      transactionDate.value = props.reimbursement.transaction_date;
      const r = db.getReceiptForReimbursement(props.reimbursement.id);
      receiptImage.value = r ? r.receipt_path : '';
    } else {
      // Reset form
      categoryId.value = cats[0]?.id || 1;
      description.value = '';
      amount.value = 0;
      transactionDate.value = getLocalDateString();
      receiptImage.value = '';
    }
  }
}, { immediate: true, deep: true });

const triggerFileInput = () => {
  fileInput.value?.click();
};

const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        receiptImage.value = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }
};

const isSubmitting = ref(false);

const handleSave = async (isSubmit: boolean) => {
  if (isSubmitting.value) return;
  if (!description.value.trim()) {
    alert('Deskripsi pengajuan tidak boleh kosong.');
    return;
  }
  if (amount.value <= 0) {
    alert('Nominal harus lebih besar dari Rp0.');
    return;
  }
  if (!receiptImage.value) {
    alert('Mohon lampirkan struk bukti terlebih dahulu.');
    return;
  }

  try {
    isSubmitting.value = true;
    if (props.reimbursement) {
      // Edit Mode
      await db.updateReimbursement(props.reimbursement.id, props.employeeId, {
        category_id: categoryId.value,
        description: description.value,
        amount: amount.value,
        transaction_date: transactionDate.value,
        receipt_image: receiptImage.value,
        isSubmit
      });
    } else {
      // New Mode
      await db.createReimbursement({
        employee_id: props.employeeId,
        category_id: categoryId.value,
        description: description.value,
        amount: amount.value,
        transaction_date: transactionDate.value,
        receipt_image: receiptImage.value,
        isSubmit
      });
    }
    emit('saved');
    emit('close');
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan pengajuan reimbursement.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="!isSubmitting && $emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ reimbursement ? 'Revisi Pengajuan' : 'Buat Reimbursement Baru' }}
        </h3>
        <button class="icon-btn" @click="$emit('close')" :disabled="isSubmitting">
          <X :size="18" />
        </button>
      </div>

      <!-- Form Inputs -->
      <div class="form-group">
        <label class="form-label">Kategori Pengeluaran</label>
        <select v-model="categoryId" class="form-select" :disabled="isSubmitting">
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.category_name }} ({{ cat.gl_code }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Tanggal Transaksi</label>
        <input v-model="transactionDate" type="date" class="form-input" :disabled="isSubmitting" />
      </div>

      <div class="form-group">
        <label class="form-label">Nominal (Rp)</label>
        <input v-model.number="amount" type="number" class="form-input" placeholder="Contoh: 150000" :disabled="isSubmitting" />
        <span v-if="amount > 0" style="font-size: 0.75rem; color: var(--theme-color); font-weight: 600; margin-top: 2px;">
          Terbaca: Rp{{ amount.toLocaleString('id-ID') }}
        </span>
      </div>

      <div class="form-group">
        <label class="form-label">Deskripsi & Justifikasi Bisnis</label>
        <textarea 
          v-model="description" 
          class="form-textarea" 
          placeholder="Jelaskan keperluan pengeluaran (contoh: Taksi ke kantor klien Astra)"
          :disabled="isSubmitting"
        ></textarea>
      </div>

      <!-- Receipt image upload simulator -->
      <div class="form-group">
        <label class="form-label">Lampiran Struk Bukti</label>
        
        <!-- Hidden native file input -->
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/*" 
          style="display: none;" 
          @change="onFileSelected" 
          :disabled="isSubmitting"
        />

        <!-- Empty Upload Dropzone -->
        <div 
          v-if="!receiptImage" 
          class="receipt-upload-box" 
          @click="!isSubmitting && triggerFileInput()"
        >
          <div class="dropzone-content">
            <div class="upload-icon-wrapper">
              <Upload :size="20" />
            </div>
            <div class="dropzone-title">Pilih file atau drop file ke sini</div>
            <div class="dropzone-subtitle">Mendukung JPG, PNG, atau GIF hingga 5MB</div>
          </div>
        </div>

        <!-- Image Preview (with Ganti File overlay) -->
        <div v-else class="receipt-upload-box" @click="!isSubmitting && triggerFileInput()">
          <img :src="receiptImage" class="receipt-preview-img" alt="Receipt Preview" />
          <div class="upload-overlay">
            <Upload :size="12" /> Ganti Gambar Struk
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 10px; margin-top: 8px;">
        <button class="btn-secondary" @click="handleSave(false)" :disabled="isSubmitting" style="flex: 1;">
          <FileText :size="16" /> Draft
        </button>
        <button class="btn-primary" @click="handleSave(true)" :disabled="isSubmitting" style="flex: 2;">
          <span v-if="isSubmitting">Mengirim...</span>
          <span v-else style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <Check :size="16" /> Ajukan Sekarang
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
