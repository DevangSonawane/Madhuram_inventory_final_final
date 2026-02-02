import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { DISCIPLINE_OPTIONS, EMPTY_MIR, YES_NO_OPTIONS } from "@/pages/mirShared";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";

const STORAGE_KEY = "mirPreview";

function normalizeMirData(raw) {
  if (!raw) return EMPTY_MIR;
  return {
    ...EMPTY_MIR,
    ...raw,
    mir_id: raw.mir_id ?? raw.mirId ?? null,
    requestSubmission: {
      ...EMPTY_MIR.requestSubmission,
      ...raw.requestSubmission,
    },
    contractorPart: {
      ...EMPTY_MIR.contractorPart,
      ...raw.contractorPart,
    },
    lodhaPmc: {
      ...EMPTY_MIR.lodhaPmc,
      ...raw.lodhaPmc,
      inspectionReports: {
        ...EMPTY_MIR.lodhaPmc.inspectionReports,
        ...raw.lodhaPmc?.inspectionReports,
      },
      signOffs: {
        ...EMPTY_MIR.lodhaPmc.signOffs,
        ...raw.lodhaPmc?.signOffs,
      },
      distribution: {
        ...EMPTY_MIR.lodhaPmc.distribution,
        ...raw.lodhaPmc?.distribution,
      },
    },
  };
}

function loadStoredMir() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function MirCheckbox({ id, label, checked, onCheckedChange }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  );
}

function YesNoToggle({ id, label, value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-3">
        {YES_NO_OPTIONS.map((option) => (
          <MirCheckbox
            key={`${id}-${option}`}
            id={`${id}-${option}`}
            label={option}
            checked={value === option}
            onCheckedChange={(checked) => onChange(checked ? option : "")}
          />
        ))}
      </div>
    </div>
  );
}

