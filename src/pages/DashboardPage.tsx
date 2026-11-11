import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  Clock,
  BadgeCheck,
  AlertCircle,
  Archive,
  Plus,
  FileSignature,
  Eye,
  Calendar,
  ArrowRight,
  HardDrive,
  CloudUpload,
  ExternalLink,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { SystemState, DocumentItem } from '../types.js';
import { Panel, StatusBadge, EmptyState } from '../components/Common.js';
import { formatDate, formatDateTime, gdriveApiCall, toast } from '../api.js';
import {
  subscribeGoogleAuth,
  signInWithGoogleDrive,
  getGoogleAccessToken,
} from '../googleDriveAuth.js';

interface DashboardProps {
  state: SystemState;
  onNavigate: (path: string) => void;
  onOpenAddModal: (kind: 'masuk' | 'keluar') => void;
  onOpenRequestModal: () => void;
  onViewDoc: (doc: DocumentItem) => void;
}

export function DashboardPage({
  state,
  onNavigate,
  onOpenAddModal,
  onOpenRequestModal,
  onViewDoc,
}: DashboardProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Google Drive Cloud Server state
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveStatus, setDriveStatus] = useState<any>(null);

  useEffect(() => {
    return subscribeGoogleAuth((usr, token) => {
      setIsDriveConnected(!!token);
      setGoogleUser(usr);
      if (token) {
        checkDriveServerStatus();
      }
    });
  }, []);

  const checkDriveServerStatus = async () => {
    try {
      const res = await gdriveApiCall('status', undefined, 'GET');
      setDriveStatus(res);
    } catch {
      // ignore
    }
  };

  const handleConnectDrive = async () => {
    setDriveConnecting(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        toast.success(`Google Drive Cloud Server terhubung: ${res.user.email}`);
        checkDriveServerStatus();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghubungkan Google Drive.');
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleSyncAllToDrive = async () => {
    setSyncingAll(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const loginRes = await signInWithGoogleDrive();
        if (!loginRes) {
          toast.info('Koneksi Google Drive dibatalkan.');
          return;
        }
      }
      const res = await gdriveApiCall('sync-all', undefined, 'POST');
      toast.success(res.message || 'Seluruh berkas berhasil disinkronkan ke Google Drive!');
      checkDriveServerStatus();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyinkronkan dokumen ke Google Drive.');
    } finally {
      setSyncingAll(false);
    }
  };

  const approvedCount = state.approvals.filter(a => a.status === 'DISETUJUI').length;
  const pendingCount = state.approvals.filter(
    a => a.status === 'MENUNGGU PERSETUJUAN'
  ).length;
  const rejectedCount = state.approvals.filter(a => a.status === 'DITOLAK').length;
  const incomingCount = state.documents.filter(d => d.kind === 'masuk').length;
  const outgoingCount = state.documents.filter(d => d.kind === 'keluar').length;
  const archivedCount = state.documents.filter(d => d.archived).length;

  const statCards = [
    {
      title: 'Surat Masuk',
      value: incomingCount,
      icon: Inbox,
      color: 'blue',
      caption: 'Surat diterima',
      path: 'surat-masuk',
    },
    {
      title: 'Surat Keluar',
      value: outgoingCount,
      icon: Send,
      color: 'cyan',
      caption: 'Surat diterbitkan',
      path: 'surat-keluar',
    },
    {
      title: 'Menunggu Persetujuan',
      value: pendingCount,
      icon: Clock,
      color: 'amber',
      caption: 'Perlu ditindaklanjuti',
      path: 'permohonan-persetujuan',
    },
    {
      title: 'Surat Disetujui',
      value: approvedCount,
      icon: BadgeCheck,
      color: 'green',
      caption: 'Persetujuan tercatat',
      path: 'persetujuan',
    },
    {
      title: 'Surat Ditolak',
      value: rejectedCount,
      icon: AlertCircle,
      color: 'red',
      caption: 'Perlu perbaikan',
      path: 'permohonan-persetujuan',
    },
    {
      title: 'Total Arsip Digital',
      value: archivedCount,
      icon: Archive,
      color: 'violet',
      caption: 'Tersimpan permanen',
      path: 'arsip',
    },
  ];

  // Calculate monthly incoming and outgoing volumes
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyStats = months.map((m, idx) => {
    const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
    const masuk = state.documents.filter(
      d => d.kind === 'masuk' && d.date.startsWith(monthPrefix)
    ).length;
    const keluar = state.documents.filter(
      d => d.kind === 'keluar' && d.date.startsWith(monthPrefix)
    ).length;
    return { month: m, masuk, keluar };
  });

  const maxVal = Math.max(...monthlyStats.map(s => Math.max(s.masuk, s.keluar, 1)));

  // Approval rates calculation
  const totalApprovalRequests = pendingCount + approvedCount + rejectedCount;
  const approvedPct = totalApprovalRequests > 0 ? Math.round((approvedCount / totalApprovalRequests) * 100) : 0;
  const pendingPct = totalApprovalRequests > 0 ? Math.round((pendingCount / totalApprovalRequests) * 100) : 0;
  const rejectedPct = totalApprovalRequests > 0 ? Math.round((rejectedCount / totalApprovalRequests) * 100) : 0;

  const recentDocs = state.documents.slice(0, 5);
  const recentActivities = state.activities.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="eyebrow">
            <span /> RUANG KERJA PERSURATAN DIGITAL
          </span>
          <h2>
            Administrasi tertib.
            <br />
            Pelayanan semakin <em>efektif.</em>
          </h2>
          <p>
            Kelola surat, disposisi, dan persetujuan dengan mudah,
            <br className="desktop-break" /> aman, dan terdokumentasi.
          </p>

          <div className="welcome-actions">
            {state.me?.role !== 'pejabat' && (
              <>
                <button
                  className="button primary"
                  onClick={() => onOpenAddModal('masuk')}
                >
                  <Plus size={16} /> Tambah Surat Masuk
                </button>
                <button
                  className="button secondary"
                  onClick={() => onOpenAddModal('keluar')}
                >
                  <Send size={16} /> Buat Surat Keluar
                </button>
                <button className="button gold" onClick={onOpenRequestModal}>
                  <FileSignature size={16} /> Ajukan Persetujuan
                </button>
              </>
            )}
            {state.me?.role === 'pejabat' && (
              <button
                className="button primary"
                onClick={() => onNavigate('persetujuan')}
              >
                <BadgeCheck size={16} /> Buka Lembar Persetujuan
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Google Drive Cloud Server Panel */}
      <section className="p-4 sm:p-5 bg-gradient-to-r from-[#163452] to-[#1e446c] text-white rounded-xl border border-[#274b73] shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <HardDrive size={24} className="text-[#e2c17c]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-sm sm:text-base font-bold text-white">
                  Google Drive Cloud Server
                </strong>
                {isDriveConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Server Online &amp; Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Server Siap Dihubungkan
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100/80 mt-1 max-w-xl leading-relaxed">
                {isDriveConnected
                  ? `Folder penyimpanan cloud: "SIPERSADA Kesbangpol Kota Gorontalo" (${googleUser?.email || 'Akun Terhubung'}). Seluruh naskah dinas dan basis data tersimpan di Google Drive.`
                  : 'Hubungkan Google Drive sebagai server penyimpanan cloud utama untuk arsip surat digital, dokumen PDF, dan cadangan database instansi.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-start md:justify-end">
            {!isDriveConnected ? (
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={driveConnecting}
                className="button gold-button text-xs font-semibold py-2 px-3.5 flex items-center gap-2"
              >
                {driveConnecting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <HardDrive size={14} />
                )}
                <span>{driveConnecting ? 'Menghubungkan...' : 'Hubungkan Drive ke Web'}</span>
              </button>
            ) : (
              <>
                <a
                  href={driveStatus?.folderUrl || state.googleDriveSync?.folderUrl || 'https://drive.google.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="button ghost-light text-xs py-2 px-3 flex items-center gap-1.5 border border-white/20 hover:bg-white/10"
                  title="Buka folder server di Google Drive"
                >
                  <FolderOpen size={14} />
                  <span>Buka Folder Cloud</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="button"
                  onClick={handleSyncAllToDrive}
                  disabled={syncingAll}
                  className="button primary bg-emerald-700 hover:bg-emerald-600 border-emerald-600 text-white text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  {syncingAll ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CloudUpload size={14} />
                  )}
                  <span>{syncingAll ? 'Menyinkronkan...' : 'Sinkronkan Semua ke Drive'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="stat-card cursor-pointer"
              onClick={() => onNavigate(stat.path)}
            >
              <div className="stat-top">
                <span className={`stat-icon ${stat.color}`}>
                  <Icon size={18} />
                </span>
                <span className="text-gray-400 hover:text-gray-600">→</span>
              </div>
              <p>{stat.title}</p>
              <strong>{stat.value}</strong>
              <div className="stat-bottom">
                <span>{stat.caption}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Activity Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bar Chart of Letters Flow */}
        <div className="lg:col-span-2">
          <Panel
            title="Grafik Surat Masuk &amp; Keluar"
            description={`Statistik volume surat tercatat pada tahun ${selectedYear}`}
            action={
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-gray-400" />
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="text-xs py-1 px-2 border rounded"
                >
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                  <option value={currentYear - 2}>{currentYear - 2}</option>
                </select>
              </div>
            }
          >
            <div className="p-4">
              <div className="flex items-center justify-end gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#527eb7]" /> Surat Masuk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#ddbc75]" /> Surat Keluar
                </span>
              </div>

              {/* Bar Plot */}
              <div className="h-44 flex items-end justify-between gap-1 pt-4 border-b border-gray-200">
                {monthlyStats.map(s => {
                  const masukHeight = Math.max((s.masuk / maxVal) * 100, s.masuk > 0 ? 8 : 2);
                  const keluarHeight = Math.max((s.keluar / maxVal) * 100, s.keluar > 0 ? 8 : 2);

                  return (
                    <div key={s.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div
                          style={{ height: `${masukHeight}%` }}
                          title={`Surat Masuk: ${s.masuk}`}
                          className="w-2.5 sm:w-3.5 bg-[#527eb7] rounded-t transition-all hover:opacity-80"
                        />
                        <div
                          style={{ height: `${keluarHeight}%` }}
                          title={`Surat Keluar: ${s.keluar}`}
                          className="w-2.5 sm:w-3.5 bg-[#ddbc75] rounded-t transition-all hover:opacity-80"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">{s.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right: Approval Status & Recent Activities */}
        <div className="space-y-6">
          <Panel
            title="Status Persetujuan Pejabat"
            description="Tingkat penyelesaian naskah dinas"
          >
            <div className="p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="text-emerald-700">Disetujui</span>
                  <span>{approvedCount} ({approvedPct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 rounded-full"
                    style={{ width: `${approvedPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="text-amber-700">Menunggu Tindak Lanjut</span>
                  <span>{pendingCount} ({pendingPct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${pendingPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="text-red-700">Perlu Revisi / Ditolak</span>
                  <span>{rejectedCount} ({rejectedPct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${rejectedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Aktivitas Terakhir"
            description="Riwayat kegiatan terbaru pada ruang kerja"
          >
            <div className="p-4 space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map(act => (
                  <div
                    key={act.id}
                    className="text-xs pb-2 border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium text-gray-800 line-clamp-2">
                      {act.action}
                    </p>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {act.userName} · {formatDate(act.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Belum ada aktivitas"
                  text="Aktivitas pencatatan surat akan tampil di sini."
                />
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Recent Documents Table */}
      <Panel
        title="Surat Terbaru"
        description="Dokumen persuratan masuk dan keluar terakhir yang diproses"
        action={
          <button
            className="text-button text-xs text-[#193b63] font-semibold"
            onClick={() => onNavigate('surat-masuk')}
          >
            Lihat semua surat →
          </button>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor / Perihal Surat</th>
                <th>Asal / Tujuan</th>
                <th>Tanggal</th>
                <th>Jenis Surat</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map(doc => {
                const approval = state.approvals
                  .filter(a => a.documentId === doc.id)
                  .at(-1);

                return (
                  <tr key={doc.id}>
                    <td>
                      <strong className="block text-sm text-[#163452]">
                        {doc.number}
                      </strong>
                      <small className="text-gray-500 line-clamp-1">{doc.subject}</small>
                    </td>
                    <td>
                      <span className="text-gray-700">{doc.correspondent}</span>
                      <small className="block text-gray-400">
                        {doc.classification} · {doc.urgency}
                      </small>
                    </td>
                    <td>{formatDate(doc.date)}</td>
                    <td>
                      <span className={`type-badge ${doc.kind}`}>
                        {doc.kind === 'masuk' ? <Inbox size={12} /> : <Send size={12} />}
                        Surat {doc.kind}
                      </span>
                    </td>
                    <td>
                      <StatusBadge>
                        {approval?.status || (doc.archived ? 'DIARSIPKAN' : 'TERCATAT')}
                      </StatusBadge>
                    </td>
                    <td className="text-right">
                      <button
                        className="table-action p-1.5 text-gray-500 hover:text-[#193b63]"
                        title="Lihat detail surat"
                        onClick={() => onViewDoc(doc)}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentDocs.length === 0 && (
            <EmptyState
              title="Belum ada surat tercatat"
              text="Surat yang ditambahkan akan tampil pada daftar ini."
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
