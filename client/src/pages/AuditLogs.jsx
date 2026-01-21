import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";

// Mock Data
const logs = [
  {
    id: "LOG-1001",
    timestamp: "2024-03-20 14:30:22",
    user: "Admin User",
    action: "CREATE",
    entity: "Purchase Order",
    entityId: "PO-2024-001",
    details: "Created new PO for Acme Supplies",
    ip: "192.168.1.10"
  },
  {
    id: "LOG-1002",
    timestamp: "2024-03-20 12:15:00",
    user: "John Doe",
    action: "UPDATE",
    entity: "Stock Item",
    entityId: "MAT-001",
    details: "Updated stock quantity: 500 -> 450",
    ip: "192.168.1.25"
  },
  {
    id: "LOG-1003",
    timestamp: "2024-03-19 09:45:11",
    user: "Jane Smith",
    action: "DELETE",
    entity: "Return Request",
    entityId: "RET-2024-003",
    details: "Deleted rejected return request",
    ip: "192.168.1.30"
  },
  {
    id: "LOG-1004",
    timestamp: "2024-03-19 08:30:00",
    user: "System",
    action: "LOGIN",
    entity: "Session",
    entityId: "-",
    details: "User Jane Smith logged in",
    ip: "192.168.1.30"
  },
  {
    id: "LOG-1005",
    timestamp: "2024-03-18 16:20:45",
    user: "Mike Johnson",
    action: "APPROVE",
    entity: "Material Request",
    entityId: "MR-2024-055",
    details: "Approved request for Production Line 1",
    ip: "192.168.1.15"
  }
];

export default function AuditLogs() {
  const columns = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono text-xs">{row.getValue("timestamp")}</span>
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{row.getValue("user")}</span>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action");
        const variant = 
          action === "CREATE" ? "default" :
          action === "UPDATE" ? "secondary" :
          action === "DELETE" ? "destructive" :
          action === "APPROVE" ? "outline" : "outline";
        
        return <Badge variant={variant}>{action}</Badge>;
      },
    },
    {
      accessorKey: "entity",
      header: "Entity",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.getValue("entity")}</span>
          <span className="text-xs text-muted-foreground">{row.original.entityId}</span>
        </div>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("details")}>
          {row.getValue("details")}
        </div>
      ),
    },
    {
      accessorKey: "ip",
      header: "IP Address",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("ip")}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track system activity and user actions for security and compliance.
          </p>
        </div>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" /> Export Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,231</div>
            <p className="text-xs text-muted-foreground">Events logged this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Actions</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Deletions & security changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Users active today</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
          />
        </div>
        <Select defaultValue="all_actions">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_actions">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all_users">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_users">All Users</SelectItem>
            <SelectItem value="admin">Admin User</SelectItem>
            <SelectItem value="john">John Doe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
