import React from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const data = [
  {
    id: "MAT-001",
    name: "Cement Grade 53",
    category: "Raw Material",
    unit: "Bags",
    stock: 450,
    price: 350.00,
    status: "In Stock"
  },
  {
    id: "MAT-002",
    name: "Steel Rods 10mm",
    category: "Raw Material",
    unit: "Kg",
    stock: 1200,
    price: 65.50,
    status: "In Stock"
  },
  {
    id: "MAT-003",
    name: "Bricks (Red)",
    category: "Construction",
    unit: "Nos",
    stock: 50,
    price: 8.00,
    status: "Low Stock"
  },
  {
    id: "MAT-004",
    name: "Paint (White Emulsion)",
    category: "Finishing",
    unit: "Liters",
    stock: 0,
    price: 1200.00,
    status: "Out of Stock"
  },
   {
    id: "MAT-005",
    name: "Sand (River)",
    category: "Raw Material",
    unit: "Tons",
    stock: 25,
    price: 4500.00,
    status: "In Stock"
  },
];

const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "unit",
    header: "Unit",
  },
  {
    accessorKey: "stock",
    header: "Stock Level",
    cell: ({ row }) => {
      const stock = parseFloat(row.getValue("stock"))
      return (
        <div className="font-medium">
            {stock}
        </div>
      )
    }
  },
  {
    accessorKey: "price",
    header: "Unit Price",
    cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"))
        const formatted = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(price)
        return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status");
        let variant = "default";
        if (status === "Low Stock") variant = "warning"; // Need to add warning variant to badge or use destructive/secondary
        if (status === "Out of Stock") variant = "destructive";
        if (status === "In Stock") variant = "outline"; // or success if customized

        // Custom styling for badges since default variants are limited
        let className = "";
        if (status === "In Stock") className = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
        if (status === "Low Stock") className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
        if (status === "Out of Stock") className = "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";

        return <Badge variant="outline" className={className}>{status}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
                <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function Materials() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Materials</h2>
            <p className="text-muted-foreground">Manage your inventory materials and stock levels.</p>
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="name" />
    </div>
  );
}
