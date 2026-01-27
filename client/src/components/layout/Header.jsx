import React from 'react';
import { Menu, Search, Bell, User, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from '@/contexts/NotificationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export function Header() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  console.log(user)

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 bg-background/80 backdrop-blur-md px-4 md:px-8 transition-all duration-300">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden -ml-2 text-muted-foreground hover:text-foreground">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-r-0 bg-sidebar text-sidebar-foreground">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      <div className="hidden md:flex items-center">
         <Breadcrumb>
          <BreadcrumbList className="text-sm font-medium">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathnames.map((name, index) => {
              const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
              const isLast = index === pathnames.length - 1;
              let formattedName = name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
              
              if (selectedProject && name === selectedProject.id) {
                formattedName = selectedProject.name;
              }

              return (
                <React.Fragment key={name}>
                  <BreadcrumbSeparator className="text-muted-foreground/40" />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground">{formattedName}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                         <Link to={routeTo} className="text-muted-foreground hover:text-primary transition-colors">{formattedName}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="w-full flex-1 md:w-auto md:flex-none ml-auto flex justify-end">
        <form className="relative group w-full max-w-[180px] sm:max-w-xs md:max-w-[240px] lg:max-w-[320px]" onSubmit={(e) => e.preventDefault()}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 pl-10 h-10 rounded-full transition-all duration-300 shadow-sm focus:shadow-md"
          />
        </form>
      </div>
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/5 relative rounded-full h-10 w-10">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto px-1 text-xs text-muted-foreground hover:text-primary" 
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex flex-col gap-1 p-4 text-sm hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-medium ${!notification.read ? 'text-primary' : 'text-foreground'}`}>
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground hover:text-primary"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-1">
                        {notification.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || "https://github.com/shadcn.png"} alt={user?.name} />
                <AvatarFallback>{user?.name?.substring(0,2).toUpperCase() || "CN"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => {
              const projectId = selectedProject?.id || pathnames[0];
              navigate(projectId ? `/${projectId}/profile` : '/projects');
            }}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => {
              const projectId = selectedProject?.id || pathnames[0];
              navigate(projectId ? `/${projectId}/settings` : '/projects');
            }}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/support')}>
              Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
