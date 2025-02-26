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
import {
  getDevices,
  updateDevices,
  getChartData,
  updateChartData,
  Device,
  DEFAULT_GROUPS,
  getThresholds,
  checkThresholds,
} from "@/lib/device-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportDeviceData, exportChartData } from "@/lib/export-utils";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const supabase = createClientComponentClient();

  // Fetch devices from database
  useEffect(() => {
    async function fetchDevices() {
      const devices = await getDevices();
      setDevices(devices);
    }

    fetchDevices();
  }, []);

  // Fix the chart to start with just one data point and grow over time
  useEffect(() => {
    if (devices.length === 0) return;

    // Try to get existing chart data
    const existingChart = getChartData();

    // If we have existing data, use it
    if (existingChart.length > 0) {
      setChartData(existingChart);
    } else {
      // Otherwise initialize with one point
      const now = new Date();
      const initialPoint = {
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        nitrogen:
          devices.reduce((sum, dev) => sum + dev.readings.nitrogen, 0) /
          devices.length,
        phosphorus:
          devices.reduce((sum, dev) => sum + dev.readings.phosphorus, 0) /
          devices.length,
        potassium:
          devices.reduce((sum, dev) => sum + dev.readings.potassium, 0) /
          devices.length,
      };
      setChartData([initialPoint]);
      updateChartData([initialPoint]);
    }

    // Update devices and chart simultaneously
    const interval = setInterval(() => {
      setDevices((currentDevices) => {
        const updatedDevices = currentDevices.map((device, index) => {
          const thresholds = getThresholds();

          // Make readings tend toward 85% of threshold max (below but close)
          // First device occasionally goes higher to trigger alerts
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
                  // Move toward target with drift + small randomness
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

        // Update devices in storage
        updateDevices(updatedDevices);

        // Update chart data
        setChartData((prev) => {
          const avgNitrogen =
            updatedDevices.reduce(
              (sum, dev) => sum + dev.readings.nitrogen,
              0
            ) / updatedDevices.length;
          const avgPhosphorus =
            updatedDevices.reduce(
              (sum, dev) => sum + dev.readings.phosphorus,
              0
            ) / updatedDevices.length;
          const avgPotassium =
            updatedDevices.reduce(
              (sum, dev) => sum + dev.readings.potassium,
              0
            ) / updatedDevices.length;

          const newPoint = {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            nitrogen: avgNitrogen,
            phosphorus: avgPhosphorus,
            potassium: avgPotassium,
          };

          const updatedChart =
            prev.length >= 24
              ? [...prev.slice(1), newPoint]
              : [...prev, newPoint];
          updateChartData(updatedChart); // Update storage
          return updatedChart;
        });

        // Check thresholds and show alerts
        const thresholds = getThresholds();
        const { exceeded, alerts } = checkThresholds(
          updatedDevices[0],
          thresholds
        );

        if (exceeded) {
          alerts.forEach((alert) => {
            toast.warning(`${updatedDevices[0].name}: ${alert}`, {
              id: `${updatedDevices[0].id}-${alert}`, // Prevent duplicates
              duration: 5000,
            });
          });
        }

        return updatedDevices;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [devices.length]);

  // Add this function to format numbers
  const formatNumber = (num: number) => Number(num.toFixed(1));

  // Create filtered devices array
  const filteredDevices =
    selectedGroup === "all"
      ? devices
      : selectedGroup === "Uncategorized"
      ? devices.filter(
          (device) => !device.group || device.group === "Uncategorized"
        )
      : devices.filter((device) => device.group === selectedGroup);

  // Add these computed values
  const averageNitrogen = formatNumber(
    filteredDevices.reduce((acc, dev) => acc + dev.readings.nitrogen, 0) /
      filteredDevices.length
  );
  const averagePhosphorus = formatNumber(
    filteredDevices.reduce((acc, dev) => acc + dev.readings.phosphorus, 0) /
      filteredDevices.length
  );
  const averagePotassium = formatNumber(
    filteredDevices.reduce((acc, dev) => acc + dev.readings.potassium, 0) /
      filteredDevices.length
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              exportDeviceData(devices);
              toast.success("Device data exported to CSV");
            }}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export Devices
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              exportChartData(chartData);
              toast.success("Chart data exported to CSV");
            }}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export Chart
          </Button>
        </div>
      </div>

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

      {/* Group Selector */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Devices</h2>
        <Select
          value={selectedGroup}
          onValueChange={(value) => setSelectedGroup(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {DEFAULT_GROUPS.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
            <SelectItem value="Uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {filteredDevices.map((device) => (
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
                <div>Nitrogen: {formatNumber(device.readings.nitrogen)}%</div>
                <div>
                  Phosphorus: {formatNumber(device.readings.phosphorus)}%
                </div>
                <div>Potassium: {formatNumber(device.readings.potassium)}%</div>
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
                <XAxis
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0} // Show all labels
                  minTickGap={15} // Minimum gap between ticks
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  label={{
                    value: "NPK Levels (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatNumber(value) + "%"}
                />
                <Line
                  type="monotone"
                  dataKey="nitrogen"
                  stroke="#8884d8"
                  name="Nitrogen"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="phosphorus"
                  stroke="#82ca9d"
                  name="Phosphorus"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="potassium"
                  stroke="#ffc658"
                  name="Potassium"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
