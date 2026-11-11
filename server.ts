import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, UserProfile } from './src/server/db.js';
import { generateDocumentHtml } from './src/server/pdfRenderer.js';
import {
  getOrCreateSipersadaFolder,
  uploadFileToDrive,
  listDriveFolderFiles,
  downloadFileFromDrive,
  deleteFileFromDrive,
} from './src/server/googleDrive.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsing and cookies
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// Multer in-memory storage for document file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Middleware to resolve current user
app.use((req, res, next) => {
  const userId = req.cookies.sipersada_user_id || req.headers['x-user-id'];
  let currentUser: UserProfile | null = null;
  if (typeof userId === 'string') {
    currentUser = db.findUserById(userId) || null;
  }
  // Default fallback user if no cookie yet for seamless browsing, or allow unauthenticated
  (req as any).user = currentUser;
  next();
});

// Auth Status Endpoint (checks if initial administrator exists)
app.get('/api/sipersada/auth-status', (req, res) => {
  const hasAdmin = db.hasAdmin();
  const userCount = db.getProfileCount();
  return res.json({ hasAdmin, userCount });
});

// Initial Administrator Registration (First account registered becomes admin)
app.post('/api/sipersada/setup-admin', (req, res) => {
  try {
    const { name, email, password, unit, position } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    const adminUser = db.registerFirstAdmin({
      name,
      email,
      password,
      unit: unit || 'Pimpinan & Administrasi Instansi',
      position: position || 'Administrator Utama',
    });

    // Set auth cookie
    res.cookie('sipersada_user_id', adminUser.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const { password: _, ...safeUser } = adminUser;
    return res.json({ ok: true, user: safeUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal mendaftarkan administrator.' });
  }
});

// Auth Endpoints
app.post('/api/sipersada/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Alamat email wajib diisi.' });
  }

  // Check if system has no administrator yet
  if (!db.hasAdmin()) {
    return res.status(400).json({
      needSetup: true,
      error: 'Belum ada akun Administrator terdaftar. Silakan inisialisasi akun Administrator pertama Anda.',
    });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: 'Akun tidak terdaftar. Pendaftaran akun hanya dapat dilakukan oleh Administrator melalui menu Manajemen Pengguna.',
    });
  }

  if (!user.active) {
    return res.status(403).json({
      error: 'Akun Anda dinonaktifkan oleh Administrator instansi.',
    });
  }

  // Strict password validation
  if (!password || user.password !== password) {
    return res.status(401).json({
      error: 'Password salah. Periksa kembali password Anda.',
    });
  }

  // Set auth cookie
  res.cookie('sipersada_user_id', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const { password: _, ...safeUser } = user;
  return res.json({
    ok: true,
    user: safeUser,
  });
});

app.post('/api/sipersada/logout', (req, res) => {
  res.clearCookie('sipersada_user_id');
  return res.json({ ok: true });
});

app.get('/api/sipersada/me', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.json({ user: null });
  }
  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// State Endpoint
app.get('/api/sipersada/state', (req, res) => {
  const user = (req as any).user;
  const state = db.getState(user);
  return res.json(state);
});

// Document Add/Update
app.post('/api/sipersada/document', upload.single('file'), (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-admin-01');
    let docData: any = {};
    if (req.body.data) {
      try {
        docData = JSON.parse(req.body.data);
      } catch {
        docData = req.body;
      }
    } else {
      docData = req.body;
    }

    const file = req.file
      ? {
          name: req.file.originalname,
          size: req.file.size,
          buffer: req.file.buffer,
        }
      : undefined;

    const doc = db.createDocument(docData, user, file);
    return res.json({ ok: true, document: doc });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal menyimpan dokumen.' });
  }
});

app.patch('/api/sipersada/document', upload.single('file'), (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-admin-01');
    let docData: any = {};
    let id = req.body.id;
    if (req.body.data) {
      try {
        docData = JSON.parse(req.body.data);
        id = id || docData.id;
      } catch {
        docData = req.body;
      }
    } else {
      docData = req.body;
    }

    if (!id) {
      return res.status(400).json({ error: 'ID dokumen wajib diisi.' });
    }

    const file = req.file
      ? {
          name: req.file.originalname,
          size: req.file.size,
          buffer: req.file.buffer,
        }
      : undefined;

    const updated = db.updateDocument(id, docData, user, file);
    return res.json({ ok: true, document: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal memperbarui dokumen.' });
  }
});

// Approval Request
app.post('/api/sipersada/request', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-staf-01');
    const { documentId, signerId, notes } = req.body;
    if (!documentId || !signerId) {
      return res.status(400).json({ error: 'Dokumen dan pejabat tujuan wajib dipilih.' });
    }
    const approval = db.requestApproval(documentId, signerId, notes || '', user);
    return res.json({ ok: true, approval });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal mengajukan permohonan.' });
  }
});

