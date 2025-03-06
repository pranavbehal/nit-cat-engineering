"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Trash2 } from "lucide-react";
import {
  getDevices,
  updateDevices,
  initializeDeviceWithReadings,
  Device,
  DEFAULT_GROUPS,
  getThresholds,
  getGateSettings,
  updateGateSettings,
  updateDeviceGateAuto,
} from "@/lib/device-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface DBDevice {
  id: string;
  name: string;
  created_at: string;
  last_connected_at: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isPairing, setPairing] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"auto" | "manual">("auto");
  const supabase = createClientComponentClient();
  const thresholds = getThresholds();

  useEffect(() => {
    async function fetchData() {
      const devices = await getDevices();
      setDevices(devices);
      const settings = getGateSettings();
      setGateMode(settings.mode);
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (devices.length === 0) return;

    const interval = setInterval(() => {
      setDevices((currentDevices) => {
        const updatedDevices = currentDevices.map((device) => {
          const thresholds = getThresholds();

          const gateEffect = device.nitrogenGate === "open" ? 0.8 : -0.8;

          const updatedDevice = {
            ...device,
            readings: {
              nitrogen: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.nitrogen +
                    gateEffect +
                    (Math.random() - 0.5) * 1
                )
              ),
              phosphorus: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.phosphorus +
                    gateEffect * 0.7 +
                    (Math.random() - 0.5) * 1
                )
              ),
              potassium: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.potassium +
                    gateEffect * 0.5 +
                    (Math.random() - 0.5) * 1
                )
              ),
            },
          };

          if (gateMode === "auto") {
            const autoUpdatedDevice = updateDeviceGateAuto(updatedDevice);

            if (autoUpdatedDevice.nitrogenGate !== device.nitrogenGate) {
              toast.info(
                `${device.name} gate automatically ${
                  autoUpdatedDevice.nitrogenGate === "open"
                    ? "opened"
                    : "closed"
                }`
              );
            }

            return autoUpdatedDevice;
          }

          return updatedDevice;
        });

        updateDevices(updatedDevices);
        return updatedDevices;
      });
    }, 1000); // Update every 1 second

    return () => clearInterval(interval);
  }, [devices, gateMode]);

  const toggleGateMode = () => {
    const newMode = gateMode === "auto" ? "manual" : "auto";
    setGateMode(newMode);
    updateGateSettings({ mode: newMode });
    toast.success(`Gate control mode switched to ${newMode}`);
  };

  const toggleGate = (
    deviceId: string,
    currentState: "open" | "closed" | undefined
  ) => {
    if (gateMode !== "manual") {
      toast.error("Cannot manually control gates in auto mode");
      return;
    }

    const newState = currentState === "open" ? "closed" : "open";

    setDevices(
      devices.map((device) => {
        if (device.id === deviceId) {
          toast.success(`${device.name} gate manually ${newState}`);
          return { ...device, nitrogenGate: newState };
        }
        return device;
      })
    );
  };

  const handlePairDevice = async () => {
    setPairing(true);
    const toastId = toast.loading("Pairing device...");

    try {
      // Simulate pairing delay
      const delay = Math.floor(Math.random() * 2000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const { data: newDevice, error } = await supabase
        .from("devices")
        .insert([
          {
            name: newDeviceName,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add device to local state and storage
      const deviceWithReadings = initializeDeviceWithReadings(newDevice);
      const updatedDevices = [deviceWithReadings, ...devices];

      setDevices(updatedDevices);
      updateDevices(updatedDevices);

      toast.success("Device paired successfully!", { id: toastId });
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to pair device", { id: toastId });
    } finally {
      setPairing(false);
      setNewDeviceName("");
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this device?"
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", deviceId);

      if (error) throw error;

      setDevices((prev) => prev.filter((device) => device.id !== deviceId));
      toast.success("Device removed successfully");
    } catch (error) {
      toast.error("Failed to remove device");
    }
  };

  const updateDeviceGroup = (deviceId: string, group: string) => {
    setDevices((currentDevices) => {
      const updatedDevices = currentDevices.map((device) =>
        device.id === deviceId ? { ...device, group } : device
      );
      updateDevices(updatedDevices);
      return updatedDevices;
    });
    toast.success(`Device moved to ${group}`);
  };

  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (window.confirm(`Are you sure you want to delete ${deviceName}?`)) {
      setDevices(devices.filter((device) => device.id !== deviceId));
      updateDevices(devices.filter((device) => device.id !== deviceId));
      toast.success(`Device "${deviceName}" has been deleted`);
    }
  };

  const handleGroupChange = (deviceId: string, group: string) => {
    setDevices(
      devices.map((device) => {
        if (device.id === deviceId) {
          return { ...device, group };
        }
        return device;
      })
    );
    updateDevices(
      devices.map((device) => {
        if (device.id === deviceId) {
          return { ...device, group };
        }
        return device;
      })
    );
    toast.success(`Device moved to ${group}`);
  };

  const ThresholdProgressBar = ({
    value,
    min,
    max,
    color,
  }: {
    value: number;
    min: number;
    max: number;
    color: string;
  }) => {
    return (
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${color}`}
          style={{
            width: `${Math.min(100, (value / 100) * 100)}%`,
          }}
        ></div>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
          style={{
            left: `${min}%`,
            zIndex: 2,
          }}
        />

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{
            left: `${max}%`,
            zIndex: 2,
          }}
        />
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Devices</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="gate-mode">Auto Gate Control</Label>
            <Switch
              id="gate-mode"
              checked={gateMode === "auto"}
              onCheckedChange={toggleGateMode}
            />
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>Add Device</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{device.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select
                    defaultValue={device.group || "Uncategorized"}
                    onValueChange={(value) =>
                      handleGroupChange(device.id, value)
                    }
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue placeholder="Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_GROUPS.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                      <SelectItem value="Uncategorized">
                        Uncategorized
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDevice(device.id, device.name)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Nitrogen</div>
                    <div className="text-sm">
                      {device.readings.nitrogen.toFixed(1)}%
                    </div>
                  </div>
                  <ThresholdProgressBar
                    value={device.readings.nitrogen}
                    min={thresholds.nitrogen.min}
                    max={thresholds.nitrogen.max}
                    color="bg-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Phosphorus</div>
                    <div className="text-sm">
                      {device.readings.phosphorus.toFixed(1)}%
                    </div>
                  </div>
                  <ThresholdProgressBar
                    value={device.readings.phosphorus}
                    min={thresholds.phosphorus.min}
                    max={thresholds.phosphorus.max}
                    color="bg-green-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Potassium</div>
                    <div className="text-sm">
                      {device.readings.potassium.toFixed(1)}%
                    </div>
                  </div>
                  <ThresholdProgressBar
                    value={device.readings.potassium}
                    min={thresholds.potassium.min}
                    max={thresholds.potassium.max}
                    color="bg-purple-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <div className="text-sm font-medium">Nutrient Gate</div>
                  <Button
                    size="sm"
                    variant={
                      device.nitrogenGate === "open" ? "default" : "outline"
                    }
                    onClick={() => toggleGate(device.id, device.nitrogenGate)}
                    disabled={gateMode === "auto"}
                  >
                    {device.nitrogenGate === "open" ? "Open" : "Closed"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {devices.length === 0 && (
          <div className="col-span-full text-center py-10">
            <p className="text-muted-foreground mb-4">
              No devices found. Add your first device to get started.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>Add Device</Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="Enter device name"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handlePairDevice}
              disabled={isPairing || !newDeviceName.trim()}
            >
              {isPairing ? "Pairing..." : "Pair Device"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
