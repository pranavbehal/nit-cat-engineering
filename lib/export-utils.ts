import { Device } from "./device-utils";

export function generateCSV(devices: Device[]): string {
  // Create CSV header
  const header =
    "Device ID,Device Name,Group,Status,Nitrogen (%),Phosphorus (%),Potassium (%)";

  // Create CSV rows
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

  // Combine header and rows
  return [header, ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  // Create a Blob with the CSV data
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  // Create download link
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

// Export historical chart data
export function exportChartData(chartData: any[]): void {
  // Create CSV header with dynamic columns
  const firstRow = chartData[0] || {};
  const columns = Object.keys(firstRow);
  const header = columns.join(",");

  // Create CSV rows
  const rows = chartData.map((point) =>
    columns.map((col) => point[col]).join(",")
  );

  // Combine header and rows
  const csv = [header, ...rows].join("\n");

  // Download the CSV file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCSV(csv, `nitcat-chart-${timestamp}.csv`);
}
