import React, { useState } from 'react';
import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export function MainLayout() {
  const location = useLocation();
  const outletComponent = useOutlet();
  
  // We need to lift the state up or use a context if we want to adjust the main content margin
  // For now, we'll use a CSS-based approach with :has selector or a simpler fixed layout
  // But since the Sidebar component manages its own state, we need to coordinate.
  // Let's refactor Sidebar to accept state from here.
  
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
        <main className="flex-1 p-8 overflow-y-auto overflow-x-hidden">
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
