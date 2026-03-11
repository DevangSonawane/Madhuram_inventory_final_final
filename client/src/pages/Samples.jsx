import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Save, Copy, Upload, CheckCircle, FileText, Image as ImageIcon, ArrowRight, ArrowLeft, Eye, Loader2, Search, Filter, Download, Plus, Minus } from "lucide-react";
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUploadedFile, setSelectedUploadedFile] = useState("");
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);
  const [itemFieldDialogOpen, setItemFieldDialogOpen] = useState(false);
  const [itemFieldRowIndex, setItemFieldRowIndex] = useState(null);
  const [itemFieldKey, setItemFieldKey] = useState("");
  const [itemFieldValue, setItemFieldValue] = useState("");
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const [projectInventory, setProjectInventory] = useState([]);
  const [loadingProjectInventory, setLoadingProjectInventory] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [addingInventoryId, setAddingInventoryId] = useState(null);
  const [pendingInventoryQty, setPendingInventoryQty] = useState({});
  const [createForm, setCreateForm] = useState({
    building_name: "",
    site_name: "",
    work_done: "",
    sample_file: "",
    location: { floor: "", block: "", wing: "", coordinates: "" },
    item_description: [],
    add_fields: []
  });

  const getSelectedProjectId = () => selectedProject?.project_id || selectedProject?.id;

  const normalizeInventory = (item = {}) => ({
    inventory_id: item.inventory_id || item.id,
    project_id: item.project_id,
    brand: item.brand || "",
    name: item.name || "",
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    stockin: Boolean(item.stockin),
    billing: Boolean(item.billing),
  });

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

  const refreshProjectInventory = async () => {
    const pid = getSelectedProjectId();
    if (!pid) {
      setProjectInventory([]);
      return [];
    }

    const res = await api.getInventoriesByProject(pid);
    if (!res.success) {
      setProjectInventory([]);
      return [];
    }

    const arr = Array.isArray(res.data) ? res.data.map(normalizeInventory) : [];
    setProjectInventory(arr);
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

  useEffect(() => {
    if (!showCreateForm) return;
    const load = async () => {
      setLoadingProjectInventory(true);
      try {
        await refreshProjectInventory();
      } finally {
        setLoadingProjectInventory(false);
      }
    };
    load();
  }, [showCreateForm, selectedProject]);


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
        item_description: [],
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

  const openItemFieldDialog = (_target, rowIndex) => {
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

    const next = [...createForm.item_description];
    const existingIndex = (next[itemFieldRowIndex].add_fields || []).findIndex(
      (field) => (field?.key || "").trim() === key
    );
    const nextFields = [...(next[itemFieldRowIndex].add_fields || [])];
    if (existingIndex >= 0) {
      nextFields[existingIndex] = { key, value };
    } else {
      nextFields.push({ key, value });
    }
    next[itemFieldRowIndex] = {
      ...next[itemFieldRowIndex],
      add_fields: nextFields
    };
    setCreateForm({ ...createForm, item_description: next });

    closeItemFieldDialog();
  };

  const removeItemFieldFromRow = (_target, rowIndex, fieldIndex) => {
    const next = [...createForm.item_description];
    next[rowIndex] = {
      ...next[rowIndex],
      add_fields: (next[rowIndex].add_fields || []).filter((_, idx) => idx !== fieldIndex)
    };
    setCreateForm({ ...createForm, item_description: next });
  };

  const hasIncompleteAdditionalFields = (fields = []) =>
    fields.some((field) => !(field.key || "").trim() || !(field.value || "").trim());

  const addAdditionalField = (_target) => {
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

  const removeAdditionalField = (_target, index) => {
    setCreateForm({ ...createForm, add_fields: createForm.add_fields.filter((_, idx) => idx !== index) });
  };

  const openPreview = (sample) => {
    const id = sample.sample_id || sample.id;
    navigate(`preview/${id}`);
  };

  const addInventoryToSampleItems = (inventoryItem, selectedQty) => {
    const inventoryId = inventoryItem.inventory_id;
    if (!inventoryId) return;

    const alreadyAdded = createForm.item_description.some((row) =>
      (row.add_fields || []).some((field) => field?.key === "inventory_id" && String(field?.value) === String(inventoryId))
    );

    if (alreadyAdded) {
      toast({ title: "Already added", description: "This inventory item is already in the sample list." });
      return;
    }

    const qtyToAdd = Number(selectedQty) || 0;
    const nextRow = {
      sr_no: String(createForm.item_description.length + 1),
      description: `${inventoryItem.brand ? `${inventoryItem.brand} - ` : ""}${inventoryItem.name}`,
      quantity: qtyToAdd ? String(qtyToAdd) : "",
      value: inventoryItem.price ? String(inventoryItem.price) : "",
      add_fields: [
        { key: "inventory_id", value: String(inventoryId) },
        { key: "project_id", value: String(inventoryItem.project_id || "") },
        { key: "brand", value: String(inventoryItem.brand || "") },
        { key: "name", value: String(inventoryItem.name || "") },
        { key: "quantity", value: qtyToAdd ? String(qtyToAdd) : "" },
        { key: "price", value: String(inventoryItem.price || "") },
        { key: "stockin", value: String(Boolean(inventoryItem.stockin)) },
        { key: "billing", value: String(Boolean(inventoryItem.billing)) },
      ],
    };

    setCreateForm((prev) => ({
      ...prev,
      item_description: [...prev.item_description, nextRow],
    }));
  };

  const openQuantitySelector = (inventoryItem) => {
    const inventoryId = inventoryItem.inventory_id;
    const available = Math.max(0, Math.floor(Number(inventoryItem.quantity) || 0));
    if (!inventoryId || available <= 0) {
      toast({ title: "Out of stock", description: "No quantity available for this inventory item.", variant: "destructive" });
      return;
    }
    setPendingInventoryQty((prev) => ({ ...prev, [inventoryId]: prev[inventoryId] || 1 }));
  };

  const adjustPendingQty = (inventoryItem, delta) => {
    const inventoryId = inventoryItem.inventory_id;
    const available = Math.max(1, Math.floor(Number(inventoryItem.quantity) || 1));
    setPendingInventoryQty((prev) => {
      const current = Number(prev[inventoryId]) || 1;
      const next = Math.max(1, Math.min(available, current + delta));
      return { ...prev, [inventoryId]: next };
    });
  };

  const setPendingQtyValue = (inventoryItem, rawValue) => {
    const inventoryId = inventoryItem.inventory_id;
    const cleaned = String(rawValue || "").replace(/[^\d]/g, "");
    if (!cleaned) {
      setPendingInventoryQty((prev) => ({ ...prev, [inventoryId]: "" }));
      return;
    }
    setPendingInventoryQty((prev) => ({ ...prev, [inventoryId]: cleaned }));
  };

  const normalizePendingQty = (inventoryItem) => {
    const inventoryId = inventoryItem.inventory_id;
    const available = Math.max(1, Math.floor(Number(inventoryItem.quantity) || 1));
    setPendingInventoryQty((prev) => {
      const current = Number(prev[inventoryId]) || 1;
      const next = Math.max(1, Math.min(available, current));
      return { ...prev, [inventoryId]: String(next) };
    });
  };

  const closeQuantitySelector = (inventoryId) => {
    setPendingInventoryQty((prev) => {
      const next = { ...prev };
      delete next[inventoryId];
      return next;
    });
  };

  const confirmAddWithQuantity = async (inventoryItem) => {
    const inventoryId = inventoryItem.inventory_id;
    const available = Number(inventoryItem.quantity) || 0;
    const selectedQty = Number(pendingInventoryQty[inventoryId]) || 0;

    if (!inventoryId || selectedQty <= 0) {
      toast({ title: "Invalid quantity", description: "Select a valid quantity.", variant: "destructive" });
      return;
    }

    if (selectedQty > available) {
      toast({ title: "Insufficient quantity", description: "Selected quantity exceeds available stock.", variant: "destructive" });
      return;
    }

    const alreadyAdded = createForm.item_description.some((row) =>
      (row.add_fields || []).some((field) => field?.key === "inventory_id" && String(field?.value) === String(inventoryId))
    );
    if (alreadyAdded) {
      toast({ title: "Already added", description: "This inventory item is already in the sample list." });
      return;
    }

    setAddingInventoryId(inventoryId);
    try {
      const remainingQuantity = available - selectedQty;
      const res = await api.updateInventory(inventoryId, { quantity: remainingQuantity });
      if (!res.success || !res.data) {
        toast({ title: "Update failed", description: res.error || "Could not deduct inventory quantity.", variant: "destructive" });
        return;
      }

      setProjectInventory((prev) =>
        prev.map((row) => (row.inventory_id === inventoryId ? normalizeInventory(res.data) : row))
      );

      addInventoryToSampleItems(inventoryItem, selectedQty);
      closeQuantitySelector(inventoryId);
      toast({ title: "Item added", description: `Added ${selectedQty} and updated inventory.` });
    } catch (error) {
      toast({ title: "Update failed", description: error?.message || "Could not deduct inventory quantity.", variant: "destructive" });
    } finally {
      setAddingInventoryId(null);
    }
  };

  const filteredProjectInventory = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    if (!query) return projectInventory;
    return projectInventory.filter((item) => (
      String(item.inventory_id || "").includes(query)
      || String(item.brand || "").toLowerCase().includes(query)
      || String(item.name || "").toLowerCase().includes(query)
    ));
  }, [projectInventory, inventorySearch]);

  const inventoryTableKeys = useMemo(() => {
    const preferredOrder = ["inventory_id", "brand", "name", "quantity", "price", "stockin", "billing", "project_id"];
    const dynamicKeys = Array.from(
      new Set(
        createForm.item_description.flatMap((row) =>
          (row.add_fields || [])
            .map((field) => (field?.key || "").trim())
            .filter(Boolean)
        )
      )
    );
    const ordered = preferredOrder.filter((key) => dynamicKeys.includes(key));
    const extra = dynamicKeys.filter((key) => !preferredOrder.includes(key));
    return [...ordered, ...extra];
  }, [createForm.item_description]);


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
            <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-secondary/20 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
              <div className="space-y-1">
                <div className="text-sm font-semibold tracking-wide">Item Description</div>
                <div className="text-xs text-muted-foreground">
                  Curated inventory rows selected for this sample.
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="h-8 px-3 rounded-full border bg-background/80 backdrop-blur-sm">
                  {createForm.item_description.length} row(s)
                </Badge>
                <Button
                  size="sm"
                  variant="default"
                  className="rounded-full px-4 shadow-sm"
                  type="button"
                  onClick={async () => {
                    if (!getSelectedProjectId()) {
                      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
                      return;
                    }
                    setInventoryPickerOpen(true);
                    setLoadingProjectInventory(true);
                    try {
                      await refreshProjectInventory();
                    } finally {
                      setLoadingProjectInventory(false);
                    }
                  }}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  View Items in Inventory
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full px-4"
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, item_description: [] })}
                  disabled={createForm.item_description.length === 0}
                >
                  Clear Table
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {createForm.item_description.length === 0 ? (
                <div className="p-10 text-sm text-muted-foreground text-center bg-gradient-to-b from-muted/20 to-background">
                  No items added yet. Use <span className="font-medium">View Items in Inventory</span> and click <span className="font-medium">Add</span>.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      {inventoryTableKeys.map((key) => (
                        <TableHead key={key} className="whitespace-nowrap capitalize text-xs font-semibold tracking-wide text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </TableHead>
                      ))}
                      <TableHead className="w-[90px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createForm.item_description.map((row, idx) => (
                      <TableRow key={`${idx}-${row?.sr_no || "row"}`}>
                        {inventoryTableKeys.map((key) => {
                          const field = (row.add_fields || []).find((f) => (f?.key || "").trim() === key);
                          return (
                            <TableCell key={`${idx}-${key}`} className="text-sm font-medium">
                              {field?.value ?? "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                            onClick={() => {
                              const next = createForm.item_description.filter((_, i) => i !== idx);
                              setCreateForm({ ...createForm, item_description: next });
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
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
                    variant="destructive"
                    onClick={() => removeAdditionalField("create", idx)}
                    className="md:w-auto w-full"
                  >
                    Delete
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openPreview(s)}>
                          <Eye className="h-4 w-4 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeSample(s)}>
                          Delete
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
      <Dialog
        open={inventoryPickerOpen}
        onOpenChange={(open) => {
          setInventoryPickerOpen(open);
          if (!open) setInventorySearch("");
        }}
      >
        <DialogContent className="w-[98vw] max-w-[98vw] sm:!w-[98vw] sm:!max-w-[98vw] h-[94vh] sm:!max-h-[94vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/10 via-background to-secondary/20">
            <DialogTitle className="text-xl tracking-tight">Project Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6 h-[calc(94vh-86px)] overflow-auto">
            <div className="rounded-2xl border bg-card shadow-sm p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9 rounded-full bg-muted/30"
                  placeholder="Search by inventory id, brand, or item name"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 h-8">{filteredProjectInventory.length} item(s)</Badge>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-4"
                onClick={async () => {
                  setLoadingProjectInventory(true);
                  try {
                    await refreshProjectInventory();
                  } finally {
                    setLoadingProjectInventory(false);
                  }
                }}
                disabled={loadingProjectInventory}
              >
                {loadingProjectInventory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px] text-xs tracking-wide">Inventory ID</TableHead>
                  <TableHead className="text-xs tracking-wide">Brand</TableHead>
                  <TableHead className="text-xs tracking-wide">Item</TableHead>
                  <TableHead className="w-[120px] text-xs tracking-wide">Quantity</TableHead>
                  <TableHead className="w-[120px] text-xs tracking-wide">Price</TableHead>
                  <TableHead className="w-[110px] text-xs tracking-wide">Stock</TableHead>
                  <TableHead className="w-[110px] text-xs tracking-wide">Billing</TableHead>
                  <TableHead className="w-[240px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProjectInventory ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading project inventory...
                    </TableCell>
                  </TableRow>
                ) : filteredProjectInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No inventory assigned to this project.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjectInventory.map((item) => (
                    <TableRow key={item.inventory_id}>
                      <TableCell>{item.inventory_id}</TableCell>
                      <TableCell className="font-medium">{item.brand || "-"}</TableCell>
                      <TableCell className="font-medium">{item.name || "-"}</TableCell>
                      <TableCell className="font-medium">{item.quantity}</TableCell>
                      <TableCell className="font-medium">{item.price}</TableCell>
                      <TableCell>
                        <Badge variant={item.stockin ? "secondary" : "outline"} className="rounded-full">
                          {item.stockin ? "In" : "Out"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.billing ? "secondary" : "outline"} className="rounded-full">
                          {item.billing ? "Billed" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Object.prototype.hasOwnProperty.call(pendingInventoryQty, item.inventory_id) ? (
                          <div className="flex items-center justify-end gap-1">
                            <div className="h-9 rounded-full border bg-muted/20 p-1 flex items-center gap-1 shadow-inner">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full"
                                onClick={() => adjustPendingQty(item, -1)}
                                disabled={addingInventoryId === item.inventory_id}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={pendingInventoryQty[item.inventory_id]}
                                onChange={(e) => setPendingQtyValue(item, e.target.value)}
                                onBlur={() => normalizePendingQty(item)}
                                className="h-7 w-14 rounded-full border-0 bg-background text-center text-sm font-semibold px-1 focus-visible:ring-1 focus-visible:ring-primary"
                                disabled={addingInventoryId === item.inventory_id}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full"
                                onClick={() => adjustPendingQty(item, 1)}
                                disabled={addingInventoryId === item.inventory_id}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full px-4 bg-primary text-primary-foreground"
                              onClick={() => confirmAddWithQuantity(item)}
                              disabled={addingInventoryId === item.inventory_id || !Number(pendingInventoryQty[item.inventory_id])}
                            >
                              {addingInventoryId === item.inventory_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-full px-3"
                              onClick={() => closeQuantitySelector(item.inventory_id)}
                              disabled={addingInventoryId === item.inventory_id}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full px-4"
                            onClick={() => openQuantitySelector(item)}
                            disabled={addingInventoryId === item.inventory_id || Number(item.quantity) <= 0}
                          >
                            {addingInventoryId === item.inventory_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-3.5 w-3.5" />Add</>}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setInventoryPickerOpen(false)}>
              Close
            </Button>
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
