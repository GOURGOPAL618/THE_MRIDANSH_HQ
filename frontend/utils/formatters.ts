// Formatting utilities for coordinate displays, file sizes, and telemetry values

/**
 * Format latitude/longitude into Degrees, Minutes, Seconds (DMS) string
 */
export function formatCoordinates(lat: number, lng: number): string {
  const formatDMS = (val: number, pos: string, neg: string): string => {
    const absVal = Math.abs(val);
    const degrees = Math.floor(absVal);
    const minutesDecimal = (absVal - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = Math.round((minutesDecimal - minutes) * 60);
    const direction = val >= 0 ? pos : neg;
    
    return `${degrees}°${minutes}'${seconds}" ${direction}`;
  };

  return `${formatDMS(lat, "N", "S")} | ${formatDMS(lng, "E", "W")}`;
}

/**
 * Format timestamp into standard mission logs string: YYYY-MM-DD HH:MM:SS UTC
 */
export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  } catch (e) {
    return isoString;
  }
}

/**
 * Format file size in bytes into human readable binary bytes (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format engine temperature in Kelvin to Celsius with 1 decimal
 */
export function formatKelvin(kValue: number): string {
  const celsius = kValue - 273.15;
  return `${kValue.toFixed(0)}K (${celsius.toFixed(1)}°C)`;
}

/**
 * Format engine thrust level as percentage
 */
export function formatThrust(thrust: number): string {
  return `${Math.round(thrust)}%`;
}
