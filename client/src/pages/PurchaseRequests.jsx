import React, { useState } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Calendar as CalendarIcon, Check, ChevronsRight } from "lucide-react";
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

const data = [
  {
    id: "PR-2023-101",
    requester: "John Doe",
    department: "Civil",
    date: "2023-10-25",
    priority: "High",
    status: "Pending Approval",
    items: 3
  },
  {
    id: "PR-2023-102",
    requester: "Jane Smith",
    department: "Electrical",
    date: "2023-10-26",
    priority: "Medium",
    status: "Approved",
    items: 5
  },
  {
    id: "PR-2023-103",
    requester: "Mike Johnson",
    department: "Plumbing",
    date: "2023-10-27",
    priority: "Low",
    status: "Draft",
    items: 2
  },
];

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
    accessorKey: "department",
    header: "Department",
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
      return (
        <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
        </Button>
      )
    },
  },
]

function CreatePRDialog({ open, onOpenChange }) {
    const [step, setStep] = useState(1);
    const [date, setDate] = useState(new Date());

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                    <Input id="requester" placeholder="Enter name" defaultValue="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select defaultValue="civil">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="civil">Civil</SelectItem>
                                            <SelectItem value="electrical">Electrical</SelectItem>
                                            <SelectItem value="mechanical">Mechanical</SelectItem>
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
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select defaultValue="medium">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Items List</Label>
                                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
                            </div>
                            <div className="border rounded-md p-4 space-y-4">
                                <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
                                    <div className="col-span-5">Item Name</div>
                                    <div className="col-span-3">Quantity</div>
                                    <div className="col-span-3">Unit</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {/* Mock Item Row */}
                                <div className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center border-b md:border-0 pb-4 md:pb-0 last:border-0 last:pb-0">
                                    <div className="w-full md:col-span-5">
                                        <Label className="md:hidden mb-1.5 block">Item Name</Label>
                                        <Input placeholder="Item name" defaultValue="Cement Bags" />
                                    </div>
                                    <div className="flex w-full gap-2 md:contents">
                                        <div className="flex-1 md:col-span-3">
                                            <Label className="md:hidden mb-1.5 block">Quantity</Label>
                                            <Input type="number" defaultValue="50" />
                                        </div>
                                        <div className="flex-1 md:col-span-3">
                                            <Label className="md:hidden mb-1.5 block">Unit</Label>
                                            <Select defaultValue="bags">
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
                                        <div className="md:col-span-1 text-center flex items-end">
                                            <Button variant="ghost" size="icon" className="text-destructive mt-6 md:mt-0">
                                                <span className="sr-only">Remove</span>
                                                &times;
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Justification / Remarks</Label>
                                <Textarea id="remarks" placeholder="Enter reason for purchase request..." />
                            </div>
                            <div className="rounded-lg bg-muted p-4 text-sm">
                                <h4 className="font-semibold mb-2">Summary</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Requester:</span>
                                    <span>John Doe</span>
                                    <span className="text-muted-foreground">Department:</span>
                                    <span>Civil</span>
                                    <span className="text-muted-foreground">Items:</span>
                                    <span>1 Item(s)</span>
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
                        <Button onClick={nextStep}>Next <ChevronsRight className="ml-2 h-4 w-4" /></Button>
                    ) : (
                        <Button onClick={() => onOpenChange(false)}>Submit Request</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PurchaseRequests() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Purchase Requests</h2>
            <p className="text-muted-foreground">Create and manage material purchase requests.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Request
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="requester" />
      <CreatePRDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
