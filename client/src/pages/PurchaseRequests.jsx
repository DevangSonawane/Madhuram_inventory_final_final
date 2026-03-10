import React, { useState } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Calendar as CalendarIcon, Check, ChevronsRight, Upload, FileText, Keyboard, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const initialData = [
  {
    id: "PR-2023-101",
    requester: "John Doe",
    date: "2023-10-25",
    priority: "High",
    status: "Pending Approval",
    items: 3
  },
  {
    id: "PR-2023-102",
    requester: "Jane Smith",
    date: "2023-10-26",
    priority: "Medium",
    status: "Approved",
    items: 5
  },
  {
    id: "PR-2023-103",
    requester: "Mike Johnson",
    date: "2023-10-27",
    priority: "Low",
    status: "Draft",
    items: 2
  },
];

function CreatePRDialog({ open, onOpenChange, onSubmit }) {
    const [step, setStep] = useState(1);
    const [date, setDate] = useState(new Date());
    const [formData, setFormData] = useState({
        requester: "",
        priority: "medium",
        remarks: "",
        items: [],
        file: null
    });
    const [currentItem, setCurrentItem] = useState({ name: "", quantity: "", unit: "bags" });
    const [entryMethod, setEntryMethod] = useState(null); // 'manual' or 'upload'

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        if (currentItem.name && currentItem.quantity) {
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, { ...currentItem, id: Date.now() }]
            }));
            setCurrentItem({ name: "", quantity: "", unit: "bags" });
        }
    };

    const handleRemoveItem = (id) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, file: file }));
        }
    };

    const handleSubmit = () => {
        onSubmit({
            ...formData,
            date: format(date, "yyyy-MM-dd"),
            itemsCount: formData.items.length || (formData.file ? 1 : 0),
            entryMethod
        });
        resetForm();
    };

    const resetForm = () => {
        setStep(1);
        setEntryMethod(null);
        setFormData({
            requester: "",
            priority: "medium",
            remarks: "",
            items: [],
            file: null
        });
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => {
        if (step === 2 && entryMethod) {
            setEntryMethod(null);
        } else {
            setStep(step - 1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) resetForm();
        }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create Purchase Request</DialogTitle>
                    <DialogDescription>
                        Step {step} of 3
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-6 px-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                                    step >= i ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"
                                )}>
                                    {step > i ? <Check className="h-4 w-4" /> : i}
                                </div>
                                {i < 3 && <div className={cn("w-24 h-0.5 mx-2 transition-colors", step > i ? "bg-primary" : "bg-muted")} />}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="requester">Requester Name</Label>
                                    <Input 
                                        id="requester" 
                                        placeholder="Enter name" 
                                        value={formData.requester}
                                        onChange={(e) => handleInputChange("requester", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={formData.priority} onValueChange={(val) => handleInputChange("priority", val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 flex flex-col">
                                    <Label>Required Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={setDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {!entryMethod ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div 
                                        className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center space-y-4 h-[200px]"
                                        onClick={() => setEntryMethod('manual')}
                                    >
                                        <div className="p-4 bg-primary/10 rounded-full">
                                            <Keyboard className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Manual Entry</h3>
                                            <p className="text-sm text-muted-foreground">Type items one by one</p>
                                        </div>
                                    </div>
                                    <div 
                                        className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-center space-y-4 h-[200px]"
                                        onClick={() => setEntryMethod('upload')}
                                    >
                                        <div className="p-4 bg-primary/10 rounded-full">
                                            <Upload className="h-8 w-8 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Upload File</h3>
                                            <p className="text-sm text-muted-foreground">Excel, PDF, or CSV</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <Label className="text-base">
                                            {entryMethod === 'manual' ? "Items List" : "Upload Document"}
                                        </Label>
                                        <Button variant="ghost" size="sm" onClick={() => setEntryMethod(null)}>
                                            Change Method
                                        </Button>
                                    </div>

                                    {entryMethod === 'manual' ? (
                                        <div className="border rounded-md p-4 space-y-4">
                                            <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
                                                <div className="col-span-5">Item Name</div>
                                                <div className="col-span-3">Quantity</div>
                                                <div className="col-span-3">Unit</div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            {/* New Item Input */}
                                            <div className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center border-b md:border-0 pb-4 md:pb-0">
                                                <div className="w-full md:col-span-5">
                                                    <Input 
                                                        placeholder="Item name" 
                                                        value={currentItem.name}
                                                        onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="flex w-full gap-2 md:contents">
                                                    <div className="flex-1 md:col-span-3">
                                                        <Input 
                                                            type="number" 
                                                            value={currentItem.quantity}
                                                            onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex-1 md:col-span-3">
                                                        <Select value={currentItem.unit} onValueChange={(val) => setCurrentItem({...currentItem, unit: val})}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="bags">Bags</SelectItem>
                                                                <SelectItem value="kg">Kg</SelectItem>
                                                                <SelectItem value="nos">Nos</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="md:col-span-1 text-center">
                                                        <Button size="sm" variant="outline" onClick={handleAddItem}>
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* List of added items */}
                                            {formData.items.map((item) => (
                                                <div key={item.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center border-t pt-2">
                                                    <div className="w-full md:col-span-5 text-sm">{item.name}</div>
                                                    <div className="flex-1 md:col-span-3 text-sm">{item.quantity}</div>
                                                    <div className="flex-1 md:col-span-3 text-sm">{item.unit}</div>
                                                    <div className="md:col-span-1 text-center">
                                                        <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 transition-colors text-center relative">
                                            <Input 
                                                type="file" 
                                                accept=".xlsx,.xls,.pdf,.csv" 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={handleFileUpload}
                                            />
                                            <div className="flex flex-col items-center gap-2">
                                                {formData.file ? (
                                                    <>
                                                        <FileSpreadsheet className="h-10 w-10 text-green-600" />
                                                        <span className="font-medium text-lg">{formData.file.name}</span>
                                                        <span className="text-sm text-muted-foreground">{(formData.file.size / 1024).toFixed(2)} KB</span>
                                                        <Button variant="outline" size="sm" className="mt-2" onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFormData(prev => ({ ...prev, file: null }));
                                                        }}>
                                                            Remove File
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-10 w-10 text-muted-foreground" />
                                                        <h3 className="font-semibold text-lg mt-2">Upload your file</h3>
                                                        <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Supports Excel, PDF, CSV</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Justification / Remarks</Label>
                                <Textarea 
                                    id="remarks" 
                                    placeholder="Enter reason for purchase request..." 
                                    value={formData.remarks}
                                    onChange={(e) => handleInputChange("remarks", e.target.value)}
                                />
                            </div>
                            <div className="rounded-lg bg-muted p-4 text-sm">
                                <h4 className="font-semibold mb-2">Summary</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Requester:</span>
                                    <span>{formData.requester}</span>
                                    <span className="text-muted-foreground">Priority:</span>
                                    <span className="capitalize">{formData.priority}</span>
                                    <span className="text-muted-foreground">Input Method:</span>
                                    <span className="capitalize">{entryMethod}</span>
                                    {entryMethod === 'manual' ? (
                                        <>
                                            <span className="text-muted-foreground">Items:</span>
                                            <span>{formData.items.length} Item(s)</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-muted-foreground">File:</span>
                                            <span>{formData.file ? formData.file.name : "No file uploaded"}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step > 1 && (
                        <Button variant="outline" onClick={prevStep}>Previous</Button>
                    )}
                    {step < 3 ? (
                        <Button 
                            onClick={nextStep} 
                            disabled={step === 2 && !entryMethod}
                        >
                            Next <ChevronsRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit}>Submit Request</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PurchaseRequests() {
  const [data, setData] = useState(initialData);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreateRequest = (newRequest) => {
    const request = {
      id: `PR-2023-${100 + data.length + 1}`,
      requester: user?.name || newRequest.requester,
      date: newRequest.date,
      priority: newRequest.priority,
      status: "Pending Approval",
      items: newRequest.itemsCount
    };
    
    setData([...data, request]);
    setOpen(false);
    toast({
        title: "Success",
        description: "Purchase Request created successfully.",
    });
  };

  const handleStatusChange = (id, newStatus) => {
    setData(data.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
    ));
    toast({
        title: "Status Updated",
        description: `Request ${id} marked as ${newStatus}`,
    });
  };


  const columns = [
    {
      accessorKey: "id",
      header: "PR Number",
      cell: ({ row }) => <span className="font-medium">{row.getValue("id")}</span>
    },
    {
      accessorKey: "requester",
      header: "Requester",
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
          const priority = row.getValue("priority");
          let className = "";
          if (priority === "High") className = "text-red-600 bg-red-100 border-red-200";
          if (priority === "Medium") className = "text-yellow-600 bg-yellow-100 border-yellow-200";
          if (priority === "Low") className = "text-blue-600 bg-blue-100 border-blue-200";
          return <Badge variant="outline" className={className}>{priority}</Badge>
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
          const status = row.getValue("status");
          let className = "";
          if (status === "Approved") className = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
          if (status === "Pending Approval") className = "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200";
          if (status === "Draft") className = "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";
  
          return <Badge variant="outline" className={className}>{status}</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const request = row.original;
        const isAdmin = user?.role === 'admin';
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
            </Button>
            {isAdmin && request.status === 'Pending Approval' && (
                <>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        onClick={() => handleStatusChange(request.id, 'Approved')}
                    >
                        Approve
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleStatusChange(request.id, 'Rejected')}
                    >
                        Reject
                    </Button>
                </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Requests</h1>
            <p className="text-muted-foreground">Create and manage material purchase requests.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Request
        </Button>
      </div>

      <div className="hidden md:block">
        <DataTable columns={columns} data={data} searchKey="requester" />
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-base">{request.id}</div>
                  <div className="text-sm text-muted-foreground mt-1">{request.requester}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className={
                    request.status === "Approved" ? "bg-green-100 text-green-800 border-green-200" :
                    request.status === "Pending Approval" ? "bg-orange-100 text-orange-800 border-orange-200" :
                    "bg-gray-100 text-gray-800 border-gray-200"
                  }>
                    {request.status}
                  </Badge>
                  <Badge variant="outline" className={
                    request.priority === "High" ? "text-red-600 bg-red-100 border-red-200" :
                    request.priority === "Medium" ? "text-yellow-600 bg-yellow-100 border-yellow-200" :
                    "text-blue-600 bg-blue-100 border-blue-200"
                  }>
                    {request.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{request.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span>{request.items}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </Button>
                {user?.role === 'admin' && request.status === 'Pending Approval' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                      onClick={() => handleStatusChange(request.id, 'Approved')}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleStatusChange(request.id, 'Rejected')}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreatePRDialog open={open} onOpenChange={setOpen} onSubmit={handleCreateRequest} />
    </div>
  );
}
