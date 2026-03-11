import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, FileText, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function MIR() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { toast } = useToast();
  const [mirs, setMirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMirId, setDeletingMirId] = useState(null);
  const [query, setQuery] = useState("");

  const fetchMirs = async () => {
    try {
      setLoading(true);
      const result = projectId ? await api.getMirsByProject(projectId) : await api.getMirs();
      if (!result.success) {
        setMirs([]);
        toast({
          title: "Failed to load MIRs",
          description: result.error || "Could not fetch MIR list.",
          variant: "destructive",
        });
        return;
      }
      setMirs(Array.isArray(result.data) ? result.data : []);
    } catch {
      setMirs([]);
      toast({
        title: "Failed to load MIRs",
        description: "Could not fetch MIR list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMirs();
  }, [projectId, toast]);

  const filteredMirs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mirs;
    return mirs.filter((item) => {
      const mirNo = (item.mir_refrence_no || "").toLowerCase();
      const projectName = (item.project_name || "").toLowerCase();
      const materialCode = (item.material_code || "").toLowerCase();
      const contractor = (item.contractor || "").toLowerCase();
      return (
        mirNo.includes(normalized) ||
        projectName.includes(normalized) ||
        materialCode.includes(normalized) ||
        contractor.includes(normalized)
      );
    });
  }, [mirs, query]);

  const openDoc = (path) => {
    if (!path) return;
    window.open(api.getApiFileUrl(path), "_blank", "noopener,noreferrer");
  };

  const handleEdit = (mirId) => {
    if (!mirId) return;
    navigate(`${mirId}/edit`);
  };

  const handlePreview = (mirId) => {
    if (!mirId) return;
    navigate(`${mirId}/preview`);
  };

  const handleDelete = async (mirId) => {
    if (!mirId) return;
    const confirmed = window.confirm("Delete this MIR?");
    if (!confirmed) return;
    try {
      setDeletingMirId(mirId);
      const result = await api.deleteMir(mirId);
      if (!result.success) {
        toast({
          title: "Failed to delete MIR",
          description: result.error || "Could not delete MIR.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "MIR deleted", description: "MIR removed successfully." });
      await fetchMirs();
    } catch {
      toast({
        title: "Failed to delete MIR",
        description: "Could not delete MIR.",
        variant: "destructive",
      });
    } finally {
      setDeletingMirId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-6 md:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create MIR</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage material inspection reports.
            </p>
          </div>
          <Button onClick={() => navigate("create")} className="w-full lg:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create MIR
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">MIR List</CardTitle>
          <CardDescription>All MIR entries for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Search by MIR no, project, material, contractor..."
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MIR No</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Inspection Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading MIRs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMirs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No MIR records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMirs.map((item) => (
                  <TableRow key={item.mir_id}>
                    <TableCell className="font-medium">{item.mir_refrence_no || `MIR-${item.mir_id}`}</TableCell>
                    <TableCell>{item.project_name || "-"}</TableCell>
                    <TableCell>{item.material_code || "-"}</TableCell>
                    <TableCell>{formatDate(item.inspection_date_time || item.client_submission_date || item.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={item.mir_submited ? "default" : "secondary"}>
                        {item.mir_submited ? "Submitted" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDoc(item.refrence_docs_attached)}
                          disabled={!item.refrence_docs_attached}
                        >
                          <FileText className="mr-2 h-4 w-4" /> View PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(item.mir_id)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item.mir_id)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.mir_id)}
                          disabled={deletingMirId === item.mir_id}
                        >
                          {deletingMirId === item.mir_id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
