import React, { useState } from 'react';
import { GitPullRequest, Plus, Clock, Eye, AlertTriangle } from 'lucide-react';
import { SystemState, DispositionItem, DocumentItem } from '../types.js';
import { Panel, StatusBadge, EmptyState } from '../components/Common.js';
import { FollowUpModal } from '../components/Modals.js';
import { formatDate } from '../api.js';

interface DispositionsPageProps {
  state: SystemState;
  onOpenDispositionModal: () => void;
  onRefresh: () => void;
  onViewDoc: (doc: DocumentItem) => void;
}

export function DispositionsPage({
  state,
  onOpenDispositionModal,
  onRefresh,
  onViewDoc,
}: DispositionsPageProps) {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [followUpItem, setFollowUpItem] = useState<DispositionItem | null>(null);

  const filteredDispositions = state.dispositions.filter(disp => {
    if (filterStatus && disp.status !== filterStatus) return false;
    return true;
  });

  const canCreate =
    state.me?.role === 'admin' || state.me?.role === 'pejabat';

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Module Toolbar */}
      <div className="module-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter status tindak lanjut"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Semua status tindak lanjut</option>
            <option value="BARU">BARU</option>
            <option value="DALAM PROSES">DALAM PROSES</option>
            <option value="SELESAI">SELESAI</option>
          </select>
        </div>

        {canCreate && (
          <button className="button primary" onClick={onOpenDispositionModal}>
            <Plus size={16} /> Buat Disposisi
          </button>
        )}
      </div>

      {/* Main Table */}
      <Panel
        title="Daftar Disposisi Surat Masuk"
        description="Pantau instruksi pimpinan, batas waktu penyelesaian, dan laporan tindak lanjut berjenjang."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Surat / Instruksi</th>
                <th>Pemberi / Penerima</th>
                <th>Batas Waktu</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDispositions.map(disp => {
                const doc = state.documents.find(d => d.id === disp.documentId);
                const giver = state.profiles.find(p => p.id === disp.giverId);
                const recipient = state.profiles.find(p => p.id === disp.recipientId);
                const isOverdue =
                  disp.deadline < todayStr && disp.status !== 'SELESAI';

                const canUpdate =
                  state.me?.role === 'admin' ||
                  state.me?.id === disp.recipientId ||
                  state.me?.id === disp.giverId;

                return (
                  <tr key={disp.id}>
                    <td>
                      <strong className="block text-sm text-[#163452]">
                        {doc?.number || '—'}
                      </strong>
                      <p className="text-xs font-medium text-gray-800 mt-0.5">
                        {disp.instruction}
                      </p>
                      <small className="text-gray-400 block mt-0.5">
                        Perihal: {doc?.subject || '—'} · Tgl Disposisi:{' '}
                        {formatDate(disp.createdAt)}
                      </small>
                    </td>
                    <td>
                      <span className="font-semibold text-gray-800 block">
                        {giver?.name || 'Pimpinan'}
                      </span>
                      <small className="text-gray-500 block">
                        Ke: <strong>{recipient?.name || 'Staf'}</strong> (
                        {recipient?.unit || 'Unit'})
                      </small>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${isOverdue ? 'text-red-700 bg-red-50 px-2 py-0.5 rounded' : 'text-gray-700'}`}
                      >
                        {isOverdue && <AlertTriangle size={12} />}
                        {formatDate(disp.deadline)}
                      </span>
                      {isOverdue && (
                        <small className="block text-[10px] text-red-600 font-medium">
                          Melewati batas waktu
                        </small>
                      )}
                    </td>
                    <td>
                      <StatusBadge>{disp.status}</StatusBadge>
                      {disp.notes && (
                        <small className="block text-gray-500 mt-1 max-w-xs">
                          {disp.notes}
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

                        {canUpdate && (
                          <button
                            className="button mini secondary text-xs px-2.5 py-1 font-medium rounded"
                            onClick={() => setFollowUpItem(disp)}
                          >
                            Tindak Lanjut
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDispositions.length === 0 && (
            <EmptyState
              title="Belum ada disposisi"
              text="Instruksi disposisi surat masuk dari pimpinan akan muncul di sini."
              icon={GitPullRequest}
            />
          )}
        </div>
      </Panel>

      {/* Follow Up Modal */}
      {followUpItem && (
        <FollowUpModal
          disposition={followUpItem}
          onClose={() => setFollowUpItem(null)}
          onDone={() => {
            setFollowUpItem(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
