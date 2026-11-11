import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  CalendarDays,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { SystemState, DocumentItem } from './types.js';
import { apiCall, toast, ToastMessage } from './api.js';
import { Sidebar, NAV_TITLES } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';
import {
  DocumentModal,
  ApprovalRequestModal,
  DispositionModal,
  DocumentDetailModal,
} from './components/Modals.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DocumentListPage } from './pages/DocumentListPage.js';
import { ApprovalsPage } from './pages/ApprovalsPage.js';
import { DispositionsPage } from './pages/DispositionsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { VerifyPage } from './pages/VerifyPage.js';

const INITIAL_EMPTY_STATE: SystemState = {
  me: null,
  documents: [],
  approvals: [],
  dispositions: [],
  profiles: [],
  activities: [],
  notifications: [],
  verifications: [],
};

export default function App() {
  const [state, setState] = useState<SystemState>(INITIAL_EMPTY_STATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('dashboard');
  const [verifyToken, setVerifyToken] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [todayText, setTodayText] = useState<string>('Hari ini');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Active Modals state
  const [addDocModalKind, setAddDocModalKind] = useState<'masuk' | 'keluar' | null>(null);
  const [editDocTarget, setEditDocTarget] = useState<DocumentItem | undefined>(undefined);
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [showDispositionModal, setShowDispositionModal] = useState<boolean>(false);
  const [viewDocTarget, setViewDocTarget] = useState<DocumentItem | null>(null);

  // Subscribe to toasts
  useEffect(() => {
    return toast.subscribe(t => setToasts(t));
  }, []);

  // Parse path from location
  const parseCurrentRoute = () => {
    const rawPath = window.location.pathname.replace(/^\/+/, '').split('/')[0] || 'dashboard';

    if (rawPath === 'verifikasi' || rawPath === 'cek') {
      const parts = window.location.pathname.split('/');
      const token = parts[2] || (rawPath === 'cek' ? 'cek' : '');
      setCurrentPath('verifikasi');
      setVerifyToken(token);
    } else {
      setCurrentPath(rawPath);
    }
  };

  const navigateTo = (path: string, token: string = '') => {
    const fullPath =
      path === 'verifikasi'
        ? token
          ? `/verifikasi/${token}`
          : '/verifikasi'
        : `/${path}`;

    if (window.location.pathname !== fullPath) {
      window.history.pushState({}, '', fullPath);
    }

    if (path === 'verifikasi') {
      setVerifyToken(token);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchState = async () => {
    setLoading(true);
    setErrorBanner('');
    try {
      const data = await apiCall<SystemState>('state', undefined, 'GET');
      setState(data);
    } catch (err: any) {
      setErrorBanner(err.message || 'Tidak dapat memuat data instansi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    parseCurrentRoute();

    const handlePopState = () => {
      parseCurrentRoute();
    };

    window.addEventListener('popstate', handlePopState);

    // Format today date in Indonesian locale
    const formattedDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setTodayText(formattedDate);

    fetchState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiCall('logout', {}, 'POST');
      toast.success('Sesi berhasil diakhiri.');
      await fetchState();
      navigateTo('login');
    } catch (err: any) {
      toast.error(err.message || 'Gagal keluar.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await apiCall('notification', {}, 'POST');
      await fetchState();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menandai notifikasi.');
    }
  };

  // If on public verification page
  if (currentPath === 'verifikasi') {
    return (
      <VerifyPage
        initialToken={verifyToken}
        onNavigate={path => navigateTo(path)}
      />
    );
  }

  // If on login page
  if (currentPath === 'login') {
    return (
      <LoginPage
        onSuccess={async () => {
          await fetchState();
          navigateTo('dashboard');
        }}
        onNavigate={path => navigateTo(path)}
      />
    );
  }

  const pageTitle = NAV_TITLES[currentPath] || 'Dashboard';
  const pageDescription =
    currentPath === 'dashboard'
      ? 'Pantau dan kelola seluruh aktivitas persuratan dalam satu tempat.'
      : `Kelola ${pageTitle.toLowerCase()} instansi secara terpusat dan terdokumentasi.`;

  return (
    <div className="app-layout">
      {/* Toast Notifications Overlay */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-3 rounded-lg shadow-lg flex items-center gap-2.5 text-xs font-semibold border pointer-events-auto transition-all ${
                t.type === 'success'
                  ? 'bg-emerald-800 text-white border-emerald-900'
                  : t.type === 'error'
                  ? 'bg-red-800 text-white border-red-900'
                  : 'bg-[#163452] text-white border-[#102838]'
              }`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : t.type === 'error' ? (
                <AlertCircle size={16} />
              ) : (
                <Info size={16} />
              )}
              <span className="flex-1">{t.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={path => navigateTo(path)}
        state={state}
      />

      {/* Main Shell */}
      <div className="main-shell">
        <Topbar
          state={state}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={path => navigateTo(path)}
          onLogout={handleLogout}
          onMarkNotificationsRead={handleMarkNotificationsRead}
        />

        <main>
          {/* Breadcrumb */}
          <div className="breadcrumb">
            SIPERSADA <ChevronRight size={13} />
            <span>{pageTitle}</span>
          </div>

          {/* Page Heading & Date Chip */}
          <div className="page-heading">
            <div>
              <h1>{pageTitle}</h1>
              <p>{pageDescription}</p>
            </div>
            <div className="date-chip">
              <CalendarDays size={16} />
              {todayText}
            </div>
          </div>

          {/* Error Banner if any */}
          {errorBanner && (
            <div className="error-banner flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{errorBanner}</span>
              </div>
              <button
                className="text-xs font-semibold text-red-800 hover:underline"
                onClick={fetchState}
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Unauthenticated Info Banner */}
          {!loading && !state.me && !errorBanner && (
            <div className="session-banner flex items-center justify-between p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 mb-5">
              <div className="flex items-center gap-2">
                <LockKeyhole size={16} className="text-amber-700" />
                <span>
                  Ruang kerja belum terhubung ke akun. Masuk untuk mengakses dan mengelola
                  persuratan instansi secara penuh.
                </span>
              </div>
              <a
                href="/login"
                className="font-semibold text-[#193b63] hover:underline flex items-center gap-1 shrink-0"
                onClick={e => {
                  e.preventDefault();
                  navigateTo('login');
                }}
              >
                Masuk <ArrowRight size={14} />
              </a>
            </div>
          )}

          {/* Skeleton Loader during initial fetch */}
          {loading ? (
            <div className="skeleton-grid" aria-label="Memuat data">
              <div />
              <div />
              <div />
              <div />
              <section />
            </div>
          ) : (
            <>
              {currentPath === 'dashboard' && (
                <DashboardPage
                  state={state}
                  onNavigate={path => navigateTo(path)}
                  onOpenAddModal={kind => {
                    setEditDocTarget(undefined);
                    setAddDocModalKind(kind);
                  }}
                  onOpenRequestModal={() => setShowRequestModal(true)}
                  onViewDoc={doc => setViewDocTarget(doc)}
                />
              )}

              {(currentPath === 'surat-masuk' ||
                currentPath === 'surat-keluar' ||
                currentPath === 'arsip') && (
                <DocumentListPage
                  page={currentPath as any}
                  state={state}
                  onOpenAddModal={kind => {
                    setEditDocTarget(undefined);
                    setAddDocModalKind(kind);
                  }}
                  onViewDoc={doc => setViewDocTarget(doc)}
                />
              )}

              {(currentPath === 'permohonan-persetujuan' ||
                currentPath === 'persetujuan') && (
                <ApprovalsPage
                  page={currentPath as any}
                  state={state}
                  onOpenRequestModal={() => setShowRequestModal(true)}
                  onRefresh={fetchState}
                  onViewDoc={doc => setViewDocTarget(doc)}
                />
              )}

              {currentPath === 'disposisi' && (
                <DispositionsPage
                  state={state}
                  onOpenDispositionModal={() => setShowDispositionModal(true)}
                  onRefresh={fetchState}
                  onViewDoc={doc => setViewDocTarget(doc)}
                />
              )}

              {currentPath === 'laporan' && <ReportsPage state={state} />}

              {currentPath === 'pengguna' && (
                <UsersPage state={state} onRefresh={fetchState} />
              )}

              {currentPath === 'pengaturan' && (
                <SettingsPage
                  state={state}
                  onRefresh={fetchState}
                  onNavigate={path => navigateTo(path)}
                />
              )}
            </>
          )}

          {/* Main Footer */}
          <footer className="main-footer">
            <span>
              © {new Date().getFullYear()} SIPERSADA · Kesbangpol Kota Gorontalo
            </span>
            <span>
              <ShieldCheck size={13} /> Persetujuan internal, tanpa integrasi BSrE
            </span>
          </footer>
        </main>
      </div>

      {/* Global Modals */}
      {addDocModalKind && (
        <DocumentModal
          kind={addDocModalKind}
          editDoc={editDocTarget}
          onClose={() => {
            setAddDocModalKind(null);
            setEditDocTarget(undefined);
          }}
          onDone={async () => {
            setAddDocModalKind(null);
            setEditDocTarget(undefined);
            await fetchState();
          }}
        />
      )}

      {showRequestModal && (
        <ApprovalRequestModal
          state={state}
          onClose={() => setShowRequestModal(false)}
          onDone={async () => {
            setShowRequestModal(false);
            await fetchState();
          }}
        />
      )}

      {showDispositionModal && (
        <DispositionModal
          state={state}
          onClose={() => setShowDispositionModal(false)}
          onDone={async () => {
            setShowDispositionModal(false);
            await fetchState();
          }}
        />
      )}

      {viewDocTarget && (
        <DocumentDetailModal
          doc={viewDocTarget}
          state={state}
          onClose={() => setViewDocTarget(null)}
          onRefresh={fetchState}
          onEdit={doc => {
            setViewDocTarget(null);
            setEditDocTarget(doc);
            setAddDocModalKind(doc.kind);
          }}
        />
      )}
    </div>
  );
}
