import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Add this at the top to check for browser environment
const isClient = typeof window !== "undefined";

// Define the Device interface in a central location
export interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  nitrogenGate?: "open" | "closed";
  nitrogenTimer?: number;
  group?: string;
  readings: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
}

// Generate consistent initial readings
export function generateInitialReadings() {
  // Get thresholds to target values relative to them
  const thresholds = DEFAULT_THRESHOLDS;

  // Target values that are below the max thresholds (85% of max)
  return {
    nitrogen: thresholds.nitrogen.max * 0.85 + (Math.random() - 0.5) * 10,
    phosphorus: thresholds.phosphorus.max * 0.85 + (Math.random() - 0.5) * 10,
    potassium: thresholds.potassium.max * 0.85 + (Math.random() - 0.5) * 10,
  };
}

// Add default groups
export const DEFAULT_GROUPS = [
  "Field A",
  "Field B",
  "Greenhouse",
  "Garden",
  "Research",
];

// Initialize devices with readings
export function initializeDeviceWithReadings(dbDevice: any): Device {
  return {
    id: dbDevice.id,
    name: dbDevice.name,
    status: "online",
    nitrogenGate: "closed",
    nitrogenTimer: 24,
    group: "Uncategorized",
    readings: generateInitialReadings(),
  };
}

// Local storage keys
const DEVICES_STORAGE_KEY = "nitcat-devices";
const CHART_DATA_STORAGE_KEY = "nitcat-chart-data";

// Get devices from storage or fetch from DB
export function getDevices(): Promise<Device[]> {
  // If server-side, we can't use localStorage
  if (!isClient) {
    return Promise.resolve([]);
  }

  // Try to get from localStorage first
  const storedDevices = localStorage.getItem(DEVICES_STORAGE_KEY);
  if (storedDevices) {
    return Promise.resolve(JSON.parse(storedDevices));
  }

  // Otherwise fetch from DB
  return Promise.resolve(
    createClientComponentClient()
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: dbDevices, error }) => {
        if (error || !dbDevices) {
          return [];
        }

        // Initialize devices with readings
        const devices = dbDevices.map(initializeDeviceWithReadings);

        // Store in localStorage
        if (isClient) {
          localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
        }
        return devices;
      })
  );
}

// Update devices in storage
export function updateDevices(devices: Device[]) {
  if (isClient) {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
  }
}

// Get chart data from storage
export function getChartData(): any[] {
  if (!isClient) return [];

  const storedData = localStorage.getItem(CHART_DATA_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : [];
}

// Update chart data in storage
export function updateChartData(chartData: any[]) {
  if (isClient) {
    localStorage.setItem(CHART_DATA_STORAGE_KEY, JSON.stringify(chartData));
  }
}

// Update device group
export function updateDeviceGroup(
  devices: Device[],
  deviceId: string,
  group: string
): Device[] {
  const updatedDevices = devices.map((device) =>
    device.id === deviceId ? { ...device, group } : device
  );
  updateDevices(updatedDevices);
  return updatedDevices;
}

// Add threshold interfaces
export interface ThresholdSettings {
  nitrogen: { min: number; max: number };
  phosphorus: { min: number; max: number };
  potassium: { min: number; max: number };
}

// Default thresholds
export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  nitrogen: { min: 30, max: 80 },
  phosphorus: { min: 20, max: 70 },
  potassium: { min: 40, max: 90 },
};

// Local storage key for thresholds
const THRESHOLDS_STORAGE_KEY = "nitcat-thresholds";

// Get thresholds from storage
export function getThresholds(): ThresholdSettings {
  if (!isClient) return DEFAULT_THRESHOLDS;

  const storedThresholds = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
  return storedThresholds ? JSON.parse(storedThresholds) : DEFAULT_THRESHOLDS;
}

// Update thresholds in storage
export function updateThresholds(thresholds: ThresholdSettings) {
  if (isClient) {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  }
}

// Check device readings against thresholds
export function checkThresholds(
  device: Device,
  thresholds: ThresholdSettings
): {
  exceeded: boolean;
  alerts: string[];
} {
  const alerts: string[] = [];

  // Check nitrogen
  if (device.readings.nitrogen < thresholds.nitrogen.min) {
    alerts.push(
      `Nitrogen below minimum threshold (${thresholds.nitrogen.min}%)`
    );
  } else if (device.readings.nitrogen > thresholds.nitrogen.max) {
    alerts.push(
      `Nitrogen above maximum threshold (${thresholds.nitrogen.max}%)`
    );
  }

  // Check phosphorus
  if (device.readings.phosphorus < thresholds.phosphorus.min) {
    alerts.push(
      `Phosphorus below minimum threshold (${thresholds.phosphorus.min}%)`
    );
  } else if (device.readings.phosphorus > thresholds.phosphorus.max) {
    alerts.push(
      `Phosphorus above maximum threshold (${thresholds.phosphorus.max}%)`
    );
  }

  // Check potassium
  if (device.readings.potassium < thresholds.potassium.min) {
    alerts.push(
      `Potassium below minimum threshold (${thresholds.potassium.min}%)`
    );
  } else if (device.readings.potassium > thresholds.potassium.max) {
    alerts.push(
      `Potassium above maximum threshold (${thresholds.potassium.max}%)`
    );
  }

  return {
    exceeded: alerts.length > 0,
    alerts,
  };
}
