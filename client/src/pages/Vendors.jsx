import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Globe
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
import { useToast } from "@/hooks/use-toast";

// Mock Data
const initialPartners = [
  {
    id: "BP-001",
    name: "Acme Supplies Ltd",
    type: "Vendor",
    contactPerson: "Robert Fox",
    email: "robert@acme.com",
    phone: "+1 234 567 890",
    location: "New York, USA",
    status: "Active",
    rating: 4.8
  },
  {
    id: "BP-002",
    name: "Global Tech Industries",
    type: "Customer",
    contactPerson: "Sarah Wilson",
    email: "sarah@globaltech.com",
    phone: "+1 987 654 321",
    location: "London, UK",
    status: "Active",
    rating: 4.5
  },
  {
    id: "BP-003",
    name: "Fast Logistics Inc",
    type: "Service Provider",
    contactPerson: "Mike Brown",
    email: "mike@fastlog.com",
    phone: "+1 456 789 012",
    location: "Berlin, Germany",
    status: "Inactive",
    rating: 3.2
  }
];

export default function BusinessPartners() {
  const [partners, setPartners] = useState(initialPartners);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "",
    type: "Vendor",
    contactPerson: "",
    email: "",
    phone: "",
    location: "",
    status: "Active"
  });
  const { toast } = useToast();

  const handleCreatePartner = () => {
    if (!newPartner.name || !newPartner.email || !newPartner.contactPerson) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Email, Contact Person).",
        variant: "destructive",
      });
      return;
    }

    const partner = {
      id: `BP-${String(partners.length + 1).padStart(3, '0')}`,
      ...newPartner,
      rating: 5.0
    };

    setPartners([...partners, partner]);
    setIsAddOpen(false);
    setNewPartner({
      name: "",
      type: "Vendor",
      contactPerson: "",
      email: "",
      phone: "",
      location: "",
      status: "Active"
    });
    toast({
      title: "Success",
      description: "Business Partner added successfully.",
    });
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Partner Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${row.original.name}`} />
            <AvatarFallback>{row.original.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.getValue("name")}</div>
            <div className="text-xs text-muted-foreground">{row.original.id}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("type")}</Badge>
      ),
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
      cell: ({ row }) => (
        <div className="flex flex-col text-sm">
          <span>{row.getValue("contactPerson")}</span>
        </div>
      ),
    },
    {
      accessorKey: "contact",
      header: "Contact Info",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-muted-foreground gap-1">
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> {row.original.email}
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {row.original.phone}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{row.getValue("location")}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === "Active" ? "default" : "secondary"}>
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
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Partner</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
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
          <h1 className="text-3xl font-bold tracking-tight">Business Partners</h1>
          <p className="text-muted-foreground">
            Manage vendors, suppliers, and customers.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Partner
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">126</div>
            <p className="text-xs text-muted-foreground">Registered clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5</div>
            <p className="text-xs text-muted-foreground">Recently added</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search partners..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" className="flex gap-2">
          <Filter className="h-4 w-4" />
          Type
        </Button>
      </div>

      <DataTable columns={columns} data={partners} />

      {/* Add Partner Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Business Partner</DialogTitle>
            <DialogDescription>
              Register a new vendor, customer, or service provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partner Type</Label>
                <Select value={newPartner.type} onValueChange={(val) => setNewPartner({...newPartner, type: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Service Provider">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newPartner.status} onValueChange={(val) => setNewPartner({...newPartner, status: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                placeholder="e.g. Acme Supplies Ltd" 
                value={newPartner.name}
                onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                    placeholder="Full Name" 
                    value={newPartner.contactPerson}
                    onChange={(e) => setNewPartner({...newPartner, contactPerson: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                    type="email" 
                    placeholder="contact@company.com" 
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({...newPartner, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                    placeholder="+1 234 567 890" 
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Location/City</Label>
                <Input 
                    placeholder="New York, USA" 
                    value={newPartner.location}
                    onChange={(e) => setNewPartner({...newPartner, location: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePartner}>Create Partner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
