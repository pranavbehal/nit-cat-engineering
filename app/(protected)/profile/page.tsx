"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  updateUserProfile,
} from "@/lib/device-utils";
import { toast } from "sonner";
import { Sun, Moon, Monitor } from "lucide-react";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [thresholds, setThresholds] =
    useState<ThresholdSettings>(DEFAULT_THRESHOLDS);
  const [mounted, setMounted] = useState(false);
  const [gateSetting, setGateSetting] = useState<"auto" | "manual">("auto");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        setMounted(true);
        setLoading(true);
        
        // Load user profile
        const profile = await getUserProfile();
        setUserProfile(profile);
        
        // Load thresholds - use the defaults initially to avoid undefined errors
        const loadedThresholds = await getThresholds();
        setThresholds(loadedThresholds);
        
        // Load gate settings
        const settings = await getGateSettings();
        setGateSetting(settings.mode);
      } catch (error) {
        console.error('Error loading profile settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await updateThresholds(thresholds);
      toast.success("Threshold settings saved");
    } catch (error) {
      console.error('Error saving thresholds:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleReset = async () => {
    try {
      setThresholds(DEFAULT_THRESHOLDS);
      await updateThresholds(DEFAULT_THRESHOLDS);
      toast.success("Threshold settings reset to defaults");
    } catch (error) {
      console.error('Error resetting thresholds:', error);
      toast.error('Failed to reset settings');
    }
  };

  if (!mounted || loading) return <div className="container py-6 px-4 sm:px-6">Loading settings...</div>;

  return (
    <div className="container py-6 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="theme">Theme</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="w-24"
                >
                  <Sun className="h-4 w-4 mr-1" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="w-24"
                >
                  <Moon className="h-4 w-4 mr-1" /> Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="w-28"
                >
                  <Monitor className="h-4 w-4 mr-1" /> System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      nitrogen: {
                        ...thresholds.nitrogen,
                        min: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nitrogenMax">Maximum</Label>
                <Input
                  id="nitrogenMax"
                  type="number"
                  value={thresholds.nitrogen.max}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      nitrogen: {
                        ...thresholds.nitrogen,
                        max: parseFloat(e.target.value),
                      },
                    })
                  }
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
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      phosphorus: {
                        ...thresholds.phosphorus,
                        min: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phosphorusMax">Maximum</Label>
                <Input
                  id="phosphorusMax"
                  type="number"
                  value={thresholds.phosphorus.max}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      phosphorus: {
                        ...thresholds.phosphorus,
                        max: parseFloat(e.target.value),
                      },
                    })
                  }
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
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      potassium: {
                        ...thresholds.potassium,
                        min: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="potassiumMax">Maximum</Label>
                <Input
                  id="potassiumMax"
                  type="number"
                  value={thresholds.potassium.max}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      potassium: {
                        ...thresholds.potassium,
                        max: parseFloat(e.target.value),
                      },
                    })
                  }
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
                onCheckedChange={async (checked) => {
                  try {
                    const newMode = checked ? "auto" : "manual";
                    setGateSetting(newMode);
                    await updateGateSettings({ mode: newMode });
                    toast.success(`Gate control set to ${newMode} mode`);
                  } catch (error) {
                    console.error('Error updating gate setting:', error);
                    toast.error('Failed to update gate setting');
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications" className="text-base">
                  Threshold Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications when readings exceed your thresholds
                </p>
              </div>
              <Switch
                id="notifications"
                checked={userProfile?.notifications_enabled || false}
                onCheckedChange={async (checked) => {
                  try {
                    if (userProfile) {
                      const updatedProfile = {
                        ...userProfile,
                        notifications_enabled: checked
                      };
                      setUserProfile(updatedProfile);
                      
                      // Update in database
                      await updateUserProfile({
                        notifications_enabled: checked
                      });
                      
                      toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
                    }
                  } catch (error) {
                    console.error('Error updating notification settings:', error);
                    toast.error('Failed to update notification settings');
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div>
                <Label htmlFor="measurement-unit" className="text-base">
                  Measurement Unit
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose how to display nutrient levels
                </p>
              </div>
              <Select
                value={userProfile?.measurement_unit || 'percent'}
                onValueChange={async (value: "percent" | "ppm") => {
                  try {
                    if (userProfile) {
                      const updatedProfile = {
                        ...userProfile,
                        measurement_unit: value
                      };
                      setUserProfile(updatedProfile);
                      
                      // Update in database
                      await updateUserProfile({
                        measurement_unit: value
                      });
                      
                      toast.success(`Measurement unit updated to ${value}`);
                    }
                  } catch (error) {
                    console.error('Error updating measurement unit:', error);
                    toast.error('Failed to update measurement unit');
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="ppm">PPM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
