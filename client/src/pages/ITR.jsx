import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, PencilLine, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdfUtils";
import { DISCIPLINE_OPTIONS, EMPTY_ITR, YES_NO_NA_OPTIONS } from "@/pages/itrShared";
import { api } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";

const STORAGE_KEY = "itrPreview";
const RECENT_KEY = "itrRecent";

const SAMPLE_EXTRACTED = {
  ...EMPTY_ITR,
  projectName: "Premier Signet Tow 1 - Plumbing",
  projectCode: "",
  clientEmployer: "Macrotech Developers Limited",
  pmcEngineer: "Mr. Vikas Pawale",
  contractor: "Madhuram Enterprises",
  vendorCode: "30010937",
  materialCode: "995462",
  itrRefNo: "ITR-SIGNET-1-ME-PR-PL-047",
  submittedBy: "Madhuram Enterprises",
  contractorPart: {
    ...EMPTY_ITR.contractorPart,
    locationRef: "Signet 1 - Plumbing",
    floorLevel: "G/Floor",
    areaRef: "Shaft",
    descriptionOfWorks: "Extra work done - rainwater pipe\n75 MM SWR pipe type 'B' = 3 MTR\n110 MM SWR pipe type 'B' = 14 MTR",
  },
  source: "Extracted",
  sourceFileName: "WIR 47- EXTRA WRK .pdf",
};

const LABEL_MAP = [
  { re: /project\s*name/i, path: "projectName" },
  { re: /project\s*code/i, path: "projectCode" },
  { re: /client\s*\/\s*employer/i, path: "clientEmployer" },
  { re: /pmc\s*\/\s*engineer/i, path: "pmcEngineer" },
  { re: /contractor/i, path: "contractor" },
  { re: /vendor\s*code/i, path: "vendorCode" },
  { re: /material\s*code/i, path: "materialCode" },
  { re: /(wir\s*\/\s*itr\s*ref\.?\s*no|itr\s*ref\.?\s*no)/i, path: "itrRefNo" },
  { re: /wir\s*\/\s*itr\s*submission/i, path: "wirItrSubmissionDateTime" },
  { re: /inspection\s*\(date\s*&\s*time\)/i, path: "inspectionDateTime" },
  { re: /wir\s*\/\s*itr\s*submitted\s*to/i, path: "submittedTo" },
  { re: /wir\s*\/\s*itr\s*submitted\s*by/i, path: "submittedBy" },
  { re: /tower\s*\/\s*block\s*ref/i, path: "contractorPart.locationRef" },
  { re: /floor\s*level/i, path: "contractorPart.floorLevel" },
  { re: /grid\s*reference/i, path: "contractorPart.gridReference" },
  { re: /room\s*\/\s*area\s*ref/i, path: "contractorPart.areaRef" },
  { re: /previous\s*qty/i, path: "contractorPart.measurement.previousQty" },
  { re: /current\s*qty/i, path: "contractorPart.measurement.currentQty" },
  { re: /cumulative\s*qty/i, path: "contractorPart.measurement.cumulativeQty" },
];

const ATTACHMENT_LABELS = [
  { re: /drawing\s*attached/i, path: "contractorPart.attachments.drawingAttached" },
  { re: /attached\s*test\s*certificates/i, path: "contractorPart.attachments.attachedTestCerts" },
  { re: /specific\s*drawing\s*ref/i, path: "contractorPart.attachments.specificDrawingRefNo" },
  { re: /method\s*statement\s*att/i, path: "contractorPart.attachments.methodStatementAttached" },
  { re: /checklist\s*sheet\s*att/i, path: "contractorPart.attachments.checklistAttached" },
  { re: /joint\s*measurement\s*sheet\s*att/i, path: "contractorPart.attachments.jointMeasurementAttached" },
];

const normalizeSnakeKeys = (value) => {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => (entry && typeof entry === "object" ? normalizeSnakeKeys(entry) : entry));
  }
  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, val]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      acc[camelKey] = normalizeSnakeKeys(val);
      return acc;
    }, {});
  }
  return value;
};

