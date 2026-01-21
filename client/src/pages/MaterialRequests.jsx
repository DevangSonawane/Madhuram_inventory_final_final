import React, { useState } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Eye, CheckCircle, XCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

const data = [
  {
    id: "MR-2023-055",
    project: "Skyline Towers",
    requester: "Site Supervisor A",
    date: "2023-10-28",
    status: "Approved",
    items: 12
  },
  {
    id: "MR-2023-056",
    project: "Riverfront Park",
    requester: "Site Supervisor B",
    date: "2023-10-29",
    status: "Pending",
    items: 4
  },
  {
    id: "MR-2023-057",
    project: "Metro Station 5",
    requester: "Site Supervisor C",
    date: "2023-10-29",
    status: "Rejected",
    items: 8
  },
];

const columns = [
  {
    accessorKey: "id",
    header: "Request ID",
    cell: ({ row }) => <span className="font-medium">{row.getValue("id")}</span>
  },
  {
    accessorKey: "project",
    header: "Project / Site",
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status");
        let className = "";
        if (status === "Approved") className = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
        if (status === "Pending") className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
        if (status === "Rejected") className = "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
        
        return <Badge variant="outline" className={className}>{status}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="View Details">
                <Eye className="h-4 w-4" />
            </Button>
             {status === 'Pending' && (
                <>
                    <Button variant="ghost" size="icon" className="text-green-600" title="Approve">
                        <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600" title="Reject">
                        <XCircle className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
      )
    },
  },
]

function NewRequestDialog({ open, onOpenChange }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Material Request</DialogTitle>
                    <DialogDescription>
                        Request materials for a project site.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="project">Project / Site</Label>
                         <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="p1">Skyline Towers</SelectItem>
                                <SelectItem value="p2">Riverfront Park</SelectItem>
                                <SelectItem value="p3">Metro Station 5</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="items">Items Required</Label>
                        <Textarea placeholder="List items (e.g. Cement - 50 bags, Steel - 100kg)" />
                        <p className="text-xs text-muted-foreground">Or use the advanced item selector (Coming Soon)</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">Required By Date</Label>
                        <Input id="date" type="date" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onOpenChange(false)}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MaterialRequests() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Material Requests</h2>
            <p className="text-muted-foreground">Manage internal material requests from sites.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="project" />
      <NewRequestDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
