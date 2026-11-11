import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  UserCheck,
  KeyRound,
  UserPlus,
  Zap,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { Brand } from '../components/Common.js';
import { apiCall, toast } from '../api.js';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onSuccess, onNavigate }: LoginPageProps) {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Setup form states (for first admin)
  const [adminName, setAdminName] = useState('Andrew Poneto');
  const [adminEmail, setAdminEmail] = useState('andrewponeto5@gmail.com');
  const [adminPassword, setAdminPassword] = useState('adminpassword123');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('adminpassword123');

  // Login form states (for existing accounts)
  const [email, setEmail] = useState('andrewponeto5@gmail.com');
  const [password, setPassword] = useState('adminpassword123');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await apiCall<{ hasAdmin: boolean; userCount: number }>(
        'auth-status',
        undefined,
        'GET'
      );
      setHasAdmin(res.hasAdmin);
    } catch {
      setHasAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleFirstAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword !== adminConfirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiCall(
        'setup-admin',
        {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        },
        'POST'
      );
      toast.success('Administrator utama berhasil didaftarkan!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftarkan administrator.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiCall('login', { email, password }, 'POST');
      toast.success('Berhasil masuk ke SIPERSADA.');
      onSuccess();
    } catch (err: any) {
      setError(
        err.message ||
          'Tidak dapat masuk. Periksa email, password, dan status aktivasi akun Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'pejabat' | 'staf', accountEmail?: string) => {
    setQuickLoadingRole(role);
    setError('');
    try {
      const res = await apiCall<{ ok: boolean; user: any; message: string }>(
        'quick-login',
        { role, email: accountEmail },
        'POST'
      );
      toast.success(res.message || 'Berhasil masuk.');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal masuk secara cepat.');
    } finally {
      setQuickLoadingRole(null);
    }
  };

  const handleFillCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    toast.info(`Akun ${fillEmail} disiapkan di formulir.`);
  };

  const handleResetSystemAuth = async () => {
    const confirmed = window.confirm(
      'Apakah Anda ingin mereset seluruh akun dan membuka kembali formulir Pendaftaran Administrator Pertama?\n\nSemua akun akan dikosongkan agar Anda dapat mendaftarkan akun Administrator baru Anda sendiri.'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await apiCall('reset-system-auth', {}, 'POST');
      toast.success('Sistem telah direset. Silakan daftarkan Administrator pertama Anda.');
      setHasAdmin(false);
      setAdminName('Andrew Poneto');
      setAdminEmail('andrewponeto5@gmail.com');
      setAdminPassword('adminpassword123');
      setAdminConfirmPassword('adminpassword123');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Brand Panel */}
      <section className="login-brand-panel">
        <a
          href="/dashboard"
          onClick={e => {
            e.preventDefault();
            onNavigate('dashboard');
          }}
        >
          <Brand />
        </a>

        <div>
          <span className="eyebrow">PEMERINTAH KOTA GORONTALO</span>
          <h1>
            Persuratan tertata.
            <br />
            Administrasi
            <br />
            <em>lebih bermakna.</em>
          </h1>
          <p>
            Sistem Informasi Persuratan Digital
            <br />
            Badan Kesatuan Bangsa dan Politik
            <br />
            Kota Gorontalo.
          </p>

          <div className="login-features">
            <span>
              <ShieldCheck size={19} /> Aman &amp; terdokumentasi
            </span>
            <span>
              <QrCode size={19} /> Verifikasi dokumen internal
            </span>
          </div>
        </div>

        <small>© {new Date().getFullYear()} SIPERSADA · Kesbangpol Kota Gorontalo</small>
      </section>

      {/* Right Form Panel */}
      <section className="login-form-panel overflow-y-auto">
        <a
          className="back-link"
          href="/dashboard"
          onClick={e => {
            e.preventDefault();
            onNavigate('dashboard');
          }}
        >
          ← Kembali ke dashboard
        </a>

        <div className="login-form-card" style={{ maxWidth: '440px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-14 p-1 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Lambang Kota Gorontalo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#b4934e] tracking-wider uppercase block">
                PEMERINTAH KOTA GORONTALO
              </span>
              <strong className="text-sm text-[#163452] block font-extrabold leading-tight">
                SIPERSADA Kesbangpol
              </strong>
            </div>
          </div>

          {checkingAuth ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Memeriksa status sistem persuratan...
            </div>
          ) : hasAdmin === false ? (
            /* First Administrator Setup Mode */
            <>
              <span className="eyebrow dark-eyebrow text-amber-700 font-bold">
                PENDAFTARAN ADMINISTRATOR PERTAMA
              </span>
              <h2>Inisialisasi Sistem</h2>
              <p>
                Belum ada akun Administrator terdaftar. Akun pertama yang Anda daftarkan di
                bawah ini otomatis menjadi <strong>Administrator Utama</strong>. Pendaftaran
                selanjutnya dikunci dan hanya dapat ditambahkan oleh Administrator melalui menu
                Pengguna.
              </p>

              <form className="app-form" onSubmit={handleFirstAdminSubmit}>
                <label className="field">
                  <span>Nama lengkap Administrator *</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Andrew Poneto"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Alamat email instansi *</span>
                  <div className="input-icon">
                    <Mail size={17} />
                    <input
                      type="email"
                      required
                      placeholder="nama@instansi.go.id"
                      autoComplete="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                    />
                  </div>
                </label>

                <label className="field">
                  <span>Password baru (min. 6 karakter) *</span>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Masukkan password Anda"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="field">
                  <span>Konfirmasi password *</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi password Anda"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                  />
                </label>

                {error && (
                  <p className="form-error text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                    {error}
                  </p>
                )}

                <button
                  className="button primary login-submit w-full justify-center"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    'Mendaftarkan Administrator...'
                  ) : (
                    <>
                      Daftarkan Administrator Utama <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              <div className="login-support">
                <ShieldCheck size={17} />
                <span>
                  Keamanan Terjamin
                  <br />
                  Hanya Administrator yang memiliki hak menambah akun berikutnya.
                </span>
              </div>
            </>
          ) : (
            /* Standard Login Mode (when Admin exists) */
            <>
              <span className="eyebrow dark-eyebrow">SELAMAT DATANG DI SIPERSADA</span>
              <h2>Masuk ke ruang kerja</h2>
              <p>Gunakan kredensial akun instansi Anda untuk melanjutkan.</p>

              {/* Quick Login One-Click Section */}
              <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Zap size={14} className="text-amber-600" />
                    Masuk Cepat 1-Klik:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(!showHelpModal)}
                    className="text-blue-600 hover:underline text-[11px] flex items-center gap-1"
                  >
                    <HelpCircle size={12} /> Bantuan Akun
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Admin Andrew Poneto */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 transition-all">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          Andrew Poneto
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded font-medium">
                          Admin Utama
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        andrewponeto5@gmail.com
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleFillCredentials('andrewponeto5@gmail.com', 'adminpassword123')
                        }
                        title="Isi ke formulir"
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Isi
                      </button>
                      <button
                        type="button"
                        disabled={!!quickLoadingRole}
                        onClick={() => handleQuickLogin('admin', 'andrewponeto5@gmail.com')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded shadow-sm flex items-center gap-1"
                      >
                        {quickLoadingRole === 'admin' ? 'Masuk...' : 'Masuk'}
                      </button>
                    </div>
                  </div>

                  {/* Pejabat Penandatangan */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 transition-all">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          H. Iskandar Mooduto, M.Si
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-medium">
                          Kepala Badan
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        kaban.kesbangpol@gorontalokota.go.id
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleFillCredentials(
                            'kaban.kesbangpol@gorontalokota.go.id',
                            'pejabatpassword123'
                          )
                        }
                        title="Isi ke formulir"
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Isi
                      </button>
                      <button
                        type="button"
                        disabled={!!quickLoadingRole}
                        onClick={() => handleQuickLogin('pejabat')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-sm flex items-center gap-1"
                      >
                        {quickLoadingRole === 'pejabat' ? 'Masuk...' : 'Masuk'}
                      </button>
                    </div>
                  </div>

                  {/* Staf Persuratan */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 transition-all">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          Fadli R. Mohamad, S.AP
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-medium">
                          Staf Persuratan
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        staf.persuratan@gorontalokota.go.id
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleFillCredentials(
                            'staf.persuratan@gorontalokota.go.id',
                            'stafpassword123'
                          )
                        }
                        title="Isi ke formulir"
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Isi
                      </button>
                      <button
                        type="button"
                        disabled={!!quickLoadingRole}
                        onClick={() => handleQuickLogin('staf')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-sm flex items-center gap-1"
                      >
                        {quickLoadingRole === 'staf' ? 'Masuk...' : 'Masuk'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Login Form */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">
                  Atau masuk dengan email &amp; password
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form className="app-form" onSubmit={handleLoginSubmit}>
                <label className="field">
                  <span>Alamat email</span>
                  <div className="input-icon">
                    <Mail size={17} />
                    <input
                      type="email"
                      required
                      placeholder="nama@instansi.go.id"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </label>

                <label className="field">
                  <span>Password</span>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={1}
                      autoComplete="current-password"
                      placeholder="Masukkan password Anda"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="form-error text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200 space-y-1">
                    <p>{error}</p>
                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleFillCredentials('andrewponeto5@gmail.com', 'adminpassword123')
                        }
                        className="text-xs font-semibold text-blue-700 underline"
                      >
                        Gunakan Kredensial Admin Utama
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="button primary login-submit w-full justify-center"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    'Memeriksa Kredensial...'
                  ) : (
                    <>
                      Masuk ke SIPERSADA <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Reset to First Admin Setup Button */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={handleResetSystemAuth}
                  className="text-amber-800 hover:text-amber-900 text-[11px] font-medium flex items-center gap-1"
                  title="Kosongkan akun agar dapat mendaftar administrator pertama kembali"
                >
                  <RotateCcw size={12} />
                  Reset ke Pendaftaran Administrator Pertama
                </button>
              </div>

              <div className="login-support">
                <Users size={17} />
                <span>
                  Akses Terkelola Instansi
                  <br />
                  Administrator dapat menambah dan mengelola akun seluruh pegawai melalui menu
                  <strong> Manajemen Pengguna</strong>.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="login-security">
          <LockKeyhole size={13} /> Akses resmi Kesbangpol Kota Gorontalo · Enkripsi SHA-256
        </div>
      </section>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Informasi Kredensial Masuk SIPERSADA
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Aplikasi telah didaftarkan dengan akun <strong>Administrator Utama</strong> untuk
                Anda:
              </p>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-1">
                <div className="font-bold text-purple-900">1. Administrator (Andrew Poneto)</div>
                <div>
                  Email: <code className="bg-white px-1.5 py-0.5 rounded border">andrewponeto5@gmail.com</code>
                </div>
                <div>
                  Email Alternatif: <code className="bg-white px-1.5 py-0.5 rounded border">admin.kesbangpol@gorontalokota.go.id</code>
                </div>
                <div>
                  Password: <code className="bg-white px-1.5 py-0.5 rounded border">adminpassword123</code>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
                <div className="font-bold text-blue-900">2. Pejabat Penandatangan (Kaban)</div>
                <div>
                  Email: <code className="bg-white px-1.5 py-0.5 rounded border">kaban.kesbangpol@gorontalokota.go.id</code>
                </div>
                <div>
                  Password: <code className="bg-white px-1.5 py-0.5 rounded border">pejabatpassword123</code>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-900">3. Staf Pengelola Persuratan</div>
                <div>
                  Email: <code className="bg-white px-1.5 py-0.5 rounded border">staf.persuratan@gorontalokota.go.id</code>
                </div>
                <div>
                  Password: <code className="bg-white px-1.5 py-0.5 rounded border">stafpassword123</code>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Setelah masuk sebagai Administrator, Anda dapat mengganti password Anda kapan saja
                atau menambah staf baru di menu <strong>Manajemen Pengguna</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="button primary px-4 py-2 text-xs"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
