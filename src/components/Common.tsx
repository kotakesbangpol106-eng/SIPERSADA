import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand-dark' : ''}`}>
      <div className="brand-mark p-1 overflow-hidden bg-white/10 border border-amber-400/40 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Lambang Kota Gorontalo"
          className="w-full h-full object-contain filter drop-shadow-xs"
        />
      </div>
      <div>
        <strong>
          SIPERSADA<span className="brand-dot">.</span>
        </strong>
        <small>SISTEM INFORMASI PERSURATAN DIGITAL</small>
      </div>
    </div>
  );
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  const text = String(children || '');
  let colorClass = 'gray';

  if (text === 'DISETUJUI' || text === 'SELESAI' || text === 'DOKUMEN TERVERIFIKASI') {
    colorClass = 'green';
  } else if (text === 'DITOLAK' || text === 'DIBATALKAN' || text === 'DOKUMEN TIDAK VALID') {
    colorClass = 'red';
  } else if (text.includes('MENUNGGU') || text === 'DALAM PROSES' || text === 'BARU') {
    colorClass = 'gold';
  }

  return (
    <span className={`status ${colorClass}`}>
      <i />
      {children}
    </span>
  );
}

export function EmptyState({
  title = 'Belum ada data',
  text = 'Data yang Anda tambahkan akan tampil di sini.',
  icon: Icon = ShieldCheck,
  action,
}: {
  title?: string;
  text?: string;
  icon?: any;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Icon size={26} />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function FormField({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
