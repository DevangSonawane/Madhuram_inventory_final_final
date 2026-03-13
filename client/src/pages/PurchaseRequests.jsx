import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const URGENCY_OPTIONS = ["High", "Medium", "Low"];

const createEmptyItem = () => ({
  material_description: "",
  unit: "NOS",
  req_qty: "",
  make: "",
  place_of_utilisation: "",
});

const createEmptyForm = () => ({
  project_id: "",
  sample_id: "",
  project_name: "",
  workorder_no: "",
  location: "",
  mirno: "",
  urgency: "Medium",
  date: new Date().toISOString().slice(0, 10),
  approved_by: "",
  remarks: "",
  pr_file_path: "",
  signature_file_path: "",
  prFile: null,
  signatureFile: null,
  items: [createEmptyItem()],
});

const parseIntegerOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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

const normalizePr = (item = {}) => ({
  ...item,
  pr_id: item.pr_id || item.id,
  project_id: item.project_id || item.projectId || null,
  sample_id: item.sample_id || item.sampleId || null,
  project_name: item.project_name || "-",
  workorder_no: item.workorder_no || "-",
  location: item.location || "-",
  mirno: item.mirno || "-",
  urgency: item.urgency || "Medium",
  date: item.date || item.created_at || null,
  approved_by: item.approved_by || "-",
  pr_file_path: item.pr_file_path || "",
  signature_file_path: item.signature_file_path || "",
  remarks: item.remarks || "",
  items: Array.isArray(item.items) ? item.items : [],
});

function PrFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  onSubmit,
  submitting,
  selectedProject,
  sampleOptions,
  loadingSamples,
  mirOptions,
  loadingMirs,
}) {
  const title = mode === "edit" ? "Edit Purchase Request" : "Create Purchase Request";
  const selectedSampleMissing = Boolean(
    form.sample_id && !sampleOptions.some((sample) => String(sample.sample_id || sample.id) === form.sample_id)
  );
  const selectedMirMissing = Boolean(
    form.mirno && !mirOptions.some((mir) => String(mir.mir_refrence_no || mir.mir_id || mir.id) === form.mirno)
  );

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill PR header details, upload optional files, and add item rows.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project ID *</Label>
            <Input
              value={form.project_id}
              onChange={(e) => setField("project_id", e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input
              value={form.project_name}
              onChange={(e) => setField("project_name", e.target.value)}
              placeholder={selectedProject?.project_name || "Project name"}
            />
          </div>
          <div className="space-y-2">
            <Label>Sample ID</Label>
            <Select
              value={form.sample_id || "none"}
              onValueChange={(value) => setField("sample_id", value === "none" ? "" : value)}
              disabled={loadingSamples}
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
            <Label>Work Order No</Label>
            <Input
              value={form.workorder_no}
              onChange={(e) => setField("workorder_no", e.target.value)}
              placeholder="WO number"
            />
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
            <Input value={form.date} onChange={(e) => setField("date", e.target.value)} type="date" />
          </div>
          <div className="space-y-2">
            <Label>Approved By</Label>
            <Input
              value={form.approved_by}
              onChange={(e) => setField("approved_by", e.target.value)}
              placeholder="Approver name"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="Site / location"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="space-y-2">
            <Label>PR File</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
              onChange={(e) => setField("prFile", e.target.files?.[0] || null)}
            />
            {form.pr_file_path ? (
              <p className="text-xs text-muted-foreground">Current path: {form.pr_file_path}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Signature File</Label>
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setField("signatureFile", e.target.files?.[0] || null)}
            />
            {form.signature_file_path ? (
              <p className="text-xs text-muted-foreground">Current path: {form.signature_file_path}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">PR Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Add Row
            </Button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, index) => (
              <Card key={`item-${index}`}>
                <CardContent className="grid gap-3 p-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="mb-1 block text-xs">Material Description *</Label>
                    <Input
                      value={item.material_description}
                      onChange={(e) => setItemField(index, "material_description", e.target.value)}
                      placeholder="Material"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block text-xs">Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => setItemField(index, "unit", e.target.value)}
                      placeholder="NOS"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block text-xs">Req Qty *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.req_qty}
                      onChange={(e) => setItemField(index, "req_qty", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block text-xs">Make</Label>
                    <Input
                      value={item.make}
                      onChange={(e) => setItemField(index, "make", e.target.value)}
                      placeholder="Brand / make"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block text-xs">Place of Utilisation</Label>
                    <Input
                      value={item.place_of_utilisation}
                      onChange={(e) => setItemField(index, "place_of_utilisation", e.target.value)}
                      placeholder="Usage area"
                    />
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 1}
                    >
                      <X className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : mode === "edit" ? (
              "Update PR"
            ) : (
              "Create PR"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrViewDialog({ open, onOpenChange, pr }) {
  if (!pr) return null;

  const prFileUrl = pr.pr_file_path ? api.getApiFileUrl(pr.pr_file_path) : "";
  const signatureUrl = pr.signature_file_path ? api.getApiFileUrl(pr.signature_file_path) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{formatPrNumber(pr)}</DialogTitle>
          <DialogDescription>Request details and uploaded documents.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Project</p>
            <p className="font-medium">{pr.project_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Work Order</p>
            <p className="font-medium">{pr.workorder_no}</p>
          </div>
          <div>
            <p className="text-muted-foreground">MIR No</p>
            <p className="font-medium">{pr.mirno}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(pr.date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Urgency</p>
            <p className="font-medium">{pr.urgency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Approved By</p>
            <p className="font-medium">{pr.approved_by}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-muted-foreground">Location</p>
            <p className="font-medium">{pr.location}</p>
          </div>
          {pr.remarks ? (
            <div className="md:col-span-3">
              <p className="text-muted-foreground">Remarks</p>
              <p className="font-medium">{pr.remarks}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {prFileUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={prFileUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" /> View PR File
              </a>
            </Button>
          ) : null}
          {signatureUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={signatureUrl} target="_blank" rel="noreferrer">
                <FileSignature className="mr-2 h-4 w-4" /> View Signature
              </a>
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items ({pr.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Make</TableHead>
                  <TableHead>Place</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      No items.
                    </TableCell>
                  </TableRow>
                ) : (
                  pr.items.map((item, idx) => (
                    <TableRow key={`${item.pr_item_id || idx}`}>
                      <TableCell>{item.material_description || "-"}</TableCell>
                      <TableCell>{item.unit || "-"}</TableCell>
                      <TableCell>{item.req_qty ?? "-"}</TableCell>
                      <TableCell>{item.make || "-"}</TableCell>
                      <TableCell>{item.place_of_utilisation || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { selectedProject } = useProject();
  const { toast } = useToast();

  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingPrId, setEditingPrId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingPrId, setDeletingPrId] = useState(null);
  const [selectedPr, setSelectedPr] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [sampleOptions, setSampleOptions] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [mirOptions, setMirOptions] = useState([]);
  const [loadingMirs, setLoadingMirs] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailPr, setEmailPr] = useState(null);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [emailAttachment, setEmailAttachment] = useState(null);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const [emailRemarks, setEmailRemarks] = useState("");

  const effectiveProjectId = useMemo(
    () => parseIntegerOrNull(projectId) || parseIntegerOrNull(selectedProject?.project_id || selectedProject?.id),
    [projectId, selectedProject]
  );

  const loadPrs = async ({ mode = "auto", sampleId } = {}) => {
    try {
      setLoading(true);

      let result;
      if (mode === "sample" && sampleId) {
        result = await api.getPrsBySample(sampleId);
      } else if (mode === "all") {
        result = await api.getPrs();
      } else {
        const scopedProjectId = parseIntegerOrNull(projectId);
        result = scopedProjectId ? await api.getPrsByProject(scopedProjectId) : await api.getPrs();
      }

      if (!result.success) {
        setPrs([]);
        toast({
          title: "Failed to load PRs",
          description: result.error || "Could not fetch purchase requests.",
          variant: "destructive",
        });
        return;
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      setPrs(rows.map(normalizePr));
    } catch {
      setPrs([]);
      toast({
        title: "Failed to load PRs",
        description: "Could not fetch purchase requests.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrs();
  }, [projectId]);

  useEffect(() => {
    let mounted = true;

    const loadSampleOptions = async () => {
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

    loadSampleOptions();
    return () => {
      mounted = false;
    };
  }, [effectiveProjectId]);

  useEffect(() => {
    let mounted = true;

    const loadMirOptions = async () => {
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

    loadMirOptions();
    return () => {
      mounted = false;
    };
  }, [effectiveProjectId]);

  const totalItems = useMemo(
    () => prs.reduce((sum, pr) => sum + (Array.isArray(pr.items) ? pr.items.length : 0), 0),
    [prs]
  );

  const highUrgencyCount = useMemo(
    () => prs.filter((pr) => String(pr.urgency).toLowerCase() === "high").length,
    [prs]
  );

  const filteredPrs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return prs.filter((pr) => {
      if (urgencyFilter !== "all" && String(pr.urgency).toLowerCase() !== urgencyFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        pr.pr_id,
        pr.project_name,
        pr.workorder_no,
        pr.location,
        pr.mirno,
        pr.approved_by,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [prs, query, urgencyFilter]);

  const openEditDialog = (pr) => {
    setEditingPrId(pr.pr_id);
    setForm({
      project_id: pr.project_id ? String(pr.project_id) : "",
      sample_id: pr.sample_id ? String(pr.sample_id) : "",
      project_name: pr.project_name === "-" ? "" : pr.project_name,
      workorder_no: pr.workorder_no === "-" ? "" : pr.workorder_no,
      location: pr.location === "-" ? "" : pr.location,
      mirno: pr.mirno === "-" ? "" : pr.mirno,
      urgency: pr.urgency || "Medium",
      date: pr.date ? String(pr.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      approved_by: pr.approved_by === "-" ? "" : pr.approved_by,
      remarks: pr.remarks || "",
      pr_file_path: pr.pr_file_path || "",
      signature_file_path: pr.signature_file_path || "",
      prFile: null,
      signatureFile: null,
      items: Array.isArray(pr.items) && pr.items.length > 0
        ? pr.items.map((item) => ({
            material_description: item.material_description || "",
            unit: item.unit || "NOS",
            req_qty: item.req_qty ?? "",
            make: item.make || "",
            place_of_utilisation: item.place_of_utilisation || "",
          }))
        : [createEmptyItem()],
    });
    setFormOpen(true);
  };

  const openViewDialog = async (prId) => {
    const id = parseIntegerOrNull(prId);
    if (!id) return;

    const result = await api.getPrById(id);
    if (!result.success) {
      toast({
        title: "Failed to load PR",
        description: result.error || "Could not fetch PR details.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPr(normalizePr(result.data || {}));
    setViewOpen(true);
  };

  const handleSubmitForm = async () => {
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
      setFormSubmitting(true);

      let prFilePath = form.pr_file_path;
      let signatureFilePath = form.signature_file_path;

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

      const response = editingPrId
        ? await api.updatePr(editingPrId, payload)
        : await api.createPr(payload);

      if (!response.success) {
        toast({
          title: editingPrId ? "Update failed" : "Create failed",
          description: response.error || "Unable to save PR.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: editingPrId ? "PR updated" : "PR created",
        description: editingPrId
          ? "Purchase request updated successfully."
          : `Purchase request created successfully. ${formatPrNumber(response.data || { ...payload, pr_id: "new" })}`,
      });

      setFormOpen(false);
      setEditingPrId(null);
      await loadPrs();
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePr = async (prId) => {
    const id = parseIntegerOrNull(prId);
    if (!id) return;

    const confirmed = window.confirm("Delete this purchase request?");
    if (!confirmed) return;

    try {
      setDeletingPrId(id);
      const result = await api.deletePr(id);
      if (!result.success) {
        toast({
          title: "Delete failed",
          description: result.error || "Could not delete PR.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "PR deleted", description: "Purchase request removed successfully." });
      await loadPrs();
    } finally {
      setDeletingPrId(null);
    }
  };

  const getVendorId = (vendor) => String(vendor?.vendor_id ?? vendor?.id ?? "");

  const openEmailDialog = async (pr) => {
    const projectScopeId = parseIntegerOrNull(pr?.project_id) || effectiveProjectId;
    setEmailPr(pr);
    setEmailDialogOpen(true);
    setVendorDropdownOpen(false);
    setVendorSearch("");
    setVendorOptions([]);
    setSelectedVendorIds([]);
    setEmailAttachment(null);
    setIsFileDragActive(false);
    setEmailRemarks("");

    try {
      setLoadingVendors(true);
      const result = projectScopeId
        ? await api.getVendorsByProject(projectScopeId)
        : await api.getVendors();

      if (!result.success || !Array.isArray(result.data)) {
        toast({
          title: "Failed to load vendors",
          description: result.error || "Could not load vendor list.",
          variant: "destructive",
        });
        return;
      }

      const withEmail = result.data.filter((vendor) => String(vendor?.vendor_email || "").trim());
      setVendorOptions(withEmail);
      setSelectedVendorIds([]);
    } catch {
      toast({
        title: "Failed to load vendors",
        description: "Could not load vendor list.",
        variant: "destructive",
      });
    } finally {
      setLoadingVendors(false);
    }
  };

  const toggleVendorSelection = (vendorId, checked) => {
    if (!vendorId) return;
    setSelectedVendorIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(vendorId);
      else next.delete(vendorId);
      return Array.from(next);
    });
  };

  const handleAttachmentSelect = (file) => {
    if (!(file instanceof File)) return;
    setEmailAttachment(file);
  };

  const handleAttachmentDrop = (event) => {
    event.preventDefault();
    setIsFileDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleAttachmentSelect(file);
  };

  const handleSendPrEmail = async () => {
    if (!emailPr) return;

    const selectedVendors = vendorOptions.filter((vendor) => selectedVendorIds.includes(getVendorId(vendor)));
    if (selectedVendors.length === 0) {
      toast({
        title: "Select vendors",
        description: "Choose at least one vendor with a valid email.",
        variant: "destructive",
      });
      return;
    }

    try {
      setEmailSending(true);
      const result = await api.sendPrEmail({
        pr: emailPr,
        vendors: selectedVendors.map((vendor) => ({
          vendor_id: vendor.vendor_id || vendor.id,
          vendor_name: vendor.vendor_name || vendor.vendor_company_name || "Vendor",
          vendor_email: vendor.vendor_email,
        })),
        attachmentFile: emailAttachment,
        custom_remarks: String(emailRemarks || "").trim(),
      });

      if (!result.success) {
        toast({
          title: "Email failed",
          description: result.error || "Could not send PR email.",
          variant: "destructive",
        });
        return;
      }

      setEmailDialogOpen(false);
      setEmailPr(null);
      setVendorOptions([]);
      setSelectedVendorIds([]);
      setEmailAttachment(null);
      setEmailRemarks("");
      toast({
        title: "Email sent",
        description: `PR sent to ${selectedVendors.length} vendor(s).`,
      });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 md:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage PR lifecycle with project-scoped API endpoints.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={() => loadPrs()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => navigate("create")}>
              <Plus className="mr-2 h-4 w-4" /> Create PR
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total PRs</CardDescription>
            <CardTitle className="text-2xl">{prs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Urgency</CardDescription>
            <CardTitle className="text-2xl">{highUrgencyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl">{totalItems}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter purchase requests.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-9">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by PR ID, project, WO, location, MIR..."
            />
          </div>

          <div className="md:col-span-2">
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PR List</CardTitle>
          <CardDescription>All purchase requests for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Files</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading purchase requests...
                    </span>
                  </TableCell>
                </TableRow>
              ) : filteredPrs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No purchase requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrs.map((pr) => {
                  const urgency = String(pr.urgency || "").toLowerCase();
                  const urgencyClass =
                    urgency === "high"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : urgency === "medium"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-sky-200 bg-sky-50 text-sky-700";

                  return (
                    <TableRow key={pr.pr_id}>
                      <TableCell className="font-medium">{formatPrNumber(pr)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{pr.project_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {pr.project_id || "-"}</div>
                      </TableCell>
                      <TableCell>{pr.workorder_no}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {formatDate(pr.date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={urgencyClass}>
                          {pr.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>{pr.items.length}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pr.pr_file_path ? (
                            <Badge variant="secondary">
                              <FileText className="mr-1 h-3 w-3" /> PR
                            </Badge>
                          ) : null}
                          {pr.signature_file_path ? (
                            <Badge variant="secondary">
                              <FileSignature className="mr-1 h-3 w-3" /> Sign
                            </Badge>
                          ) : null}
                          {!pr.pr_file_path && !pr.signature_file_path ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openViewDialog(pr.pr_id)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(pr)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEmailDialog(pr)}>
                            <Mail className="mr-2 h-4 w-4" /> Email
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePr(pr.pr_id)}
                            disabled={deletingPrId === pr.pr_id}
                          >
                            {deletingPrId === pr.pr_id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PrFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingPrId ? "edit" : "create"}
        form={form}
        setForm={setForm}
        submitting={formSubmitting}
        onSubmit={handleSubmitForm}
        selectedProject={selectedProject}
        sampleOptions={sampleOptions}
        loadingSamples={loadingSamples}
        mirOptions={mirOptions}
        loadingMirs={loadingMirs}
      />

      <PrViewDialog open={viewOpen} onOpenChange={setViewOpen} pr={selectedPr} />

      <Dialog
        open={emailDialogOpen}
        onOpenChange={(open) => {
          setEmailDialogOpen(open);
          if (!open) {
            setEmailPr(null);
            setVendorOptions([]);
            setSelectedVendorIds([]);
            setVendorDropdownOpen(false);
            setVendorSearch("");
            setEmailAttachment(null);
            setIsFileDragActive(false);
            setEmailRemarks("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Purchase Request</DialogTitle>
            <DialogDescription>
              Select vendors. The selected PR will be sent to their email addresses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <div><span className="font-medium">PR:</span> {emailPr ? formatPrNumber(emailPr) : "-"}</div>
              <div><span className="font-medium">Project:</span> {emailPr?.project_name || "-"}</div>
            </div>

            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center transition-colors ${
                  isFileDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsFileDragActive(true);
                }}
                onDragLeave={() => setIsFileDragActive(false)}
                onDrop={handleAttachmentDrop}
              >
                <input
                  type="file"
                  className="hidden"
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={(event) => handleAttachmentSelect(event.target.files?.[0])}
                />
                <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">Drag and drop a file here, or click to upload</p>
                <p className="text-xs text-muted-foreground">The selected file will be attached when you send the email.</p>
              </label>
              {emailAttachment ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span className="truncate">{emailAttachment.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEmailAttachment(null)}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea
                value={emailRemarks}
                onChange={(event) => setEmailRemarks(event.target.value)}
                placeholder="Add any note for vendors..."
                rows={3}
              />
            </div>

            <Label>Vendors</Label>

            <div className="rounded-lg border p-3">
              {loadingVendors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors...
                </div>
              ) : vendorOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendors with email found for this project.</p>
              ) : (
                <div className="space-y-3">
                  <Popover open={vendorDropdownOpen} onOpenChange={setVendorDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="truncate">
                          {selectedVendorIds.length > 0
                            ? `${selectedVendorIds.length} vendor(s) selected`
                            : "Select Vendors"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[430px] max-w-[90vw] p-3" align="start">
                      <div className="space-y-3">
                        <Input
                          value={vendorSearch}
                          onChange={(e) => setVendorSearch(e.target.value)}
                          placeholder="Search vendor name or email..."
                        />
                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {vendorOptions
                            .filter((vendor) => {
                              const q = vendorSearch.trim().toLowerCase();
                              if (!q) return true;
                              const name = String(vendor.vendor_name || vendor.vendor_company_name || "").toLowerCase();
                              const email = String(vendor.vendor_email || "").toLowerCase();
                              return name.includes(q) || email.includes(q);
                            })
                            .map((vendor) => {
                              const vendorId = getVendorId(vendor);
                              const checked = selectedVendorIds.includes(vendorId);
                              const label = vendor.vendor_name || vendor.vendor_company_name || "Vendor";
                              return (
                                <label
                                  key={vendorId}
                                  className="flex cursor-pointer items-start gap-2 rounded-md border p-2 hover:bg-accent/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => toggleVendorSelection(vendorId, Boolean(value))}
                                  />
                                  <span className="min-w-0 text-sm">
                                    <span className="block truncate font-medium">{label}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{vendor.vendor_email}</span>
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {selectedVendorIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {vendorOptions
                        .filter((vendor) => selectedVendorIds.includes(getVendorId(vendor)))
                        .map((vendor) => {
                          const vendorId = getVendorId(vendor);
                          return (
                            <Badge key={vendorId} variant="secondary" className="gap-1">
                              {vendor.vendor_name || vendor.vendor_company_name || "Vendor"}
                              <button
                                type="button"
                                className="inline-flex"
                                onClick={() => toggleVendorSelection(vendorId, false)}
                                aria-label={`Remove ${vendor.vendor_name || "vendor"}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No vendor selected</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={emailSending}>
              Cancel
            </Button>
            <Button onClick={handleSendPrEmail} disabled={emailSending || loadingVendors || selectedVendorIds.length === 0}>
              {emailSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
