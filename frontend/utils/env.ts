/**
 * Environment configuration helper
 */
export function getEnv(key: string, fallback: string = ""): string {
  if (typeof process === "undefined" || !process.env) {
    return fallback;
  }
  return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

export function isDevelopment(): boolean {
  return getEnv("NODE_ENV") === "development";
}

export function isProduction(): boolean {
  return getEnv("NODE_ENV") === "production";
}