// Approval Decision (Sign / Reject)
app.post('/api/sipersada/decision', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-pejabat-01');
    const { id, action, reason } = req.body;
    if (!id || !action) {
      return res.status(400).json({ error: 'Parameter persetujuan tidak lengkap.' });
    }
    const approval = db.decideApproval(id, action, reason || '', user);
    return res.json({ ok: true, approval });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal memproses keputusan.' });
  }
});

// Disposition Endpoints
app.post('/api/sipersada/disposition', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-pejabat-01');
    const { documentId, recipientId, instruction, deadline, urgency } = req.body;
    if (!documentId || !recipientId || !instruction) {
      return res.status(400).json({ error: 'Data disposisi wajib diisi lengkap.' });
    }
    const disp = db.createDisposition(
      documentId,
      recipientId,
      instruction,
      deadline,
      urgency,
      user
    );
    return res.json({ ok: true, disposition: disp });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal membuat disposisi.' });
  }
});

app.patch('/api/sipersada/disposition', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-staf-01');
    const { id, status, notes } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID disposisi tidak valid.' });
    }
    const disp = db.updateDisposition(id, status, notes || '', user);
    return res.json({ ok: true, disposition: disp });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal memperbarui disposisi.' });
  }
});

// Archive
app.post('/api/sipersada/archive', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-admin-01');
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID dokumen wajib disertakan.' });
    const doc = db.toggleArchive(id, user);
    return res.json({ ok: true, document: doc });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal mengarsipkan surat.' });
  }
});

// Delete
app.post('/api/sipersada/delete', (req, res) => {
  try {
    const user = (req as any).user || db.findUserById('usr-admin-01');
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID item tidak valid.' });
    const result = db.deleteItem(id, user);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal menghapus data.' });
  }
});

// User Management (Admin Only)
app.post('/api/sipersada/user', (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Hanya Administrator yang memiliki wewenang untuk menambahkan akun pengguna baru.',
      });
    }

    const { name, email, password, role, unit, position, active } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan email wajib diisi.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password awal akun minimal 6 karakter.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email tersebut sudah terdaftar pada sistem.' });
    }

    const user = db.createOrUpdateUser({
      name,
      email,
      password,
      role: role || 'staf',
      unit: unit || 'Sub Bagian Umum & Kepegawaian',
      position: position || 'Staf Tata Usaha',
      active: active !== undefined ? active : true,
    });
    const { password: _, ...safeUser } = user;
    return res.json({ ok: true, user: safeUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal menambahkan pengguna.' });
  }
});

app.patch('/api/sipersada/user', (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Hanya Administrator yang berwenang memperbarui data pengguna.',
      });
    }

    const user = db.createOrUpdateUser(req.body);
    const { password: _, ...safeUser } = user;
    return res.json({ ok: true, user: safeUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal memperbarui pengguna.' });
  }
});

app.delete('/api/sipersada/user/:id', (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Hanya Administrator yang memiliki wewenang untuk menghapus akun pengguna.',
      });
    }

    const targetUserId = req.params.id;
    if (!targetUserId) {
      return res.status(400).json({ error: 'ID pengguna wajib disertakan.' });
    }

    db.deleteUser(targetUserId, currentUser);
    return res.json({ ok: true, message: 'Akun pengguna berhasil dihapus.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal menghapus pengguna.' });
  }
});

