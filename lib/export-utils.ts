import { Device } from "./device-utils";

const isClient = typeof window !== "undefined";

export function generateCSV(devices: Device[]): string {
  const header =
    "Device ID,Device Name,Group,Status,Nitrogen (%),Phosphorus (%),Potassium (%)";

  const rows = devices.map((device) =>
    [
      device.id,
      device.name,
      device.group || "Uncategorized",
      device.status,
      device.readings.nitrogen.toFixed(1),
      device.readings.phosphorus.toFixed(1),
      device.readings.potassium.toFixed(1),
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  if (!isClient) return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDeviceData(devices: Device[]): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csv = generateCSV(devices);
  downloadCSV(csv, `nitcat-readings-${timestamp}.csv`);
}

export function exportChartData(chartData: any[]): void {
  const firstRow = chartData[0] || {};
  const columns = Object.keys(firstRow);
  const header = columns.join(",");

  const rows = chartData.map((point) =>
    columns.map((col) => point[col]).join(",")
  );

  const csv = [header, ...rows].join("\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCSV(csv, `nitcat-chart-${timestamp}.csv`);
}
