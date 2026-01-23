import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building, MapPin, Calendar, FileText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

// Mock Data
const MOCK_PROJECTS = [
  {
    id: "PRJ-2026-001",
    name: "Lodha World One Tower",
    client: "Lodha Group",
    location: "Lower Parel, Mumbai",
    floors: 117,
    startDate: "2026-01-10",
    manager: "Rajesh Kumar",
    status: "In Progress",
    value: "₹500 Cr"
  },
  {
    id: "PRJ-2026-002",
    name: "Hiranandani Gardens",
    client: "Hiranandani Group",
    location: "Powai, Mumbai",
    floors: 45,
    startDate: "2026-02-01",
    manager: "Sneha Patel",
    status: "Planning",
    value: "₹250 Cr"
  },
  {
    id: "PRJ-2026-003",
    name: "Prestige City",
    client: "Prestige Group",
    location: "Mulund, Mumbai",
    floors: 60,
    startDate: "2025-11-15",
    manager: "Amit Shah",
    status: "Active",
    value: "₹300 Cr"
  }
];

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  // New Project State
  const [newProject, setNewProject] = useState({
      name: "",
      client: "",
      location: "",
      floors: "",
      value: ""
  });

  const handleDeleteProject = () => {
    if (projectToDelete) {
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    }
  };

  const handleCreateProject = () => {
      const project = {
          id: `PRJ-2026-${String(projects.length + 1).padStart(3, '0')}`,
          ...newProject,
          startDate: new Date().toISOString().split('T')[0],
          manager: user?.role === 'project_manager' ? user.name : (user?.name || "Unassigned"),
          status: "Planning"
      };
      setProjects([...projects, project]);
      setIsNewProjectOpen(false);
      setNewProject({ name: "", client: "", location: "", floors: "", value: "" });
  };

  const userProjects = projects.filter(p => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    if (user.role === 'project_manager') return p.manager === user.name;
    return true;
  });

  const filteredProjects = userProjects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage construction projects, work orders, and client details.</p>
        </div>
        <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Lodha Park"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input 
                    id="client" 
                    placeholder="e.g. Lodha Group" 
                    value={newProject.client}
                    onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                    id="location" 
                    placeholder="Project Address" 
                    value={newProject.location}
                    onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="floors">No. of Floors</Label>
                  <Input 
                    id="floors" 
                    type="number" 
                    value={newProject.floors}
                    onChange={(e) => setNewProject({...newProject, floors: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Est. Value</Label>
                  <Input 
                    id="value" 
                    placeholder="₹" 
                    value={newProject.value}
                    onChange={(e) => setNewProject({...newProject, value: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1,050 Cr</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProjects.filter(p => p.status === 'In Progress').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planning</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProjects.filter(p => p.status === 'Planning').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Project List</CardTitle>
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredProjects.map((project) => (
              <div key={project.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold leading-none tracking-tight">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{project.id}</p>
                  </div>
                  <Badge variant={
                      project.status === "In Progress" ? "default" : 
                      project.status === "Active" ? "success" : "secondary"
                    }>
                      {project.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">Client</span>
                    <span className="font-medium">{project.client}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-muted-foreground text-xs">Value</span>
                     <span className="font-medium">{project.value}</span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                     <span className="text-muted-foreground text-xs">Location</span>
                     <span className="flex items-center">
                        <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                        {project.location}
                     </span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-muted-foreground text-xs">Manager</span>
                     <span>{project.manager}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-muted-foreground text-xs">Start Date</span>
                     <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                        {project.startDate}
                     </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                   <Button variant="outline" size="sm" className="flex-1">View</Button>
                   <Button 
                        variant="destructive" 
                        size="sm"
                        className="flex-1"
                        onClick={() => setProjectToDelete(project)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                   </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Floors</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      <span className="text-xs text-muted-foreground">{project.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="mr-1 h-3 w-3" />
                      {project.location}
                    </div>
                  </TableCell>
                  <TableCell>{project.floors}</TableCell>
                  <TableCell>{project.manager}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {project.startDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      project.status === "In Progress" ? "default" : 
                      project.status === "Active" ? "success" : "secondary"
                    }>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">View</Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setProjectToDelete(project)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project <strong>{projectToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProject}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