const mapApiItrToForm = (rawItem = {}, normalizedItem = null) => {
  const normalized = normalizedItem || normalizeSnakeKeys(rawItem);
  const resolvedItrId =
    normalized.itrId ??
    normalized.itrID ??
    normalized.itr_id ??
    rawItem?.itr_id ??
    rawItem?.itrId ??
    normalized.id ??
    rawItem?.id ??
    null;
  const contractorPart = normalized.contractorPart || {};
  const contractorClearances = contractorPart.clearances || {};
  const disciplineField = Array.isArray(contractorPart.discipline)
    ? contractorPart.discipline
    : contractorPart.discipline
    ? [contractorPart.discipline]
    : [];

  const clearances = {
    ...EMPTY_ITR.contractorPart.clearances,
    ...contractorClearances,
    mep: { ...EMPTY_ITR.contractorPart.clearances.mep, ...contractorClearances.mep },
    surveyor: { ...EMPTY_ITR.contractorPart.clearances.surveyor, ...contractorClearances.surveyor },
    interface: { ...EMPTY_ITR.contractorPart.clearances.interface, ...contractorClearances.interface },
  };

  const contractorSection = {
    ...EMPTY_ITR.contractorPart,
    ...contractorPart,
    discipline: disciplineField,
    measurement: { ...EMPTY_ITR.contractorPart.measurement, ...contractorPart.measurement },
    attachments: { ...EMPTY_ITR.contractorPart.attachments, ...contractorPart.attachments },
    clearances,
  };

  const lodhaRaw = normalized.lodhaPmc || {};
  const lodhaSignOffs = {
    ...EMPTY_ITR.lodhaPmc.signOffs,
    ...lodhaRaw.signOffs,
    engineerManagerCivil: { ...EMPTY_ITR.lodhaPmc.signOffs.engineerManagerCivil, ...lodhaRaw.signOffs?.engineerManagerCivil },
    engineerManagerMep: { ...EMPTY_ITR.lodhaPmc.signOffs.engineerManagerMep, ...lodhaRaw.signOffs?.engineerManagerMep },
    towerIncharge: { ...EMPTY_ITR.lodhaPmc.signOffs.towerIncharge, ...lodhaRaw.signOffs?.towerIncharge },
    qaaDepartment: { ...EMPTY_ITR.lodhaPmc.signOffs.qaaDepartment, ...lodhaRaw.signOffs?.qaaDepartment },
  };

  const lodhaSection = {
    ...EMPTY_ITR.lodhaPmc,
    ...lodhaRaw,
    signOffs: lodhaSignOffs,
  };

  return {
    ...EMPTY_ITR,
    itr_id: resolvedItrId,
    projectName: normalized.projectName || normalized.project || "",
    projectCode: normalized.projectCode || "",
    clientEmployer: normalized.clientEmployer || normalized.clientName || normalized.client || "",
    pmcEngineer: normalized.pmcEngineer || normalized.pmc || "",
    contractor: normalized.contractor || "",
    vendorCode: normalized.vendorCode || "",
    materialCode: normalized.materialCode || "",
    itrRefNo: normalized.itrRefNo || normalized.itrRef || "",
    wirItrSubmissionDateTime: normalized.wirItrSubmissionDateTime || "",
    inspectionDateTime: normalized.inspectionDateTime || normalized.inspectionDate || "",
    submittedTo: normalized.submittedTo || "",
    submittedBy: normalized.submittedBy || "",
    contractorPart: contractorSection,
    lodhaPmc: lodhaSection,
    source: normalized.source || "Manual",
    sourceFileName: normalized.sourceFileName || normalized.sourceFile || "",
    title: normalized.title || EMPTY_ITR.title,
  };
};

const mapStatusFromApi = (normalizedItem = {}) => {
  const status = normalizedItem.status || normalizedItem.statusCode || normalizedItem.state || normalizedItem.itrStatus;
  if (status) return status;
  const submitted = normalizedItem.itrSubmitted ?? normalizedItem.submitted ?? normalizedItem.itrSubmited;
  if (submitted === true || submitted === "true") return "Submitted";
  if (submitted === false || submitted === "false") return "Draft";
  return "Submitted";
};

const mapApiItrToListItem = (rawItem) => {
  const normalized = normalizeSnakeKeys(rawItem);
  const formData = mapApiItrToForm(rawItem, normalized);
  const id = formData.itrRefNo || formData.itr_id || `ITR-${formData.itr_id || Date.now()}`;
  return {
    id,
    date: formData.inspectionDateTime || formData.wirItrSubmissionDateTime || normalized.createdAt || "",
    project: formData.projectName || "",
    location: formData.contractorPart.areaRef || formData.contractorPart.floorLevel || formData.contractorPart.locationRef || "",
    status: mapStatusFromApi(normalized),
    itr_id: formData.itr_id,
    payload: formData,
  };
};

function loadStoredItr() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function loadRecentItrs() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveRecentItrs(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function setPathValue(base, path, value) {
  const parts = path.split('.');
  const next = { ...base };
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...cursor[key] };
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
}

