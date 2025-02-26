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
} from "@/lib/device-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const supabase = createClientComponentClient();

  // Fetch devices from database
  useEffect(() => {
    async function fetchDevices() {
      const devices = await getDevices();
      setDevices(devices);
    }

    fetchDevices();
  }, []);

  // Simulate real-time readings for existing devices
  useEffect(() => {
    if (devices.length === 0) return;

    const interval = setInterval(() => {
      setDevices((currentDevices) => {
        const updatedDevices = currentDevices.map((device, index) => {
          const thresholds = getThresholds();

          const tendency = index === 0 ? 0.95 : 0.85;

          const targetNitrogen = thresholds.nitrogen.max * tendency;
          const targetPhosphorus = thresholds.phosphorus.max * tendency;
          const targetPotassium = thresholds.potassium.max * tendency;

          return {
            ...device,
            readings: {
              nitrogen: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.nitrogen +
                    (targetNitrogen - device.readings.nitrogen) * 0.1 +
                    (Math.random() - 0.5) * 2
                )
              ),
              phosphorus: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.phosphorus +
                    (targetPhosphorus - device.readings.phosphorus) * 0.1 +
                    (Math.random() - 0.5) * 2
                )
              ),
              potassium: Math.max(
                0,
                Math.min(
                  100,
                  device.readings.potassium +
                    (targetPotassium - device.readings.potassium) * 0.1 +
                    (Math.random() - 0.5) * 2
                )
              ),
            },
          };
        });
        updateDevices(updatedDevices);
        return updatedDevices;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [devices]);

  const handlePairDevice = async () => {
    setPairing(true);
    const toastId = toast.loading("Pairing device...");

    try {
      // Simulate pairing delay
      const delay = Math.floor(Math.random() * 2000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Add device to database
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

  const toggleNitrogenGate = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              nitrogenGate: device.nitrogenGate === "open" ? "closed" : "open",
            }
          : device
      )
    );
  };

  const updateNitrogenTimer = (deviceId: string, hours: number) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              nitrogenTimer: hours,
            }
          : device
      )
    );
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Devices</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Pair New Device</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pair New Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Device Name</Label>
                <Input
                  id="name"
                  placeholder="Enter device name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
              </div>
              <Button
                onClick={handlePairDevice}
                disabled={isPairing || !newDeviceName}
                className="w-full"
              >
                {isPairing ? "Pairing..." : "Pair Device"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No devices paired yet</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Pair your first device
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {devices.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  {device.name}
                  <span
                    className={`px-2 py-1 text-sm rounded-full ${
                      device.status === "online"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {device.status}
                  </span>
                </CardTitle>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    Group: {device.group || "Uncategorized"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Group
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Select Group</DropdownMenuLabel>
                      {DEFAULT_GROUPS.map((group) => (
                        <DropdownMenuItem
                          key={group}
                          onClick={() => updateDeviceGroup(device.id, group)}
                        >
                          {group}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() =>
                          updateDeviceGroup(device.id, "Uncategorized")
                        }
                      >
                        Uncategorized
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Nitrogen:</span>
                    <span>{device.readings.nitrogen.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phosphorus:</span>
                    <span>{device.readings.phosphorus.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potassium:</span>
                    <span>{device.readings.potassium.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Nitrogen Gate</Label>
                    <Button
                      variant={
                        device.nitrogenGate === "open"
                          ? "destructive"
                          : "default"
                      }
                      className="w-full mt-2"
                      onClick={() => toggleNitrogenGate(device.id)}
                    >
                      {device.nitrogenGate === "open"
                        ? "Close Gate"
                        : "Open Gate"}
                    </Button>
                  </div>

                  <div>
                    <Label>Release Timer (hours)</Label>
                    <Select
                      value={device.nitrogenTimer?.toString() || ""}
                      onValueChange={(value) =>
                        updateNitrogenTimer(device.id, parseInt(value))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[12, 24, 48, 72].map((hours) => (
                          <SelectItem key={hours} value={hours.toString()}>
                            {hours} hours
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
