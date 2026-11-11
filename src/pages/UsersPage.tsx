import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { SystemState, UserProfile } from '../types.js';
import { Panel, EmptyState } from '../components/Common.js';
import { UserModal, AppDialog } from '../components/Modals.js';
import { apiCall, formatDate, toast } from '../api.js';

interface UsersPageProps {
  state: SystemState;
  onRefresh: () => void;
}

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-800' },
  pejabat: { label: 'Pejabat Penandatangan', color: 'bg-blue-100 text-blue-800' },
  staf: { label: 'Staf', color: 'bg-gray-100 text-gray-700' },
};

export function UsersPage({ state, onRefresh }: UsersPageProps) {
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<UserProfile | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);

  // Single user deletion state
  const [deleteCandidate, setDeleteCandidate] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset all users state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const currentUser = state.me;

  const filteredUsers = state.profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q)
    );
  });

  const handleDeleteUser = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await apiCall(`user/${deleteCandidate.id}`, undefined, 'DELETE');
      toast.success(`Akun ${deleteCandidate.name} berhasil dihapus.`);
      setDeleteCandidate(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus akun pengguna.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetAllUsers = async () => {
    setResetting(true);
    try {
      await apiCall('reset-users', {}, 'POST');
      toast.success('Seluruh data akun pengguna berhasil direset!');
      setShowResetConfirm(false);
      // Reload page to return to first-admin registration
      window.location.href = '/login';
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset data akun.');
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Toolbar */}
      <div className="module-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="input-icon flex-1 min-w-[260px] max-w-md">
          <Search size={17} />
          <input
            placeholder="Cari nama, email, unit kerja, atau jabatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="button secondary text-red-700 border-red-200 hover:bg-red-50"
            title="Reset seluruh akun dan mulai lagi dari administrator pertama"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw size={16} /> Reset Semua Pengguna
          </button>

          <button
            className="button primary"
            onClick={() => {
              setEditTarget(undefined);
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Main Table */}
      <Panel
        title="Pengguna SIPERSADA"
        description="Administrator utama berwenang penuh untuk menambah, mengedit profil/password, serta menghapus akun pengguna."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Email Instansi</th>
                <th>Unit Kerja &amp; Jabatan</th>
                <th>Peran</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(profile => {
                const roleMeta = ROLE_DISPLAY[profile.role] || {
                  label: profile.role,
                  color: 'bg-gray-100 text-gray-700',
                };
                const isCurrentSelf = currentUser?.id === profile.id;

                return (
                  <tr key={profile.id} className={isCurrentSelf ? 'bg-amber-50/30' : undefined}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-[#163452] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {profile.name
                            .split(' ')
                            .slice(0, 2)
                            .map(w => w[0])
                            .join('')}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="block text-sm text-[#163452]">
                              {profile.name}
                            </strong>
                            {isCurrentSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Akun Anda
                              </span>
                            )}
                          </div>
                          {profile.createdAt && (
                            <small className="text-gray-400">
                              Terdaftar: {formatDate(profile.createdAt)}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-gray-700">
                        {profile.email}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-gray-800 block">
                        {profile.unit}
                      </span>
                      <small className="text-gray-500 block">{profile.position}</small>
                    </td>
                    <td>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleMeta.color}`}
                      >
                        {roleMeta.label}
                      </span>
                    </td>
                    <td>
                      {profile.active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <UserCheck size={14} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <UserX size={14} /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="table-action p-1.5 text-gray-600 hover:text-[#193b63] hover:bg-gray-100 rounded"
                          title="Edit profil atau password"
                          onClick={() => {
                            setEditTarget(profile);
                            setShowAddModal(true);
                          }}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className={`table-action p-1.5 rounded transition-colors ${
                            isCurrentSelf
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                          }`}
                          title={
                            isCurrentSelf
                              ? 'Anda tidak dapat menghapus akun Anda sendiri'
                              : 'Hapus akun pengguna'
                          }
                          disabled={isCurrentSelf}
                          onClick={() => {
                            if (!isCurrentSelf) {
                              setDeleteCandidate(profile);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <EmptyState
              title="Pengguna tidak ditemukan"
              text="Belum ada data pengguna terdaftar atau tidak sesuai dengan kata kunci pencarian Anda."
              icon={Users}
            />
          )}
        </div>
      </Panel>

      {/* User Modal (Add / Edit) */}
      {showAddModal && (
        <UserModal
          editUser={editTarget}
          onClose={() => {
            setShowAddModal(false);
            setEditTarget(undefined);
          }}
          onDone={() => {
            setShowAddModal(false);
            setEditTarget(undefined);
            onRefresh();
          }}
        />
      )}

      {/* Delete User Confirmation Modal */}
      {deleteCandidate && (
        <AppDialog
          title="Konfirmasi Hapus Akun"
          description="Tindakan ini tidak dapat dibatalkan."
          onClose={() => setDeleteCandidate(null)}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-900">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold">
                  Apakah Anda yakin ingin menghapus akun pengguna ini?
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Akun atas nama <strong>{deleteCandidate.name}</strong> ({deleteCandidate.email}) akan dihapus secara permanen dari basis data sistem SIPERSADA.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded border text-xs space-y-1">
              <div><strong>Nama:</strong> {deleteCandidate.name}</div>
              <div><strong>Email:</strong> {deleteCandidate.email}</div>
              <div><strong>Unit Kerja:</strong> {deleteCandidate.unit}</div>
              <div><strong>Peran:</strong> {deleteCandidate.role.toUpperCase()}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="button primary bg-red-600 hover:bg-red-700 text-white border-transparent"
                onClick={handleDeleteUser}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </AppDialog>
      )}

      {/* Reset All Users Confirmation Modal */}
      {showResetConfirm && (
        <AppDialog
          title="Reset Seluruh Akun Pengguna"
          description="Inisialisasi ulang basis data pengguna sistem"
          onClose={() => setShowResetConfirm(false)}
        >
          <div className="space-y-4 text-sm">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold">
                  Perhatian: Seluruh akun pengguna akan dihapus!
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Sistem akan dikembalikan ke kondisi awal (zero-users). Siapapun yang mendaftar pertama kali di halaman login akan secara otomatis menjadi <strong>Administrator Utama</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              Setelah reset dilakukan, sesi Anda akan diakhiri dan dialihkan ke formulir pendaftaran Administrator Utama pertama.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
              >
                Batal
              </button>
              <button
                type="button"
                className="button primary bg-red-600 hover:bg-red-700 text-white border-transparent"
                onClick={handleResetAllUsers}
                disabled={resetting}
              >
                {resetting ? 'Mereset...' : 'Ya, Reset Semua Pengguna'}
              </button>
            </div>
          </div>
        </AppDialog>
      )}
    </div>
  );
}
