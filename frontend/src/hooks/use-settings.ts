"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { uiLogger } from "@/lib/logger";

export interface SettingsFormData {
  // General settings
  siteName: string;
  adminEmail: string;
  timezone: string;
  maintenanceMode: boolean;

  // Notification settings
  emailNotifications: boolean;
  newUserRegistration: boolean;
  securityAlerts: boolean;
  systemUpdates: boolean;

  // Security settings
  twoFactorAuth: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  ipAllowlist: boolean;

  // Appearance settings
  theme: string;
  accentColor: string;
  compactMode: boolean;
  showAnimations: boolean;
}

export function useSettings(initialData?: Partial<SettingsFormData>) {
  const { theme, setTheme } = useTheme();

  // Load saved settings from localStorage on initialization
  const getInitialFormData = (): SettingsFormData => {
    if (typeof window !== "undefined") {
      try {
        const savedSettings = localStorage.getItem("admin-settings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings) as Partial<SettingsFormData>;
          // Merge saved settings with initial data and defaults
          return {
            // General defaults
            siteName: parsed.siteName || initialData?.siteName || "MCP Registry Gateway",
            adminEmail: parsed.adminEmail || initialData?.adminEmail || "",
            timezone: parsed.timezone || initialData?.timezone || "utc",
            maintenanceMode: parsed.maintenanceMode ?? initialData?.maintenanceMode ?? false,

            // Notification defaults
            emailNotifications: parsed.emailNotifications ?? initialData?.emailNotifications ?? true,
            newUserRegistration: parsed.newUserRegistration ?? initialData?.newUserRegistration ?? true,
            securityAlerts: parsed.securityAlerts ?? initialData?.securityAlerts ?? true,
            systemUpdates: parsed.systemUpdates ?? initialData?.systemUpdates ?? false,

            // Security defaults
            twoFactorAuth: parsed.twoFactorAuth ?? initialData?.twoFactorAuth ?? false,
            sessionTimeout: parsed.sessionTimeout || initialData?.sessionTimeout || 30,
            maxLoginAttempts: parsed.maxLoginAttempts || initialData?.maxLoginAttempts || 5,
            ipAllowlist: parsed.ipAllowlist ?? initialData?.ipAllowlist ?? false,

            // Appearance defaults
            theme: parsed.theme || initialData?.theme || theme || "system",
            accentColor: parsed.accentColor || initialData?.accentColor || "blue",
            compactMode: parsed.compactMode ?? initialData?.compactMode ?? false,
            showAnimations: parsed.showAnimations ?? initialData?.showAnimations ?? true,
          };
        }
      } catch (error) {
        uiLogger.warn("Failed to load saved settings", { error });
      }
    }

    // Fallback to defaults if localStorage is not available or parsing fails
    return {
      // General defaults
      siteName: initialData?.siteName || "MCP Registry Gateway",
      adminEmail: initialData?.adminEmail || "",
      timezone: initialData?.timezone || "utc",
      maintenanceMode: initialData?.maintenanceMode || false,

      // Notification defaults
      emailNotifications: initialData?.emailNotifications ?? true,
      newUserRegistration: initialData?.newUserRegistration ?? true,
      securityAlerts: initialData?.securityAlerts ?? true,
      systemUpdates: initialData?.systemUpdates || false,

      // Security defaults
      twoFactorAuth: initialData?.twoFactorAuth || false,
      sessionTimeout: initialData?.sessionTimeout || 30,
      maxLoginAttempts: initialData?.maxLoginAttempts || 5,
      ipAllowlist: initialData?.ipAllowlist || false,

      // Appearance defaults
      theme: initialData?.theme || theme || "system",
      accentColor: initialData?.accentColor || "blue",
      compactMode: initialData?.compactMode || false,
      showAnimations: initialData?.showAnimations ?? true,
    };
  };

  const [formData, setFormData] = useState<SettingsFormData>(getInitialFormData);

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = useCallback(<K extends keyof SettingsFormData>(field: K, value: SettingsFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaultData: SettingsFormData = {
      siteName: "MCP Registry Gateway",
      adminEmail: initialData?.adminEmail || "",
      timezone: "utc",
      maintenanceMode: false,
      emailNotifications: true,
      newUserRegistration: true,
      securityAlerts: true,
      systemUpdates: false,
      twoFactorAuth: false,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      ipAllowlist: false,
      theme: "system",
      accentColor: "blue",
      compactMode: false,
      showAnimations: true,
    };

    setFormData(defaultData);
    setTheme(defaultData.theme);
    setHasChanges(true);
    toast.success("Settings reset to defaults");
  }, [initialData?.adminEmail, setTheme]);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);

    try {
      // Apply theme immediately
      if (formData.theme !== theme) {
        setTheme(formData.theme);
      }

      // Store settings in localStorage
      localStorage.setItem("admin-settings", JSON.stringify(formData));

      // Here you would typically make an API call to save settings to the server
      // await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setHasChanges(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      uiLogger.error("Failed to save settings", { error });
      toast.error("Failed to save settings. Please try again.");
      throw error; // Re-throw to maintain error handling flow
    } finally {
      setIsSaving(false);
    }
  }, [formData, theme, setTheme]);

  return {
    formData,
    hasChanges,
    isSaving,
    updateField,
    resetToDefaults,
    saveSettings,
  };
}
