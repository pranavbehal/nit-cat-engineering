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
  
  return supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id;
    if (!userId) {
      return Promise.resolve([]);
    }
    
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
          const storageKey = `${DEVICES_STORAGE_KEY}-${userId}`;
          localStorage.setItem(storageKey, JSON.stringify(devices));
        }
        return devices;
      });
  });
}

export function updateDevices(devices: Device[]) {
  if (isClient) {
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
  
  // Always prioritize localStorage for consistent experience
  // Check device-specific thresholds first if deviceId is provided
  if (deviceId) {
    const deviceThresholds = localStorage.getItem(`${THRESHOLDS_STORAGE_KEY}-${deviceId}`);
    if (deviceThresholds) {
      try {
        return JSON.parse(deviceThresholds);
      } catch (e) {
        console.error('Error parsing stored device thresholds:', e);
      }
    }
  }
  
  // Then check global thresholds
  const globalThresholds = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
  if (globalThresholds) {
    try {
      return JSON.parse(globalThresholds);
    } catch (e) {
      console.error('Error parsing stored global thresholds:', e);
    }
  }
  
  // Only if nothing in localStorage, try database
  try {
    const supabase = createClientComponentClient();
    
    // If deviceId is provided, try to get thresholds for that specific device
    if (deviceId) {
      const { data, error } = await supabase
        .from('thresholds')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      
      if (!error && data) {
        const thresholds = {
          nitrogen: { min: data.nitrogen_min, max: data.nitrogen_max },
          phosphorus: { min: data.phosphorus_min, max: data.phosphorus_max },
          potassium: { min: data.potassium_min, max: data.potassium_max }
        };
        
        // Save to localStorage for next time
        localStorage.setItem(`${THRESHOLDS_STORAGE_KEY}-${deviceId}`, JSON.stringify(thresholds));
        return thresholds;
      }
    }
  } catch (error) {
    console.error('Error getting thresholds from database:', error);
  }
  
  // If all else fails, return defaults
  return DEFAULT_THRESHOLDS;
}

export async function updateThresholds(thresholds: ThresholdSettings, deviceId?: string) {
  if (!isClient) return;
  
  // Always store in localStorage as the primary storage
  const storageKey = deviceId ? `${THRESHOLDS_STORAGE_KEY}-${deviceId}` : THRESHOLDS_STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(thresholds));
  
  // Also store in the global settings for app-wide consistency
  if (deviceId) {
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  }
  
  // Try to update database as a backup, but don't block on it
  if (deviceId) {
    const supabase = createClientComponentClient();
    
    try {
      // Check if thresholds exist for this device
      const { data } = await supabase
        .from('thresholds')
        .select('id')
        .eq('device_id', deviceId);
      
      if (data && data.length > 0) {
        // Update existing thresholds
        // Use async/await pattern to handle database updates with proper error handling
        const updatePromise = supabase
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
          
        updatePromise.then(() => {
          console.log('Thresholds updated in database');
        });
        
        // Handle errors safely
        updatePromise.then(null, (err: Error) => {
          console.error('Database update failed:', err);
        });
      } else {
        // Insert new thresholds
        // Use async/await pattern to handle database inserts with proper error handling
        const insertPromise = supabase
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
          
        insertPromise.then(() => {
          console.log('Thresholds inserted in database');
        });
        
        // Handle errors safely
        insertPromise.then(null, (err: Error) => {
          console.error('Database insert failed:', err);
        });
      }
    } catch (error) {
      console.error('Error updating thresholds in database:', error);
    }
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
  
  // Always prioritize localStorage for immediate and consistent experience
  const localSettings = localStorage.getItem(GATE_SETTINGS_KEY);
  if (localSettings) {
    try {
      return JSON.parse(localSettings);
    } catch (e) {
      console.error('Error parsing gate settings from localStorage:', e);
    }
  }
  
  // Try user-specific settings as fallback
  try {
    const supabase = createClientComponentClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (userId) {
      const userLocalSettings = localStorage.getItem(`${GATE_SETTINGS_KEY}-${userId}`);
      if (userLocalSettings) {
        try {
          return JSON.parse(userLocalSettings);
        } catch (e) {
          console.error('Error parsing user gate settings:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error getting user for gate settings:', error);
  }
  
  // If nothing found, return defaults
  return DEFAULT_GATE_SETTINGS;
}

export async function updateGateSettings(settings: GateSettings): Promise<void> {
  if (!isClient) return;
  
  // Always store in global localStorage as the primary storage
  localStorage.setItem(GATE_SETTINGS_KEY, JSON.stringify(settings));
  
  // Also try to store in user-specific localStorage and database as backup
  try {
    const supabase = createClientComponentClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (userId) {
      // Store in user-specific localStorage
      localStorage.setItem(`${GATE_SETTINGS_KEY}-${userId}`, JSON.stringify(settings));
      
      // Update user profile gate auto control setting
      // Use async/await pattern to handle profile updates with proper error handling
      const profilePromise = supabase
        .from('profiles')
        .update({
          gate_auto_control: settings.mode === 'auto',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      profilePromise.then(() => {
        console.log('Gate settings updated in profile');
      });
      
      // Handle errors safely
      profilePromise.then(null, (err: Error) => {
        console.error('Failed to update gate settings in profile:', err);
      });
    }
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
  theme?: "light" | "dark" | "system";
  gate_auto_control?: boolean;
  updated_at?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  notifications_enabled: false,
  measurement_unit: 'percent',
  theme: 'system',
  gate_auto_control: true
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
      console.warn('Profile not found for user ID:', userId);
      return {
        ...DEFAULT_PROFILE,
        id: userId,
        name: userData.user?.email || ''
      };
    }
    
    return {
      id: data.id,
      name: data.name,
      notifications_enabled: data.notifications_enabled ?? false,
      measurement_unit: (data.measurement_unit as "percent" | "ppm") || 'percent',
      theme: (data.theme as "light" | "dark" | "system") || 'system',
      gate_auto_control: data.gate_auto_control ?? true,
      updated_at: data.updated_at
    };
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
    
    await getUserProfile();
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile in database:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error; 
  }
}
