import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';

const ProjectContext = createContext(null);

// Mock Data for Projects
const MOCK_PROJECTS = [
  {
    id: "PRJ-2026-001",
    name: "Lodha World One Tower",
    client: "Lodha Group",
    location: "Lower Parel, Mumbai",
    floors: 117,
    start_date: "2026-01-10",
    manager_id: "2", // Project Manager (Rajesh Kumar)
    status: "In Progress",
    value: "₹500 Cr"
  },
  {
    id: "PRJ-2026-002",
    name: "Hiranandani Gardens",
    client: "Hiranandani Group",
    location: "Powai, Mumbai",
    floors: 45,
    start_date: "2026-02-01",
    manager_id: "1", // Admin
    status: "Planning",
    value: "₹250 Cr"
  }
];

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize projects from localStorage or mock data
  useEffect(() => {
    // If no user is logged in, we might still want to load projects for dev/demo if needed
    // But generally, we should wait for user.
    // However, if we are in a decoupled frontend mode, maybe we should just load them?
    
    // For now, let's keep the user check but ensure we don't get stuck in loading state
    
    const loadData = () => {
      setLoading(true);
      // Simulate API delay
      setTimeout(() => {
        const storedProjects = localStorage.getItem('mock_projects');
        if (storedProjects) {
          setProjects(JSON.parse(storedProjects));
        } else {
          // Initialize with mock data if no local storage exists
          setProjects(MOCK_PROJECTS);
          localStorage.setItem('mock_projects', JSON.stringify(MOCK_PROJECTS));
        }
        setLoading(false);
      }, 500);
    };

    // Always load data for now to fix white screen issue if user is null initially but auth provider handles it
    // Or if we are in a mode where we want to show projects even if "user" state isn't fully set yet (rare)
    // Better: Check if we have a token in localStorage if user is null?
    // The AuthContext initializes user from localStorage.
    
    if (user || localStorage.getItem('inventory_user')) {
        loadData();
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
      const project = projects.find(p => p.id === savedProjectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [projects]);

  const fetchProjects = async () => {
    // In mock mode, we just reload from local storage or keep state as is
    // This is just to satisfy the interface expected by consumers
    setLoading(true);
    setTimeout(() => {
      const storedProjects = localStorage.getItem('mock_projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
      setLoading(false);
    }, 300);
  };

  const createProject = async (newProjectData) => {
      setLoading(true);
      return new Promise((resolve) => {
          setTimeout(() => {
              const workOrderFile = newProjectData.work_order_file;
              const work_order_file = workOrderFile instanceof File ? workOrderFile.name : (workOrderFile ?? null);
              const newProject = {
                  id: `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
                  ...newProjectData,
                  work_order_file,
                  status: newProjectData.status || 'Planning',
                  manager_id: user.id
              };
              
              const updatedProjects = [newProject, ...projects];
              setProjects(updatedProjects);
              localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
              setLoading(false);
              resolve({ success: true, data: newProject });
          }, 600);
      });
  };

  const deleteProject = async (projectId) => {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedProjects = projects.filter(p => p.id !== projectId);
        setProjects(updatedProjects);
        localStorage.setItem('mock_projects', JSON.stringify(updatedProjects));
        
        // If the deleted project was selected, clear selection
        if (selectedProject && selectedProject.id === projectId) {
          clearProject();
        }
        
        setLoading(false);
        resolve({ success: true });
      }, 500);
    });
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
