export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = Record<string, unknown>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export * from "./types";
