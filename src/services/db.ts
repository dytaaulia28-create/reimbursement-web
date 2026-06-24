// ReimHub Database Connector for Supabase
import { ref } from 'vue';
import { supabase } from './supabaseClient';

export interface Role {
  id: number;
  role_name: string;
}

export interface Department {
  id: number;
  department_name: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role_id: number;
  department_id?: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Category {
  id: number;
  category_name: string;
  gl_code: string;
}

export interface Reimbursement {
  id: string;
  code: string;
  employee_id: string;
  category_id: number;
  description: string;
  amount: number;
  transaction_date: string;
  status: 'draft' | 'pending_manager' | 'rejected_manager' | 'pending_finance' | 'rejected_finance' | 'pending_payment' | 'paid' | 'archived';
  current_stage: 'submission' | 'manager' | 'finance' | 'treasury' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ReimbursementReceipt {
  id: string;
  reimbursement_id: string;
  receipt_path: string;
  checksum: string;
  mime_type: string;
  uploaded_at: string;
}

export interface ApprovalLog {
  id: string;
  reimbursement_id: string;
  actor_id: string;
  stage: string;
  decision: 'approved' | 'rejected';
  notes?: string;
  acted_at: string;
}

export interface VerificationLog {
  id: string;
  reimbursement_id: string;
  actor_id: string;
  decision: 'verified' | 'rejected';
  notes?: string;
  verified_at: string;
}

export interface Payment {
  id: string;
  reimbursement_id: string;
  treasury_id: string;
  method: string;
  bank_name: string;
  reference_no: string;
  proof_path?: string;
  paid_at: string;
}

export interface LedgerEntry {
  id: string;
  reimbursement_id: string;
  account_code: string;
  debit: number;
  credit: number;
  entry_date: string;
  memo: string;
}

export interface Document {
  id: string;
  reimbursement_id: string;
  doc_type: string;
  file_path: string;
  generated_at: string;
}

export interface Archive {
  id: string;
  reimbursement_id: string;
  archive_path: string;
  archived_at: string;
  archived_by: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity: string;
  entity_id?: string;
  ip_address: string;
  created_at: string;
  detail?: string;
}

export interface BankAccount {
  id: number;
  bank: string;
  accountNo: string;
  name: string;
  balance: number;
}

class ReimHubDatabase {
  // Reactive local cache refs
  private roles = ref<Role[]>([]);
  private departments = ref<Department[]>([]);
  private categories = ref<Category[]>([]);
  private bankAccounts = ref<BankAccount[]>([]);
  private users = ref<User[]>([]);
  private reimbursements = ref<Reimbursement[]>([]);
  private receipts = ref<ReimbursementReceipt[]>([]);
  private approvalLogs = ref<ApprovalLog[]>([]);
  private verificationLogs = ref<VerificationLog[]>([]);
  private payments = ref<Payment[]>([]);
  private ledgerEntries = ref<LedgerEntry[]>([]);
  private documents = ref<Document[]>([]);
  private archives = ref<Archive[]>([]);
  private notifications = ref<Notification[]>([]);
  private auditLogs = ref<AuditLog[]>([]);
  public dbError = ref<string | null>(null);

  constructor() {
    this.refresh();
  }

