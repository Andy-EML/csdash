import type {
  DeviceAlertSettingsRow,
  DeviceWarningOverrideRow,
  GasGageRow,
} from "@/lib/database.types";
import type { TonerSnapshot, WarningScope } from "./device-card";

export type DeviceStatus = "critical" | "warning" | "ok";

export const DEFAULT_TONER_THRESHOLD = 15;

export function computeTonerSnapshots(
  device: GasGageRow,
  settings: DeviceAlertSettingsRow | undefined,
  mutedScopes: WarningScope[],
  activeOrders?: Set<string>
): TonerSnapshot[] {
  const muteAll = mutedScopes.includes("all");

  return [
    {
      key: "black",
      label: "Black",
      value: extractPercentage(device.black),
      threshold: settings?.black_threshold ?? DEFAULT_TONER_THRESHOLD,
      muted: muteAll || mutedScopes.includes("black"),
      hasActiveOrder: activeOrders?.has("black") ?? false,
    },
    {
      key: "cyan",
      label: "Cyan",
      value: extractPercentage(device.cyan),
      threshold: settings?.cyan_threshold ?? DEFAULT_TONER_THRESHOLD,
      muted: muteAll || mutedScopes.includes("cyan"),
      hasActiveOrder: activeOrders?.has("cyan") ?? false,
    },
    {
      key: "magenta",
      label: "Magenta",
      value: extractPercentage(device.magenta),
      threshold: settings?.magenta_threshold ?? DEFAULT_TONER_THRESHOLD,
      muted: muteAll || mutedScopes.includes("magenta"),
      hasActiveOrder: activeOrders?.has("magenta") ?? false,
    },
    {
      key: "yellow",
      label: "Yellow",
      value: extractPercentage(device.yellow),
      threshold: settings?.yellow_threshold ?? DEFAULT_TONER_THRESHOLD,
      muted: muteAll || mutedScopes.includes("yellow"),
      hasActiveOrder: activeOrders?.has("yellow") ?? false,
    },
  ];
}

export function computeDeviceStatus(
  levels: TonerSnapshot[],
  mutedScopes: WarningScope[]
): DeviceStatus {
  const muteAll = mutedScopes.includes("all");
  if (!muteAll && levels.some((level) => !level.muted && level.value === 0)) {
    return "critical";
  }

  if (
    !muteAll &&
    levels.some(
      (level) => !level.muted && (level.value === null || level.value <= level.threshold)
    )
  ) {
    return "warning";
  }

  return "ok";
}

export function computeMutedScopes(
  device: GasGageRow,
  overrides: DeviceWarningOverrideRow[]
): WarningScope[] {
  const scopes = new Set<WarningScope>();
  const now = Date.now();
  const lastUpdatedIso = getDeviceLastUpdatedIso(device);
  const lastUpdatedMs = lastUpdatedIso ? Date.parse(lastUpdatedIso) : null;

  for (const override of overrides) {
    if (override.expires_at && Date.parse(override.expires_at) <= now) {
      continue;
    }
    if (
      lastUpdatedMs !== null &&
      override.dismissed_at &&
      Date.parse(override.dismissed_at) <= lastUpdatedMs
    ) {
      continue;
    }
    scopes.add(override.scope);
  }

  return Array.from(scopes);
}

export function getDeviceLastUpdatedIso(device: GasGageRow): string | null {
  return device.latest_receive_date ?? device.updated_at ?? device.created_at ?? null;
}

export function extractPercentage(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
