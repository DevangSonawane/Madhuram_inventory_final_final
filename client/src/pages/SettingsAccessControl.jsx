import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Save, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { ACCESS_CONTROL_CATALOG } from '@/constants/accessControlCatalog';
import { buildDefaultAccessControl } from '@/lib/accessControl';
import { getUserAccessControlOverride, saveUserAccessControlOverride } from '@/lib/accessControlStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const clone = (value) => JSON.parse(JSON.stringify(value));

const resolveUserAccessControl = (user) => {
  const fallback = buildDefaultAccessControl();
  const override = getUserAccessControlOverride(user?.user_id);

  if (!override) return fallback;

  return {
    pages: {
      ...fallback.pages,
      ...(override.pages || {}),
    },
    functions: {
      ...fallback.functions,
      ...(override.functions || {}),
    },
  };
};

export default function SettingsAccessControl({ embedded = false }) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [draftAccessControl, setDraftAccessControl] = useState(buildDefaultAccessControl());

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoadingUsers(false);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      const result = await api.getUsers();
      if (!result.success || !Array.isArray(result.data)) {
        toast({
          variant: 'destructive',
          title: 'Failed to load users',
          description: result.error || 'Could not fetch user list.',
        });
        setUsers([]);
        setLoadingUsers(false);
        return;
      }

      const sortedUsers = [...result.data].sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sortedUsers);

      const firstNonAdmin = sortedUsers.find((item) => item.role !== 'admin');
      const initialTarget = firstNonAdmin || sortedUsers[0];
      if (initialTarget) {
        setSelectedUserId(initialTarget.user_id);
      }

      setLoadingUsers(false);
    };

    fetchUsers();
  }, [isAdmin, toast]);

  const selectedUser = useMemo(
    () => users.find((item) => item.user_id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setDraftAccessControl(resolveUserAccessControl(selectedUser));
  }, [selectedUser]);

  const updatePageAccess = (pagePath, enabled) => {
    setDraftAccessControl((prev) => {
      const next = clone(prev);
      next.pages[pagePath] = enabled;

      const page = ACCESS_CONTROL_CATALOG.find((item) => item.pagePath === pagePath);
      if (page && !enabled) {
        page.functions.forEach((fn) => {
          next.functions[fn.key] = false;
        });
      }

      return next;
    });
  };

  const updateFunctionAccess = (functionKey, enabled, pagePath) => {
    setDraftAccessControl((prev) => {
      const next = clone(prev);
      next.functions[functionKey] = enabled;
      if (enabled) next.pages[pagePath] = true;
      return next;
    });
  };

  const setAllAccess = (enabled) => {
    setDraftAccessControl((prev) => {
      const next = clone(prev);

      ACCESS_CONTROL_CATALOG.forEach((page) => {
        next.pages[page.pagePath] = enabled;
        page.functions.forEach((fn) => {
          next.functions[fn.key] = enabled;
        });
      });

      return next;
    });
  };

  const handleSave = () => {
    if (!selectedUser) return;
    if (selectedUser.role === 'admin') {
      toast({
        variant: 'destructive',
        title: 'Admins always have full access',
        description: 'Select a non-admin user to configure restrictions.',
      });
      return;
    }

    saveUserAccessControlOverride(selectedUser.user_id, draftAccessControl);
    toast({
      title: 'Access settings saved',
      description: `Permissions updated for ${selectedUser.name}.`,
    });
  };

  const enabledPages = Object.values(draftAccessControl.pages || {}).filter(Boolean).length;
  const totalPages = ACCESS_CONTROL_CATALOG.length;
  const enabledFunctions = Object.values(draftAccessControl.functions || {}).filter(Boolean).length;
  const totalFunctions = ACCESS_CONTROL_CATALOG.reduce((sum, page) => sum + page.functions.length, 0);

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          You do not have permission to access this section. Only administrators can configure page and function access.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Control Settings</h1>
          <p className="text-muted-foreground mt-1">Set user-level page and function visibility.</p>
        </div>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Matrix
              </CardTitle>
              <CardDescription>Choose a user from dropdown, then update page and function permissions.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setAllAccess(true)} disabled={!selectedUser || selectedUser.role === 'admin'}>
                Allow all
              </Button>
              <Button variant="outline" onClick={() => setAllAccess(false)} disabled={!selectedUser || selectedUser.role === 'admin'}>
                Deny all
              </Button>
              <Button onClick={handleSave} disabled={!selectedUser || selectedUser.role === 'admin'}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Select User</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loadingUsers || users.length === 0}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((item) => (
                    <SelectItem key={item.user_id} value={item.user_id}>
                      {item.name} ({item.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUser && (
                <div className="rounded-md border bg-background p-3 text-sm">
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">{selectedUser.email}</p>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'} className="mt-2">
                    {selectedUser.role}
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Pages Enabled</p>
                <p className="text-2xl font-semibold mt-1">{enabledPages} / {totalPages}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Functions Enabled</p>
                <p className="text-2xl font-semibold mt-1">{enabledFunctions} / {totalFunctions}</p>
              </div>
            </div>
          </div>

          {!selectedUser ? (
            <Alert>
              <AlertDescription>Select a user from the dropdown to configure access.</AlertDescription>
            </Alert>
          ) : selectedUser.role === 'admin' ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Admin users always have full access.</AlertDescription>
            </Alert>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {ACCESS_CONTROL_CATALOG.map((page) => {
                const pageEnabled = Boolean(draftAccessControl.pages?.[page.pagePath]);

                return (
                  <AccordionItem value={page.pagePath} key={page.pagePath} className="rounded-xl border px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <p className="font-medium">{page.pageTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">{page.category} • {page.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-4">
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                        <div>
                          <Label className="font-medium">Page Access</Label>
                          <p className="text-xs text-muted-foreground">Allow this page in sidebar and direct URL.</p>
                        </div>
                        <Switch checked={pageEnabled} onCheckedChange={(value) => updatePageAccess(page.pagePath, value)} />
                      </div>

                      {page.functions.map((fn) => {
                        const fnEnabled = Boolean(draftAccessControl.functions?.[fn.key]);

                        return (
                          <div key={fn.key} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="pr-4">
                              <p className="text-sm font-medium">{fn.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{fn.description}</p>
                            </div>
                            <Switch
                              checked={fnEnabled}
                              onCheckedChange={(value) => updateFunctionAccess(fn.key, value, page.pagePath)}
                            />
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