  // Refresh and load cache from Supabase
  public async refresh(): Promise<void> {
    try {
      this.dbError.value = null;
      const [
        { data: r },
        { data: d },
        { data: c },
        { data: b },
        { data: u },
        { data: re },
        { data: rec },
        { data: app },
        { data: ver },
        { data: pay },
        { data: led },
        { data: doc },
        { data: arc },
        { data: not },
        { data: aud }
      ] = await Promise.all([
        supabase.from('roles').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('users').select('*'),
        supabase.from('reimbursements').select('*'),
        supabase.from('reimbursement_receipts').select('*'),
        supabase.from('approval_logs').select('*'),
        supabase.from('verification_logs').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('ledger_entries').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('archives').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
      ]);

      if (r) this.roles.value = r;
      if (d) this.departments.value = d;
      if (c) this.categories.value = c;
      if (b) {
        this.bankAccounts.value = b.map(x => ({
          id: x.id,
          bank: x.bank,
          accountNo: x.account_no,
          name: x.name,
          balance: Number(x.balance)
        }));
      }
      if (u) this.users.value = u;
      if (re) {
        this.reimbursements.value = re.map(x => ({
          ...x,
          amount: Number(x.amount)
        })) as any;
      }
      if (rec) this.receipts.value = rec;
      if (app) this.approvalLogs.value = app as any;
      if (ver) this.verificationLogs.value = ver as any;
      if (pay) this.payments.value = pay;
      if (led) {
        this.ledgerEntries.value = led.map(x => ({
          ...x,
          debit: Number(x.debit),
          credit: Number(x.credit)
        }));
      }
      if (doc) this.documents.value = doc;
      if (arc) this.archives.value = arc;
      if (not) this.notifications.value = not;
      if (aud) this.auditLogs.value = aud;
      this.dbError.value = null;
    } catch (err: any) {
      console.error('Error fetching initial data from Supabase:', err);
      this.dbError.value = err?.message || String(err);
    }
  }

  // Fallback / legacy initializer
  public initDatabase(force = false): void {
    this.refresh();
  }

  // Getters (synchronous for computed properties)
  public getRoles(): Role[] { return this.roles.value; }
  public getDepartments(): Department[] { return this.departments.value; }
  public getCategories(): Category[] { return this.categories.value; }
  public getBankAccounts(): BankAccount[] { return this.bankAccounts.value; }
  public getUsers(): User[] { return this.users.value; }
  public getUserById(id: string): User | undefined { return this.users.value.find(u => u.id === id); }
  public getReimbursements(): Reimbursement[] { return this.reimbursements.value; }
  public getReceipts(): ReimbursementReceipt[] { return this.receipts.value; }
  public getReceiptForReimbursement(reimId: string): ReimbursementReceipt | undefined {
    return this.receipts.value.find(r => r.reimbursement_id === reimId);
  }
  public getApprovalLogs(): ApprovalLog[] { return this.approvalLogs.value; }
  public getVerificationLogs(): VerificationLog[] { return this.verificationLogs.value; }
  public getPayments(): Payment[] { return this.payments.value; }
  public getLedgerEntries(): LedgerEntry[] { return this.ledgerEntries.value; }
  public getArchives(): Archive[] { return this.archives.value; }
  public getNotifications(userId: string): Notification[] {
    return this.notifications.value.filter(n => n.user_id === userId);
  }
  public getAuditLogs(): AuditLog[] { return this.auditLogs.value; }

  // Deduct Bank Balance
  public async deductBankAccountBalance(bankName: string, amount: number): Promise<void> {
    const account = this.bankAccounts.value.find(a => {
      const aName = a.bank.toLowerCase();
      const bName = bankName.toLowerCase();
      return aName.includes(bName) || bName.includes(aName);
    });

    if (account) {
      account.balance -= amount;
      const { error } = await supabase
        .from('bank_accounts')
        .update({ balance: account.balance })
        .eq('id', account.id);
      if (error) console.error('Error updating bank balance:', error);
    }
  }

  // Users Management
  public async addUser(user: Omit<User, 'created_at'> & { id?: string }): Promise<User> {
    let nextId = user.id;
    if (!nextId) {
      // Generate custom ID based on role prefix
      let prefix = 'K';
      if (user.role_id === 2) prefix = 'A';
      else if (user.role_id === 3) prefix = 'F';
      else if (user.role_id === 4) prefix = 'T';
      else if (user.role_id === 5) prefix = 'M';

      const sameRoleUsers = this.users.value.filter(u => u.id.startsWith(prefix));
      const nextNum = sameRoleUsers.length + 1;
      nextId = `${prefix}${String(nextNum).padStart(4, '0')}`;
    }

    const newUser: User = {
      ...user,
      id: nextId,
      created_at: new Date().toISOString()
    } as User;

    // Optimistic Update
    this.users.value.push(newUser);

    const { error } = await supabase.from('users').insert([newUser]);
    if (error) console.error('Error adding user to Supabase:', error);

    this.logAction('usr-admin', 'CREATE_USER', 'users', newUser.id, `Membuat user baru: ${newUser.full_name}`);
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const idx = this.users.value.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users.value[idx] = { ...this.users.value[idx], ...updates };
      
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) console.error('Error updating user in Supabase:', error);

