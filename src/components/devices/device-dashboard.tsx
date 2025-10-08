"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileText, Palette, Printer, Wrench, Settings } from "lucide-react";
import type { DeviceRow, TonerKey } from "@/lib/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime } from "@/lib/utils";
import { TonerBar } from "@/components/ui/toner-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TONER_FIELD_MAP: Record<TonerKey, keyof DeviceRow> = {
  k: "toner_k_percent",
  c: "toner_c_percent",
  m: "toner_m_percent",
  y: "toner_y_percent",
};

const TONER_CONFIG: Array<{ key: TonerKey; label: string; color: string }> = [
  { key: "k", label: "K", color: "#111827" },
  { key: "c", label: "C", color: "#0ea5e9" },
  { key: "m", label: "M", color: "#d946ef" },
  { key: "y", label: "Y", color: "#f59e0b" },
];

const WARNING_VARIANTS: Array<{
  match: RegExp;
  className: string;
  icon: string;
}> = [
  { match: /waste toner/i, className: "bg-red-100 text-red-700", icon: "waste" },
  { match: /(low|near empty|empty).*toner/i, className: "bg-amber-100 text-amber-700", icon: "toner" },
  { match: /jam/i, className: "bg-purple-100 text-purple-700", icon: "jam" },
  { match: /parts|unit|drum/i, className: "bg-sky-100 text-sky-700", icon: "parts" },
];

type DeviceStatus = "critical" | "warning" | "ok";
type Density = "compact" | "comfortable" | "spacious";
type Filter = "all" | "issues" | "warnings" | "waste";

type DeviceView = {
  device: DeviceRow;
  warnings: string[];
  status: DeviceStatus;
  tonerValues: Array<{ key: TonerKey; label: string; color: string; value: number | null }>;
  wasteValue: number | null;
  wasteWarning: string | null;
  issueCount: number;
  lowCount: number;
};

const STATUS_META: Record<DeviceStatus, { dot: string; badgeClass: string; summary: string }> = {
  critical: { dot: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive", summary: "Critical" },
  warning: { dot: "bg-amber-500", badgeClass: "bg-amber-100 text-amber-700", summary: "Warning" },
  ok: { dot: "bg-emerald-500", badgeClass: "bg-emerald-100 text-emerald-700", summary: "OK" },
};

const GROUP_META: Array<{ key: DeviceStatus; label: string; description: string }> = [
  { key: "critical", label: "🔴 Critical", description: "Needs immediate action" },
  { key: "warning", label: "🟡 Warnings", description: "Monitor soon" },
  { key: "ok", label: "🟢 OK", description: "Healthy devices" },
];

const DENSITY_ROW: Record<Density, string> = {
  compact: "space-y-2 py-3",
  comfortable: "space-y-3 py-4",
  spacious: "space-y-4 py-5",
};

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "issues", label: "Show issues" },
  { value: "warnings", label: "Warnings" },
  { value: "waste", label: "Waste" },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfort" },
  { value: "spacious", label: "Spacious" },
];

export type DevicesDashboardProps = {
  initialDevices: DeviceRow[];
  activeOrderDeviceIds?: string[];
};

type DeviceChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: DeviceRow | null;
  old: DeviceRow | null;
};

