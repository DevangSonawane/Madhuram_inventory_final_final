import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Palette, 
  Mail, 
  Smartphone,
  Save
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/PageTransition';

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    // Map input IDs to state keys
    const key = id === 'current-password' ? 'current' : 
                id === 'new-password' ? 'new' : 'confirm';
    
    setPasswordData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdatePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      toast({
        title: "Success",
        description: "Password updated successfully.",
      });
    }, 1500);
  };

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: 'Administration'
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.id]: e.target.value });
  };

  const handleAvatarClick = () => {
    document.getElementById('avatar-upload').click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      toast({
        title: "Image Selected",
        description: "Avatar upload simulated.",
      });
      // Here you would upload the file
    }
  };

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    }, 1000);
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your account details and profile information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    <img 
                      src={user?.avatar || "https://github.com/shadcn.png"} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <Button variant="outline" size="sm" onClick={handleAvatarClick}>Change Avatar</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={profileData.name} 
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={profileData.email} 
                      disabled 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue={user?.role || "User"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input 
                      id="department" 
                      value={profileData.department} 
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what you want to be notified about.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1">
                    <Label className="text-base">Email Notifications</Label>
                    <span className="text-sm text-muted-foreground">Receive daily digests and alerts via email.</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1">
                    <Label className="text-base">Low Stock Alerts</Label>
                    <span className="text-sm text-muted-foreground">Get notified when items fall below reorder points.</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1">
                    <Label className="text-base">Approval Requests</Label>
                    <span className="text-sm text-muted-foreground">Notifications for new purchase/material requests.</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="appearance">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the application looks and feels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Density</Label>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue placeholder="Select density" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="security">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and security preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    value={passwordData.current}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={passwordData.new}
                    onChange={handlePasswordChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={passwordData.confirm}
                    onChange={handlePasswordChange}
                  />
                </div>
                <Button onClick={handleUpdatePassword} disabled={loading}>
                  Update Password
                </Button>
                <Separator className="my-4" />
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <span className="text-sm text-muted-foreground">Add an extra layer of security to your account.</span>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
