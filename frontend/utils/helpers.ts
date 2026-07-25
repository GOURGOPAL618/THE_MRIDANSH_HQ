/**
 * String Helpers
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Array Helpers
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function sortBy<T>(
  arr: T[],
  key: keyof T,
  order: "asc" | "desc" = "asc"
): T[] {
  return [...arr].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    const comparison = valA < valB ? -1 : 1;
    return order === "asc" ? comparison : -comparison;
  });
}

/**
 * Object Helpers
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  if (target && typeof target === "object" && source && typeof source === "object") {
    Object.keys(source).forEach((key) => {
      const targetVal = output[key as keyof T];
      const sourceVal = source[key as keyof T];

      if (
        targetVal &&
        typeof targetVal === "object" &&
        sourceVal &&
        typeof sourceVal === "object" &&
        !Array.isArray(targetVal)
      ) {
        output[key as keyof T] = deepMerge(
          targetVal as object,
          sourceVal as object
        ) as any;
      } else if (sourceVal !== undefined) {
        output[key as keyof T] = sourceVal as any;
      }
    });
  }
  return output;
}

/**
 * Validation Helpers
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidHexColor(hex: string): boolean {
  const regex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  return regex.test(hex);
}
