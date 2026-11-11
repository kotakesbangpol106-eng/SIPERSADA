import React, { useState } from 'react';
import {
  ChartNoAxesCombined,
  Download,
  Printer,
  Calendar,
  FileText,
  CheckCircle2,
  Inbox,
  Send,
  GitPullRequest,
} from 'lucide-react';
import { SystemState } from '../types.js';
import { Panel, StatusBadge, EmptyState } from '../components/Common.js';
import { formatDate } from '../api.js';

interface ReportsPageProps {
  state: SystemState;
}

export function ReportsPage({ state }: ReportsPageProps) {
  const [reportType, setReportType] = useState<
    'masuk' | 'keluar' | 'disposisi' | 'persetujuan'
  >('masuk');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodMode, setPeriodMode] = useState<'month' | 'year'>('month');

  // Filter documents by date
  const filteredDocs = state.documents.filter(
    d => (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate)
  );

  let reportRows: Array<{
    number: string;
    date: string;
    subject: string;
    correspondent?: string;
    status: string;
  }> = [];

  if (reportType === 'masuk' || reportType === 'keluar') {
    reportRows = filteredDocs
      .filter(d => d.kind === reportType)
      .map(d => ({
        number: d.number,
        date: d.date,
        subject: d.subject,
        correspondent: d.correspondent,
        status: d.archived ? 'DIARSIPKAN' : 'TERCATAT',
      }));
  } else if (reportType === 'disposisi') {
    reportRows = state.dispositions
      .filter(disp => filteredDocs.some(d => d.id === disp.documentId))
      .map(disp => {
        const doc = state.documents.find(d => d.id === disp.documentId);
        const recipient = state.profiles.find(p => p.id === disp.recipientId);
        return {
          number: doc?.number || '—',
          date: disp.createdAt.slice(0, 10),
          subject: disp.instruction,
          correspondent: recipient?.name || 'Penerima',
          status: disp.status,
        };
      });
  } else {
    // Persetujuan
    reportRows = state.approvals
      .filter(app => filteredDocs.some(d => d.id === app.documentId))
      .map(app => {
        const doc = state.documents.find(d => d.id === app.documentId);
        return {
          number: doc?.number || '—',
          date: app.createdAt.slice(0, 10),
          subject: doc?.subject || '—',
          correspondent: app.approvedName || 'Pejabat Penandatangan',
          status: app.status,
        };
      });
  }

  // Monthly breakdown
  const periodCounts = reportRows.reduce((acc, row) => {
    const key = row.date.slice(0, periodMode === 'month' ? 7 : 4);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedPeriods = Object.entries(periodCounts).sort();

  // Export to CSV
  const handleExportCSV = () => {
    const escapeCsv = (val: string) => {
      const sanitized = /^[=+@\-\t\r]/.test(val) ? `'${val}` : val;
      return `"${sanitized.replaceAll('"', '""')}"`;
    };

    const header = ['Nomor Surat', 'Tanggal', 'Perihal / Instruksi', 'Pihak Terkait', 'Status'];
    const rows = reportRows.map(r => [
      r.number,
      r.date,
      r.subject,
      r.correspondent || '—',
      r.status,
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map(row => row.map(escapeCsv).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-sipersada-${reportType}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Module Toolbar */}
      <div className="module-toolbar flex flex-wrap items-center justify-between gap-4">
        <div className="report-heading flex items-center gap-3">
          <ChartNoAxesCombined size={24} className="text-[#193b63]" />
          <div>
            <strong className="text-base text-[#163452] block">
              Laporan &amp; Rekapitulasi Persuratan
            </strong>
            <small className="text-gray-500">
              Badan Kesatuan Bangsa dan Politik Kota Gorontalo
            </small>
          </div>
        </div>

        <div className="row-actions flex items-center gap-2">
          <button
            className="button secondary"
            onClick={handleExportCSV}
            disabled={reportRows.length === 0}
          >
            <Download size={16} /> Ekspor CSV
          </button>
          <button className="button primary" onClick={() => window.print()}>
            <Printer size={16} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="filter-row flex flex-wrap items-center gap-3 p-3 bg-white/70 border border-gray-200 rounded-lg text-xs">
        <select
          value={reportType}
          onChange={e => setReportType(e.target.value as any)}
          className="font-medium"
        >
          <option value="masuk">Rekap Surat Masuk</option>
          <option value="keluar">Rekap Surat Keluar</option>
          <option value="disposisi">Rekap Disposisi</option>
          <option value="persetujuan">Rekap Persetujuan Pejabat</option>
        </select>

        <select
          value={periodMode}
          onChange={e => setPeriodMode(e.target.value as any)}
        >
          <option value="month">Kelompokkan per Bulan</option>
          <option value="year">Kelompokkan per Tahun</option>
        </select>

        <label className="flex items-center gap-1 text-gray-600">
          <span>Dari:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-1 text-gray-600">
          <span>Sampai:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>

        {(startDate || endDate) && (
          <button
            className="text-button text-gray-500 hover:text-red-600"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
          >
            Hapus filter tanggal
          </button>
        )}
      </div>

      {/* Period Volume Cards */}
      {sortedPeriods.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {sortedPeriods.map(([periodKey, count]) => (
            <div
              key={periodKey}
              className="p-3 bg-white border border-gray-200 rounded-lg shadow-xs text-center"
            >
              <span className="text-xs text-gray-500 font-medium block">
                {periodKey}
              </span>
              <strong className="text-xl text-[#163452] font-semibold">
                {count}
              </strong>
              <small className="block text-[10px] text-gray-400">dokumen</small>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Table */}
      <Panel
        title={`Rincian Rekapitulasi (${reportRows.length} Dokumen)`}
        description="Data laporan resmi berdasarkan hak akses instansi yang terdaftar"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor / ID</th>
                <th>Tanggal</th>
                <th>Perihal / Ringkasan</th>
                <th>Pihak Terkait</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <strong className="text-[#163452]">{row.number}</strong>
                  </td>
                  <td>{formatDate(row.date)}</td>
                  <td>
                    <span className="font-medium text-gray-800 line-clamp-2">
                      {row.subject}
                    </span>
                  </td>
                  <td>{row.correspondent || '—'}</td>
                  <td>
                    <StatusBadge>{row.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {reportRows.length === 0 && (
            <EmptyState
              title="Belum ada data laporan"
              text="Tidak ada data persuratan pada rentang waktu atau kriteria yang dipilih."
              icon={FileText}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
