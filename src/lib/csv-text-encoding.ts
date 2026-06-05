import iconv from "iconv-lite";

/** Prefix exports so Excel on Windows opens/saves as UTF-8. */
export function csvWithUtf8Bom(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, "");
  return `\uFEFF${trimmed}`;
}

/**
 * Decode an uploaded CSV bytes to UTF-8 text.
 * Handles UTF-8 (with/without BOM) and Windows-1252 from Excel "CSV (Comma delimited)".
 */
export function decodeUploadedCsvBytes(buffer: Buffer): string {
  let body = buffer;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    body = buffer.subarray(3);
  }

  const utf8 = body.toString("utf8");
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length;

  // Excel on Windows: degree symbol, en-dash, etc. saved as CP1252 → invalid lone UTF-8 bytes → �
  if (replacementCount > 0) {
    return iconv.decode(body, "win1252");
  }

  // UTF-8 bytes mis-read as Latin-1 somewhere in the pipeline (e.g. â€º instead of ›)
  if (/â€[º›œ™]/.test(utf8) || /Ã./.test(utf8)) {
    try {
      const repaired = Buffer.from(utf8, "latin1").toString("utf8");
      if (!repaired.includes("\uFFFD")) return repaired;
    } catch {
      /* keep utf8 */
    }
  }

  return utf8;
}

export async function readUploadedCsvText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return decodeUploadedCsvBytes(buffer).replace(/^\uFEFF/, "").trimEnd();
}
