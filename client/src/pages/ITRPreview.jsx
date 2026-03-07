import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { DISCIPLINE_OPTIONS, EMPTY_ITR, RESULT_CODE_OPTIONS, YES_NO_NA_OPTIONS } from "@/pages/itrShared";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";

const STORAGE_KEY = "itrPreview";
const RECENT_KEY = "itrRecent";

function normalizeItrData(raw) {
  if (!raw) return EMPTY_ITR;
  const normalized = normalizeSnakeKeys(raw);
  const resolvedItrId =
    normalized.itrId ??
    normalized.itrID ??
    normalized.itr_id ??
    raw?.itr_id ??
    raw?.itrId ??
    normalized.id ??
    raw?.id ??
    null;
  return {
    ...EMPTY_ITR,
    ...normalized,
    itr_id: resolvedItrId,
    contractorPart: {
      ...EMPTY_ITR.contractorPart,
      ...normalized.contractorPart,
      measurement: {
        ...EMPTY_ITR.contractorPart.measurement,
        ...normalized.contractorPart?.measurement,
      },
      attachments: {
        ...EMPTY_ITR.contractorPart.attachments,
        ...normalized.contractorPart?.attachments,
      },
      clearances: {
        ...EMPTY_ITR.contractorPart.clearances,
        ...normalized.contractorPart?.clearances,
        mep: { ...EMPTY_ITR.contractorPart.clearances.mep, ...normalized.contractorPart?.clearances?.mep },
        surveyor: { ...EMPTY_ITR.contractorPart.clearances.surveyor, ...normalized.contractorPart?.clearances?.surveyor },
        interface: { ...EMPTY_ITR.contractorPart.clearances.interface, ...normalized.contractorPart?.clearances?.interface },
      },
    },
    lodhaPmc: {
      ...EMPTY_ITR.lodhaPmc,
      ...normalized.lodhaPmc,
      signOffs: {
        ...EMPTY_ITR.lodhaPmc.signOffs,
        ...normalized.lodhaPmc?.signOffs,
        engineerManagerCivil: { ...EMPTY_ITR.lodhaPmc.signOffs.engineerManagerCivil, ...normalized.lodhaPmc?.signOffs?.engineerManagerCivil },
        engineerManagerMep: { ...EMPTY_ITR.lodhaPmc.signOffs.engineerManagerMep, ...normalized.lodhaPmc?.signOffs?.engineerManagerMep },
        towerIncharge: { ...EMPTY_ITR.lodhaPmc.signOffs.towerIncharge, ...normalized.lodhaPmc?.signOffs?.towerIncharge },
        qaaDepartment: { ...EMPTY_ITR.lodhaPmc.signOffs.qaaDepartment, ...normalized.lodhaPmc?.signOffs?.qaaDepartment },
      },
    },
  };
}

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

const convertToSnakeKeys = (value) => {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map(convertToSnakeKeys);
  }
  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, val]) => {
      const snakeKey = key.replace(/([A-Z])/g, (_, char) => `_${char.toLowerCase()}`);
      acc[snakeKey] = convertToSnakeKeys(val);
      return acc;
    }, {});
  }
  return value;
};

