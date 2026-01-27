import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Upload, FileText, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdfUtils";
import { extractWorkOrderFields, mapExtractedToProjectFormForm } from "@/lib/workOrderExtractor";

export default function ProjectForm({ project, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    project_name: '',
    product_duration: '',
    client_name: '',
    location: '',
    floor: '',
    estimate_value: '',
    work_order_information: '',
    wo_number: '',
    pr_po_tracking: [],
    samples: [],
    ml_management: {
      ml_task: ''
    }
  });

  const [files, setFiles] = useState({
    work_order_file: null,
    mas_file: null
  });

  const [filePreviews, setFilePreviews] = useState({
    work_order_file: null,
    mas_file: null
  });

  const [prPoInput, setPrPoInput] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState({
    project_name: '',
    client_name: '',
    product_duration: '',
    work_order_information: '',
    wo_number: ''
  });
  const workOrderInputRef = useRef(null);
  const { toast } = useToast();

  const ACCEPT_WO = '.pdf,.csv,.xlsx,.xls,.doc,.docx';
  const isPdf = (f) => f && (f.type === 'application/pdf' || (f.name || '').toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    if (project) {
      // Handle ml_management - API returns object but expects array in request
      let mlManagement = { ml_task: '' };
      if (project.ml_management) {
        if (Array.isArray(project.ml_management) && project.ml_management.length > 0) {
          mlManagement = { ml_task: project.ml_management[0] || '' };
        } else if (typeof project.ml_management === 'object' && project.ml_management.ml_task) {
          mlManagement = { ml_task: project.ml_management.ml_task };
        }
      }

      setFormData({
        project_name: project.project_name || '',
        product_duration: project.product_duration || project.project_startdate || '',
        client_name: project.client_name || '',
        location: project.location || '',
        floor: project.floor || '',
        estimate_value: project.estimate_value || '',
        work_order_information: project.work_order_information || '',
        wo_number: project.wo_number || '',
        pr_po_tracking: project.pr_po_tracking || [],
        samples: project.samples || [],
        ml_management: mlManagement
      });

      // Set file previews for existing files
      if (project.work_order_file) {
        setFilePreviews(prev => ({
          ...prev,
          work_order_file: api.getFileUrl(project.work_order_file)
        }));
      }
      if (project.mas_file) {
        setFilePreviews(prev => ({
          ...prev,
          mas_file: api.getFileUrl(project.mas_file)
        }));
      }
    }
  }, [project]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Revoke all blob URLs when component unmounts
      Object.values(filePreviews).forEach(url => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filePreviews]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'ml_task') {
      setFormData(prev => ({
        ...prev,
        ml_management: {
          ...prev.ml_management,
          ml_task: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const runExtractAndPreview = async (file) => {
    setExtractError(null);
    setExtracting(true);
    try {
      // Optimized extraction: only process first 10 pages + last 5 pages for faster results
      const raw = await extractTextFromPdf(file, {
        maxHeaderPages: 10,
        maxTailPages: 5,
        batchSize: 5, // Process pages in parallel
        preserveLines: false // Faster without line preservation
      });
      
      const ext = extractWorkOrderFields(raw);
      const mapped = mapExtractedToProjectFormForm(ext);
      
      // Auto-populate form fields immediately
      console.log('Extracted data:', mapped); // Debug log
      setFormData((prev) => {
        const updated = { ...prev };
        // Only fill empty fields to avoid overwriting user input
        if (!prev.project_name && mapped.project_name) {
          updated.project_name = mapped.project_name;
          console.log('Auto-filled project_name:', mapped.project_name);
        }
        if (!prev.client_name && mapped.client_name) {
          updated.client_name = mapped.client_name;
          console.log('Auto-filled client_name:', mapped.client_name);
        }
        if (!prev.product_duration && mapped.product_duration) {
          updated.product_duration = mapped.product_duration;
          console.log('Auto-filled product_duration:', mapped.product_duration);
        }
        if (!prev.work_order_information && mapped.work_order_information) {
          updated.work_order_information = mapped.work_order_information;
          console.log('Auto-filled work_order_information');
        }
        if (!prev.wo_number && mapped.wo_number) {
          updated.wo_number = mapped.wo_number;
          console.log('Auto-filled wo_number:', mapped.wo_number);
        }
        return updated;
      });
      
      // Show success notification
      const extractedFields = [];
      if (mapped.project_name) extractedFields.push('Project Name');
      if (mapped.client_name) extractedFields.push('Client Name');
      if (mapped.product_duration) extractedFields.push('Product Duration');
      if (mapped.wo_number) extractedFields.push('Work Order Number');
      
      if (extractedFields.length > 0) {
        toast({
          title: 'Fields auto-filled',
          description: `Extracted and filled: ${extractedFields.join(', ')}. You can edit any field as needed.`,
        });
      } else {
        toast({
          title: 'Extraction complete',
          description: "Couldn't extract specific fields, but PDF is ready. Please fill the form manually.",
          variant: 'default',
        });
      }
      
      // Store preview for optional manual review
      setExtractedPreview({ ...mapped });
    } catch (err) {
      console.error(err);
      setExtractError(err?.message || 'Could not read PDF.');
      toast({
        title: 'Extraction failed',
        description: "We couldn't read this PDF. You can still attach it and fill the form manually.",
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 10MB to avoid 413 errors)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of 10 MB. Please compress or use a smaller file.`,
        variant: 'destructive',
      });
      e.target.value = ''; // Clear the input
      return;
    }
    
    setFiles(prev => ({ ...prev, [fileType]: file }));
    setFilePreviews(prev => ({ ...prev, [fileType]: URL.createObjectURL(file) }));
    if (fileType === 'work_order_file' && isPdf(file)) runExtractAndPreview(file);
  };

  const handleWorkOrderDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    
    const ext = (file.name || '').toLowerCase();
    const ok = ['.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx'].some((x) => ext.endsWith(x));
    if (!ok) {
      toast({ title: 'Invalid file', description: 'Use PDF, CSV, Excel, or Word.', variant: 'destructive' });
      return;
    }
    
    // Validate file size (max 10MB to avoid 413 errors)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of 10 MB. Please compress or use a smaller file.`,
        variant: 'destructive',
      });
      return;
    }
    
    setFiles(prev => ({ ...prev, work_order_file: file }));
    setFilePreviews(prev => ({ ...prev, work_order_file: URL.createObjectURL(file) }));
    if (isPdf(file)) runExtractAndPreview(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (fileType) => {
    // Clean up blob URL to prevent memory leaks
    setFilePreviews(prev => {
      const currentUrl = prev[fileType];
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
      const next = { ...prev, [fileType]: null };
      if (fileType === 'work_order_file' && project?.work_order_file) {
        next.work_order_file = api.getFileUrl(project.work_order_file);
      }
      return next;
    });
    setFiles(prev => ({ ...prev, [fileType]: null }));
    if (fileType === 'work_order_file') {
      setExtractError(null);
      setPreviewOpen(false);
      if (workOrderInputRef.current) workOrderInputRef.current.value = '';
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all blob URLs when component unmounts
      Object.values(filePreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const applyPreviewToForm = () => {
    setFormData((prev) => {
      const next = { ...prev };
      if (!prev.project_name && extractedPreview.project_name) next.project_name = extractedPreview.project_name;
      if (!prev.client_name && extractedPreview.client_name) next.client_name = extractedPreview.client_name;
      if (!prev.product_duration && extractedPreview.product_duration) next.product_duration = extractedPreview.product_duration;
      if (!prev.work_order_information && extractedPreview.work_order_information) next.work_order_information = extractedPreview.work_order_information;
      return next;
    });
    setPreviewOpen(false);
    toast({ title: 'Applied', description: 'Extracted values filled into empty fields.' });
  };

  const updatePreview = (field, value) => {
    setExtractedPreview((p) => ({ ...p, [field]: value }));
  };

  const addPrPo = () => {
    if (prPoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        pr_po_tracking: [...prev.pr_po_tracking, prPoInput.trim()]
      }));
      setPrPoInput('');
    }
  };

  const removePrPo = (index) => {
    setFormData(prev => ({
      ...prev,
      pr_po_tracking: prev.pr_po_tracking.filter((_, i) => i !== index)
    }));
  };

  const addSample = () => {
    if (sampleInput.trim()) {
      setFormData(prev => ({
        ...prev,
        samples: [...prev.samples, sampleInput.trim()]
      }));
      setSampleInput('');
    }
  };

  const removeSample = (index) => {
    setFormData(prev => ({
      ...prev,
      samples: prev.samples.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Ensure all fields are included, even if empty
      const submitData = {
        project_name: formData.project_name || '',
        product_duration: formData.product_duration || '',
        client_name: formData.client_name || '',
        location: formData.location || '',
        floor: formData.floor || '',
        estimate_value: formData.estimate_value || '',
        work_order_information: formData.work_order_information || '',
        wo_number: formData.wo_number || '',
        pr_po_tracking: formData.pr_po_tracking || [],
        samples: formData.samples || [],
        ml_management: formData.ml_management || { ml_task: '' },
        work_order_file: files.work_order_file,
        mas_file: files.mas_file
      };

      let result;
      if (project?.project_id) {
        result = await api.updateProject(project.project_id, submitData);
      } else {
        result = await api.createProject(submitData);
      }

      if (result.success) {
        onSuccess?.(result.data);
        toast({
          title: 'Success',
          description: project ? 'Project updated successfully' : 'Project created successfully',
        });
      } else {
        const errorMsg = result.error || 'Failed to save project';
        setError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_name">Project Name *</Label>
          <Input
            id="project_name"
            name="project_name"
            value={formData.project_name}
            onChange={handleInputChange}
            required
            placeholder="Enter project name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_duration">Product Duration *</Label>
          <Input
            id="product_duration"
            name="product_duration"
            type="date"
            value={formData.product_duration}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_name">Client Name *</Label>
        <Input
          id="client_name"
          name="client_name"
          value={formData.client_name}
          onChange={handleInputChange}
          required
          placeholder="Enter client name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="Enter project location"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            name="floor"
            value={formData.floor}
            onChange={handleInputChange}
            placeholder="Enter floor information"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimate_value">Estimate Value</Label>
          <Input
            id="estimate_value"
            name="estimate_value"
            value={formData.estimate_value}
            onChange={handleInputChange}
            placeholder="Enter estimate value"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wo_number">Work Order Number</Label>
          <Input
            id="wo_number"
            name="wo_number"
            value={formData.wo_number}
            onChange={handleInputChange}
            placeholder="Enter work order number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Work Order File {!project && '*'}</Label>
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center transition-colors hover:bg-muted/50"
          onDragOver={handleDragOver}
          onDrop={handleWorkOrderDrop}
        >
          <input
            ref={workOrderInputRef}
            id="work_order_file"
            type="file"
            accept={ACCEPT_WO}
            onChange={(e) => handleFileChange(e, 'work_order_file')}
            className="sr-only"
          />
          {files.work_order_file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <span className="font-medium">{files.work_order_file.name}</span>
              <span className="text-sm text-muted-foreground">
                {files.work_order_file.size > 1024 * 1024 
                  ? `${(files.work_order_file.size / 1024 / 1024).toFixed(2)} MB`
                  : `${(files.work_order_file.size / 1024).toFixed(1)} KB`}
                {isPdf(files.work_order_file) && (extracting ? ' · Extracting…' : ' · PDF ready')}
              </span>
              {extractError && <span className="text-sm text-destructive">{extractError}</span>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => workOrderInputRef.current?.click()}>
                  Replace
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('work_order_file')}>
                  Remove
                </Button>
              </div>
            </div>
          ) : filePreviews.work_order_file ? (
            <div className="flex flex-col items-center gap-2">
              <a
                href={filePreviews.work_order_file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View existing
              </a>
              <Button type="button" variant="outline" size="sm" onClick={() => workOrderInputRef.current?.click()}>
                Replace
              </Button>
            </div>
          ) : (
            <label htmlFor="work_order_file" className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Drag and drop or click to upload</span>
              <span className="text-xs text-muted-foreground">PDF, CSV, Excel, Word</span>
            </label>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PDF: we’ll try to extract project details for preview. Other formats: attach only.
        </p>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Preview extracted from work order
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Review and edit below. Apply will fill only <strong>empty</strong> form fields.
          </p>
          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="pf_preview_project_name">Project name</Label>
                <Input
                  id="pf_preview_project_name"
                  value={extractedPreview.project_name}
                  onChange={(e) => updatePreview('project_name', e.target.value)}
                  placeholder="e.g. Oakwood Kalyan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_preview_client_name">Client name</Label>
                <Input
                  id="pf_preview_client_name"
                  value={extractedPreview.client_name}
                  onChange={(e) => updatePreview('client_name', e.target.value)}
                  placeholder="e.g. Golden Mile Builders"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_preview_product_duration">Product duration (date)</Label>
                <Input
                  id="pf_preview_product_duration"
                  type="date"
                  value={extractedPreview.product_duration}
                  onChange={(e) => updatePreview('product_duration', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf_preview_wo_info">Work order information</Label>
                <Textarea
                  id="pf_preview_wo_info"
                  value={extractedPreview.work_order_information}
                  onChange={(e) => updatePreview('work_order_information', e.target.value)}
                  placeholder="WO #, description…"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyPreviewToForm}>
              Apply to form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <Label htmlFor="work_order_information">Work Order Information</Label>
        <Textarea
          id="work_order_information"
          name="work_order_information"
          value={formData.work_order_information}
          onChange={handleInputChange}
          placeholder="Enter work order details"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>PR/PO Tracking</Label>
        <div className="flex gap-2">
          <Input
            value={prPoInput}
            onChange={(e) => setPrPoInput(e.target.value)}
            placeholder="Enter PR/PO number"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPrPo();
              }
            }}
          />
          <Button type="button" onClick={addPrPo} variant="outline">
            Add
          </Button>
        </div>
        {formData.pr_po_tracking.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.pr_po_tracking.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removePrPo(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Samples</Label>
        <div className="flex gap-2">
          <Input
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            placeholder="Enter sample name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSample();
              }
            }}
          />
          <Button type="button" onClick={addSample} variant="outline">
            Add
          </Button>
        </div>
        {formData.samples.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.samples.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeSample(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mas_file">MAS File</Label>
        <div className="flex items-center gap-2">
          <Input
            id="mas_file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileChange(e, 'mas_file')}
            className="flex-1"
            disabled={!!filePreviews.mas_file && !files.mas_file}
          />
          {filePreviews.mas_file && (
            <div className="flex items-center gap-2">
              <a
                href={filePreviews.mas_file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View
              </a>
              {files.mas_file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('mas_file')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ml_task">ML Management - Task</Label>
        <Textarea
          id="ml_task"
          name="ml_task"
          value={formData.ml_management.ml_task}
          onChange={handleInputChange}
          placeholder="Enter ML task details"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
