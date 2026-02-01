import React, { useMemo, useRef, useState } from 'react';
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

// Mock MIR Data
const MOCK_MIR = [
  { id: "MIR-SIGNET 1-ME-PL-54", date: "2025-05-10", inspector: "Mr. Tushar Sonavane", project: "Premier Signet Tower 1", material: "Nanhi Trap Jali 110mm (Supreme)", status: "Approved", doc: "MIR-54 NANHI TRAP JALI-CH.43.pdf" },
  { id: "MIR-2026-005", date: "2026-02-18", inspector: "Rajesh K.", project: "Lodha World One", material: "CPVC Pipes Batch #44", status: "Approved", doc: "mir_scan_005.pdf" },
  { id: "MIR-2026-006", date: "2026-02-19", inspector: "Amit S.", project: "Prestige City", material: "Ceramic Tiles", status: "Pending Review", doc: "mir_scan_006.pdf" },
];

function loadStoredMir() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export default function MIR() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mirData, setMirData] = useState(() => loadStoredMir() || EMPTY_MIR);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleFile = (file) => {
    if (!file) return;
    const isSample = file.name.toLowerCase().includes("mir-54");
    const next = {
      ...(isSample ? SAMPLE_EXTRACTED : { ...EMPTY_MIR, source: "Extracted", sourceFileName: file.name }),
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
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Drag & drop MIR PDF here</div>
                <div className="text-xs text-muted-foreground">or click to browse and extract fields</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose File
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
              <div className="mt-3 text-xs text-muted-foreground">
                Extraction will be handled by the backend. For now, the UI prepares fields for review.
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Project Name"
                  value={mirData.projectName}
                  onChange={(event) => setMirData((prev) => ({ ...prev, projectName: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Project Code"
                  value={mirData.projectCode}
                  onChange={(event) => setMirData((prev) => ({ ...prev, projectCode: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="MIR Reference No"
                  value={mirData.mirRefNo}
                  onChange={(event) => setMirData((prev) => ({ ...prev, mirRefNo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Material Code"
                  value={mirData.materialCode}
                  onChange={(event) => setMirData((prev) => ({ ...prev, materialCode: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Client / Employer"
                  value={mirData.requestSubmission.clientEmployer}
                  onChange={(event) => setRequestSubmission("clientEmployer", event.target.value)}
                />
                <Input
                  placeholder="Client Submission Date & Time"
                  value={mirData.requestSubmission.clientSubmissionDateTime}
                  onChange={(event) => setRequestSubmission("clientSubmissionDateTime", event.target.value)}
                />
                <Input
                  placeholder="PMC"
                  value={mirData.requestSubmission.pmc}
                  onChange={(event) => setRequestSubmission("pmc", event.target.value)}
                />
                <Input
                  placeholder="Inspection Engineer"
                  value={mirData.requestSubmission.engineer}
                  onChange={(event) => setRequestSubmission("engineer", event.target.value)}
                />
                <Input
                  placeholder="Inspection Date & Time"
                  value={mirData.requestSubmission.engineerInspectionDateTime}
                  onChange={(event) => setRequestSubmission("engineerInspectionDateTime", event.target.value)}
                />
                <Input
                  placeholder="Contractor"
                  value={mirData.requestSubmission.contractor}
                  onChange={(event) => setRequestSubmission("contractor", event.target.value)}
                />
                <Input
                  placeholder="MIR Submitted To"
                  value={mirData.requestSubmission.submittedTo}
                  onChange={(event) => setRequestSubmission("submittedTo", event.target.value)}
                />
                <Input
                  placeholder="Vendor Code"
                  value={mirData.requestSubmission.vendorCode}
                  onChange={(event) => setRequestSubmission("vendorCode", event.target.value)}
                />
                <Input
                  placeholder="Reference Docs Attached"
                  value={mirData.requestSubmission.refDocAttached}
                  onChange={(event) => setRequestSubmission("refDocAttached", event.target.value)}
                />
              </div>

              <div className="mt-4">
                <Textarea
                  placeholder="Description of Supplied Materials"
                  value={mirData.contractorPart.description}
                  onChange={(event) => setContractorPart("description", event.target.value)}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  placeholder="Approval Ref. No"
                  value={mirData.contractorPart.approvalRefNo}
                  onChange={(event) => setContractorPart("approvalRefNo", event.target.value)}
                />
                <Input
                  placeholder="Previous Quantity"
                  value={mirData.contractorPart.previousQty}
                  onChange={(event) => setContractorPart("previousQty", event.target.value)}
                />
                <Input
                  placeholder="Current Quantity"
                  value={mirData.contractorPart.currentQty}
                  onChange={(event) => setContractorPart("currentQty", event.target.value)}
                />
                <Input
                  placeholder="Cumulative Quantity"
                  value={mirData.contractorPart.cumulativeQty}
                  onChange={(event) => setContractorPart("cumulativeQty", event.target.value)}
                />
                <Input
                  placeholder="BOQ Reference"
                  value={mirData.contractorPart.boqReference}
                  onChange={(event) => setContractorPart("boqReference", event.target.value)}
                />
                <Input
                  placeholder="Manufacturer - Country of Origin"
                  value={mirData.contractorPart.manufacturerCountry}
                  onChange={(event) => setContractorPart("manufacturerCountry", event.target.value)}
                />
                <Input
                  placeholder="Supplier"
                  value={mirData.contractorPart.supplier}
                  onChange={(event) => setContractorPart("supplier", event.target.value)}
                />
                <Input
                  placeholder="Supplied Quantity / Delivery Note No"
                  value={mirData.contractorPart.deliveryNoteNumber}
                  onChange={(event) => setContractorPart("deliveryNoteNumber", event.target.value)}
                />
                <Input
                  placeholder="Receipt Date On Site"
                  value={mirData.contractorPart.receiptDate}
                  onChange={(event) => setContractorPart("receiptDate", event.target.value)}
                />
                <Input
                  placeholder="Storage Location"
                  value={mirData.contractorPart.storageLocation}
                  onChange={(event) => setContractorPart("storageLocation", event.target.value)}
                />
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
          <CardTitle>Recent MIRs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MOCK_MIR.map((item) => (
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

                <div className="flex justify-end pt-2 border-t mt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="mr-2 h-4 w-4" /> View PDF
                  </Button>
                </div>
              </div>
            ))}
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
              {MOCK_MIR.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.material}</TableCell>
                  <TableCell>{item.inspector}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Approved" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-3 w-3" /> View PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
