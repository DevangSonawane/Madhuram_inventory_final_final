import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch projects from API when user is available
  useEffect(() => {
    if (user || localStorage.getItem('inventory_user')) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProject(null);
      setLoading(false);
    }
  }, [user]);

  // Load selected project from local storage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('selected_project_id');
    if (savedProjectId && projects.length > 0) {
      const project = projects.find(p => p.project_id === savedProjectId || p.id === savedProjectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const result = await api.getProjects();
      if (result.success && result.data) {
        // Map API response to match expected format
        const mappedProjects = result.data.map(project => ({
          id: project.project_id || project.id,
          project_id: project.project_id,
          name: project.project_name || project.name,
          project_name: project.project_name,
          client: project.client_name || project.client,
          client_name: project.client_name,
          location: project.location,
          floor: project.floor,
          floors: project.floor, // For compatibility
          start_date: project.product_duration || project.project_startdate || project.start_date,
          product_duration: project.product_duration,
          value: project.estimate_value || project.value,
          estimate_value: project.estimate_value,
          wo_number: project.wo_number,
          work_order_file: project.work_order_file,
          work_order_information: project.work_order_information,
          mas_file: project.mas_file,
          pr_po_tracking: project.pr_po_tracking || [],
          samples: project.samples || [],
          ml_management: project.ml_management || { ml_task: '' },
          manager_id: project.user_id || project.manager_id,
          status: project.status || 'Planning',
          created_at: project.created_at,
          updated_at: project.updated_at
        }));
        setProjects(mappedProjects);
      } else {
        console.error('Failed to fetch projects:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to load projects',
          variant: 'destructive'
        });
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects. Please try again.',
        variant: 'destructive'
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (newProjectData) => {
    setLoading(true);
    try {
      // Map form data to API format
      const apiData = {
        project_name: newProjectData.name || newProjectData.project_name || '',
        product_duration: newProjectData.start_date || newProjectData.product_duration || '',
        client_name: newProjectData.client || newProjectData.client_name || '',
        location: newProjectData.location || '',
        floor: newProjectData.floors || newProjectData.floor || '',
        estimate_value: newProjectData.value || newProjectData.estimate_value || '',
        wo_number: newProjectData.wo_number || '',
        work_order_information: newProjectData.work_order_information || '',
        pr_po_tracking: newProjectData.pr_po_tracking || [],
        samples: newProjectData.samples || [],
        ml_management: newProjectData.ml_management || { ml_task: '' },
        work_order_file: newProjectData.work_order_file,
        mas_file: newProjectData.mas_file
      };

      const result = await api.createProject(apiData);
      
      if (result.success) {
        // Refresh projects list
        await fetchProjects();
        return result;
      } else {
        throw new Error(result.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive'
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    setLoading(true);
    try {
      // Use project_id if available, otherwise use id
      const idToDelete = typeof projectId === 'object' && projectId.project_id 
        ? projectId.project_id 
        : projectId;
      
      const result = await api.deleteProject(idToDelete);
      
      if (result.success) {
        // If the deleted project was selected, clear selection
        if (selectedProject && (selectedProject.project_id === idToDelete || selectedProject.id === idToDelete)) {
          clearProject();
        }
        
        // Refresh projects list
        await fetchProjects();
        
        toast({
          title: 'Success',
          description: 'Project deleted successfully'
        });
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive'
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project) => {
    setSelectedProject(project);
    if (project) {
      localStorage.setItem('selected_project_id', project.id);
    } else {
      localStorage.removeItem('selected_project_id');
    }
  };

  const clearProject = () => {
    setSelectedProject(null);
    localStorage.removeItem('selected_project_id');
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      selectedProject, 
      selectProject, 
      clearProject, 
      loading,
      fetchProjects,
      createProject,
      deleteProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
