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
  const unitQtyOnly = (line) => /^(Nos|RM|Cum|Sft|Job|Mtr|Sqm|Kg|Kgs|Set|Pair|M|MM|Meter|Meters|Litre|Ltr|Ltrs|Ft|Feet|Pcs|Each|mm|cm|in|inch|m2|sqm|sqft|sft|Lot|Bag)\.?\s*([\d,]+\.?\d*)\s*$/i.exec(line);
  const sameLine = (line) => {
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9\-\.]*)\s+(.+?)\s+(Nos|RM|Cum|Sft|Job|Mtr|Sqm|Kg|Kgs|Set|Pair|M|MM|Meter|Meters|Litre|Ltr|Ltrs|Ft|Feet|Pcs|Each|mm|cm|in|inch|m2|sqm|sqft|sft|Lot|Bag)\.?\s*([\d,]+\.?\d*)(?:\s+([\d,]+\.?\d*))?(?:\s+([\d,]+\.?\d*))?\s*$/i);
    if (!m) return null;
    const [, no, desc, unit, qty, rate, amount] = m;
    return { item_no: no.trim(), description: desc.trim(), unit: unit.trim(), qty: String(qty).replace(/,/g, ''), rate: rate ? String(rate).replace(/,/g, '') : undefined, amount: amount ? String(amount).replace(/,/g, '') : undefined };
  };
  const itemStart = (line) => /^([A-Za-z0-9][A-Za-z0-9\-\.]*)\s+/.exec(line);

  for (const line of lines) {
    if (!projectName && /OAKWOOD\s+BUILDING|BUILDING\s+AT\s+KALYAN|^\s*[\w\s]+\s+building\s+[-–]?\s*kalyan/i.test(line)) {
      projectName = line.trim().slice(0, 120);
    }
    if (!projectName) {
      const pm = line.match(/^(.*\b(?:BOQ|Bill\s+of\s+Quantities)\b.*)$/i);
      if (pm) projectName = pm[1].trim().slice(0, 120);
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
        const firstMatch = /^([A-Za-z0-9][A-Za-z0-9\-\.]*)\s+/.exec(desc);
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
      items.push({ item_no: sl.item_no, description: sl.description, unit: sl.unit, quantity: sl.qty, category, rate: sl.rate, amount: sl.amount });
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

  if (items.length === 0) {
    const alt = altParse(lines);
    if (alt.items.length) {
      return { items: alt.items, projectName: projectName || alt.projectName || '' };
    }
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
    const rateNum = it.rate != null ? parseFloat(it.rate) || 0 : 0;
    const amountNum = it.amount != null ? parseFloat(it.amount) || 0 : 0;
    return {
      id: baseId + i + 1,
      category: it.category || 'General',
      code: it.item_no ? `BOQ-${it.item_no}` : `BOQ-${i + 1}`,
      description: it.description || '',
      unit: it.unit || 'Nos',
      quantity: qty,
      rate: rateNum,
      amount: amountNum || (rateNum * qty) || 0,
      floor: 'All',
    };
  });
}