// Reset all users back to initial zero-state (Administrator only or initial setup)
app.post('/api/sipersada/reset-users', (req, res) => {
  try {
    const currentUser = (req as any).user;
    // Allow if requested by admin or if no users currently exist
    if (db.hasAdmin() && (!currentUser || currentUser.role !== 'admin')) {
      return res.status(403).json({
        error: 'Hanya Administrator yang memiliki wewenang untuk mereset seluruh akun pengguna.',
      });
    }

    db.resetAllUsers();
    res.clearCookie('sipersada_user_id');
    return res.json({
      ok: true,
      message: 'Seluruh akun pengguna telah berhasil direset. Pendaftar pertama akan menjadi Administrator Utama.',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Gagal mereset pengguna.' });
  }
});

// Notifications
app.post('/api/sipersada/notification', (req, res) => {
  const user = (req as any).user;
  if (user) {
    db.markNotificationsRead(user.id);
  }
  return res.json({ ok: true });
});

// History / Audit Trail
app.get('/api/sipersada/history', (req, res) => {
  const docId = String(req.query.id || '');
  if (!docId) {
    return res.status(400).json({ error: 'ID dokumen wajib disertakan.' });
  }
  const audit = db.getDocumentAudit(docId);
  return res.json({ audit });
});

// Document Authenticity Verification
app.get('/api/sipersada/verify/:token', (req, res) => {
  const token = req.params.token;
  if (!token) {
    return res.status(400).json({ error: 'Token verifikasi wajib disertakan.' });
  }
  const result = db.verifyToken(token);
  return res.json(result);
});

// Document File Preview & Download
app.get('/api/sipersada/file/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const isDownload = req.query.download === '1';
    const state = db.getState(null);
    const doc = state.documents.find(d => d.id === docId);

    if (!doc) {
      return res.status(404).send('Dokumen tidak ditemukan.');
    }

    const approval = state.approvals.find(a => a.documentId === doc.id);
    const verification = state.verifications.find(v => v.documentId === doc.id);
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    const html = await generateDocumentHtml(doc, approval, verification, hostUrl);

    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName || 'dokumen.html'}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName || 'dokumen.html'}"`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    console.error('File generation error:', err);
    return res.status(500).send('Terjadi kesalahan saat memuat dokumen.');
  }
});

// Helper to extract Google OAuth access token from Authorization header
const getGoogleToken = (req: express.Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Google Drive Integration Endpoints
// 1. Backup full database to Google Drive
app.post('/api/sipersada/gdrive/backup', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan. Silakan hubungkan akun Google Drive Anda.' });
    }

    const user = (req as any).user;
    const folder = await getOrCreateSipersadaFolder(token);
    const dbJson = db.getRawDatabaseJson();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sipersada-database-backup-${timestamp}.json`;

    const uploaded = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'application/json',
      content: dbJson,
      folderId: folder.id,
    });

    const email = req.body.email || user?.email || 'Google Drive';
    db.recordDriveBackup(folder.id, folder.webViewLink, email, user);

    return res.json({
      ok: true,
      message: 'Database berhasil dicadangkan ke Google Drive.',
      file: uploaded,
      folderUrl: folder.webViewLink,
    });
  } catch (err: any) {
    console.error('GDrive Backup Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal mencadangkan database ke Google Drive.' });
  }
});

// 2. Synchronize / Upload an official document to Google Drive
app.post('/api/sipersada/gdrive/sync-document', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan.' });
    }

    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'ID dokumen wajib disertakan.' });
    }

    const state = db.getState(null);
    const doc = state.documents.find(d => d.id === documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
    }

    const user = (req as any).user;
    const approval = state.approvals.find(a => a.documentId === doc.id);
    const verification = state.verifications.find(v => v.documentId === doc.id);
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    const htmlContent = await generateDocumentHtml(doc, approval, verification, hostUrl);
    const folder = await getOrCreateSipersadaFolder(token);

    const safeNumber = doc.number.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeNumber}_${doc.fileName || 'dokumen.html'}`;

    const uploaded = await uploadFileToDrive(token, {
      name: filename,
      mimeType: 'text/html',
      content: htmlContent,
      folderId: folder.id,
    });

    const updatedDoc = db.updateDocumentDriveInfo(doc.id, uploaded.id, uploaded.webViewLink, user);

    return res.json({
      ok: true,
      message: 'Dokumen berhasil disinkronkan ke Google Drive.',
      file: uploaded,
      document: updatedDoc,
    });
  } catch (err: any) {
    console.error('GDrive Document Sync Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal menyinkronkan dokumen ke Google Drive.' });
  }
});

