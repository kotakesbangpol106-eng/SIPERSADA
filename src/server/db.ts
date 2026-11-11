import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'pejabat' | 'staf';
  unit: string;
  position: string;
  active: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  kind: 'masuk' | 'keluar';
  number: string;
  agenda?: string;
  date: string;
  correspondent: string;
  subject: string;
  classification: 'Biasa' | 'Penting' | 'Rahasia' | 'Undangan' | 'Pemberitahuan';
  urgency: 'Biasa' | 'Segera' | 'Sangat Segera';
  notes?: string;
  data: {
    agenda?: string;
    receivedDate?: string;
  };
  fileName: string;
  fileSize: string;
  fileHash: string;
  fileData?: string;
  ownerId: string;
  archived: boolean;
  archivedAt: string | null;
  googleDriveFileId?: string;
  googleDriveLink?: string;
  googleDriveSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalItem {
  id: string;
  documentId: string;
  applicantId: string;
  signerId: string;
  status: 'DRAFT' | 'MENUNGGU PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'DIBATALKAN';
  notes?: string;
  reason?: string;
  approvedName?: string;
  approvedPosition?: string;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationItem {
  id: string;
  token: string;
  documentId: string;
  requestId: string;
  fileHash: string;
  status: 'DOKUMEN TERVERIFIKASI' | 'DOKUMEN TIDAK VALID';
  number: string;
  date: string;
  subject: string;
  approvedName: string;
  approvedPosition: string;
  approvedAt: string;
  createdAt: string;
}

export interface DispositionItem {
  id: string;
  documentId: string;
  giverId: string;
  recipientId: string;
  instruction: string;
  deadline: string;
  urgency: 'Biasa' | 'Segera' | 'Sangat Segera';
  status: 'BARU' | 'DALAM PROSES' | 'SELESAI';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  documentId: string | null;
  userId: string;
  userName: string;
  action: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  read: boolean;
  createdAt: string;
}

export interface SystemState {
  profiles: UserProfile[];
  documents: DocumentItem[];
  approvals: ApprovalItem[];
  verifications: VerificationItem[];
  dispositions: DispositionItem[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  googleDriveSync?: {
    connectedEmail?: string;
    lastBackupAt?: string;
    folderId?: string;
    folderName?: string;
    folderUrl?: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sipersada_db.json');

// Reset all demo accounts. The first user to register becomes the Administrator!
const INITIAL_PROFILES: UserProfile[] = [];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-m-001',
    kind: 'masuk',
    number: '005/SETDA-KOTA/284/2026',
    agenda: 'AGD-2026-0042',
    date: '2026-10-24',
    correspondent: 'Sekretariat Daerah Kota Gorontalo',
    subject: 'Undangan Rapat Koordinasi Persiapan Hari Sumpah Pemuda Ke-98',
    classification: 'Undangan',
    urgency: 'Segera',
    notes: 'Rapat bertempat di Aula Bantayo Yiladia Kota Gorontalo pukul 09.00 WITA.',
    data: {
      agenda: 'AGD-2026-0042',
      receivedDate: '2026-10-25',
    },
    fileName: 'Undangan_Rakor_Sumpah_Pemuda_Setda.pdf',
    fileSize: '342 KB',
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ownerId: 'initial',
    archived: false,
    archivedAt: null,
    createdAt: '2026-10-25T08:30:00.000Z',
    updatedAt: '2026-10-25T08:30:00.000Z',
  },
  {
    id: 'doc-k-001',
    kind: 'keluar',
    number: '000.1.2/BAKESBANGPOL/318/2026',
    date: '2026-10-26',
    correspondent: 'Dekan Fakultas Ilmu Sosial Universitas Negeri Gorontalo',
    subject: 'Surat Rekomendasi Izin Penelitian Mahasiswa Jurusan Ilmu Administrasi',
    classification: 'Biasa',
    urgency: 'Biasa',
    notes: 'Rekomendasi penelitian atas nama Mohamad Rizky Daud tentang Partisipasi Politik Masyarakat.',
    data: {},
    fileName: 'Rekomendasi_Penelitian_UNG_318_2026.pdf',
    fileSize: '215 KB',
    fileHash: 'c775e7b757ede630cd0aa1113bd102661ab38829ca52a6422ab782862f268646',
    ownerId: 'initial',
    archived: false,
    archivedAt: null,
    createdAt: '2026-10-26T10:00:00.000Z',
    updatedAt: '2026-10-27T03:30:00.000Z',
  },
];

const INITIAL_APPROVALS: ApprovalItem[] = [];
const INITIAL_VERIFICATIONS: VerificationItem[] = [];
const INITIAL_DISPOSITIONS: DispositionItem[] = [];
const INITIAL_ACTIVITIES: ActivityItem[] = [];
const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

class SipersadaDB {
  private data: SystemState;

  constructor() {
    this.data = this.load();
  }

  private load(): SystemState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.profiles && Array.isArray(parsed.profiles)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading DB file:', err);
    }

    const initial: SystemState = {
      profiles: INITIAL_PROFILES,
      documents: INITIAL_DOCUMENTS,
      approvals: INITIAL_APPROVALS,
      verifications: INITIAL_VERIFICATIONS,
      dispositions: INITIAL_DISPOSITIONS,
      activities: INITIAL_ACTIVITIES,
      notifications: INITIAL_NOTIFICATIONS,
    };
    this.save(initial);
    return initial;
  }

  public save(state?: SystemState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving DB file:', err);
    }
  }

  public hasAdmin(): boolean {
    return this.data.profiles.some(u => u.role === 'admin' && u.active);
  }

  public getProfileCount(): number {
    return this.data.profiles.length;
  }

  public registerFirstAdmin(data: {
    name: string;
    email: string;
    password: string;
    unit?: string;
    position?: string;
  }): UserProfile {
    if (this.hasAdmin()) {
      throw new Error(
        'Administrator sudah terdaftar. Pendaftaran akun baru hanya dapat dilakukan oleh Administrator melalui menu Manajemen Pengguna.'
      );
    }

    const adminUser: UserProfile = {
      id: `usr-admin-${crypto.randomBytes(4).toString('hex')}`,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      role: 'admin',
      unit: data.unit?.trim() || 'Sub Bagian Umum & Kepegawaian',
      position: data.position?.trim() || 'Administrator Sistem Persuratan',
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.data.profiles = [adminUser];
    this.addActivity(
      null,
      adminUser.id,
      adminUser.name,
      `Pendaftaran pertama sistem: Administrator utama didaftarkan (${adminUser.email})`
    );
    this.save();
    return adminUser;
  }

  public resetAllUsers() {
    this.data.profiles = [];
    this.data.notifications = [];
    this.data.activities = [
      {
        id: `act-${Date.now()}`,
        documentId: null,
        userId: 'system',
        userName: 'Sistem',
        action: 'Seluruh akun dan password telah direset. Menunggu inisialisasi administrator pertama.',
        createdAt: new Date().toISOString(),
      },
    ];
    this.save();
  }

  public getState(currentUser: UserProfile | null) {
    const safeProfiles = this.data.profiles.map(({ password, ...rest }) => rest as UserProfile);
    const safeUser = currentUser
      ? (({ password, ...rest }) => rest as UserProfile)(currentUser)
      : null;

    return {
      me: safeUser,
      documents: this.data.documents,
      approvals: this.data.approvals,
      dispositions: this.data.dispositions,
      profiles: safeProfiles,
      activities: this.data.activities,
      notifications: safeUser
        ? this.data.notifications.filter(n => n.userId === safeUser.id || n.userId === 'all')
        : this.data.notifications,
      verifications: this.data.verifications,
      googleDriveSync: this.data.googleDriveSync,
    };
  }

  public getRawDatabaseJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public recordDriveBackup(folderId: string, folderUrl: string, email: string, user?: UserProfile) {
    this.data.googleDriveSync = {
      connectedEmail: email,
      lastBackupAt: new Date().toISOString(),
      folderId,
      folderName: 'SIPERSADA Kesbangpol Kota Gorontalo',
      folderUrl,
    };
    if (user) {
      this.addActivity(
        null,
        user.id,
        user.name,
        `Mencadangkan database ke Google Drive (${email})`
      );
    }
    this.save();
  }

  public updateDocumentDriveInfo(id: string, driveFileId: string, driveLink: string, user?: UserProfile) {
    const doc = this.data.documents.find(d => d.id === id);
    if (doc) {
      doc.googleDriveFileId = driveFileId;
      doc.googleDriveLink = driveLink;
      doc.googleDriveSyncedAt = new Date().toISOString();
      if (user) {
        this.addActivity(
          doc.id,
          user.id,
          user.name,
          `Menyinkronkan file ${doc.number} ke Google Drive`
        );
      }
      this.save();
    }
    return doc;
  }

  public restoreDatabase(backupData: any, user: UserProfile) {
    if (!backupData || !Array.isArray(backupData.documents)) {
      throw new Error('Format file cadangan database tidak valid.');
    }
    // Retain current profiles if the backup has no profiles, or restore cleanly
    const restoredProfiles = Array.isArray(backupData.profiles) && backupData.profiles.length > 0
      ? backupData.profiles
      : this.data.profiles;

    this.data = {
      profiles: restoredProfiles,
      documents: backupData.documents || [],
      approvals: backupData.approvals || [],
      verifications: backupData.verifications || [],
      dispositions: backupData.dispositions || [],
      activities: [
        {
          id: `act-${Date.now()}`,
          documentId: null,
          userId: user.id,
          userName: user.name,
          action: 'Memulihkan database dari cadangan Google Drive',
          createdAt: new Date().toISOString(),
        },
        ...(backupData.activities || []),
      ].slice(0, 200),
      notifications: backupData.notifications || [],
      googleDriveSync: this.data.googleDriveSync,
    };
    this.save();
    return true;
  }

  public findUserByEmail(email: string): UserProfile | undefined {
    return this.data.profiles.find(
      u => u.email.toLowerCase().trim() === email.toLowerCase().trim()
    );
  }

  public findUserById(id: string): UserProfile | undefined {
    return this.data.profiles.find(u => u.id === id);
  }

  public createOrUpdateUser(user: Partial<UserProfile> & { id?: string }): UserProfile {
    if (user.id) {
      const idx = this.data.profiles.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        this.data.profiles[idx] = {
          ...this.data.profiles[idx],
          name: user.name || this.data.profiles[idx].name,
          unit: user.unit ?? this.data.profiles[idx].unit,
          position: user.position ?? this.data.profiles[idx].position,
          role: user.role ?? this.data.profiles[idx].role,
          active: user.active !== undefined ? user.active : this.data.profiles[idx].active,
          ...(user.password ? { password: user.password } : {}),
        };
        this.save();
        return this.data.profiles[idx];
      }
    }

    const newUser: UserProfile = {
      id: user.id || `usr-${crypto.randomBytes(4).toString('hex')}`,
      name: user.name || 'Pengguna Baru',
      email: (user.email || '').toLowerCase().trim(),
      password: user.password || 'Sipersada2026!',
      role: user.role || 'staf',
      unit: user.unit || 'Sub Bagian Umum & Kepegawaian',
      position: user.position || 'Staf',
      active: user.active !== undefined ? user.active : true,
      createdAt: new Date().toISOString(),
    };
    this.data.profiles.push(newUser);
    this.save();
    return newUser;
  }

  public deleteUser(userId: string, adminUser: UserProfile): boolean {
    if (adminUser.id === userId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
    }
    const userIdx = this.data.profiles.findIndex(u => u.id === userId);
    if (userIdx === -1) {
      throw new Error('Pengguna tidak ditemukan.');
    }
    const target = this.data.profiles[userIdx];
    this.data.profiles.splice(userIdx, 1);
    this.addActivity(
      null,
      adminUser.id,
      adminUser.name,
      `Menghapus akun pengguna: ${target.name} (${target.email})`
    );
    this.save();
    return true;
  }

  public createDocument(
    doc: Partial<DocumentItem>,
    creator: UserProfile,
    file?: { name: string; size: number; buffer?: Buffer }
  ): DocumentItem {
    const id = `doc-${crypto.randomBytes(6).toString('hex')}`;
    const fileHash = file?.buffer
      ? crypto.createHash('sha256').update(file.buffer).digest('hex')
      : crypto.createHash('sha256').update(id + Date.now()).digest('hex');

    const newDoc: DocumentItem = {
      id,
      kind: doc.kind === 'keluar' ? 'keluar' : 'masuk',
      number: doc.number || `000/KESBANGPOL/${Math.floor(100 + Math.random() * 900)}/2026`,
      agenda: doc.data?.agenda || doc.agenda || (doc.kind === 'masuk' ? `AGD-2026-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
      date: doc.date || new Date().toISOString().slice(0, 10),
      correspondent: doc.correspondent || (doc.kind === 'masuk' ? 'Instansi Pengirim' : 'Instansi Tujuan'),
      subject: doc.subject || 'Perihal Surat',
      classification: (doc.classification as any) || 'Biasa',
      urgency: (doc.urgency as any) || 'Biasa',
      notes: doc.notes || '',
      data: {
        agenda: doc.data?.agenda || doc.agenda,
        receivedDate: doc.data?.receivedDate || (doc.kind === 'masuk' ? new Date().toISOString().slice(0, 10) : undefined),
      },
      fileName: file?.name || doc.fileName || `Dokumen_${doc.kind || 'surat'}_${Date.now()}.pdf`,
      fileSize: file ? `${(file.size / 1024).toFixed(0)} KB` : doc.fileSize || '250 KB',
      fileHash,
      fileData: file?.buffer ? file.buffer.toString('base64') : undefined,
      ownerId: creator.id,
      archived: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.documents.unshift(newDoc);
    this.addActivity(
      newDoc.id,
      creator.id,
      creator.name,
      `Menambahkan surat ${newDoc.kind === 'masuk' ? 'masuk' : 'keluar'} baru: ${newDoc.number}`
    );
    this.save();
    return newDoc;
  }

  public updateDocument(
    id: string,
    doc: Partial<DocumentItem>,
    updater: UserProfile,
    file?: { name: string; size: number; buffer?: Buffer }
  ): DocumentItem {
    const idx = this.data.documents.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Surat tidak ditemukan.');

    const current = this.data.documents[idx];
    const fileHash = file?.buffer
      ? crypto.createHash('sha256').update(file.buffer).digest('hex')
      : current.fileHash;

    const updated: DocumentItem = {
      ...current,
      number: doc.number || current.number,
      date: doc.date || current.date,
      correspondent: doc.correspondent || current.correspondent,
      subject: doc.subject || current.subject,
      classification: (doc.classification as any) || current.classification,
      urgency: (doc.urgency as any) || current.urgency,
      notes: doc.notes !== undefined ? doc.notes : current.notes,
      data: {
        ...current.data,
        ...(doc.data || {}),
        agenda: doc.data?.agenda || doc.agenda || current.data.agenda,
      },
      fileName: file?.name || doc.fileName || current.fileName,
      fileSize: file ? `${(file.size / 1024).toFixed(0)} KB` : current.fileSize,
      fileHash,
      fileData: file?.buffer ? file.buffer.toString('base64') : current.fileData,
      updatedAt: new Date().toISOString(),
    };

    this.data.documents[idx] = updated;
    this.addActivity(
      updated.id,
      updater.id,
      updater.name,
      `Memperbarui informasi surat: ${updated.number}`
    );
    this.save();
    return updated;
  }

  public requestApproval(
    documentId: string,
    signerId: string,
    notes: string,
    applicant: UserProfile
  ): ApprovalItem {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) throw new Error('Surat keluar tidak ditemukan.');

    const newApproval: ApprovalItem = {
      id: `app-${crypto.randomBytes(4).toString('hex')}`,
      documentId,
      applicantId: applicant.id,
      signerId,
      status: 'MENUNGGU PERSETUJUAN',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.approvals.unshift(newApproval);
    this.addActivity(
      documentId,
      applicant.id,
      applicant.name,
      `Mengajukan permohonan persetujuan surat keluar ${doc.number}`
    );

    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: signerId,
      title: `Permohonan persetujuan surat dari ${applicant.name}: ${doc.number} (${doc.subject})`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return newApproval;
  }

  public decideApproval(
    approvalId: string,
    action: 'approve' | 'reject',
    reason: string,
    signer: UserProfile
  ): ApprovalItem {
    const approval = this.data.approvals.find(a => a.id === approvalId);
    if (!approval) throw new Error('Permohonan persetujuan tidak ditemukan.');

    const doc = this.data.documents.find(d => d.id === approval.documentId);
    if (!doc) throw new Error('Dokumen terkait tidak ditemukan.');

    approval.updatedAt = new Date().toISOString();

    if (action === 'approve') {
      approval.status = 'DISETUJUI';
      approval.approvedName = signer.name;
      approval.approvedPosition = signer.position;
      approval.approvedAt = new Date().toISOString();

      const existingVrf = this.data.verifications.find(v => v.requestId === approval.id);
      if (!existingVrf) {
        const token = `sip-gtlo-${doc.id.slice(-4)}-${crypto.randomBytes(3).toString('hex')}`;
        const newVrf: VerificationItem = {
          id: `vrf-${crypto.randomBytes(4).toString('hex')}`,
          token,
          documentId: doc.id,
          requestId: approval.id,
          fileHash: doc.fileHash,
          status: 'DOKUMEN TERVERIFIKASI',
          number: doc.number,
          date: doc.date,
          subject: doc.subject,
          approvedName: signer.name,
          approvedPosition: signer.position,
          approvedAt: approval.approvedAt,
          createdAt: new Date().toISOString(),
        };
        this.data.verifications.unshift(newVrf);
      }

      this.addActivity(
        doc.id,
        signer.id,
        signer.name,
        `Menyetujui surat ${doc.number} dan menerbitkan token verifikasi QR`
      );

      this.data.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: approval.applicantId,
        title: `Surat ${doc.number} telah DISETUJUI oleh ${signer.name}.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      approval.status = 'DITOLAK';
      approval.reason = reason || 'Catatan perbaikan tidak dicantumkan.';

      this.addActivity(
        doc.id,
        signer.id,
        signer.name,
        `Menolak permohonan persetujuan surat: ${doc.number} (Alasan: ${approval.reason})`
      );

      this.data.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: approval.applicantId,
        title: `Surat ${doc.number} DITOLAK oleh ${signer.name}: ${approval.reason}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.save();
    return approval;
  }

  public createDisposition(
    documentId: string,
    recipientId: string,
    instruction: string,
    deadline: string,
    urgency: 'Biasa' | 'Segera' | 'Sangat Segera',
    giver: UserProfile
  ): DispositionItem {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) throw new Error('Surat masuk tidak ditemukan.');

    const recipient = this.data.profiles.find(p => p.id === recipientId);
    if (!recipient) throw new Error('Penerima disposisi tidak valid.');

    const newDisp: DispositionItem = {
      id: `disp-${crypto.randomBytes(4).toString('hex')}`,
      documentId,
      giverId: giver.id,
      recipientId,
      instruction,
      deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      urgency: urgency || 'Biasa',
      status: 'BARU',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.dispositions.unshift(newDisp);
    this.addActivity(
      doc.id,
      giver.id,
      giver.name,
      `Membuat lembar disposisi surat ${doc.number} kepada ${recipient.name}`
    );

    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: recipientId,
      title: `Disposisi baru dari ${giver.name}: ${doc.number} (${instruction})`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return newDisp;
  }

  public updateDisposition(
    id: string,
    status: 'BARU' | 'DALAM PROSES' | 'SELESAI',
    notes: string,
    user: UserProfile
  ): DispositionItem {
    const disp = this.data.dispositions.find(d => d.id === id);
    if (!disp) throw new Error('Disposisi tidak ditemukan.');

    disp.status = status || disp.status;
    disp.notes = notes !== undefined ? notes : disp.notes;
    disp.updatedAt = new Date().toISOString();

    this.addActivity(
      disp.documentId,
      user.id,
      user.name,
      `Memperbarui status tindak lanjut disposisi menjadi: ${disp.status}`
    );

    this.save();
    return disp;
  }

  public toggleArchive(documentId: string, user: UserProfile): DocumentItem {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) throw new Error('Surat tidak ditemukan.');

    doc.archived = !doc.archived;
    doc.archivedAt = doc.archived ? new Date().toISOString() : null;
    doc.updatedAt = new Date().toISOString();

    this.addActivity(
      doc.id,
      user.id,
      user.name,
      doc.archived ? `Mengarsipkan surat: ${doc.number}` : `Mengeluarkan surat dari arsip: ${doc.number}`
    );

    this.save();
    return doc;
  }

  public deleteItem(id: string, user: UserProfile) {
    const docIdx = this.data.documents.findIndex(d => d.id === id);
    if (docIdx !== -1) {
      const doc = this.data.documents[docIdx];
      this.data.documents.splice(docIdx, 1);
      this.data.approvals = this.data.approvals.filter(a => a.documentId !== id);
      this.data.dispositions = this.data.dispositions.filter(d => d.documentId !== id);
      this.data.verifications = this.data.verifications.filter(v => v.documentId !== id);

      this.addActivity(
        null,
        user.id,
        user.name,
        `Menghapus dokumen persuratan: ${doc.number}`
      );
      this.save();
      return { success: true, deleted: 'document' };
    }

    const dispIdx = this.data.dispositions.findIndex(d => d.id === id);
    if (dispIdx !== -1) {
      this.data.dispositions.splice(dispIdx, 1);
      this.save();
      return { success: true, deleted: 'disposition' };
    }

    throw new Error('Item tidak ditemukan untuk dihapus.');
  }

  public markNotificationsRead(userId: string) {
    this.data.notifications.forEach(n => {
      if (n.userId === userId || n.userId === 'all') {
        n.read = true;
      }
    });
    this.save();
  }

  public getDocumentAudit(documentId: string) {
    return this.data.activities
      .filter(a => a.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public verifyToken(token: string) {
    const vrf = this.data.verifications.find(
      v => v.token.toLowerCase() === token.toLowerCase().trim()
    );
    if (!vrf) {
      return {
        status: 'DOKUMEN TIDAK VALID',
        message: 'Token verifikasi tidak tercatat pada sistem SIPERSADA Kesbangpol Kota Gorontalo.',
      };
    }

    const doc = this.data.documents.find(d => d.id === vrf.documentId);
    return {
      status: vrf.status,
      number: vrf.number,
      date: vrf.date,
      subject: vrf.subject,
      approvedName: vrf.approvedName,
      approvedPosition: vrf.approvedPosition,
      approvedAt: vrf.approvedAt,
      documentId: vrf.documentId,
      fileHash: vrf.fileHash,
      fileName: doc?.fileName || 'Dokumen_Resmi.pdf',
    };
  }

  private addActivity(documentId: string | null, userId: string, userName: string, action: string) {
    this.data.activities.unshift({
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentId,
      userId,
      userName,
      action,
      createdAt: new Date().toISOString(),
    });
    if (this.data.activities.length > 200) {
      this.data.activities = this.data.activities.slice(0, 200);
    }
  }
}

export const db = new SipersadaDB();
