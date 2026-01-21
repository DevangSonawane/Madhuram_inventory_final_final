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
      "pb-12 h-screen border-r bg-background transition-all duration-300 relative", 
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {toggleSidebar && (
        <div className="absolute -right-3 top-6 z-50">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-6 w-6 rounded-full shadow-md"
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>
      )}

      <div className="space-y-4 py-4 h-full flex flex-col">
        <div className={cn("px-3 py-2 flex-shrink-0 transition-all duration-300", collapsed ? "px-2" : "px-3")}>
          <div className={cn("flex items-center mb-4", collapsed ? "justify-center" : "px-4")}>
             <Package2 className="h-6 w-6 text-primary" />
            {!collapsed && (
              <h2 className="text-lg font-semibold tracking-tight ml-2">
                Madhura Inventory
              </h2>
            )}
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6">
            {MENU_CATEGORIES.map((category, index) => (
              <div key={index} className="space-y-1">
                {!collapsed && (
                  <h3 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
                    {category.category}
                  </h3>
                )}
                {category.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-md py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                        collapsed ? "justify-center px-2" : "px-3",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      )
                    }
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn("h-4 w-4", collapsed ? "mr-0" : "mr-2")} />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {!collapsed && (
          <div className="px-3 py-2 flex-shrink-0 mt-auto">
              <div className="px-4 text-xs text-muted-foreground">
                  v1.0.0
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
