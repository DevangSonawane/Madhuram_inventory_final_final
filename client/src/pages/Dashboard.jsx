import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Plus, FileText, Users, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { itemVariants, containerVariants } from '@/components/PageTransition';
import { useToast } from "@/hooks/use-toast";
import { useProject } from '@/contexts/ProjectContext';

const data = [
  { name: 'Jan', total: 1200 },
  { name: 'Feb', total: 2100 },
  { name: 'Mar', total: 800 },
  { name: 'Apr', total: 1600 },
  { name: 'May', total: 900 },
  { name: 'Jun', total: 1700 },
];

const activity = [
  {
    user: "John Doe",
    action: "Created a purchase order",
    time: "2 mins ago",
    status: "success",
    initials: "JD"
  },
  {
    user: "Jane Smith",
    action: "Approved material request",
    time: "1 hour ago",
    status: "success",
    initials: "JS"
  },
  {
    user: "System",
    action: "Low stock alert: Cement",
    time: "2 hours ago",
    status: "warning",
    initials: "SY"
  },
  {
    user: "Mike Johnson",
    action: "Received shipment PO-123",
    time: "4 hours ago",
    status: "info",
    initials: "MJ"
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProject } = useProject();

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Dashboard report is being generated...",
    });
    // Simulate export
    setTimeout(() => {
        toast({
            title: "Export Complete",
            description: "Dashboard report has been downloaded.",
        });
    }, 1500);
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of {selectedProject ? selectedProject.name : 'your inventory'} and operations.
            </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-12 sm:h-10 flex-1 sm:flex-none px-4 border-muted-foreground/20 hover:border-primary hover:text-primary transition-colors" onClick={handleExport}>
                <FileText className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Button size="sm" className="h-12 sm:h-10 flex-1 sm:flex-none px-4 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95" onClick={() => navigate('/purchase-requests')}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
            </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none ring-1 ring-black/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Value</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                 <span className="text-primary font-bold text-lg">₹</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">₹45,231.89</div>
              <p className="text-xs text-muted-foreground flex items-center mt-2 font-medium">
                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center mr-2 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    20.1%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none ring-1 ring-black/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Orders</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shadow-inner">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">+2350</div>
              <p className="text-xs text-muted-foreground flex items-center mt-2 font-medium">
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md flex items-center mr-2 dark:bg-red-900/30 dark:text-red-400">
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                    4%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none ring-1 ring-black/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Low Stock</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">12</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none ring-1 ring-black/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Materials</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                  <Package className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-foreground">573</div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Across 4 warehouses
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-7">
        <motion.div className="col-span-1 lg:col-span-4" variants={itemVariants}>
          <Card className="h-full shadow-lg border-none ring-1 ring-black/5">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Monthly consumption trends.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 sm:pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                      contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          borderRadius: '12px', 
                          border: '1px solid hsl(var(--border))', 
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' 
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[6, 6, 0, 0]} 
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div className="col-span-1 lg:col-span-3" variants={itemVariants}>
          <Card className="h-full shadow-lg border-none ring-1 ring-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  Recent Activity
              </CardTitle>
              <CardDescription>
                Latest actions across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                {activity.map((item, index) => (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active" key={index}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 dark:bg-slate-800 dark:border-slate-900">
                       <div className="text-xs font-bold text-muted-foreground">{item.initials}</div>
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-sm text-foreground">{item.user}</div>
                            <time className="font-mono text-xs text-muted-foreground">{item.time}</time>
                        </div>
                        <div className="text-sm text-muted-foreground">{item.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
