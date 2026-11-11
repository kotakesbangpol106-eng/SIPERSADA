import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  KeyRound,
  FileCode2,
  CheckCircle2,
  User,
  Mail,
  MapPin,
  ExternalLink,
  HardDrive,
  CloudUpload,
  RotateCcw,
  Trash2,
  Download,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { SystemState } from '../types.js';
import { Panel, Brand, StatusBadge } from '../components/Common.js';
import { apiCall, gdriveApiCall, formatDateTime, formatDate, toast } from '../api.js';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  subscribeGoogleAuth,
  getGoogleAccessToken,
} from '../googleDriveAuth.js';

interface SettingsPageProps {
  state: SystemState;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export function SettingsPage({ state, onRefresh, onNavigate }: SettingsPageProps) {
  const user = state.me;

  // Google Drive state
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFolder, setDriveFolder] = useState<{ id: string; name: string; webViewLink?: string } | null>(null);

  // Restore confirmation modal state
  const [restoreCandidate, setRestoreCandidate] = useState<DriveFile | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Delete file confirmation state
  const [deleteCandidate, setDeleteCandidate] = useState<DriveFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeGoogleAuth((usr, token) => {
      setIsDriveConnected(!!token);
      setGoogleUser(usr);
      if (token) {
        fetchDriveFiles();
      } else {
        setDriveFiles([]);
        setDriveFolder(null);
      }
    });
    return () => unsub();
  }, []);

  const fetchDriveFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await gdriveApiCall('files', undefined, 'GET');
      if (res.folder) {
        setDriveFolder(res.folder);
      }
      if (Array.isArray(res.files)) {
        setDriveFiles(res.files);
      }
    } catch (err: any) {
      console.error('Fetch Drive files error:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleConnectGoogle = async () => {
    setDriveConnecting(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        toast.success(`Google Drive terhubung: ${res.user.email}`);
        fetchDriveFiles();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghubungkan Google Drive.');
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await signOutGoogleDrive();
      toast.info('Koneksi Google Drive diputuskan.');
      setDriveFiles([]);
      setDriveFolder(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memutuskan Google Drive.');
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const res = await gdriveApiCall('backup', undefined, 'POST');
      toast.success(res.message || 'Database berhasil dicadangkan ke Google Drive!');
      onRefresh();
      fetchDriveFiles();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mencadangkan database ke Google Drive.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleSyncAllDocuments = async () => {
    setSyncingAll(true);
    try {
      const res = await gdriveApiCall('sync-all', undefined, 'POST');
      toast.success(res.message || 'Seluruh naskah dinas berhasil disinkronkan ke Google Drive!');
      onRefresh();
      fetchDriveFiles();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyinkronkan dokumen ke Google Drive.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;
    setRestoring(true);
    try {
      const res = await gdriveApiCall('restore', { fileId: restoreCandidate.id }, 'POST');
      toast.success(res.message || 'Database berhasil dipulihkan dari Google Drive!');
      setRestoreCandidate(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memulihkan database.');
    } finally {
      setRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await gdriveApiCall(`file/${deleteCandidate.id}`, undefined, 'DELETE');
      toast.success('File berhasil dihapus dari Google Drive.');
      setDeleteCandidate(null);
      fetchDriveFiles();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus file dari Drive.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '—';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '—';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Google Drive & Cloud Database Connection */}
      <Panel
        title="Koneksi Backend &amp; Database ke Google Drive"
        description="Integrasi penyimpanan cloud resmi untuk pencadangan otomatis snapshot database dan arsip surat dinas."
      >
        <div className="p-5 space-y-6 text-sm">
          {!isDriveConnected ? (
            <div className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left max-w-xl">
                <div className="flex items-center justify-center md:justify-start gap-2 text-blue-900 font-bold text-base">
                  <HardDrive className="text-blue-600" size={22} />
                  <span>Hubungkan Database dengan Akun Google Drive Instansi</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Dengan menghubungkan Google Drive, sistem SIPERSADA secara otomatis membuat folder khusus{' '}
                  <strong className="text-gray-800">"SIPERSADA Kesbangpol Kota Gorontalo"</strong> di Google Drive Anda.
                  Semua snapshot database (<code className="bg-white/80 px-1 py-0.5 rounded text-blue-800">sipersada_db.json</code>)
                  dan naskah dinas dapat dicadangkan secara terenkripsi, dipulihkan kapan saja, dan aman dari kehilangan data lokal.
                </p>
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-gray-500 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 size={14} /> OAuth 2.0 Resmi Google
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 size={14} /> Izin Terbatas Ruang Kerja Drive
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 size={14} /> Pemulihan Satu Klik
                  </span>
                </div>
              </div>

              {/* Official Google Sign-In button styling */}
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={driveConnecting}
                className="shrink-0 inline-flex items-center gap-3 px-5 py-2.5 bg-white text-gray-700 font-medium text-sm rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 hover:shadow transition-all disabled:opacity-50"
              >
                {driveConnecting ? (
                  <RefreshCw className="animate-spin text-blue-600" size={18} />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>{driveConnecting ? 'Menghubungkan...' : 'Sambungkan Google Drive'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected Account & Status Header */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {googleUser?.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google Account'}
                      className="w-12 h-12 rounded-full border border-emerald-300"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                      G
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-gray-900 text-base">
                        {googleUser?.displayName || 'Akun Google Terhubung'}
                      </strong>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Terhubung
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{googleUser?.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackupNow}
                    disabled={backingUp}
                    className="button primary flex items-center gap-2 text-xs py-2 px-3"
                  >
                    {backingUp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CloudUpload size={14} />
                    )}
                    <span>{backingUp ? 'Mencadangkan...' : 'Cadangkan Database Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAllDocuments}
                    disabled={syncingAll}
                    className="button secondary flex items-center gap-2 text-xs py-2 px-3 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                  >
                    {syncingAll ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CloudUpload size={14} className="text-emerald-700" />
                    )}
                    <span>{syncingAll ? 'Menyinkronkan...' : 'Sinkronkan Semua Dokumen'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchDriveFiles}
                    disabled={loadingFiles}
                    className="button secondary flex items-center gap-1.5 text-xs py-2 px-3"
                    title="Segarkan daftar file"
                  >
                    <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
                    <span>Segarkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 px-2.5 py-1.5 hover:bg-red-50 rounded transition-colors"
                  >
                    <LogOut size={13} /> Putuskan
                  </button>
                </div>
              </div>

              {/* Folder & Sync Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Folder Google Drive</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-[#163452] text-xs font-semibold truncate">
                      {driveFolder?.name || state.googleDriveSync?.folderName || 'SIPERSADA Kesbangpol Kota Gorontalo'}
                    </strong>
                    {driveFolder?.webViewLink && (
                      <a
                        href={driveFolder.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-2 shrink-0"
                      >
                        Buka <FolderOpen size={13} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Pencadangan Terakhir</span>
                  <strong className="text-gray-800 text-xs">
                    {state.googleDriveSync?.lastBackupAt
                      ? formatDateTime(state.googleDriveSync.lastBackupAt)
                      : 'Belum ada data cadangan'}
                  </strong>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Total File di Folder Drive</span>
                  <strong className="text-gray-800 text-xs">
                    {loadingFiles ? 'Memuat...' : `${driveFiles.length} item`}
                  </strong>
                </div>
              </div>

              {/* Drive File List / Backup History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                    <HardDrive size={15} /> Berkas Cadangan &amp; Dokumen di Google Drive
                  </h4>
                  <span className="text-xs text-gray-500">
                    Folder: <code className="text-blue-800 font-mono">SIPERSADA Kesbangpol Kota Gorontalo</code>
                  </span>
                </div>

                {loadingFiles ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <RefreshCw className="animate-spin inline-block mr-2" size={15} />
                    Menghubungi Google Drive API v3...
                  </div>
                ) : driveFiles.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3">Nama Berkas</th>
                          <th className="py-2.5 px-3">Tipe</th>
                          <th className="py-2.5 px-3">Ukuran</th>
                          <th className="py-2.5 px-3">Waktu Diunggah</th>
                          <th className="py-2.5 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {driveFiles.map(file => {
                          const isDatabaseBackup = file.name.startsWith('sipersada_backup_') || file.name.endsWith('.json');
                          return (
                            <tr key={file.id} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-medium text-[#163452]">
                                <div className="flex items-center gap-2">
                                  {isDatabaseBackup ? (
                                    <span className="p-1 rounded bg-amber-100 text-amber-800 shrink-0">
                                      <HardDrive size={14} />
                                    </span>
                                  ) : (
                                    <span className="p-1 rounded bg-blue-100 text-blue-800 shrink-0">
                                      <FileCode2 size={14} />
                                    </span>
                                  )}
                                  <span className="truncate max-w-xs" title={file.name}>
                                    {file.name}
                                  </span>
                                  {isDatabaseBackup && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-mono">
                                      Database
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                                {file.mimeType.split('/').pop()}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 font-mono">
                                {formatFileSize(file.size)}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">
                                {file.createdTime ? formatDateTime(file.createdTime) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* View in Drive */}
                                  {file.webViewLink && (
                                    <a
                                      href={file.webViewLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-gray-500 hover:text-blue-700 rounded hover:bg-gray-100"
                                      title="Buka di Google Drive"
                                    >
                                      <ExternalLink size={15} />
                                    </a>
                                  )}

                                  {/* Restore Database button (Admin only, for backup JSONs) */}
                                  {isDatabaseBackup && user?.role === 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => setRestoreCandidate(file)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded hover:bg-amber-100 transition-colors"
                                      title="Pulihkan database dari cadangan ini"
                                    >
                                      <RotateCcw size={11} /> Pulihkan
                                    </button>
                                  )}

                                  {/* Delete file from Drive */}
                                  {user?.role === 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteCandidate(file)}
                                      className="p-1 text-gray-400 hover:text-red-700 rounded hover:bg-red-50"
                                      title="Hapus dari Google Drive"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="mb-2">Belum ada file di folder Google Drive.</p>
                    <button
                      type="button"
                      onClick={handleBackupNow}
                      disabled={backingUp}
                      className="button primary text-xs"
                    >
                      <CloudUpload size={14} className="mr-1 inline" /> Cadangkan Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="settings-grid grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agency Identity Panel */}
        <Panel
          title="Identitas Instansi"
          description="Ruang kerja persuratan digital resmi Pemerintah Kota Gorontalo"
        >
          <div className="settings-content p-5 space-y-4 text-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <img
                src="/logo.png"
                alt="Lambang Kota Gorontalo"
                className="w-12 h-14 object-contain shrink-0"
              />
              <div>
                <h3 className="text-base font-bold text-[#163452]">
                  BADAN KESATUAN BANGSA DAN POLITIK
                </h3>
                <p className="text-xs text-gray-500">Pemerintah Kota Gorontalo</p>
              </div>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Nama sistem</span>
              <strong className="text-[#163452]">SIPERSADA</strong>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Versi aplikasi</span>
              <strong>v1.0 (Produksi)</strong>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Mekanisme persetujuan</span>
              <strong className="text-emerald-700">Persetujuan internal</strong>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Integritas dokumen</span>
              <strong className="font-mono text-xs">SHA-256 di backend</strong>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Penyimpanan cloud</span>
              <strong className="text-blue-700">Google Drive API v3 Terhubung</strong>
            </div>

            <div className="setting-row flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Alamat kantor</span>
              <span className="text-right text-xs text-gray-700 max-w-xs">
                Jl. Sultan Botutihe No. 12, Kel. Ipilo, Kec. Kota Timur, Kota Gorontalo 96115
              </span>
            </div>

            <div className="setting-row flex justify-between py-2">
              <span className="text-gray-500">Email resmi</span>
              <span className="font-mono text-xs text-[#193b63]">
                kesbangpol@gorontalokota.go.id
              </span>
            </div>
          </div>
        </Panel>

        {/* Account & Session Panel */}
        <Panel
          title="Akun &amp; Keamanan"
          description="Informasi sesi pengguna dan kredensial hak akses aktif"
        >
          <div className="settings-content p-5 space-y-4 text-sm">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#163452] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {user.name
                      .split(' ')
                      .slice(0, 2)
                      .map(w => w[0])
                      .join('')}
                  </div>
                  <div>
                    <strong className="text-base text-[#163452] block">
                      {user.name}
                    </strong>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="setting-row flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Peran pengguna</span>
                  <span className="font-semibold text-[#193b63] uppercase">
                    {user.role}
                  </span>
                </div>

                <div className="setting-row flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Unit kerja</span>
                  <strong className="text-gray-800">{user.unit}</strong>
                </div>

                <div className="setting-row flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Jabatan</span>
                  <span className="text-gray-800">{user.position}</span>
                </div>

                <div className="setting-row flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status koneksi</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 size={15} /> Sesi aktif
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-3">Anda belum masuk ke akun instansi.</p>
                <button
                  className="button primary"
                  onClick={() => onNavigate('login')}
                >
                  Masuk ke SIPERSADA
                </button>
              </div>
            )}

            {/* User Management Info Block */}
            <div className="pt-4 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-700 block mb-1">
                Kebijakan Akses &amp; Pendaftaran:
              </span>
              <p className="text-xs text-gray-500 mb-3">
                Pendaftaran mandiri dikunci. Penambahan akun staf dan pejabat penandatangan baru
                dilakukan secara terpusat oleh Administrator.
              </p>
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('pengguna')}
                  className="button primary text-xs w-full justify-center"
                >
                  Buka Manajemen Pengguna →
                </button>
              )}
            </div>
          </div>
        </Panel>

        {/* Numbering Rules & Legal Reference Panel */}
        <Panel
          title="Format Tata Naskah Dinas"
          description="Pedoman penomoran surat berdasarkan Permendagri No. 83 Tahun 2022"
        >
          <div className="p-5 space-y-3 text-sm text-gray-700">
            <p className="text-xs text-gray-600">
              Sistem mengadopsi format baku penomoran surat naskah dinas Pemerintah Kota
              Gorontalo:
            </p>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded font-mono text-xs text-[#163452]">
              [Kode Klasifikasi] / [Akronim Perangkat Daerah] / [Nomor Urut] / [Tahun]
            </div>
            <ul className="list-disc pl-5 text-xs space-y-1 text-gray-600">
              <li>
                <strong>000.1.2</strong> — Fasilitasi &amp; Rekomendasi Penelitian
              </li>
              <li>
                <strong>300.1.1</strong> — Kewaspadaan Dini &amp; Kerjasama Intelijen
              </li>
              <li>
                <strong>200.1.3</strong> — Ketahanan Ideologi &amp; Wawasan Kebangsaan
              </li>
              <li>
                <strong>005</strong> — Undangan Resmi Kedinasan
              </li>
            </ul>
          </div>
        </Panel>

        {/* Public Verification Link Panel */}
        <Panel
          title="Portal Verifikasi Publik"
          description="Layanan masyarakat &amp; instansi untuk cek keaslian naskah dinas digital"
        >
          <div className="p-5 space-y-3 text-sm text-gray-700">
            <p className="text-xs text-gray-600">
              Masyarakat atau instansi penerima dapat melakukan pemindaian QR Code pada surat
              atau memasukkan token dokumen untuk memverifikasi keabsahan naskah.
            </p>
            <div className="pt-2">
              <button
                className="button secondary w-full justify-center flex items-center gap-2"
                onClick={() => onNavigate('verifikasi')}
              >
                <ExternalLink size={16} /> Buka Portal Verifikasi Publik
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Confirmation Modal: Restore Database */}
      {restoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => !restoring && setRestoreCandidate(null)}
          />
          <div className="app-dialog relative z-50 w-full max-w-md p-6 bg-white rounded-xl shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Konfirmasi Pemulihan Database</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Anda akan memulihkan database SIPERSADA dari berkas cadangan Google Drive:{' '}
              <strong className="text-gray-900 font-mono block mt-1">{restoreCandidate.name}</strong>
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 mb-5">
              <strong>Peringatan:</strong> Seluruh data dokumen, disposisi, dan pengguna saat ini akan
              digantikan dengan kondisi pada saat cadangan ini dibuat. Tindakan ini tidak dapat dibatalkan.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setRestoreCandidate(null)}
                disabled={restoring}
              >
                Batal
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleConfirmRestore}
                disabled={restoring}
              >
                {restoring ? 'Memulihkan...' : 'Ya, Pulihkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Drive File */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => !deleting && setDeleteCandidate(null)}
          />
          <div className="app-dialog relative z-50 w-full max-w-md p-6 bg-white rounded-xl shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Hapus Berkas dari Google Drive</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Hapus berkas <strong className="text-gray-900">{deleteCandidate.name}</strong> dari
              folder Google Drive? Berkas akan dipindahkan ke tempat sampah Google Drive.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Berkas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
