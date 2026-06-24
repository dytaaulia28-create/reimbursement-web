import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjjeuzwsqmjncqdihkrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqamV1endzcW1qbmNxZGloa3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzA1MTIsImV4cCI6MjA5NzgwNjUxMn0.kb-jYemSdlMEythUqf7MPHd2LdN5_26MsldPCXwjzIE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) {
      console.log('Roles error:', rolesError.message);
    } else {
      console.log('Roles found:', roles.length);
    }

    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) {
      console.log('Users error:', usersError.message);
    } else {
      console.log('Users found:', users.length);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

check();
