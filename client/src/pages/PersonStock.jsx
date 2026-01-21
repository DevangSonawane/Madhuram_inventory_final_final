import React, { useState } from 'react';
import { 
  User, 
  Package, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  History,
  Shield,
  Briefcase
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock data
const employees = [
  {
    id: "EMP-001",
    name: "John Doe",
    department: "Maintenance",
    role: "Senior Technician",
    itemsHeld: 5,
    status: "Active",
    email: "john.d@example.com"
  },
  {
    id: "EMP-002",
    name: "Jane Smith",
    department: "IT Support",
    role: "System Admin",
    itemsHeld: 12,
    status: "Active",
    email: "jane.s@example.com"
  },
  {
    id: "EMP-003",
    name: "Mike Johnson",
    department: "Field Ops",
    role: "Field Engineer",
    itemsHeld: 8,
    status: "On Leave",
    email: "mike.j@example.com"
  }
];

const assignedItems = [
  { id: 1, name: "Fluke Multimeter", code: "TOOL-001", assignedDate: "2024-01-15", condition: "Good" },
  { id: 2, name: "Safety Helmet", code: "PPE-001", assignedDate: "2024-01-15", condition: "New" },
  { id: 3, name: "Toolkit Set A", code: "TOOL-005", assignedDate: "2024-02-01", condition: "Good" },
  { id: 4, name: "Laptop Dell XPS", code: "IT-001", assignedDate: "2023-11-20", condition: "Good" },
  { id: 5, name: "Safety Boots", code: "PPE-002", assignedDate: "2024-01-15", condition: "Worn" },
];

export default function PersonStock() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const columns = [
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.original.id}`} />
            <AvatarFallback>{row.original.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.getValue("name")}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue("department")}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      accessorKey: "itemsHeld",
      header: "Items Held",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("itemsHeld")} Items
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === "Active" ? "default" : "outline"}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedEmployee(row.original)}>
                View Inventory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAssignOpen(true)}>
                Assign Item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View History</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Person Stock</h1>
          <p className="text-muted-foreground">
            Track tools and equipment assigned to employees.
          </p>
        </div>
        <Button onClick={() => setIsAssignOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Assign Stock
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Assigned</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">573</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Overdue items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Gear</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">Compliance rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" className="flex gap-2">
          <Filter className="h-4 w-4" />
          Department
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={employees} />
        </CardContent>
      </Card>

      {/* Employee Inventory Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Inventory</DialogTitle>
            <DialogDescription>
              Currently assigned items for <span className="font-medium text-foreground">{selectedEmployee?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Department:</span> <span className="font-medium">{selectedEmployee?.department}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">ID:</span> <span className="font-medium">{selectedEmployee?.id}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-md">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                <div className="col-span-5">Item Details</div>
                <div className="col-span-3">Assigned Date</div>
                <div className="col-span-2">Condition</div>
                <div className="col-span-2">Action</div>
              </div>
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {assignedItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                    <div className="col-span-5">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.code}</div>
                    </div>
                    <div className="col-span-3 text-muted-foreground">
                      {item.assignedDate}
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline">{item.condition}</Badge>
                    </div>
                    <div className="col-span-2">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        Return
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEmployee(null)}>Close</Button>
            <Button>Print Handover Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Stock Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New Stock</DialogTitle>
            <DialogDescription>
              Assign a tool or equipment to an employee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select item from inventory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tool-1">Fluke Multimeter (TOOL-001)</SelectItem>
                  <SelectItem value="laptop-1">Dell XPS 15 (IT-005)</SelectItem>
                  <SelectItem value="drill-1">Bosch Power Drill (TOOL-012)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Return Date (Optional)</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Condition, accessories, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsAssignOpen(false)}>Assign Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