function altParse(lines) {
  /** @type {BOQItem[]} */
  const items = [];
  let projectName = '';
  const unitTokens = /(Nos|RM|Cum|Sft|Job|Mtr|Sqm|Kg|Kgs|Set|Pair|M|MM|Meter|Meters|Litre|Ltr|Ltrs|Ft|Feet|Pcs|Each|mm|cm|in|inch|m2|sqm|sqft|sft|Lot|Bag|UOM|Unit)/i;
  let currentDesc = '';
  let currentNo = '';
  let currentCategory = 'General';
  let headerMap = null;
  const hdrDesc = /(Description|Item\s*Description|Particulars|Item|Scope)/i;
  const hdrUnit = /(Unit|UOM|Unit\s*of\s*Measurement)/i;
  const hdrQty = /(Qty|Quantity|QTY\.?)/i;
  const hdrRate = /(Rate|Price|Unit\s*Price|Basic\s*Rate|Price\s*per\s*Unit|Cost|Rs\.?|INR|₹)/i;
  const hdrAmt = /(Amount|Total|Line\s*Total|Value|Extended\s*Amount|Total\s*Amount|Amount\s*\(INR\)|Amount\s*Rs\.?|₹)/i;
  const parseNum = (s) => {
    if (s == null) return undefined;
    const m = String(s).match(/[\d]+(?:[\.,]\d+)?/);
    if (!m) return undefined;
    const v = m[0].replace(/,/g, '');
    const n = parseFloat(v);
    return Number.isFinite(n) ? String(n) : undefined;
  };

  for (const line of lines) {
    if (!projectName) {
      const pm = line.match(/(Project|Building|BOQ|Bill\s+of\s+Quantities)\s*[:\-]?\s*(.+)/i);
      if (pm) projectName = pm[2].trim().slice(0, 120);
    }
    const tokens = line.split(/\s{2,}|\t+/).map(t => t.trim()).filter(Boolean);
    if (!headerMap) {
      const headerIdx = tokens.findIndex(t => hdrDesc.test(t));
      const unitIdx = tokens.findIndex(t => hdrUnit.test(t));
      const qtyIdx = tokens.findIndex(t => hdrQty.test(t));
      const rateIdx = tokens.findIndex(t => hdrRate.test(t));
      const amtIdx = tokens.findIndex(t => hdrAmt.test(t));
      if (headerIdx !== -1 && unitIdx !== -1 && qtyIdx !== -1) {
        headerMap = { headerIdx, unitIdx, qtyIdx, rateIdx, amtIdx };
        continue;
      }
    }
    if (tokens.length >= 3) {
      const last = tokens[tokens.length - 1];
      const maybeQty = last.replace(/,/g, '');
      const unitIdx = headerMap ? headerMap.unitIdx : tokens.findIndex(t => unitTokens.test(t));
      const qtyIndex = headerMap ? headerMap.qtyIdx : -1;
      const rateIndex = headerMap ? headerMap.rateIdx : -1;
      const amtIndex = headerMap ? headerMap.amtIdx : -1;
      const qtyMatch = qtyIndex !== -1 && tokens[qtyIndex] ? tokens[qtyIndex].replace(/,/g, '') : maybeQty;
      if (unitIdx > 0 && /^\d+(\.\d+)?$/.test(qtyMatch)) {
        const unit = tokens[unitIdx];
        const qty = qtyMatch;
        const code = tokens[0];
        const descParts = headerMap && headerMap.headerIdx !== -1 ? tokens.slice(headerMap.headerIdx + 1, unitIdx) : tokens.slice(1, unitIdx);
        const rate = rateIndex !== -1 && tokens[rateIndex] ? parseNum(tokens[rateIndex]) : undefined;
        const amount = amtIndex !== -1 && tokens[amtIndex] ? parseNum(tokens[amtIndex]) : undefined;
        const descJoined = [currentDesc, descParts.join(' ')].join(' ').trim();
        items.push({
          item_no: code,
          description: descJoined,
          unit,
          quantity: qty,
          rate,
          amount,
          category: currentCategory,
        });
        currentDesc = '';
        currentNo = '';
        continue;
      }
      if (unitIdx > 0) {
        const unit = tokens[unitIdx];
        const qtyTok = tokens[unitIdx + 1] || tokens[tokens.length - 1];
        const qty = parseNum(qtyTok) || '';
        const code = tokens[0];
        const descParts = tokens.slice(1, unitIdx);
        const rateTok = rateIndex !== -1 ? tokens[rateIndex] : tokens[unitIdx + 2];
        const amtTok = amtIndex !== -1 ? tokens[amtIndex] : tokens[unitIdx + 3];
        const rate = parseNum(rateTok);
        const amount = parseNum(amtTok);
        const descJoined = [currentDesc, descParts.join(' ')].join(' ').trim();
        if (qty) {
          items.push({
            item_no: code,
            description: descJoined,
            unit,
            quantity: qty,
            rate,
            amount,
            category: currentCategory,
          });
          currentDesc = '';
          currentNo = '';
          continue;
        }
      }
    }
    const sec = line.match(/^([A-Z])\.\s+(.+)$/);
    if (sec) {
      currentCategory = sec[2].replace(/\s*\([^)]*\)\s*$/, '').trim().slice(0, 80);
      continue;
    }
    const start = line.match(/^([A-Za-z0-9][A-Za-z0-9\-\.]*)\s+(.+)$/);
    if (start) {
      currentNo = start[1];
      currentDesc = start[2];
      continue;
    }
    if (currentDesc) {
      currentDesc = [currentDesc, line].join(' ').trim();
    }
  }
  return { items, projectName };
}
