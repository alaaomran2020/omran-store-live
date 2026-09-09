// @ts-expect-error -- vendored MIT ESM; upstream declarations are kept beside it.
import qrcode from "@/vendor/qrcode-generator.mjs";

export const VIP_QR_PREFIX = "OMRAN-VIP:";

export function normalizeCardSerial(value: string): string | null {
  const serial = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{5,39}$/.test(serial) ? serial : null;
}

export function createVipQrMatrix(serialInput: string): {
  serial: string;
  payload: string;
  modules: boolean[][];
} | null {
  const serial = normalizeCardSerial(serialInput);
  if (!serial) return null;

  const payload = `${VIP_QR_PREFIX}${serial}`;
  const qr = qrcode(0, "M");
  qr.addData(payload, "Byte");
  qr.make();

  const size = qr.getModuleCount();
  const modules = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => qr.isDark(row, column))
  );

  return { serial, payload, modules };
}

export function createVipQrSvg(serialInput: string): string | null {
  const result = createVipQrMatrix(serialInput);
  if (!result) return null;

  const quietZone = 4;
  const size = result.modules.length + quietZone * 2;
  const darkModules = result.modules
    .flatMap((row, rowIndex) =>
      row.map((dark, columnIndex) =>
        dark
          ? `<rect x="${columnIndex + quietZone}" y="${rowIndex + quietZone}" width="1" height="1"/>`
          : ""
      )
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${darkModules}</g></svg>`;
}