export default function MIRPreview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? null;
  const [mirData, setMirData] = useState(() => normalizeMirData(loadStoredMir()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mirData));
    }
  }, [mirData]);

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

  const setLodhaPmc = (key, value) => {
    setMirData((prev) => ({
      ...prev,
      lodhaPmc: { ...prev.lodhaPmc, [key]: value },
    }));
  };

  const setInspectionReport = (key, value) => {
    setMirData((prev) => ({
      ...prev,
      lodhaPmc: {
        ...prev.lodhaPmc,
        inspectionReports: { ...prev.lodhaPmc.inspectionReports, [key]: value },
      },
    }));
  };

  const setSignOff = (key, value) => {
    setMirData((prev) => ({
      ...prev,
      lodhaPmc: {
        ...prev.lodhaPmc,
        signOffs: { ...prev.lodhaPmc.signOffs, [key]: value },
      },
    }));
  };

  const handleDisciplineToggle = (item) => {
    setMirData((prev) => {
      const exists = prev.requestSubmission.discipline.includes(item);
      const next = exists
        ? prev.requestSubmission.discipline.filter((entry) => entry !== item)
        : [...prev.requestSubmission.discipline, item];
      return {
        ...prev,
        requestSubmission: { ...prev.requestSubmission, discipline: next },
      };
    });
  };

  const buildDynamicField = () => {
    const fields = [];
    const pushField = (key, value) => {
      if (value == null) return;
      if (typeof value === "string" && value.trim() === "") return;
      if (Array.isArray(value) && value.length === 0) return;
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return;
      const normalized = typeof value === "string" ? value : JSON.stringify(value);
      fields.push({ key, value: normalized });
    };

    pushField("Inspection Engineer", mirData.requestSubmission.engineer);
    pushField("MIR Submitted To", mirData.requestSubmission.submittedTo);
    pushField("Discipline", mirData.requestSubmission.discipline);
    pushField("Contractor Part", mirData.contractorPart);
    pushField("Lodha PMC", mirData.lodhaPmc);
    pushField("Template Ref", mirData.templateRef);
    pushField("Template Revision", mirData.templateRevision);
    pushField("Template Date", mirData.templateDate);
    pushField("Source", mirData.source);
    pushField("Source File", mirData.sourceFileName);
    pushField("Title", mirData.title);

    return fields;
  };

  const handleSubmit = async () => {
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project before submitting a MIR.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        project_name: mirData.projectName || selectedProject?.project_name || selectedProject?.name || "",
        project_code: mirData.projectCode || "",
        client_name: mirData.requestSubmission.clientEmployer || "",
        pmc: mirData.requestSubmission.pmc || "",
        contractor: mirData.requestSubmission.contractor || "",
        vendor_code: mirData.requestSubmission.vendorCode || "",
        mir_refrence_no: mirData.mirRefNo || "",
        material_code: mirData.materialCode || "",
        inspection_date_time: mirData.requestSubmission.engineerInspectionDateTime || "",
        client_submission_date: mirData.requestSubmission.clientSubmissionDateTime || "",
        refrence_docs_attached: mirData.requestSubmission.refDocAttached || "",
        mir_submited: true,
        dynamic_field: buildDynamicField(),
        project_id: projectId,
      };

      const res = mirData.mir_id ? await api.updateMir(mirData.mir_id, payload) : await api.createMir(payload);
      if (res.success) {
        toast({ title: "MIR saved", description: mirData.mir_id ? "Your MIR has been updated." : "Your MIR has been saved." });
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
        navigate("/mir");
      } else {
        toast({ title: "Error", description: res.error || "Failed to submit MIR.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "Failed to submit MIR.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">MIR Preview</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Review extracted fields and finalize inspection details.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting..." : "Submit MIR"}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem(STORAGE_KEY);
              }
              navigate(-1);
            }}
          >
            Remove MIR
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>All fields are editable here before you submit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasPreview ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Upload a MIR or fill the form to see a structured preview here.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{mirData.title}</div>
                  <div className="text-xl font-semibold">{mirData.projectName || "Project Name"}</div>
                  <div className="text-sm text-muted-foreground">Project Code: {mirData.projectCode || "—"}</div>
                  <div className="text-sm text-muted-foreground">MIR Ref. No: {mirData.mirRefNo || "—"}</div>
                  <div className="text-sm text-muted-foreground">Material Code: {mirData.materialCode || "—"}</div>
                  {mirData.sourceFileName ? (
                    <div className="text-xs text-muted-foreground mt-1">Source file: {mirData.sourceFileName}</div>
                  ) : null}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  {mirData.source}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-semibold">Request Submission</div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Client / Employer" value={mirData.requestSubmission.clientEmployer} />
                  <InfoItem label="Client Submission Date & Time" value={mirData.requestSubmission.clientSubmissionDateTime} />
                  <InfoItem label="PMC" value={mirData.requestSubmission.pmc} />
                  <InfoItem label="Inspection Engineer" value={mirData.requestSubmission.engineer} />
                  <InfoItem label="Inspection Date & Time" value={mirData.requestSubmission.engineerInspectionDateTime} />
                  <InfoItem label="Contractor" value={mirData.requestSubmission.contractor} />
                  <InfoItem label="MIR Submitted To" value={mirData.requestSubmission.submittedTo} />
                  <InfoItem label="Vendor Code" value={mirData.requestSubmission.vendorCode} />
                  <InfoItem label="Ref. Doc Attached" value={mirData.requestSubmission.refDocAttached} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Discipline (tick applicable)</div>
                  <div className="flex flex-wrap gap-3">
                    {DISCIPLINE_OPTIONS.map((item) => (
                      <MirCheckbox
                        key={item}
                        id={`discipline-${item}`}
                        label={item}
                        checked={mirData.requestSubmission.discipline.includes(item)}
                        onCheckedChange={() => handleDisciplineToggle(item)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="text-sm font-semibold">Part A: By the Contractor</div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Approval Ref. No" value={mirData.contractorPart.approvalRefNo} />
                  <InfoItem label="Previous Quantity" value={mirData.contractorPart.previousQty} />
                  <InfoItem label="Current Quantity" value={mirData.contractorPart.currentQty} />
                  <InfoItem label="Cumulative Quantity" value={mirData.contractorPart.cumulativeQty} />
                  <InfoItem label="BOQ Reference" value={mirData.contractorPart.boqReference} />
                  <InfoItem label="Manufacturer - Country of Origin" value={mirData.contractorPart.manufacturerCountry} />
                  <InfoItem label="Supplier" value={mirData.contractorPart.supplier} />
                  <InfoItem label="Supplied Qty / Delivery Note No" value={mirData.contractorPart.deliveryNoteNumber} />
                  <InfoItem label="Receipt Date On Site" value={mirData.contractorPart.receiptDate} />
                  <InfoItem label="Storage Location" value={mirData.contractorPart.storageLocation} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Description of Supplied Materials</div>
                  <div className="text-sm font-medium">{mirData.contractorPart.description || "—"}</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <YesNoToggle
                    id="material-approved"
                    label="Material Submittal Approved"
                    value={mirData.contractorPart.materialSubmittalApproved}
                    onChange={(value) => setContractorPart("materialSubmittalApproved", value)}
                  />
                  <YesNoToggle
                    id="test-certificate"
                    label="MTC Delivered"
                    value={mirData.contractorPart.testCertificateDelivered}
                    onChange={(value) => setContractorPart("testCertificateDelivered", value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-3">
                  <YesNoToggle
                    id="field-test"
                    label="Field Test Conducted"
                    value={mirData.contractorPart.fieldTestConducted}
                    onChange={(value) => setContractorPart("fieldTestConducted", value)}
                  />
                  <Textarea
                    placeholder="Field test result / acceptance criteria"
                    value={mirData.contractorPart.fieldTestComplianceNote}
                    onChange={(event) => setContractorPart("fieldTestComplianceNote", event.target.value)}
                  />
                </div>
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="space-y-2">
                    <YesNoToggle
                      id="third-party-contractor"
                      label="Third Party Test Under Contractor Scope"
                      value={mirData.contractorPart.thirdPartyTestContractorScope}
                      onChange={(value) => setContractorPart("thirdPartyTestContractorScope", value)}
                    />
                    <Textarea
                      placeholder="Contractor scope compliance note"
                      value={mirData.contractorPart.thirdPartyTestContractorComplianceNote}
                      onChange={(event) => setContractorPart("thirdPartyTestContractorComplianceNote", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <YesNoToggle
                      id="third-party-lodha"
                      label="Third Party Test Under Lodha Scope"
                      value={mirData.contractorPart.thirdPartyTestLodhaScope}
                      onChange={(value) => setContractorPart("thirdPartyTestLodhaScope", value)}
                    />
                    <Textarea
                      placeholder="Lodha scope compliance note"
                      value={mirData.contractorPart.thirdPartyTestLodhaComplianceNote}
                      onChange={(event) => setContractorPart("thirdPartyTestLodhaComplianceNote", event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  placeholder="Contractor Name"
                  value={mirData.contractorPart.contractorName}
                  onChange={(event) => setContractorPart("contractorName", event.target.value)}
                />
                <Input
                  placeholder="Signature"
                  value={mirData.contractorPart.contractorSignature}
                  onChange={(event) => setContractorPart("contractorSignature", event.target.value)}
                />
                <Input
                  placeholder="Date"
                  value={mirData.contractorPart.contractorDate}
                  onChange={(event) => setContractorPart("contractorDate", event.target.value)}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Template Reference</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Template Ref" value={mirData.templateRef} />
                  <InfoItem label="Revision" value={mirData.templateRevision} />
                  <InfoItem label="Date" value={mirData.templateDate} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="text-sm font-semibold">Part B: Lodha/PMC - Inspection Reports</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <YesNoToggle
                    id="inspection-physical-damage"
                    label="Physical Damage?"
                    value={mirData.lodhaPmc.inspectionReports.physicalDamage}
                    onChange={(value) => setInspectionReport("physicalDamage", value)}
                  />
                  <YesNoToggle
                    id="inspection-delivery-note"
                    label="Details in Delivery Note Correct? (Type, Size, Wt., Qty, etc.)"
                    value={mirData.lodhaPmc.inspectionReports.deliveryNoteCorrect}
                    onChange={(value) => setInspectionReport("deliveryNoteCorrect", value)}
                  />
                  <YesNoToggle
                    id="inspection-conform-submittal"
                    label="Conform with Approved Material Submittal"
                    value={mirData.lodhaPmc.inspectionReports.conformApprovedSubmittal}
                    onChange={(value) => setInspectionReport("conformApprovedSubmittal", value)}
                  />
                  <YesNoToggle
                    id="inspection-mtc"
                    label="Material requires test certificate delivered with MTC"
                    value={mirData.lodhaPmc.inspectionReports.mtcDelivered}
                    onChange={(value) => setInspectionReport("mtcDelivered", value)}
                  />
                  <YesNoToggle
                    id="inspection-field-test"
                    label="Field test conducted and results comply with acceptance criteria/values"
                    value={mirData.lodhaPmc.inspectionReports.fieldTestCompliance}
                    onChange={(value) => setInspectionReport("fieldTestCompliance", value)}
                  />
                  <YesNoToggle
                    id="inspection-third-party-contractor"
                    label="Third party test under contractor scope? (If yes, verify certificate)"
                    value={mirData.lodhaPmc.inspectionReports.thirdPartyContractorScope}
                    onChange={(value) => setInspectionReport("thirdPartyContractorScope", value)}
                  />
                  <YesNoToggle
                    id="inspection-third-party-lodha"
                    label="Third party test under Lodha's scope? (If yes, verify certificate)"
                    value={mirData.lodhaPmc.inspectionReports.thirdPartyLodhaScope}
                    onChange={(value) => setInspectionReport("thirdPartyLodhaScope", value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    placeholder="Civil & Finishing - Project Manager Sign"
                    value={mirData.lodhaPmc.signOffs.civilProjectManager}
                    onChange={(event) => setSignOff("civilProjectManager", event.target.value)}
                  />
                  <Input
                    placeholder="Civil & Finishing - Project Quality Manager Sign"
                    value={mirData.lodhaPmc.signOffs.civilQualityManager}
                    onChange={(event) => setSignOff("civilQualityManager", event.target.value)}
                  />
                  <Input
                    placeholder="Facade - Facade Manager Sign"
                    value={mirData.lodhaPmc.signOffs.facadeManager}
                    onChange={(event) => setSignOff("facadeManager", event.target.value)}
                  />
                  <Input
                    placeholder="Landscape - Landscape Architect Sign"
                    value={mirData.lodhaPmc.signOffs.landscapeArchitect}
                    onChange={(event) => setSignOff("landscapeArchitect", event.target.value)}
                  />
                  <Input
                    placeholder="MEP - MEP Manager Sign"
                    value={mirData.lodhaPmc.signOffs.mepManager}
                    onChange={(event) => setSignOff("mepManager", event.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="Comments"
                  value={mirData.lodhaPmc.comments}
                  onChange={(event) => setLodhaPmc("comments", event.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="text-sm font-semibold">Lodha/PMC - Inspection Result</div>
                <div className="text-xs text-muted-foreground">The above materials have been inspected on site and found, at time of inspection, to be:</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { code: "Code 1", label: "Approved - Material can be used" },
                    { code: "Code 2", label: "Conditionally approved. Material can be used, resubmit incorporating comments indicated" },
                    { code: "Code 3", label: "Revise & Resubmit. Material may not be used" },
                    { code: "Code 4", label: "For information and records only" },
                  ].map((item) => (
                    <MirCheckbox
                      key={item.code}
                      id={`result-${item.code}`}
                      label={`${item.code} - ${item.label}`}
                      checked={mirData.lodhaPmc.resultCode === item.code}
                      onCheckedChange={(checked) => setLodhaPmc("resultCode", checked ? item.code : "")}
                    />
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    placeholder="Name"
                    value={mirData.lodhaPmc.resultName}
                    onChange={(event) => setLodhaPmc("resultName", event.target.value)}
                  />
                  <Input
                    placeholder="Signature"
                    value={mirData.lodhaPmc.resultSignature}
                    onChange={(event) => setLodhaPmc("resultSignature", event.target.value)}
                  />
                  <Input
                    placeholder="Date"
                    value={mirData.lodhaPmc.resultDate}
                    onChange={(event) => setLodhaPmc("resultDate", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Distribution</div>
                  <div className="flex flex-wrap gap-3">
                    <MirCheckbox
                      id="distribution-lodha"
                      label="Lodha"
                      checked={mirData.lodhaPmc.distribution.lodha}
                      onCheckedChange={(checked) =>
                        setLodhaPmc("distribution", { ...mirData.lodhaPmc.distribution, lodha: !!checked })
                      }
                    />
                    <MirCheckbox
                      id="distribution-contractor"
                      label="Contractor"
                      checked={mirData.lodhaPmc.distribution.contractor}
                      onCheckedChange={(checked) =>
                        setLodhaPmc("distribution", { ...mirData.lodhaPmc.distribution, contractor: !!checked })
                      }
                    />
                    <Input
                      placeholder="Others"
                      value={mirData.lodhaPmc.distribution.others}
                      onChange={(event) =>
                        setLodhaPmc("distribution", { ...mirData.lodhaPmc.distribution, others: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