      this.logAction('usr-admin', 'UPDATE_USER', 'users', id, `Mengubah data user: ${this.users.value[idx].full_name}`);
    }
  }

  public async deleteUser(id: string): Promise<void> {
    this.users.value = this.users.value.filter(u => u.id !== id);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error('Error deleting user from Supabase:', error);
    this.logAction('usr-admin', 'DELETE_USER', 'users', id, `Menghapus user ID: ${id}`);
  }

  // Categories Management
  public async addCategory(cat: Omit<Category, 'id'>): Promise<Category> {
    const nextId = this.categories.value.length ? Math.max(...this.categories.value.map(c => c.id)) + 1 : 1;
    const newCat = { ...cat, id: nextId };

    this.categories.value.push(newCat);

    const { error } = await supabase.from('categories').insert([newCat]);
    if (error) console.error('Error adding category to Supabase:', error);

    this.logAction('usr-admin', 'CREATE_CATEGORY', 'categories', newCat.id.toString(), `Menambah kategori: ${newCat.category_name}`);
    return newCat;
  }

  public async updateCategory(id: number, updates: Partial<Category>): Promise<void> {
    const idx = this.categories.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.categories.value[idx] = { ...this.categories.value[idx], ...updates };

      const { error } = await supabase.from('categories').update(updates).eq('id', id);
      if (error) console.error('Error updating category in Supabase:', error);

      this.logAction('usr-admin', 'UPDATE_CATEGORY', 'categories', id.toString(), `Mengubah kategori: ${this.categories.value[idx].category_name}`);
    }
  }

  public async deleteCategory(id: number): Promise<void> {
    this.categories.value = this.categories.value.filter(c => c.id !== id);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) console.error('Error deleting category from Supabase:', error);
    this.logAction('usr-admin', 'DELETE_CATEGORY', 'categories', id.toString(), `Menghapus kategori ID: ${id}`);
  }

  // Notifications Management
  public async markNotificationRead(id: string): Promise<void> {
    const idx = this.notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      const readAt = new Date().toISOString();
      this.notifications.value[idx].read_at = readAt;
      const { error } = await supabase.from('notifications').update({ read_at: readAt }).eq('id', id);
      if (error) console.error('Error marking notification read:', error);
    }
  }

  // CREATE REIMBURSEMENT
  public async createReimbursement(data: {
    employee_id: string;
    category_id: number;
    description: string;
    amount: number;
    transaction_date: string;
    receipt_image: string;
    isSubmit: boolean;
  }): Promise<Reimbursement> {
    const year = new Date().getFullYear();
    const count = this.reimbursements.value.length + 1;
    const code = `REIM-${year}-${String(count).padStart(4, '0')}`;
    const reimId = `reim-${Date.now()}`;

    const newReim: Reimbursement = {
      id: reimId,
      code,
      employee_id: data.employee_id,
      category_id: data.category_id,
      description: data.description,
      amount: data.amount,
      transaction_date: data.transaction_date,
      status: data.isSubmit ? 'pending_manager' : 'draft',
      current_stage: data.isSubmit ? 'manager' : 'submission',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Receipts record
    const receiptId = `rec-${Date.now()}`;
    const newReceipt: ReimbursementReceipt = {
      id: receiptId,
      reimbursement_id: reimId,
      receipt_path: data.receipt_image || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      mime_type: 'image/jpeg',
      uploaded_at: new Date().toISOString()
    };

    // Optimistic update
    this.reimbursements.value.push(newReim);
    this.receipts.value.push(newReceipt);

    // Save to Supabase
    const { error: reimError } = await supabase.from('reimbursements').insert([newReim]);
    if (reimError) console.error('Error inserting reimbursement to Supabase:', reimError);

    const { error: recError } = await supabase.from('reimbursement_receipts').insert([newReceipt]);
    if (recError) console.error('Error inserting receipt to Supabase:', recError);

    if (data.isSubmit) {
      await this.sendNotificationToRole(2, 'Persetujuan Baru', `Karyawan ${this.getUserById(data.employee_id)?.full_name} mengajukan reimbursement ${code}`);
      await this.logAction(data.employee_id, 'SUBMIT_REIMBURSEMENT', 'reimbursements', newReim.id, `Mengajukan reimbursement ${code} senilai Rp${data.amount.toLocaleString('id-ID')}`);
    } else {
      await this.logAction(data.employee_id, 'CREATE_DRAFT', 'reimbursements', newReim.id, `Membuat draft reimbursement ${code}`);
    }

    return newReim;
  }

  // SUBMIT DRAFT
  public async submitDraft(reimId: string, employeeId: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1 && this.reimbursements.value[idx].status === 'draft') {
      const code = this.reimbursements.value[idx].code;
      this.reimbursements.value[idx].status = 'pending_manager';
      this.reimbursements.value[idx].current_stage = 'manager';
      this.reimbursements.value[idx].updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('reimbursements')
        .update({
          status: 'pending_manager',
          current_stage: 'manager',
          updated_at: this.reimbursements.value[idx].updated_at
        })
        .eq('id', reimId);
      if (error) console.error('Error submitting draft in Supabase:', error);

      await this.sendNotificationToRole(2, 'Persetujuan Baru', `Karyawan ${this.getUserById(employeeId)?.full_name} mengajukan reimbursement ${code}`);
      await this.logAction(employeeId, 'SUBMIT_REIMBURSEMENT', 'reimbursements', reimId, `Mengajukan draft reimbursement ${code}`);
    }
  }

  // UPDATE REIMBURSEMENT
  public async updateReimbursement(reimId: string, employeeId: string, data: {
    category_id: number;
    description: string;
    amount: number;
    transaction_date: string;
    receipt_image?: string;
    isSubmit: boolean;
  }): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const current = this.reimbursements.value[idx];
      if (current.status !== 'draft') return;

      current.category_id = data.category_id;
      current.description = data.description;
      current.amount = data.amount;
      current.transaction_date = data.transaction_date;
      current.status = data.isSubmit ? 'pending_manager' : 'draft';
      current.current_stage = data.isSubmit ? 'manager' : 'submission';
      current.updated_at = new Date().toISOString();

      const { error: reimError } = await supabase
        .from('reimbursements')
        .update({
          category_id: data.category_id,
          description: data.description,
          amount: data.amount,
          transaction_date: data.transaction_date,
          status: current.status,
          current_stage: current.current_stage,
          updated_at: current.updated_at
        })
        .eq('id', reimId);
      if (reimError) console.error('Error updating reimbursement in Supabase:', reimError);

      if (data.receipt_image) {
        const rIdx = this.receipts.value.findIndex(r => r.reimbursement_id === reimId);
        if (rIdx !== -1) {
          this.receipts.value[rIdx].receipt_path = data.receipt_image;
          this.receipts.value[rIdx].uploaded_at = new Date().toISOString();

          const { error: recError } = await supabase
            .from('reimbursement_receipts')
            .update({ receipt_path: data.receipt_image, uploaded_at: this.receipts.value[rIdx].uploaded_at })
            .eq('id', this.receipts.value[rIdx].id);
          if (recError) console.error('Error updating receipt in Supabase:', recError);
        } else {
          const newReceipt: ReimbursementReceipt = {
            id: `rec-${Date.now()}`,
            reimbursement_id: reimId,
            receipt_path: data.receipt_image,
            checksum: 'updated-checksum',
            mime_type: 'image/jpeg',
            uploaded_at: new Date().toISOString()
          };
          this.receipts.value.push(newReceipt);
          const { error: recError } = await supabase.from('reimbursement_receipts').insert([newReceipt]);
          if (recError) console.error('Error inserting receipt to Supabase:', recError);
        }
      }

      if (data.isSubmit) {
        await this.sendNotificationToRole(2, 'Persetujuan Baru', `Karyawan ${this.getUserById(employeeId)?.full_name} mengajukan kembali reimbursement ${current.code}`);
        await this.logAction(employeeId, 'RESUBMIT_REIMBURSEMENT', 'reimbursements', reimId, `Mengajukan kembali reimbursement ${current.code} setelah revisi`);
      } else {
        await this.logAction(employeeId, 'EDIT_REIMBURSEMENT', 'reimbursements', reimId, `Mengedit draft reimbursement ${current.code}`);
      }
    }
  }

  // DELETE REIMBURSEMENT
  public async deleteReimbursement(reimId: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const code = this.reimbursements.value[idx].code;
      const empId = this.reimbursements.value[idx].employee_id;

      this.reimbursements.value.splice(idx, 1);
      this.receipts.value = this.receipts.value.filter(r => r.reimbursement_id !== reimId);

      const { error: reimError } = await supabase.from('reimbursements').delete().eq('id', reimId);
      if (reimError) console.error('Error deleting reimbursement from Supabase:', reimError);

      await this.logAction(empId, 'DELETE_REIMBURSEMENT', 'reimbursements', reimId, `Menghapus draft reimbursement ${code}`);
    }
  }

  // MANAGER APPROVAL ACTION
  public async actManager(reimId: string, actorId: string, decision: 'approved' | 'rejected', notes: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const reim = this.reimbursements.value[idx];
      reim.status = decision === 'approved' ? 'pending_finance' : 'rejected_manager';
      reim.current_stage = decision === 'approved' ? 'finance' : 'submission';
      reim.updated_at = new Date().toISOString();

      const { error: reimError } = await supabase
        .from('reimbursements')
        .update({
          status: reim.status,
          current_stage: reim.current_stage,
          updated_at: reim.updated_at
        })
        .eq('id', reimId);
      if (reimError) console.error('Error updating manager status in Supabase:', reimError);

      const log: ApprovalLog = {
        id: `app-${Date.now()}`,
        reimbursement_id: reimId,
        actor_id: actorId,
        stage: 'manager',
        decision,
        notes: notes || undefined,
        acted_at: new Date().toISOString()
      };
      this.approvalLogs.value.push(log);
      const { error: logError } = await supabase.from('approval_logs').insert([log]);
      if (logError) console.error('Error inserting approval log to Supabase:', logError);

      if (decision === 'approved') {
        await this.sendNotification(reim.employee_id, 'Persetujuan Atasan', `Pengajuan ${reim.code} disetujui atasan. Menunggu verifikasi Finance.`);
        await this.sendNotificationToRole(3, 'Verifikasi Baru', `Reimbursement ${reim.code} disetujui atasan, memerlukan verifikasi.`);
        await this.logAction(actorId, 'APPROVE_MANAGER', 'reimbursements', reimId, `Menyetujui reimbursement ${reim.code}. Notes: ${notes || '-'}`);
      } else {
        await this.sendNotification(reim.employee_id, 'Pengajuan Ditolak Atasan', `Pengajuan ${reim.code} ditolak oleh atasan. Notes: ${notes || '-'}`);
        await this.logAction(actorId, 'REJECT_MANAGER', 'reimbursements', reimId, `Menolak reimbursement ${reim.code}. Notes: ${notes || '-'}`);
      }
    }
  }

  // FINANCE VERIFICATION ACTION
  public async actFinance(reimId: string, actorId: string, decision: 'verified' | 'rejected', notes: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const reim = this.reimbursements.value[idx];
      reim.status = decision === 'verified' ? 'pending_payment' : 'rejected_finance';
      reim.current_stage = decision === 'verified' ? 'treasury' : 'submission';
      reim.updated_at = new Date().toISOString();

      const { error: reimError } = await supabase
        .from('reimbursements')
        .update({
          status: reim.status,
          current_stage: reim.current_stage,
          updated_at: reim.updated_at
        })
        .eq('id', reimId);
      if (reimError) console.error('Error updating finance status in Supabase:', reimError);

      const log: VerificationLog = {
        id: `ver-${Date.now()}`,
        reimbursement_id: reimId,
        actor_id: actorId,
        decision,
        notes: notes || undefined,
        verified_at: new Date().toISOString()
      };
      this.verificationLogs.value.push(log);
      const { error: logError } = await supabase.from('verification_logs').insert([log]);
      if (logError) console.error('Error inserting verification log to Supabase:', logError);

      if (decision === 'verified') {
        await this.sendNotification(reim.employee_id, 'Verifikasi Keuangan', `Pengajuan ${reim.code} berhasil diverifikasi keuangan. Menunggu pembayaran.`);
        await this.sendNotificationToRole(4, 'Pembayaran Baru', `Reimbursement ${reim.code} siap dibayarkan.`);
        await this.logAction(actorId, 'VERIFY_FINANCE', 'reimbursements', reimId, `Memverifikasi reimbursement ${reim.code}. Notes: ${notes || '-'}`);
      } else {
        await this.sendNotification(reim.employee_id, 'Verifikasi Keuangan Ditolak', `Pengajuan ${reim.code} ditolak oleh keuangan. Notes: ${notes || '-'}`);
        await this.logAction(actorId, 'REJECT_FINANCE', 'reimbursements', reimId, `Menolak verifikasi reimbursement ${reim.code}. Notes: ${notes || '-'}`);
      }
    }
  }

  // TREASURY PAYMENT ACTION
  public async actTreasury(reimId: string, actorId: string, bankName: string, refNo: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const reim = this.reimbursements.value[idx];
      reim.status = 'paid';
      reim.current_stage = 'treasury';
      reim.updated_at = new Date().toISOString();

      const { error: reimError } = await supabase
        .from('reimbursements')
        .update({
          status: 'paid',
          current_stage: 'treasury',
          updated_at: reim.updated_at
        })
        .eq('id', reimId);
      if (reimError) console.error('Error updating treasury paid status in Supabase:', reimError);

      const payment: Payment = {
        id: `pay-${Date.now()}`,
        reimbursement_id: reimId,
        treasury_id: actorId,
        method: 'Bank Transfer',
        bank_name: bankName,
        reference_no: refNo,
        proof_path: '',
        paid_at: new Date().toISOString()
      };
      this.payments.value.push(payment);
      const { error: payError } = await supabase.from('payments').insert([payment]);
      if (payError) console.error('Error inserting payment to Supabase:', payError);

      // Deduct Bank balance
      await this.deductBankAccountBalance(bankName, reim.amount);

      // Post General Ledger journal
      await this.postGeneralLedger(reim, payment);

      await this.sendNotification(reim.employee_id, 'Reimbursement Cair', `Uang reimbursement ${reim.code} telah ditransfer.`);
      await this.logAction(actorId, 'PAY_TREASURY', 'reimbursements', reimId, `Membayarkan reimbursement ${reim.code} via ${bankName} Ref: ${refNo}`);

      // Auto Archive
      await this.autoArchiveReimbursement(reim.id, actorId);
    }
  }

  // GENERAL LEDGER POSTING
  private async postGeneralLedger(reim: Reimbursement, payment: Payment): Promise<void> {
    const category = this.categories.value.find(c => c.id === reim.category_id);
    const glCode = category ? category.gl_code : '5000-EXP';

    const debitEntry: LedgerEntry = {
      id: `led-${Date.now()}-dr`,
      reimbursement_id: reim.id,
      account_code: glCode,
      debit: reim.amount,
      credit: 0,
      entry_date: new Date().toISOString(),
      memo: `Beban ${category?.category_name || 'Reimbursement'} - ${reim.code}`
    };

    const creditEntry: LedgerEntry = {
      id: `led-${Date.now()}-cr`,
      reimbursement_id: reim.id,
      account_code: '1011-BANK',
      debit: 0,
      credit: reim.amount,
      entry_date: new Date().toISOString(),
      memo: `Kas/Bank Pembayaran - ${reim.code} via ${payment.bank_name}`
    };

    this.ledgerEntries.value.push(debitEntry, creditEntry);
    const { error } = await supabase.from('ledger_entries').insert([debitEntry, creditEntry]);
    if (error) console.error('Error inserting ledger entries to Supabase:', error);
  }

  // AUTO ELECTRONIC ARCHIVING
  private async autoArchiveReimbursement(reimId: string, actorId: string): Promise<void> {
    const idx = this.reimbursements.value.findIndex(r => r.id === reimId);
    if (idx !== -1) {
      const reim = this.reimbursements.value[idx];
      reim.status = 'archived';
      reim.current_stage = 'archived';
      reim.updated_at = new Date().toISOString();

      await supabase
        .from('reimbursements')
        .update({
          status: 'archived',
          current_stage: 'archived',
          updated_at: reim.updated_at
        })
        .eq('id', reimId);

      const newArchive: Archive = {
        id: `arc-${Date.now()}`,
        reimbursement_id: reimId,
        archive_path: `/storage/archives/${reim.code}_archive.pdf`,
        archived_at: new Date().toISOString(),
        archived_by: actorId
      };
      this.archives.value.push(newArchive);
      await supabase.from('archives').insert([newArchive]);

      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        reimbursement_id: reimId,
        doc_type: 'electronic_archive_pdf',
        file_path: `/storage/archives/${reim.code}_archive.pdf`,
        generated_at: new Date().toISOString()
      };
      this.documents.value.push(newDoc);
      await supabase.from('documents').insert([newDoc]);

      await this.logAction(actorId, 'SYSTEM_ARCHIVE', 'reimbursements', reimId, `Mengarsipkan secara elektronik reimbursement ${reim.code} dan men-generate dokumen arsip PDF.`);
    }
  }

  // NOTIFICATION UTILS
  private async sendNotification(userId: string, title: string, body: string): Promise<void> {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      title,
      body,
      created_at: new Date().toISOString()
    };
    this.notifications.value.push(notif);
    const { error } = await supabase.from('notifications').insert([notif]);
    if (error) console.error('Error sending notification to Supabase:', error);
  }

  private async sendNotificationToRole(roleId: number, title: string, body: string): Promise<void> {
    const targetUsers = this.users.value.filter(u => u.role_id === roleId);
    await Promise.all(targetUsers.map(u => this.sendNotification(u.id, title, body)));
  }

  // AUDIT LOGGING UTILS
  public async logAction(actorId: string, action: string, entity: string, entityId?: string, detail?: string): Promise<void> {
    const actor = this.getUserById(actorId) || { full_name: actorId === 'usr-admin' ? 'Administrator' : actorId };
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      actor_id: actorId,
      actor_name: actor.full_name,
      action,
      entity,
      entity_id: entityId,
      ip_address: '192.168.1.100',
      created_at: new Date().toISOString(),
      ...(detail ? { detail } : {})
    };

    this.auditLogs.value.unshift(log);
    if (this.auditLogs.value.length > 500) this.auditLogs.value.pop();

    const { error } = await supabase.from('audit_logs').insert([log]);
    if (error) console.error('Error logging audit action to Supabase:', error);
  }

  // Friendly status POV labels
  public getFriendlyStatusLabel(status: string, roleId?: number | null): string {
    if (roleId === 2) {
      switch (status) {
        case 'pending_manager': return 'Perlu Persetujuan';
        case 'rejected_manager': return 'Anda Tolak';
        case 'pending_finance': return 'Disetujui (Menunggu Finance)';
        case 'rejected_finance': return 'Ditolak Finance';
        case 'pending_payment': return 'Disetujui (Menunggu Bayar)';
        case 'paid': return 'Selesai';
        case 'archived': return 'Selesai';
        default: break;
      }
    }
    
    if (roleId === 3) {
      switch (status) {
        case 'pending_manager': return 'Menunggu Atasan';
        case 'rejected_manager': return 'Ditolak Atasan';
        case 'pending_finance': return 'Perlu Verifikasi';
        case 'rejected_finance': return 'Anda Tolak';
        case 'pending_payment': return 'Disetujui (Menunggu Bayar)';
        case 'paid': return 'Selesai';
        case 'archived': return 'Selesai';
        default: break;
      }
    }

    if (roleId === 4) {
      switch (status) {
        case 'pending_payment': return 'Perlu Dibayar';
        case 'paid': return 'Lunas';
        case 'archived': return 'Lunas';
        default: break;
      }
    }

    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_manager': return 'Menunggu Persetujuan Atasan';
      case 'rejected_manager': return 'Ditolak Atasan';
      case 'pending_finance': return 'Menunggu Verifikasi Finance';
      case 'rejected_finance': return 'Ditolak Finance';
      case 'pending_payment': return 'Antrean Pembayaran';
      case 'paid': return 'Pembayaran Berhasil';
      case 'archived': return 'Pembayaran Berhasil';
      default: return status;
    }
  }
}

export const db = new ReimHubDatabase();
