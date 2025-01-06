"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  lastReading: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    timestamp: string;
  };
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  // Fetch devices from database
  useEffect(() => {
    async function fetchDevices() {
      const { data: dbDevices, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !dbDevices) {
        return;
      }

      // Convert DB devices to dashboard format with simulated readings
      const devicesWithReadings = dbDevices.map((device) => ({
        id: device.id,
        name: device.name,
        status: "online",
        lastReading: {
          nitrogen: 65,
          phosphorus: 45,
          potassium: 80,
          timestamp: new Date().toISOString(),
        },
      }));

      setDevices(devicesWithReadings);
    }

    fetchDevices();
  }, [supabase]);

  // Simulate real-time data for chart only if there are devices
  useEffect(() => {
    if (devices.length === 0) return;

    const generateChartData = () => {
      const now = new Date();
      return Array.from({ length: 24 }, (_, i) => ({
        time: new Date(now.getTime() - (23 - i) * 3600000).toLocaleTimeString(),
        nitrogen: 50 + Math.random() * 30,
        phosphorus: 40 + Math.random() * 30,
        potassium: 60 + Math.random() * 30,
      }));
    };

    setChartData(generateChartData());
    const interval = setInterval(() => {
      setChartData((prev) => [
        ...prev.slice(1),
        {
          time: new Date().toLocaleTimeString(),
          nitrogen: 50 + Math.random() * 30,
          phosphorus: 40 + Math.random() * 30,
          potassium: 60 + Math.random() * 30,
        },
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, [devices]);

  // Add this function to format numbers
  const formatNumber = (num: number) => Number(num.toFixed(1));

  // Add these computed values
  const averageNitrogen = formatNumber(
    devices.reduce((acc, dev) => acc + dev.lastReading.nitrogen, 0) /
      devices.length
  );
  const averagePhosphorus = formatNumber(
    devices.reduce((acc, dev) => acc + dev.lastReading.phosphorus, 0) /
      devices.length
  );
  const averagePotassium = formatNumber(
    devices.reduce((acc, dev) => acc + dev.lastReading.potassium, 0) /
      devices.length
  );

  if (devices.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                No devices found. Add a device to start monitoring NPK levels.
              </p>
              <Button asChild>
                <Link href="/devices">Add Your First Device</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              Active monitoring systems
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Nitrogen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageNitrogen}%</div>
            <p className="text-xs text-muted-foreground">Across all devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Phosphorus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePhosphorus}%</div>
            <p className="text-xs text-muted-foreground">Across all devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Potassium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePotassium}%</div>
            <p className="text-xs text-muted-foreground">Across all devices</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  Nitrogen: {formatNumber(device.lastReading.nitrogen)}%
                </div>
                <div>
                  Phosphorus: {formatNumber(device.lastReading.phosphorus)}%
                </div>
                <div>
                  Potassium: {formatNumber(device.lastReading.potassium)}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour NPK Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => formatNumber(value) + "%"}
                />
                <Line
                  type="monotone"
                  dataKey="nitrogen"
                  stroke="#8884d8"
                  name="Nitrogen"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="phosphorus"
                  stroke="#82ca9d"
                  name="Phosphorus"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="potassium"
                  stroke="#ffc658"
                  name="Potassium"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
