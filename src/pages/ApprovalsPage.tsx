import React, { useState } from 'react';
import {
  FileSignature,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Eye,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { SystemState, DocumentItem, ApprovalItem } from '../types.js';
import { Panel, StatusBadge, EmptyState } from '../components/Common.js';
import { AppDialog } from '../components/Modals.js';
import { apiCall, formatDate, formatDateTime, toast } from '../api.js';

interface ApprovalsPageProps {
  page: 'permohonan-persetujuan' | 'persetujuan';
  state: SystemState;
  onOpenRequestModal: () => void;
  onRefresh: () => void;
  onViewDoc: (doc: DocumentItem) => void;
}

export function ApprovalsPage({
  page,
  state,
  onOpenRequestModal,
  onRefresh,
  onViewDoc,
}: ApprovalsPageProps) {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isSignerPage = page === 'persetujuan';

  // Approvals list
  const filteredApprovals = state.approvals.filter(app => {
    // Role filter: Pejabat only sees directed to them unless admin
    if (isSignerPage && state.me?.role !== 'admin') {
      if (app.signerId !== state.me?.id) return false;
    }
    if (filterStatus && app.status !== filterStatus) return false;
    return true;
  });

  const handleDecision = async (
    approval: ApprovalItem,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    setProcessingId(approval.id);
    try {
      await apiCall(
        'decision',
        {
          id: approval.id,
          action,
          reason: reason || '',
        },
        'POST'
      );

      toast.success(
        action === 'approve'
          ? 'Surat berhasil disetujui & token verifikasi digital diterbitkan.'
          : 'Permohonan surat telah ditolak.'
      );
      setRejectTarget(null);
      setRejectReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses keputusan.');
    } finally {
      setProcessingId(null);
    }
  };

  const isPejabat = state.me?.role === 'pejabat' || state.me?.role === 'admin';

  return (
    <div className="space-y-4">
      {/* Module Toolbar & Status Tabs */}
      <div className="module-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="tabs-inline flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg">
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded ${filterStatus === '' ? 'selected bg-white text-[#193b63] shadow-sm' : 'text-gray-600'}`}
            onClick={() => setFilterStatus('')}
          >
            Semua <b>{state.approvals.length}</b>
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded ${filterStatus === 'MENUNGGU PERSETUJUAN' ? 'selected bg-white text-[#193b63] shadow-sm' : 'text-gray-600'}`}
            onClick={() => setFilterStatus('MENUNGGU PERSETUJUAN')}
          >
            Menunggu
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded ${filterStatus === 'DISETUJUI' ? 'selected bg-white text-[#193b63] shadow-sm' : 'text-gray-600'}`}
            onClick={() => setFilterStatus('DISETUJUI')}
          >
            Disetujui
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded ${filterStatus === 'DITOLAK' ? 'selected bg-white text-[#193b63] shadow-sm' : 'text-gray-600'}`}
            onClick={() => setFilterStatus('DITOLAK')}
          >
            Ditolak
          </button>
        </div>

        {!isSignerPage && state.me?.role !== 'pejabat' && (
          <button className="button primary" onClick={onOpenRequestModal}>
            <Plus size={17} /> Ajukan Persetujuan
          </button>
        )}
      </div>

      {/* Main Table */}
      <Panel
        title={
          isSignerPage ? 'Daftar Persetujuan Pejabat' : 'Daftar Permohonan Persetujuan'
        }
        description="Keputusan dan identitas pejabat penandatangan dicatat secara aman oleh server."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor Surat / ID</th>
                <th>Pemohon</th>
                <th>Pejabat Tujuan</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map(app => {
                const doc = state.documents.find(d => d.id === app.documentId);
                const applicant = state.profiles.find(p => p.id === app.applicantId);
                const signer = state.profiles.find(p => p.id === app.signerId);
                const isPending = app.status === 'MENUNGGU PERSETUJUAN';

                return (
                  <tr key={app.id}>
                    <td>
                      <strong className="block text-sm text-[#163452]">
                        {doc?.number || '—'}
                      </strong>
                      <small className="text-gray-600 font-medium block">
                        {doc?.subject}
                      </small>
                      <small className="mono text-gray-400 font-mono">
                        {app.id.slice(0, 8).toUpperCase()} · {formatDate(app.createdAt)}
                      </small>
                    </td>
                    <td>
                      <span className="font-medium text-gray-800">
                        {applicant?.name || '—'}
                      </span>
                      <small className="block text-gray-400">
                        {applicant?.unit || 'Staf'}
                      </small>
                    </td>
                    <td>
                      <span className="font-medium text-gray-800">
                        {signer?.name || '—'}
                      </span>
                      <small className="block text-gray-400">
                        {signer?.position || 'Pejabat'}
                      </small>
                    </td>
                    <td>
                      <StatusBadge>{app.status}</StatusBadge>
                      {app.reason && (
                        <small className="block text-red-700 mt-1">
                          Catatan: {app.reason}
                        </small>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc && (
                          <button
                            className="table-action p-1.5 text-gray-600 hover:text-[#193b63]"
                            title="Lihat naskah surat"
                            onClick={() => onViewDoc(doc)}
                          >
                            <Eye size={17} />
                          </button>
                        )}

                        {isSignerPage && isPending && isPejabat && (
                          <>
                            <button
                              className="button mini primary bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-2.5 py-1 rounded font-medium flex items-center gap-1"
                              disabled={processingId === app.id}
                              onClick={() => handleDecision(app, 'approve')}
                            >
                              <ShieldCheck size={14} />
                              {processingId === app.id ? 'Memproses...' : 'Setujui & TTE'}
                            </button>

                            <button
                              className="button mini danger text-xs px-2 py-1 rounded font-medium"
                              disabled={processingId === app.id}
                              onClick={() => setRejectTarget(app)}
                            >
                              Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredApprovals.length === 0 && (
            <EmptyState
              title="Belum ada permohonan persetujuan"
              text="Daftar pengajuan persetujuan naskah dinas akan tampil di sini."
              icon={FileSignature}
            />
          )}
        </div>
      </Panel>

      {/* Reject Reason Dialog */}
      {rejectTarget && (
        <AppDialog
          title="Tolak Permohonan Persetujuan"
          description="Berikan catatan perbaikan atau alasan penolakan agar staf dapat merevisi naskah."
          onClose={() => setRejectTarget(null)}
        >
          <div className="space-y-4">
            <label className="field">
              <span>Alasan / Catatan Penolakan *</span>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Contoh: Perbaiki konsiderans menimbang huruf b dan periksa kembali format penomoran..."
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setRejectTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button danger"
                disabled={!rejectReason.trim()}
                onClick={() => handleDecision(rejectTarget, 'reject', rejectReason)}
              >
                Tolak Permohonan
              </button>
            </div>
          </div>
        </AppDialog>
      )}
    </div>
  );
}
