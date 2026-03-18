import React from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import "luckysheet/dist/plugins/css/pluginsCss.css";
import "luckysheet/dist/plugins/plugins.css";
import "luckysheet/dist/css/luckysheet.css";

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

const sanitizeSheetName = (rawName, usedNames) => {
  const base = String(rawName || "Sheet")
    .trim()
    .replace(/[\[\]\*\/\\\?\:]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^'+|'+$/g, "")
    .slice(0, 31) || "Sheet";

  let name = base;
  let counter = 2;
  while (usedNames.has(name)) {
    const suffix = `_${counter}`;
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    counter += 1;
  }
  usedNames.add(name);
  return name;
};

const inferCellType = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return "n";
  if (typeof value === "boolean") return "b";
  if (value == null) return "g";
  return "g";
};

const toLuckyCell = (value) => {
  const t = inferCellType(value);
  if (value == null) {
    return { m: "", v: null, ct: { fa: "General", t: "g" } };
  }
  return { m: String(value), v: value, ct: { fa: "General", t } };
};

const toLuckyFormulaCell = (formula) => {
  const normalized = String(formula || "").trim();
  const f = normalized.startsWith("=") ? normalized : `=${normalized}`;
  return { m: "", v: null, f, ct: { fa: "General", t: "g" } };
};

const safeStringify = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const flattenRecord = (record, { maxDepth = 2, excludeKeys = new Set(), prefix = "" } = {}, depth = 0, out = {}) => {
  if (!isPlainObject(record)) return out;

  Object.keys(record).forEach((key) => {
    if (excludeKeys.has(key)) return;
    const nextKey = prefix ? `${prefix}.${key}` : key;
    const value = record[key];

    if (value == null) {
      out[nextKey] = null;
      return;
    }

    if (isPlainObject(value) && depth < maxDepth) {
      flattenRecord(value, { maxDepth, excludeKeys, prefix: nextKey }, depth + 1, out);
      return;
    }

    if (Array.isArray(value)) {
      out[nextKey] = safeStringify(value);
      return;
    }

    out[nextKey] = value;
  });

  return out;
};

const orderedHeadersFromRows = (rows) => {
  const headers = [];
  const seen = new Set();
  rows.forEach((row) => {
    if (!isPlainObject(row)) return;
    Object.keys(row).forEach((k) => {
      if (seen.has(k)) return;
      seen.add(k);
      headers.push(k);
    });
  });
  return headers;
};

const rowsToMatrix = (rows) => {
  const safeRows = Array.isArray(rows) ? rows.filter((r) => r != null) : [];
  if (safeRows.length === 0) return [["No data"]];

  const normalizedRows = safeRows.map((row) => (isPlainObject(row) ? row : { value: row }));
  const headers = orderedHeadersFromRows(normalizedRows);
  return [headers, ...normalizedRows.map((row) => headers.map((h) => row[h] ?? null))];
};

const firstColumnFormulaRef = (sheetName) => `=${sheetName}!A2`;

const countRowsFormula = (sheetName) => `=MAX(0, COUNTA(${sheetName}!A:A)-1)`;

const buildWorkbookSheetMatrices = (workbookData) => {
  const usedNames = new Set();
  const matrices = new Map();

  const addSheet = (rawName, rows) => {
    const name = sanitizeSheetName(rawName, usedNames);
    matrices.set(name, rowsToMatrix(rows));
    return name;
  };

  const itemTabs = normalizeToArray(workbookData?.ItemTabs)
    .filter((t) => isPlainObject(t) && typeof t.name === "string" && Array.isArray(t.matrix))
    .map((t) => [t.name, t.matrix]);

  const moduleOrder = [
    ["WO", workbookData?.BOQ],
    ["Inv", workbookData?.Invoice],
    ["Abstract", workbookData?.Abstract],
    ["QTY", workbookData?.QTY],
    ["CPVC", workbookData?.CPVC],
    ...itemTabs,
  ];

  moduleOrder.forEach(([name, dataset]) => {
    if (dataset == null) return;
    if (Array.isArray(dataset) && Array.isArray(dataset[0])) {
      const sheetName = sanitizeSheetName(name, usedNames);
      matrices.set(sheetName, dataset);
      return;
    }
    if (Array.isArray(dataset)) {
      const rows = dataset.map((row) => (isPlainObject(row) ? flattenRecord(row) : { value: row }));
      addSheet(name, rows);
      return;
    }
    if (isPlainObject(dataset)) {
      addSheet(name, [flattenRecord(dataset)]);
      return;
    }
    addSheet(name, [{ value: dataset }]);
  });

  return Array.from(matrices.entries()).map(([name, matrix]) => ({ name, matrix }));
};

const matrixToLuckySheet = (name, matrix, sheetIndex) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const rowCount = Math.max(36, safeMatrix.length + 10);
  const colCount = Math.max(18, Math.max(1, ...safeMatrix.map((r) => (Array.isArray(r) ? r.length : 1))) + 5);

  const celldata = [];
  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [safeMatrix[r]];
    for (let c = 0; c < row.length; c += 1) {
      const raw = row[c];
      if (raw == null) continue;

      if (isPlainObject(raw) && raw.__formula) {
        celldata.push({ r, c, v: toLuckyFormulaCell(raw.__formula) });
        continue;
      }

      celldata.push({ r, c, v: toLuckyCell(raw) });
    }
  }

  return {
    name,
    index: String(sheetIndex),
    status: sheetIndex === 0 ? 1 : 0,
    order: sheetIndex,
    row: rowCount,
    column: colCount,
    celldata,
    config: {},
  };
};

const applyBoqSheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = Math.max(6, ...safeMatrix.map((r) => (Array.isArray(r) ? r.length : 1)));
  sheet.column = width;
  sheet.row = Math.max(40, safeMatrix.length + 10);

  const merge = {};
  merge["0_0"] = { r: 0, c: 0, rs: 1, cs: width };
  merge["1_0"] = { r: 1, c: 0, rs: 1, cs: width };

  for (let r = 2; r < safeMatrix.length; r += 1) {
    const row = safeMatrix[r];
    if (!Array.isArray(row)) continue;
    const sr = String(row[0] ?? "").trim();
    const desc = String(row[1] ?? "").trim();
    const restEmpty = [2, 3, 4, 5].every((idx) => String(row[idx] ?? "").trim() === "");
    if (/^[A-Z]\.?$/.test(sr) && desc && restEmpty) {
      merge[`${r}_1`] = { r, c: 1, rs: 1, cs: Math.max(1, width - 1) };
    }
  }

  const columnlen = { 0: 70, 1: 720, 2: 80, 3: 80, 4: 100, 5: 120 };
  const rowlen = { 0: 30, 1: 24 };
  for (let r = 2; r < safeMatrix.length; r += 1) {
    const row = safeMatrix[r];
    if (!Array.isArray(row)) continue;
    const isHeader = String(row[0] ?? "") === "SR NO." && String(row[1] ?? "") === "ITEM DESCRIPTION";
    if (isHeader) {
      rowlen[r] = 24;
      continue;
    }
    const sr = String(row[0] ?? "").trim();
    const desc = String(row[1] ?? "").trim();
    const restEmpty = [2, 3, 4, 5].every((idx) => String(row[idx] ?? "").trim() === "");
    if (/^[A-Z]\.?$/.test(sr) && desc && restEmpty) {
      rowlen[r] = 28;
      continue;
    }
    const lineCount = String(desc).split("\n").filter(Boolean).length || 1;
    const lines = Math.min(3, Math.max(1, lineCount));
    rowlen[r] = 18 * lines + 8;
  }
  sheet.config = {
    ...sheet.config,
    merge,
    columnlen,
    rowlen,
  };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const patchCell = (r, c, patch) => {
    const entry = cellMap.get(`${r}_${c}`);
    if (!entry || !entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  patchCell(0, 0, { bl: 1, fs: 16, ht: 1, vt: 1 });
  patchCell(1, 0, { bl: 1, fs: 12, ht: 0, vt: 1 });

  for (let r = 2; r < safeMatrix.length; r += 1) {
    const row = safeMatrix[r];
    if (!Array.isArray(row)) continue;
    const isHeader = String(row[0] ?? "") === "SR NO." && String(row[1] ?? "") === "ITEM DESCRIPTION";
    if (isHeader) {
      for (let c = 0; c < width; c += 1) {
        patchCell(r, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
      }
      continue;
    }
    const sr = String(row[0] ?? "").trim();
    const desc = String(row[1] ?? "").trim();
    const restEmpty = [2, 3, 4, 5].every((idx) => String(row[idx] ?? "").trim() === "");
    if (/^[A-Z]\.?$/.test(sr) && desc && restEmpty) {
      patchCell(r, 0, { bl: 1, bg: "#dbeafe", fc: "#1d4ed8", ht: 1, vt: 1 });
      patchCell(r, 1, { bl: 1, bg: "#dbeafe", fc: "#1d4ed8", ht: 0, vt: 1, tb: 2 });
      continue;
    }
    patchCell(r, 0, { ht: 1, vt: 1 });
    patchCell(r, 1, { ht: 0, vt: 1, tb: 2 });
    patchCell(r, 2, { ht: 1, vt: 1 });
    patchCell(r, 3, { ht: 2, vt: 1 });
    patchCell(r, 4, { ht: 2, vt: 1 });
    patchCell(r, 5, { ht: 2, vt: 1 });
  }

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const lastRow = Math.max(0, safeMatrix.length - 1);
  const lastCol = Math.max(0, width - 1);

  for (let r = 0; r <= lastRow; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    const isHeaderRow = String(row[0] ?? "") === "SR NO." && String(row[1] ?? "") === "ITEM DESCRIPTION";
    const sr = String(row[0] ?? "").trim();
    const desc = String(row[1] ?? "").trim();
    const restEmpty = [2, 3, 4, 5].every((idx) => String(row[idx] ?? "").trim() === "");
    const isSectionRow = /^[A-Z]\.?$/.test(sr) && desc && restEmpty;

    for (let c = 0; c <= lastCol; c += 1) {
      const entry = ensureCell(r, c);
      if (!entry.v || typeof entry.v !== "object") continue;
      const bd = {
        t: r === 0 || isHeaderRow || isSectionRow ? thick : thin,
        b: r === lastRow || isHeaderRow || isSectionRow ? thick : thin,
        l: c === 0 ? thick : thin,
        r: c === lastCol ? thick : thin,
      };
      entry.v.bd = bd;
    }
  }

  return sheet;
};

const applySamplesSheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = Math.max(12, ...safeMatrix.map((r) => (Array.isArray(r) ? r.length : 1)));
  sheet.column = width;
  sheet.row = Math.max(60, safeMatrix.length + 10);

  const merge = {};
  const columnlen = {
    0: 60,
    1: 650,
    2: 70,
    3: 70,
    4: 90,
    5: 110,
    6: 90,
    7: 90,
    8: 90,
    9: 110,
    10: 110,
    11: 110,
  };
  const rowlen = {};

  safeMatrix.forEach((row, r) => {
    if (!Array.isArray(row)) return;
    const isSingleLine = String(row[0] ?? "").trim() && row.slice(1).every((c) => String(c ?? "").trim() === "");
    if (isSingleLine) {
      merge[`${r}_0`] = { r, c: 0, rs: 1, cs: width };
      rowlen[r] = 26;
      return;
    }

    const isMultiHeaderTop =
      String(row[0] ?? "") === "Sl No" &&
      String(row[1] ?? "") === "Description" &&
      String(row[4] ?? "") === "BOQ" &&
      String(row[6] ?? "") === "Quantity" &&
      String(row[9] ?? "") === "Amount";

    if (isMultiHeaderTop) {
      merge[`${r}_0`] = { r, c: 0, rs: 2, cs: 1 };
      merge[`${r}_1`] = { r, c: 1, rs: 2, cs: 1 };
      merge[`${r}_2`] = { r, c: 2, rs: 2, cs: 1 };
      merge[`${r}_3`] = { r, c: 3, rs: 2, cs: 1 };
      merge[`${r}_4`] = { r, c: 4, rs: 1, cs: 2 };
      merge[`${r}_6`] = { r, c: 6, rs: 1, cs: 3 };
      merge[`${r}_9`] = { r, c: 9, rs: 1, cs: 3 };
      rowlen[r] = 24;
      rowlen[r + 1] = 22;
      return;
    }

    const desc = String(row[1] ?? "");
    const lineCount = desc.split("\n").filter(Boolean).length || 1;
    const lines = Math.min(3, Math.max(1, lineCount));
    rowlen[r] = 18 * lines + 8;
  });

  sheet.config = {
    ...sheet.config,
    merge,
    columnlen,
    rowlen,
  };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const patchCell = (r, c, patch) => {
    const entry = cellMap.get(`${r}_${c}`);
    if (!entry || !entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = safeMatrix[r];
    if (!Array.isArray(row)) continue;

    const isSingleLine = String(row[0] ?? "").trim() && row.slice(1).every((c) => String(c ?? "").trim() === "");
    if (isSingleLine) {
      const value = String(row[0] ?? "");
      if (value.startsWith("Sample -")) {
        patchCell(r, 0, { bl: 1, bg: "#dbeafe", fc: "#1d4ed8", ht: 1, vt: 1 });
      } else if (value === "ABSTRACT SHEET") {
        patchCell(r, 0, { bl: 1, fs: 12, ht: 1, vt: 1 });
      } else {
        patchCell(r, 0, { bl: 1, ht: 0, vt: 1 });
      }
      continue;
    }

    const isMultiHeaderTop =
      String(row[0] ?? "") === "Sl No" &&
      String(row[1] ?? "") === "Description" &&
      String(row[4] ?? "") === "BOQ" &&
      String(row[6] ?? "") === "Quantity" &&
      String(row[9] ?? "") === "Amount";
    if (isMultiHeaderTop) {
      for (let c = 0; c < width; c += 1) patchCell(r, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
      for (let c = 0; c < width; c += 1) patchCell(r + 1, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
      continue;
    }

    patchCell(r, 1, { tb: 2, vt: 1 });
    for (const c of [3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      patchCell(r, c, { ht: 2, vt: 1 });
    }
  }

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const lastRow = Math.max(0, safeMatrix.length - 1);
  const lastCol = Math.max(0, width - 1);
  const groupRight = new Set([3, 5, 8, 11]);
  const groupLeft = new Set([4, 6, 9]);

  for (let r = 0; r <= lastRow; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    const isSingleLine = String(row[0] ?? "").trim() && row.slice(1).every((c) => String(c ?? "").trim() === "");
    const isMultiHeaderTop =
      String(row[0] ?? "") === "Sl No" &&
      String(row[1] ?? "") === "Description" &&
      String(row[4] ?? "") === "BOQ" &&
      String(row[6] ?? "") === "Quantity" &&
      String(row[9] ?? "") === "Amount";
    const isMultiHeaderSecond =
      String(row[4] ?? "") === "Rate" &&
      String(row[5] ?? "") === "Amount" &&
      String(row[6] ?? "") === "Previous" &&
      String(row[7] ?? "") === "Present" &&
      String(row[8] ?? "") === "Total" &&
      String(row[9] ?? "") === "Previous" &&
      String(row[10] ?? "") === "Present" &&
      String(row[11] ?? "") === "Total";

    for (let c = 0; c <= lastCol; c += 1) {
      const entry = ensureCell(r, c);
      if (!entry.v || typeof entry.v !== "object") continue;

      const topThick = r === 0 || isMultiHeaderTop || (isSingleLine && String(row[0] ?? "").startsWith("Sample -"));
      const bottomThick = r === lastRow || isMultiHeaderSecond;

      const bd = {
        t: topThick ? thick : thin,
        b: bottomThick ? thick : thin,
        l: c === 0 || groupLeft.has(c) ? thick : thin,
        r: c === lastCol || groupRight.has(c) ? thick : thin,
      };
      entry.v.bd = bd;
    }
  }

  return sheet;
};

const applyInvoiceSheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = 9;
  sheet.column = width;
  sheet.row = Math.max(50, safeMatrix.length + 10);

  const merge = {};
  merge["0_0"] = { r: 0, c: 0, rs: 1, cs: width };
  merge["1_0"] = { r: 1, c: 0, rs: 1, cs: width };
  merge["3_0"] = { r: 3, c: 0, rs: 1, cs: width };
  merge["4_0"] = { r: 4, c: 0, rs: 1, cs: width };
  merge["6_0"] = { r: 6, c: 0, rs: 1, cs: 3 };
  merge["6_3"] = { r: 6, c: 3, rs: 1, cs: 4 };
  merge["6_7"] = { r: 6, c: 7, rs: 1, cs: 2 };
  merge["9_0"] = { r: 9, c: 0, rs: 1, cs: width };

  for (let r = 10; r <= 13; r += 1) {
    merge[`${r}_0`] = { r, c: 0, rs: 1, cs: 1 };
    merge[`${r}_1`] = { r, c: 1, rs: 1, cs: 3 };
    merge[`${r}_4`] = { r, c: 4, rs: 1, cs: 2 };
    merge[`${r}_6`] = { r, c: 6, rs: 1, cs: 3 };
  }

  merge["15_0"] = { r: 15, c: 0, rs: 1, cs: 4 };
  merge["15_4"] = { r: 15, c: 4, rs: 1, cs: 5 };

  for (let r = 16; r <= 20; r += 1) {
    merge[`${r}_0`] = { r, c: 0, rs: 1, cs: 1 };
    merge[`${r}_1`] = { r, c: 1, rs: 1, cs: 3 };
    merge[`${r}_4`] = { r, c: 4, rs: 1, cs: 1 };
    merge[`${r}_5`] = { r, c: 5, rs: 1, cs: 4 };
  }

  merge["21_0"] = { r: 21, c: 0, rs: 1, cs: 2 };
  merge["21_2"] = { r: 21, c: 2, rs: 1, cs: 2 };
  merge["21_4"] = { r: 21, c: 4, rs: 1, cs: 5 };

  merge["23_0"] = { r: 23, c: 0, rs: 1, cs: width };

  merge["31_0"] = { r: 31, c: 0, rs: 1, cs: 3 };

  for (let r = 32; r <= 38; r += 1) {
    merge[`${r}_0`] = { r, c: 0, rs: 1, cs: 4 };
    merge[`${r}_4`] = { r, c: 4, rs: 1, cs: 4 };
    merge[`${r}_8`] = { r, c: 8, rs: 1, cs: 1 };
  }

  merge["39_0"] = { r: 39, c: 0, rs: 1, cs: 2 };
  merge["39_4"] = { r: 39, c: 4, rs: 1, cs: 5 };
  merge["40_0"] = { r: 40, c: 0, rs: 1, cs: 4 };
  merge["40_4"] = { r: 40, c: 4, rs: 1, cs: 5 };
  merge["41_0"] = { r: 41, c: 0, rs: 1, cs: 4 };
  merge["41_4"] = { r: 41, c: 4, rs: 1, cs: 5 };

  const columnlen = {
    0: 100,
    1: 200,
    2: 80,
    3: 100,
    4: 90,
    5: 100,
    6: 60,
    7: 80,
    8: 100,
  };

  const rowlen = {
    0: 40,
    1: 22,
    3: 18,
    4: 16,
    6: 20,
    9: 30,
    15: 22,
    21: 22,
    22: 20,
    24: 22,
    25: 20,
    26: 40,
    31: 26,
    38: 20,
    40: 20,
  };

  sheet.config = {
    ...sheet.config,
    merge,
    columnlen,
    rowlen,
  };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const patchCell = (r, c, patch) => {
    const entry = ensureCell(r, c);
    if (!entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  patchCell(0, 0, { bl: 1, fs: 20, ht: 1, vt: 1 });
  patchCell(6, 0, { bl: 1, fs: 10 });
  patchCell(6, 3, { bl: 1, fs: 10 });
  patchCell(6, 7, { bl: 1, fs: 10, ht: 2 });
  patchCell(9, 0, { bl: 1, fs: 14, ht: 1, vt: 1 });
  patchCell(15, 0, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
  patchCell(15, 4, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
  for (let c = 0; c < width; c += 1) patchCell(21, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
  for (let c = 0; c < width; c += 1) {
    patchCell(24, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
    patchCell(25, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
  }
  patchCell(26, 1, { tb: 2, vt: 1 });
  for (let c = 0; c < width; c += 1) patchCell(31, c, { bl: 1 });
  patchCell(39, 0, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };

  const lastRow = Math.max(0, safeMatrix.length - 1);
  const lastCol = width - 1;

  for (let r = 0; r <= lastRow; r += 1) {
    for (let c = 0; c <= lastCol; c += 1) {
      const entry = ensureCell(r, c);
      if (!entry.v || typeof entry.v !== "object") continue;
      const isTop = r === 0;
      const isBottom = r === lastRow;
      const isLeft = c === 0;
      const isRight = c === lastCol;

      const isHeaderSection = r === 6;
      const isTaxInvoice = r === 9;
      const isBillToParty = r === 15;
      const isTableHeader = r === 24;
      const isTotal = r === 31;
      const isSummaryStart = r === 32;
      const isBankDetails = r === 39;

      const topBorder = (isTop || isTaxInvoice || isBillToParty || isTableHeader || isSummaryStart || isBankDetails) ? thick : thin;
      const bottomBorder = (isBottom || isHeaderSection || isTaxInvoice || r === 13 || isBillToParty || r === 20 || isTableHeader || r === 25 || isTotal || r === 38 || r === 41) ? thick : thin;

      entry.v.bd = {
        t: topBorder,
        b: bottomBorder,
        l: isLeft ? thick : thin,
        r: isRight ? thick : thin,
      };
    }
  }

  for (let r = 15; r <= 21; r += 1) {
    const entry = ensureCell(r, 4);
    if (entry.v && typeof entry.v === "object") {
      entry.v.bd = { ...entry.v.bd, l: thick };
    }
  }

  for (let r = 32; r <= 38; r += 1) {
    const entry = ensureCell(r, 4);
    if (entry.v && typeof entry.v === "object") {
      entry.v.bd = { ...entry.v.bd, l: thick };
    }
    const entry2 = ensureCell(r, 8);
    if (entry2.v && typeof entry2.v === "object") {
      entry2.v.bd = { ...entry2.v.bd, l: thick };
    }
  }

  return sheet;
};

const applyCpvcSheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = 28;
  sheet.column = Math.max(width, sheet.column || 0);
  sheet.row = Math.max(250, safeMatrix.length + 80);

  const merge = {};
  merge["0_0"] = { r: 0, c: 0, rs: 1, cs: 14 };
  merge["0_14"] = { r: 0, c: 14, rs: 1, cs: 14 };
  merge["1_0"] = { r: 1, c: 0, rs: 1, cs: 14 };
  merge["1_14"] = { r: 1, c: 14, rs: 1, cs: 14 };
  merge["2_0"] = { r: 2, c: 0, rs: 1, cs: width };
  merge["3_0"] = { r: 3, c: 0, rs: 1, cs: width };

  merge["5_0"] = { r: 5, c: 0, rs: 2, cs: 1 };
  merge["5_1"] = { r: 5, c: 1, rs: 2, cs: 1 };
  for (let i = 0; i < 8; i += 1) {
    merge[`5_${2 + i * 3}`] = { r: 5, c: 2 + i * 3, rs: 1, cs: 3 };
  }
  merge["5_26"] = { r: 5, c: 26, rs: 2, cs: 1 };
  merge["5_27"] = { r: 5, c: 27, rs: 2, cs: 1 };

  const totalRowIdx = safeMatrix.findIndex((row) => Array.isArray(row) && String(row[0] ?? "").trim() === "TOTAL");
  if (totalRowIdx >= 0) {
    merge[`${totalRowIdx}_0`] = { r: totalRowIdx, c: 0, rs: 1, cs: 2 };
  }

  const columnlen = { 0: 50, 1: 90, 26: 80, 27: 90 };
  for (let c = 2; c <= 25; c += 1) columnlen[c] = 55;

  const rowlen = { 0: 20, 1: 20, 2: 24, 3: 20, 5: 22, 6: 20 };
  for (let r = 7; r < safeMatrix.length; r += 1) rowlen[r] = 18;
  if (totalRowIdx >= 0) rowlen[totalRowIdx] = 22;

  sheet.config = {
    ...sheet.config,
    merge,
    columnlen,
    rowlen,
  };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const patchCell = (r, c, patch) => {
    const entry = ensureCell(r, c);
    if (!entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  patchCell(2, 0, { bl: 1, fs: 11, ht: 1, vt: 1 });
  patchCell(3, 0, { bl: 1, fs: 10, ht: 1, vt: 1, fc: "#1d4ed8" });

  for (let c = 0; c < width; c += 1) {
    patchCell(5, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
    patchCell(6, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
  }

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };

  const tableStartRow = 5;
  const tableEndRow = totalRowIdx >= 0 ? totalRowIdx : Math.max(tableStartRow + 2, safeMatrix.length - 1);
  const groupLeft = new Set([0, 1, 2, 5, 8, 11, 14, 17, 20, 23, 26, 27]);
  const groupRight = new Set([0, 1, 4, 7, 10, 13, 16, 19, 22, 25, 26, 27]);

  for (let r = tableStartRow; r <= tableEndRow; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const entry = ensureCell(r, c);
      if (!entry.v || typeof entry.v !== "object") continue;
      entry.v.bd = {
        t: r === tableStartRow ? thick : thin,
        b: r === tableEndRow ? thick : thin,
        l: groupLeft.has(c) ? thick : thin,
        r: groupRight.has(c) ? thick : thin,
      };
    }
  }

  return sheet;
};

const applyQtySheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = 4;
  sheet.column = Math.max(width, sheet.column || 0);
  sheet.row = Math.max(80, safeMatrix.length + 40);

  const merge = {};
  const columnlen = { 0: 420, 1: 80, 2: 110, 3: 110 };
  const rowlen = {};

  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    const isChallanRow = String(row[0] ?? "").toUpperCase().startsWith("CHALLAN NO");
    const isHeaderRow = String(row[1] ?? "") === "QTY" && String(row[2] ?? "") === "PER PC MTR" && String(row[3] ?? "") === "TOT QTY";
    if (isChallanRow) {
      merge[`${r}_0`] = { r, c: 0, rs: 1, cs: width };
      rowlen[r] = 22;
      continue;
    }
    if (isHeaderRow) {
      rowlen[r] = 22;
      continue;
    }
    rowlen[r] = 18;
  }

  sheet.config = {
    ...sheet.config,
    merge,
    columnlen,
    rowlen,
  };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const patchCell = (r, c, patch) => {
    const entry = ensureCell(r, c);
    if (!entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    const isChallanRow = String(row[0] ?? "").toUpperCase().startsWith("CHALLAN NO");
    const isHeaderRow = String(row[1] ?? "") === "QTY" && String(row[2] ?? "") === "PER PC MTR" && String(row[3] ?? "") === "TOT QTY";
    if (isChallanRow) {
      patchCell(r, 0, { bl: 1, bg: "#fef08a", ht: 0, vt: 1 });
      continue;
    }
    if (isHeaderRow) {
      for (let c = 0; c < width; c += 1) patchCell(r, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
      continue;
    }
    patchCell(r, 0, { ht: 0, vt: 1, tb: 2 });
    patchCell(r, 1, { ht: 2, vt: 1 });
    patchCell(r, 2, { ht: 2, vt: 1 });
    patchCell(r, 3, { ht: 2, vt: 1 });
  }

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };

  const lastRow = Math.max(0, safeMatrix.length - 1);
  const lastCol = width - 1;

  for (let r = 0; r <= lastRow; r += 1) {
    for (let c = 0; c <= lastCol; c += 1) {
      const entry = ensureCell(r, c);
      if (!entry.v || typeof entry.v !== "object") continue;
      entry.v.bd = {
        t: r === 0 ? thick : thin,
        b: r === lastRow ? thick : thin,
        l: c === 0 ? thick : thin,
        r: c === lastCol ? thick : thin,
      };
    }
  }

  return sheet;
};

const applyAbstractSheetPresentation = (sheet, matrix) => {
  const safeMatrix = Array.isArray(matrix) ? matrix : [["No data"]];
  const width = 36;
  sheet.column = Math.max(width, sheet.column || 0);
  sheet.row = Math.max(250, safeMatrix.length + 80);

  const merge = {};
  const rowlen = {};
  const columnlen = { 0: 55, 1: 90, 34: 70, 35: 90 };
  for (let c = 2; c <= 33; c += 1) columnlen[c] = 48;

  const isSingleLineRow = (row) => Array.isArray(row) && String(row[0] ?? "").trim() && row.slice(1).every((c) => String(c ?? "").trim() === "");

  const tableHeaderStarts = [];
  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    const isTableHeader = String(row[0] ?? "") === "Sl No" && String(row[1] ?? "") === "Floor" && String(row[2] ?? "").startsWith("FLAT NO");
    if (isTableHeader) tableHeaderStarts.push(r);
  }

  tableHeaderStarts.forEach((startRow) => {
    merge[`${startRow}_0`] = { r: startRow, c: 0, rs: 2, cs: 1 };
    merge[`${startRow}_1`] = { r: startRow, c: 1, rs: 2, cs: 1 };
    for (let i = 0; i < 8; i += 1) {
      merge[`${startRow}_${2 + i * 4}`] = { r: startRow, c: 2 + i * 4, rs: 1, cs: 4 };
    }
    merge[`${startRow}_34`] = { r: startRow, c: 34, rs: 2, cs: 1 };
    merge[`${startRow}_35`] = { r: startRow, c: 35, rs: 2, cs: 1 };
  });

  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    if (isSingleLineRow(row)) {
      merge[`${r}_0`] = { r, c: 0, rs: 1, cs: width };
      rowlen[r] = String(row[0] ?? "").startsWith("WORK ORDER SERIAL NO") ? 22 : 20;
      continue;
    }
    rowlen[r] = rowlen[r] ?? 18;
  }

  sheet.config = { ...sheet.config, merge, columnlen, rowlen };

  const cellMap = new Map();
  sheet.celldata.forEach((entry) => {
    if (!entry) return;
    cellMap.set(`${entry.r}_${entry.c}`, entry);
  });

  const ensureCell = (r, c) => {
    const key = `${r}_${c}`;
    const existing = cellMap.get(key);
    if (existing) return existing;
    const created = { r, c, v: toLuckyCell("") };
    sheet.celldata.push(created);
    cellMap.set(key, created);
    return created;
  };

  const patchCell = (r, c, patch) => {
    const entry = ensureCell(r, c);
    if (!entry.v || typeof entry.v !== "object") return;
    Object.assign(entry.v, patch);
  };

  for (let r = 0; r < safeMatrix.length; r += 1) {
    const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
    if (isSingleLineRow(row)) {
      const v = String(row[0] ?? "");
      if (v.startsWith("WORK ORDER SERIAL NO")) {
        patchCell(r, 0, { bl: 1, bg: "#dbeafe", fc: "#1d4ed8", ht: 1, vt: 1 });
      } else if (v === "Installation Abstract") {
        patchCell(r, 0, { bl: 1, fs: 11, ht: 1, vt: 1 });
      } else {
        patchCell(r, 0, { bl: 1, ht: 0, vt: 1 });
      }
      continue;
    }
    const isTableHeader = String(row[0] ?? "") === "Sl No" && String(row[1] ?? "") === "Floor";
    if (isTableHeader || (String(row[2] ?? "") === "CT" && String(row[3] ?? "") === "MT")) {
      for (let c = 0; c < width; c += 1) patchCell(r, c, { bl: 1, bg: "#f2f2f2", ht: 1, vt: 1 });
      continue;
    }
    patchCell(r, 1, { vt: 1 });
    patchCell(r, 34, { ht: 2, vt: 1 });
  }

  const thin = { style: 1, color: "#111827" };
  const thick = { style: 2, color: "#111827" };
  const groupLeft = new Set([0, 1, 2, 6, 10, 14, 18, 22, 26, 30, 34, 35]);
  const groupRight = new Set([0, 1, 5, 9, 13, 17, 21, 25, 29, 33, 34, 35]);

  tableHeaderStarts.forEach((startRow) => {
    const tableEnd = (() => {
      for (let r = startRow + 2; r < safeMatrix.length; r += 1) {
        const row = Array.isArray(safeMatrix[r]) ? safeMatrix[r] : [];
        if (String(row[0] ?? "").trim() === "TOTAL") return r;
      }
      return Math.min(safeMatrix.length - 1, startRow + 2 + 30);
    })();

    for (let r = startRow; r <= tableEnd; r += 1) {
      for (let c = 0; c < width; c += 1) {
        const entry = ensureCell(r, c);
        if (!entry.v || typeof entry.v !== "object") continue;
        entry.v.bd = {
          t: r === startRow ? thick : thin,
          b: r === tableEnd ? thick : thin,
          l: groupLeft.has(c) ? thick : thin,
          r: groupRight.has(c) ? thick : thin,
        };
      }
    }
  });

  return sheet;
};

const buildLuckySheetFromMatrix = (name, matrix, sheetIndex) => {
  const base = matrixToLuckySheet(name, matrix, sheetIndex);
  const key = String(name).toLowerCase();
  if (key === "inv" || key === "invoice") return applyInvoiceSheetPresentation(base, matrix);
  if (key === "wo" || key === "boq") return applyBoqSheetPresentation(base, matrix);
  if (key === "abstract" || key === "samples") return applyAbstractSheetPresentation(base, matrix);
  if (key === "cpvc") return applyCpvcSheetPresentation(base, matrix);
  if (key === "qty") return applyQtySheetPresentation(base, matrix);
  if (
    Array.isArray(matrix) &&
    matrix.some((row) => Array.isArray(row) && String(row[0] ?? "").startsWith("WORK ORDER SERIAL NO")) &&
    matrix.some((row) => Array.isArray(row) && String(row[0] ?? "") === "Sl No" && String(row[1] ?? "") === "Floor")
  ) {
    return applyAbstractSheetPresentation(base, matrix);
  }
  return base;
};

const normalizeFormulaForSheetJs = (formula) => {
  const f = String(formula || "").trim();
  return f.startsWith("=") ? f.slice(1) : f;
};

const inferSheetJsCellType = (value, hasFormula) => {
  if (typeof value === "number" && Number.isFinite(value)) return "n";
  if (typeof value === "boolean") return "b";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return "d";
  if (value == null && hasFormula) return "n";
  return "s";
};

const isLuckysheetValueObject = (value) => {
  if (!isPlainObject(value)) return false;
  return "v" in value || "m" in value || "f" in value || "ct" in value;
};

const readLuckysheetCell = (cell) => {
  if (cell == null) return { value: null, formula: null };
  if (isLuckysheetValueObject(cell)) {
    return { value: cell.v ?? cell.m ?? null, formula: cell.f ?? null };
  }
  if (isPlainObject(cell) && isLuckysheetValueObject(cell.v)) {
    return { value: cell.v.v ?? cell.v.m ?? null, formula: cell.v.f ?? null };
  }
  return { value: cell, formula: null };
};

const buildWorkbookFromLuckysheetFile = (luckysheetFile = []) => {
  const workbook = XLSX.utils.book_new();

  luckysheetFile.forEach((sheet) => {
    const sheetName = String(sheet?.name || "Sheet").slice(0, 31) || "Sheet";
    const data = Array.isArray(sheet?.data) ? sheet.data : [];
    const celldata = Array.isArray(sheet?.celldata) ? sheet.celldata : [];

    const ws = {};
    let maxR = 0;
    let maxC = 0;

    const writeCell = (r, c, cell) => {
      const { value, formula } = readLuckysheetCell(cell);
      if (value == null && !formula) return;

      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);

      const addr = XLSX.utils.encode_cell({ r, c });
      const normalizedFormula = formula ? normalizeFormulaForSheetJs(formula) : undefined;
      const cellType = inferSheetJsCellType(value, Boolean(normalizedFormula));
      const normalizedValue = value == null ? (cellType === "n" ? 0 : "") : value;

      if (normalizedFormula) {
        ws[addr] = { t: cellType, v: normalizedValue, f: normalizedFormula };
      } else {
        ws[addr] = { t: cellType, v: normalizedValue };
      }
    };

    if (data.length > 0) {
      for (let r = 0; r < data.length; r += 1) {
        const row = Array.isArray(data[r]) ? data[r] : [];
        for (let c = 0; c < row.length; c += 1) {
          writeCell(r, c, row[c]);
        }
      }
    } else if (celldata.length > 0) {
      celldata.forEach((entry) => {
        if (!entry) return;
        const r = Number(entry.r);
        const c = Number(entry.c);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        writeCell(r, c, entry.v);
      });
    }

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  });

  return workbook;
};

const getAuthToken = () => {
  const userStr = localStorage.getItem("inventory_user");
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user?.token || null;
  } catch {
    return null;
  }
};

const fetchProjectData = async (projectId) => {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "https://api.festmate.in").replace(/\/$/, "");
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const tryFetch = async (url) => {
    const res = await fetch(url, { headers });
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) {
      const error = body?.error || body?.message || res.statusText || "Request failed";
      throw new Error(error);
    }
    if (body && typeof body === "object" && "data" in body && "success" in body) {
      if (!body.success) throw new Error(body.error || "Request failed");
      return body.data;
    }
    return body;
  };

  const urls = [`${baseUrl}/api/projects/${projectId}`];
  for (const url of urls) {
    try {
      return await tryFetch(url);
    } catch {
      null;
    }
  }

  const fallback = await api.getProjectById(projectId);
  if (!fallback?.success) throw new Error(fallback?.error || "Failed to load project data");
  return fallback.data;
};

const normalizeToArray = (value) => (Array.isArray(value) ? value : []);

const placeholderMatrix = (label) => [[`Click tab to load ${label}`]];

const sectionKeyForRawSheetName = (rawName) => {
  const name = String(rawName || "");
  if (name === "WO") return "BOQ";
  if (name === "Inv") return "Invoice";
  if (name === "Abstract") return "Abstract";
  if (name === "QTY") return "QTY";
  if (name === "CPVC") return "CPVC";
  return null;
};

const datasetToMatrix = (dataset) => {
  if (dataset == null) return [["No data"]];
  if (Array.isArray(dataset)) {
    const rows = dataset.map((row) => (isPlainObject(row) ? flattenRecord(row) : { value: row }));
    return rowsToMatrix(rows);
  }
  if (isPlainObject(dataset)) return rowsToMatrix([flattenRecord(dataset)]);
  return rowsToMatrix([{ value: dataset }]);
};

const wrapCellText = (value, { maxLineChars = 90, maxLines = 3 } = {}) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxLineChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = w;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  const truncated = words.length > 0 && lines.join(" ").length < text.length;
  const out = lines.slice(0, maxLines).join("\n");
  return truncated ? `${out}…` : out;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildInvoiceMatrix = (project) => {
  const projectName = String(project?.project_name || project?.name || "").trim();
  const clientName = String(project?.client_name || "").trim();
  const woNumber = String(project?.wo_number || "").trim();
  const location = String(project?.location || "").trim();
  const buildingName = String(project?.building_name || project?.site_name || "").trim();
  const raNumber = String(project?.ra_number || project?.ra_no || "").trim();

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const invoiceDate = `${dd}.${mm}.${yyyy}`;

  const invoiceNo = woNumber ? `${woNumber}` : `INV-${yyyy}${mm}${dd}`;

  const r = () => Array(9).fill("");
  const rows = [];

  rows.push(Object.assign(r(), { 0: "Madhuram Enterprises" }));
  rows.push(Object.assign(r(), { 0: "401, SUJATA BLDG, RAMNAGAR, OPP PARIVAR BLDG, BORIVALI WEST, MUMBAI - 400092" }));
  rows.push(r());
  rows.push(Object.assign(r(), { 0: "Cell no. - 9819910257, Email id: mmsplumbing@gmail.com" }));
  rows.push(Object.assign(r(), { 0: "Website: www.madhuramrealtors.com" }));
  rows.push(r());
  rows.push(
    Object.assign(r(), {
      0: "GSTIN: 27AESPN7117D1ZA",
      3: "PAN NO.: AESPN7117D",
      7: "ORIGINAL FOR RECIPIENT",
    }),
  );
  rows.push(r());
  rows.push(r());
  rows.push(Object.assign(r(), { 0: "Tax Invoice" }));
  rows.push(
    Object.assign(r(), {
      0: "Invoice No :",
      2: invoiceNo,
      4: "PF NO -",
      5: "",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "Invoice date:",
      2: invoiceDate,
      4: "ESIC NO -",
      5: "",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "Reverse Charge (Y/N)",
      2: "N",
      4: "PTR NO -",
      5: "",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "State: MAHARASHTRA",
      2: "Code",
      3: "27",
      4: "MLWF NO -",
      5: "",
    }),
  );
  rows.push(r());
  rows.push(
    Object.assign(r(), {
      0: "Bill to Party",
      4: "Ship to Party / Site",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "Co A/C Name:",
      1: clientName || "-",
      4: "Co A/C Name:",
      5: "",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "Address:",
      1: wrapCellText(location || "-", { maxLineChars: 52, maxLines: 1 }),
      4: "GSTIN:",
      5: "",
    }),
  );
  rows.push(Object.assign(r(), { 0: "", 1: "", 4: "", 5: "" }));
  rows.push(
    Object.assign(r(), {
      0: "GSTIN:",
      1: "",
      4: "",
      5: "",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "State: Maharashtra",
      2: "Code",
      3: "27",
      4: "State: Maharashtra",
      6: "Code",
      7: "27",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "BUILDING NAME",
      1: buildingName || projectName || "-",
      4: buildingName || projectName || "-",
    }),
  );
  rows.push(
    Object.assign(r(), {
      0: "Reference :-",
      1: "RA No.",
      2: raNumber || "7",
      3: "Work",
      4: "PLUMBING WORK",
      5: "WO NO",
      6: woNumber || "",
    }),
  );
  rows.push(Object.assign(r(), { 0: "SERVICE DATE FROM - 1.12.2025 TO 31.12.2025" }));
  rows.push(
    Object.assign(r(), {
      0: "S. No.",
      1: "Goods / Service Description",
      2: "SAC code",
      3: "Value of Supply",
      4: "Discount",
      5: "Taxable Value",
      6: "CGST",
      7: "",
      8: "SGST",
    }),
  );
  rows.push(Object.assign(r(), { 6: "Rate", 7: "Amount", 8: "Rate" }));
  rows.push(
    Object.assign(r(), {
      0: "",
      1: "Plumbing / Sanitation Contract works",
      2: "995462",
      3: "",
      4: "0",
      5: "",
      6: "9",
      7: "",
      8: "9",
    }),
  );
  rows.push(r());
  rows.push(r());
  rows.push(r());
  rows.push(r());
  rows.push(
    Object.assign(r(), {
      0: "Total",
      3: "",
      4: "-",
      5: "",
      6: "",
      7: "",
      8: "",
    }),
  );
  rows.push(Object.assign(r(), { 0: "Total Invoice amount in words", 4: "Total Amount before Tax", 8: "" }));
  rows.push(Object.assign(r(), { 0: "RUPEES ONE LAKH FIFTY EIGHT THOUSAND FIVE HUNDRED", 4: "Add: CGST", 8: "" }));
  rows.push(Object.assign(r(), { 0: "AND THIRTY ONLY", 4: "Add: SGST", 8: "" }));
  rows.push(Object.assign(r(), { 4: "ROUND OFF", 8: "" }));
  rows.push(Object.assign(r(), { 4: "Total Amount after Tax:", 8: "" }));
  rows.push(Object.assign(r(), { 4: "GST on Reverse Charge", 8: "0" }));
  rows.push(Object.assign(r(), { 0: "Bank Details", 4: "E & O.E" }));
  rows.push(Object.assign(r(), { 0: "Bank:", 1: "", 4: "For," }));
  rows.push(Object.assign(r(), { 0: "Terms and Conditions:-", 4: "MMS. MADHURAM ENTERPRISES" }));
  rows.push(Object.assign(r(), { 4: "AUTHORISED SIGNATORY" }));

  return rows;
};

const buildCpvcMatrix = (project) => {
  const rawFloors =
    project?.floors ??
    project?.no_of_floors ??
    project?.noOfFloors ??
    project?.total_floors ??
    project?.totalFloors ??
    project?.floor ??
    "";

  const floorCount = (() => {
    const n = Number(String(rawFloors).replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0 && n <= 250) return Math.floor(n);
    return 1;
  })();

  const building = String(project?.project_name || project?.name || "BUILDING").trim();
  const woNumber = String(project?.wo_number || "").trim();

  const width = 28;
  const blankRow = () => Array(width).fill("");

  const floorLabel = (idx) => {
    if (idx === 0) return "G/F";
    const n = idx;
    const mod10 = n % 10;
    const mod100 = n % 100;
    const suffix = mod10 === 1 && mod100 !== 11 ? "st" : mod10 === 2 && mod100 !== 12 ? "nd" : mod10 === 3 && mod100 !== 13 ? "rd" : "th";
    return `${n}${suffix} Flr`;
  };

  const matrix = [];

  const row0 = blankRow();
  row0[0] = `Building - ${building.toUpperCase()}`;
  row0[20] = woNumber ? `Work Order - ${woNumber}` : "Work Order -";
  matrix.push(row0);

  const row1 = blankRow();
  row1[0] = "Contractor : MADHURAM ENTERPRISES";
  row1[20] = "";
  matrix.push(row1);

  const titleRow = blankRow();
  titleRow[0] = "CPVC Pipe 15mm (Concealed) - Installation Abstract";
  matrix.push(titleRow);

  const woRow = blankRow();
  woRow[0] = woNumber ? `WORK ORDER SR.NO ${woNumber}` : "WORK ORDER SR.NO";
  matrix.push(woRow);

  matrix.push(blankRow());

  const groupRow = blankRow();
  groupRow[0] = "Sr";
  groupRow[1] = "Floor";
  for (let i = 1; i <= 8; i += 1) {
    groupRow[2 + (i - 1) * 3] = `FLAT NO ${i}`;
  }
  groupRow[26] = "Total";
  groupRow[27] = "Remarks";
  matrix.push(groupRow);

  const subRow = blankRow();
  for (let i = 0; i < 8; i += 1) {
    const base = 2 + i * 3;
    subRow[base] = "CT";
    subRow[base + 1] = "MT";
    subRow[base + 2] = "KIT";
  }
  subRow[26] = "Total";
  matrix.push(subRow);

  for (let i = 0; i < floorCount; i += 1) {
    const row = blankRow();
    row[0] = i + 1;
    row[1] = floorLabel(i);
    matrix.push(row);
  }

  const totalRow = blankRow();
  totalRow[0] = "TOTAL";
  matrix.push(totalRow);

  return matrix;
};

const buildQtyMatrix = (rawDcs) => {
  const dcs = normalizeToArray(rawDcs);

  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  };

  const displayNum = (v) => {
    if (v == null) return "";
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = toNum(v);
    return n == null ? "" : n;
  };

  const matrix = [];
  let first = true;

  dcs.forEach((dc) => {
    if (!isPlainObject(dc)) return;
    const challanNumber = String(dc.challan_number || "").trim();
    if (!challanNumber) return;

    if (!first) matrix.push(["", "", "", ""]);
    first = false;

    matrix.push([`CHALLAN NO ${challanNumber}`, "", "", ""]);
    matrix.push(["", "QTY", "PER PC MTR", "TOT QTY"]);

    const items = normalizeToArray(dc.items);
    items.forEach((item) => {
      if (!isPlainObject(item)) return;
      const name = String(item.name || item.description || "").trim();
      if (!name) return;

      const qty = displayNum(item.quantity ?? item.qty);
      const perPc =
        displayNum(
          item.per_pc_mtr ??
            item.perPcMtr ??
            item.per_pc_meter ??
            item.perPcMeter ??
            item.length ??
            item.mtr ??
            item.meter,
        ) || "";

      const qtyNum = typeof qty === "number" ? qty : toNum(qty);
      const perNum = typeof perPc === "number" ? perPc : toNum(perPc);

      const total =
        qtyNum != null && perNum != null
          ? Number((qtyNum * perNum).toFixed(3))
          : qtyNum != null
            ? qtyNum
            : "";

      matrix.push([name, qty, perPc, total]);
    });
  });

  return matrix.length > 0 ? matrix : [["No data"]];
};

const buildItemTabsAfterCpvc = (project, rawSamples, rawDcs) => {
  const samples = normalizeToArray(rawSamples);
  const seen = new Set();
  const tabs = [];

  const makeTabName = (label) => {
    const upper = String(label || "").toUpperCase();
    const sizeMatch = /(\d+)\s*MM/.exec(upper);
    const typeMatch = /TYPE\s*([A-Z])/.exec(upper);
    const size = sizeMatch ? sizeMatch[1] : "";
    const type = typeMatch ? typeMatch[1] : "";
    const base = size && type ? `${size}${type}` : size ? `${size}MM` : upper.replace(/[^A-Z0-9]+/g, " ").trim().slice(0, 12);
    const sanitized = base || "ITEM";
    let name = sanitized;
    let n = 2;
    while (seen.has(name)) {
      name = `${sanitized}-${n}`;
      n += 1;
    }
    seen.add(name);
    return name.slice(0, 31);
  };

  const itemLabels = [];
  const labelSeen = new Set();
  samples.forEach((sample) => {
    if (!isPlainObject(sample)) return;
    const rows = parseJsonArray(sample.item_description);
    rows.forEach((row) => {
      if (!isPlainObject(row)) return;
      const label = String(row.item || row.description || row.material_description || "").trim();
      if (!label || labelSeen.has(label)) return;
      labelSeen.add(label);
      itemLabels.push(label);
    });
  });

  itemLabels.forEach((label) => {
    tabs.push({ name: makeTabName(label), matrix: buildAbstractMatrix(project, rawDcs, `${label} - Installation Abstract`) });
  });

  return tabs;
};

function buildAbstractMatrix(project, rawDcs, title = "Installation Abstract") {
  const dcs = normalizeToArray(rawDcs);

  const rawFloors =
    project?.floors ??
    project?.no_of_floors ??
    project?.noOfFloors ??
    project?.total_floors ??
    project?.totalFloors ??
    project?.floor ??
    "";

  const floorCount = (() => {
    const n = Number(String(rawFloors).replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0 && n <= 250) return Math.floor(n);
    return 1;
  })();

  const workOrders = (() => {
    const seen = new Set();
    const list = [];
    dcs.forEach((dc) => {
      if (!isPlainObject(dc)) return;
      const wo = String(dc.work_order_number || "").trim();
      if (!wo || seen.has(wo)) return;
      seen.add(wo);
      list.push(wo);
    });
    const fallback = String(project?.wo_number || "").trim();
    if (list.length === 0 && fallback) return [fallback];
    return list.length > 0 ? list : ["-"];
  })();

  const building = String(project?.project_name || project?.name || "BUILDING").trim();
  const woNumberTop = String(project?.wo_number || "").trim();

  const width = 36;
  const blankRow = () => Array(width).fill("");

  const floorLabel = (idx) => {
    if (idx === 0) return "G/F";
    const n = idx;
    const mod10 = n % 10;
    const mod100 = n % 100;
    const suffix = mod10 === 1 && mod100 !== 11 ? "st" : mod10 === 2 && mod100 !== 12 ? "nd" : mod10 === 3 && mod100 !== 13 ? "rd" : "th";
    return `${n}${suffix} Flr`;
  };

  const matrix = [];

  workOrders.forEach((woSerial, tableIndex) => {
    if (tableIndex > 0) matrix.push(blankRow(), blankRow());

    const row0 = blankRow();
    row0[0] = `Building - ${building.toUpperCase()}`;
    row0[26] = woNumberTop ? `Work Order - ${woNumberTop}` : "Work Order -";
    matrix.push(row0);

    const row1 = blankRow();
    row1[0] = "Contractor : MADHURAM ENTERPRISES";
    row1[26] = "";
    matrix.push(row1);

    const titleRow = blankRow();
    titleRow[0] = title;
    matrix.push(titleRow);

    const woRow = blankRow();
    woRow[0] = `WORK ORDER SERIAL NO ${woSerial}`;
    matrix.push(woRow);

    matrix.push(blankRow());

    const groupRow = blankRow();
    groupRow[0] = "Sl No";
    groupRow[1] = "Floor";
    for (let i = 1; i <= 8; i += 1) {
      groupRow[2 + (i - 1) * 4] = `FLAT NO ${i}`;
    }
    groupRow[34] = "TOT";
    groupRow[35] = "REMARKS";
    matrix.push(groupRow);

    const subRow = blankRow();
    for (let i = 0; i < 8; i += 1) {
      const base = 2 + i * 4;
      subRow[base] = "CT";
      subRow[base + 1] = "MT";
      subRow[base + 2] = "BAL";
      subRow[base + 3] = "KIT";
    }
    subRow[34] = "TOT";
    matrix.push(subRow);

    for (let i = 0; i < floorCount; i += 1) {
      const row = blankRow();
      row[0] = i + 1;
      row[1] = floorLabel(i);
      matrix.push(row);
    }

    const totalRow = blankRow();
    totalRow[0] = "TOTAL";
    matrix.push(totalRow);
  });

  return matrix.length > 0 ? matrix : [["No data"]];
}

const buildBoqMatrix = (raw, project) => {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.boqs)
      ? raw.boqs
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : "";
  };

  const projectName = String(project?.project_name || project?.name || "BOQ").trim();
  const woNumber = String(project?.wo_number || "").trim();

  const matrix = [];
  matrix.push([projectName.toUpperCase(), "", "", "", "", ""]);
  matrix.push([woNumber ? `WO NO - ${woNumber}` : "", "", "", "", "", ""]);

  let lastCategory = null;
  arr.forEach((row) => {
    if (!isPlainObject(row)) return;
    const category = String(row.category ?? "").trim();
    if (category && category !== lastCategory) {
      const m = /^([A-Z])\.\s*(.+)$/.exec(category);
      const sr = m ? `${m[1]}.` : "";
      const desc = m ? m[2] : category;
      matrix.push([sr, desc, "", "", "", ""]);
      matrix.push(["SR NO.", "ITEM DESCRIPTION", "UNIT", "QTY", "RATE", "AMOUNT"]);
      lastCategory = category;
    }

    matrix.push([
      row.item_code ?? row.code ?? "",
      wrapCellText(row.description ?? ""),
      row.unit ?? "",
      toNum(row.quantity),
      toNum(row.rate),
      toNum(row.amount),
    ]);
  });

  return matrix;
};

const buildSamplesMatrix = (raw, project) => {
  const samples = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

  const matrix = [];
  let first = true;

  samples.forEach((sample) => {
    if (!isPlainObject(sample)) return;
    const id = sample.sample_id ?? sample.id ?? "";
    const label = String(sample.work_done || sample.site_name || sample.building_name || (id ? `Sample #${id}` : "Sample")).trim();
    if (!label) return;

    if (!first) matrix.push(Array(12).fill(""));
    first = false;

    const building = String(sample.building_name || "").trim();
    const contractor = String(project?.client_name || "").trim();
    const workOrder = String(project?.wo_number || "").trim();

    matrix.push([`Sample - ${label}`, ...Array(11).fill("")]);
    matrix.push([`Building - ${building || "-"}`, ...Array(11).fill("")]);
    matrix.push([`Contractor - ${contractor || "-"}`, ...Array(11).fill("")]);
    matrix.push(["ABSTRACT SHEET", ...Array(11).fill("")]);
    matrix.push([`Work Order - ${workOrder || "-"}`, ...Array(11).fill("")]);
    matrix.push(["", ...Array(11).fill("")]);
    matrix.push([
      "Sl No",
      "Description",
      "Unit",
      "Qty",
      "BOQ",
      "",
      "Quantity",
      "",
      "",
      "Amount",
      "",
      "",
    ]);
    matrix.push(["", "", "", "", "Rate", "Amount", "Previous", "Present", "Total", "Previous", "Present", "Total"]);

    const rows = parseJsonArray(sample.item_description);
    rows.forEach((row, idx) => {
      if (!isPlainObject(row)) return;
      const qty = row.quantity ?? row.qty ?? row.req_qty ?? "";
      const amount = row.value ?? "";
      matrix.push([
        row.sr_no ?? row.sr ?? String(idx + 1),
        wrapCellText(row.description ?? row.material_description ?? row.item ?? ""),
        row.unit ?? row.uom ?? row.UOM ?? "",
        qty,
        "",
        amount,
        "",
        qty,
        qty,
        "",
        amount,
        amount,
      ]);
    });
  });

  return matrix.length > 0 ? matrix : [["No data"]];
};

const buildInitialWorkbookSheets = (_project) => {
  const usedNames = new Set();
  const rawToSheetName = new Map();
  const sheets = [];

  const addMatrix = (rawName, matrix) => {
    const name = sanitizeSheetName(rawName, usedNames);
    rawToSheetName.set(rawName, name);
    sheets.push({ rawName, name, matrix });
    return name;
  };

  ["WO", "Inv", "Abstract", "QTY", "CPVC"].forEach((rawName) =>
    addMatrix(rawName, placeholderMatrix(rawName)),
  );

  return { sheets, rawToSheetName };
};

const fetchProjectWorkbookData = async (projectId) => {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "https://api.festmate.in").replace(/\/$/, "");
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchJson = async (url) => {
    const res = await fetch(url, { headers });
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) {
      const error = body?.error || body?.message || res.statusText || "Request failed";
      throw new Error(error);
    }
    if (body && typeof body === "object" && "data" in body && "success" in body) {
      if (!body.success) throw new Error(body.error || "Request failed");
      return body.data;
    }
    return body;
  };

  const project = await fetchProjectData(projectId);

  const endpoints = [
    ["DeliveryChallans", `${baseUrl}/api/dc/project/${projectId}`],
    ["BOQ", `${baseUrl}/api/boq/project/${projectId}`],
    ["Samples", `${baseUrl}/api/sample/project/${projectId}`],
  ];

  const results = await Promise.allSettled(endpoints.map(([, url]) => fetchJson(url)));
  const workbook = { Project: project };

  endpoints.forEach(([key], idx) => {
    const r = results[idx];
    if (r.status === "fulfilled") {
      workbook[key] = r.value;
    } else {
      workbook[key] = [{ error: r.reason?.message || "Failed to fetch", endpoint: key }];
    }
  });

  workbook.Invoice = buildInvoiceMatrix(project);
  workbook.CPVC = buildCpvcMatrix(project);
  workbook.QTY = buildQtyMatrix(workbook.DeliveryChallans);
  workbook.BOQ = buildBoqMatrix(workbook.BOQ, project);
  workbook.Abstract = buildAbstractMatrix(project, workbook.DeliveryChallans);
  workbook.ItemTabs = buildItemTabsAfterCpvc(project, workbook.Samples, workbook.DeliveryChallans);

  return workbook;
};

