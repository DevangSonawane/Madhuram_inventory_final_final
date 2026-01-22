import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Building, Calendar, MapPin, Loader2, Plus, LayoutGrid, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProjectSelection() {
  const { projects, loading, selectProject, fetchProjects, createProject, deleteProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    location: '',
    floors: '',
    start_date: '',
    value: '',
    status: 'Planning'
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Work Order State
  const [isWorkOrderEnabled, setIsWorkOrderEnabled] = useState(false);
  const [workOrderPreview, setWorkOrderPreview] = useState('');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  // Auto-generate Work Order Preview when project details change
  useEffect(() => {
    if (isWorkOrderEnabled && !isManuallyEdited) {
      const generatedPreview = `WORK ORDER
--------------------------------
Date: ${new Date().toLocaleDateString()}
Project Name: ${newProject.name || '[Project Name]'}
Client: ${newProject.client || '[Client Name]'}
Location: ${newProject.location || '[Location]'}
Floors: ${newProject.floors || '[No. of Floors]'}
Start Date: ${newProject.start_date || '[Start Date]'}
Estimated Value: ${newProject.value || '[Value]'}

Scope of Work:
1. Installation of Ethernet Cabling
2. Network Configuration
3. Testing and Commissioning

Authorized By:
${user?.name || 'Project Manager'}
--------------------------------`;
      setWorkOrderPreview(generatedPreview);
    }
  }, [newProject, isWorkOrderEnabled, user?.name, isManuallyEdited]);

  const handleWorkOrderChange = (e) => {
    setWorkOrderPreview(e.target.value);
    setIsManuallyEdited(true);
  };

  const handleResetWorkOrder = () => {
    setIsManuallyEdited(false);
    // The useEffect will trigger and regenerate the preview
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project) => {
    selectProject(project);
    navigate(`/${project.id}`);
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const projectData = {
        ...newProject,
        manager_id: user.id
      };

      if (isWorkOrderEnabled) {
        projectData.work_order_number = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        projectData.work_order_details = workOrderPreview;
      }

      const result = await createProject(projectData);
      
      if (result.success) {
        toast({
          title: "Project Created",
          description: isWorkOrderEnabled ? "Project and Work Order created successfully." : "New project has been successfully created.",
        });
        setIsNewProjectOpen(false);
        setNewProject({
            name: '',
            client: '',
            location: '',
            floors: '',
            start_date: '',
            value: '',
            status: 'Planning'
        });
        setIsWorkOrderEnabled(false);
        setWorkOrderPreview('');
        setIsManuallyEdited(false);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create project",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    } finally {
        setIsCreating(false);
    }
  };

  const handleViewAllData = () => {
      // Logic for consolidated view - for now maybe just a toast or navigate to a special dashboard
      toast({
          title: "Consolidated View",
          description: "This feature is coming soon!",
      });
  };

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete.id);
        toast({
          title: "Project Deleted",
          description: `Project ${projectToDelete.name} has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete project",
          variant: "destructive"
        });
      } finally {
        setProjectToDelete(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
            <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Welcome, {user?.name}</h1>
            <p className="text-lg text-gray-500">Select a project to continue to the dashboard.</p>
            </div>
            
            <div className="flex gap-4">
                {isAdmin && (
                    <Button variant="outline" onClick={handleViewAllData}>
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        View All Consolidated Data
                    </Button>
                )}
                
                {/* Only show create project if needed (e.g. Admin or Manager) */}
                <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input 
                            id="start_date" 
                            type="date"
                            value={newProject.start_date}
                            onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                        />
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox 
                            id="work_order" 
                            checked={isWorkOrderEnabled}
                            onCheckedChange={(checked) => setIsWorkOrderEnabled(checked)}
                        />
                        <Label htmlFor="work_order" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Generate Work Order
                        </Label>
                    </div>

                    {isWorkOrderEnabled && (
                        <div className="space-y-2 border rounded-md p-4 bg-gray-50 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <Label htmlFor="preview">Work Order Preview</Label>
                                {isManuallyEdited && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleResetWorkOrder}
                                        className="h-6 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        Reset to Auto-generated
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                                Review and edit the work order details before creating the project.
                            </p>
                            <Textarea 
                                id="preview" 
                                value={workOrderPreview}
                                onChange={handleWorkOrderChange}
                                className="min-h-[200px] font-mono text-sm"
                            />
                        </div>
                    )}
                    </div>
                    <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateProject} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Project
                    </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-primary relative group" onClick={() => handleSelectProject(project)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <CardDescription className="mt-1">{project.client}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={project.status === 'Active' || project.status === 'In Progress' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="mr-2 h-4 w-4" />
                  {project.location || 'No location specified'}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="mr-2 h-4 w-4" />
                  Started: {project.start_date || 'N/A'}
                </div>
                {project.value && (
                  <div className="text-lg font-semibold text-gray-900">
                    {project.value}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full">Select Project</Button>
              </CardFooter>
            </Card>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No projects found. {isAdmin ? "Create one to get started." : "Please contact an administrator."}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the project <strong>{projectToDelete?.name}</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. All associated data will be removed.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProject}>Delete Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
