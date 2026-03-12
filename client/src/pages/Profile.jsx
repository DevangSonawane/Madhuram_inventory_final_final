import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  Search,
  Plus,
  MoreVertical,
  Phone,
  Mail,
  Edit,
  Shield,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Users,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import SettingsAccessControl from '@/pages/SettingsAccessControl';
import { hasFunctionAccess } from '@/lib/accessControl';

export default function Profile() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user: currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { toast } = useToast();

  const isAdmin = currentUser?.role === 'admin';
  const isOperationalManager = currentUser?.role === 'operational_manager';
  const canManageUsersByRole = isAdmin || isOperationalManager;
  const canViewUserManagementTab = canManageUsersByRole && hasFunctionAccess(currentUser, 'settings.user_management');
  const canViewAccessControlTab = canManageUsersByRole && hasFunctionAccess(currentUser, 'settings.access_control');

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone_number: "",
    role: "labour",
    project: [],
    password: "",
    project_list: []
  });

  useEffect(() => {
    if (canViewUserManagementTab) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [canViewUserManagementTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await api.getUsers();
      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
      } else if (result.success) {
        setUsers([]);
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching users",
          description: result.error
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      phone_number: "",
      role: "labour",
      project: [],
      password: "",
      project_list: []
    });
  };

  const handleAddUser = async () => {
    try {
      const signupData = {
        name: formData.name,
        username: formData.username || formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role,
        project: Array.isArray(formData.project) ? formData.project : [],
        password: formData.password
      };
      const result = await api.createUser(signupData);
      if (result.success) {
        toast({ title: "User created", description: `${formData.name} has been added successfully.` });
        setIsAddOpen(false);
        resetForm();
        fetchUsers();
      } else {
        toast({ variant: "destructive", title: "Error creating user", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create user" });
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      project_list: user.project_list || []
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role,
        project_list: formData.project_list
      };
      const result = await api.updateUser(selectedUser.user_id, updateData);
      if (result.success) {
        toast({ title: "User updated", description: "User details updated successfully." });
        setIsEditOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        toast({ variant: "destructive", title: "Error updating user", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update user" });
    }
  };

  const handleDeleteUser = async (user) => {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        const result = await api.deleteUser(user.user_id);
        if (result.success) {
          toast({ title: "User deleted", description: "User has been removed." });
          fetchUsers();
        } else {
          toast({ variant: "destructive", title: "Error deleting user", description: result.error });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete user" });
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${row.original.name}`} />
            <AvatarFallback className="text-sm">{row.original.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.username}</span>
          </div>
        </div>
      )
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col text-sm gap-0.5">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]">{row.original.email}</span>
          </div>
          {row.original.phone_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{row.original.phone_number}</span>
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'} className="font-normal">
          {row.original.role}
        </Badge>
      )
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditClick(user)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteUser(user)}>
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const formField = (id, label, type = "text", name, options = {}) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={formData[name]}
        onChange={handleInputChange}
        className="h-10"
        {...options}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto w-full flex flex-wrap gap-1 bg-muted/60 p-1.5 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
            <Monitor className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          {canViewUserManagementTab && (
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
              <Shield className="mr-2 h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          {canViewAccessControlTab && (
            <TabsTrigger value="access-control" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2">
              <Shield className="mr-2 h-4 w-4" />
              Access Control
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-0">
          <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/10 px-6 pt-6 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                      <AvatarImage src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || '')}`} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {currentUser?.name?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{currentUser?.name || 'User'}</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {currentUser?.email || '—'}
                    </p>
                    <Badge variant={currentUser?.role === 'admin' ? 'default' : 'secondary'} className="mt-2">
                      {currentUser?.role || 'User'}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Full name</p>
                      <p className="font-medium">{currentUser?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{currentUser?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{currentUser?.phone_number || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <Badge variant={currentUser?.role === 'admin' ? 'default' : 'secondary'}>
                        {currentUser?.role || '—'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-0">
          <Card className="border-0 shadow-sm ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose how the app looks. You can pick light, dark, or system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={theme === value ? 'default' : 'outline'}
                      size="sm"
                      className={cn("gap-2", theme === value && "ring-2 ring-primary ring-offset-2")}
                      onClick={() => setTheme(value)}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isOperationalManager && (
              <Card className="border-0 shadow-sm ring-1 ring-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Operational Manager</CardTitle>
                  <CardDescription>
                    You are logged in as Operational Manager. Open the ITR module to manage ITR workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate(projectId ? `/${projectId}/itr` : '/projects')}>
                    Open ITR Module
                  </Button>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {canViewUserManagementTab && (
          <TabsContent value="users" className="space-y-6 mt-0">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">User Management</h2>
                  <p className="text-sm text-muted-foreground">Manage system users and roles.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" /> Add user
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add user</DialogTitle>
                      <DialogDescription>Create a new account with a role.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {formField('name', 'Name', 'text', 'name')}
                      {formField('username', 'Username', 'text', 'username')}
                      {formField('email', 'Email', 'email', 'email')}
                      {formField('phone', 'Phone', 'tel', 'phone_number')}
                      {formField('password', 'Password', 'password', 'password', { required: true })}
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={formData.role} onValueChange={handleRoleChange}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="operational_manager">Operational Manager</SelectItem>
                            <SelectItem value="po_officer">PO Officer</SelectItem>
                            <SelectItem value="labour">Labour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddUser}>Create user</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative flex items-center gap-2">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 max-w-sm"
                />
              </div>

              {loading ? (
                <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? 'Try a different search.' : 'Add a user to get started.'}
                  </p>
                  {!searchTerm && (
                    <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add user
                    </Button>
                  )}
                </div>
              ) : (
                <div className="[&_.rounded-lg]:rounded-xl [&_.border]:ring-1 [&_.border]:ring-border/50 [&_.shadow-sm]:shadow-sm">
                  <DataTable columns={columns} data={filteredUsers} />
                </div>
              )}
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit user</DialogTitle>
                  <DialogDescription>Update details and role.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={formData.name} disabled className="h-10 bg-muted/50" />
                  </div>
                  {formField('edit-username', 'Username', 'text', 'username')}
                  {formField('edit-email', 'Email', 'email', 'email')}
                  {formField('edit-phone', 'Phone', 'tel', 'phone_number')}
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operational_manager">Operational Manager</SelectItem>
                        <SelectItem value="po_officer">PO Officer</SelectItem>
                        <SelectItem value="labour">Labour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateUser}>Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {canViewAccessControlTab && (
          <TabsContent value="access-control" className="space-y-6 mt-0">
            <SettingsAccessControl embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
