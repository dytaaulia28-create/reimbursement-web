import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uorfkpqypqmdesxfquas.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmZrcHF5cHFtZGVzeGZxdWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODU4ODcsImV4cCI6MjA5Nzc2MTg4N30.hjaIy1-NLdiAwn1y6qa_4BRCzpdVdW5x9hzfJ05n2lE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: ver } = await supabase.from('verification_logs').select('*');
  console.log('--- VERIFICATION LOGS ---');
  console.log(ver);

  const { data: pay } = await supabase.from('payments').select('*');
  console.log('--- PAYMENTS ---');
  console.log(pay);

  const { data: usr } = await supabase.from('users').select('*');
  console.log('--- USERS ---');
  console.log(usr);
}

check();
