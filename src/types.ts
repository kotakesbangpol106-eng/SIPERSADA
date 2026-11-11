export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'pejabat' | 'staf';
  unit: string;
  position: string;
  active: boolean;
  createdAt?: string;
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
  me: UserProfile | null;
  documents: DocumentItem[];
  approvals: ApprovalItem[];
  dispositions: DispositionItem[];
  profiles: UserProfile[];
  activities: ActivityItem[];
  notifications: NotificationItem[];
  verifications: VerificationItem[];
  googleDriveSync?: {
    connectedEmail?: string;
    lastBackupAt?: string;
    folderId?: string;
    folderName?: string;
    folderUrl?: string;
  };
}
