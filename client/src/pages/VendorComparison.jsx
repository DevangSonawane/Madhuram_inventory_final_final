import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Star, Download, Mail, ShoppingCart } from "lucide-react";

// Mock Comparison Data
const VENDORS = [
  { id: "v1", name: "Astral Pipes Ltd", rating: 4.8, deliveryTime: "5 Days", paymentTerms: "30 Days Credit", price: 420, warranty: "5 Years" },
  { id: "v2", name: "Supreme Industries", rating: 4.5, deliveryTime: "3 Days", paymentTerms: "15 Days Credit", price: 435, warranty: "5 Years" },
  { id: "v3", name: "Ashirvad Pipes", rating: 4.6, deliveryTime: "7 Days", paymentTerms: "45 Days Credit", price: 410, warranty: "3 Years" },
];

export default function VendorComparison() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Comparison</h1>
          <p className="text-muted-foreground mt-2">Compare quotes and select the best vendor.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Mail className="mr-2 h-4 w-4" /> Request New Quotes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <CardTitle>Comparison Matrix: PR-2026-005</CardTitle>
              <CardDescription>Item: CPVC Pipe 2 inch (Qty: 5000 Mtr)</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg w-fit">Lowest Price: ₹410</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Criteria</TableHead>
                  {VENDORS.map(v => (
                    <TableHead key={v.id} className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-lg">{v.name}</span>
                        <div className="flex items-center mt-1 text-yellow-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="ml-1 text-xs text-muted-foreground">{v.rating}</span>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Unit Price (₹)</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className={`text-center font-bold ${v.price === 410 ? 'text-green-600' : ''}`}>
                      ₹{v.price}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Cost (₹)</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className="text-center">
                      ₹{(v.price * 5000).toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Delivery Time</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className={`text-center ${v.deliveryTime === "3 Days" ? 'text-green-600' : ''}`}>
                      {v.deliveryTime}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Payment Terms</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className="text-center">
                      {v.paymentTerms}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Warranty</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className="text-center">
                      {v.warranty}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Action</TableCell>
                  {VENDORS.map(v => (
                    <TableCell key={v.id} className="text-center">
                      <Button size="sm" variant={v.price === 410 ? "default" : "outline"}>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Select Vendor
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile View: Vendor Cards */}
          <div className="grid grid-cols-1 gap-6 md:hidden">
            {VENDORS.map(v => (
              <div key={v.id} className="border rounded-lg p-4 space-y-4">
                 <div className="flex justify-between items-start">
                   <div>
                     <div className="font-bold text-lg">{v.name}</div>
                     <div className="flex items-center text-yellow-500 text-sm">
                       <Star className="w-3 h-3 fill-current mr-1" />
                       {v.rating}
                     </div>
                   </div>
                   <div className={`font-bold text-lg ${v.price === 410 ? 'text-green-600' : ''}`}>
                     ₹{v.price}
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-y-2 text-sm">
                   <div className="text-muted-foreground">Total Cost:</div>
                   <div className="font-medium">₹{(v.price * 5000).toLocaleString()}</div>
                   
                   <div className="text-muted-foreground">Delivery:</div>
                   <div className={`font-medium ${v.deliveryTime === "3 Days" ? 'text-green-600' : ''}`}>
                      {v.deliveryTime}
                   </div>

                   <div className="text-muted-foreground">Payment:</div>
                   <div className="font-medium">{v.paymentTerms}</div>

                   <div className="text-muted-foreground">Warranty:</div>
                   <div className="font-medium">{v.warranty}</div>
                 </div>

                 <Button className="w-full" variant={v.price === 410 ? "default" : "outline"}>
                   <ShoppingCart className="mr-2 h-4 w-4" /> Select Vendor
                 </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
           <CardHeader>
             <CardTitle>Recommendation System</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               <div className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                 <div className="bg-primary/10 p-2 rounded-full">
                   <Star className="h-6 w-6 text-primary" />
                 </div>
                 <div>
                   <h4 className="font-bold">Recommended: Ashirvad Pipes</h4>
                   <p className="text-sm text-muted-foreground mt-1">
                     Based on 40% Price weightage and 30% Delivery weightage. Although delivery is slower, the price advantage is significant (₹2.5L savings).
                   </p>
                 </div>
               </div>
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