const buildDynamicField = (itrData) => {
  const fields = [];
  const pushField = (key, value) => {
    if (value == null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return;
    fields.push({ key, value: typeof value === "object" ? JSON.stringify(value) : value });
  };

  pushField("Contractor Part", itrData.contractorPart);
  pushField("Lodha PMC", itrData.lodhaPmc);
  pushField("Source", itrData.source);
  pushField("Source File", itrData.sourceFileName);
  return fields;
};

const buildItrPayload = (itrData, projectId) => ({
  project_name: itrData.projectName || "",
  project_code: itrData.projectCode || "",
  client_name: itrData.clientEmployer || "",
  pmc_engineer: itrData.pmcEngineer || "",
  contractor: itrData.contractor || "",
  vendor_code: itrData.vendorCode || "",
  material_code: itrData.materialCode || "",
  itr_ref_no: itrData.itrRefNo || "",
  wir_itr_submission_date_time: itrData.wirItrSubmissionDateTime || "",
  inspection_date_time: itrData.inspectionDateTime || "",
  submitted_to: itrData.submittedTo || "",
  submitted_by: itrData.submittedBy || "",
  source: itrData.source || "Manual",
  source_file_name: itrData.sourceFileName || "",
  contractor_part: convertToSnakeKeys(itrData.contractorPart),
  lodha_pmc: convertToSnakeKeys(itrData.lodhaPmc),
  dynamic_field: buildDynamicField(itrData),
  project_id: projectId,
});

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export default function ITRPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams();
  const [itrData, setItrData] = useState(() => normalizeItrData(loadStoredItr()));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(itrData));
    }
  }, [itrData]);

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

  const setClearance = (key, field, value) => {
    setItrData((prev) => ({
      ...prev,
      contractorPart: {
        ...prev.contractorPart,
        clearances: {
          ...prev.contractorPart.clearances,
          [key]: { ...prev.contractorPart.clearances[key], [field]: value },
        },
      },
    }));
  };

  const setSignOff = (key, field, value) => {
    setItrData((prev) => ({
      ...prev,
      lodhaPmc: {
        ...prev.lodhaPmc,
        signOffs: {
          ...prev.lodhaPmc.signOffs,
          [key]: { ...prev.lodhaPmc.signOffs[key], [field]: value },
        },
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

  const handleSubmit = async () => {
    if (!projectId) {
      toast({
        title: "Select project",
        description: "Choose a project before submitting an ITR.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = buildItrPayload(itrData, projectId);
      const updateId = itrData.itr_id ?? location.state?.itrId ?? null;
      const response = updateId ? await api.updateItr(updateId, payload) : await api.createItr(payload);

      if (!response.success) {
        toast({ title: "Error", description: response.error || "Failed to submit ITR.", variant: "destructive" });
        return;
      }

      toast({
        title: "ITR saved",
        description: updateId ? "Your ITR has been updated." : "Your ITR has been submitted.",
      });

      const recent = loadRecentItrs();
      const savedItrId = response?.data?.itr_id ?? response?.data?.id ?? updateId ?? null;
      setItrData((prev) => ({ ...prev, itr_id: savedItrId }));
      const id = itrData.itrRefNo || (savedItrId ? `ITR-${savedItrId}` : `ITR-${Date.now()}`);
      const date = itrData.inspectionDateTime || itrData.wirItrSubmissionDateTime || new Date().toISOString().split("T")[0];
      const location = itrData.contractorPart.areaRef || itrData.contractorPart.floorLevel || itrData.contractorPart.locationRef || "";
      const nextRecent = [
        { id, itr_id: savedItrId || itrData.itr_id || null, date, project: itrData.projectName, location, status: "Submitted", payload: { ...itrData } },
        ...recent.filter((item) => {
          if (savedItrId && item?.itr_id) return item.itr_id !== savedItrId;
          return item.id !== id;
        }),
      ].slice(0, 25);
      saveRecentItrs(nextRecent);

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
      const resolvedProjectId = routeProjectId || projectId;
      navigate(resolvedProjectId ? `/${resolvedProjectId}/itr` : "/projects");
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit ITR.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ITR Preview</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Review extracted fields and finalize inspection details.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={saving || !hasPreview}>
            {saving ? "Submitting..." : "Submit ITR"}
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
            Remove ITR
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Header Details</CardTitle>
          <CardDescription>Basic identifiers and submission information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Project Name"><Input value={itrData.projectName} onChange={(event) => setItrData((prev) => ({ ...prev, projectName: event.target.value }))} /></Field>
            <Field label="Project Code"><Input value={itrData.projectCode} onChange={(event) => setItrData((prev) => ({ ...prev, projectCode: event.target.value }))} /></Field>
            <Field label="Client / Employer"><Input value={itrData.clientEmployer} onChange={(event) => setItrData((prev) => ({ ...prev, clientEmployer: event.target.value }))} /></Field>
            <Field label="PMC / Engineer"><Input value={itrData.pmcEngineer} onChange={(event) => setItrData((prev) => ({ ...prev, pmcEngineer: event.target.value }))} /></Field>
            <Field label="Contractor"><Input value={itrData.contractor} onChange={(event) => setItrData((prev) => ({ ...prev, contractor: event.target.value }))} /></Field>
            <Field label="Vendor Code"><Input value={itrData.vendorCode} onChange={(event) => setItrData((prev) => ({ ...prev, vendorCode: event.target.value }))} /></Field>
            <Field label="Material Code"><Input value={itrData.materialCode} onChange={(event) => setItrData((prev) => ({ ...prev, materialCode: event.target.value }))} /></Field>
            <Field label="WIR/ITR Ref. No"><Input value={itrData.itrRefNo} onChange={(event) => setItrData((prev) => ({ ...prev, itrRefNo: event.target.value }))} /></Field>
            <Field label="WIR/ITR Submission (Date & Time)"><Input value={itrData.wirItrSubmissionDateTime} onChange={(event) => setItrData((prev) => ({ ...prev, wirItrSubmissionDateTime: event.target.value }))} /></Field>
            <Field label="Inspection (Date & Time)"><Input value={itrData.inspectionDateTime} onChange={(event) => setItrData((prev) => ({ ...prev, inspectionDateTime: event.target.value }))} /></Field>
            <Field label="WIR/ITR Submitted To"><Input value={itrData.submittedTo} onChange={(event) => setItrData((prev) => ({ ...prev, submittedTo: event.target.value }))} /></Field>
            <Field label="WIR/ITR Submitted By"><Input value={itrData.submittedBy} onChange={(event) => setItrData((prev) => ({ ...prev, submittedBy: event.target.value }))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part A: Contractor</CardTitle>
          <CardDescription>Location, measurements, and scope of works.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tower / Block Ref"><Input value={itrData.contractorPart.locationRef} onChange={(event) => setContractorPart("locationRef", event.target.value)} /></Field>
            <Field label="Floor / Level"><Input value={itrData.contractorPart.floorLevel} onChange={(event) => setContractorPart("floorLevel", event.target.value)} /></Field>
            <Field label="Grid Reference"><Input value={itrData.contractorPart.gridReference} onChange={(event) => setContractorPart("gridReference", event.target.value)} /></Field>
            <Field label="Room / Area Ref"><Input value={itrData.contractorPart.areaRef} onChange={(event) => setContractorPart("areaRef", event.target.value)} /></Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Previous Qty"><Input value={itrData.contractorPart.measurement.previousQty} onChange={(event) => setMeasurement("previousQty", event.target.value)} /></Field>
            <Field label="Current Qty"><Input value={itrData.contractorPart.measurement.currentQty} onChange={(event) => setMeasurement("currentQty", event.target.value)} /></Field>
            <Field label="Cumulative Qty"><Input value={itrData.contractorPart.measurement.cumulativeQty} onChange={(event) => setMeasurement("cumulativeQty", event.target.value)} /></Field>
          </div>

          <Field label="Description of works / activity for which inspection is requested">
            <Textarea
              value={itrData.contractorPart.descriptionOfWorks}
              onChange={(event) => setContractorPart("descriptionOfWorks", event.target.value)}
            />
          </Field>

          <div>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clearances & Sign-off (Part A)</CardTitle>
          <CardDescription>MEP, Surveyor, and Interface clearance details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { key: "mep", label: "MEP Clearance" },
            { key: "surveyor", label: "Surveyor Clearance" },
            { key: "interface", label: "Interface Clearance" },
          ].map((item) => (
            <div key={item.key} className="space-y-3">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Name"><Input value={itrData.contractorPart.clearances[item.key].name} onChange={(event) => setClearance(item.key, "name", event.target.value)} /></Field>
                <Field label="Date"><Input value={itrData.contractorPart.clearances[item.key].date} onChange={(event) => setClearance(item.key, "date", event.target.value)} /></Field>
                <Field label="Designation"><Input value={itrData.contractorPart.clearances[item.key].designation} onChange={(event) => setClearance(item.key, "designation", event.target.value)} /></Field>
                <Field label="Signature"><Input value={itrData.contractorPart.clearances[item.key].signature} onChange={(event) => setClearance(item.key, "signature", event.target.value)} /></Field>
                <Field label="Comments"><Input value={itrData.contractorPart.clearances[item.key].comments} onChange={(event) => setClearance(item.key, "comments", event.target.value)} /></Field>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contractor Manager Readiness</CardTitle>
          <CardDescription>Inspection readiness and comments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Contractor Manager / Engineer Comments">
            <Textarea
              value={itrData.contractorPart.contractorManagerComments}
              onChange={(event) => setContractorPart("contractorManagerComments", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ready for Inspection Date"><Input value={itrData.contractorPart.readyForInspectionDate} onChange={(event) => setContractorPart("readyForInspectionDate", event.target.value)} /></Field>
            <Field label="Ready for Inspection Time"><Input value={itrData.contractorPart.readyForInspectionTime} onChange={(event) => setContractorPart("readyForInspectionTime", event.target.value)} /></Field>
            <Field label="Signed By"><Input value={itrData.contractorPart.readySignedBy} onChange={(event) => setContractorPart("readySignedBy", event.target.value)} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part B: Lodha / PMC</CardTitle>
          <CardDescription>Comments, signatures, and result code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Comments">
            <Textarea
              value={itrData.lodhaPmc.comments}
              onChange={(event) => setItrData((prev) => ({ ...prev, lodhaPmc: { ...prev.lodhaPmc, comments: event.target.value } }))}
            />
          </Field>

          <div className="space-y-4">
            {[
              { key: "engineerManagerCivil", label: "Engineer/Manager - Civil" },
              { key: "engineerManagerMep", label: "Engineer/Manager - MEP" },
              { key: "towerIncharge", label: "Tower Incharge" },
              { key: "qaaDepartment", label: "QAA Department" },
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name"><Input value={itrData.lodhaPmc.signOffs[item.key].name} onChange={(event) => setSignOff(item.key, "name", event.target.value)} /></Field>
                  <Field label="Signature"><Input value={itrData.lodhaPmc.signOffs[item.key].signature} onChange={(event) => setSignOff(item.key, "signature", event.target.value)} /></Field>
                  <Field label="Date"><Input value={itrData.lodhaPmc.signOffs[item.key].date} onChange={(event) => setSignOff(item.key, "date", event.target.value)} /></Field>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Result Code</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {RESULT_CODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={itrData.lodhaPmc.resultCode === option.value ? "default" : "outline"}
                  onClick={() => setItrData((prev) => ({ ...prev, lodhaPmc: { ...prev.lodhaPmc, resultCode: option.value } }))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasPreview ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Upload or fill the form to see a structured preview here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quick Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Project" value={itrData.projectName} />
              <InfoItem label="ITR Ref" value={itrData.itrRefNo} />
              <InfoItem label="Submitted By" value={itrData.submittedBy} />
              <InfoItem label="Inspection Date" value={itrData.inspectionDateTime} />
              <InfoItem label="Location" value={itrData.contractorPart.locationRef} />
              <InfoItem label="Description" value={itrData.contractorPart.descriptionOfWorks} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
