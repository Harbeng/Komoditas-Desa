// Fungsi untuk mengunduh data menjadi file CSV (Kompatibel penuh dengan MS Excel)
export const exportToCSV = ({ filename, headers, rows }) => {
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Gunakan pemisah titik koma (;) agar otomatis terpisah per kolom di Excel regional Indonesia
  const csvContent = [
    headers.map(escapeCSV).join(';'),
    ...rows.map((row) => row.map(escapeCSV).join(';')),
  ].join('\r\n');

  // Tambahkan BOM (\uFEFF) agar karakter khusus dan UTF-8 terbaca rapi oleh Excel
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Fungsi untuk mengunduh data menjadi file Microsoft Excel (.xls) dengan tabel rapi
export const exportToExcel = ({ filename, title, subtitle, headers, rows }) => {
  const escapeHTML = (val) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const tableHeaders = headers
    .map(
      (h) =>
        `<th style="background-color:#4f46e5;color:#ffffff;font-weight:bold;padding:8px;border:1px solid #cbd5e1;text-align:left;">${escapeHTML(
          h
        )}</th>`
    )
    .join('');

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHTML(
                cell
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  const htmlTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Data Komoditas</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table>
          <tr>
            <td colspan="${headers.length}" style="font-size:16px;font-weight:bold;padding:4px 0;">
              ${escapeHTML(title || 'Laporan Sistem Komoditas Desa')}
            </td>
          </tr>
          ${
            subtitle
              ? `<tr><td colspan="${headers.length}" style="font-size:12px;color:#475569;padding-bottom:10px;">${escapeHTML(
                  subtitle
                )}</td></tr>`
              : ''
          }
          <tr><td colspan="${headers.length}"></td></tr>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + htmlTemplate], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};