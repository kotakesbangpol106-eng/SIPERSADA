import React, { useState, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, HardDrive, CheckCircle2 } from 'lucide-react';
import { SystemState } from '../types.js';
import { formatDate } from '../api.js';
import { subscribeGoogleAuth } from '../googleDriveAuth.js';

interface TopbarProps {
  state: SystemState;
  onOpenMobileMenu: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  staf: 'Staf',
  pejabat: 'Pejabat Penandatangan',
};

export function Topbar({
  state,
  onOpenMobileMenu,
  onNavigate,
  onLogout,
  onMarkNotificationsRead,
}: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);

  useEffect(() => {
    return subscribeGoogleAuth((user, token) => {
      setIsDriveConnected(!!token);
      setDriveEmail(user?.email || null);
    });
  }, []);

  const unreadNotifications = state.notifications.filter(n => !n.read);
  const user = state.me;

  const initials = user
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()
    : 'SP';

  return (
    <header className="topbar">
      <div className="agency">
        <button
          className="icon-button mobile-menu"
          onClick={onOpenMobileMenu}
          aria-label="Buka navigasi"
        >
          <Menu size={24} />
        </button>

        <div className="agency-seal">
          <img
            src="/logo.png"
            width={34}
            height={39}
            alt="Lambang Kota Gorontalo"
            className="object-contain"
          />
        </div>

        <div>
          <strong>BADAN KESATUAN BANGSA DAN POLITIK</strong>
          <small>PEMERINTAH KOTA GORONTALO</small>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Google Drive Cloud Server Status Badge */}
        <button
          onClick={() => onNavigate('pengaturan')}
          title={
            isDriveConnected
              ? `Google Drive Cloud Server: Terhubung (${driveEmail}). Klik untuk mengelola berkas & server.`
              : 'Google Drive Cloud Server: Belum Terhubung. Klik untuk mengaktifkan server Google Drive.'
          }
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all border ${
            isDriveConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-xs'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <HardDrive size={14} className={isDriveConnected ? 'text-emerald-600' : 'text-amber-600'} />
          <span className="font-semibold">
            {isDriveConnected ? 'Drive Server Aktif' : 'Hubungkan Drive Server'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isDriveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>

        <span className={`connection ${user ? 'connected' : ''}`}>
          <i />
          {user ? 'Sesi aktif' : 'Ruang kerja digital'}
        </span>

        <div className="notification-wrap">
          <button
            className="icon-button bell"
            aria-label="Notifikasi"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadNotifications.length > 0 && <i />}
          </button>

          {showNotifications && (
            <div className="notification-pop">
              <strong>Notifikasi</strong>
              {state.notifications.length > 0 ? (
                state.notifications.slice(0, 8).map(n => (
                  <p key={n.id}>
                    {n.title}
                    <small>{formatDate(n.createdAt)}</small>
                  </p>
                ))
              ) : (
                <p>Belum ada notifikasi baru.</p>
              )}

              {state.notifications.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => {
                    onMarkNotificationsRead();
                    setShowNotifications(false);
                  }}
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
          )}
        </div>

        <span className="topbar-divider" />

        <a
          href={user ? '/pengaturan' : '/login'}
          className="user-profile"
          onClick={e => {
            e.preventDefault();
            onNavigate(user ? 'pengaturan' : 'login');
          }}
        >
          <span className="avatar">{initials}</span>
          <span>
            <strong>{user?.name || 'Selamat datang'}</strong>
            <small>{user ? ROLE_LABELS[user.role] : 'Masuk ke akun Anda'}</small>
          </span>
          <ChevronDown size={15} />
        </a>

        {user && (
          <button
            className="icon-button logout"
            aria-label="Keluar"
            title="Keluar dari sesi"
            onClick={onLogout}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
