import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Send,
  FileSignature,
  BadgeCheck,
  GitPullRequest,
  Archive,
  ChartNoAxesCombined,
  Users,
  Settings,
  ShieldCheck,
  HelpCircle,
  ArrowUpRight,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Brand } from './Common.js';
import { SystemState } from '../types.js';

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  state: SystemState;
}

export const NAV_GROUPS = [
  {
    section: 'MENU UTAMA',
    items: [{ path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'PERSURATAN',
    items: [
      { path: 'surat-masuk', label: 'Surat Masuk', icon: Inbox },
      { path: 'surat-keluar', label: 'Surat Keluar', icon: Send },
      { path: 'permohonan-persetujuan', label: 'Permohonan Persetujuan', icon: FileSignature },
      { path: 'persetujuan', label: 'Persetujuan Pejabat', icon: BadgeCheck },
      { path: 'disposisi', label: 'Disposisi', icon: GitPullRequest },
      { path: 'arsip', label: 'Arsip Digital', icon: Archive },
    ],
  },
  {
    section: 'ADMINISTRASI',
    items: [
      { path: 'laporan', label: 'Laporan', icon: ChartNoAxesCombined },
      { path: 'pengguna', label: 'Manajemen Pengguna', icon: Users },
      { path: 'pengaturan', label: 'Pengaturan', icon: Settings },
    ],
  },
];

export const NAV_TITLES: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap(g => g.items.map(i => [i.path, i.label]))
);

export function Sidebar({ currentPath, isOpen, onClose, onNavigate, state }: SidebarProps) {
  const pendingApprovalsCount = state.approvals.filter(
    a => a.status === 'MENUNGGU PERSETUJUAN'
  ).length;

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <a
          href="/dashboard"
          className="brand-link"
          onClick={e => handleLinkClick(e, 'dashboard')}
        >
          <Brand />
        </a>

        <div className="workspace-label">
          <span className="workspace-icon">
            <Building2 size={17} />
          </span>
          <span>
            Kesbangpol Kota Gorontalo
            <small>Ruang kerja instansi</small>
          </span>
          <ChevronDown size={14} />
        </div>

        <nav id="navigasi-utama" aria-label="Navigasi utama">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(
              item => item.path !== 'pengguna' || !state.me || state.me.role === 'admin'
            );

            return (
              <div key={group.section} className="nav-group">
                <div className="nav-label">{group.section}</div>
                {visibleItems.map(item => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.path}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      href={`/${item.path}`}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={e => handleLinkClick(e, item.path)}
                    >
                      <Icon size={19} />
                      <span>{item.label}</span>
                      {item.path === 'persetujuan' && pendingApprovalsCount > 0 && (
                        <b>{pendingApprovalsCount}</b>
                      )}
                      {isActive && <span className="active-dot" />}
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-box">
            <ShieldCheck size={24} />
            <div>
              <strong>Persuratan lebih terpercaya</strong>
              <p>
                Persetujuan internal &amp; verifikasi
                <br />
                dokumen dalam satu sistem.
              </p>
            </div>
            <span className="secure-caption">
              <i /> Terlindungi &amp; tercatat
            </span>
          </div>

          <a
            className="help-link"
            href="/pengaturan"
            onClick={e => handleLinkClick(e, 'pengaturan')}
          >
            <HelpCircle size={18} /> Pusat Bantuan <ArrowUpRight size={15} />
          </a>

          <div className="sidebar-foot">
            SIPERSADA <span>v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