export default function ProjectSpreadsheet({
  projectId,
  title = "Spreadsheet",
  workbookTitle,
  showHeader = true,
  showDownload = true,
  wrapperClassName,
  bodyClassName,
}) {
  const containerId = React.useId().replace(/:/g, "");
  const luckysheetRef = React.useRef(null);
  const depsRef = React.useRef({ dollar: null, luckysheet: null, pluginsLoaded: false });
  const sheetNameToRawRef = React.useRef(new Map());
  const sheetNameToSectionRef = React.useRef(new Map());
  const loadedSectionsRef = React.useRef(new Set());
  const loadingSectionRef = React.useRef(new Set());
  const recreatingRef = React.useRef(false);
  const projectDataRef = React.useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const initLuckysheet = React.useCallback(async (sheets, hook) => {
    if (!depsRef.current.dollar) {
      const jq = await import("jquery");
      const dollar = jq?.default || jq;
      depsRef.current.dollar = dollar;
      globalThis.$ = dollar;
      globalThis.jQuery = dollar;
      const mw = await import("jquery-mousewheel");
      const attachMousewheel = mw?.default || mw;
      if (typeof attachMousewheel === "function") {
        attachMousewheel(dollar);
      }
    }

    if (!depsRef.current.luckysheet) {
      const mod = await import("luckysheet");
      depsRef.current.luckysheet = mod?.default || mod;
    }

    if (!depsRef.current.pluginsLoaded) {
      await import("luckysheet/dist/plugins/js/plugin.js");
      depsRef.current.pluginsLoaded = true;
    }

    const luckysheet = depsRef.current.luckysheet;

    if (luckysheetRef.current && typeof luckysheetRef.current.destroy === "function") {
      try {
        luckysheetRef.current.destroy();
      } catch {
        null;
      }
    }

    const el = document.getElementById(containerId);
    if (el) el.innerHTML = "";

    luckysheetRef.current = luckysheet;
    luckysheet.create({
      container: containerId,
      title: workbookTitle ?? title,
      showtoolbar: true,
      showsheetbar: true,
      showinfobar: true,
      showstatisticBar: true,
      sheetFormulaBar: true,
      enableAddBackTop: false,
      allowEdit: true,
      data: sheets,
      hook,
    });
  }, [containerId, title, workbookTitle]);

  const fetchWorkbookSectionMatrices = React.useCallback(
    async (sectionKey) => {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || "https://api.festmate.in").replace(/\/$/, "");
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const fetchJson = async (url) => {
        const res = await fetch(url, { headers });
        const contentType = res.headers.get("content-type") || "";
        const body = contentType.includes("application/json") ? await res.json() : await res.text();
        if (!res.ok) {
          const error = body?.error || body?.message || res.statusText || "Request failed";
          throw new Error(error);
        }
        if (body && typeof body === "object" && "data" in body && "success" in body) {
          if (!body.success) throw new Error(body.error || "Request failed");
          return body.data;
        }
        return body;
      };

      if (sectionKey === "PurchaseOrders") {
        const pos = normalizeToArray(await fetchJson(`${baseUrl}/api/po/project/${projectId}`));
        const poRows = pos.map((po) => {
          if (!isPlainObject(po)) return po;
          const { items, ...rest } = po;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        return new Map([["PurchaseOrders", datasetToMatrix(poRows)]]);
      }

      if (sectionKey === "DeliveryChallans") {
        const dcs = normalizeToArray(await fetchJson(`${baseUrl}/api/dc/project/${projectId}`));
        const dcRows = dcs.map((dc) => {
          if (!isPlainObject(dc)) return dc;
          const { items, ...rest } = dc;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        return new Map([["DeliveryChallans", datasetToMatrix(dcRows)]]);
      }

      if (sectionKey === "BOQ") {
        const raw = await fetchJson(`${baseUrl}/api/boq/project/${projectId}`);
        let project = projectDataRef.current;
        if (!project) {
          try {
            project = await fetchProjectData(projectId);
            projectDataRef.current = project;
          } catch {
            project = null;
          }
        }
        return new Map([["WO", buildBoqMatrix(raw, project)]]);
      }

      if (sectionKey === "Invoice") {
        let project = projectDataRef.current;
        if (!project) {
          try {
            project = await fetchProjectData(projectId);
            projectDataRef.current = project;
          } catch {
            project = null;
          }
        }
        return new Map([["Inv", buildInvoiceMatrix(project)]]);
      }

      if (sectionKey === "CPVC") {
        let project = projectDataRef.current;
        if (!project) {
          try {
            project = await fetchProjectData(projectId);
            projectDataRef.current = project;
          } catch {
            project = null;
          }
        }
        return new Map([["CPVC", buildCpvcMatrix(project)]]);
      }

      if (sectionKey === "QTY") {
        const dcs = await fetchJson(`${baseUrl}/api/dc/project/${projectId}`);
        return new Map([["QTY", buildQtyMatrix(dcs)]]);
      }

      if (sectionKey === "Abstract") {
        const dcs = await fetchJson(`${baseUrl}/api/dc/project/${projectId}`);
        let project = projectDataRef.current;
        if (!project) {
          try {
            project = await fetchProjectData(projectId);
            projectDataRef.current = project;
          } catch {
            project = null;
          }
        }
        return new Map([["Abstract", buildAbstractMatrix(project, dcs)]]);
      }

      if (sectionKey === "MIR") {
        const mirs = normalizeToArray(await fetchJson(`${baseUrl}/api/mir/project/${projectId}`));
        const mirRows = mirs.map((mir) => {
          if (!isPlainObject(mir)) return mir;
          const { items, dynamic_field, ...rest } = mir;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        return new Map([["MIR", datasetToMatrix(mirRows)]]);
      }

      if (sectionKey === "ITR") {
        const itrs = await fetchJson(`${baseUrl}/api/itr/project/${projectId}`);
        return new Map([["ITR", datasetToMatrix(itrs)]]);
      }

      if (sectionKey === "Samples") {
        const samples = await fetchJson(`${baseUrl}/api/sample/project/${projectId}`);
        let project = projectDataRef.current;
        if (!project) {
          try {
            project = await fetchProjectData(projectId);
            projectDataRef.current = project;
          } catch {
            project = null;
          }
        }
        return new Map([["Abstract", buildSamplesMatrix(samples, project)]]);
      }

      if (sectionKey === "Inventory") {
        const inventory = await fetchJson(`${baseUrl}/api/inventory/project/${projectId}`);
        return new Map([["Inventory", datasetToMatrix(inventory)]]);
      }

      if (sectionKey === "Vendors") {
        const vendors = normalizeToArray(await fetchJson(`${baseUrl}/api/vendors/project/${projectId}`));
        return new Map([["Vendors", datasetToMatrix(vendors)]]);
      }

      return new Map();
    },
    [projectId],
  );

  const handleSheetActivate = React.useCallback(
    async (sheetIndex) => {
      if (recreatingRef.current) return;
      const luckysheet = luckysheetRef.current;
      if (!luckysheet || typeof luckysheet.getAllSheets !== "function") return;

      const sheets = luckysheet.getAllSheets() || [];
      const sheet = sheets[sheetIndex];
      const sheetName = sheet?.name;
      if (!sheetName) return;

      const rawName = sheetNameToRawRef.current.get(sheetName) ?? null;
      const sectionKey = sheetNameToSectionRef.current.get(sheetName) ?? sectionKeyForRawSheetName(rawName);
      if (!sectionKey || sectionKey === "Project" || sectionKey === "Summary") return;
      if (loadedSectionsRef.current.has(sectionKey) || loadingSectionRef.current.has(sectionKey)) return;

      loadingSectionRef.current.add(sectionKey);
      setLoading(true);
      setError("");
      try {
        const matrices = await fetchWorkbookSectionMatrices(sectionKey);

        const updatedSheets = sheets.map((s, idx) => {
          const next = { ...s, status: idx === sheetIndex ? 1 : 0 };
          const raw = sheetNameToRawRef.current.get(s?.name);
          if (!raw || !matrices.has(raw)) return next;
          const matrix = matrices.get(raw);
          const rebuilt = buildLuckySheetFromMatrix(next.name, matrix, Number(next.order ?? idx));
          return { ...next, row: rebuilt.row, column: rebuilt.column, celldata: rebuilt.celldata, config: rebuilt.config, data: [] };
        });

        recreatingRef.current = true;
        try {
          await initLuckysheet(updatedSheets, {
            sheetActivateAfter: (i) => {
              handleSheetActivate(i);
            },
          });
        } finally {
          recreatingRef.current = false;
        }

        loadedSectionsRef.current.add(sectionKey);
      } catch (e) {
        setError(e?.message || "Failed to load sheet data");
      } finally {
        loadingSectionRef.current.delete(sectionKey);
        setLoading(false);
      }
    },
    [fetchWorkbookSectionMatrices, initLuckysheet],
  );

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        loadedSectionsRef.current = new Set();
        loadingSectionRef.current = new Set();
        sheetNameToRawRef.current = new Map();
        sheetNameToSectionRef.current = new Map();

        const project = await fetchProjectData(projectId);
        projectDataRef.current = project;
        const { sheets, rawToSheetName } = buildInitialWorkbookSheets(project);

        sheets.forEach((s) => {
          sheetNameToRawRef.current.set(s.name, s.rawName);
          sheetNameToSectionRef.current.set(s.name, sectionKeyForRawSheetName(s.rawName));
        });

        rawToSheetName.forEach((sheetName, rawName) => {
          sheetNameToRawRef.current.set(sheetName, rawName);
          sheetNameToSectionRef.current.set(sheetName, sectionKeyForRawSheetName(rawName));
        });

        const luckySheets = sheets.map((s, i) => buildLuckySheetFromMatrix(s.name, s.matrix, i));
        if (!cancelled) {
          await initLuckysheet(luckySheets, {
            sheetActivate: (i) => {
              handleSheetActivate(i);
            },
            sheetActivateAfter: (i) => {
              handleSheetActivate(i);
            },
          });
          // Attempt eager data load for all sections so tabs show fields immediately
          try {
            const fullWorkbook = await fetchProjectWorkbookData(projectId);
            const fullSheets = buildWorkbookSheetMatrices(fullWorkbook).map((s, i) =>
              buildLuckySheetFromMatrix(s.name, s.matrix, i),
            );
            await initLuckysheet(fullSheets, {
              sheetActivate: (i) => {
                handleSheetActivate(i);
              },
              sheetActivateAfter: (i) => {
                handleSheetActivate(i);
              },
            });
          } catch {
            null;
          }
          // No extra tabs beyond sidebar; don't mark any default section as loaded
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load project data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (projectId) load();
    return () => {
      cancelled = true;
      if (luckysheetRef.current?.destroy) {
        try {
          luckysheetRef.current.destroy();
        } catch {
          null;
        }
      }
    };
  }, [projectId, initLuckysheet, handleSheetActivate]);

  const downloadExcel = React.useCallback(() => {
    const luckysheet = luckysheetRef.current;
    const getter =
      luckysheet?.getLuckysheetfile ||
      luckysheet?.getLuckysheetFile ||
      luckysheet?.getLuckysheetfile?.bind(luckysheet) ||
      null;

    const file =
      typeof getter === "function"
        ? getter()
        : typeof luckysheet?.getAllSheets === "function"
          ? luckysheet.getAllSheets()
          : null;

    if (!file) return;
    const workbook = buildWorkbookFromLuckysheetFile(file);
    const filename = `project-${projectId}-workbook.xlsx`;
    XLSX.writeFile(workbook, filename, { compression: true });
  }, [projectId]);

  const body = error ? (
    <div className="p-6 text-sm text-destructive">{error}</div>
  ) : (
    <div className={bodyClassName ?? "relative h-[calc(100vh-12rem)] w-full"}>
      {loading && <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm" />}
      <div id={containerId} className="h-full w-full" />
    </div>
  );

  if (!showHeader) {
    return (
      <div className={wrapperClassName ?? "h-full w-full"}>
        {showDownload && (
          <div className="fixed right-4 top-4 z-50">
            <Button variant="outline" onClick={downloadExcel} disabled={loading || Boolean(error)}>
              Download Excel
            </Button>
          </div>
        )}
        {body}
      </div>
    );
  }

  return (
    <Card className={wrapperClassName ?? "h-[calc(100vh-8rem)]"}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {showDownload && (
          <Button onClick={downloadExcel} disabled={loading || Boolean(error)}>
            Download Excel
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {body}
      </CardContent>
    </Card>
  );
}
