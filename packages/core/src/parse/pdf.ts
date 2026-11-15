/** Marks the end of a PDF page in the line list. */
export const PAGE_BREAK = '\f';

/** The parts of a pdf.js text item the line builder needs. */
export interface TextItem { str: string; transform: number[]; width?: number }

/**
 * Rebuilds readable lines from pdf.js text items, page by page.
 * - Items on (nearly) the same baseline form one line, ordered left to right.
 * - Wide gaps become three spaces so columns stay apart.
 * - Identical text drawn again at the same spot is dropped: some banks (HBL) draw every
 *   word many times on top of itself, which otherwise reads as "SSSeeeppp".
 */
export function textItemsToLines(pages: TextItem[][]): string[] {
  const lines: string[] = [];
  for (const items of pages) {
    const rows: { y: number; items: { x: number; s: string; w: number }[] }[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      const key = `${it.str}|${Math.round(x * 2)}|${Math.round(y * 2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, s: it.str, w: it.width || 0 });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let line = '';
      let lastEnd: number | null = null;
      for (const it of r.items) {
        if (lastEnd != null) line += it.x - lastEnd > 12 ? '   ' : it.x - lastEnd > 1 ? ' ' : '';
        line += it.s;
        lastEnd = Math.max(lastEnd ?? 0, it.x + it.w);
      }
      lines.push(line.trim());
    }
    lines.push(PAGE_BREAK);
  }
  return lines;
}
