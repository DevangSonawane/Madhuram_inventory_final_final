import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useOutlet, useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useProject } from '@/contexts/ProjectContext';

export function MainLayout() {
  const location = useLocation();
  const outletComponent = useOutlet();
  const { projectId } = useParams();
  const { projects, selectedProject, selectProject, loading } = useProject();
  const navigate = useNavigate();
  
  // Sync URL with Project Context
  useEffect(() => {
    if (!loading && projects.length > 0) {
      if (projectId) {
        // If we are on a project route, ensure the project is selected in context
        if (selectedProject?.id !== projectId) {
          const project = projects.find(p => p.id === projectId);
          if (project) {
            selectProject(project);
          } else {
            // Project not found in list - might be loading or invalid
            // Don't redirect immediately to allow for potential sync issues, 
            // but if it persists, user will see empty state or we can handle error
            console.warn(`Project ${projectId} not found in available projects`);
             navigate('/projects');
          }
        }
      } else {
        // No project ID in URL - we are at root or a non-project route
        // If we have a selected project, maybe we should redirect to it?
        // Or if this layout is used for non-project pages, do nothing.
        // Current structure implies MainLayout IS for project pages mostly.
        
        // If we are at /projects, we shouldn't be in MainLayout usually if MainLayout requires a project
        // But let's check the routes in App.jsx.
        // App.jsx has /:projectId element={<MainLayout />}
        // So MainLayout is ONLY mounted when there is a projectId.
        
        // However, if we somehow get here without one (e.g. strict mode double render or something),
        // we should probably redirect.
        
        // But wait, the route definition is path="/:projectId" so projectId should always be present?
        // Unless it matches something else?
        
        // If we are here, we expect a project.
      }
    } else if (!loading && projects.length === 0 && projectId) {
        // Projects loaded but list is empty?
        // This might happen if user has no projects.
        navigate('/projects');
    }
  }, [projectId, projects, selectedProject, loading, navigate, selectProject]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-muted/30">
      <div className={cn(
        "hidden md:block fixed inset-y-0 z-50 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </div>
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-72"
      )}>
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {outletComponent}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
