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
import {
  getThresholds,
  updateThresholds,
  DEFAULT_THRESHOLDS,
  ThresholdSettings,
} from "@/lib/device-utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [thresholds, setThresholds] =
    useState<ThresholdSettings>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    setThresholds(getThresholds());
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Nitrogen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nitrogen-min">Minimum (%)</Label>
                  <Input
                    id="nitrogen-min"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.nitrogen.min}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        nitrogen: {
                          ...thresholds.nitrogen,
                          min: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nitrogen-max">Maximum (%)</Label>
                  <Input
                    id="nitrogen-max"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.nitrogen.max}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        nitrogen: {
                          ...thresholds.nitrogen,
                          max: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Phosphorus</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phosphorus-min">Minimum (%)</Label>
                  <Input
                    id="phosphorus-min"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.phosphorus.min}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        phosphorus: {
                          ...thresholds.phosphorus,
                          min: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phosphorus-max">Maximum (%)</Label>
                  <Input
                    id="phosphorus-max"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.phosphorus.max}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        phosphorus: {
                          ...thresholds.phosphorus,
                          max: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Potassium</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="potassium-min">Minimum (%)</Label>
                  <Input
                    id="potassium-min"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.potassium.min}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        potassium: {
                          ...thresholds.potassium,
                          min: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="potassium-max">Maximum (%)</Label>
                  <Input
                    id="potassium-max"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.potassium.max}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        potassium: {
                          ...thresholds.potassium,
                          max: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="destructive" onClick={handleReset}>
                Reset to Defaults
              </Button>
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
