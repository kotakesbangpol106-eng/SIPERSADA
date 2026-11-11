const DRIVE_FOLDER_NAME = 'SIPERSADA Kesbangpol Kota Gorontalo';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Helper to ensure the main folder exists in user's Google Drive.
 */
export async function getOrCreateSipersadaFolder(
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  const query = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Gagal mengakses Google Drive: ${errText}`);
  }

  const searchData = (await searchRes.json()) as { files?: DriveFile[] };
  if (searchData.files && searchData.files.length > 0) {
    return {
      id: searchData.files[0].id,
      webViewLink: searchData.files[0].webViewLink || `https://drive.google.com/drive/folders/${searchData.files[0].id}`,
    };
  }

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Penyimpanan dan cadangan database SIPERSADA Kota Gorontalo',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat folder di Google Drive: ${errText}`);
  }

  const folder = (await createRes.json()) as DriveFile;
  return {
    id: folder.id,
    webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
  };
}

/**
 * Upload any text/json/html/buffer file to Google Drive (Multipart upload)
 */
export async function uploadFileToDrive(
  accessToken: string,
  params: {
    name: string;
    mimeType: string;
    content: string | Buffer;
    folderId?: string;
  }
): Promise<{ id: string; name: string; webViewLink: string; size?: string; createdTime?: string }> {
  const boundary = `-------314159265358979323846`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: params.name,
    mimeType: params.mimeType,
  };
  if (params.folderId) {
    metadata.parents = [params.folderId];
  }

  const contentBuffer = typeof params.content === 'string'
    ? Buffer.from(params.content, 'utf-8')
    : params.content;

  const multipartHeader =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${params.mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n';

  const multipartFooter = closeDelimiter;

  const bodyBuffer = Buffer.concat([
    Buffer.from(multipartHeader, 'utf-8'),
    Buffer.from(contentBuffer.toString('base64'), 'utf-8'),
    Buffer.from(multipartFooter, 'utf-8'),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(bodyBuffer.length),
      },
      body: bodyBuffer,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal mengunggah file ke Google Drive: ${errText}`);
  }

  const file = (await uploadRes.json()) as DriveFile;
  return {
    id: file.id,
    name: file.name,
    webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    size: file.size,
    createdTime: file.createdTime,
  };
}

/**
 * List files inside the SIPERSADA folder on user's Google Drive.
 */
export async function listDriveFolderFiles(
  accessToken: string,
  folderId: string
): Promise<Array<DriveFile & { formattedSize: string }>> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)&orderBy=createdTime desc&pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mengambil daftar file di Google Drive: ${err}`);
  }

  const data = (await res.json()) as { files?: DriveFile[] };
  const files = data.files || [];

  return files.map(f => {
    const bytes = Number(f.size || 0);
    const formattedSize =
      bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : bytes > 1024
        ? `${(bytes / 1024).toFixed(0)} KB`
        : `${bytes} B`;

    return {
      ...f,
      formattedSize,
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    };
  });
}

/**
 * Download file content (e.g. database JSON backup) from Google Drive.
 */
export async function downloadFileFromDrive(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mengunduh file cadangan dari Google Drive: ${err}`);
  }

  return await res.text();
}

/**
 * Delete a file in Google Drive
 */
export async function deleteFileFromDrive(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Gagal menghapus file dari Google Drive: ${err}`);
  }

  return true;
}