function extractValueFromLine(line, regex) {
  const match = line.match(new RegExp(`${regex.source}\\s*[:\-]?\\s*(.+)$`, regex.flags));
  if (match && match[1]) return match[1].trim();
  return "";
}

function normalizeText(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parsePdfText(text) {
  if (!text) return null;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let next = { ...EMPTY_ITR, source: "Extracted" };

  for (const line of lines) {
    LABEL_MAP.forEach(({ re, path }) => {
      if (re.test(line)) {
        const value = extractValueFromLine(line, re);
        if (value) {
          next = setPathValue(next, path, value);
        }
      }
    });

    if (/description\s*of\s*works|description\s*of\s*works\s*\/\s*activity/i.test(line)) {
      const value = line.replace(/.*description\s*of\s*works\s*\/\s*activity\s*for\s*which\s*inspection\s*is\s*requested\s*for\s*:?/i, '').trim();
      if (value) {
        next = setPathValue(next, "contractorPart.descriptionOfWorks", value);
      }
    }
  }

  if (!next.contractorPart.descriptionOfWorks) {
    const descIndex = lines.findIndex((line) => /description\s*of\s*works|description\s*of\s*works\s*\/\s*activity/i.test(line));
    if (descIndex !== -1) {
      const tail = lines.slice(descIndex + 1, descIndex + 5).join("\n").trim();
      if (tail) {
        next = setPathValue(next, "contractorPart.descriptionOfWorks", tail);
      }
    }
  }

  ATTACHMENT_LABELS.forEach(({ re, path }) => {
    const match = lines.find((line) => re.test(line));
    if (match) {
      const value = extractValueFromLine(match, re);
      if (value) {
        next = setPathValue(next, path, value);
      }
    }
  });

  return next;
}

function parseSheetToFields(rows) {
  if (!rows || rows.length === 0) return null;
  let next = { ...EMPTY_ITR, source: "Extracted" };

  rows.forEach((row) => {
    if (!row || row.length === 0) return;
    const [label, value] = row;
    if (!label || value == null) return;
    const line = `${label} ${value}`.trim();
    LABEL_MAP.forEach(({ re, path }) => {
      if (re.test(String(label))) {
        next = setPathValue(next, path, String(value).trim());
      }
    });
    if (/description\s*of\s*works|description\s*of\s*works\s*\/\s*activity/i.test(String(label))) {
      next = setPathValue(next, "contractorPart.descriptionOfWorks", String(value).trim());
    }
    ATTACHMENT_LABELS.forEach(({ re, path }) => {
      if (re.test(String(label))) {
        next = setPathValue(next, path, String(value).trim());
      }
    });
  });

  return next;
}

export default function ITR() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [itrData, setItrData] = useState(() => loadStoredItr() || EMPTY_ITR);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentItrs, setRecentItrs] = useState(() => loadRecentItrs());
  const [loadingItrs, setLoadingItrs] = useState(false);
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? null;

  useEffect(() => {
    saveRecentItrs(recentItrs);
  }, [recentItrs]);

  const fetchItrs = useCallback(async () => {
    setLoadingItrs(true);
    try {
      const res = projectId ? await api.getItrsByProject(projectId) : await api.getItrs();
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiItrToListItem);
        setRecentItrs(mapped);
      } else {
        if (res?.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        }
        setRecentItrs(loadRecentItrs());
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load ITRs.", variant: "destructive" });
      setRecentItrs(loadRecentItrs());
    } finally {
      setLoadingItrs(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchItrs();
  }, [fetchItrs]);

  const hasPreview = useMemo(() => {
    return itrData.projectName || itrData.itrRefNo || itrData.contractorPart.descriptionOfWorks;
  }, [itrData]);

  const setContractorPart = (key, value) => {
    setItrData((prev) => ({
      ...prev,
      contractorPart: { ...prev.contractorPart, [key]: value },
    }));
  };

  const setMeasurement = (key, value) => {
    setItrData((prev) => ({
      ...prev,
      contractorPart: {
        ...prev.contractorPart,
        measurement: { ...prev.contractorPart.measurement, [key]: value },
      },
    }));
  };

  const setAttachment = (key, value) => {
    setItrData((prev) => ({
      ...prev,
      contractorPart: {
        ...prev.contractorPart,
        attachments: { ...prev.contractorPart.attachments, [key]: value },
      },
    }));
  };

  const handleDisciplineToggle = (item) => {
    setItrData((prev) => {
      const exists = prev.contractorPart.discipline.includes(item);
      const next = exists
        ? prev.contractorPart.discipline.filter((entry) => entry !== item)
        : [...prev.contractorPart.discipline, item];
      return {
        ...prev,
        contractorPart: { ...prev.contractorPart, discipline: next },
      };
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const isSample = file.name.toLowerCase().includes("wir 47");
      let next = isSample ? { ...SAMPLE_EXTRACTED } : { ...EMPTY_ITR, source: "Extracted", sourceFileName: file.name };

      const ext = file.name.toLowerCase();
      if (ext.endsWith(".pdf")) {
        const raw = await extractTextFromPdf(file, { preserveLines: true, fullDocument: true, maxPages: 2 });
        const parsed = parsePdfText(normalizeText(raw));
        if (parsed) next = { ...next, ...parsed };
      } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        const parsed = parseSheetToFields(rows);
        if (parsed) next = { ...next, ...parsed };
      }

      next = {
        ...next,
        source: "Extracted",
        sourceFileName: file.name,
      };

      setItrData(next);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      navigate("preview");
    } catch (error) {
      toast({ title: "Upload failed", description: error?.message || "Could not extract ITR document.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    handleFile(file);
  };

  const handlePreview = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(itrData));
    }
    navigate("preview");
  };

  const handleClear = () => {
    setItrData(EMPTY_ITR);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleDeleteRecent = async (item) => {
    if (!item) return;
    const confirmed = window.confirm("Delete this ITR? This action cannot be undone.");
    if (!confirmed) return;

    if (item.itr_id) {
      try {
        const res = await api.deleteItr(item.itr_id);
        if (res.success) {
          toast({ title: "ITR deleted", description: "The ITR entry was removed." });
          fetchItrs();
        } else {
          toast({ title: "Error", description: res.error || "Failed to delete ITR.", variant: "destructive" });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error?.message || "Failed to delete ITR.",
          variant: "destructive",
        });
      }
    } else {
      setRecentItrs((prev) => prev.filter((entry) => entry.id !== item.id));
      toast({ title: "ITR removed", description: "The local ITR record was removed." });
    }
  };

  const handleEditRecent = async (item) => {
    if (!item) return;

    if (item.itr_id) {
      try {
        const res = await api.getItrById(item.itr_id);
        if (!res.success) {
          toast({ title: "Error", description: res.error || "Failed to load ITR.", variant: "destructive" });
          return;
        }
        const formData = mapApiItrToForm(res.data);
        setItrData(formData);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        }
        navigate("preview", { state: { itrId: formData.itr_id } });
        return;
      } catch (error) {
        toast({
          title: "Error",
          description: error?.message || "Failed to load ITR.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!item?.payload) {
      toast({ title: "Cannot edit", description: "Saved ITR data is not available.", variant: "destructive" });
      return;
    }
    setItrData(item.payload);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item.payload));
    }
    navigate("preview", { state: { itrId: item.payload?.itr_id ?? null } });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItrData(JSON.parse(raw));
      } catch (_) {
        setItrData(EMPTY_ITR);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Installation Test Reports (ITR)</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Upload and manage work inspection requests.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={handlePreview}>
          <Eye className="mr-2 h-4 w-4" /> Preview
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create / Extract ITR</CardTitle>
          <CardDescription>Upload a WIR/ITR file for extraction or fill the form manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upload" className="gap-2">
                <FileUp className="h-4 w-4" /> Upload & Extract
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <PencilLine className="h-4 w-4" /> Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div
                className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={handleDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Upload ITR PDF/XLSX/CSV</div>
                <div className="text-xs text-muted-foreground">Drag and drop or click to upload</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={uploading}
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {uploading ? "Extracting..." : "Choose File"}
                </Button>
                {itrData.sourceFileName ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <div>Selected: {itrData.sourceFileName}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <div className="manual-entry-panel">
                <div className="manual-entry-grid sm:grid-cols-2">
                  <Field label="Project Name">
                    <Input
                      value={itrData.projectName}
                      onChange={(event) => setItrData((prev) => ({ ...prev, projectName: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Project Code">
                    <Input
                      value={itrData.projectCode}
                      onChange={(event) => setItrData((prev) => ({ ...prev, projectCode: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Client / Employer">
                    <Input
                      value={itrData.clientEmployer}
                      onChange={(event) => setItrData((prev) => ({ ...prev, clientEmployer: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="PMC / Engineer">
                    <Input
                      value={itrData.pmcEngineer}
                      onChange={(event) => setItrData((prev) => ({ ...prev, pmcEngineer: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Contractor">
                    <Input
                      value={itrData.contractor}
                      onChange={(event) => setItrData((prev) => ({ ...prev, contractor: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Vendor Code">
                    <Input
                      value={itrData.vendorCode}
                      onChange={(event) => setItrData((prev) => ({ ...prev, vendorCode: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Material Code">
                    <Input
                      value={itrData.materialCode}
                      onChange={(event) => setItrData((prev) => ({ ...prev, materialCode: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="WIR/ITR Ref. No">
                    <Input
                      value={itrData.itrRefNo}
                      onChange={(event) => setItrData((prev) => ({ ...prev, itrRefNo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="WIR/ITR Submission (Date & Time)">
                    <Input
                      value={itrData.wirItrSubmissionDateTime}
                      onChange={(event) => setItrData((prev) => ({ ...prev, wirItrSubmissionDateTime: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Inspection (Date & Time)">
                    <Input
                      value={itrData.inspectionDateTime}
                      onChange={(event) => setItrData((prev) => ({ ...prev, inspectionDateTime: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="WIR/ITR Submitted To">
                    <Input
                      value={itrData.submittedTo}
                      onChange={(event) => setItrData((prev) => ({ ...prev, submittedTo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="WIR/ITR Submitted By">
                    <Input
                      value={itrData.submittedBy}
                      onChange={(event) => setItrData((prev) => ({ ...prev, submittedBy: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Tower / Block Ref">
                    <Input
                      value={itrData.contractorPart.locationRef}
                      onChange={(event) => setContractorPart("locationRef", event.target.value)}
                    />
                  </Field>
                  <Field label="Floor / Level">
                    <Input
                      value={itrData.contractorPart.floorLevel}
                      onChange={(event) => setContractorPart("floorLevel", event.target.value)}
                    />
                  </Field>
                  <Field label="Grid Reference">
                    <Input
                      value={itrData.contractorPart.gridReference}
                      onChange={(event) => setContractorPart("gridReference", event.target.value)}
                    />
                  </Field>
                  <Field label="Room / Area Ref">
                    <Input
                      value={itrData.contractorPart.areaRef}
                      onChange={(event) => setContractorPart("areaRef", event.target.value)}
                    />
                  </Field>
                </div>

                <div className="manual-entry-grid sm:grid-cols-3">
                  <Field label="Previous Qty">
                    <Input
                      value={itrData.contractorPart.measurement.previousQty}
                      onChange={(event) => setMeasurement("previousQty", event.target.value)}
                    />
                  </Field>
                  <Field label="Current Qty">
                    <Input
                      value={itrData.contractorPart.measurement.currentQty}
                      onChange={(event) => setMeasurement("currentQty", event.target.value)}
                    />
                  </Field>
                  <Field label="Cumulative Qty">
                    <Input
                      value={itrData.contractorPart.measurement.cumulativeQty}
                      onChange={(event) => setMeasurement("cumulativeQty", event.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Description of works / activity for which inspection is requested">
                  <Textarea
                    value={itrData.contractorPart.descriptionOfWorks}
                    onChange={(event) => setContractorPart("descriptionOfWorks", event.target.value)}
                  />
                </Field>

                <div>
                  <div className="manual-section-title">Discipline</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DISCIPLINE_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={itrData.contractorPart.discipline.includes(option) ? "default" : "outline"}
                        onClick={() => handleDisciplineToggle(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(itrData.contractorPart.attachments).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                      <div className="flex gap-2 flex-wrap">
                        {YES_NO_NA_OPTIONS.map((option) => (
                          <Button
                            key={`${key}-${option}`}
                            type="button"
                            size="sm"
                            variant={value === option ? "default" : "outline"}
                            onClick={() => setAttachment(key, option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="manual-entry-actions">
                  <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  {!hasPreview ? (
                    <div className="text-xs text-muted-foreground sm:self-center">
                      Add details to enable a richer preview.
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent ITRs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {loadingItrs ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Loading ITRs…
              </div>
            ) : (
              recentItrs.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.id}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                    <Badge variant={item.status === "Submitted" ? "default" : "secondary"}>{item.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs">Project</div>
                      <div>{item.project}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs">Location</div>
                      <div>{item.location}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditRecent(item)}>
                      <PencilLine className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
            {!loadingItrs && recentItrs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No ITRs found. Upload or submit an ITR to see it here.
              </div>
            ) : null}
          </div>

          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>ITR No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItrs ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Loading ITRs…
                  </TableCell>
                </TableRow>
              ) : (
                recentItrs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.project}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Submitted" ? "default" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditRecent(item)}>
                          <PencilLine className="mr-2 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item)}>
                          <Trash2 className="mr-2 h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loadingItrs && recentItrs.length === 0 ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No ITRs found. Upload or submit an ITR to see it here.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
