import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, FileUp, PencilLine, Eye } from "lucide-react";
import { EMPTY_MIR } from "@/pages/mirShared";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";

const STORAGE_KEY = "mirPreview";

const SAMPLE_EXTRACTED = {
  ...EMPTY_MIR,
  projectName: "Premier Signet Tower 1 - Plumbing",
  mirRefNo: "MIR-SIGNET 1-ME-PL-54",
  materialCode: "995462",
  requestSubmission: {
    ...EMPTY_MIR.requestSubmission,
    clientEmployer: "Macrotech Developers Limited",
    pmc: "Lodha",
    engineer: "Mr. Tushar Sonavane",
    contractor: "Madhuram Enterprises",
    submittedTo: "Lodha",
    vendorCode: "80010937",
    refDocAttached: "Challan copy, MTC",
    discipline: ["Plumbing"],
  },
  contractorPart: {
    ...EMPTY_MIR.contractorPart,
    materialSubmittalApproved: "Yes",
    approvalRefNo: "MAS - SIGNET TOWER1-ME-PL-21",
    description: "Supreme make: Nanhi Trap Jali - 110 mm = 40 nos",
    supplier: "Plumbwell Agencies",
    deliveryNoteNumber: "43",
    receiptDate: "10/05/2025",
    storageLocation: "Signet Tower 1",
    testCertificateDelivered: "Yes",
  },
  templateRef: "CO-LOD-GENE-QU-CN-TMT-004",
  templateRevision: "01",
  templateDate: "04-10-2023",
  source: "Extracted",
  sourceFileName: "MIR-54 NANHI TRAP JALI-CH.43.pdf",
};

