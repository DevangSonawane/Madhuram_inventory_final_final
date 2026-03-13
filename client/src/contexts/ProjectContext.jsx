import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  const isFetchingProjectsRef = useRef(false);

  const normalizeAssignedProjectKeys = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchProjects = useCallback(async ({ showLoader = true } = {}) => {
    if (isFetchingProjectsRef.current) return;
    isFetchingProjectsRef.current = true;

    if (showLoader) setLoading(true);
    try {
      const result = await api.getProjects();
      if (result.success && result.data) {
        // API returns array of projects; ensure we have an array before mapping
        const rawProjects = Array.isArray(result.data) ? result.data : [];
        const mappedProjects = rawProjects.map(project => ({
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
        const normalizedRole = String(user?.role || '').toLowerCase();
        const isPrivilegedRole = normalizedRole === 'admin';
        const assignedKeys = new Set(normalizeAssignedProjectKeys(user?.project_list));

        const filteredProjects = isPrivilegedRole
          ? mappedProjects
          : mappedProjects.filter((project) => {
              if (assignedKeys.size === 0) return false;
              const candidates = [
                project.id,
                project.project_id,
                project.name,
                project.project_name,
              ]
                .map((item) => String(item ?? '').trim().toLowerCase())
                .filter(Boolean);
              return candidates.some((key) => assignedKeys.has(key));
            });

        setProjects(filteredProjects);
      } else {
        if (result?.error) console.error('Failed to fetch projects:', result.error);
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
      if (showLoader) setLoading(false);
      isFetchingProjectsRef.current = false;
    }
  }, [toast, user?.role, user?.project_list]);

  // Fetch projects from API when user is available
  useEffect(() => {
    if (user || localStorage.getItem('inventory_user')) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProject(null);
      setLoading(false);
    }
  }, [user?.user_id, user?.token, fetchProjects]);

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
        work_order_file_path: newProjectData.work_order_file_path || '',
        mas_file: newProjectData.mas_file
      };

      const result = await api.createProject(apiData);
      
      if (result.success) {
        // Refresh list in background without blocking UI.
        fetchProjects({ showLoader: false });
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
        
        // Refresh list in background without blocking UI.
        fetchProjects({ showLoader: false });
        
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