export function DevicesDashboard({ initialDevices, activeOrderDeviceIds = [] }: DevicesDashboardProps) {
  const [devices, setDevices] = useState<DeviceRow[]>(() => normalizeDevices(initialDevices));
  const [density, setDensity] = useState<Density>("compact");
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<DeviceStatus, boolean>>({
    critical: false,
    warning: false,
    ok: false,
  });

  useEffect(() => {
    setDevices(normalizeDevices(initialDevices));
  }, [initialDevices]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("public:devices-dashboard")
      .on(
        "postgres_changes",
        { schema: "public", table: "devices", event: "*" },
        (payload) => {
          const change = payload as unknown as DeviceChangePayload;
          setDevices((previous) => {
            const next = new Map(previous.map((device) => [device.serial_number, device] as const));
            if (change.eventType === "DELETE" && change.old) {
              next.delete(change.old.serial_number);
            }
            if (change.new) {
              next.set(change.new.serial_number, change.new);
            }
            return normalizeDevices(Array.from(next.values()));
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const activeSet = useMemo(() => new Set(activeOrderDeviceIds), [activeOrderDeviceIds]);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (activeSet.has(device.serial_number)) {
        return false;
      }
      const warnings = extractWarnings(device.warning_message);
      const hasWaste = warnings.some((warning) => /waste toner/i.test(warning));
      const hasLow = hasLowToner(device);
      if (filter === "issues") {
        return warnings.length > 0 || hasLow;
      }
      if (filter === "warnings") {
        return warnings.length > 0;
      }
      if (filter === "waste") {
        return hasWaste;
      }
      return true;
    });
  }, [devices, activeSet, filter]);

  const deviceViews = useMemo<DeviceView[]>(() => {
    return filteredDevices.map((device) => {
      const warningSet = new Set(extractWarnings(device.warning_message));
      const tonerValues = TONER_CONFIG.map(({ key, label, color }) => {
        const value = sanitizeValue(device[TONER_FIELD_MAP[key]]);
        if (value !== null) {
          if (value < 20) {
            warningSet.add(`Low toner (${label})`);
          } else if (value < 50) {
            warningSet.add(`Moderate toner (${label})`);
          }
        }
        return { key, label, color, value };
      });
      const wasteValue = sanitizeValue(device.waste_toner_percent);
      let wasteWarning: string | null = null;
      if (wasteValue !== null && wasteValue >= 95) {
        wasteWarning = `Waste ${Math.round(wasteValue)}%`;
        warningSet.add(wasteWarning);
      }
      const warnings = Array.from(warningSet);
      const lowCount = tonerValues.filter((item) => typeof item.value === "number" && item.value < 20).length;
      const status: DeviceStatus = warnings.some((warning) => /waste|low|empty/i.test(warning))
        ? "critical"
        : warnings.length > 0
        ? "warning"
        : "ok";
      return {
        device,
        warnings,
        status,
        tonerValues,
        wasteValue,
        wasteWarning,
        issueCount: warnings.length,
        lowCount,
      };
    });
  }, [filteredDevices]);

  const grouped = useMemo(() => ({
    critical: deviceViews.filter((view) => view.status === "critical"),
    warning: deviceViews.filter((view) => view.status === "warning"),
    ok: deviceViews.filter((view) => view.status === "ok"),
  }), [deviceViews]);

  const counts = {
    total: devices.length,
    critical: grouped.critical.length,
    warning: grouped.warning.length,
    ok: grouped.ok.length,
  };

  const hiddenCount = devices.length - filteredDevices.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            Showing {filteredDevices.length} of {devices.length} devices{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
          <SegmentedControl options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Devices" value={counts.total} />
        <SummaryCard label="Critical" value={counts.critical} tone="destructive" />
        <SummaryCard label="Warnings" value={counts.warning} tone="warning" />
        <SummaryCard label="OK" value={counts.ok} tone="success" />
      </div>

      <div className="space-y-3">
        {GROUP_META.map((group) => {
          const groupItems = grouped[group.key];
          if (groupItems.length === 0) {
            return null;
          }
          const collapsed = collapsedGroups[group.key];
          return (
            <div key={group.key} className="rounded-2xl border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setCollapsedGroups((prev) => ({
                    ...prev,
                    [group.key]: !prev[group.key],
                  }))
                }
                className="flex w-full items-center justify-between rounded-t-2xl border-b border-border bg-muted/40 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{group.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {groupItems.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{group.description}</span>
                </div>
                <span className="text-sm text-muted-foreground">{collapsed ? "Show" : "Hide"}</span>
              </button>
              {!collapsed && (
                <div className="divide-y divide-border">
                  {groupItems.map((view) => (
                    <DeviceRow key={view.device.serial_number} view={view} density={density} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

}

function DeviceRow({ view, density }: { view: DeviceView; density: Density }) {
  const { device, tonerValues, wasteValue, wasteWarning, warnings, status, issueCount, lowCount } = view;
  const statusMeta = STATUS_META[status];
  const totalIssues = issueCount + lowCount;

  return (
    <div className={cn("transition hover:bg-muted/40", DENSITY_ROW[density], "px-4")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input type="checkbox" className="h-4 w-4 rounded border-border" aria-label={`Select ${device.serial_number}`} />
        <span className={cn("h-2.5 w-2.5 rounded-full", statusMeta.dot)} />
        <div className="flex min-w-[160px] flex-col gap-0">
          <span className="text-sm font-semibold text-foreground">
            {device.customer_name ?? "Unassigned"}
          </span>
          <span className="text-xs text-muted-foreground">
            {device.location ?? "No location"}
          </span>
        </div>
        <Badge className={cn("text-[10px] font-semibold", statusMeta.badgeClass)}>
          {statusMeta.summary} · {totalIssues} issue{totalIssues === 1 ? "" : "s"}
        </Badge>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {tonerValues.map(({ key, label, color, value }) => (
            <TonerBar key={key} label={label} value={value} density={density} color={color} />
          ))}
        </div>
        <WasteIndicator value={wasteValue} warning={wasteWarning} density={density} />
        <WarningsSummary warnings={warnings} status={status} totalIssues={totalIssues} />
      </div>
      <div className="flex flex-wrap items-center gap-3 pl-8 text-xs text-muted-foreground">
        <span>SN: {device.serial_number}</span>
        <span>• Updated {formatRelativeTime(device.last_updated_at ?? device.updated_at)}</span>
        <span className="flex items-center gap-2 text-sm text-foreground">
          <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {formatShortCount(device.counter_total)}</span>
          <span className="inline-flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> {formatShortCount(device.counter_color)}</span>
          <span className="inline-flex items-center gap-1"><Printer className="h-3.5 w-3.5" /> {formatShortCount(device.counter_mono)}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/devices/${encodeURIComponent(device.serial_number)}`}>
              <Eye className="h-3.5 w-3.5" /> View
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={`/devices/${encodeURIComponent(device.serial_number)}/settings`}>
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function WasteIndicator({ value, warning, density }: { value: number | null; warning: string | null; density: Density }) {
  const badgeClass = warning
    ? "bg-destructive/10 text-destructive"
    : value !== null && value >= 80
    ? "bg-amber-100 text-amber-700"
    : "bg-neutral-100 text-neutral-600";

  return (
    <div className="flex items-center gap-2">
      <TonerBar label="Waste" value={value} density={density} color="#6B7280" />
      {value !== null ? (
        <Badge className={cn("text-[10px]", badgeClass)}>Waste {Math.round(value)}%</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Waste --
        </Badge>
      )}
    </div>
  );
}

function WarningsSummary({ warnings, status, totalIssues }: { warnings: string[]; status: DeviceStatus; totalIssues: number }) {
  const statusMeta = STATUS_META[status];

  if (totalIssues === 0) {
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">No issues</Badge>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge className={cn("w-fit text-[10px]", statusMeta.badgeClass)}>
        {statusMeta.summary} · {totalIssues}
      </Badge>
      <div className="flex flex-wrap gap-1.5">
        {warnings.slice(0, 2).map((warning) => {
          const variant = WARNING_VARIANTS.find((entry) => entry.match.test(warning));
          return (
            <Badge key={warning} className={cn("text-[10px]", variant?.className ?? "bg-neutral-200 text-neutral-700")}> 
              {warning}
            </Badge>
          );
        })}
        {warnings.length > 2 ? (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">+{warnings.length - 2}</Badge>
        ) : null}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "ghost"}
          size="sm"
          className={cn("rounded-full px-3", value === option.value ? "shadow" : "text-muted-foreground")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "warning" | "success" }) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
      ? "text-amber-600"
      : tone === "success"
      ? "text-emerald-600"
      : "text-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function normalizeDevices(devices: DeviceRow[]) {
  const map = new Map<string, DeviceRow>();
  for (const device of devices) {
    map.set(device.serial_number, device);
  }
  return Array.from(map.values()).sort((a, b) => {
    const nameA = a.customer_name ?? "";
    const nameB = b.customer_name ?? "";
    return nameA.localeCompare(nameB);
  });
}

function extractWarnings(raw: string | null | undefined) {
  return (raw ?? "")
    .split(/\s*(?:\u2022|\||\n|;)+\s*/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sanitizeValue(raw: unknown): number | null {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasLowToner(device: DeviceRow) {
  return TONER_CONFIG.some(({ key }) => {
    const value = sanitizeValue(device[TONER_FIELD_MAP[key]]);
    return typeof value === "number" && value > 0 && value < 20;
  });
}


function formatShortCount(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "--";
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}
