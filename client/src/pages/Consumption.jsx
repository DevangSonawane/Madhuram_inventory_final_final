import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Plus,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock Data
const consumptionData = [
  { name: 'Jan', maintenance: 4000, production: 2400, projects: 2400 },
  { name: 'Feb', maintenance: 3000, production: 1398, projects: 2210 },
  { name: 'Mar', maintenance: 2000, production: 9800, projects: 2290 },
  { name: 'Apr', maintenance: 2780, production: 3908, projects: 2000 },
  { name: 'May', maintenance: 1890, production: 4800, projects: 2181 },
  { name: 'Jun', maintenance: 2390, production: 3800, projects: 2500 },
];

const logs = [
  {
    id: "LOG-001",
    item: "Copper Wire 2mm",
    quantity: 50,
    unit: "m",
    consumedBy: "Project Alpha",
    department: "Projects",
    date: "2024-03-20",
    cost: 1200
  },
  {
    id: "LOG-002",
    item: "Machine Oil",
    quantity: 10,
    unit: "L",
    consumedBy: "Maintenance Team",
    department: "Maintenance",
    date: "2024-03-19",
    cost: 450
  },
  {
    id: "LOG-003",
    item: "Safety Gloves",
    quantity: 100,
    unit: "pairs",
    consumedBy: "Floor Staff",
    department: "Production",
    date: "2024-03-18",
    cost: 800
  }
];

export default function Consumption() {
  const [isLogOpen, setIsLogOpen] = useState(false);

  const columns = [
    {
      accessorKey: "item",
      header: "Item",
      cell: ({ row }) => <div className="font-medium">{row.getValue("item")}</div>,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span>{row.getValue("quantity")}</span>
          <span className="text-muted-foreground text-xs">{row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: "consumedBy",
      header: "Consumed By",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("department")}</Badge>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-3 w-3" />
          <span>{row.getValue("date")}</span>
        </div>
      ),
    },
    {
      accessorKey: "cost",
      header: "Est. Cost",
      cell: ({ row }) => <div className="font-mono">₹{row.getValue("cost")}</div>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumption</h1>
          <p className="text-muted-foreground">
            Track material usage across departments and projects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button onClick={() => setIsLogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log Consumption
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹124,500</div>
            <p className="text-xs text-muted-foreground flex items-center text-green-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              -4% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Department</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Production</div>
            <p className="text-xs text-muted-foreground">45% of total usage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Consumed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">Units this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 Projects</div>
            <p className="text-xs text-muted-foreground">Active consumers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consumption Trends</CardTitle>
          <CardDescription>Monthly consumption value by department</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumptionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis prefix="₹" />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Legend />
              <Bar dataKey="production" fill="#0f172a" name="Production" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maintenance" fill="#64748b" name="Maintenance" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projects" fill="#e2e8f0" name="Projects" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" className="flex gap-2">
          <Filter className="h-4 w-4" />
          Filter by Dept
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={logs} />
        </CardContent>
      </Card>

      {/* Log Consumption Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Material Consumption</DialogTitle>
            <DialogDescription>
              Record material usage for a specific department or project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department / Project</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select who consumed it" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production Floor</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="project-a">Project Alpha</SelectItem>
                  <SelectItem value="project-b">Project Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item-1">Copper Wire 2mm</SelectItem>
                  <SelectItem value="item-2">Machine Oil</SelectItem>
                  <SelectItem value="item-3">Safety Gloves</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input disabled value="Units" className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="Purpose of usage..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsLogOpen(false)}>Record Usage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
