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
} from "@/lib/device-utils";
import { toast } from "sonner";
import { Sun, Moon, Monitor } from "lucide-react";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [thresholds, setThresholds] =
    useState<ThresholdSettings>(DEFAULT_THRESHOLDS);
  const [mounted, setMounted] = useState(false);
  const [gateSetting, setGateSetting] = useState<"auto" | "manual">("auto");

  useEffect(() => {
    setMounted(true);
    setThresholds(getThresholds());
    setGateSetting(getGateSettings().mode);
  }, []);

  const handleSave = () => {
    updateThresholds(thresholds);
    toast.success("Threshold settings saved");
  };

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    updateThresholds(DEFAULT_THRESHOLDS);
    toast.success("Threshold settings reset to defaults");
  };

  if (!mounted) return null;

  return (
    <div className="container py-10 p-6">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

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
                onCheckedChange={(checked) => {
                  const newMode = checked ? "auto" : "manual";
                  setGateSetting(newMode);
                  updateGateSettings({ mode: newMode });
                  toast.success(`Gate control set to ${newMode} mode`);
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
