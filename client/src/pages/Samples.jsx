import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Save, Copy, Upload, CheckCircle, FileText, Image as ImageIcon, ArrowRight, ArrowLeft, Eye, Loader2, Search, Filter, Download, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { extractImagesFromPdf, extractTextFromPdf } from "@/lib/pdfUtils";
import { extractCPVCData, mapCPVCItemsToSamples } from "@/lib/cpvcExtractor";
import { extractSuspendedWorkData, mapSuspendedWorkItemsToSamples } from "@/lib/suspendedWorkExtractor";
import DiagramViewer from "@/components/DiagramViewer";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Mock Sample Data (Floor-wise distribution)
const MOCK_SAMPLES = [
  { id: 1, item: "CPVC Pipe 2 inch", unit: "Mtr", perFloorQty: 42, totalFloors: 117, totalQty: 4914, status: "Locked" },
  { id: 2, item: "Wall Mounted WC", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Locked" },
  { id: 3, item: "Basin Mixer", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
  { id: 4, item: "Shower Head", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
];

export default function Samples() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [floorCount, setFloorCount] = useState("");
  const [floorPlanFile, setFloorPlanFile] = useState(null);
  const [suspendedWorkFile, setSuspendedWorkFile] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [floorPlanPreview, setFloorPlanPreview] = useState(null);
  
  // PDF extraction state - CPVC
  const [extractedDiagrams, setExtractedDiagrams] = useState([]);
  const [extractedValues, setExtractedValues] = useState([]);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0, message: '' });
  
  // PDF extraction state - Suspended Work
  const [suspendedDiagrams, setSuspendedDiagrams] = useState([]);
  const [suspendedValues, setSuspendedValues] = useState([]);
  const [processingSuspendedPdf, setProcessingSuspendedPdf] = useState(false);
  const [suspendedExtractionProgress, setSuspendedExtractionProgress] = useState({ current: 0, total: 0, message: '' });
  
  // UI state
  const [showDiagramViewer, setShowDiagramViewer] = useState(false);
  const [samples, setSamples] = useState(MOCK_SAMPLES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "cpvc", "suspended"
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const [serverSamples, setServerSamples] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [uploadFilePaths, setUploadFilePaths] = useState([]);
  const [uploadPreviewOpen, setUploadPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSample, setEditingSample] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSample, setPreviewSample] = useState(null);
  const [selectedUploadedFile, setSelectedUploadedFile] = useState("");
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);
  const [itemFieldDialogOpen, setItemFieldDialogOpen] = useState(false);
  const [itemFieldTarget, setItemFieldTarget] = useState("create");
  const [itemFieldRowIndex, setItemFieldRowIndex] = useState(null);
  const [itemFieldKey, setItemFieldKey] = useState("");
  const [itemFieldValue, setItemFieldValue] = useState("");
  const [editForm, setEditForm] = useState({
    building_name: "",
    site_name: "",
    work_done: "",
    sample_file: "",
    location: { floor: "", block: "", wing: "", coordinates: "" },
    item_description: [{ sr_no: "", description: "", quantity: "", value: "", add_fields: [] }],
    add_fields: []
  });
  const [createForm, setCreateForm] = useState({
    building_name: "",
    site_name: "",
    work_done: "",
    sample_file: "",
    location: { floor: "", block: "", wing: "", coordinates: "" },
    item_description: [{ sr_no: "", description: "", quantity: "", value: "", add_fields: [] }],
    add_fields: []
  });

  const getSelectedProjectId = () => selectedProject?.project_id || selectedProject?.id;

  const refreshProjectSamples = async () => {
    const pid = getSelectedProjectId();
    if (!pid) {
      setServerSamples([]);
      return [];
    }
    const res = await api.getSamplesByProject(pid);
    if (!res.success) {
      setServerSamples([]);
      return [];
    }
    const arr = Array.isArray(res.data) ? res.data : [];
    setServerSamples(arr);
    return arr;
  };

  useEffect(() => {
    const load = async () => {
      setLoadingServer(true);
      try {
        await refreshProjectSamples();
      } catch {
        setServerSamples([]);
      } finally {
        setLoadingServer(false);
      }
    };
    load();
  }, [selectedProject]);

  const openEdit = async (sample) => {
    const pid = getSelectedProjectId();
    if (!pid) {
      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
      return;
    }

    const targetId = String(sample.sample_id || sample.id);
    const list = await refreshProjectSamples();
    const latest = list.find((item) => String(item.sample_id || item.id) === targetId);
    if (!latest) {
      toast({ title: "Sample not found", description: "Could not load latest sample details.", variant: "destructive" });
      return;
    }

    setEditingSample(latest);
    const loc = parseMaybe(latest.location, {});
    const items = parseMaybe(latest.item_description, []);
    const adds = parseMaybe(latest.add_fields, []);
    setEditForm({
      building_name: latest.building_name || "",
      site_name: latest.site_name || "",
      work_done: latest.work_done || "",
      sample_file: latest.sample_file || "",
      location: loc && typeof loc === 'object' ? { floor: loc.floor || "", block: loc.block || "", wing: loc.wing || "", coordinates: loc.coordinates || "" } : { floor: "", block: "", wing: "", coordinates: "" },
      item_description: Array.isArray(items) && items.length ? items.map(it => ({ sr_no: it.sr_no || "", description: it.description || "", quantity: it.quantity || "", value: it.value || "", add_fields: Array.isArray(it.add_fields) ? it.add_fields.map(f => ({ key: f.key || "", value: f.value || "" })) : [] })) : [{ sr_no: "", description: "", quantity: "", value: "", add_fields: [] }],
      add_fields: Array.isArray(adds) ? adds.map(f => ({ key: f.key || "", value: f.value || "" })) : []
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingSample) return;
    const id = editingSample.sample_id || editingSample.id;
    const res = await api.updateSample(id, {
      building_name: editForm.building_name,
      site_name: editForm.site_name,
      work_done: editForm.work_done,
      sample_file: editForm.sample_file,
      location: editForm.location,
      item_description: editForm.item_description,
      add_fields: editForm.add_fields
    });
    if (res.success) {
      setEditOpen(false);
      await refreshProjectSamples();
      toast({ title: "Updated", description: "Sample updated" });
    } else {
      toast({ title: "Update failed", description: res.error || "Error", variant: "destructive" });
    }
  };

  const saveCreate = async () => {
    const pid = selectedProject?.project_id || selectedProject?.id;
    if (!pid) {
      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
      return;
    }
    const res = await api.createSample({
      project_id: pid,
      building_name: createForm.building_name,
      site_name: createForm.site_name,
      work_done: createForm.work_done,
      sample_file: createForm.sample_file,
      location: createForm.location,
      item_description: createForm.item_description,
      add_fields: createForm.add_fields
    });
    if (res.success) {
      await refreshProjectSamples();
      setCreateForm({
        building_name: "",
        site_name: "",
        work_done: "",
        sample_file: "",
        location: { floor: "", block: "", wing: "", coordinates: "" },
        item_description: [{ sr_no: "", description: "", quantity: "", value: "", add_fields: [] }],
        add_fields: []
      });
      toast({ title: "Created", description: "Sample created" });
    } else {
      toast({ title: "Create failed", description: res.error || "Error", variant: "destructive" });
    }
  };

  const removeSample = async (sample) => {
    const id = sample.sample_id || sample.id;
    const res = await api.deleteSample(id);
    if (res.success) {
      await refreshProjectSamples();
      toast({ title: "Deleted", description: "Sample deleted" });
    } else {
      toast({ title: "Delete failed", description: res.error || "Error", variant: "destructive" });
    }
  };

  const uploadSampleFiles = async (files) => {
    if (!files.length) return;
    const res = await api.uploadSampleFiles(files);
    if (res.success && res.data && res.data.filePaths) {
      setUploadFilePaths(res.data.filePaths);
      setUploadPreviewOpen(true);
      setCreateForm((prev) => ({
        ...prev,
        sample_file: res.data.filePaths[0] || prev.sample_file
      }));
      toast({ title: "Uploaded", description: `${res.data.filePaths.length} file(s) uploaded` });
    } else {
      toast({ title: "Upload failed", description: res.error || "Error", variant: "destructive" });
    }
  };

  const handleSampleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadSampleFiles(files);
    e.target.value = "";
  };

  const handleAttachmentDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAttachmentDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    await uploadSampleFiles(files);
  };

  const openItemFieldDialog = (target, rowIndex) => {
    setItemFieldTarget(target);
    setItemFieldRowIndex(rowIndex);
    setItemFieldKey("");
    setItemFieldValue("");
    setItemFieldDialogOpen(true);
  };

  const closeItemFieldDialog = () => {
    setItemFieldDialogOpen(false);
    setItemFieldRowIndex(null);
    setItemFieldKey("");
    setItemFieldValue("");
  };

  const addItemFieldToRow = () => {
    const key = itemFieldKey.trim();
    const value = itemFieldValue.trim();

    if (!key || !value || itemFieldRowIndex === null) {
      toast({ title: "Missing values", description: "Enter both key and value.", variant: "destructive" });
      return;
    }

    if (itemFieldTarget === "edit") {
      const next = [...editForm.item_description];
      next[itemFieldRowIndex] = {
        ...next[itemFieldRowIndex],
        add_fields: [...(next[itemFieldRowIndex].add_fields || []), { key, value }]
      };
      setEditForm({ ...editForm, item_description: next });
    } else {
      const next = [...createForm.item_description];
      next[itemFieldRowIndex] = {
        ...next[itemFieldRowIndex],
        add_fields: [...(next[itemFieldRowIndex].add_fields || []), { key, value }]
      };
      setCreateForm({ ...createForm, item_description: next });
    }

    closeItemFieldDialog();
  };

  const removeItemFieldFromRow = (target, rowIndex, fieldIndex) => {
    if (target === "edit") {
      const next = [...editForm.item_description];
      next[rowIndex] = {
        ...next[rowIndex],
        add_fields: (next[rowIndex].add_fields || []).filter((_, idx) => idx !== fieldIndex)
      };
      setEditForm({ ...editForm, item_description: next });
      return;
    }

    const next = [...createForm.item_description];
    next[rowIndex] = {
      ...next[rowIndex],
      add_fields: (next[rowIndex].add_fields || []).filter((_, idx) => idx !== fieldIndex)
    };
    setCreateForm({ ...createForm, item_description: next });
  };

  const hasIncompleteAdditionalFields = (fields = []) =>
    fields.some((field) => !(field.key || "").trim() || !(field.value || "").trim());

  const addAdditionalField = (target) => {
    if (target === "edit") {
      if (hasIncompleteAdditionalFields(editForm.add_fields)) {
        toast({
          title: "Complete existing fields",
          description: "Fill key and value before adding another additional info row.",
          variant: "destructive",
        });
        return;
      }
      setEditForm({ ...editForm, add_fields: [...editForm.add_fields, { key: "", value: "" }] });
      return;
    }

    if (hasIncompleteAdditionalFields(createForm.add_fields)) {
      toast({
        title: "Complete existing fields",
        description: "Fill key and value before adding another additional info row.",
        variant: "destructive",
      });
      return;
    }
    setCreateForm({ ...createForm, add_fields: [...createForm.add_fields, { key: "", value: "" }] });
  };

  const removeAdditionalField = (target, index) => {
    if (target === "edit") {
      setEditForm({ ...editForm, add_fields: editForm.add_fields.filter((_, idx) => idx !== index) });
      return;
    }
    setCreateForm({ ...createForm, add_fields: createForm.add_fields.filter((_, idx) => idx !== index) });
  };

  const openPreview = (sample) => {
    const id = sample.sample_id || sample.id;
    navigate(`preview/${id}`);
  };


  const attachFileToSample = async (sample, path) => {
    const id = sample.sample_id || sample.id;
    const res = await api.updateSample(id, { sample_file: path });
    if (res.success) {
      await refreshProjectSamples();
      toast({ title: "Attached", description: "File attached to sample" });
    } else {
      toast({ title: "Attach failed", description: res.error || "Error", variant: "destructive" });
    }
  };

  const handleFloorPlanUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFloorPlanFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFloorPlanPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // Process PDF to extract diagrams and values
        setProcessingPdf(true);
        setExtractionProgress({ current: 0, total: 0, message: 'Loading PDF...' });
        try {
          // Validate file size (max 50MB)
          if (file.size > 50 * 1024 * 1024) {
            throw new Error('PDF file is too large (max 50MB)');
          }
          
          // Extract images from PDF (optimized: lower scale, fewer pages, parallel processing)
          setExtractionProgress({ current: 0, total: 1, message: 'Extracting diagrams...' });
          let images = [];
          try {
            images = await extractImagesFromPdf(file, { 
              scale: 1.5, // Reduced from 2 for faster processing
              maxPages: 30, // Reduced from 50
              batchSize: 3, // Process 3 pages in parallel
              quality: 0.85 // JPEG quality for smaller files
            });
            setExtractedDiagrams(images);
            console.log(`Extracted ${images.length} diagram pages`);
          } catch (imgError) {
            console.warn('Image extraction failed, continuing with text extraction:', imgError);
            // Continue even if image extraction fails
          }
          
          setExtractionProgress({ current: 1, total: 2, message: 'Extracting text and values...' });
          
          // Extract text and parse CPVC data (optimized: limit pages, parallel processing)
          let text = '';
          try {
            text = await extractTextFromPdf(file, { 
              fullDocument: true, 
              preserveLines: true,
              maxPages: 50, // Limit to 50 pages instead of 150
              batchSize: 5 // Process 5 pages in parallel
            });
            console.log(`Extracted ${text.length} characters of text`);
          } catch (textError) {
            console.error('Text extraction failed:', textError);
            throw new Error(`Text extraction failed: ${textError.message}`);
          }
          
          const cpvcData = extractCPVCData(text);
          setExtractedValues(cpvcData.items);
          console.log(`Parsed ${cpvcData.items.length} CPVC items from text`);
          
          // Update floor count if found in PDF
          if (cpvcData.metadata.totalFloors && !floorCount) {
            setFloorCount(cpvcData.metadata.totalFloors);
          }
          
          // Optionally auto-populate samples from extracted data
          if (cpvcData.items.length > 0) {
            const totalFloors = parseInt(floorCount) || parseInt(cpvcData.metadata.totalFloors) || 1;
            const mappedSamples = mapCPVCItemsToSamples(cpvcData.items, totalFloors);
            if (mappedSamples.length > 0) {
              // Replace mock samples with extracted ones, or merge if we want to keep existing
              const shouldReplace = samples.length === MOCK_SAMPLES.length && 
                                    samples.every((s, i) => s.id === MOCK_SAMPLES[i]?.id);
              
              if (shouldReplace) {
                setSamples(mappedSamples);
              } else {
                // Merge with existing, avoiding duplicates
                const existingIds = new Set(samples.map(s => s.id));
                const newSamples = mappedSamples.filter(s => !existingIds.has(s.id));
                setSamples([...samples, ...newSamples]);
              }
              
              toast({
                title: "CPVC Data Extracted",
                description: `Extracted ${mappedSamples.length} items from CPVC PDF`,
              });
            } else {
              toast({
                title: "No Items Found",
                description: "Could not extract items from CPVC PDF. Please check the PDF format.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "No Items Extracted",
              description: "No CPVC items found in the PDF. The PDF might not contain extractable data.",
              variant: "destructive",
            });
          }
          
          // Set first page as preview - ensure it's set properly
          if (images.length > 0) {
            const firstImage = images[0].imageDataUrl;
            setFloorPlanPreview(firstImage);
            // Force update by setting a small delay to ensure state updates
            setTimeout(() => {
              if (floorPlanPreview !== firstImage) {
                setFloorPlanPreview(firstImage);
              }
            }, 100);
          } else {
            // If no images extracted, show a placeholder or the PDF file icon
            setFloorPlanPreview(null);
          }
          
          // Log extraction results for debugging
          console.log('CPVC Extraction Results:', {
            diagrams: images.length,
            items: cpvcData.items.length,
            metadata: cpvcData.metadata,
            sampleItems: (Array.isArray(cpvcData.items) ? cpvcData.items.length : 0)
          });
          
          setExtractionProgress({ current: 2, total: 2, message: 'Complete!' });
        } catch (error) {
          console.error('Error processing CPVC PDF:', error);
          const errorMessage = error.message || 'Unknown error occurred';
          toast({
            title: "Extraction Error",
            description: `Failed to extract data from CPVC PDF: ${errorMessage}. Please check if the PDF is valid and not corrupted.`,
            variant: "destructive",
          });
          
          // Still set the file so user can proceed
          if (extractedDiagrams.length === 0) {
            setFloorPlanPreview(null);
          }
        } finally {
          setProcessingPdf(false);
          setTimeout(() => setExtractionProgress({ current: 0, total: 0, message: '' }), 1000);
        }
      } else {
        setFloorPlanPreview(null);
      }
    }
  };

  const handleSuspendedWorkUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSuspendedWorkFile(file);
      // Process suspended work PDF
      setProcessingSuspendedPdf(true);
      setSuspendedExtractionProgress({ current: 0, total: 0, message: 'Loading PDF...' });
      try {
        // Validate file size
        if (file.size > 50 * 1024 * 1024) {
          throw new Error('PDF file is too large (max 50MB)');
        }
        
        // Extract images from PDF (optimized: lower scale, fewer pages, parallel processing)
        setSuspendedExtractionProgress({ current: 0, total: 1, message: 'Extracting diagrams...' });
        let images = [];
        try {
          images = await extractImagesFromPdf(file, { 
            scale: 1.5, // Reduced from 2 for faster processing
            maxPages: 30, // Reduced from 50
            batchSize: 3, // Process 3 pages in parallel
            quality: 0.85 // JPEG quality for smaller files
          });
          setSuspendedDiagrams(images);
          console.log(`Extracted ${images.length} diagram pages from suspended work PDF`);
        } catch (imgError) {
          console.warn('Image extraction failed, continuing with text extraction:', imgError);
          // Continue even if image extraction fails
        }
        
        setSuspendedExtractionProgress({ current: 1, total: 2, message: 'Extracting text and values...' });
        
        // Extract text and parse suspended work data (optimized: limit pages, parallel processing)
        let text = '';
        try {
          text = await extractTextFromPdf(file, { 
            fullDocument: true, 
            preserveLines: true,
            maxPages: 50, // Limit to 50 pages instead of 150
            batchSize: 5 // Process 5 pages in parallel
          });
          console.log(`Extracted ${text.length} characters of text from suspended work PDF`);
        } catch (textError) {
          console.error('Text extraction failed:', textError);
          throw new Error(`Text extraction failed: ${textError.message}`);
        }
        
        const suspendedData = extractSuspendedWorkData(text);
        setSuspendedValues(suspendedData.items);
        console.log(`Parsed ${suspendedData.items.length} suspended work items from text`);
        
        // Update floor count if found in PDF
        if (suspendedData.metadata.totalFloors && !floorCount) {
          setFloorCount(suspendedData.metadata.totalFloors);
        }
        
        // Merge suspended work items with existing samples
        if (suspendedData.items.length > 0) {
          const totalFloors = parseInt(floorCount) || parseInt(suspendedData.metadata.totalFloors) || 1;
          const mappedSuspended = mapSuspendedWorkItemsToSamples(suspendedData.items, totalFloors);
          
          if (mappedSuspended.length > 0) {
            // Combine with existing samples (avoid duplicates)
            const existingIds = new Set(samples.map(s => s.id));
            const newSuspended = mappedSuspended.filter(s => !existingIds.has(s.id));
            setSamples([...samples, ...newSuspended]);
            toast({
              title: "Suspended Work Data Extracted",
              description: `Extracted ${mappedSuspended.length} items from suspended work PDF`,
            });
          } else {
            toast({
              title: "No Items Found",
              description: "Could not extract items from suspended work PDF. Please check the PDF format.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "No Items Extracted",
            description: "No suspended work items found in the PDF. The PDF might not contain extractable data.",
            variant: "destructive",
          });
        }
        
        setSuspendedExtractionProgress({ current: 2, total: 2, message: 'Complete!' });
        
        // Log extraction results for debugging
        console.log('Suspended Work Extraction Results:', {
          diagrams: images.length,
          items: suspendedData.items.length,
          metadata: suspendedData.metadata,
          sampleItems: (Array.isArray(suspendedData.items) ? suspendedData.items.length : 0)
        });
      } catch (error) {
        console.error('Error processing suspended work PDF:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        toast({
          title: "Extraction Error",
          description: `Failed to extract data from suspended work PDF: ${errorMessage}. Please check if the PDF is valid and not corrupted.`,
          variant: "destructive",
        });
      } finally {
        setProcessingSuspendedPdf(false);
        setTimeout(() => setSuspendedExtractionProgress({ current: 0, total: 0, message: '' }), 1000);
      }
    } else if (file) {
      setSuspendedWorkFile(file);
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file for suspended work",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (step === 1 && floorCount && floorPlanFile) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleCheckFloorPlan = () => {
    // Proceed if we have floor plan file (CPVC or image)
    if (floorPlanFile) {
      setIsConfigured(true);
    }
  };

  const resetConfiguration = () => {
    setIsConfigured(false);
    setStep(1);
    setFloorCount("");
    setFloorPlanFile(null);
    setSuspendedWorkFile(null);
    setFloorPlanPreview(null);
    setExtractedDiagrams([]);
    setExtractedValues([]);
    setSuspendedDiagrams([]);
    setSuspendedValues([]);
    setSamples(MOCK_SAMPLES);
    setShowDiagramViewer(false);
    setSearchQuery("");
    setFilterType("all");
  };

  // Filter and search samples
  const filteredSamples = samples.filter(item => {
    const matchesSearch = !searchQuery || 
      item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || 
      (filterType === "cpvc" && (!item.workType || item.workType !== "Suspended")) ||
      (filterType === "suspended" && item.workType === "Suspended");
    
    return matchesSearch && matchesFilter;
  });

  // Update sample quantity
  const updateSampleQty = (id, newQty) => {
    setSamples(samples.map(item => 
      item.id === id 
        ? { ...item, perFloorQty: parseFloat(newQty) || 0 }
        : item
    ));
  };

  // Add new sample
  const addNewSample = () => {
    const newId = Math.max(...samples.map(s => s.id), 0) + 1;
    const newSample = {
      id: newId,
      item: "New Item",
      unit: "Nos",
      perFloorQty: 0,
      totalFloors: parseInt(floorCount) || 1,
      totalQty: 0,
      status: "Draft",
      workType: "CPVC",
    };
    setSamples([...samples, newSample]);
    toast({
      title: "Item Added",
      description: "New item added to the list",
    });
  };

  // Delete sample
  const deleteSample = (id) => {
    setSamples(samples.filter(item => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "Item removed from the list",
    });
  };

  // Calculate summary statistics
  const summaryStats = {
    totalItems: samples.length,
    cpvcItems: samples.filter(s => !s.workType || s.workType !== "Suspended").length,
    suspendedItems: samples.filter(s => s.workType === "Suspended").length,
    totalQuantity: samples.reduce((sum, item) => {
      const totalFloors = parseInt(floorCount) || item.totalFloors;
      return sum + (item.perFloorQty * totalFloors);
    }, 0),
    lockedItems: samples.filter(s => s.status === "Locked").length,
    draftItems: samples.filter(s => s.status === "Draft").length,
  };

  const createItemFieldKeys = useMemo(() => (
    Array.from(
      new Set(
        createForm.item_description.flatMap((row) =>
          (row.add_fields || [])
            .map((field) => (field.key || "").trim())
            .filter(Boolean)
        )
      )
    )
  ), [createForm.item_description]);

  const availableUploadedFiles = useMemo(() => (
    Array.from(
      new Set(
        [...uploadFilePaths, ...serverSamples.map((s) => s.sample_file)]
          .filter(Boolean)
      )
    )
  ), [uploadFilePaths, serverSamples]);

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const data = filteredSamples.map(item => ({
        'Item Name': item.item,
        'Work Type': item.workType || 'CPVC',
        'Unit': item.unit,
        'Qty Per Floor': item.perFloorQty,
        'Total Floors': parseInt(floorCount) || item.totalFloors,
        'Total Quantity': (item.perFloorQty * (parseInt(floorCount) || item.totalFloors)),
        'Status': item.status,
        'Dimensions': item.dimensions || '',
        'Specifications': item.specifications || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Samples');
      XLSX.writeFile(wb, `Sample_Configuration_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: "Sample data exported to Excel",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sample Management Setup</h1>
          <p className="text-muted-foreground">Configure floor plans, CPVC, and suspended work for your project.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`flex flex-col items-center p-4 border rounded-lg ${step >= 1 ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <span className="text-sm font-medium">Floor Plan & Details</span>
          </div>
          <div className={`flex flex-col items-center p-4 border rounded-lg ${step >= 2 ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className="text-sm font-medium">Suspended Work</span>
          </div>
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Step 1: Project Details</CardTitle>
                <CardDescription>Enter the number of floors and upload the floor plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="floor-count">Number of Floors</Label>
                  <Input 
                    id="floor-count" 
                    type="number" 
                    placeholder="Enter total floors (e.g., 117)" 
                    value={floorCount}
                    onChange={(e) => setFloorCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor-plan">Floor Plan (Image or PDF)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative">
                    <Input 
                      id="floor-plan" 
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFloorPlanUpload}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {processingPdf ? (
                        <>
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <span className="font-medium">Processing PDF...</span>
                          <span className="text-xs text-muted-foreground">
                            {extractionProgress.message || 'Extracting diagrams and values'}
                          </span>
                          {extractionProgress.total > 0 && (
                            <div className="w-full max-w-xs mt-2">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 block text-center">
                                {extractionProgress.current} / {extractionProgress.total}
                              </span>
                            </div>
                          )}
                        </>
                      ) : floorPlanFile ? (
                        <>
                          {floorPlanFile.type.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-primary" /> : <FileText className="h-8 w-8 text-primary" />}
                          <span className="font-medium">{floorPlanFile.name}</span>
                          <span className="text-xs text-muted-foreground">{(floorPlanFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          {extractedDiagrams.length > 0 && (
                            <span className="text-xs text-green-600 mt-1">
                              {extractedDiagrams.length} diagram(s) extracted
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Drag and drop or click to upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  {floorPlanPreview && !processingPdf && (
                    <div className="mt-4 border rounded-lg overflow-hidden h-48 w-full bg-muted/20 flex items-center justify-center">
                      <img 
                        src={floorPlanPreview} 
                        alt="PDF Preview" 
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                        onError={(e) => {
                          console.error('Preview image failed to load:', e);
                          setFloorPlanPreview(null);
                        }}
                      />
                    </div>
                  )}
                  {processingPdf && (
                    <div className="mt-4 border rounded-lg p-4 bg-muted/20 flex items-center justify-center h-48">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{extractionProgress.message || 'Processing...'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNext} disabled={!floorCount || !floorPlanFile || processingPdf}>
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Step 2: Suspended Work</CardTitle>
                <CardDescription>Upload the suspended work PDF (e.g., 1-4 FLR.pdf).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="suspended-work">Suspended Work PDF</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative">
                    <Input 
                      id="suspended-work" 
                      type="file" 
                      accept="application/pdf" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleSuspendedWorkUpload}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {processingSuspendedPdf ? (
                        <>
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <span className="font-medium">Processing Suspended Work PDF...</span>
                          <span className="text-xs text-muted-foreground">
                            {suspendedExtractionProgress.message || 'Extracting diagrams and values'}
                          </span>
                          {suspendedExtractionProgress.total > 0 && (
                            <div className="w-full max-w-xs mt-2">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${(suspendedExtractionProgress.current / suspendedExtractionProgress.total) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 block text-center">
                                {suspendedExtractionProgress.current} / {suspendedExtractionProgress.total}
                              </span>
                            </div>
                          )}
                        </>
                      ) : suspendedWorkFile ? (
                        <>
                          <FileText className="h-8 w-8 text-primary" />
                          <span className="font-medium">{suspendedWorkFile.name}</span>
                          <span className="text-xs text-muted-foreground">{(suspendedWorkFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          {suspendedDiagrams.length > 0 && (
                            <span className="text-xs text-green-600 mt-1">
                              {suspendedDiagrams.length} diagram(s) extracted
                            </span>
                          )}
                          {suspendedValues.length > 0 && (
                            <span className="text-xs text-green-600">
                              {suspendedValues.length} item(s) extracted
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Drag and drop or click to upload PDF</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleCheckFloorPlan} disabled={processingSuspendedPdf}>
                  Check Floor Plan <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Samples</h1>
          <p className="text-muted-foreground mt-2">Manage project samples from the list below.</p>
        </div>
        <div className="flex w-full sm:w-auto">
          <Button onClick={() => setShowCreateForm((v) => !v)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> {showCreateForm ? "Hide Create" : "Create Sample"}
          </Button>
        </div>
      </div>

      {showCreateForm && (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Create Sample</CardTitle>
              <CardDescription>Fill the sample details and save them to the system.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input value={selectedProject ? (selectedProject.project_id || selectedProject.id) : ""} readOnly placeholder="Select a project" />
            </div>
            <div className="space-y-2">
              <Label>Building Name</Label>
              <Input value={createForm.building_name} onChange={(e) => setCreateForm({ ...createForm, building_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={createForm.site_name} onChange={(e) => setCreateForm({ ...createForm, site_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input value={createForm.location.floor} onChange={(e) => setCreateForm({ ...createForm, location: { ...createForm.location, floor: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>Block</Label>
              <Input value={createForm.location.block} onChange={(e) => setCreateForm({ ...createForm, location: { ...createForm.location, block: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>Wing</Label>
              <Input value={createForm.location.wing} onChange={(e) => setCreateForm({ ...createForm, location: { ...createForm.location, wing: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>Coordinates</Label>
              <Input value={createForm.location.coordinates} onChange={(e) => setCreateForm({ ...createForm, location: { ...createForm.location, coordinates: e.target.value } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Work Done</Label>
            <Input value={createForm.work_done} onChange={(e) => setCreateForm({ ...createForm, work_done: e.target.value })} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Attachments</div>
            </div>
            <div
              className={`border rounded-md p-3 transition-colors ${isAttachmentDragActive ? 'border-primary bg-primary/5' : 'border-dashed'}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAttachmentDragActive(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAttachmentDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAttachmentDragActive(false);
              }}
              onDrop={handleAttachmentDrop}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  Drag and drop files here, or select multiple files
                </div>
                <Label
                  htmlFor="sample-attachments-upload"
                  className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium cursor-pointer hover:bg-muted"
                >
                  Select Files
                </Label>
              </div>
              <Input
                id="sample-attachments-upload"
                type="file"
                multiple
                onChange={handleSampleUpload}
                className="hidden"
              />
              {uploadFilePaths.length > 0 && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs">Uploaded files</Label>
                  <Select
                    value={createForm.sample_file || ""}
                    onValueChange={(value) => setCreateForm({ ...createForm, sample_file: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select uploaded file" />
                    </SelectTrigger>
                    <SelectContent>
                      {uploadFilePaths.map((path) => (
                        <SelectItem key={path} value={path}>
                          {path.split('/').pop() || path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Item Description</div>
              <Button size="sm" variant="outline" onClick={() => setCreateForm({ ...createForm, item_description: [...createForm.item_description, { sr_no: "", description: "", quantity: "", value: "", add_fields: [] }] })}>
                <Plus className="mr-2 h-4 w-4" /> Add Row
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Sr No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[160px]">Quantity</TableHead>
                  <TableHead className="w-[160px]">Value</TableHead>
                  {createItemFieldKeys.map((fieldKey) => (
                    <TableHead key={fieldKey} className="w-[160px]">{fieldKey}</TableHead>
                  ))}
                  <TableHead className="w-[200px]">Add Fields</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createForm.item_description.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input value={row.sr_no} onChange={(e) => {
                        const next = [...createForm.item_description]; next[idx] = { ...next[idx], sr_no: e.target.value }; setCreateForm({ ...createForm, item_description: next });
                      }} />
                    </TableCell>
                    <TableCell>
                      <Input value={row.description} onChange={(e) => {
                        const next = [...createForm.item_description]; next[idx] = { ...next[idx], description: e.target.value }; setCreateForm({ ...createForm, item_description: next });
                      }} />
                    </TableCell>
                    <TableCell>
                      <Input value={row.quantity} onChange={(e) => {
                        const next = [...createForm.item_description]; next[idx] = { ...next[idx], quantity: e.target.value }; setCreateForm({ ...createForm, item_description: next });
                      }} />
                    </TableCell>
                    <TableCell>
                      <Input value={row.value} onChange={(e) => {
                        const next = [...createForm.item_description]; next[idx] = { ...next[idx], value: e.target.value }; setCreateForm({ ...createForm, item_description: next });
                      }} />
                    </TableCell>
                    {createItemFieldKeys.map((fieldKey) => {
                      const field = (row.add_fields || []).find((f) => (f.key || "").trim() === fieldKey);
                      return (
                        <TableCell key={`${idx}-${fieldKey}`} className="text-sm">
                          {field?.value || "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <div className="space-y-2">
                        {row.add_fields.map((f, j) => (
                          <div key={j} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">{f.key}</span>
                              <span className="text-muted-foreground">:</span>
                              <span className="truncate">{f.value}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => removeItemFieldFromRow("create", idx, j)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" type="button" variant="outline" onClick={() => openItemFieldDialog("create", idx)}>
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => {
                        const next = createForm.item_description.filter((_, i) => i !== idx); setCreateForm({ ...createForm, item_description: next });
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Additional Fields</div>
              <Button size="sm" variant="outline" type="button" onClick={() => addAdditionalField("create")}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {createForm.add_fields.map((f, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="Key" value={f.key} onChange={(e) => {
                    const next = [...createForm.add_fields]; next[idx] = { ...next[idx], key: e.target.value }; setCreateForm({ ...createForm, add_fields: next });
                  }} />
                  <Input placeholder="Value" value={f.value} onChange={(e) => {
                    const next = [...createForm.add_fields]; next[idx] = { ...next[idx], value: e.target.value }; setCreateForm({ ...createForm, add_fields: next });
                  }} />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAdditionalField("create", idx)}
                    className="md:w-auto w-full"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={saveCreate}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </CardFooter>
      </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Server Samples</CardTitle>
              <CardDescription>Loaded records {selectedProject ? `(Project ${selectedProject.project_id || selectedProject.id})` : ''}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={selectedUploadedFile} onValueChange={setSelectedUploadedFile}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select uploaded file" />
                </SelectTrigger>
                <SelectContent>
                  {availableUploadedFiles.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.split('/').pop() || p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!selectedUploadedFile}
                onClick={() => {
                  if (selectedUploadedFile) {
                    window.open(api.getApiFileUrl(selectedUploadedFile), "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingServer ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : serverSamples.length === 0 ? (
            <div className="text-muted-foreground py-6">No samples found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Work</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="w-[160px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverSamples.map((s) => (
                  <TableRow key={s.sample_id || s.id}>
                    <TableCell>{s.sample_id || s.id}</TableCell>
                    <TableCell>{s.building_name || '-'}</TableCell>
                    <TableCell>{s.site_name || '-'}</TableCell>
                    <TableCell>{s.work_done || '-'}</TableCell>
                    <TableCell>
                      {s.sample_file ? (
                        <a href={api.getApiFileUrl(s.sample_file)} target="_blank" rel="noreferrer" className="text-blue-600">Open</a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openPreview(s)}>
                          <Eye className="h-4 w-4 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeSample(s)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diagram Viewer Modal */}
      <DiagramViewer
        open={showDiagramViewer}
        onOpenChange={setShowDiagramViewer}
        diagrams={[...extractedDiagrams, ...suspendedDiagrams]}
        extractedValues={[...extractedValues, ...suspendedValues]}
      />
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sample</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Building Name</Label>
              <Input value={editForm.building_name} onChange={(e) => setEditForm({ ...editForm, building_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={editForm.site_name} onChange={(e) => setEditForm({ ...editForm, site_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Work Done</Label>
              <Input value={editForm.work_done} onChange={(e) => setEditForm({ ...editForm, work_done: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sample File Path</Label>
              <Input value={editForm.sample_file} onChange={(e) => setEditForm({ ...editForm, sample_file: e.target.value })} placeholder="/uploads/sample/..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input value={editForm.location.floor} onChange={(e) => setEditForm({ ...editForm, location: { ...editForm.location, floor: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Block</Label>
                <Input value={editForm.location.block} onChange={(e) => setEditForm({ ...editForm, location: { ...editForm.location, block: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Wing</Label>
                <Input value={editForm.location.wing} onChange={(e) => setEditForm({ ...editForm, location: { ...editForm.location, wing: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Coordinates</Label>
                <Input value={editForm.location.coordinates} onChange={(e) => setEditForm({ ...editForm, location: { ...editForm.location, coordinates: e.target.value } })} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Item Description</Label>
                <Button size="sm" variant="outline" onClick={() => setEditForm({ ...editForm, item_description: [...editForm.item_description, { sr_no: "", description: "", quantity: "", value: "", add_fields: [] }] })}>
                  <Plus className="mr-2 h-4 w-4" /> Add Row
                </Button>
              </div>
              <div className="space-y-3">
                {editForm.item_description.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <Input placeholder="Sr No" value={row.sr_no} onChange={(e) => {
                      const next = [...editForm.item_description]; next[idx] = { ...next[idx], sr_no: e.target.value }; setEditForm({ ...editForm, item_description: next });
                    }} />
                    <Input placeholder="Description" value={row.description} onChange={(e) => {
                      const next = [...editForm.item_description]; next[idx] = { ...next[idx], description: e.target.value }; setEditForm({ ...editForm, item_description: next });
                    }} />
                    <Input placeholder="Quantity" value={row.quantity} onChange={(e) => {
                      const next = [...editForm.item_description]; next[idx] = { ...next[idx], quantity: e.target.value }; setEditForm({ ...editForm, item_description: next });
                    }} />
                    <Input placeholder="Value" value={row.value} onChange={(e) => {
                      const next = [...editForm.item_description]; next[idx] = { ...next[idx], value: e.target.value }; setEditForm({ ...editForm, item_description: next });
                    }} />
                    <Button size="sm" variant="ghost" onClick={() => {
                      const next = editForm.item_description.filter((_, i) => i !== idx); setEditForm({ ...editForm, item_description: next });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="md:col-span-5 space-y-2">
                      {row.add_fields.map((f, j) => (
                        <div key={j} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{f.key}</span>
                            <span className="text-muted-foreground">:</span>
                            <span className="truncate">{f.value}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => removeItemFieldFromRow("edit", idx, j)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" type="button" variant="outline" onClick={() => openItemFieldDialog("edit", idx)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Field
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Additional Fields</Label>
                <Button size="sm" variant="outline" type="button" onClick={() => addAdditionalField("edit")}>
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {editForm.add_fields.map((f, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <Input placeholder="Key" value={f.key} onChange={(e) => {
                      const next = [...editForm.add_fields]; next[idx] = { ...next[idx], key: e.target.value }; setEditForm({ ...editForm, add_fields: next });
                    }} />
                    <Input placeholder="Value" value={f.value} onChange={(e) => {
                      const next = [...editForm.add_fields]; next[idx] = { ...next[idx], value: e.target.value }; setEditForm({ ...editForm, add_fields: next });
                    }} />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAdditionalField("edit", idx)}
                      className="md:w-auto w-full"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={itemFieldDialogOpen} onOpenChange={(open) => {
        if (open) {
          setItemFieldDialogOpen(true);
        } else {
          closeItemFieldDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item Field</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={itemFieldKey} onChange={(e) => setItemFieldKey(e.target.value)} placeholder="Enter key" />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={itemFieldValue} onChange={(e) => setItemFieldValue(e.target.value)} placeholder="Enter value" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeItemFieldDialog}>Cancel</Button>
            <Button onClick={addItemFieldToRow}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sample Preview</DialogTitle>
          </DialogHeader>
          {previewSample && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">ID</div>
                  <div className="font-medium">{previewSample.sample_id || previewSample.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Building</div>
                  <div className="font-medium">{previewSample.building_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium">{previewSample.site_name || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Work Done</div>
                  <div className="font-medium">{previewSample.work_done || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Project</div>
                  <div className="font-medium">{previewSample.project_id || '-'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="font-medium">{previewSample?.location?.floor || previewSample?.location?.address_line1 || '-'}</div>
                  <div className="font-medium">{previewSample?.location?.block || previewSample?.location?.city || '-'}</div>
                  <div className="font-medium">{previewSample?.location?.wing || previewSample?.location?.state || '-'}</div>
                  <div className="font-medium">{previewSample?.location?.coordinates || previewSample?.location?.country || '-'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Item Description</div>
                <div className="space-y-2">
                  {(previewSample.item_description || []).map((it, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="font-medium">{it.sr_no || '-'}</div>
                      <div className="font-medium">{it.description || '-'}</div>
                      <div className="font-medium">{it.quantity || '-'}</div>
                      <div className="font-medium">{it.value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Additional Fields</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(previewSample.add_fields || []).map((f, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <div className="font-medium">{f.key || '-'}</div>
                      <div className="font-medium">{f.value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Attachment</div>
                {previewSample.sample_file ? (
                  (() => {
                    const url = api.getApiFileUrl(previewSample.sample_file);
                    const lower = String(previewSample.sample_file).toLowerCase();
                    const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
                    const isPdf = lower.endsWith('.pdf');
                    return (
                      <div className="border rounded-md p-3">
                        {isImage ? (
                          <img src={url} alt="Sample File" className="max-h-64 object-contain w-full" />
                        ) : isPdf ? (
                          <iframe src={url} className="w-full h-80" />
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 break-all">{url}</a>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-muted-foreground">No attachment</div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={uploadPreviewOpen} onOpenChange={setUploadPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploaded Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {uploadFilePaths.length === 0 ? (
              <div className="text-muted-foreground">No files uploaded</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uploadFilePaths.map((p) => {
                  const url = api.getApiFileUrl(p);
                  const lower = String(p).toLowerCase();
                  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
                  const isPdf = lower.endsWith('.pdf');
                  return (
                    <div key={p} className="border rounded-md p-3 space-y-2">
                      <div className="text-xs text-muted-foreground">{p.split('/').pop() || 'Attachment'}</div>
                      {isImage ? (
                        <img src={url} alt="Upload" className="max-h-48 object-contain w-full" />
                      ) : isPdf ? (
                        <iframe src={url} className="w-full h-48" />
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <a href={url} target="_blank" rel="noreferrer">Preview</a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setUploadPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
