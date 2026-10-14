/**
 * The generated schemas type C# decimals as `number | string` (.NET's OpenAPI generator allows
 * numbers written as strings) and enums as `number`, while the API actually sends JSON numbers and
 * enum names ("FUT", "Normal"). Feature api.ts files map responses through these helpers into
 * their own types, so components only ever see plain numbers and string unions.
 */

/** A decimal from the API as a number; null when missing or not numeric. */
export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** An enum from the API as its name. */
export function toEnumName(value: number | string): string {
  return String(value)
}
