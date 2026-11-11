import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Search,
  Building2,
  FileCheck2,
  ArrowLeft,
} from 'lucide-react';
import { Brand } from '../components/Common.js';
import { apiCall, formatDate, formatDateTime } from '../api.js';

interface VerifyPageProps {
  initialToken?: string;
  onNavigate: (path: string) => void;
}

export function VerifyPage({ initialToken = '', onNavigate }: VerifyPageProps) {
  const [tokenInput, setTokenInput] = useState(
    initialToken === 'cek' ? '' : initialToken
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const runVerification = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await apiCall(
        `verify/${encodeURIComponent(tokenToVerify.trim())}`,
        undefined,
        'GET'
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi dokumen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken && initialToken !== 'cek') {
      runVerification(initialToken);
    }
  }, [initialToken]);

  const isValid = result?.status === 'DOKUMEN TERVERIFIKASI';

  return (
    <div className="verify-page min-h-screen bg-[#f5f4f0] flex flex-col justify-between">
      {/* Header */}
      <header className="p-4 sm:px-8 border-b border-gray-200/80 bg-white/70 backdrop-blur flex items-center justify-between">
        <a
          href="/dashboard"
          onClick={e => {
            e.preventDefault();
            onNavigate('dashboard');
          }}
        >
          <Brand small />
        </a>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <Building2 size={16} className="text-[#193b63]" />
          <span>Kesbangpol Kota Gorontalo</span>
        </div>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        <button
          className="text-button text-xs text-gray-600 hover:text-[#193b63] mb-4 flex items-center gap-1"
          onClick={() => onNavigate('dashboard')}
        >
          <ArrowLeft size={14} /> Kembali ke Beranda
        </button>

        <div className="text-center mb-6">
          <span className="eyebrow dark-eyebrow text-xs font-bold text-[#c8ac77] uppercase tracking-wider block mb-1">
            VERIFIKASI DOKUMEN PUBLIK
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#163452]">
            Periksa keaslian dokumen.
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Verifikasi status persetujuan dan integritas dokumen SIPERSADA.
          </p>
        </div>

        {/* Search input form */}
        <form
          className="verify-search flex gap-2 mb-6"
          onSubmit={e => {
            e.preventDefault();
            runVerification(tokenInput);
          }}
        >
          <input
            className="flex-1 bg-white p-3 rounded-lg border border-gray-300 shadow-xs text-sm"
            required
            aria-label="Token verifikasi"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="Masukkan token dokumen atau pindai QR Code"
          />
          <button
            className="button primary px-5 py-3 rounded-lg font-semibold flex items-center gap-1.5 shrink-0"
            disabled={loading}
            type="submit"
          >
            <Search size={16} />
            {loading ? 'Memeriksa...' : 'Periksa'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-6 flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Verification result display */}
        {result && (
          <section
            className={`verification-result p-6 rounded-xl border shadow-sm mb-6 ${
              isValid
                ? 'bg-white border-emerald-300'
                : 'bg-red-50/50 border-red-300'
            }`}
          >
            <div className="verify-status text-center pb-5 mb-5 border-b border-gray-100">
              <div className="inline-flex p-3 rounded-full mb-2">
                {isValid ? (
                  <ShieldCheck size={42} className="text-emerald-700" />
                ) : (
                  <AlertCircle size={42} className="text-red-600" />
                )}
              </div>
              <h2
                className={`text-xl font-bold ${
                  isValid ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                {result.status}
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                {isValid
                  ? 'Status persetujuan aktif dan hash SHA-256 file sesuai pada server resmi Kesbangpol Kota Gorontalo.'
                  : result.message ||
                    'Dokumen belum dapat dinyatakan sah. Hubungi instansi untuk konfirmasi keabsahan.'}
              </p>
            </div>

            {isValid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="Lambang Kota Gorontalo"
                    className="w-10 h-12 object-contain shrink-0"
                  />
                  <div>
                    <span className="text-gray-500 block text-[11px]">Instansi Penerbit:</span>
                    <strong className="text-sm text-[#163452] block">
                      Badan Kesatuan Bangsa dan Politik Kota Gorontalo
                    </strong>
                    <small className="text-gray-500 text-[10px]">Pemerintah Kota Gorontalo</small>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block">Nomor Surat:</span>
                  <strong className="text-[#193b63]">{result.number}</strong>
                </div>

                <div>
                  <span className="text-gray-500 block">Tanggal Surat:</span>
                  <strong>{formatDate(result.date)}</strong>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-gray-500 block">Perihal:</span>
                  <p className="font-medium text-gray-800">{result.subject}</p>
                </div>

                <div>
                  <span className="text-gray-500 block">Pejabat Penandatangan:</span>
                  <strong className="text-gray-800">{result.approvedName}</strong>
                </div>

                <div>
                  <span className="text-gray-500 block">Jabatan:</span>
                  <span>{result.approvedPosition || 'Kepala Badan'}</span>
                </div>

                <div>
                  <span className="text-gray-500 block">Waktu Persetujuan:</span>
                  <span>{formatDateTime(result.approvedAt)}</span>
                </div>

                <div>
                  <span className="text-gray-500 block">ID Identifikasi:</span>
                  <span className="font-mono text-gray-700">
                    {result.documentId}
                  </span>
                </div>

                {result.fileHash && (
                  <div className="sm:col-span-2 p-2 bg-gray-50 rounded font-mono text-[11px] text-gray-600 truncate">
                    Hash SHA-256: {result.fileHash}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Legal Disclaimer */}
        <div className="legal-note flex items-start gap-3 p-4 bg-gray-100/80 border border-gray-200 rounded-lg text-xs text-gray-600">
          <ShieldCheck size={22} className="shrink-0 text-gray-500 mt-0.5" />
          <p>
            Verifikasi ini merupakan verifikasi internal SIPERSADA dan bukan validasi
            sertifikat TTE BSrE. Pemeriksaan dilakukan terhadap token, status dokumen, dan
            hash SHA-256 file final pada backend Pemerintah Kota Gorontalo.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white/60">
        © {new Date().getFullYear()} SIPERSADA · Pemerintah Kota Gorontalo
      </footer>
    </div>
  );
}
