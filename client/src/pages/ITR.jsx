import React, { useMemo, useRef, useState, useEffect } from 'react';
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

  useEffect(() => {
    saveRecentItrs(recentItrs);
  }, [recentItrs]);

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

  const handleDeleteRecent = (id) => {
    setRecentItrs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditRecent = (item) => {
    if (!item?.payload) return;
    setItrData(item.payload);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item.payload));
    }
    navigate("preview");
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
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Drag & drop ITR PDF/XLSX/CSV here</div>
                <div className="text-xs text-muted-foreground">or click to browse and extract fields</div>
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
              <div className="mt-3 text-xs text-muted-foreground">
                Extraction is client-side for now and prepares fields for review.
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Project Name"
                  value={itrData.projectName}
                  onChange={(event) => setItrData((prev) => ({ ...prev, projectName: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Project Code"
                  value={itrData.projectCode}
                  onChange={(event) => setItrData((prev) => ({ ...prev, projectCode: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Client / Employer"
                  value={itrData.clientEmployer}
                  onChange={(event) => setItrData((prev) => ({ ...prev, clientEmployer: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="PMC / Engineer"
                  value={itrData.pmcEngineer}
                  onChange={(event) => setItrData((prev) => ({ ...prev, pmcEngineer: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Contractor"
                  value={itrData.contractor}
                  onChange={(event) => setItrData((prev) => ({ ...prev, contractor: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Vendor Code"
                  value={itrData.vendorCode}
                  onChange={(event) => setItrData((prev) => ({ ...prev, vendorCode: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Material Code"
                  value={itrData.materialCode}
                  onChange={(event) => setItrData((prev) => ({ ...prev, materialCode: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="WIR/ITR Ref. No"
                  value={itrData.itrRefNo}
                  onChange={(event) => setItrData((prev) => ({ ...prev, itrRefNo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="WIR/ITR Submission (Date & Time)"
                  value={itrData.wirItrSubmissionDateTime}
                  onChange={(event) => setItrData((prev) => ({ ...prev, wirItrSubmissionDateTime: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Inspection (Date & Time)"
                  value={itrData.inspectionDateTime}
                  onChange={(event) => setItrData((prev) => ({ ...prev, inspectionDateTime: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="WIR/ITR Submitted To"
                  value={itrData.submittedTo}
                  onChange={(event) => setItrData((prev) => ({ ...prev, submittedTo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="WIR/ITR Submitted By"
                  value={itrData.submittedBy}
                  onChange={(event) => setItrData((prev) => ({ ...prev, submittedBy: event.target.value, source: "Manual" }))}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  placeholder="Tower / Block Ref"
                  value={itrData.contractorPart.locationRef}
                  onChange={(event) => setContractorPart("locationRef", event.target.value)}
                />
                <Input
                  placeholder="Floor / Level"
                  value={itrData.contractorPart.floorLevel}
                  onChange={(event) => setContractorPart("floorLevel", event.target.value)}
                />
                <Input
                  placeholder="Grid Reference"
                  value={itrData.contractorPart.gridReference}
                  onChange={(event) => setContractorPart("gridReference", event.target.value)}
                />
                <Input
                  placeholder="Room / Area Ref"
                  value={itrData.contractorPart.areaRef}
                  onChange={(event) => setContractorPart("areaRef", event.target.value)}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Input
                  placeholder="Previous Qty"
                  value={itrData.contractorPart.measurement.previousQty}
                  onChange={(event) => setMeasurement("previousQty", event.target.value)}
                />
                <Input
                  placeholder="Current Qty"
                  value={itrData.contractorPart.measurement.currentQty}
                  onChange={(event) => setMeasurement("currentQty", event.target.value)}
                />
                <Input
                  placeholder="Cumulative Qty"
                  value={itrData.contractorPart.measurement.cumulativeQty}
                  onChange={(event) => setMeasurement("cumulativeQty", event.target.value)}
                />
              </div>

              <div className="mt-4">
                <Textarea
                  placeholder="Description of works / activity for which inspection is requested"
                  value={itrData.contractorPart.descriptionOfWorks}
                  onChange={(event) => setContractorPart("descriptionOfWorks", event.target.value)}
                />
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium text-muted-foreground">Discipline</div>
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

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                {!hasPreview ? (
                  <div className="text-xs text-muted-foreground sm:self-center">
                    Add details to enable a richer preview.
                  </div>
                ) : null}
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
            {recentItrs.map((item) => (
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
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
            {recentItrs.length === 0 ? (
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
              {recentItrs.map((item) => (
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
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item.id)}>
                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {recentItrs.length === 0 ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No ITRs found. Upload or submit an ITR to see it here.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
