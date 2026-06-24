<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../services/auth';
import { db } from '../services/db';
import { LogIn, Sparkles } from '@lucide/vue';

const { login } = useAuth();

// Login form states
const loginIdInput = ref('');
const loginPasswordInput = ref('');
const loginError = ref('');

const handleLogin = () => {
  loginError.value = '';
  if (!loginIdInput.value.trim()) {
    loginError.value = 'Silakan masukkan ID atau Email.';
    return;
  }
  if (!loginPasswordInput.value) {
    loginError.value = 'Silakan masukkan Password.';
    return;
  }
  
  const success = login(loginIdInput.value, loginPasswordInput.value);
  if (success) {
    window.location.reload(); // Refresh to trigger header / UI theme updates
  } else {
    loginError.value = 'ID Karyawan, Email, atau Password salah.';
  }
};

</script>

<template>
  <div class="login-wrapper">
    <!-- Brand / Header Logo -->
    <div class="brand-section">
      <div class="logo-box">HLS</div>
      <h2 class="app-title">PT HONOUR LANE SHIPPING</h2>
      <p class="app-tagline">Sistem Reimbursement</p>
    </div>

    <!-- LOGIN TAB PANEL -->
    <div class="form-container">
      <div class="form-group">
        <label class="form-label">ID Karyawan atau Email</label>
        <input 
          v-model="loginIdInput" 
          type="text" 
          class="form-input" 
          placeholder="Contoh: K0001 atau dudul@reimhub.com"
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group" style="margin-top: 8px;">
        <label class="form-label">Password</label>
        <input 
          v-model="loginPasswordInput" 
          type="password" 
          class="form-input" 
          placeholder="Masukkan password Anda"
          @keyup.enter="handleLogin"
        />
        <div v-if="loginError" class="error-msg" style="margin-top: 6px;">{{ loginError }}</div>
      </div>

      <button class="btn-primary login-submit" @click="handleLogin">
        Login
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  min-height: calc(100vh - 100px);
  animation: fadeIn 0.3s ease;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 10px;
  margin-bottom: 24px;
}

.logo-box {
  width: 54px;
  height: 54px;
  background: linear-gradient(135deg, var(--color-employee), #1565C0);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
}

.app-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.app-tagline {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.tab-header {
  display: flex;
  background-color: #E2E8F0;
  padding: 4px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: white;
  color: var(--color-employee);
  box-shadow: var(--shadow-sm);
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp 0.2s ease;
}

.login-submit {
  padding: 12px;
  font-weight: 700;
  font-size: 0.85rem;
  background-color: var(--color-employee);
  width: 100%;
}

.error-msg {
  color: #EF4444;
  font-size: 0.7rem;
  margin-top: 4px;
  font-weight: 600;
}

.help-text {
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}



@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
