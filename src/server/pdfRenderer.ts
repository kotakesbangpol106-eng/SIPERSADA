import QRCode from 'qrcode';
import { DocumentItem, ApprovalItem, VerificationItem } from './db.js';

export async function generateDocumentHtml(
  doc: DocumentItem,
  approval?: ApprovalItem,
  verification?: VerificationItem,
  hostUrl: string = ''
): Promise<string> {
  let qrDataUrl = '';
  if (verification?.token) {
    try {
      const verifyUrl = `${hostUrl || ''}/verifikasi/${verification.token}`;
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#163452',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.error('Error generating QR:', e);
    }
  }

  const dateFormatted = new Date(doc.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const approvalDateFormatted = approval?.approvedAt
    ? new Date(approval.approvedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${doc.number} - ${doc.subject}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 20mm 20mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
      font-size: 12pt;
    }
    .kop-surat {
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 3px double #000;
      padding-bottom: 14px;
      margin-bottom: 24px;
      position: relative;
    }
    .logo-container {
      position: absolute;
      left: 10px;
      top: 0;
    }
    .logo-img {
      width: 78px;
      height: auto;
    }
    .kop-text {
      text-align: center;
      width: 100%;
    }
    .kop-text h2 {
      margin: 0;
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .kop-text h1 {
      margin: 2px 0;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .kop-text p {
      margin: 0;
      font-size: 9.5pt;
    }
    .meta-table {
      width: 100%;
      margin-bottom: 24px;
      border-collapse: collapse;
    }
    .meta-table td {
      vertical-align: top;
      padding: 3px 0;
      font-size: 11pt;
    }
    .content-body {
      text-align: justify;
      text-indent: 40px;
      margin-top: 20px;
      margin-bottom: 30px;
      font-size: 11pt;
      line-height: 1.6;
    }
    .signature-area {
      margin-top: 40px;
      display: flex;
      justify-content: flex-end;
    }
    .signature-box {
      width: 280px;
      text-align: center;
      font-size: 11pt;
    }
    .qr-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 15px auto;
      padding: 8px;
      border: 1px dashed #7a889b;
      border-radius: 8px;
      background: #f8fafc;
      width: 150px;
    }
    .qr-badge img {
      width: 110px;
      height: 110px;
    }
    .qr-badge small {
      font-size: 8pt;
      color: #334155;
      margin-top: 4px;
      text-align: center;
      line-height: 1.2;
    }
    .security-watermark {
      margin-top: 50px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #163452;
      color: #fff;
      padding: 10px 18px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-weight: bold;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    @media print {
      .btn-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>

  <div class="kop-surat">
    <div class="logo-container">
      <img src="/img/logo-gorontalo.png" alt="Lambang Kota Gorontalo" class="logo-img" />
    </div>
    <div class="kop-text">
      <h2>PEMERINTAH KOTA GORONTALO</h2>
      <h1>BADAN KESATUAN BANGSA DAN POLITIK</h1>
      <p>Jalan Sultan Botutihe No. 12, Kel. Ipilo, Kec. Kota Timur, Kota Gorontalo 96115</p>
      <p>Pos-el: kesbangpol@gorontalokota.go.id · Laman: kesbangpol.gorontalokota.go.id</p>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td style="width: 90px;">Nomor</td>
      <td style="width: 15px;">:</td>
      <td style="width: 320px;"><strong>${doc.number}</strong></td>
      <td style="text-align: right;">Gorontalo, ${dateFormatted}</td>
    </tr>
    <tr>
      <td>Sifat</td>
      <td>:</td>
      <td>${doc.urgency} / ${doc.classification}</td>
      <td></td>
    </tr>
    <tr>
      <td>Lampiran</td>
      <td>:</td>
      <td>1 (satu) Berkas</td>
      <td>Kepada Yth.</td>
    </tr>
    <tr>
      <td>Perihal</td>
      <td>:</td>
      <td><strong>${doc.subject}</strong></td>
      <td style="font-weight: bold;">${doc.correspondent}</td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td></td>
      <td>di - <br/>&nbsp;&nbsp;&nbsp;&nbsp;<u>Tempat</u></td>
    </tr>
  </table>

  <div class="content-body">
    <p>
      Sehubungan dengan pelaksanaan program kegiatan penyelenggaraan urusan kesatuan bangsa dan politik di lingkungan Pemerintah Kota Gorontalo, dengan ini disampaikan perihal <strong>${doc.subject}</strong> sebagaimana permohonan yang telah diverifikasi dan dicatat pada Sistem Informasi Persuratan Digital (SIPERSADA).
    </p>
    <p>
      ${doc.notes || 'Seluruh data dan ketentuan administrasi yang tercantum telah diperiksa sesuai dengan prosedur operasional standar tata naskah dinas di lingkungan Badan Kesatuan Bangsa dan Politik Kota Gorontalo.'}
    </p>
    <p>
      Demikian surat ini disampaikan untuk menjadi perhatian dan digunakan sebagaimana mestinya. Atas perhatian dan kerja samanya diucapkan terima kasih.
    </p>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <p style="margin-bottom: 4px;"><strong>${approval?.approvedPosition || 'Kepala Badan Kesatuan Bangsa dan Politik'}</strong></p>
      <p style="margin: 0; font-size: 10pt; color: #475569;">Kota Gorontalo</p>

      ${
        qrDataUrl
          ? `<div class="qr-badge">
               <img src="${qrDataUrl}" alt="QR Verifikasi Internal" />
               <small><strong>DITANDATANGANI SECARA DIGITAL</strong><br/>SIPERSADA KOTA GORONTALO<br/>Token: ${verification?.token}</small>
             </div>`
          : `<div style="height: 80px;"></div>`
      }

      <p style="margin-top: 6px; font-weight: bold; text-decoration: underline;">
        ${approval?.approvedName || 'Dr. H. Iskandar Usman, M.Si'}
      </p>
      <p style="margin: 0; font-size: 10pt;">Pembina Utama Muda (IV/c)</p>
      <p style="margin: 0; font-size: 10pt;">NIP. 19740512 199903 1 004</p>
    </div>
  </div>

  <div class="security-watermark">
    <span>SIPERSADA v1.0 · Sistem Informasi Persuratan Digital Kesbangpol Kota Gorontalo</span>
    <span>Hash SHA-256: ${doc.fileHash.slice(0, 16)}...</span>
  </div>
</body>
</html>`;
}