function loadStoredMir() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export default function MIR() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? null;
  const [mirData, setMirData] = useState(() => loadStoredMir() || EMPTY_MIR);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingRefDoc, setUploadingRefDoc] = useState(false);
  const [recentMirs, setRecentMirs] = useState([]);
  const [loadingMirs, setLoadingMirs] = useState(false);

  const hasPreview = useMemo(() => {
    return mirData.projectName || mirData.mirRefNo || mirData.requestSubmission.clientEmployer || mirData.contractorPart.description;
  }, [mirData]);

  const setRequestSubmission = (key, value) => {
    setMirData((prev) => ({
      ...prev,
      requestSubmission: { ...prev.requestSubmission, [key]: value },
    }));
  };

  const setContractorPart = (key, value) => {
    setMirData((prev) => ({
      ...prev,
      contractorPart: { ...prev.contractorPart, [key]: value },
    }));
  };

  const handleFile = async (file) => {
    if (!file) return;
    let uploadedPath = "";
    setUploadingRefDoc(true);
    try {
      const res = await api.uploadMirReference(file);
      if (res.success && res.data?.filePath) {
        uploadedPath = res.data.filePath;
      } else if (!res.success) {
        toast({ title: "Upload failed", description: res.error || "Could not upload MIR document.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Upload failed", description: error?.message || "Could not upload MIR document.", variant: "destructive" });
    } finally {
      setUploadingRefDoc(false);
    }
    const isSample = file.name.toLowerCase().includes("mir-54");
    const next = {
      ...(isSample ? SAMPLE_EXTRACTED : { ...EMPTY_MIR, source: "Extracted", sourceFileName: file.name }),
      requestSubmission: {
        ...(isSample ? SAMPLE_EXTRACTED.requestSubmission : EMPTY_MIR.requestSubmission),
        refDocAttached: uploadedPath || (isSample ? SAMPLE_EXTRACTED.requestSubmission.refDocAttached : ""),
      },
      sourceFileName: file.name,
      source: "Extracted",
    };
    setMirData(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    navigate("preview");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    handleFile(file);
  };

  const handlePreview = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mirData));
    }
    navigate("preview");
  };

  const handleClear = () => {
    setMirData(EMPTY_MIR);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const parseDynamicField = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  };

  const parseDynamicEntry = (dynamicField, key) => {
    if (!Array.isArray(dynamicField)) return null;
    const entry = dynamicField.find((item) => item?.key === key);
    if (!entry || entry.value == null) return null;
    const raw = entry.value;
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw;
    }
  };

  const getDynamicFieldValue = (dynamicField, key) => {
    if (!Array.isArray(dynamicField)) return "";
    const found = dynamicField.find((entry) => entry?.key === key);
    return found?.value ?? "";
  };

  const mapApiMirToForm = (item) => {
    const dynamicField = parseDynamicField(item.dynamic_field);
    const contractorPart = parseDynamicEntry(dynamicField, "Contractor Part");
    const lodhaPmc = parseDynamicEntry(dynamicField, "Lodha PMC");
    const discipline = parseDynamicEntry(dynamicField, "Discipline");
    const source = parseDynamicEntry(dynamicField, "Source");
    const sourceFileName = parseDynamicEntry(dynamicField, "Source File");
    const title = parseDynamicEntry(dynamicField, "Title");
    const templateRef = parseDynamicEntry(dynamicField, "Template Ref");
    const templateRevision = parseDynamicEntry(dynamicField, "Template Revision");
    const templateDate = parseDynamicEntry(dynamicField, "Template Date");
    const submittedTo = parseDynamicEntry(dynamicField, "MIR Submitted To");
    const engineer = parseDynamicEntry(dynamicField, "Inspection Engineer");

    return {
      ...EMPTY_MIR,
      mir_id: item.mir_id,
      projectName: item.project_name || "",
      projectCode: item.project_code || "",
      mirRefNo: item.mir_refrence_no || "",
      materialCode: item.material_code || "",
      requestSubmission: {
        ...EMPTY_MIR.requestSubmission,
        clientEmployer: item.client_name || "",
        clientSubmissionDateTime: item.client_submission_date || "",
        pmc: item.pmc || "",
        engineer: typeof engineer === "string" ? engineer : "",
        engineerInspectionDateTime: item.inspection_date_time || "",
        contractor: item.contractor || "",
        submittedTo: typeof submittedTo === "string" ? submittedTo : "",
        vendorCode: item.vendor_code || "",
        refDocAttached: item.refrence_docs_attached || "",
        discipline: Array.isArray(discipline) ? discipline : [],
      },
      contractorPart: typeof contractorPart === "object" && contractorPart ? { ...EMPTY_MIR.contractorPart, ...contractorPart } : EMPTY_MIR.contractorPart,
      lodhaPmc: typeof lodhaPmc === "object" && lodhaPmc ? { ...EMPTY_MIR.lodhaPmc, ...lodhaPmc } : EMPTY_MIR.lodhaPmc,
      templateRef: typeof templateRef === "string" ? templateRef : "",
      templateRevision: typeof templateRevision === "string" ? templateRevision : "",
      templateDate: typeof templateDate === "string" ? templateDate : "",
      source: typeof source === "string" ? source : "Manual",
      sourceFileName: typeof sourceFileName === "string" ? sourceFileName : "",
      title: typeof title === "string" ? title : EMPTY_MIR.title,
    };
  };

  const fetchMirs = async () => {
    setLoadingMirs(true);
    try {
      const res = projectId ? await api.getMirsByProject(projectId) : await api.getMirs();
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((item) => {
          const dynamicField = parseDynamicField(item.dynamic_field);
          const inspector = getDynamicFieldValue(dynamicField, "Inspection Engineer") || getDynamicFieldValue(dynamicField, "engineer");
          return {
            id: item.mir_refrence_no || `MIR-${item.mir_id}`,
            mir_id: item.mir_id,
            date: item.inspection_date_time || item.client_submission_date || item.created_at || "",
            inspector,
            project: item.project_name || "",
            material: item.material_code || "",
            status: item.mir_submited ? "Submitted" : "Draft",
            doc: item.refrence_docs_attached || "",
          };
        });
        setRecentMirs(mapped);
      } else {
        setRecentMirs([]);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load MIRs.", variant: "destructive" });
      setRecentMirs([]);
    } finally {
      setLoadingMirs(false);
    }
  };

  useEffect(() => {
    fetchMirs();
  }, [projectId]);

  const handleViewDoc = (path) => {
    if (!path) return;
    const url = api.getApiFileUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEdit = async (mirId) => {
    if (!mirId) return;
    try {
      const res = await api.getMirById(mirId);
      if (res.success && res.data) {
        const next = mapApiMirToForm(res.data);
        setMirData(next);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        navigate("preview");
      } else {
        toast({ title: "Error", description: res.error || "Failed to load MIR.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "Failed to load MIR.", variant: "destructive" });
    }
  };

  const handleDelete = async (mirId) => {
    if (!mirId) return;
    const confirmed = window.confirm("Delete this MIR? This action cannot be undone.");
    if (!confirmed) return;
    try {
      const res = await api.deleteMir(mirId);
      if (res.success) {
        toast({ title: "MIR deleted", description: "The MIR entry was removed." });
        fetchMirs();
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete MIR.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "Failed to delete MIR.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Material Inspection Reports (MIR)</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Upload and manage material inspection documents.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={handlePreview}>
          <Eye className="mr-2 h-4 w-4" /> Preview
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create / Extract MIR</CardTitle>
          <CardDescription>Upload a MIR file for extraction or fill the form manually.</CardDescription>
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
                <div className="text-sm font-medium">Upload MIR PDF</div>
                <div className="text-xs text-muted-foreground">Drag and drop or click to upload</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  disabled={uploadingRefDoc}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={uploadingRefDoc}
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {uploadingRefDoc ? "Uploading..." : "Choose File"}
                </Button>
                {mirData.sourceFileName ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <div>Selected: {mirData.sourceFileName}</div>
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
                      value={mirData.projectName}
                      onChange={(event) => setMirData((prev) => ({ ...prev, projectName: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Project Code">
                    <Input
                      value={mirData.projectCode}
                      onChange={(event) => setMirData((prev) => ({ ...prev, projectCode: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="MIR Reference No">
                    <Input
                      value={mirData.mirRefNo}
                      onChange={(event) => setMirData((prev) => ({ ...prev, mirRefNo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Material Code">
                    <Input
                      value={mirData.materialCode}
                      onChange={(event) => setMirData((prev) => ({ ...prev, materialCode: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Client / Employer">
                    <Input
                      value={mirData.requestSubmission.clientEmployer}
                      onChange={(event) => setRequestSubmission("clientEmployer", event.target.value)}
                    />
                  </Field>
                  <Field label="Client Submission Date & Time">
                    <Input
                      value={mirData.requestSubmission.clientSubmissionDateTime}
                      onChange={(event) => setRequestSubmission("clientSubmissionDateTime", event.target.value)}
                    />
                  </Field>
                  <Field label="PMC">
                    <Input
                      value={mirData.requestSubmission.pmc}
                      onChange={(event) => setRequestSubmission("pmc", event.target.value)}
                    />
                  </Field>
                  <Field label="Inspection Engineer">
                    <Input
                      value={mirData.requestSubmission.engineer}
                      onChange={(event) => setRequestSubmission("engineer", event.target.value)}
                    />
                  </Field>
                  <Field label="Inspection Date & Time">
                    <Input
                      value={mirData.requestSubmission.engineerInspectionDateTime}
                      onChange={(event) => setRequestSubmission("engineerInspectionDateTime", event.target.value)}
                    />
                  </Field>
                  <Field label="Contractor">
                    <Input
                      value={mirData.requestSubmission.contractor}
                      onChange={(event) => setRequestSubmission("contractor", event.target.value)}
                    />
                  </Field>
                  <Field label="MIR Submitted To">
                    <Input
                      value={mirData.requestSubmission.submittedTo}
                      onChange={(event) => setRequestSubmission("submittedTo", event.target.value)}
                    />
                  </Field>
                  <Field label="Vendor Code">
                    <Input
                      value={mirData.requestSubmission.vendorCode}
                      onChange={(event) => setRequestSubmission("vendorCode", event.target.value)}
                    />
                  </Field>
                  <Field label="Reference Docs Attached">
                    <Input
                      value={mirData.requestSubmission.refDocAttached}
                      onChange={(event) => setRequestSubmission("refDocAttached", event.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Description of Supplied Materials">
                  <Textarea
                    value={mirData.contractorPart.description}
                    onChange={(event) => setContractorPart("description", event.target.value)}
                  />
                </Field>

                <div className="manual-entry-grid sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Approval Ref. No">
                    <Input
                      value={mirData.contractorPart.approvalRefNo}
                      onChange={(event) => setContractorPart("approvalRefNo", event.target.value)}
                    />
                  </Field>
                  <Field label="Previous Quantity">
                    <Input
                      value={mirData.contractorPart.previousQty}
                      onChange={(event) => setContractorPart("previousQty", event.target.value)}
                    />
                  </Field>
                  <Field label="Current Quantity">
                    <Input
                      value={mirData.contractorPart.currentQty}
                      onChange={(event) => setContractorPart("currentQty", event.target.value)}
                    />
                  </Field>
                  <Field label="Cumulative Quantity">
                    <Input
                      value={mirData.contractorPart.cumulativeQty}
                      onChange={(event) => setContractorPart("cumulativeQty", event.target.value)}
                    />
                  </Field>
                  <Field label="BOQ Reference">
                    <Input
                      value={mirData.contractorPart.boqReference}
                      onChange={(event) => setContractorPart("boqReference", event.target.value)}
                    />
                  </Field>
                  <Field label="Manufacturer - Country of Origin">
                    <Input
                      value={mirData.contractorPart.manufacturerCountry}
                      onChange={(event) => setContractorPart("manufacturerCountry", event.target.value)}
                    />
                  </Field>
                  <Field label="Supplier">
                    <Input
                      value={mirData.contractorPart.supplier}
                      onChange={(event) => setContractorPart("supplier", event.target.value)}
                    />
                  </Field>
                  <Field label="Supplied Quantity / Delivery Note No">
                    <Input
                      value={mirData.contractorPart.deliveryNoteNumber}
                      onChange={(event) => setContractorPart("deliveryNoteNumber", event.target.value)}
                    />
                  </Field>
                  <Field label="Receipt Date On Site">
                    <Input
                      value={mirData.contractorPart.receiptDate}
                      onChange={(event) => setContractorPart("receiptDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Storage Location">
                    <Input
                      value={mirData.contractorPart.storageLocation}
                      onChange={(event) => setContractorPart("storageLocation", event.target.value)}
                    />
                  </Field>
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
          <CardTitle>Recent MIRs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {(loadingMirs ? [] : recentMirs).map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.id}</div>
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  </div>
                  <Badge variant={item.status === "Approved" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Project</div>
                    <div>{item.project}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Material / Batch</div>
                    <div>{item.material}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Inspector</div>
                    <div>{item.inspector}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDoc(item.doc)} disabled={!item.doc}>
                    <FileText className="mr-2 h-4 w-4" /> View PDF
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item.mir_id)}>
                      <PencilLine className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.mir_id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!loadingMirs && recentMirs.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No MIRs found. Upload or submit a MIR to see it here.
              </div>
            ) : null}
          </div>

          {/* Desktop Table View */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>MIR No</TableHead>
                <TableHead>Inspection Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Material / Batch</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Document</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loadingMirs ? [] : recentMirs).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.material}</TableCell>
                  <TableCell>{item.inspector}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Submitted" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDoc(item.doc)} disabled={!item.doc}>
                        <FileText className="mr-2 h-3 w-3" /> View PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item.mir_id)}>
                        <PencilLine className="mr-2 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.mir_id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loadingMirs && recentMirs.length === 0 ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No MIRs found. Upload or submit a MIR to see it here.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
