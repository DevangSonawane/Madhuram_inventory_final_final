import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SamplePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (location.state && location.state.sample) {
          const s = location.state.sample;
          const parseMaybe = (val, fallback) => {
            if (typeof val === 'string') {
              try {
                const parsed = JSON.parse(val);
                return parsed;
              } catch {
                return fallback;
              }
            }
            return val ?? fallback;
          };
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
        }
        const res = await api.getSampleById(id);
        if (res.success && res.data) {
          const raw = res.data;
          const s = Array.isArray(raw)
            ? raw[0]
            : (raw && typeof raw === 'object' && raw.data
              ? (Array.isArray(raw.data) ? raw.data[0] : raw.data)
              : raw);
          const parseMaybe = (val, fallback) => {
            if (typeof val === 'string') {
              try {
                const parsed = JSON.parse(val);
                return parsed;
              } catch {
                return fallback;
              }
            }
            return val ?? fallback;
          };
          const loc = parseMaybe(s.location, {});
          const items = parseMaybe(s.item_description, []);
          const adds = parseMaybe(s.add_fields, []);
          setSample(prev => ({
            sample_id: s.sample_id || s.id || prev?.sample_id,
            project_id: s.project_id ?? prev?.project_id,
            building_name: s.building_name || prev?.building_name || "",
            site_name: s.site_name || prev?.site_name || "",
            work_done: s.work_done || prev?.work_done || "",
            sample_file: s.sample_file || prev?.sample_file || "",
            location: loc && typeof loc === 'object' ? loc : (prev?.location || {}),
            item_description: Array.isArray(items) ? items : (prev?.item_description || []),
            add_fields: Array.isArray(adds) ? adds : (prev?.add_fields || []),
            created_at: s.created_at || prev?.created_at,
            updated_at: s.updated_at || prev?.updated_at,
          }));
        } else {
          setSample(null);
        }
      } catch {
        setSample(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, location.state]);

  const fileUrl = sample?.sample_file ? api.getApiFileUrl(sample.sample_file) : null;
  const lower = String(sample?.sample_file || "").toLowerCase();
  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
  const isPdf = lower.endsWith('.pdf');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sample Preview</h1>
          <p className="text-muted-foreground mt-2">Details and attachment preview</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Details</CardTitle>
              <CardDescription>Sample #{id}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !sample ? (
            <div className="text-muted-foreground">Sample not found</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">ID</div>
                  <div className="font-medium">{sample.sample_id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Project</div>
                  <div className="font-medium">{sample.project_id || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{sample.created_at || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Building</div>
                  <div className="font-medium">{sample.building_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium">{sample.site_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Work Done</div>
                  <div className="font-medium">{sample.work_done || '-'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="font-medium">{sample?.location?.floor || sample?.location?.address_line1 || '-'}</div>
                  <div className="font-medium">{sample?.location?.block || sample?.location?.city || '-'}</div>
                  <div className="font-medium">{sample?.location?.wing || sample?.location?.state || '-'}</div>
                  <div className="font-medium">{sample?.location?.coordinates || sample?.location?.country || '-'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Item Description</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Sr No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[160px]">Quantity</TableHead>
                      <TableHead className="w-[160px]">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sample.item_description || []).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.sr_no || '-'}</TableCell>
                        <TableCell>{row.description || '-'}</TableCell>
                        <TableCell>{row.quantity || '-'}</TableCell>
                        <TableCell>{row.value || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Additional Fields</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(sample.add_fields || []).map((f, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <Input readOnly value={f.key || ''} />
                      <Input readOnly value={f.value || ''} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Attachment</div>
                {!fileUrl ? (
                  <div className="text-muted-foreground">No attachment</div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setAttachmentOpen(true)}>Preview Attachment</Button>
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600">Open in new tab</a>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={attachmentOpen} onOpenChange={setAttachmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attachment Preview</DialogTitle>
          </DialogHeader>
          {!fileUrl ? (
            <div className="text-muted-foreground">No attachment</div>
          ) : (
            <div className="border rounded-md p-3">
              {isImage ? (
                <img src={fileUrl} alt="Sample File" className="max-h-[70vh] object-contain w-full" />
              ) : isPdf ? (
                <iframe src={fileUrl} className="w-full h-[70vh]" />
              ) : (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 break-all">{fileUrl}</a>
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
