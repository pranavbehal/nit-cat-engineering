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
  updateThresholds,
  getUserProfile,
  UserProfile,
  DEFAULT_THRESHOLDS,
} from "@/lib/device-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

// Storage keys for local persistence
const DEVICES_STORAGE_KEY = "nitcat-devices";

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
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user ID
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) {
          console.error('No authenticated user found');
          return;
        }
        
        // Check localStorage first for devices with gate states
        const storedDevices = localStorage.getItem(DEVICES_STORAGE_KEY);
        let initialDevices: Device[] = [];
        
        if (storedDevices) {
          try {
            const allDevices = JSON.parse(storedDevices) as Device[];
            // Filter to only show current user's devices
            const userDevices = allDevices.filter((device: Device) => device.user_id === userId);
            
            if (userDevices.length > 0) {
              setDevices(userDevices);
              initialDevices = userDevices;
            }
          } catch (e) {
            console.error('Error parsing stored devices:', e);
          }
        }
        
        if (initialDevices.length === 0) {
          const devices = await getDevices(); // getDevices already filters by user_id
          setDevices(devices);
        }
        
        const settings = await getGateSettings();
        setGateMode(settings.mode);
        
        const profile = await getUserProfile();
        setUserProfile(profile);
        
        if (initialDevices.length > 0 || devices.length > 0) {
          const deviceId = initialDevices.length > 0 ? initialDevices[0].id : devices[0].id;
          const deviceThresholds = await getThresholds(deviceId);
          setThresholds(deviceThresholds);
        } else {
          const defaultThresholds = await getThresholds();
          setThresholds(defaultThresholds);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    }

    fetchData();
  }, [supabase.auth]); // Add supabase.auth as a dependency

  useEffect(() => {
    // Skip if no devices or gate mode changes
    if (devices.length === 0) return;

    // Create interval for simulation
    const interval = setInterval(async () => {
      try {
        setDevices((currentDevices) => {
          // Use the current thresholds state
          const updatedDevicesPromises = currentDevices.map(async (device) => {
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
              try {
                const autoUpdatedDevice = await updateDeviceGateAuto(updatedDevice);

                if (autoUpdatedDevice.nitrogenGate !== device.nitrogenGate) {
                  const action = autoUpdatedDevice.nitrogenGate === "open" ? "opened" : "closed";
                  toast.info(`${device.name} gate automatically ${action}`);
                }

                return autoUpdatedDevice;
              } catch (error) {
                console.error('Error in auto-update:', error);
                return updatedDevice;
              }
            }

            return updatedDevice;
          });

          Promise.all(updatedDevicesPromises)
            .then(updatedDevices => {
              updateDevices(updatedDevices);
            })
            .catch(error => console.error('Error updating devices:', error));

          return currentDevices.map(device => {
            const gateEffect = device.nitrogenGate === "open" ? 0.8 : -0.8;

            return {
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
          });
        });
      } catch (error) {
        console.error('Error in update interval:', error);
      }
    }, 1000); // Update every 1 second

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [devices, gateMode]);

  const toggleGateMode = async () => {
    try {
      const newMode = gateMode === "auto" ? "manual" : "auto";
      setGateMode(newMode);
      await updateGateSettings({ mode: newMode });
      toast.success(`Gate control mode switched to ${newMode}`);
    } catch (error) {
      console.error('Error toggling gate mode:', error);
      toast.error('Failed to toggle gate mode. Please try again.');
    }
  };

  const toggleGate = (
    deviceId: string,
    currentState: "open" | "closed" | undefined
  ) => {
    if (gateMode !== "manual") {
      toast.error("Cannot manually control gates in auto mode");
      return;
    }

    // Properly type the new state
    const newState = currentState === "open" ? "closed" as const : "open" as const;

    // Update local state only
    const updatedDevices = devices.map((device) => {
      if (device.id === deviceId) {
        toast.success(`${device.name} gate manually ${newState}`);
        return { ...device, nitrogenGate: newState };
      }
      return device;
    });

    // Update state and local storage (no database)
    setDevices(updatedDevices);
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(updatedDevices));
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

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (window.confirm(`Are you sure you want to delete ${deviceName}?`)) {
      try {
        // Delete from Supabase first
        const { error } = await supabase
          .from("devices")
          .delete()
          .eq("id", deviceId);

        if (error) throw error;
        
        // Then update local state
        const updatedDevices = devices.filter((device) => device.id !== deviceId);
        setDevices(updatedDevices);
        updateDevices(updatedDevices);
        
        toast.success(`Device "${deviceName}" has been deleted`);
      } catch (error) {
        console.error('Error deleting device:', error);
        toast.error(`Failed to delete ${deviceName}. Please try again.`);
      }
    }
  };

  // Using the same function for all group change operations
  const handleGroupChange = async (deviceId: string, group: string) => {
    try {
      // Update the device group in Supabase
      const { error } = await supabase
        .from("devices")
        .update({ group_name: group })
        .eq("id", deviceId);
      
      if (error) throw error;
      
      // Update local state
      const updatedDevices = devices.map((device) => {
        if (device.id === deviceId) {
          return { ...device, group };
        }
        return device;
      });
      
      setDevices(updatedDevices);
      updateDevices(updatedDevices);
      
      toast.success(`Device moved to ${group}`);
    } catch (error) {
      console.error('Error updating device group:', error);
      toast.error(`Failed to move device to ${group}. Please try again.`);
    }
  };

  // Alias functions for backward compatibility
  const handleRemoveDevice = handleDeleteDevice;
  const updateDeviceGroup = handleGroupChange;

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
    <div className="container py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">My Devices</h1>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <Select
              value={gateMode}
              onValueChange={async (value: "auto" | "manual") => {
                try {
                  setGateMode(value);
                  await updateGateSettings({ mode: value });
                  toast.success(`Gate control set to ${value} mode`);
                } catch (error) {
                  console.error('Error updating gate mode:', error);
                  toast.error('Failed to update gate control mode');
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Gate Control</SelectItem>
                <SelectItem value="manual">Manual Gate Control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>Add Device</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
