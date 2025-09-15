"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { SaveButton } from "@/components/ui/save-button";
import { UnsavedChangesIndicator } from "@/components/ui/unsaved-changes-indicator";
import { Bell, Lock, Palette, User } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  // Initialize settings with admin email from session
  const { formData, hasChanges, isSaving, updateField, resetToDefaults, saveSettings } = useSettings({
    adminEmail: session?.user?.email || "",
  });

  // Check authentication and role
  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        logger.warn("Settings page: No session, redirecting to login");
        router.push("/auth/login");
        return;
      }

      const userRole = (session.user as { role?: string })?.role;
      if (userRole !== "admin") {
        logger.warn("Settings page: User does not have admin role", {
          userId: session.user.id,
          actualRole: userRole,
          requiredRole: "admin",
        });
        router.push("/dashboard"); // Redirect to dashboard instead of 404
        return;
      }

      logger.info("Settings page: Access granted", {
        userId: session.user.id,
        role: userRole,
      });
    }
  }, [session, isPending, router]);

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render the page if not authenticated
  if (!session?.user) {
    return null;
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your admin panel settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general admin panel settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site Name</Label>
                <Input
                  id="site-name"
                  placeholder="MCP Registry Gateway"
                  value={formData.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.adminEmail}
                  onChange={(e) => updateField("adminEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formData.timezone} onValueChange={(value) => updateField("timezone", value)}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                    <SelectItem value="cst">Central Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Show maintenance page to non-admin users</p>
                </div>
                <Switch checked={formData.maintenanceMode} onCheckedChange={(checked) => updateField("maintenanceMode", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for important events</p>
                </div>
                <Switch checked={formData.emailNotifications} onCheckedChange={(checked) => updateField("emailNotifications", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New User Registration</Label>
                  <p className="text-sm text-muted-foreground">Get notified when new users register</p>
                </div>
                <Switch checked={formData.newUserRegistration} onCheckedChange={(checked) => updateField("newUserRegistration", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for security-related events</p>
                </div>
                <Switch checked={formData.securityAlerts} onCheckedChange={(checked) => updateField("securityAlerts", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified about system updates and maintenance</p>
                </div>
                <Switch checked={formData.systemUpdates} onCheckedChange={(checked) => updateField("systemUpdates", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all admin users</p>
                </div>
                <Switch checked={formData.twoFactorAuth} onCheckedChange={(checked) => updateField("twoFactorAuth", checked)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  placeholder="30"
                  value={formData.sessionTimeout}
                  onChange={(e) => updateField("sessionTimeout", parseInt(e.target.value) || 30)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                <Input
                  id="max-login-attempts"
                  type="number"
                  placeholder="5"
                  value={formData.maxLoginAttempts}
                  onChange={(e) => updateField("maxLoginAttempts", parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>IP Allowlist</Label>
                  <p className="text-sm text-muted-foreground">Restrict admin access to specific IP addresses</p>
                </div>
                <Switch checked={formData.ipAllowlist} onCheckedChange={(checked) => updateField("ipAllowlist", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of the admin panel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Theme</Label>
                <ThemeSelector value={formData.theme} onValueChange={(value) => updateField("theme", value)} disabled={isSaving} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent Color</Label>
                <Select value={formData.accentColor} onValueChange={(value) => updateField("accentColor", value)}>
                  <SelectTrigger id="accent-color">
                    <SelectValue placeholder="Select accent color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        Blue
                      </div>
                    </SelectItem>
                    <SelectItem value="green">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        Green
                      </div>
                    </SelectItem>
                    <SelectItem value="purple">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        Purple
                      </div>
                    </SelectItem>
                    <SelectItem value="red">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Red
                      </div>
                    </SelectItem>
                    <SelectItem value="orange">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        Orange
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use a more compact layout for tables and lists</p>
                </div>
                <Switch checked={formData.compactMode} onCheckedChange={(checked) => updateField("compactMode", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable UI animations and transitions</p>
                </div>
                <Switch checked={formData.showAnimations} onCheckedChange={(checked) => updateField("showAnimations", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unsaved changes indicator */}
      <UnsavedChangesIndicator
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={saveSettings}
        onReset={resetToDefaults}
        variant="inline"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
          Reset to Defaults
        </Button>
        <SaveButton
          hasChanges={hasChanges}
          onSave={saveSettings}
          disabled={isSaving}
          idleText="Save Changes"
          savingText="Saving..."
          successMessage="Settings saved!"
          errorMessage="Failed to save"
        />
      </div>
    </div>
  );
}
