import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Save, Copy, Upload, FileSpreadsheet, CheckCircle, FileText, Image as ImageIcon, ArrowRight, ArrowLeft } from "lucide-react";
import * as XLSX from 'xlsx';

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
  const [requirementsFile, setRequirementsFile] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [floorPlanPreview, setFloorPlanPreview] = useState(null);

  const handleFloorPlanUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFloorPlanFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFloorPlanPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFloorPlanPreview(null);
      }
    }
  };

  const handleRequirementsUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRequirementsFile(file);
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
    if (requirementsFile) {
      // Simulate processing
      setIsConfigured(true);
    }
  };

  const resetConfiguration = () => {
    setIsConfigured(false);
    setStep(1);
    setFloorCount("");
    setFloorPlanFile(null);
    setRequirementsFile(null);
    setFloorPlanPreview(null);
  };

  if (!isConfigured) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sample Management Setup</h1>
          <p className="text-muted-foreground">Configure floor plans and material requirements for your project.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`flex flex-col items-center p-4 border rounded-lg ${step >= 1 ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <span className="text-sm font-medium">Floor Plan & Details</span>
          </div>
          <div className={`flex flex-col items-center p-4 border rounded-lg ${step >= 2 ? 'border-primary bg-primary/5' : 'border-muted'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className="text-sm font-medium">Requirements List</span>
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
                      {floorPlanFile ? (
                        <>
                          {floorPlanFile.type.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-primary" /> : <FileText className="h-8 w-8 text-primary" />}
                          <span className="font-medium">{floorPlanFile.name}</span>
                          <span className="text-xs text-muted-foreground">{(floorPlanFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Drag and drop or click to upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  {floorPlanPreview && (
                    <div className="mt-4 border rounded-lg overflow-hidden h-48 w-full bg-muted/20 flex items-center justify-center">
                      <img src={floorPlanPreview} alt="Preview" className="h-full object-contain" />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNext} disabled={!floorCount || !floorPlanFile}>
                  Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Step 2: Requirements</CardTitle>
                <CardDescription>Upload the per-floor requirement list (Excel).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirement List (.xlsx, .xls)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center cursor-pointer relative">
                    <Input 
                      id="requirements" 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleRequirementsUpload}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {requirementsFile ? (
                        <>
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                          <span className="font-medium">{requirementsFile.name}</span>
                          <span className="text-xs text-muted-foreground">{(requirementsFile.size / 1024).toFixed(2)} KB</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload Excel file</span>
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
                <Button onClick={handleCheckFloorPlan} disabled={!requirementsFile}>
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
           <Button variant="outline" onClick={resetConfiguration}>
            Re-configure
          </Button>
           <Button variant="outline" className="w-full sm:w-auto">
            <Copy className="mr-2 h-4 w-4" /> Copy Floor Config
          </Button>
          <Button className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Floor Plan Visibility Section */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Floor Plan Reference</CardTitle>
            <CardDescription>Visible to other modules</CardDescription>
          </CardHeader>
          <CardContent>
            {floorPlanPreview ? (
              <div className="border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center min-h-[200px]">
                <img src={floorPlanPreview} alt="Floor Plan" className="max-w-full h-auto object-contain" />
              </div>
            ) : (
              <div className="border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground min-h-[200px]">
                <FileText className="h-12 w-12 mb-2" />
                <span>{floorPlanFile?.name || "No Plan"}</span>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Floors:</span>
                <span className="font-medium">{floorCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Requirement File:</span>
                 <span className="font-medium truncate max-w-[150px]">{requirementsFile?.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Floor-wise Configuration</CardTitle>
            <CardDescription>Derived from uploaded requirements.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-[150px]">Qty Per Floor</TableHead>
                    <TableHead>Total Floors</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_SAMPLES.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          defaultValue={item.perFloorQty} 
                          className="h-8 w-24"
                          disabled={item.status === "Locked"}
                        />
                      </TableCell>
                      <TableCell>{floorCount || item.totalFloors}</TableCell>
                      <TableCell className="text-right font-bold">
                        {(item.perFloorQty * (floorCount || item.totalFloors)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Locked" ? "default" : "outline"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
              {MOCK_SAMPLES.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                       <div className="font-medium">{item.item}</div>
                       <div className="text-sm text-muted-foreground">{item.unit}</div>
                    </div>
                    <Badge variant={item.status === "Locked" ? "default" : "outline"}>
                      {item.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Qty Per Floor</label>
                       <Input 
                         type="number" 
                         defaultValue={item.perFloorQty} 
                         className="h-9 w-full"
                         disabled={item.status === "Locked"}
                       />
                    </div>
                    <div>
                       <label className="text-xs text-muted-foreground block mb-1">Total Floors</label>
                       <div className="h-9 flex items-center font-medium">{floorCount || item.totalFloors}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Total Qty</span>
                    <span className="font-bold">{(item.perFloorQty * (floorCount || item.totalFloors)).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
