import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const isClient = typeof window !== "undefined";

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

export function generateInitialReadings() {
  const thresholds = DEFAULT_THRESHOLDS;
  return {
    nitrogen: thresholds.nitrogen.max * 0.85 + (Math.random() - 0.5) * 10,
    phosphorus: thresholds.phosphorus.max * 0.85 + (Math.random() - 0.5) * 10,
    potassium: thresholds.potassium.max * 0.85 + (Math.random() - 0.5) * 10,
  };
}

export const DEFAULT_GROUPS = [
  "Field A",
  "Field B",
  "Greenhouse",
  "Garden",
  "Research",
];

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

export function getDevices(): Promise<Device[]> {
  if (!isClient) {
    return Promise.resolve([]);
  }

  // Try to get from localStorage first
  const storedDevices = localStorage.getItem(DEVICES_STORAGE_KEY);
  if (storedDevices) {
    return Promise.resolve(JSON.parse(storedDevices));
  }

  return Promise.resolve(
    createClientComponentClient()
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: dbDevices, error }) => {
        if (error || !dbDevices) {
          return [];
        }

        const devices = dbDevices.map(initializeDeviceWithReadings);

        if (isClient) {
          localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
        }
        return devices;
      })
  );
}

export function updateDevices(devices: Device[]) {
  if (isClient) {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
  }
}

export function getChartData(): any[] {
  if (!isClient) return [];

  const storedData = localStorage.getItem(CHART_DATA_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : [];
}

export function updateChartData(chartData: any[]) {
  if (isClient) {
    localStorage.setItem(CHART_DATA_STORAGE_KEY, JSON.stringify(chartData));
  }
}

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

export interface ThresholdSettings {
  nitrogen: { min: number; max: number };
  phosphorus: { min: number; max: number };
  potassium: { min: number; max: number };
}

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  nitrogen: { min: 30, max: 80 },
  phosphorus: { min: 20, max: 70 },
  potassium: { min: 40, max: 90 },
};

const THRESHOLDS_STORAGE_KEY = "nitcat-thresholds";

export function getThresholds(): ThresholdSettings {
  if (!isClient) return DEFAULT_THRESHOLDS;

  const storedThresholds = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
  return storedThresholds ? JSON.parse(storedThresholds) : DEFAULT_THRESHOLDS;
}

export function updateThresholds(thresholds: ThresholdSettings) {
  if (isClient) {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  }
}

export function checkThresholds(
  device: Device,
  thresholds: ThresholdSettings
): {
  exceeded: boolean;
  alerts: string[];
} {
  const alerts: string[] = [];

  if (device.readings.nitrogen < thresholds.nitrogen.min) {
    alerts.push(
      `Nitrogen below minimum threshold (${thresholds.nitrogen.min}%)`
    );
  } else if (device.readings.nitrogen > thresholds.nitrogen.max) {
    alerts.push(
      `Nitrogen above maximum threshold (${thresholds.nitrogen.max}%)`
    );
  }

  if (device.readings.phosphorus < thresholds.phosphorus.min) {
    alerts.push(
      `Phosphorus below minimum threshold (${thresholds.phosphorus.min}%)`
    );
  } else if (device.readings.phosphorus > thresholds.phosphorus.max) {
    alerts.push(
      `Phosphorus above maximum threshold (${thresholds.phosphorus.max}%)`
    );
  }

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

export interface GateSettings {
  mode: "auto" | "manual";
}

const DEFAULT_GATE_SETTINGS: GateSettings = {
  mode: "auto",
};

const GATE_SETTINGS_KEY = "nitcat-gate-settings";

export function getGateSettings(): GateSettings {
  if (!isClient) {
    return DEFAULT_GATE_SETTINGS;
  }

  const settings = localStorage.getItem(GATE_SETTINGS_KEY);
  return settings ? JSON.parse(settings) : DEFAULT_GATE_SETTINGS;
}

export function updateGateSettings(settings: GateSettings): void {
  if (!isClient) return;

  localStorage.setItem(GATE_SETTINGS_KEY, JSON.stringify(settings));
}

export function shouldGateBeOpen(
  reading: number,
  min: number,
  max: number,
  currentState: "open" | "closed" | undefined
): boolean {
  const buffer = (max - min) * 0.05;

  if (currentState === "open") {
    return reading < max - buffer;
  } else {
    return reading < min + buffer;
  }
}

export function updateDeviceGateAuto(device: Device): Device {
  const thresholds = getThresholds();
  const shouldOpen = shouldGateBeOpen(
    device.readings.nitrogen,
    thresholds.nitrogen.min,
    thresholds.nitrogen.max,
    device.nitrogenGate
  );

  if (
    (shouldOpen && device.nitrogenGate === "closed") ||
    (!shouldOpen && device.nitrogenGate === "open")
  ) {
    return {
      ...device,
      nitrogenGate: shouldOpen ? "open" : "closed",
    };
  }

  return device;
}
