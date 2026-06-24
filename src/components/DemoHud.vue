<script setup lang="ts">
import { useAuth } from '../services/auth';

const { activeRoleId, switchRole } = useAuth();
</script>

<template>
  <div class="demo-hud">
    <span class="demo-hud-label">Demo Switcher:</span>
    <div class="role-selectors">
      <button 
        class="role-btn" 
        :class="{ 'active-role-1': activeRoleId === 1 }"
        @click="switchRole(1)"
        title="Karyawan"
      >
        Karyawan
      </button>
      <button 
        class="role-btn" 
        :class="{ 'active-role-2': activeRoleId === 2 }"
        @click="switchRole(2)"
        title="Atasan / Manager"
      >
        Atasan
      </button>
      <button 
        class="role-btn" 
        :class="{ 'active-role-3': activeRoleId === 3 }"
        @click="switchRole(3)"
        title="Finance Verifikator"
      >
        Finance
      </button>
      <button 
        class="role-btn" 
        :class="{ 'active-role-4': activeRoleId === 4 }"
        @click="switchRole(4)"
        title="Treasury Bendahara"
      >
        Treasury
      </button>
      <button 
        class="role-btn" 
        :class="{ 'active-role-5': activeRoleId === 5 }"
        @click="switchRole(5)"
        title="System Administrator"
      >
        Admin
      </button>
    </div>
  </div>
</template>
