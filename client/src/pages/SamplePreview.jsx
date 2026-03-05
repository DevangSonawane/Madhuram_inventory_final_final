import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Eye, FileText, Image as ImageIcon, Pencil } from "lucide-react";

export default function SamplePreview() {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  const parseMaybe = (val, fallback) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return val ?? fallback;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!projectId) {
          setSample(null);
          return;
        }

        const res = await api.getSamplesByProject(projectId);
        if (!res.success) {
          setSample(null);
          return;
        }

        const arr = Array.isArray(res.data) ? res.data : [];
        const s = arr.find((item) => String(item.sample_id || item.id) === String(id));
        if (!s) {
          setSample(null);
          return;
        }

        const loc = parseMaybe(s.location, {});
        const items = parseMaybe(s.item_description, []);
        const adds = parseMaybe(s.add_fields, []);

        setSample({
          sample_id: s.sample_id || s.id,
          project_id: s.project_id,
          building_name: s.building_name || "",
          site_name: s.site_name || "",
          work_done: s.work_done || "",
          sample_file: s.sample_file || "",
          location: loc && typeof loc === 'object' ? loc : {},
          item_description: Array.isArray(items) ? items : [],
          add_fields: Array.isArray(adds) ? adds : [],
          created_at: s.created_at,
          updated_at: s.updated_at,
        });
      } catch {
        setSample(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, projectId]);

  const fileUrl = sample?.sample_file ? api.getApiFileUrl(sample.sample_file) : null;
  const lower = String(sample?.sample_file || "").toLowerCase();
  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
  const isPdf = lower.endsWith('.pdf');
  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-10">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-r from-background via-background to-muted/40 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">Sample Management</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Sample Preview</h1>
            <p className="text-muted-foreground mt-2">Detailed view and attachment inspection</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => navigate(`/${projectId}/samples/edit/${id}`)} className="w-full sm:w-auto" disabled={!sample}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Sample #{id}</CardTitle>
              <CardDescription>Preview data synced from sample record</CardDescription>
            </div>
            {sample?.sample_id && (
              <Badge variant="secondary" className="px-3 py-1">ID: {sample.sample_id}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !sample ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Sample not found</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Project</div>
                    <div className="mt-1 text-sm font-semibold">{sample.project_id || '-'}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Created</div>
                    <div className="mt-1 text-sm font-semibold">{formatDate(sample.created_at)}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Updated</div>
                    <div className="mt-1 text-sm font-semibold">{formatDate(sample.updated_at)}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Building</div>
                    <div className="mt-1 text-sm font-semibold">{sample.building_name || '-'}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Site</div>
                    <div className="mt-1 text-sm font-semibold">{sample.site_name || '-'}</div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Work Done</div>
                    <div className="mt-1 text-sm font-semibold">{sample.work_done || '-'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Location</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-3 text-sm">{sample?.location?.floor || sample?.location?.address_line1 || '-'}</div>
                    <div className="rounded-lg border p-3 text-sm">{sample?.location?.block || sample?.location?.city || '-'}</div>
                    <div className="rounded-lg border p-3 text-sm">{sample?.location?.wing || sample?.location?.state || '-'}</div>
                    <div className="rounded-lg border p-3 text-sm">{sample?.location?.coordinates || sample?.location?.country || '-'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Item Description</div>
                  <div className="overflow-x-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Sr No</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[160px] text-right">Quantity</TableHead>
                          <TableHead className="w-[160px] text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(sample.item_description || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No item rows available</TableCell>
                          </TableRow>
                        ) : (
                          (sample.item_description || []).map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{row.sr_no || '-'}</TableCell>
                              <TableCell>{row.description || '-'}</TableCell>
                              <TableCell className="text-right">{row.quantity || '-'}</TableCell>
                              <TableCell className="text-right">{row.value || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Additional Fields</div>
                  {(sample.add_fields || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No additional fields</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(sample.add_fields || []).map((f, idx) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">{f.key || 'Field'}</div>
                          <div className="mt-1 text-sm font-medium">{f.value || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="sticky top-4 space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium" >
                    {isImage ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    Attachment
                  </div>
                  {!fileUrl ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No attachment found</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => setAttachmentOpen(true)} className="w-full mt-2">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Attachment
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={attachmentOpen} onOpenChange={setAttachmentOpen}>
        <DialogContent className="h-[98vh] w-[99vw] max-w-[99vw]">
          <DialogHeader>
            <DialogTitle>Attachment Preview</DialogTitle>
          </DialogHeader>
          {!fileUrl ? (
            <div className="text-muted-foreground">No attachment</div>
          ) : (
            <div className="rounded-xl border bg-muted/10 p-3">
              {isImage ? (
                <img src={fileUrl} alt="Sample File" className="max-h-[92vh] object-contain w-full rounded-md" />
              ) : isPdf ? (
                <iframe src={fileUrl} className="h-[92vh] w-full rounded-md" title="Sample Attachment Preview" />
              ) : (
                <div className="flex justify-center">
                  <Button asChild>
                    <a href={fileUrl} target="_blank" rel="noreferrer">Open Attachment</a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAttachmentOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
