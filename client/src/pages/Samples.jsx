import React, { useState, useEffect } from 'react';
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

// Mock Sample Data (Floor-wise distribution)
const MOCK_SAMPLES = [
  { id: 1, item: "CPVC Pipe 2 inch", unit: "Mtr", perFloorQty: 42, totalFloors: 117, totalQty: 4914, status: "Locked" },
  { id: 2, item: "Wall Mounted WC", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Locked" },
  { id: 3, item: "Basin Mixer", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
  { id: 4, item: "Shower Head", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
];

export default function Samples() {
  const [step, setStep] = useState(1);
  const [floorCount, setFloorCount] = useState("");
  const [floorPlanFile, setFloorPlanFile] = useState(null);
  const [suspendedWorkFile, setSuspendedWorkFile] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
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
          
          // Extract images from PDF
          setExtractionProgress({ current: 0, total: 1, message: 'Extracting diagrams...' });
          let images = [];
          try {
            images = await extractImagesFromPdf(file, { scale: 2, maxPages: 50 });
            setExtractedDiagrams(images);
            console.log(`Extracted ${images.length} diagram pages`);
          } catch (imgError) {
            console.warn('Image extraction failed, continuing with text extraction:', imgError);
            // Continue even if image extraction fails
          }
          
          setExtractionProgress({ current: 1, total: 2, message: 'Extracting text and values...' });
          
          // Extract text and parse CPVC data
          let text = '';
          try {
            text = await extractTextFromPdf(file, { fullDocument: true, preserveLines: true });
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
            sampleItems: mappedSamples.length
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
        
        // Extract images from PDF
        setSuspendedExtractionProgress({ current: 0, total: 1, message: 'Extracting diagrams...' });
        let images = [];
        try {
          images = await extractImagesFromPdf(file, { scale: 2, maxPages: 50 });
          setSuspendedDiagrams(images);
          console.log(`Extracted ${images.length} diagram pages from suspended work PDF`);
        } catch (imgError) {
          console.warn('Image extraction failed, continuing with text extraction:', imgError);
          // Continue even if image extraction fails
        }
        
        setSuspendedExtractionProgress({ current: 1, total: 2, message: 'Extracting text and values...' });
        
        // Extract text and parse suspended work data
        let text = '';
        try {
          text = await extractTextFromPdf(file, { fullDocument: true, preserveLines: true });
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
          sampleItems: mappedSuspended.length
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

  // Save configuration
  const handleSaveConfiguration = () => {
    const config = {
      floorCount,
      samples,
      extractedDiagrams: extractedDiagrams.length,
      suspendedDiagrams: suspendedDiagrams.length,
      extractedValues: extractedValues.length,
      suspendedValues: suspendedValues.length,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('sample_configuration', JSON.stringify(config));
    toast({
      title: "Configuration Saved",
      description: "Your sample configuration has been saved successfully",
    });
  };

  // Load configuration
  const loadConfiguration = () => {
    const saved = localStorage.getItem('sample_configuration');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.samples) {
          setSamples(config.samples);
          if (config.floorCount) setFloorCount(config.floorCount);
          toast({
            title: "Configuration Loaded",
            description: "Previous configuration restored",
          });
          return true;
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast({
          title: "Load Failed",
          description: "Could not load saved configuration",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No Saved Configuration",
        description: "No saved configuration found",
      });
    }
    return false;
  };

  // Auto-load on mount if configured
  useEffect(() => {
    if (isConfigured) {
      const saved = localStorage.getItem('sample_configuration');
      if (saved) {
        try {
          const config = JSON.parse(saved);
          if (config.samples && config.samples.length > 0) {
            // Only auto-load if we don't have samples yet
            if (samples.length === MOCK_SAMPLES.length && samples.every((s, i) => s.id === MOCK_SAMPLES[i]?.id)) {
              setSamples(config.samples);
              if (config.floorCount) setFloorCount(config.floorCount);
            }
          }
        } catch (error) {
          console.error('Error auto-loading configuration:', error);
        }
      }
    }
  }, [isConfigured]);

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
          <h1 className="text-3xl font-bold tracking-tight">Sample Management</h1>
          <p className="text-muted-foreground mt-2">Managing samples for {floorCount} floors.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
          {(extractedDiagrams.length > 0 || suspendedDiagrams.length > 0) && (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => setShowDiagramViewer(true)}
            >
              <Eye className="mr-2 h-4 w-4" /> View Diagrams ({extractedDiagrams.length + suspendedDiagrams.length})
            </Button>
          )}
          <Button variant="outline" onClick={loadConfiguration}>
            Load Saved
          </Button>
          <Button variant="outline" onClick={handleExportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={resetConfiguration}>
            Re-configure
          </Button>
          <Button onClick={handleSaveConfiguration} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Summary Statistics */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{summaryStats.totalItems}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Items</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summaryStats.cpvcItems}</div>
                <div className="text-xs text-muted-foreground mt-1">CPVC Items</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{summaryStats.suspendedItems}</div>
                <div className="text-xs text-muted-foreground mt-1">Suspended Items</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summaryStats.totalQuantity.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Quantity</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{summaryStats.lockedItems}</div>
                <div className="text-xs text-muted-foreground mt-1">Locked</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.draftItems}</div>
                <div className="text-xs text-muted-foreground mt-1">Draft</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floor Plan Visibility Section */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Floor Plan Reference</CardTitle>
            <CardDescription>Visible to other modules</CardDescription>
          </CardHeader>
          <CardContent>
            {floorPlanPreview ? (
              <div className="border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center min-h-[200px] max-h-[400px]">
                <img 
                  src={floorPlanPreview} 
                  alt="Floor Plan Preview" 
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  onError={(e) => {
                    console.error('Preview image failed to load:', e);
                    setFloorPlanPreview(null);
                  }}
                />
              </div>
            ) : floorPlanFile ? (
              <div className="border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground min-h-[200px]">
                {processingPdf ? (
                  <>
                    <Loader2 className="h-12 w-12 mb-2 animate-spin text-primary" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mb-2" />
                    <span className="text-center">{floorPlanFile.name}</span>
                    <span className="text-xs mt-2">Click to view diagrams after extraction</span>
                  </>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground min-h-[200px]">
                <FileText className="h-12 w-12 mb-2" />
                <span>No Plan</span>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Floors:</span>
                <span className="font-medium">{floorCount}</span>
              </div>
              {suspendedWorkFile && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suspended Work PDF:</span>
                  <span className="font-medium truncate max-w-[150px]">{suspendedWorkFile.name}</span>
                </div>
              )}
              {(extractedDiagrams.length > 0 || suspendedDiagrams.length > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diagrams Extracted:</span>
                  <span className="font-medium text-green-600">
                    CPVC: {extractedDiagrams.length} | Suspended: {suspendedDiagrams.length}
                  </span>
                </div>
              )}
              {(extractedValues.length > 0 || suspendedValues.length > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items Extracted:</span>
                  <span className="font-medium text-green-600">
                    CPVC: {extractedValues.length} | Suspended: {suspendedValues.length}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Floor-wise Configuration</CardTitle>
                <CardDescription>Derived from uploaded CPVC and suspended work PDFs.</CardDescription>
              </div>
              <Button onClick={addNewSample} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  All ({samples.length})
                </Button>
                <Button
                  variant={filterType === "cpvc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("cpvc")}
                >
                  CPVC ({samples.filter(s => !s.workType || s.workType !== "Suspended").length})
                </Button>
                <Button
                  variant={filterType === "suspended" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("suspended")}
                >
                  Suspended ({samples.filter(s => s.workType === "Suspended").length})
                </Button>
              </div>
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-[150px]">Qty Per Floor</TableHead>
                    <TableHead>Total Floors</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No items found. {searchQuery && "Try adjusting your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSamples.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Input
                            value={item.item}
                            onChange={(e) => {
                              setSamples(samples.map(s => 
                                s.id === item.id ? { ...s, item: e.target.value } : s
                              ));
                            }}
                            className="h-8 border-0 p-0 font-medium"
                            disabled={item.status === "Locked"}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.workType === "Suspended" ? "outline" : "secondary"} className={item.workType === "Suspended" ? "bg-orange-100 text-orange-800 border-orange-300" : ""}>
                            {item.workType || "CPVC"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => {
                              setSamples(samples.map(s => 
                                s.id === item.id ? { ...s, unit: e.target.value } : s
                              ));
                            }}
                            className="h-8 w-20"
                            disabled={item.status === "Locked"}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.perFloorQty}
                            onChange={(e) => updateSampleQty(item.id, e.target.value)}
                            className="h-8 w-24"
                            disabled={item.status === "Locked"}
                          />
                        </TableCell>
                        <TableCell>{parseInt(floorCount) || item.totalFloors}</TableCell>
                        <TableCell className="text-right font-bold">
                          {(item.perFloorQty * (parseInt(floorCount) || item.totalFloors)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "Locked" ? "default" : "outline"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSample(item.id)}
                            className="h-8 w-8 p-0"
                            disabled={item.status === "Locked"}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
              {/* Mobile Search/Filter */}
              <div className="space-y-2">
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    className="flex-1"
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "cpvc" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("cpvc")}
                    className="flex-1"
                  >
                    CPVC
                  </Button>
                  <Button
                    variant={filterType === "suspended" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("suspended")}
                    className="flex-1"
                  >
                    Suspended
                  </Button>
                </div>
              </div>

              {filteredSamples.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No items found. {searchQuery && "Try adjusting your search."}
                </div>
              ) : (
                filteredSamples.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Input
                          value={item.item}
                          onChange={(e) => {
                            setSamples(samples.map(s => 
                              s.id === item.id ? { ...s, item: e.target.value } : s
                            ));
                          }}
                          className="h-auto p-0 border-0 font-medium text-base"
                          disabled={item.status === "Locked"}
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={item.workType === "Suspended" ? "outline" : "secondary"} className={item.workType === "Suspended" ? "bg-orange-100 text-orange-800 border-orange-300" : ""}>
                            {item.workType || "CPVC"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={item.status === "Locked" ? "default" : "outline"}>
                          {item.status}
                        </Badge>
                        {item.status !== "Locked" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSample(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Qty Per Floor</label>
                        <Input 
                          type="number" 
                          value={item.perFloorQty}
                          onChange={(e) => updateSampleQty(item.id, e.target.value)}
                          className="h-9 w-full"
                          disabled={item.status === "Locked"}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Total Floors</label>
                        <div className="h-9 flex items-center font-medium">{parseInt(floorCount) || item.totalFloors}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total Qty</span>
                      <span className="font-bold">{(item.perFloorQty * (parseInt(floorCount) || item.totalFloors)).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagram Viewer Modal */}
      <DiagramViewer
        open={showDiagramViewer}
        onOpenChange={setShowDiagramViewer}
        diagrams={[...extractedDiagrams, ...suspendedDiagrams]}
        extractedValues={[...extractedValues, ...suspendedValues]}
      />
    </div>
  );
}
