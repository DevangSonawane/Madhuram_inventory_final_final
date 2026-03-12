import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasPageAccess, normalizeProjectRoutePath } from '@/lib/accessControl';

export function MainLayout() {
  const location = useLocation();
  const { projectId } = useParams();
  const { projects, selectedProject, selectProject, loading } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Sync URL with Project Context
  useEffect(() => {
    if (!loading && projects.length > 0) {
      if (projectId) {
        // If we are on a project route, ensure the project is selected in context
        // Handle both string and number comparisons
        const currentProjectId = String(selectedProject?.id || selectedProject?.project_id || '');
        const urlProjectId = String(projectId);
        
        if (currentProjectId !== urlProjectId) {
          const project = projects.find(p => 
            String(p.id) === urlProjectId || 
            String(p.project_id) === urlProjectId
          );
          if (project) {
            selectProject(project);
          } else {
            // Project not found in list - redirect to project selection
            console.warn(`Project ${projectId} not found in available projects`);
            navigate('/projects');
          }
        }
      }
    } else if (!loading && projects.length === 0 && projectId) {
      // Projects loaded but list is empty
      navigate('/projects');
    }
  }, [projectId, projects, selectedProject, loading, navigate, selectProject]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentPagePath = normalizeProjectRoutePath(location.pathname);
  const isCurrentPageAllowed = hasPageAccess(user, currentPagePath);
  const shouldShowSidebar = isCurrentPageAllowed;

  return (
    <div className="min-h-screen w-full flex bg-muted/30">
      {shouldShowSidebar && (
        <div className={cn(
          "hidden md:block fixed inset-y-0 z-50 transition-all duration-300",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}>
          <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        </div>
      )}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        shouldShowSidebar ? (isSidebarCollapsed ? "md:pl-20" : "md:pl-72") : "md:pl-0"
      )}>
        <Header />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto overflow-x-hidden">
          <div className="content-shell">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full w-full"
              >
                {isCurrentPageAllowed ? (
                  <Outlet />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <p className="text-center text-2xl md:text-3xl font-semibold text-destructive">
                      Please contact admin to get access
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
