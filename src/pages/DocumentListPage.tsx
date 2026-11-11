import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Inbox,
  Send,
  Calendar,
} from 'lucide-react';
import { SystemState, DocumentItem } from '../types.js';
import { Panel, StatusBadge, EmptyState } from '../components/Common.js';
import { formatDate } from '../api.js';

interface DocumentListPageProps {
  page: 'surat-masuk' | 'surat-keluar' | 'arsip';
  state: SystemState;
  onOpenAddModal: (kind: 'masuk' | 'keluar') => void;
  onViewDoc: (doc: DocumentItem) => void;
}

export function DocumentListPage({
  page,
  state,
  onOpenAddModal,
  onViewDoc,
}: DocumentListPageProps) {
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [correspondentFilter, setCorrespondentFilter] = useState('');
  const [archiveKind, setArchiveKind] = useState('');
  const [archiveYear, setArchiveYear] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');

  const isArchive = page === 'arsip';

  const filteredDocs = state.documents.filter(doc => {
    // Page filter
    if (isArchive) {
      const isApproved = state.approvals.some(
        a => a.documentId === doc.id && a.status === 'DISETUJUI'
      );
      if (!doc.archived && !isApproved) return false;
      if (archiveKind && doc.kind !== archiveKind) return false;
      if (archiveYear && !doc.date.startsWith(archiveYear)) return false;
      if (archiveStatus) {
        const docApproval = state.approvals
          .filter(a => a.documentId === doc.id)
          .at(-1);
        if (docApproval?.status !== archiveStatus) return false;
      }
    } else {
      const targetKind = page === 'surat-masuk' ? 'masuk' : 'keluar';
      if (doc.kind !== targetKind) return false;
    }

    // Search query
    if (search) {
      const q = search.toLowerCase();
      const match =
        doc.number.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q) ||
        doc.correspondent.toLowerCase().includes(q) ||
        (doc.data?.agenda && doc.data.agenda.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Classification filter
    if (classification && doc.classification !== classification) return false;

    // Date range filter
    if (startDate && doc.date < startDate) return false;
    if (endDate && doc.date > endDate) return false;

    // Correspondent filter
    if (
      correspondentFilter &&
      !doc.correspondent.toLowerCase().includes(correspondentFilter.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const pageTitle =
    page === 'surat-masuk'
      ? 'Surat Masuk'
      : page === 'surat-keluar'
      ? 'Surat Keluar'
      : 'Arsip Digital';

  const allYears = Array.from(
    new Set(state.documents.map(d => d.date.slice(0, 4)))
  ).sort();

  return (
    <div className="space-y-4">
      {/* Module Toolbar */}
      <div className="module-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="input-icon flex-1 min-w-[260px] max-w-md">
          <Search size={17} />
          <input
            placeholder="Cari nomor, perihal, atau asal/tujuan surat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="toolbar-right flex items-center gap-3">
          <span className="count-label text-xs text-gray-500 font-medium">
            {filteredDocs.length} dokumen ditemukan
          </span>

          {!isArchive && state.me?.role !== 'pejabat' && (
            <button
              className="button primary"
              onClick={() =>
                onOpenAddModal(page === 'surat-masuk' ? 'masuk' : 'keluar')
              }
            >
              <Plus size={17} /> Tambah Surat{' '}
              {page === 'surat-masuk' ? 'Masuk' : 'Keluar'}
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="filter-row flex flex-wrap items-center gap-2 p-3 bg-white/70 border border-gray-200 rounded-lg text-xs">
        <span className="flex items-center gap-1 font-semibold text-gray-600">
          <Filter size={15} /> Filter
        </span>

        {isArchive ? (
          <>
            <select
              aria-label="Jenis surat"
              value={archiveKind}
              onChange={e => setArchiveKind(e.target.value)}
            >
              <option value="">Semua jenis surat</option>
              <option value="masuk">Surat Masuk</option>
              <option value="keluar">Surat Keluar</option>
            </select>

            <select
              aria-label="Tahun arsip"
              value={archiveYear}
              onChange={e => setArchiveYear(e.target.value)}
            >
              <option value="">Semua tahun</option>
              {allYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              aria-label="Status arsip"
              value={archiveStatus}
              onChange={e => setArchiveStatus(e.target.value)}
            >
              <option value="">Semua status</option>
              <option value="DISETUJUI">DISETUJUI</option>
              <option value="DITOLAK">DITOLAK</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>
          </>
        ) : (
          <>
            <select
              aria-label="Klasifikasi"
              value={classification}
              onChange={e => setClassification(e.target.value)}
            >
              <option value="">Semua klasifikasi</option>
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Rahasia">Rahasia</option>
              <option value="Undangan">Undangan</option>
              <option value="Pemberitahuan">Pemberitahuan</option>
            </select>

            <input
              aria-label="Filter asal atau tujuan"
              placeholder="Asal / tujuan surat..."
              value={correspondentFilter}
              onChange={e => setCorrespondentFilter(e.target.value)}
            />
          </>
        )}

        <label className="flex items-center gap-1 text-gray-600">
          <span>Dari</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-1 text-gray-600">
          <span>Sampai</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>

        {(search ||
          classification ||
          startDate ||
          endDate ||
          correspondentFilter ||
          archiveKind ||
          archiveYear ||
          archiveStatus) && (
          <button
            className="text-button text-gray-500 hover:text-red-600"
            onClick={() => {
              setSearch('');
              setClassification('');
              setStartDate('');
              setEndDate('');
              setCorrespondentFilter('');
              setArchiveKind('');
              setArchiveYear('');
              setArchiveStatus('');
            }}
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Main Document Table */}
      <Panel
        title={`Daftar ${pageTitle}`}
        description="Dokumen privat · Akses dan keamanan sesuai kewenangan pengguna"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor / Perihal Surat</th>
                <th>Asal / Tujuan</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => {
                const approval = state.approvals
                  .filter(a => a.documentId === doc.id)
                  .at(-1);

                return (
                  <tr key={doc.id}>
                    <td>
                      <strong className="block text-sm text-[#163452]">
                        {doc.number}
                      </strong>
                      <small className="text-gray-600 font-medium block">
                        {doc.subject}
                      </small>
                      {doc.data?.agenda && (
                        <small className="text-gray-400 font-mono">
                          Agenda: {doc.data.agenda}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className="font-medium text-gray-700">
                        {doc.correspondent}
                      </span>
                      <small className="block text-gray-400">
                        {doc.classification} · {doc.urgency}
                      </small>
                    </td>
                    <td>{formatDate(doc.date)}</td>
                    <td>
                      <StatusBadge>
                        {approval?.status || (doc.archived ? 'DIARSIPKAN' : 'TERCATAT')}
                      </StatusBadge>
                    </td>
                    <td className="text-right">
                      <button
                        className="table-action p-1.5 text-gray-600 hover:text-[#193b63]"
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

          {filteredDocs.length === 0 && (
            <EmptyState
              title="Belum ada surat tercatat"
              text="Surat yang sesuai kriteria pencarian akan tampil pada daftar ini."
              icon={page === 'surat-masuk' ? Inbox : Send}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
