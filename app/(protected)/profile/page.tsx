"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getThresholds,
  updateThresholds,
  DEFAULT_THRESHOLDS,
  ThresholdSettings,
  getGateSettings,
  updateGateSettings,
  getUserProfile,
  UserProfile,
} from "@/lib/device-utils";
import { toast } from "sonner";

// Storage keys for local persistence
const THRESHOLDS_STORAGE_KEY = 'nitcat-thresholds';
const GATE_SETTINGS_KEY = 'nitcat-gate-settings';

export default function ProfilePage() {
  const { setTheme } = useTheme();
  // Prioritize localStorage for threshold settings, with defaults as fallback
  const [thresholds, setThresholds] = useState<ThresholdSettings>(() => {
    // Try to get thresholds from localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing stored thresholds:', e);
        }
      }
    }
    return DEFAULT_THRESHOLDS;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [customThresholds, setCustomThresholds] = useState<ThresholdSettings | null>(null);
  const [gateSetting, setGateSetting] = useState<"auto" | "manual">("auto");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Force light theme and set up initial state
  useEffect(() => {
    setTheme("light");
    setMounted(true);
  }, [setTheme]);

  useEffect(() => {
    // Load thresholds with priority on localStorage
    async function loadThresholds() {
      const savedThresholds = await getThresholds();
      setThresholds(savedThresholds);
    }
    
    loadThresholds();
  }, []);

  // Load user profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Load gate settings
  const [gateSettings, setGateSettings] = useState({ mode: gateSetting });
  
  // Load user profile and gate settings
  useEffect(() => {
    async function loadUserData() {
      try {
        // Get user profile
        const userProfile = await getUserProfile();
        setProfile(userProfile);
        
        // Get gate settings with priority on localStorage
        const settings = await getGateSettings();
        setGateSetting(settings.mode);
        setGateSettings(settings);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setProfileLoading(false);
      }
    }
    
    loadUserData();
  }, []);
  

  // Handle threshold changes
  const handleThresholdChange = (field: string, subField: 'min' | 'max', value: number) => {
    const updatedThresholds = {
      ...thresholds,
      [field]: {
        ...thresholds[field as keyof ThresholdSettings],
        [subField]: value
      }
    };
    
    // Update state
    setThresholds(updatedThresholds);
    
    // Save to localStorage immediately for local persistence
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(updatedThresholds));
    
    // Also try to update in database as backup
    updateThresholds(updatedThresholds).catch(err => {
      console.error("Failed to update thresholds in database:", err);
    });
  };

  // Handle gate mode changes
  const handleGateSettingChange = (newMode: "auto" | "manual") => {
    setGateSetting(newMode);
    
    // Update state
    const newSettings = { mode: newMode };
    setGateSettings(newSettings);
    
    // Save to localStorage immediately
    localStorage.setItem("nitcat-gate-settings", JSON.stringify(newSettings));
    
    // Also update in database
    updateGateSettings(newSettings).catch(err => {
      console.error("Failed to update gate settings in database:", err);
    });
    
    toast.success(`Gate control set to ${newMode} mode and applied across the app`);
  };

  if (!mounted || loading) {
    return <div className="container py-6 px-4 sm:px-6">Loading settings...</div>;
  }

  return (
    <div className="container py-6 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nitrogen Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nitrogenMin">Minimum</Label>
                <Input
                  id="nitrogenMin"
                  type="number"
                  value={thresholds.nitrogen.min}
                  onChange={(e) => handleThresholdChange(
                    'nitrogen', 'min', parseFloat(e.target.value)
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nitrogenMax">Maximum</Label>
                <Input
                  id="nitrogenMax"
                  type="number"
                  value={thresholds.nitrogen.max}
                  onChange={(e) => handleThresholdChange(
                    'nitrogen', 'max', parseFloat(e.target.value)
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phosphorus Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phosphorusMin">Minimum</Label>
                <Input
                  id="phosphorusMin"
                  type="number"
                  value={thresholds.phosphorus.min}
                  onChange={(e) => handleThresholdChange(
                    'phosphorus', 'min', parseFloat(e.target.value)
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phosphorusMax">Maximum</Label>
                <Input
                  id="phosphorusMax"
                  type="number"
                  value={thresholds.phosphorus.max}
                  onChange={(e) => handleThresholdChange(
                    'phosphorus', 'max', parseFloat(e.target.value)
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Potassium Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="potassiumMin">Minimum</Label>
                <Input
                  id="potassiumMin"
                  type="number"
                  value={thresholds.potassium.min}
                  onChange={(e) => handleThresholdChange(
                    'potassium', 'min', parseFloat(e.target.value)
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="potassiumMax">Maximum</Label>
                <Input
                  id="potassiumMax"
                  type="number"
                  value={thresholds.potassium.max}
                  onChange={(e) => handleThresholdChange(
                    'potassium', 'max', parseFloat(e.target.value)
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gate Control Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-gate" className="text-base">
                  Automatic Gate Control
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gates will automatically open and close based on nitrogen
                  levels
                </p>
              </div>
              <Switch
                id="auto-gate"
                checked={gateSetting === "auto"}
                onCheckedChange={(checked) => {
                  const newMode = checked ? "auto" : "manual";
                  handleGateSettingChange(newMode);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              // Reset to default thresholds
              setThresholds(DEFAULT_THRESHOLDS);
              localStorage.setItem("nitcat-thresholds", JSON.stringify(DEFAULT_THRESHOLDS));
              
              // Also update in database
              updateThresholds(DEFAULT_THRESHOLDS).catch(err => {
                console.error("Failed to reset thresholds in database:", err);
              });
              
              toast.success("Settings reset to defaults");
            }}
          >
            Reset Thresholds
          </Button>
        </div>
      </div>
    </div>
  );
}
