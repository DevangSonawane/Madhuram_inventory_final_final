/**
 * Extract BOQ line items from raw PDF text (e.g. Oakwood PHE BOQ style).
 * Handles section headers (A.–G.), main items (description then unit+qty on next line),
 * sub-items (item_no + description + unit + qty on one line). All fields optional.
 */

/** @typedef {{ item_no: string, description: string, unit: string, quantity: string, category: string }} BOQItem */

/**
 * @param {string} rawText
 * @returns {{ items: BOQItem[], projectName: string }}
 */
export function extractBOQFromText(rawText) {
  const items = /** @type {BOQItem[]} */ ([]);
  let projectName = '';
  let category = '';
  /** @type {string[]} */
  let buffer = [];

  if (!rawText || typeof rawText !== 'string') return { items, projectName };

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const skip = (line) => {
    if (!line) return true;
    if (/^OAKWOOD\s+BUILDING|^Item\s*$|^Nos\.\s*Description|^Page\s+No\.|^--\s+\d+\s+of\s+\d+|^SCHEDULE\s+OF\s+QUANTITIES/i.test(line)) return true;
    if (/^Note:\s*$|^[ivxIVX]+\.\s|^[A-Z]\)\s/.test(line)) return true;
    if (/^TOTAL\s*:\s*["']?[A-G]["']?\s*CARRIED\s+TO\s+SUMMARY/i.test(line)) return true;
    if (/^Description\s+Unit\s+(Qty|Total|Tower)/i.test(line)) return true;
    return false;
  };

  const sectionMatch = (line) => /^([A-G])\.\s+(.+)$/.exec(line);
  const unitQtyOnly = (line) => /^(Nos|RM|Cum|Sft|Job|Mtr|Sqm)\.?\s*([\d,]+\.?\d*)\s*$/i.exec(line);
  const sameLine = (line) => {
    const m = line.match(/^(\d+(?:\.\d+)*)\s+(.+?)\s+(Nos|RM|Cum|Sft|Job|Mtr|Sqm)\.?\s*([\d,]+\.?\d*)\s*$/i);
    if (!m) return null;
    const [, no, desc, unit, qty] = m;
    return { item_no: no.trim(), description: desc.trim(), unit: unit.trim(), qty: String(qty).replace(/,/g, '') };
  };
  const itemStart = (line) => /^(\d+(?:\.\d+)*)\s+/.exec(line);

  for (const line of lines) {
    if (!projectName && /OAKWOOD\s+BUILDING|BUILDING\s+AT\s+KALYAN|^\s*[\w\s]+\s+building\s+[-–]?\s*kalyan/i.test(line)) {
      projectName = line.trim().slice(0, 120);
    }
    if (skip(line)) continue;

    const sec = sectionMatch(line);
    if (sec) {
      flush();
      category = sec[2].replace(/\s*\([^)]*\)\s*$/, '').trim().slice(0, 80);
      continue;
    }

    const uq = unitQtyOnly(line);
    if (uq) {
      if (buffer.length) {
        let desc = buffer.join(' ').trim().slice(0, 1000);
        let itemNo = '';
        const firstMatch = /^(\d+(?:\.\d+)*)\s+/.exec(desc);
        if (firstMatch) {
          itemNo = firstMatch[1];
          desc = desc.slice(firstMatch[0].length).trim();
        }
        if (desc) items.push({ item_no: itemNo, description: desc, unit: uq[1], quantity: uq[2].replace(/,/g, ''), category });
        buffer = [];
      }
      continue;
    }

    const sl = sameLine(line);
    if (sl) {
      flush();
      items.push({ item_no: sl.item_no, description: sl.description, unit: sl.unit, quantity: sl.qty, category });
      continue;
    }

    if (itemStart(line)) {
      flush();
      buffer = [line];
      continue;
    }

    if (buffer.length) buffer.push(line);
  }
  flush();

  function flush() {
    buffer = [];
  }

  return { items, projectName };
}

/**
 * Map extracted BOQ items to BOQ table row shape.
 * @param {BOQItem[]} extracted
 * @param {number} baseId
 * @returns {{ id: number, category: string, code: string, description: string, unit: string, quantity: number, rate: number, amount: number, floor: string }[]}
 */
export function mapBOQItemsToTable(extracted, baseId = 0) {
  return extracted.map((it, i) => {
    const qty = parseFloat(it.quantity) || 0;
    return {
      id: baseId + i + 1,
      category: it.category || 'General',
      code: it.item_no ? `BOQ-${it.item_no}` : `BOQ-${i + 1}`,
      description: it.description || '',
      unit: it.unit || 'Nos',
      quantity: qty,
      rate: 0,
      amount: 0,
      floor: 'All',
    };
  });
}
