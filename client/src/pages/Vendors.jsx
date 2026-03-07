import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Building2,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const statusStyles = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-amber-100 text-amber-800 border-amber-200",
  blocked: "bg-rose-100 text-rose-800 border-rose-200",
};

const getEmptyForm = (projectId = "") => ({
  project_id: projectId ? String(projectId) : "",
  vendor_name: "",
  vendor_company_name: "",
  vendor_email: "",
  mobile_number: "",
  location: "",
  status: "active",
});

export default function Vendors() {
  const { toast } = useToast();
  const { projectId } = useParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [form, setForm] = useState(getEmptyForm(projectId));

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const result = projectId
        ? await api.getVendorsByProject(projectId)
        : await api.getVendors();

      if (result.success) {
        setVendors(Array.isArray(result.data) ? result.data : []);
      } else {
        setVendors([]);
        toast({
          title: "Failed to load vendors",
          description: result.error || "Could not fetch vendor list.",
          variant: "destructive",
        });
      }
    } catch {
      setVendors([]);
      toast({
        title: "Failed to load vendors",
        description: "Could not fetch vendor list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      project_id: prev.project_id || (projectId ? String(projectId) : ""),
    }));
  }, [projectId]);

  const projects = useMemo(() => {
    return Array.from(new Set(vendors.map((vendor) => String(vendor.project_id)).filter(Boolean)));
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const name = (vendor.vendor_name || "").toLowerCase();
      const company = (vendor.vendor_company_name || "").toLowerCase();
      const email = (vendor.vendor_email || "").toLowerCase();
      const phone = (vendor.mobile_number || "").toLowerCase();
      const location = (vendor.location || "").toLowerCase();

      const matchesSearch =
        !normalized ||
        name.includes(normalized) ||
        company.includes(normalized) ||
        email.includes(normalized) ||
        phone.includes(normalized) ||
        location.includes(normalized);

      const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
      const matchesProject =
        projectFilter === "all" || String(vendor.project_id) === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [vendors, query, statusFilter, projectFilter]);

  const stats = useMemo(() => {
    const activeCount = vendors.filter((vendor) => vendor.status === "active").length;
    const blockedCount = vendors.filter((vendor) => vendor.status === "blocked").length;

    return {
      total: vendors.length,
      active: activeCount,
      blocked: blockedCount,
      projects: new Set(vendors.map((vendor) => vendor.project_id).filter(Boolean)).size,
    };
  }, [vendors]);

  const openCreateDialog = () => {
    setEditingVendorId(null);
    setEditingVendor(null);
    setForm(getEmptyForm(projectId));
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor) => {
    setEditingVendorId(vendor.vendor_id);
    setEditingVendor(vendor);
    setForm({
      project_id: vendor.project_id != null ? String(vendor.project_id) : "",
      vendor_name: vendor.vendor_name || "",
      vendor_company_name: vendor.vendor_company_name || "",
      vendor_email: vendor.vendor_email || "",
      mobile_number: vendor.mobile_number || "",
      location: vendor.location || "",
      status: vendor.status || "active",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendor_name.trim()) {
      toast({
        title: "Vendor name required",
        description: "Please enter vendor name before saving.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      project_id: form.project_id ? Number(form.project_id) : undefined,
      vendor_name: form.vendor_name.trim(),
      vendor_company_name: form.vendor_company_name.trim(),
      vendor_email: form.vendor_email.trim(),
      mobile_number: form.mobile_number.trim(),
      location: form.location.trim(),
      status: form.status,
    };

    try {
      setSubmitting(true);

      let result;
      if (editingVendorId) {
        const originalProjectId =
          editingVendor?.project_id != null ? Number(editingVendor.project_id) : null;
        const nextProjectId = payload.project_id != null ? Number(payload.project_id) : null;
        const otherFieldsChanged =
          (editingVendor?.vendor_name || "") !== payload.vendor_name ||
          (editingVendor?.vendor_company_name || "") !== payload.vendor_company_name ||
          (editingVendor?.vendor_email || "") !== payload.vendor_email ||
          (editingVendor?.mobile_number || "") !== payload.mobile_number ||
          (editingVendor?.location || "") !== payload.location ||
          originalProjectId !== nextProjectId;
        const statusChanged = (editingVendor?.status || "active") !== payload.status;

        if (statusChanged && !otherFieldsChanged) {
          result = await api.updateVendorStatus(editingVendorId, payload.status);
        } else {
          result = await api.updateVendor(editingVendorId, payload);
        }
      } else {
        result = await api.createVendor(payload);
      }

      if (!result.success) {
        toast({
          title: editingVendorId ? "Failed to update vendor" : "Failed to create vendor",
          description: result.error || "Please check the form values and try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: editingVendorId ? "Vendor updated" : "Vendor created",
        description: editingVendorId
          ? "Vendor details were updated successfully."
          : "Vendor was added successfully.",
      });

      setIsDialogOpen(false);
      setEditingVendorId(null);
      setEditingVendor(null);
      setForm(getEmptyForm(projectId));
      await fetchVendors();
    } catch {
      toast({
        title: editingVendorId ? "Failed to update vendor" : "Failed to create vendor",
        description: "Something went wrong while saving vendor.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete?.vendor_id) return;

    try {
      setDeletingVendorId(vendorToDelete.vendor_id);
      const result = await api.deleteVendor(vendorToDelete.vendor_id);

      if (!result.success) {
        toast({
          title: "Failed to delete vendor",
          description: result.error || "Could not delete vendor.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vendor deleted",
        description: `${vendorToDelete.vendor_name || "Vendor"} removed successfully.`,
      });
      setVendorToDelete(null);
      await fetchVendors();
    } catch {
      toast({
        title: "Failed to delete vendor",
        description: "Something went wrong while deleting vendor.",
        variant: "destructive",
      });
    } finally {
      setDeletingVendorId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage project vendors in one place.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="w-full lg:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Vendors</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Across loaded scope</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">{stats.active}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Ready for procurement</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked</CardDescription>
            <CardTitle className="text-2xl">{stats.blocked}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Need review before use</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projects Covered</CardDescription>
            <CardTitle className="text-2xl">{stats.projects}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Distinct project mappings</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Vendor Directory</CardTitle>
          <CardDescription>Search and filter real vendor records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, company, email, phone or city"
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((pid) => (
                  <SelectItem key={pid} value={pid}>
                    Project {pid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      No vendors found for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.vendor_id}>
                      <TableCell>
                        <div className="font-medium">{vendor.vendor_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {vendor.vendor_company_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>Project {vendor.project_id ?? "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> {vendor.vendor_email || "-"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {vendor.mobile_number || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {vendor.location || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[vendor.status] || ""} variant="outline">
                          {vendor.status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(vendor)}
                            title="Edit vendor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setVendorToDelete(vendor)}
                            title="Delete vendor"
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVendorId ? "Edit Vendor" : "Create Vendor"}</DialogTitle>
            <DialogDescription>
              Update vendor details and status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input
                id="vendor_name"
                value={form.vendor_name}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor_name: event.target.value }))}
                placeholder="Enter vendor name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Project ID</Label>
              <Input
                id="project_id"
                value={form.project_id}
                onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
                placeholder="Enter project ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" /> active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                  <SelectItem value="blocked">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" /> blocked
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_company_name">Company Name</Label>
              <Input
                id="vendor_company_name"
                value={form.vendor_company_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor_company_name: event.target.value }))
                }
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_email">Email</Label>
              <Input
                id="vendor_email"
                type="email"
                value={form.vendor_email}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor_email: event.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input
                id="mobile_number"
                value={form.mobile_number}
                onChange={(event) => setForm((prev) => ({ ...prev, mobile_number: event.target.value }))}
                placeholder="Enter mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Enter location"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingVendorId ? (
                "Save Changes"
              ) : (
                "Create Vendor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vendorToDelete} onOpenChange={(open) => !open && setVendorToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {vendorToDelete?.vendor_name || "this vendor"}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVendorToDelete(null)}
              disabled={deletingVendorId === vendorToDelete?.vendor_id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVendor}
              disabled={deletingVendorId === vendorToDelete?.vendor_id}
            >
              {deletingVendorId === vendorToDelete?.vendor_id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Vendor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
