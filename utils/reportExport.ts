import * as XLSX from "xlsx";

type ReportRow = Record<string, unknown>;

const escapeCsvValue = (value: unknown) => {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
};

export const downloadReportAsCsv = (rows: ReportRow[], fileName: string) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(","),
    ),
  ].join("\r\n");

  const blob = new Blob([`\ufeff${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadReportAsXlsx = (rows: ReportRow[], fileName: string) => {
  if (!rows.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, fileName, { compression: true });
};
