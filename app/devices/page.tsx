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

interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  nitrogenGate: "open" | "closed";
  nitrogenTimer: number;
  readings: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

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
      const { data: dbDevices, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch devices");
        return;
      }

      // Convert DB devices to local device state with simulated readings
      const devicesWithReadings = (dbDevices as DBDevice[]).map((device) => ({
        id: device.id,
        name: device.name,
        status: "online" as const,
        nitrogenGate: "closed" as const,
        nitrogenTimer: 24,
        readings: {
          nitrogen: 50 + Math.random() * 20,
          phosphorus: 40 + Math.random() * 20,
          potassium: 60 + Math.random() * 20,
        },
      }));

      setDevices(devicesWithReadings);
    }

    fetchDevices();
  }, [supabase]);

  // Simulate real-time readings for existing devices
  useEffect(() => {
    if (devices.length === 0) return;

    const interval = setInterval(() => {
      setDevices((currentDevices) =>
        currentDevices.map((device) => ({
          ...device,
          readings: {
            nitrogen: Math.max(
              0,
              Math.min(
                100,
                device.readings.nitrogen + (Math.random() - 0.5) * 5
              )
            ),
            phosphorus: Math.max(
              0,
              Math.min(
                100,
                device.readings.phosphorus + (Math.random() - 0.5) * 5
              )
            ),
            potassium: Math.max(
              0,
              Math.min(
                100,
                device.readings.potassium + (Math.random() - 0.5) * 5
              )
            ),
          },
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [devices]);

  const handlePairDevice = async () => {
    setPairing(true);
    const toastId = toast.loading("Pairing device...");

    try {
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

      // Add device to local state with simulated readings
      const deviceWithReadings: Device = {
        id: newDevice.id,
        name: newDevice.name,
        status: "online",
        nitrogenGate: "closed",
        nitrogenTimer: 24,
        readings: {
          nitrogen: 50 + Math.random() * 20,
          phosphorus: 40 + Math.random() * 20,
          potassium: 60 + Math.random() * 20,
        },
      };

      setDevices((prev) => [deviceWithReadings, ...prev]);
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
                <CardTitle className="flex justify-between items-center">
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
                      value={device.nitrogenTimer.toString()}
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
