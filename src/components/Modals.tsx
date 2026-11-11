import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  ShieldCheck,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
  Archive,
  ArrowRight,
  HardDrive,
  CloudUpload,
  CheckCircle2,
} from 'lucide-react';
import {
  SystemState,
  DocumentItem,
  ApprovalItem,
  VerificationItem,
  DispositionItem,
  UserProfile,
} from '../types.js';
import { FormField, StatusBadge } from './Common.js';
import { apiCall, gdriveApiCall, formatDate, formatDateTime, toast } from '../api.js';
import { getGoogleAccessToken, signInWithGoogleDrive } from '../googleDriveAuth.js';

interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function AppDialog({ title, description, onClose, children }: DialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div
        className="app-dialog relative z-50 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="absolute top-4 right-4 rounded p-1 text-gray-500 hover:text-gray-900 transition-colors"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold text-[#163452] mb-1">{title}</h2>
        {description && <p className="text-sm text-[#6d7c88] mb-5">{description}</p>}

        {children}
      </div>
    </div>
  );
}

// 1. Document Add / Edit Modal (Io)
export function DocumentModal({
  kind,
  editDoc,
  onClose,
  onDone,
}: {
  kind: 'masuk' | 'keluar';
  editDoc?: DocumentItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState(editDoc?.fileName || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData.entries());

    const payload = new FormData();
    payload.set('data', JSON.stringify({ ...dataObj, kind }));
    if (editDoc) {
      payload.set('id', editDoc.id);
    }

    const file = formData.get('file');
    if (file instanceof File && file.size > 0) {
      payload.set('file', file);
    }

    try {
      await apiCall('document', payload, editDoc ? 'PATCH' : 'POST');
      toast.success(`Surat ${kind === 'masuk' ? 'masuk' : 'keluar'} berhasil disimpan.`);
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan surat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      title={`${editDoc ? 'Edit' : 'Tambah'} Surat ${kind === 'masuk' ? 'Masuk' : 'Keluar'}`}
      description="Isi informasi surat dan unggah dokumen PDF. Nomor surat ditetapkan petugas berwenang."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="app-form space-y-4">
        <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          {kind === 'masuk' && (
            <FormField label="Nomor agenda *">
              <input
                name="agenda"
                required
                defaultValue={editDoc?.data?.agenda || editDoc?.agenda || ''}
                placeholder="Contoh: AGD-2026-0045"
              />
            </FormField>
          )}

          <FormField label="Nomor surat *">
            <input
              name="number"
              required
              defaultValue={editDoc?.number || ''}
              placeholder="Contoh: 000.1.2/BAKESBANGPOL/320/2026"
            />
          </FormField>

          <FormField label="Tanggal surat *">
            <input
              type="date"
              name="date"
              required
              defaultValue={editDoc?.date || new Date().toISOString().slice(0, 10)}
            />
          </FormField>

          {kind === 'masuk' && (
            <FormField label="Tanggal diterima *">
              <input
                type="date"
                name="receivedDate"
                required
                defaultValue={editDoc?.data?.receivedDate || new Date().toISOString().slice(0, 10)}
              />
            </FormField>
          )}

          <FormField label={kind === 'masuk' ? 'Asal surat *' : 'Tujuan surat *'} wide>
            <input
              name="correspondent"
              required
              defaultValue={editDoc?.correspondent || ''}
              placeholder={
                kind === 'masuk'
                  ? 'Contoh: Sekretariat Daerah Kota Gorontalo'
                  : 'Contoh: Kepala Dinas Pendidikan Kota Gorontalo'
              }
            />
          </FormField>

          <FormField label="Perihal surat *" wide>
            <textarea
              name="subject"
              rows={2}
              required
              defaultValue={editDoc?.subject || ''}
              placeholder="Contoh: Permohonan Rekomendasi Kegiatan Ormas"
            />
          </FormField>

          <FormField label="Klasifikasi surat">
            <select
              name="classification"
              defaultValue={editDoc?.classification || 'Biasa'}
            >
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Rahasia">Rahasia</option>
              <option value="Undangan">Undangan</option>
              <option value="Pemberitahuan">Pemberitahuan</option>
            </select>
          </FormField>

          <FormField label="Tingkat urgensi">
            <select name="urgency" defaultValue={editDoc?.urgency || 'Biasa'}>
              <option value="Biasa">Biasa</option>
              <option value="Segera">Segera</option>
              <option value="Sangat Segera">Sangat Segera</option>
            </select>
          </FormField>
        </div>

        <FormField label="Unggah file naskah (PDF)">
          <div className="flex flex-col gap-1">
            <input
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setSelectedFileName(f.name);
              }}
            />
            {selectedFileName && (
              <small className="text-emerald-700">File terpilih: {selectedFileName}</small>
            )}
          </div>
        </FormField>

        <FormField label="Catatan / Keterangan tambahan">
          <textarea
            name="notes"
            rows={2}
            defaultValue={editDoc?.notes || ''}
            placeholder="Keterangan tambahan atau disposisi awal..."
          />
        </FormField>

        {error && <p className="form-error text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Surat'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

// 2. Approval Request Modal (Lo)
export function ApprovalRequestModal({
  state,
  onClose,
  onDone,
}: {
  state: SystemState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Available outgoing letters not yet having active approval
  const availableLetters = state.documents.filter(
    doc =>
      doc.kind === 'keluar' &&
      !state.approvals.some(
        a =>
          a.documentId === doc.id &&
          ['DRAFT', 'MENUNGGU PERSETUJUAN', 'DISETUJUI'].includes(a.status)
      )
  );

  const signers = state.profiles.filter(
    p => p.role === 'pejabat' || p.role === 'admin'
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      await apiCall('request', body, 'POST');
      toast.success('Permohonan persetujuan berhasil diajukan ke pejabat.');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal mengajukan permohonan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      title="Permohonan Persetujuan"
      description="Pilih surat keluar dan pejabat penandatangan. Identitas pemohon serta waktu pengajuan dicatat oleh sistem."
      onClose={onClose}
    >
      {availableLetters.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-600 mb-4">
            Tidak ada surat keluar berstatus draft yang membutuhkan persetujuan.
          </p>
          <button className="button primary" onClick={onClose}>
            Tutup
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="app-form space-y-4">
          <div className="info-callout flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-sm text-[#193b63]">
            <ShieldCheck size={20} className="shrink-0 text-[#193b63]" />
            <span>
              Pemohon: <strong>{state.me?.name}</strong>
              <br />
              Unit kerja: {state.me?.unit || 'Sekretariat Kesbangpol'}
            </span>
          </div>

          <FormField label="Pilih Surat Keluar *">
            <select name="documentId" required defaultValue="">
              <option value="">Pilih nomor surat...</option>
              {availableLetters.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.number} — {doc.subject}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Pejabat Penandatangan *">
            <select name="signerId" required defaultValue={signers[0]?.id || ''}>
              {signers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.position || s.unit})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Catatan / Pengantar Pemohon">
            <textarea
              name="notes"
              rows={3}
              placeholder="Contoh: Mohon arahan dan persetujuan pengesahan surat rekomendasi penelitian..."
            />
          </FormField>

          {error && <p className="form-error text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? 'Mengajukan...' : 'Ajukan Permohonan'}
            </button>
          </div>
        </form>
      )}
    </AppDialog>
  );
}

// 3. Disposition Modal (Bo)
export function DispositionModal({
  state,
  onClose,
  onDone,
}: {
  state: SystemState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const incomingLetters = state.documents.filter(d => d.kind === 'masuk');
  const activeProfiles = state.profiles.filter(p => p.active);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      await apiCall('disposition', body, 'POST');
      toast.success('Lembar disposisi berhasil diterbitkan.');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat disposisi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      title="Buat Disposisi Surat Masuk"
      description="Teruskan surat masuk kepada penerima untuk ditindaklanjuti secara berjenjang."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="app-form space-y-4">
        <FormField label="Surat masuk *">
          <select name="documentId" required defaultValue="">
            <option value="">Pilih surat masuk...</option>
            {incomingLetters.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.number} — {doc.subject}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Penerima disposisi *">
          <select name="recipientId" required defaultValue="">
            <option value="">Pilih penerima / staf...</option>
            {activeProfiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.position || p.unit}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Instruksi pimpinan *">
          <textarea
            name="instruction"
            rows={3}
            required
            placeholder="Contoh: Koordinasikan dengan bidang terkait, buat telaah staf dan hadiri rapat..."
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Batas waktu tindak lanjut *">
            <input
              type="date"
              name="deadline"
              required
              defaultValue={
                new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
              }
            />
          </FormField>

          <FormField label="Sifat instruksi">
            <select name="urgency" defaultValue="Biasa">
              <option value="Biasa">Biasa</option>
              <option value="Segera">Segera</option>
              <option value="Sangat Segera">Sangat Segera</option>
            </select>
          </FormField>
        </div>

        {error && <p className="form-error text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Menerbitkan...' : 'Terbitkan Disposisi'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

// 4. Follow Up Modal for Disposition
export function FollowUpModal({
  disposition,
  onClose,
  onDone,
}: {
  disposition: DispositionItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(formData.entries()),
      id: disposition.id,
    };

    try {
      await apiCall('disposition', body, 'PATCH');
      toast.success('Status tindak lanjut disposisi berhasil diperbarui.');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui status.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      title="Perbarui Tindak Lanjut Disposisi"
      description={`Instruksi: ${disposition.instruction}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="app-form space-y-4">
        <FormField label="Status pelaksanaan *">
          <select name="status" defaultValue={disposition.status}>
            <option value="BARU">BARU</option>
            <option value="DALAM PROSES">DALAM PROSES</option>
            <option value="SELESAI">SELESAI</option>
          </select>
        </FormField>

        <FormField label="Laporan hasil / catatan pelaksanaan">
          <textarea
            name="notes"
            rows={3}
            defaultValue={disposition.notes || ''}
            placeholder="Tuliskan perkembangan penyelesaian atau hasil tindak lanjut..."
          />
        </FormField>

        {error && <p className="form-error text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

// 5. User Modal (Wo)
export function UserModal({
  editUser,
  onClose,
  onDone,
}: {
  editUser?: UserProfile;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const rawPass = formData.get('password');
    const body: any = {
      ...Object.fromEntries(formData.entries()),
      id: editUser?.id,
      active: formData.get('active') === 'true',
    };
    if (editUser && (!rawPass || String(rawPass).trim() === '')) {
      delete body.password;
    }

    try {
      await apiCall('user', body, editUser ? 'PATCH' : 'POST');
      toast.success(`Data pengguna ${editUser ? 'diperbarui' : 'ditambahkan'}.`);
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      title={editUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
      description="Akun dikelola oleh administrator SIPERSADA Kesbangpol Kota Gorontalo."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="app-form space-y-4">
        <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nama lengkap *">
            <input name="name" required defaultValue={editUser?.name || ''} placeholder="Contoh: Ahmad Abdullah, S.STP" />
          </FormField>

          <FormField label="Email instansi *">
            <input
              name="email"
              type="email"
              required
              readOnly={!!editUser}
              defaultValue={editUser?.email || ''}
              placeholder="nama@instansi.go.id"
            />
          </FormField>

          {editUser ? (
            <FormField label="Ganti / Reset Password (opsional)" wide>
              <input
                name="password"
                type="password"
                minLength={6}
                placeholder="Kosongkan jika tidak ingin mengubah password akun"
              />
            </FormField>
          ) : (
            <FormField label="Password awal akun *" wide>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Tentukan password awal untuk pengguna ini (min. 6 karakter)"
              />
            </FormField>
          )}

          <FormField label="Unit kerja">
            <input
              name="unit"
              defaultValue={editUser?.unit || 'Sub Bagian Umum & Kepegawaian'}
              placeholder="Contoh: Bidang Kesatuan Bangsa"
            />
          </FormField>

          <FormField label="Jabatan">
            <input
              name="position"
              defaultValue={editUser?.position || 'Staf Tata Usaha'}
              placeholder="Contoh: Analis Kebijakan / Kasubag"
            />
          </FormField>

          <FormField label="Peran akses">
            <select name="role" defaultValue={editUser?.role || 'staf'}>
              <option value="staf">Staf (Pencatatan & Pengajuan)</option>
              <option value="pejabat">Pejabat Penandatangan (TTE & Disposisi)</option>
              <option value="admin">Administrator (Akses Penuh)</option>
            </select>
          </FormField>

          <FormField label="Status akun">
            <select
              name="active"
              defaultValue={editUser?.active !== false ? 'true' : 'false'}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </FormField>
        </div>

        {error && <p className="form-error text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </button>
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Pengguna'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}

// 6. Document Detail Modal (zo)
export function DocumentDetailModal({
  doc,
  state,
  onClose,
  onRefresh,
  onEdit,
}: {
  doc: DocumentItem;
  state: SystemState;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: (doc: DocumentItem) => void;
}) {
  const [audit, setAudit] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [qrUrl, setQrUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);

  const handleSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const loginRes = await signInWithGoogleDrive();
        if (!loginRes) {
          toast.info('Koneksi Google Drive dibatalkan.');
          return;
        }
      }
      const res = await gdriveApiCall('sync-document', { documentId: doc.id });
      toast.success(res.message || 'Naskah dinas berhasil disinkronkan ke Google Drive!');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyinkronkan dokumen ke Google Drive.');
    } finally {
      setSyncingDrive(false);
    }
  };

  const approval = state.approvals
    .filter(a => a.documentId === doc.id)
    .at(-1);

  const verification = state.verifications.find(
    v => v.requestId === approval?.id || v.documentId === doc.id
  );

  const canEdit =
    state.me?.role === 'admin' ||
    (state.me?.id === doc.ownerId && (!approval || approval.status === 'DRAFT'));

  const canDelete = state.me?.role === 'admin';

  useEffect(() => {
    let isMounted = true;
    apiCall(`history?id=${encodeURIComponent(doc.id)}`, undefined, 'GET')
      .then(res => {
        if (isMounted) {
          setAudit(res.audit || []);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingHistory(false);
      });

    if (verification?.token) {
      const verifyUrl = `${window.location.origin}/verifikasi/${verification.token}`;
      QRCode.toDataURL(verifyUrl, {
        width: 170,
        margin: 1,
        color: { dark: '#142b4b', light: '#ffffff' },
      }).then(dataUri => {
        if (isMounted) setQrUrl(dataUri);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [doc.id, verification?.token]);

  const handleArchive = async () => {
    setProcessing(true);
    try {
      await apiCall('archive', { id: doc.id }, 'POST');
      toast.success(
        doc.archived ? 'Surat dikeluarkan dari arsip.' : 'Surat berhasil diarsipkan.'
      );
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah arsip.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      await apiCall('delete', { id: doc.id }, 'POST');
      toast.success('Surat berhasil dihapus.');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus surat.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppDialog
      title="Detail Surat"
      description={`${doc.kind === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'} · ${doc.id.toUpperCase()}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="detail-grid grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <FormField label="Nomor surat">
            <strong className="text-[#193b63]">{doc.number}</strong>
          </FormField>

          <FormField label="Tanggal surat">
            <strong>{formatDate(doc.date)}</strong>
          </FormField>

          <FormField label="Perihal" wide>
            <p className="font-medium text-gray-800">{doc.subject}</p>
          </FormField>

          <FormField label={doc.kind === 'masuk' ? 'Asal surat' : 'Tujuan surat'}>
            <p>{doc.correspondent}</p>
          </FormField>

          <FormField label="Klasifikasi / urgensi">
            <p>
              {doc.classification} / {doc.urgency}
            </p>
          </FormField>

          {doc.kind === 'masuk' && (
            <>
              <FormField label="Nomor agenda">
                <p className="font-mono">{doc.data?.agenda || doc.agenda || '—'}</p>
              </FormField>
              <FormField label="Tanggal diterima">
                <p>{formatDate(doc.data?.receivedDate)}</p>
              </FormField>
            </>
          )}

          <FormField label="Keterangan" wide>
            <p className="text-gray-600">
              {doc.notes || 'Tidak ada catatan tambahan.'}
            </p>
          </FormField>

          {approval && (
            <>
              <FormField label="Pemohon">
                <p>{state.profiles.find(p => p.id === approval.applicantId)?.name || '—'}</p>
              </FormField>
              <FormField label="Tanggal pengajuan">
                <p>{formatDate(approval.createdAt)}</p>
              </FormField>
              <FormField label="Status persetujuan">
                <StatusBadge>{approval.status}</StatusBadge>
              </FormField>
              <FormField label="Pejabat penandatangan">
                <p>
                  {approval.approvedName ||
                    state.profiles.find(p => p.id === approval.signerId)?.name ||
                    '—'}
                </p>
              </FormField>
              {approval.approvedAt && (
                <FormField label="Waktu persetujuan">
                  <p>{formatDateTime(approval.approvedAt)}</p>
                </FormField>
              )}
              {approval.reason && (
                <FormField label="Catatan penolakan" wide>
                  <p className="text-red-700">{approval.reason}</p>
                </FormField>
              )}
            </>
          )}
        </div>

        {/* File Preview and Download block */}
        <div className="document-file flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="stat-icon blue p-2 bg-blue-100 text-blue-800 rounded">
              <FileText size={22} />
            </span>
            <div>
              <strong className="block text-sm">{doc.fileName}</strong>
              <small className="text-gray-500">PDF · Dokumen resmi instansi</small>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              className="icon-button p-2 text-gray-700 hover:text-blue-800"
              title="Buka PDF / Cetak"
              href={`/api/sipersada/file/${doc.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={18} />
            </a>
            <a
              className="icon-button p-2 text-gray-700 hover:text-blue-800"
              title="Unduh PDF"
              href={`/api/sipersada/file/${doc.id}?download=1`}
            >
              <Download size={18} />
            </a>
          </div>
        </div>

        {/* Google Drive Document Sync Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-md shrink-0">
              <HardDrive size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong className="text-gray-900">Google Drive Kesbangpol</strong>
                {doc.googleDriveFileId && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 size={11} /> Tersimpan di Cloud
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-[11px] mt-0.5">
                {doc.googleDriveSyncedAt
                  ? `Sinkronisasi terakhir: ${formatDateTime(doc.googleDriveSyncedAt)}`
                  : 'Sinkronkan salinan naskah dinas ke folder resmi di Google Drive'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {doc.googleDriveLink && (
              <a
                href={doc.googleDriveLink}
                target="_blank"
                rel="noreferrer"
                className="button secondary text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
                title="Buka naskah di Google Drive"
              >
                <ExternalLink size={13} /> Drive
              </a>
            )}
            <button
              type="button"
              onClick={handleSyncDrive}
              disabled={syncingDrive}
              className="button primary text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
            >
              <CloudUpload size={13} />
              <span>{syncingDrive ? 'Menyimpan...' : doc.googleDriveFileId ? 'Sinkron Ulang' : 'Simpan ke Drive'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Verification Box if approved */}
        {verification && (
          <div className="qr-box flex items-center gap-4 p-4 bg-[#f8f7f2] border border-[#c8ac77]/40 rounded-xl">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Verifikasi Dokumen"
                className="w-24 h-24 border border-white rounded shadow-sm shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 animate-pulse rounded shrink-0" />
            )}
            <div className="space-y-1">
              <strong className="text-sm text-[#163452]">
                Verifikasi Dokumen Internal
              </strong>
              <p className="text-xs text-gray-600">
                QR mengarah ke pemeriksaan keaslian dan status persetujuan pejabat di server.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  className="text-button text-xs text-[#193b63] hover:underline font-semibold"
                  target="_blank"
                  rel="noreferrer"
                  href={`/verifikasi/${verification.token}`}
                >
                  Buka halaman verifikasi →
                </a>
                {qrUrl && (
                  <a
                    className="text-button text-xs text-gray-600 hover:underline"
                    href={qrUrl}
                    download={`QR-${doc.number.replace(/[^a-zA-Z0-9]/g, '_')}.png`}
                  >
                    Unduh QR Code
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Riwayat Perubahan &amp; Audit
          </h3>
          {loadingHistory ? (
            <p className="text-xs text-gray-400">Memuat riwayat surat...</p>
          ) : audit.length > 0 ? (
            <div className="history-list space-y-2 border-l-2 border-blue-200 pl-3">
              {audit.map((item, idx) => (
                <div key={idx} className="text-xs text-gray-700">
                  <span className="font-semibold">{item.action}</span>
                  <div className="text-[10px] text-gray-400">
                    {item.userName} · {formatDateTime(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Belum ada riwayat aktivitas.</p>
          )}
        </div>

        {/* Action Buttons */}
        {confirmDelete ? (
          <div className="delete-confirm p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-2">
            <p>
              Hapus surat <strong>{doc.number}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={processing}
              >
                Batal
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleDelete}
                disabled={processing}
              >
                {processing ? 'Menghapus...' : 'Ya, Hapus Surat'}
              </button>
            </div>
          </div>
        ) : (
          <div className="form-actions flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
            {canEdit && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  onClose();
                  onEdit(doc);
                }}
              >
                <Pencil size={15} /> Edit
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="button danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} /> Hapus
              </button>
            )}

            {(state.me?.role === 'admin' || state.me?.id === doc.ownerId) && (
              <button
                type="button"
                className="button primary"
                onClick={handleArchive}
                disabled={processing}
              >
                <Archive size={15} />{' '}
                {doc.archived ? 'Keluarkan dari Arsip' : 'Arsipkan'}
              </button>
            )}
          </div>
        )}
      </div>
    </AppDialog>
  );
}
