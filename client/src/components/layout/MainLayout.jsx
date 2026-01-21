import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export function MainLayout() {
  const location = useLocation();
  // We need to lift the state up or use a context if we want to adjust the main content margin
  // For now, we'll use a CSS-based approach with :has selector or a simpler fixed layout
  // But since the Sidebar component manages its own state, we need to coordinate.
  // Let's refactor Sidebar to accept state from here.
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full flex">
      <div className={cn(
        "hidden md:block fixed inset-y-0 z-50 transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}>
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </div>
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "md:pl-16" : "md:pl-64"
      )}>
        <Header />
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
