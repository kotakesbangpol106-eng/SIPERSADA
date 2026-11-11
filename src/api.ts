import { getGoogleAccessToken } from './googleDriveAuth.js';

export async function apiCall<T = any>(
  endpoint: string,
  body?: any,
  method: string = 'POST',
  customHeaders?: Record<string, string>
): Promise<T> {
  const isFormData = body instanceof FormData;
  const isBodyLess = method === 'GET' || (body === undefined && method === 'DELETE');

  const headers: Record<string, string> = {
    ...(isFormData || isBodyLess ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders || {}),
  };

  const res = await fetch(`/api/sipersada/${endpoint}`, {
    method,
    credentials: 'same-origin',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: isBodyLess ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({
    error: 'Layanan belum tersedia. Pastikan server backend sedang berjalan.',
  }));

  if (!res.ok || data.error) {
    throw new Error(data.error || 'Permintaan gagal. Silakan coba lagi.');
  }

  return data as T;
}

export async function gdriveApiCall<T = any>(
  endpoint: string,
  body?: any,
  method: string = 'POST'
): Promise<T> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Akun Google Drive belum terhubung. Silakan hubungkan akun Google Anda terlebih dahulu.');
  }
  return apiCall<T>(`gdrive/${endpoint}`, body, method, {
    Authorization: `Bearer ${token}`,
  });
}

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// Toast notification events
type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

const listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toastQueue: ToastMessage[] = [];

export const toast = {
  subscribe(fn: (toasts: ToastMessage[]) => void) {
    listeners.push(fn);
    fn(toastQueue);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
  show(text: string, type: ToastType = 'info') {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, text };
    toastQueue = [...toastQueue, newToast];
    listeners.forEach(fn => fn(toastQueue));

    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      listeners.forEach(fn => fn(toastQueue));
    }, 4000);
  },
  success(text: string) {
    this.show(text, 'success');
  },
  info(text: string) {
    this.show(text, 'info');
  },
  error(text: string) {
    this.show(text, 'error');
  },
};
