import { ref, computed } from 'vue';
import { db, User } from './db';
import { supabase } from './supabaseClient';

// Reactive Session Refs
const currentUser = ref<User | null>(null);
const currentRoleId = ref<number | null>(null);

// Initialize session from localStorage if present
const savedSession = localStorage.getItem('reimhub_session_user');
if (savedSession) {
  try {
    const userObj = JSON.parse(savedSession) as User;
    currentUser.value = userObj;
    currentRoleId.value = userObj.role_id;
  } catch (e) {
    localStorage.removeItem('reimhub_session_user');
  }
}

export const useAuth = () => {
  const user = computed(() => currentUser.value);
  const activeRoleId = computed(() => currentRoleId.value);
  
  const activeRoleName = computed(() => {
    if (!currentRoleId.value) return '';
    const roles = db.getRoles();
    return roles.find(r => r.id === currentRoleId.value)?.role_name || '';
  });

  const login = (loginInput: string, passwordInput?: string): boolean => {
    if (!loginInput.trim()) return false;
    const allUsers = db.getUsers();
    const found = allUsers.find(u => 
      u.id.toLowerCase() === loginInput.toLowerCase().trim() ||
      u.email.toLowerCase() === loginInput.toLowerCase().trim()
    );
    if (found && found.status === 'active') {
      // Check password if it is provided (quick login from grid bypasses password check)
      if (passwordInput !== undefined) {
        const userPassword = found.password || found.id;
        if (userPassword !== passwordInput) {
          return false;
        }
      }
      currentUser.value = found;
      currentRoleId.value = found.role_id;
      localStorage.setItem('reimhub_session_user', JSON.stringify(found));
      db.logAction(found.id, 'USER_LOGIN', 'users', found.id, `User ${found.full_name} login berhasil`);
      return true;
    }
    return false;
  };

  const signup = async (data: { full_name: string; email: string; role_id: number; department_id: number }): Promise<boolean> => {
    if (!data.full_name.trim() || !data.email.trim() || !data.role_id || !data.department_id) {
      alert('Semua formulir pendaftaran wajib diisi.');
      return false;
    }
    const allUsers = db.getUsers();
    const emailExists = allUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (emailExists) {
      alert('Email sudah terdaftar!');
      return false;
    }

    // Role prefixes
    let prefix = 'K';
    if (data.role_id === 2) prefix = 'A';
    else if (data.role_id === 3) prefix = 'F';
    else if (data.role_id === 4) prefix = 'T';
    else if (data.role_id === 5) prefix = 'M';

    const sameRoleUsers = allUsers.filter(u => u.id.startsWith(prefix));
    const nextNum = sameRoleUsers.length + 1;
    const nextId = `${prefix}${String(nextNum).padStart(4, '0')}`;

    const newUser: User = {
      id: nextId,
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      role_id: data.role_id,
      department_id: data.department_id,
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Save user to Supabase
    const { error } = await supabase.from('users').insert([newUser]);
    if (error) {
      console.error('Error signing up user to Supabase:', error);
      alert('Pendaftaran gagal. Silakan coba lagi.');
      return false;
    }

    // Refresh db cache
    await db.refresh();

    // Log action and auto-login
    db.logAction(newUser.id, 'USER_SIGNUP', 'users', newUser.id, `User ${newUser.full_name} berhasil mendaftar dengan ID ${newUser.id}`);
    
    currentUser.value = newUser;
    currentRoleId.value = newUser.role_id;
    localStorage.setItem('reimhub_session_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    if (currentUser.value) {
      db.logAction(currentUser.value.id, 'USER_LOGOUT', 'users', currentUser.value.id, `User ${currentUser.value.full_name} logout`);
    }
    currentUser.value = null;
    currentRoleId.value = null;
    localStorage.removeItem('reimhub_session_user');
  };

  // Demo utility to switch roles on the fly
  const switchRole = (roleId: number) => {
    const roleUser = db.getUsers().find(u => u.role_id === roleId);
    if (roleUser) {
      currentUser.value = roleUser;
      currentRoleId.value = roleId;
      localStorage.setItem('reimhub_session_user', JSON.stringify(roleUser));
      db.logAction(roleUser.id, 'SWITCH_DEMO_ROLE', 'users', roleUser.id, `Simulasi berpindah ke peran: ${roleUser.full_name} (${roleUser.email})`);
    }
  };

  return {
    user,
    activeRoleId,
    activeRoleName,
    login,
    signup,
    logout,
    switchRole
  };
};
