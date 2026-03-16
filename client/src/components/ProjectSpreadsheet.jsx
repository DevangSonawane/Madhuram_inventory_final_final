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

  const project = workbookData?.Project && isPlainObject(workbookData.Project) ? workbookData.Project : null;
  if (project) {
    const excluded = new Set(["pr_po_tracking", "samples", "ml_management"]);
    const flattened = flattenRecord(project, { maxDepth: 2, excludeKeys: excluded });
    addSheet("Project", [flattened]);
  } else {
    addSheet("Project", [workbookData?.Project ?? "No project data"]);
  }

  const moduleOrder = [
    ["Project PR_PO_Tracking", workbookData?.Project_PR_PO_Tracking],
    ["Project Samples", workbookData?.Project_Samples],
    ["Project ML_Management", workbookData?.Project_ML_Management],
    ["PurchaseOrders", workbookData?.PurchaseOrders],
    ["PurchaseOrder_Items", workbookData?.PurchaseOrder_Items],
    ["DeliveryChallans", workbookData?.DeliveryChallans],
    ["DeliveryChallan_Items", workbookData?.DeliveryChallan_Items],
    ["BOQ", workbookData?.BOQ],
    ["MIR", workbookData?.MIR],
    ["MIR_Items", workbookData?.MIR_Items],
    ["MIR_DynamicFields", workbookData?.MIR_DynamicFields],
    ["ITR", workbookData?.ITR],
    ["Samples", workbookData?.Samples],
    ["Sample_ItemDescription", workbookData?.Sample_ItemDescription],
    ["Sample_AddFields", workbookData?.Sample_AddFields],
    ["Inventory", workbookData?.Inventory],
    ["Vendors", workbookData?.Vendors],
    ["VendorPriceLists", workbookData?.VendorPriceLists],
    ["VendorPriceListItems", workbookData?.VendorPriceListItems],
  ];

  moduleOrder.forEach(([name, dataset]) => {
    if (dataset == null) return;
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

  const summaryRows = [];
  if (project?.project_name != null) summaryRows.push({ Metric: "Project Name", Value: project.project_name });
  if (project?.client_name != null) summaryRows.push({ Metric: "Client", Value: project.client_name });
  if (project?.location != null) summaryRows.push({ Metric: "Location", Value: project.location });
  if (project?.wo_number != null) summaryRows.push({ Metric: "WO Number", Value: project.wo_number });

  const purchaseOrdersSheet = Array.from(matrices.keys()).find((k) => k.toLowerCase() === "purchaseorders");
  const mirSheet = Array.from(matrices.keys()).find((k) => k.toLowerCase() === "mir");
  const itrSheet = Array.from(matrices.keys()).find((k) => k.toLowerCase() === "itr");

  if (purchaseOrdersSheet) {
    summaryRows.push({ Metric: "Total POs", Value: { __formula: countRowsFormula(purchaseOrdersSheet) } });
    summaryRows.push({ Metric: "First PO Ref", Value: { __formula: firstColumnFormulaRef(purchaseOrdersSheet) } });
  }
  if (mirSheet) {
    summaryRows.push({ Metric: "Total MIR", Value: { __formula: countRowsFormula(mirSheet) } });
    summaryRows.push({ Metric: "First MIR Ref", Value: { __formula: firstColumnFormulaRef(mirSheet) } });
  }
  if (itrSheet) {
    summaryRows.push({ Metric: "Total ITR", Value: { __formula: countRowsFormula(itrSheet) } });
  }

  if (summaryRows.length > 0) {
    const summaryMatrix = rowsToMatrix(summaryRows.map((r) => ({ Metric: r.Metric, Value: r.Value })));
    const summaryName = sanitizeSheetName("Summary", usedNames);
    matrices.set(summaryName, summaryMatrix);
  }

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

  const urls = [`${baseUrl}/api/project/${projectId}`, `${baseUrl}/api/projects/${projectId}`];
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
  if (name === "Project" || name.startsWith("Project ")) return "Project";
  if (name === "PurchaseOrders" || name === "PurchaseOrder_Items") return "PurchaseOrders";
  if (name === "DeliveryChallans" || name === "DeliveryChallan_Items") return "DeliveryChallans";
  if (name === "BOQ") return "BOQ";
  if (name === "MIR" || name === "MIR_Items" || name === "MIR_DynamicFields") return "MIR";
  if (name === "ITR") return "ITR";
  if (name === "Samples" || name === "Sample_ItemDescription" || name === "Sample_AddFields") return "Samples";
  if (name === "Inventory") return "Inventory";
  if (name === "Vendors" || name === "VendorPriceLists" || name === "VendorPriceListItems") return "Vendors";
  if (name === "Summary") return "Summary";
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

const buildInitialWorkbookSheets = (project) => {
  const usedNames = new Set();
  const rawToSheetName = new Map();
  const sheets = [];

  const addMatrix = (rawName, matrix) => {
    const name = sanitizeSheetName(rawName, usedNames);
    rawToSheetName.set(rawName, name);
    sheets.push({ rawName, name, matrix });
    return name;
  };

  if (project && isPlainObject(project)) {
    const excluded = new Set(["pr_po_tracking", "samples", "ml_management"]);
    const flattened = flattenRecord(project, { maxDepth: 2, excludeKeys: excluded });
    addMatrix("Project", rowsToMatrix([flattened]));
  } else {
    addMatrix("Project", rowsToMatrix([project ?? "No project data"]));
  }

  addMatrix("Project PR_PO_Tracking", datasetToMatrix(normalizeToArray(project?.pr_po_tracking)));
  addMatrix("Project Samples", datasetToMatrix(normalizeToArray(project?.samples)));
  addMatrix(
    "Project ML_Management",
    datasetToMatrix(project?.ml_management && isPlainObject(project.ml_management) ? project.ml_management : { ml_task: project?.ml_management ?? "" }),
  );

  [
    "PurchaseOrders",
    "PurchaseOrder_Items",
    "DeliveryChallans",
    "DeliveryChallan_Items",
    "BOQ",
    "MIR",
    "MIR_Items",
    "MIR_DynamicFields",
    "ITR",
    "Samples",
    "Sample_ItemDescription",
    "Sample_AddFields",
    "Inventory",
    "Vendors",
    "VendorPriceLists",
    "VendorPriceListItems",
  ].forEach((rawName) => addMatrix(rawName, placeholderMatrix(rawName)));

  const summaryRows = [];
  if (project?.project_name != null) summaryRows.push({ Metric: "Project Name", Value: project.project_name });
  if (project?.client_name != null) summaryRows.push({ Metric: "Client", Value: project.client_name });
  if (project?.location != null) summaryRows.push({ Metric: "Location", Value: project.location });
  if (project?.wo_number != null) summaryRows.push({ Metric: "WO Number", Value: project.wo_number });

  const purchaseOrdersSheet = rawToSheetName.get("PurchaseOrders");
  const mirSheet = rawToSheetName.get("MIR");
  const itrSheet = rawToSheetName.get("ITR");

  if (purchaseOrdersSheet) {
    summaryRows.push({ Metric: "Total POs", Value: { __formula: countRowsFormula(purchaseOrdersSheet) } });
    summaryRows.push({ Metric: "First PO Ref", Value: { __formula: firstColumnFormulaRef(purchaseOrdersSheet) } });
  }
  if (mirSheet) {
    summaryRows.push({ Metric: "Total MIR", Value: { __formula: countRowsFormula(mirSheet) } });
    summaryRows.push({ Metric: "First MIR Ref", Value: { __formula: firstColumnFormulaRef(mirSheet) } });
  }
  if (itrSheet) {
    summaryRows.push({ Metric: "Total ITR", Value: { __formula: countRowsFormula(itrSheet) } });
  }

  addMatrix("Summary", rowsToMatrix(summaryRows.length ? summaryRows : [{ Metric: "Summary", Value: "No data" }]));

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
    ["PurchaseOrders", `${baseUrl}/api/po/project/${projectId}`],
    ["DeliveryChallans", `${baseUrl}/api/dc/project/${projectId}`],
    ["BOQ", `${baseUrl}/api/boq/project/${projectId}`],
    ["MIR", `${baseUrl}/api/mir/project/${projectId}`],
    ["ITR", `${baseUrl}/api/itr/project/${projectId}`],
    ["Samples", `${baseUrl}/api/sample/project/${projectId}`],
    ["Inventory", `${baseUrl}/api/inventory/project/${projectId}`],
    ["Vendors", `${baseUrl}/api/vendors/project/${projectId}`],
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

  workbook.Project_PR_PO_Tracking = normalizeToArray(project?.pr_po_tracking);
  workbook.Project_Samples = normalizeToArray(project?.samples);
  workbook.Project_ML_Management = project?.ml_management && isPlainObject(project.ml_management) ? project.ml_management : { ml_task: project?.ml_management ?? "" };

  const pos = normalizeToArray(workbook.PurchaseOrders);
  workbook.PurchaseOrders = pos.map((po) => {
    if (!isPlainObject(po)) return po;
    const { items, ...rest } = po;
    return flattenRecord(rest, { maxDepth: 2 });
  });
  workbook.PurchaseOrder_Items = pos.flatMap((po) => {
    if (!isPlainObject(po)) return [];
    const poId = po.po_id ?? null;
    const projectIdValue = po.project_id ?? null;
    const items = normalizeToArray(po.items);
    return items.map((item, idx) => {
      const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      return { po_id: poId, project_id: projectIdValue, item_index: idx + 1, ...row };
    });
  });

  const dcs = normalizeToArray(workbook.DeliveryChallans);
  workbook.DeliveryChallans = dcs.map((dc) => {
    if (!isPlainObject(dc)) return dc;
    const { items, ...rest } = dc;
    return flattenRecord(rest, { maxDepth: 2 });
  });
  workbook.DeliveryChallan_Items = dcs.flatMap((dc) => {
    if (!isPlainObject(dc)) return [];
    const dcId = dc.dc_id ?? null;
    const projectIdValue = dc.project_id ?? null;
    const poId = dc.po_id ?? null;
    const items = normalizeToArray(dc.items);
    return items.map((item, idx) => {
      const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      return { dc_id: dcId, project_id: projectIdValue, po_id: poId, item_index: idx + 1, ...row };
    });
  });

  const mirs = normalizeToArray(workbook.MIR);
  workbook.MIR = mirs.map((mir) => {
    if (!isPlainObject(mir)) return mir;
    const { items, dynamic_field, ...rest } = mir;
    return flattenRecord(rest, { maxDepth: 2 });
  });
  workbook.MIR_Items = mirs.flatMap((mir) => {
    if (!isPlainObject(mir)) return [];
    const mirId = mir.mir_id ?? null;
    const projectIdValue = mir.project_id ?? null;
    const poId = mir.po_id ?? null;
    const items = normalizeToArray(mir.items);
    return items.map((item, idx) => {
      const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      return { mir_id: mirId, project_id: projectIdValue, po_id: poId, item_index: idx + 1, ...row };
    });
  });
  workbook.MIR_DynamicFields = mirs.flatMap((mir) => {
    if (!isPlainObject(mir)) return [];
    const mirId = mir.mir_id ?? null;
    const projectIdValue = mir.project_id ?? null;
    const fields = normalizeToArray(mir.dynamic_field);
    return fields.map((f, idx) => {
      const row = isPlainObject(f) ? flattenRecord(f, { maxDepth: 2 }) : { value: f };
      return { mir_id: mirId, project_id: projectIdValue, field_index: idx + 1, ...row };
    });
  });

  const samples = normalizeToArray(workbook.Samples);
  workbook.Samples = samples.map((s) => {
    if (!isPlainObject(s)) return s;
    const { item_description, add_fields, ...rest } = s;
    return flattenRecord(rest, { maxDepth: 2 });
  });
  workbook.Sample_ItemDescription = samples.flatMap((s) => {
    if (!isPlainObject(s)) return [];
    const sampleId = s.sample_id ?? null;
    const projectIdValue = s.project_id ?? null;
    const items = normalizeToArray(s.item_description);
    return items.map((item, idx) => {
      const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      return { sample_id: sampleId, project_id: projectIdValue, item_index: idx + 1, ...row };
    });
  });
  workbook.Sample_AddFields = samples.flatMap((s) => {
    if (!isPlainObject(s)) return [];
    const sampleId = s.sample_id ?? null;
    const projectIdValue = s.project_id ?? null;
    const items = normalizeToArray(s.add_fields);
    return items.map((item, idx) => {
      const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      return { sample_id: sampleId, project_id: projectIdValue, field_index: idx + 1, ...row };
    });
  });

  const vendors = normalizeToArray(workbook.Vendors);
  const priceListIds = vendors.flatMap((v) => (isPlainObject(v) ? normalizeToArray(v.price_list_ids) : [])).filter((id) => id != null);
  const uniquePriceListIds = Array.from(new Set(priceListIds.map((id) => String(id)))).slice(0, 50);

  const priceListDetails = await Promise.allSettled(
    uniquePriceListIds.map((id) => fetchJson(`${baseUrl}/api/vendor-price-list/${id}`)),
  );

  const vendorIdByPriceListId = new Map();
  vendors.forEach((v) => {
    if (!isPlainObject(v)) return;
    normalizeToArray(v.price_list_ids).forEach((id) => {
      if (id == null) return;
      vendorIdByPriceListId.set(String(id), v.vendor_id ?? null);
    });
  });

  const priceLists = [];
  const priceListItems = [];
  priceListDetails.forEach((r, idx) => {
    const priceListId = uniquePriceListIds[idx];
    if (r.status !== "fulfilled") {
      priceLists.push({ price_list_id: priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? null, error: r.reason?.message || "Failed to fetch price list" });
      return;
    }
    const row = r.value;
    if (!isPlainObject(row)) {
      priceLists.push({ price_list_id: priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? null, value: row });
      return;
    }
    const { items, ...rest } = row;
    priceLists.push({ vendor_id: vendorIdByPriceListId.get(priceListId) ?? row.vendor_id ?? null, ...flattenRecord(rest, { maxDepth: 2 }) });
    normalizeToArray(items).forEach((item, itemIdx) => {
      const flatItem = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
      priceListItems.push({ price_list_id: row.price_list_id ?? priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? row.vendor_id ?? null, item_index: itemIdx + 1, ...flatItem });
    });
  });

  workbook.VendorPriceLists = priceLists;
  workbook.VendorPriceListItems = priceListItems;

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
        const itemRows = pos.flatMap((po) => {
          if (!isPlainObject(po)) return [];
          const poId = po.po_id ?? null;
          const projectIdValue = po.project_id ?? null;
          const items = normalizeToArray(po.items);
          return items.map((item, idx) => {
            const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            return { po_id: poId, project_id: projectIdValue, item_index: idx + 1, ...row };
          });
        });
        return new Map([
          ["PurchaseOrders", datasetToMatrix(poRows)],
          ["PurchaseOrder_Items", datasetToMatrix(itemRows)],
        ]);
      }

      if (sectionKey === "DeliveryChallans") {
        const dcs = normalizeToArray(await fetchJson(`${baseUrl}/api/dc/project/${projectId}`));
        const dcRows = dcs.map((dc) => {
          if (!isPlainObject(dc)) return dc;
          const { items, ...rest } = dc;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        const itemRows = dcs.flatMap((dc) => {
          if (!isPlainObject(dc)) return [];
          const dcId = dc.dc_id ?? null;
          const projectIdValue = dc.project_id ?? null;
          const poId = dc.po_id ?? null;
          const items = normalizeToArray(dc.items);
          return items.map((item, idx) => {
            const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            return { dc_id: dcId, project_id: projectIdValue, po_id: poId, item_index: idx + 1, ...row };
          });
        });
        return new Map([
          ["DeliveryChallans", datasetToMatrix(dcRows)],
          ["DeliveryChallan_Items", datasetToMatrix(itemRows)],
        ]);
      }

      if (sectionKey === "BOQ") {
        const boq = await fetchJson(`${baseUrl}/api/boq/project/${projectId}`);
        return new Map([["BOQ", datasetToMatrix(boq)]]);
      }

      if (sectionKey === "MIR") {
        const mirs = normalizeToArray(await fetchJson(`${baseUrl}/api/mir/project/${projectId}`));
        const mirRows = mirs.map((mir) => {
          if (!isPlainObject(mir)) return mir;
          const { items, dynamic_field, ...rest } = mir;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        const itemRows = mirs.flatMap((mir) => {
          if (!isPlainObject(mir)) return [];
          const mirId = mir.mir_id ?? null;
          const projectIdValue = mir.project_id ?? null;
          const poId = mir.po_id ?? null;
          const items = normalizeToArray(mir.items);
          return items.map((item, idx) => {
            const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            return { mir_id: mirId, project_id: projectIdValue, po_id: poId, item_index: idx + 1, ...row };
          });
        });
        const fieldRows = mirs.flatMap((mir) => {
          if (!isPlainObject(mir)) return [];
          const mirId = mir.mir_id ?? null;
          const projectIdValue = mir.project_id ?? null;
          const fields = normalizeToArray(mir.dynamic_field);
          return fields.map((f, idx) => {
            const row = isPlainObject(f) ? flattenRecord(f, { maxDepth: 2 }) : { value: f };
            return { mir_id: mirId, project_id: projectIdValue, field_index: idx + 1, ...row };
          });
        });
        return new Map([
          ["MIR", datasetToMatrix(mirRows)],
          ["MIR_Items", datasetToMatrix(itemRows)],
          ["MIR_DynamicFields", datasetToMatrix(fieldRows)],
        ]);
      }

      if (sectionKey === "ITR") {
        const itrs = await fetchJson(`${baseUrl}/api/itr/project/${projectId}`);
        return new Map([["ITR", datasetToMatrix(itrs)]]);
      }

      if (sectionKey === "Samples") {
        const samples = normalizeToArray(await fetchJson(`${baseUrl}/api/sample/project/${projectId}`));
        const sampleRows = samples.map((s) => {
          if (!isPlainObject(s)) return s;
          const { item_description, add_fields, ...rest } = s;
          return flattenRecord(rest, { maxDepth: 2 });
        });
        const itemRows = samples.flatMap((s) => {
          if (!isPlainObject(s)) return [];
          const sampleId = s.sample_id ?? null;
          const projectIdValue = s.project_id ?? null;
          const items = normalizeToArray(s.item_description);
          return items.map((item, idx) => {
            const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            return { sample_id: sampleId, project_id: projectIdValue, item_index: idx + 1, ...row };
          });
        });
        const fieldRows = samples.flatMap((s) => {
          if (!isPlainObject(s)) return [];
          const sampleId = s.sample_id ?? null;
          const projectIdValue = s.project_id ?? null;
          const items = normalizeToArray(s.add_fields);
          return items.map((item, idx) => {
            const row = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            return { sample_id: sampleId, project_id: projectIdValue, field_index: idx + 1, ...row };
          });
        });
        return new Map([
          ["Samples", datasetToMatrix(sampleRows)],
          ["Sample_ItemDescription", datasetToMatrix(itemRows)],
          ["Sample_AddFields", datasetToMatrix(fieldRows)],
        ]);
      }

      if (sectionKey === "Inventory") {
        const inventory = await fetchJson(`${baseUrl}/api/inventory/project/${projectId}`);
        return new Map([["Inventory", datasetToMatrix(inventory)]]);
      }

      if (sectionKey === "Vendors") {
        const vendors = normalizeToArray(await fetchJson(`${baseUrl}/api/vendors/project/${projectId}`));
        const priceListIds = vendors.flatMap((v) => (isPlainObject(v) ? normalizeToArray(v.price_list_ids) : [])).filter((id) => id != null);
        const uniquePriceListIds = Array.from(new Set(priceListIds.map((id) => String(id)))).slice(0, 50);
        const priceListDetails = await Promise.allSettled(uniquePriceListIds.map((id) => fetchJson(`${baseUrl}/api/vendor-price-list/${id}`)));

        const vendorIdByPriceListId = new Map();
        vendors.forEach((v) => {
          if (!isPlainObject(v)) return;
          normalizeToArray(v.price_list_ids).forEach((id) => {
            if (id == null) return;
            vendorIdByPriceListId.set(String(id), v.vendor_id ?? null);
          });
        });

        const priceLists = [];
        const priceListItems = [];
        priceListDetails.forEach((r, idx) => {
          const priceListId = uniquePriceListIds[idx];
          if (r.status !== "fulfilled") {
            priceLists.push({ price_list_id: priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? null, error: r.reason?.message || "Failed to fetch price list" });
            return;
          }
          const row = r.value;
          if (!isPlainObject(row)) {
            priceLists.push({ price_list_id: priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? null, value: row });
            return;
          }
          const { items, ...rest } = row;
          priceLists.push({ vendor_id: vendorIdByPriceListId.get(priceListId) ?? row.vendor_id ?? null, ...flattenRecord(rest, { maxDepth: 2 }) });
          normalizeToArray(items).forEach((item, itemIdx) => {
            const flatItem = isPlainObject(item) ? flattenRecord(item, { maxDepth: 2 }) : { value: item };
            priceListItems.push({ price_list_id: row.price_list_id ?? priceListId, vendor_id: vendorIdByPriceListId.get(priceListId) ?? row.vendor_id ?? null, item_index: itemIdx + 1, ...flatItem });
          });
        });

        return new Map([
          ["Vendors", datasetToMatrix(vendors)],
          ["VendorPriceLists", datasetToMatrix(priceLists)],
          ["VendorPriceListItems", datasetToMatrix(priceListItems)],
        ]);
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
          const rebuilt = matrixToLuckySheet(next.name, matrix, Number(next.order ?? idx));
          return { ...next, row: rebuilt.row, column: rebuilt.column, celldata: rebuilt.celldata, data: [] };
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
        const { sheets, rawToSheetName } = buildInitialWorkbookSheets(project);

        sheets.forEach((s) => {
          sheetNameToRawRef.current.set(s.name, s.rawName);
          sheetNameToSectionRef.current.set(s.name, sectionKeyForRawSheetName(s.rawName));
        });

        rawToSheetName.forEach((sheetName, rawName) => {
          sheetNameToRawRef.current.set(sheetName, rawName);
          sheetNameToSectionRef.current.set(sheetName, sectionKeyForRawSheetName(rawName));
        });

        const luckySheets = sheets.map((s, i) => matrixToLuckySheet(s.name, s.matrix, i));
        if (!cancelled) {
          await initLuckysheet(luckySheets, {
            sheetActivateAfter: (i) => {
              handleSheetActivate(i);
            },
          });
          loadedSectionsRef.current.add("Project");
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
    return <div className={wrapperClassName ?? "h-full w-full"}>{body}</div>;
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
