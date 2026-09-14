/** تصدير بيانات حقيقية إلى CSV/TSV مع تحييد حقن الصيغ. */
import { safeCsvCell } from "@shared/audit";

export function downloadRows(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  separator: "," | "\t" = ","
): void {
  const lines = [
    headers.map(safeCsvCell).join(separator),
    ...rows.map(row => row.map(safeCsvCell).join(separator)),
  ];
  const blob = new Blob(["\uFEFF", `${lines.join("\n")}\n`], {
    type: separator === "\t"
      ? "text/tab-separated-values;charset=utf-8"
      : "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
