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
  user_id?: string;
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
const DEVICES_STORAGE_KEY = "nitcat-devices"; // Base key, will be appended with user ID
const CHART_DATA_STORAGE_KEY = "nitcat-chart-data";

export function getDevices(): Promise<Device[]> {
  if (!isClient) {
    return Promise.resolve([]);
  }

  const supabase = createClientComponentClient();
  
  // We should always fetch fresh data from the database to ensure we only get devices
  // that belong to the current user due to Row Level Security
  return supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) {
      return Promise.resolve([]);
    }
    
    // With RLS enabled, this will automatically only return devices belonging to the current user
    return supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data: dbDevices, error }) => {
        if (error || !dbDevices) {
          return [];
        }

        const devices = dbDevices.map(initializeDeviceWithReadings);

        if (isClient) {
          // Store the devices with a user-specific key to avoid conflicts
          const storageKey = `${DEVICES_STORAGE_KEY}-${userId}`;
          localStorage.setItem(storageKey, JSON.stringify(devices));
        }
        return devices;
      });
  });
}

export function updateDevices(devices: Device[]) {
  if (isClient) {
    // Get the current user ID to make storage user-specific
    const supabase = createClientComponentClient();
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (userId) {
        const storageKey = `${DEVICES_STORAGE_KEY}-${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(devices));
      }
    });
  }
}

export async function getChartData(deviceId?: string): Promise<any[]> {
  if (!isClient) return [];

  // Try to get readings from the database if a device ID is provided
  if (deviceId) {
    const supabase = createClientComponentClient();
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(24);

      if (!error && data && data.length > 0) {
        return data.map((reading) => ({
          time: new Date(reading.timestamp).toISOString(),
          nitrogen: reading.nitrogen,
          phosphorus: reading.phosphorus,
          potassium: reading.potassium
        })).reverse();
      }
    } catch (error) {
      console.error('Error fetching readings from database:', error);
    }
  }

  // Fall back to localStorage if database fetch fails or no deviceId
  const storageKey = deviceId ? `${CHART_DATA_STORAGE_KEY}-${deviceId}` : CHART_DATA_STORAGE_KEY;
  const storedData = localStorage.getItem(storageKey);
  return storedData ? JSON.parse(storedData) : [];
}

export async function updateChartData(chartData: any[], deviceId?: string) {
  if (!isClient) return;

  // Store in localStorage for caching purposes
  const storageKey = deviceId ? `${CHART_DATA_STORAGE_KEY}-${deviceId}` : CHART_DATA_STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(chartData));

  // If a deviceId is provided, store the latest reading in the database
  if (deviceId && chartData.length > 0) {
    const latestReading = chartData[chartData.length - 1];
    const supabase = createClientComponentClient();
    try {
      await supabase.from('readings').insert({
        device_id: deviceId,
        nitrogen: latestReading.nitrogen,
        phosphorus: latestReading.phosphorus,
        potassium: latestReading.potassium,
        timestamp: new Date(latestReading.time).toISOString()
      });
    } catch (error) {
      console.error('Error storing reading in database:', error);
    }
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

export async function getThresholds(deviceId?: string): Promise<ThresholdSettings> {
  if (!isClient) return DEFAULT_THRESHOLDS;
  
  const supabase = createClientComponentClient();
  
  try {
    // If deviceId is provided, get thresholds for that specific device
    if (deviceId) {
      const { data, error } = await supabase
        .from('thresholds')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      
      if (error || !data) {
        // If no thresholds found for this device in DB, fall back to localStorage or defaults
        const storedThresholds = localStorage.getItem(`${THRESHOLDS_STORAGE_KEY}-${deviceId}`);
        return storedThresholds ? JSON.parse(storedThresholds) : DEFAULT_THRESHOLDS;
      }
      
      return {
        nitrogen: { min: data.nitrogen_min, max: data.nitrogen_max },
        phosphorus: { min: data.phosphorus_min, max: data.phosphorus_max },
        potassium: { min: data.potassium_min, max: data.potassium_max }
      };
    }
    
    // If no deviceId, return default or from localStorage as before
    const storedThresholds = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    return storedThresholds ? JSON.parse(storedThresholds) : DEFAULT_THRESHOLDS;
  } catch (error) {
    console.error('Error getting thresholds:', error);
    return DEFAULT_THRESHOLDS;
  }
}

export async function updateThresholds(thresholds: ThresholdSettings, deviceId?: string) {
  if (!isClient) return;
  
  // Store in localStorage as a backup/cache
  const storageKey = deviceId ? `${THRESHOLDS_STORAGE_KEY}-${deviceId}` : THRESHOLDS_STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(thresholds));
  
  // If no deviceId, we're only updating the local default thresholds (not tied to a device)
  if (!deviceId) return;
  
  const supabase = createClientComponentClient();
  
  try {
    // Check if thresholds exist for this device
    const { data } = await supabase
      .from('thresholds')
      .select('id')
      .eq('device_id', deviceId);
    
    if (data && data.length > 0) {
      // Update existing thresholds
      await supabase
        .from('thresholds')
        .update({
          nitrogen_min: thresholds.nitrogen.min,
          nitrogen_max: thresholds.nitrogen.max,
          phosphorus_min: thresholds.phosphorus.min,
          phosphorus_max: thresholds.phosphorus.max,
          potassium_min: thresholds.potassium.min,
          potassium_max: thresholds.potassium.max
        })
        .eq('device_id', deviceId);
    } else {
      // Insert new thresholds
      await supabase
        .from('thresholds')
        .insert({
          device_id: deviceId,
          nitrogen_min: thresholds.nitrogen.min,
          nitrogen_max: thresholds.nitrogen.max,
          phosphorus_min: thresholds.phosphorus.min,
          phosphorus_max: thresholds.phosphorus.max,
          potassium_min: thresholds.potassium.min,
          potassium_max: thresholds.potassium.max
        });
    }
  } catch (error) {
    console.error('Error updating thresholds:', error);
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

export async function getGateSettings(): Promise<GateSettings> {
  if (!isClient) {
    return DEFAULT_GATE_SETTINGS;
  }
  
  const supabase = createClientComponentClient();
  
  try {
    // Get the user's profile which contains notification settings
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      return DEFAULT_GATE_SETTINGS;
    }
    
    // Try to get from localStorage as a fallback
    const localSettings = localStorage.getItem(`${GATE_SETTINGS_KEY}-${userId}`);
    const localSettingsObj = localSettings ? JSON.parse(localSettings) : DEFAULT_GATE_SETTINGS;
    
    // The gate settings might be stored in the user profile in the future,
    // but for now we'll use localStorage with user-specific keys
    return localSettingsObj;
  } catch (error) {
    console.error('Error getting gate settings:', error);
    return DEFAULT_GATE_SETTINGS;
  }
}

export async function updateGateSettings(settings: GateSettings): Promise<void> {
  if (!isClient) return;
  
  const supabase = createClientComponentClient();
  
  try {
    // Get the user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return;
    
    // Save to localStorage as a fallback/cache using user-specific key
    localStorage.setItem(`${GATE_SETTINGS_KEY}-${userId}`, JSON.stringify(settings));
    
    // The gate settings might be stored in the user profile in the future
    // For now, we're using localStorage with user-specific keys
  } catch (error) {
    console.error('Error updating gate settings:', error);
  }
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

export async function updateDeviceGateAuto(device: Device): Promise<Device> {
  const thresholds = await getThresholds(device.id);
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

export interface UserProfile {
  id: string;
  name?: string;
  notifications_enabled: boolean;
  measurement_unit: "percent" | "ppm";
  updated_at?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  notifications_enabled: false,
  measurement_unit: 'percent'
};

// Get user profile from the database
export async function getUserProfile(): Promise<UserProfile> {
  if (!isClient) return DEFAULT_PROFILE;
  
  const supabase = createClientComponentClient();
  
  try {
    // Get the user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      return DEFAULT_PROFILE;
    }
    
    // Get the profile from the database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      // If profile not found, create one with default values
      const newProfile = {
        ...DEFAULT_PROFILE,
        id: userId,
      };
      
      await supabase.from('profiles').insert(newProfile);
      return newProfile;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return DEFAULT_PROFILE;
  }
}

// Update user profile in the database
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
  if (!isClient) return;
  
  const supabase = createClientComponentClient();
  
  try {
    // Get the user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) return;
    
    // Ensure the user has a profile
    await getUserProfile();
    
    // Update the profile
    await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}
