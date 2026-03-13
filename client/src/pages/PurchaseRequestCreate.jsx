import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Save, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const URGENCY_OPTIONS = ["High", "Medium", "Low"];

const createEmptyItem = () => ({
  material_description: "",
  unit: "NOS",
  req_qty: "",
  make: "",
  place_of_utilisation: "",
});

const parseIntegerOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const formatPrNumber = (pr = {}) => {
  const sourceDate = pr.date || pr.created_at || new Date().toISOString();
  const parsed = new Date(sourceDate);
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const datePart = Number.isNaN(parsed.getTime()) ? "0000-00-00" : `${yyyy}-${mm}-${dd}`;
  const sequence = pr.pr_id || pr.id || "0";
  const project = pr.project_id || pr.projectId || "0";
  return `PR-${datePart}-${sequence}-${project}`;
};

const formatDateToken = (value) => {
  const parsed = new Date(value || new Date().toISOString());
  if (Number.isNaN(parsed.getTime())) return "0000-00-00";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function PurchaseRequestCreate() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { selectedProject, projects } = useProject();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [isPrDragOver, setIsPrDragOver] = useState(false);
  const [isSignatureDragOver, setIsSignatureDragOver] = useState(false);
  const prFileInputRef = useRef(null);
  const signatureFileInputRef = useRef(null);
  const [sampleOptions, setSampleOptions] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [prOptions, setPrOptions] = useState([]);
  const [loadingSampleItems, setLoadingSampleItems] = useState(false);
  const [mirOptions, setMirOptions] = useState([]);
  const [loadingMirs, setLoadingMirs] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const defaultProjectId = useMemo(
    () => parseIntegerOrNull(projectId) || parseIntegerOrNull(selectedProject?.project_id || selectedProject?.id),
    [projectId, selectedProject]
  );

  const [form, setForm] = useState({
    project_id: defaultProjectId ? String(defaultProjectId) : "",
    sample_id: "",
    project_name: selectedProject?.project_name || selectedProject?.name || "",
    workorder_no: "",
    location: "",
    mirno: "",
    urgency: "Medium",
    date: new Date().toISOString().slice(0, 10),
    approved_by: "",
    remarks: "",
    prFile: null,
    signatureFile: null,
    items: [createEmptyItem()],
  });

  const selectedSampleMissing = useMemo(
    () => form.sample_id && !sampleOptions.some((sample) => String(sample.sample_id || sample.id) === form.sample_id),
    [form.sample_id, sampleOptions]
  );
  const selectedMirMissing = useMemo(
    () => form.mirno && !mirOptions.some((mir) => String(mir.mir_refrence_no || mir.mir_id || mir.id) === form.mirno),
    [form.mirno, mirOptions]
  );

  const autoPrNumber = useMemo(() => {
    const project = parseIntegerOrNull(form.project_id) || defaultProjectId || 0;
    const selectedDate = form.date || new Date().toISOString().slice(0, 10);
    const dateToken = formatDateToken(selectedDate);
    const sequence = (
      Array.isArray(prOptions)
        ? prOptions.filter((pr) => {
            const sameProject = String(pr?.project_id || pr?.projectId || "") === String(project);
            const sameDate = formatDateToken(pr?.date || pr?.created_at) === dateToken;
            return sameProject && sameDate;
          }).length
        : 0
    ) + 1;
    return `PR-${dateToken}-${sequence}-${project}`;
  }, [form.project_id, form.date, prOptions, defaultProjectId]);

  const effectiveProjectId = useMemo(
    () => parseIntegerOrNull(form.project_id) || defaultProjectId,
    [form.project_id, defaultProjectId]
  );

  useEffect(() => {
    setLoadingProjects(true);
    const byId = new Map();
    (Array.isArray(projects) ? projects : []).forEach((project) => {
      const id = project?.project_id ?? project?.id;
      if (id == null || id === "") return;
      byId.set(String(id), project);
    });
    setProjectOptions(Array.from(byId.values()));
    setLoadingProjects(false);
  }, [projects]);

  useEffect(() => {
    const currentProjectId = String(form.project_id || "").trim();
    if (!currentProjectId) return;

    const selectedFromOptions = projectOptions.find(
      (project) => String(project.project_id || project.id) === currentProjectId
    );
    const resolvedProjectName =
      selectedFromOptions?.project_name ||
      selectedFromOptions?.name ||
      selectedProject?.project_name ||
      selectedProject?.name ||
      "";

    if (!resolvedProjectName) return;
    if (String(form.project_name || "") === String(resolvedProjectName)) return;

    setForm((prev) => ({ ...prev, project_name: resolvedProjectName }));
  }, [form.project_id, form.project_name, projectOptions, selectedProject]);

  useEffect(() => {
    let mounted = true;

    const loadSamples = async () => {
      setLoadingSamples(true);
      try {
        const result = effectiveProjectId
          ? await api.getSamplesByProject(effectiveProjectId)
          : await api.getSamples();

        if (!mounted) return;
        if (!result.success || !Array.isArray(result.data)) {
          setSampleOptions([]);
          return;
        }

        const byId = new Map();
        result.data.forEach((sample) => {
          const id = sample?.sample_id ?? sample?.id;
          if (id == null || id === "") return;
          byId.set(String(id), sample);
        });
        setSampleOptions(Array.from(byId.values()));
      } catch {
        if (mounted) setSampleOptions([]);
      } finally {
        if (mounted) setLoadingSamples(false);
      }
    };

    loadSamples();
    return () => {
      mounted = false;
    };
  }, [effectiveProjectId]);

  useEffect(() => {
    let mounted = true;

    const loadMirs = async () => {
      setLoadingMirs(true);
      try {
        const result = effectiveProjectId
          ? await api.getMirsByProject(effectiveProjectId)
          : await api.getMirs();

        if (!mounted) return;
        if (!result.success || !Array.isArray(result.data)) {
          setMirOptions([]);
          return;
        }

        const byRef = new Map();
        result.data.forEach((mir) => {
          const ref = mir?.mir_refrence_no || mir?.mir_id || mir?.id;
          if (ref == null || ref === "") return;
          byRef.set(String(ref), mir);
        });
        setMirOptions(Array.from(byRef.values()));
      } catch {
        if (mounted) setMirOptions([]);
      } finally {
        if (mounted) setLoadingMirs(false);
      }
    };

    loadMirs();
    return () => {
      mounted = false;
    };
  }, [effectiveProjectId]);

  useEffect(() => {
    let mounted = true;

    const loadPrOptions = async () => {
      try {
        const result = effectiveProjectId
          ? await api.getPrsByProject(effectiveProjectId)
          : await api.getPrs();

        if (!mounted) return;
        if (!result.success || !Array.isArray(result.data)) {
          setPrOptions([]);
          return;
        }

        const byId = new Map();
        result.data.forEach((pr) => {
          const id = pr?.pr_id ?? pr?.id;
          if (id == null || id === "") return;
          byId.set(String(id), pr);
        });
        setPrOptions(Array.from(byId.values()));
      } catch {
        if (mounted) setPrOptions([]);
      }
    };

    loadPrOptions();
    return () => {
      mounted = false;
    };
  }, [effectiveProjectId]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setItemField = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, items: next };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const goBackToList = () => {
    navigate(`/${projectId}/purchase-requests`);
  };

  const setFileField = (field, file) => {
    setField(field, file instanceof File ? file : null);
  };

  const parseArrayField = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const mapSampleItemsToFormItems = (itemDescription) => {
    const parsedItems = parseArrayField(itemDescription);
    if (parsedItems.length === 0) return [createEmptyItem()];

    const mapped = parsedItems
      .map((item) => ({
        material_description: String(
          item?.material_description || item?.description || item?.item || item?.name || ""
        ).trim(),
        unit: String(item?.unit || item?.uom || item?.UOM || "NOS").trim() || "NOS",
        req_qty:
          item?.quantity == null
            ? item?.qty == null
              ? item?.req_qty == null
                ? ""
                : String(item.req_qty)
              : String(item.qty)
            : String(item.quantity),
        make: String(item?.make || item?.brand || "").trim(),
        place_of_utilisation: String(item?.place_of_utilisation || item?.place || "").trim(),
      }))
      .filter((item) => item.material_description || item.req_qty);

    return mapped.length > 0 ? mapped : [createEmptyItem()];
  };

  const applySelectedSampleToForm = (sample) => {
    if (!sample) return;

    const mappedItems = mapSampleItemsToFormItems(sample.item_description);
    setForm((prev) => ({ ...prev, items: mappedItems }));
    toast({
      title: "Sample items loaded",
      description: `${mappedItems.length} item${mappedItems.length === 1 ? "" : "s"} loaded into PR Items.`,
    });
  };

  const handleSampleChange = async (value) => {
    if (value === "none") {
      setField("sample_id", "");
      return;
    }

    setField("sample_id", value);

    const selectedSample = sampleOptions.find((sample) => String(sample.sample_id || sample.id) === String(value));
    if (selectedSample && parseArrayField(selectedSample.item_description).length > 0) {
      applySelectedSampleToForm(selectedSample);
      return;
    }

    setLoadingSampleItems(true);
    try {
      const result = await api.getSampleById(value);
      if (!result.success) {
        toast({
          title: "Failed to load sample items",
          description: result.error || "Could not fetch selected sample details.",
          variant: "destructive",
        });
        return;
      }

      applySelectedSampleToForm(result.data || {});
    } catch {
      toast({
        title: "Failed to load sample items",
        description: "Could not fetch selected sample details.",
        variant: "destructive",
      });
    } finally {
      setLoadingSampleItems(false);
    }
  };

  const handleFileDrop = (event, field, setDragState) => {
    event.preventDefault();
    setDragState(false);
    const file = event.dataTransfer?.files?.[0];
    setFileField(field, file);
  };

  const handleProjectChange = (value) => {
    if (value === "none") {
      setForm((prev) => ({ ...prev, project_id: "", project_name: "" }));
      return;
    }
    const selected = projectOptions.find((project) => String(project.project_id || project.id) === String(value));
    setForm((prev) => ({
      ...prev,
      project_id: String(value),
      project_name: selected?.project_name || selected?.name || prev.project_name,
    }));
  };

  const handleSubmit = async () => {
    const normalizedProjectId = parseIntegerOrNull(form.project_id);
    if (!normalizedProjectId) {
      toast({
        title: "Validation failed",
        description: "Project ID is required and must be a positive integer.",
        variant: "destructive",
      });
      return;
    }

    if (!String(form.project_name || "").trim()) {
      toast({
        title: "Validation failed",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }

    const cleanedItems = form.items
      .map((item) => ({
        material_description: String(item.material_description || "").trim(),
        unit: String(item.unit || "").trim() || "NOS",
        req_qty: Number(item.req_qty),
        make: String(item.make || "").trim(),
        place_of_utilisation: String(item.place_of_utilisation || "").trim(),
      }))
      .filter((item) => item.material_description && Number.isFinite(item.req_qty) && item.req_qty > 0);

    if (cleanedItems.length === 0) {
      toast({
        title: "Validation failed",
        description: "Add at least one item with description and quantity.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      let prFilePath = "";
      let signatureFilePath = "";

      if (form.prFile instanceof File) {
        const uploadResult = await api.uploadPrFile(form.prFile);
        if (!uploadResult.success) {
          toast({
            title: "PR file upload failed",
            description: uploadResult.error || "Could not upload PR file.",
            variant: "destructive",
          });
          return;
        }
        prFilePath = uploadResult.data?.filePath || "";
      }

      if (form.signatureFile instanceof File) {
        const signatureResult = await api.uploadPrSignature(form.signatureFile);
        if (!signatureResult.success) {
          toast({
            title: "Signature upload failed",
            description: signatureResult.error || "Could not upload signature file.",
            variant: "destructive",
          });
          return;
        }
        signatureFilePath = signatureResult.data?.filePath || "";
      }

      const payload = {
        project_id: normalizedProjectId,
        sample_id: parseIntegerOrNull(form.sample_id),
        project_name: String(form.project_name || "").trim(),
        workorder_no: String(form.workorder_no || "").trim(),
        location: String(form.location || "").trim(),
        mirno: String(form.mirno || "").trim(),
        urgency: form.urgency || "Medium",
        date: form.date || new Date().toISOString().slice(0, 10),
        approved_by: String(form.approved_by || "").trim(),
        remarks: String(form.remarks || "").trim(),
        pr_file_path: prFilePath,
        signature_file_path: signatureFilePath,
        items: cleanedItems,
      };

      const result = await api.createPr(payload);
      if (!result.success) {
        toast({
          title: "Create failed",
          description: result.error || "Unable to create PR.",
          variant: "destructive",
        });
        return;
      }

      const createdPr = result.data || {};
      const generatedPrNumber = formatPrNumber({
        ...createdPr,
        project_id: createdPr.project_id || normalizedProjectId,
        date: createdPr.date || form.date,
      });
      toast({
        title: "PR created",
        description: `Purchase request created successfully. ${generatedPrNumber}`,
      });
      goBackToList();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 md:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Purchase Request</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create PR in a dedicated page flow.</p>
          </div>
          <Button variant="outline" onClick={goBackToList}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to PR List
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>PR Header</CardTitle>
          <CardDescription>Fill required project details and optional attachments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project ID *</Label>
            <Select value={form.project_id || "none"} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select Project ID"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projectOptions.map((project) => {
                  const id = String(project.project_id || project.id);
                  const label = project.project_name || project.name || `Project ${id}`;
                  return (
                    <SelectItem key={id} value={id}>
                      {`${id} - ${label}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input value={form.project_name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Sample ID</Label>
            <Select
              value={form.sample_id || "none"}
              onValueChange={handleSampleChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSamples ? "Loading samples..." : "Optional"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {selectedSampleMissing ? (
                  <SelectItem value={form.sample_id}>Sample #{form.sample_id} (current)</SelectItem>
                ) : null}
                {sampleOptions.map((sample) => {
                  const id = String(sample.sample_id || sample.id);
                  const label = sample.work_done || sample.site_name || sample.building_name || `Sample #${id}`;
                  return (
                    <SelectItem key={id} value={id}>
                      {`#${id} - ${label}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>PR Number</Label>
            <Input value={autoPrNumber} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Work Order No</Label>
            <Input value={form.workorder_no} onChange={(e) => setField("workorder_no", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>MIR No</Label>
            <Select value={form.mirno || "none"} onValueChange={(value) => setField("mirno", value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder={loadingMirs ? "Loading MIR..." : "Select MIR No"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {selectedMirMissing ? (
                  <SelectItem value={form.mirno}>MIR {form.mirno} (current)</SelectItem>
                ) : null}
                {mirOptions.map((mir) => {
                  const ref = String(mir.mir_refrence_no || mir.mir_id || mir.id);
                  const label = mir.material_code || mir.project_name || `MIR ${ref}`;
                  return (
                    <SelectItem key={ref} value={ref}>
                      {`${ref} - ${label}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={form.urgency} onValueChange={(value) => setField("urgency", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Approved By</Label>
            <Input value={form.approved_by} onChange={(e) => setField("approved_by", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setField("location", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Attachments</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <div
                className={`rounded-lg border-2 border-dashed p-5 transition-colors ${
                  isPrDragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsPrDragOver(true);
                }}
                onDragLeave={() => setIsPrDragOver(false)}
                onDrop={(event) => handleFileDrop(event, "prFile", setIsPrDragOver)}
                onClick={() => prFileInputRef.current?.click()}
              >
                <input
                  ref={prFileInputRef}
                  className="hidden"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                  onChange={(e) => setFileField("prFile", e.target.files?.[0])}
                />
                <div className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <UploadCloud className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">PR File</p>
                  <p className="text-xs text-muted-foreground">Drag and drop or click to upload</p>
                  {form.prFile ? (
                    <p className="max-w-full truncate text-xs font-medium text-foreground">{form.prFile.name}</p>
                  ) : null}
                </div>
              </div>

              <div
                className={`rounded-lg border-2 border-dashed p-5 transition-colors ${
                  isSignatureDragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsSignatureDragOver(true);
                }}
                onDragLeave={() => setIsSignatureDragOver(false)}
                onDrop={(event) => handleFileDrop(event, "signatureFile", setIsSignatureDragOver)}
                onClick={() => signatureFileInputRef.current?.click()}
              >
                <input
                  ref={signatureFileInputRef}
                  className="hidden"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setFileField("signatureFile", e.target.files?.[0])}
                />
                <div className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <UploadCloud className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">Signature File</p>
                  <p className="text-xs text-muted-foreground">Drag and drop or click to upload</p>
                  {form.signatureFile ? (
                    <p className="max-w-full truncate text-xs font-medium text-foreground">{form.signatureFile.name}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PR Items</CardTitle>
          <CardDescription>
            {loadingSampleItems
              ? "Loading items from selected sample..."
              : "Add at least one item row."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Add Row
            </Button>
          </div>
          {form.items.map((item, index) => (
            <Card key={`item-${index}`}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label className="mb-1 block text-xs">Material Description *</Label>
                  <Input
                    value={item.material_description}
                    onChange={(e) => setItemField(index, "material_description", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1 block text-xs">Unit</Label>
                  <Input value={item.unit} onChange={(e) => setItemField(index, "unit", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1 block text-xs">Req Qty *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.req_qty}
                    onChange={(e) => setItemField(index, "req_qty", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1 block text-xs">Make</Label>
                  <Input value={item.make} onChange={(e) => setItemField(index, "make", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-1 block text-xs">Place of Utilisation</Label>
                  <Input
                    value={item.place_of_utilisation}
                    onChange={(e) => setItemField(index, "place_of_utilisation", e.target.value)}
                  />
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={form.items.length <= 1}>
                    <X className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={goBackToList} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Create PR
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
