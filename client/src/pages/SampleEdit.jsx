import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Trash2, Eye } from "lucide-react";

export default function SampleEdit() {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    building_name: "",
    site_name: "",
    work_done: "",
    sample_file: "",
    location: { floor: "", block: "", wing: "", coordinates: "" },
    item_description: [{ sr_no: "", description: "", quantity: "", value: "" }],
    add_fields: []
  });
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
        if (!projectId) return;
        const res = await api.getSamplesByProject(projectId);
        if (!res.success) return;

        const arr = Array.isArray(res.data) ? res.data : [];
        const sample = arr.find((item) => String(item.sample_id || item.id) === String(id));
        if (!sample) return;

        const loc = parseMaybe(sample.location, {});
        const items = parseMaybe(sample.item_description, []);
        const adds = parseMaybe(sample.add_fields, []);

        setForm({
          building_name: sample.building_name || "",
          site_name: sample.site_name || "",
          work_done: sample.work_done || "",
          sample_file: sample.sample_file || "",
          location: {
            floor: loc?.floor || "",
            block: loc?.block || "",
            wing: loc?.wing || "",
            coordinates: loc?.coordinates || "",
          },
          item_description: Array.isArray(items) && items.length
            ? items.map((it) => ({
                sr_no: it.sr_no || "",
                description: it.description || "",
                quantity: it.quantity || "",
                value: it.value || "",
              }))
            : [{ sr_no: "", description: "", quantity: "", value: "" }],
          add_fields: Array.isArray(adds)
            ? adds.map((f) => ({ key: f.key || "", value: f.value || "" }))
            : [],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, projectId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateSample(id, {
        building_name: form.building_name,
        site_name: form.site_name,
        work_done: form.work_done,
        sample_file: form.sample_file,
        location: form.location,
        item_description: form.item_description,
        add_fields: form.add_fields,
      });
      if (!res.success) {
        toast({ title: "Update failed", description: res.error || "Error", variant: "destructive" });
        return;
      }
      toast({ title: "Updated", description: "Sample updated" });
      navigate(`/${projectId}/samples/preview/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const fileUrl = form?.sample_file ? api.getApiFileUrl(form.sample_file) : null;
  const lower = String(form?.sample_file || "").toLowerCase();
  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
  const isPdf = lower.endsWith('.pdf');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Sample</h1>
          <p className="text-muted-foreground mt-2">Update sample details and save changes.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/${projectId}/samples/preview/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Preview
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sample #{id}</CardTitle>
          <CardDescription>Editing project sample data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Building Name</Label>
                <Input value={form.building_name} onChange={(e) => setForm({ ...form, building_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Work Done</Label>
                <Input value={form.work_done} onChange={(e) => setForm({ ...form, work_done: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Attachment</Label>
                {fileUrl ? (
                  <Button type="button" variant="outline" onClick={() => setAttachmentOpen(true)} className="mt-1">
                    <Eye className="mr-2 h-4 w-4" /> Preview Attachment
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">No attachment found</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input value={form.location.floor} onChange={(e) => setForm({ ...form, location: { ...form.location, floor: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Block</Label>
                  <Input value={form.location.block} onChange={(e) => setForm({ ...form, location: { ...form.location, block: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Wing</Label>
                  <Input value={form.location.wing} onChange={(e) => setForm({ ...form, location: { ...form.location, wing: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>Coordinates</Label>
                  <Input value={form.location.coordinates} onChange={(e) => setForm({ ...form, location: { ...form.location, coordinates: e.target.value } })} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Item Description</Label>
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...form, item_description: [...form.item_description, { sr_no: "", description: "", quantity: "", value: "" }] })}>
                    <Plus className="mr-2 h-4 w-4" /> Add Row
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.item_description.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <Input placeholder="Sr No" value={row.sr_no} onChange={(e) => {
                        const next = [...form.item_description]; next[idx] = { ...next[idx], sr_no: e.target.value }; setForm({ ...form, item_description: next });
                      }} />
                      <Input placeholder="Description" value={row.description} onChange={(e) => {
                        const next = [...form.item_description]; next[idx] = { ...next[idx], description: e.target.value }; setForm({ ...form, item_description: next });
                      }} />
                      <Input placeholder="Quantity" value={row.quantity} onChange={(e) => {
                        const next = [...form.item_description]; next[idx] = { ...next[idx], quantity: e.target.value }; setForm({ ...form, item_description: next });
                      }} />
                      <Input placeholder="Value" value={row.value} onChange={(e) => {
                        const next = [...form.item_description]; next[idx] = { ...next[idx], value: e.target.value }; setForm({ ...form, item_description: next });
                      }} />
                      <Button size="sm" variant="ghost" onClick={() => {
                        const next = form.item_description.filter((_, i) => i !== idx); setForm({ ...form, item_description: next });
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Additional Fields</Label>
                  <Button size="sm" variant="outline" type="button" onClick={() => setForm({ ...form, add_fields: [...form.add_fields, { key: "", value: "" }] })}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.add_fields.map((f, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                      <Input placeholder="Key" value={f.key} onChange={(e) => {
                        const next = [...form.add_fields]; next[idx] = { ...next[idx], key: e.target.value }; setForm({ ...form, add_fields: next });
                      }} />
                      <Input placeholder="Value" value={f.value} onChange={(e) => {
                        const next = [...form.add_fields]; next[idx] = { ...next[idx], value: e.target.value }; setForm({ ...form, add_fields: next });
                      }} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm({ ...form, add_fields: form.add_fields.filter((_, i) => i !== idx) })}
                        className="md:w-auto w-full"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => navigate(`/${projectId}/samples/preview/${id}`)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {fileUrl && (
        <Dialog open={attachmentOpen} onOpenChange={setAttachmentOpen}>
          <DialogContent className="h-[98vh] w-[99vw] max-w-[99vw]">
            <DialogHeader>
              <DialogTitle>Attachment Preview</DialogTitle>
            </DialogHeader>
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
            <DialogFooter>
              <Button onClick={() => setAttachmentOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
