import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { MENU_CATEGORIES } from "@/constants/menuItems";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package2, ChevronLeft, ChevronRight } from "lucide-react";

export function Sidebar({ className, isCollapsed, toggleSidebar }) {
  // If props are not provided (e.g. mobile sheet usage), use local state logic or defaults
  // For mobile sheet, it's always expanded, so we don't need collapse logic there really.
  // But to be safe, we can default isCollapsed to false if undefined.
  
  const collapsed = isCollapsed === undefined ? false : isCollapsed;

  return (
    <div className={cn(
      "pb-12 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 relative flex flex-col shadow-xl z-50", 
      collapsed ? "w-20" : "w-72",
      className
    )}>
      {toggleSidebar && (
        <div className="absolute -right-3 top-8 z-50">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7 rounded-full shadow-md bg-background border-border hover:bg-accent text-foreground p-0 flex items-center justify-center"
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <div className={cn("flex items-center h-20 px-6", collapsed ? "justify-center px-2" : "")}>
        <div className="flex items-center gap-3 font-bold text-2xl text-sidebar-primary tracking-tight">
           <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-lg shadow-lg shadow-sidebar-primary/20">
             <Package2 className="h-6 w-6" />
           </div>
           {!collapsed && <span className="text-sidebar-foreground font-bold text-xl tracking-tight">Madhuram</span>}
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-4 px-3">
        <div className="space-y-6">
          {MENU_CATEGORIES.map((category, index) => (
            <div key={index} className="space-y-1">
              {!collapsed && (
                <h3 className="px-4 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest mb-2 font-mono">
                  {category.category}
                </h3>
              )}
              {category.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                      collapsed ? "justify-center px-2" : "",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200", collapsed ? "mr-0" : "mr-3", "group-hover:scale-110")} />
                  {!collapsed && <span>{item.title}</span>}
                  {/* Active Indicator Glow */}
                  {!collapsed && (
                     <div className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-l-full transition-opacity duration-300",
                        "opacity-0 group-hover:opacity-100"
                     )} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {!collapsed && (
        <div className="p-4 mt-auto">
            <div className="bg-sidebar-accent/50 rounded-xl p-4 border border-sidebar-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sidebar-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                        V1
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-sidebar-foreground">Inventory System</span>
                        <span className="text-xs text-sidebar-foreground/50">v1.0.0</span>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
