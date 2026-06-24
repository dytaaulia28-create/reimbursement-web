<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuth } from '../services/auth';
import { db, Notification } from '../services/db';
import { Bell, LogOut, Check } from '@lucide/vue';

const { user, activeRoleName } = useAuth();
const showNotifs = ref(false);
const notifications = ref<Notification[]>([]);

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read_at).length;
});

const loadNotifications = () => {
  if (user.value) {
    notifications.value = db.getNotifications(user.value.id).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
};

const toggleNotifs = () => {
  showNotifs.value = !showNotifs.value;
  if (showNotifs.value) {
    loadNotifications();
  }
};

const readNotif = (notifId: string) => {
  db.markNotificationRead(notifId);
  loadNotifications();
};

const handleLogout = () => {
  const { logout } = useAuth();
  logout();
  window.location.reload();
};

let intervalId: any;

onMounted(() => {
  loadNotifications();
  // Poll notifications every 5 seconds for simulation dynamics
  intervalId = setInterval(loadNotifications, 5000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>

<template>
  <header class="app-header">
    <div class="profile-section">
      <div class="avatar">
        {{ user ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U' }}
      </div>
      <div class="user-info">
        <div class="welcome">Selamat datang,</div>
        <div class="name">{{ user ? user.full_name : 'Tamu' }}</div>
        <span class="role-badge">{{ activeRoleName }}</span>
      </div>
    </div>

    <div class="header-actions">
      <!-- Notification Bell -->
      <button class="icon-btn" @click="toggleNotifs" title="Notifikasi">
        <Bell :size="18" />
        <span v-if="unreadCount > 0" class="badge-counter">{{ unreadCount }}</span>
      </button>

      <!-- Logout Button -->
      <button class="icon-btn" @click="handleLogout" title="Logout">
        <LogOut :size="18" />
      </button>

      <!-- Notification Dropdown Drawer -->
      <div v-if="showNotifs" class="notification-drawer">
        <div style="font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>Notifikasi</span>
          <span style="font-size: 0.7rem; color: var(--text-secondary); cursor: pointer;" @click="showNotifs = false">Tutup</span>
        </div>
        <div v-if="notifications.length === 0" style="padding: 16px; text-align: center; font-size: 0.75rem; color: var(--text-tertiary);">
          Tidak ada notifikasi.
        </div>
        <div 
          v-for="notif in notifications" 
          :key="notif.id" 
          class="notification-item"
          :class="{ 'notif-unread': !notif.read_at }"
          @click="readNotif(notif.id)"
        >
          <div class="notif-title">{{ notif.title }}</div>
          <div class="notif-body">{{ notif.body }}</div>
          <div style="font-size: 0.6rem; color: var(--text-tertiary); margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span>{{ new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}</span>
            <span v-if="!notif.read_at" style="color: var(--theme-color); font-weight: bold; display: flex; align-items: center; gap: 2px;">
              <Check :size="10" /> Baru
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
