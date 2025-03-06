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

  useEffect(() => {
    async function fetchDevices() {
      const devices = await getDevices();
      setDevices(devices);
    }

    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length === 0) return;

    const existingChart = getChartData();

    if (existingChart.length > 0) {
      setChartData(existingChart);
    } else {
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
            time: new Date().toISOString(),
            nitrogen: avgNitrogen,
            phosphorus: avgPhosphorus,
            potassium: avgPotassium,
          };

          const updatedChart =
            prev.length >= 24
              ? [...prev.slice(1), newPoint]
              : [...prev, newPoint];
          updateChartData(updatedChart);
          return updatedChart;
        });

        const thresholds = getThresholds();
        const { exceeded, alerts } = checkThresholds(
          updatedDevices[0],
          thresholds
        );

        if (exceeded) {
          alerts.forEach((alert) => {
            toast.warning(`${updatedDevices[0].name}: ${alert}`, {
              id: `${updatedDevices[0].id}-${alert}`,
              duration: 5000,
            });
          });
        }

        return updatedDevices;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [devices.length]);

  const formatNumber = (num: number) => Number(num.toFixed(1));

  const filteredDevices =
    selectedGroup === "all"
      ? devices
      : selectedGroup === "Uncategorized"
      ? devices.filter(
          (device) => !device.group || device.group === "Uncategorized"
        )
      : devices.filter((device) => device.group === selectedGroup);

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

  const calculateYAxisDomain = (data: any[]) => {
    if (!data || data.length === 0) return [0, 100];

    let minValue = 100;
    let maxValue = 0;

    data.forEach((point) => {
      minValue = Math.min(
        minValue,
        point.nitrogen,
        point.phosphorus,
        point.potassium
      );
      maxValue = Math.max(
        maxValue,
        point.nitrogen,
        point.phosphorus,
        point.potassium
      );
    });

    const range = maxValue - minValue;
    const padding = Math.max(range * 0.1, 5);

    let yMin = Math.max(0, Math.floor(minValue - padding));
    let yMax = Math.min(100, Math.ceil(maxValue + padding));

    if (yMax - yMin < 20) {
      const middle = (yMin + yMax) / 2;
      yMin = Math.max(0, Math.floor(middle - 10));
      yMax = Math.min(100, Math.ceil(middle + 10));
    }

    return [yMin, yMax];
  };

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return time;
    }
  };

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
    <div className="container py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/devices">Add Device</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="grid gap-4 md:grid-cols-3">
        {filteredDevices.map((device) => (
          <Card key={device.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{device.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {device.group || "Uncategorized"}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-medium mb-1">Nitrogen</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (device.readings.nitrogen / 100) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1">
                      {device.readings.nitrogen.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Phosphorus</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (device.readings.phosphorus / 100) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1">
                      {device.readings.phosphorus.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-medium mb-1">Potassium</div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (device.readings.potassium / 100) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1">
                      {device.readings.potassium.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <div
                      className={`px-2 py-1 text-xs rounded-full ${
                        device.nitrogenGate === "open"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      Gate: {device.nitrogenGate === "open" ? "Open" : "Closed"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>24-Hour NPK Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(time) => formatTime(time)}
                  tick={{ fontSize: 12 }}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  minTickGap={15}
                />
                <YAxis
                  domain={calculateYAxisDomain(chartData)}
                  ticks={[...Array(5)].map((_, i) => {
                    const [min, max] = calculateYAxisDomain(chartData);
                    return Math.round(min + (max - min) * (i / 4));
                  })}
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