// 2b. Sync ALL documents and database snapshot to Google Drive Server
app.post('/api/sipersada/gdrive/sync-all', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan.' });
    }

    const user = (req as any).user;
    const state = db.getState(null);
    const folder = await getOrCreateSipersadaFolder(token);
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    let syncedCount = 0;
    for (const doc of state.documents) {
      const approval = state.approvals.find(a => a.documentId === doc.id);
      const verification = state.verifications.find(v => v.documentId === doc.id);
      const htmlContent = await generateDocumentHtml(doc, approval, verification, hostUrl);

      const safeNumber = doc.number.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeNumber}_${doc.fileName || 'dokumen.html'}`;

      const uploaded = await uploadFileToDrive(token, {
        name: filename,
        mimeType: 'text/html',
        content: htmlContent,
        folderId: folder.id,
      });

      db.updateDocumentDriveInfo(doc.id, uploaded.id, uploaded.webViewLink, user);
      syncedCount++;
    }

    // Auto-backup database snapshot to Drive
    const dbJson = db.getRawDatabaseJson();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await uploadFileToDrive(token, {
      name: `sipersada-database-backup-${timestamp}.json`,
      mimeType: 'application/json',
      content: dbJson,
      folderId: folder.id,
    });

    const email = req.body.email || user?.email || 'Google Drive Cloud Server';
    db.recordDriveBackup(folder.id, folder.webViewLink, email, user);

    return res.json({
      ok: true,
      message: `Berhasil menyinkronkan ${syncedCount} naskah dinas dan basis data ke Google Drive cloud server.`,
      folderUrl: folder.webViewLink,
      syncedCount,
    });
  } catch (err: any) {
    console.error('GDrive Sync All Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal menyinkronkan seluruh berkas ke Google Drive.' });
  }
});

// 2c. Check Google Drive Cloud Server Health & Folder Status
app.get('/api/sipersada/gdrive/status', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.json({ connected: false, message: 'Google Drive belum terhubung.' });
    }

    const folder = await getOrCreateSipersadaFolder(token);
    const files = await listDriveFolderFiles(token, folder.id);

    return res.json({
      connected: true,
      folderId: folder.id,
      folderName: 'SIPERSADA Kesbangpol Kota Gorontalo',
      folderUrl: folder.webViewLink,
      fileCount: files.length,
      lastSyncAt: files.length > 0 ? files[0].createdTime : null,
      serverStatus: 'ONLINE',
    });
  } catch (err: any) {
    return res.status(500).json({ connected: false, error: err.message || 'Gagal memeriksa status Google Drive.' });
  }
});

// 3. List all files and backups inside the SIPERSADA Google Drive folder
app.get('/api/sipersada/gdrive/files', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan.' });
    }

    const folder = await getOrCreateSipersadaFolder(token);
    const files = await listDriveFolderFiles(token, folder.id);

    return res.json({
      ok: true,
      folderId: folder.id,
      folderUrl: folder.webViewLink,
      files,
    });
  } catch (err: any) {
    console.error('GDrive List Files Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal memuat file dari Google Drive.' });
  }
});

// 4. Restore database from a chosen backup file in Google Drive (Admin Only)
app.post('/api/sipersada/gdrive/restore', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya Administrator yang memiliki wewenang memulihkan database.' });
    }

    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan.' });
    }

    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'ID file cadangan Google Drive wajib dipilih.' });
    }

    const fileContent = await downloadFileFromDrive(token, fileId);
    let parsedData: any;
    try {
      parsedData = JSON.parse(fileContent);
    } catch {
      return res.status(400).json({ error: 'File cadangan bukan format JSON yang valid.' });
    }

    db.restoreDatabase(parsedData, user);

    return res.json({
      ok: true,
      message: 'Database berhasil dipulihkan dari Google Drive.',
    });
  } catch (err: any) {
    console.error('GDrive Restore Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal memulihkan database dari Google Drive.' });
  }
});

// 5. Delete file in Google Drive (Requires explicit confirmation from UI)
app.delete('/api/sipersada/gdrive/file/:id', async (req, res) => {
  try {
    const token = getGoogleToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token akses Google Drive diperlukan.' });
    }

    await deleteFileFromDrive(token, req.params.id);
    return res.json({ ok: true, message: 'File berhasil dihapus dari Google Drive.' });
  } catch (err: any) {
    console.error('GDrive Delete File Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal menghapus file dari Google Drive.' });
  }
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIPERSADA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
