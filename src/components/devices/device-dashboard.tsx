"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DeviceCard,
  type DeviceStatusMeta,
  type TonerSnapshot,
  type SupplyScope,
  type WarningScope,
} from "@/components/devices/device-card";
import {
  computeDeviceStatus,
  computeMutedScopes,
  computeTonerSnapshots,
  getDeviceLastUpdatedIso,
  DEFAULT_TONER_THRESHOLD,
  type DeviceStatus,
} from "./device-dashboard-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconUpload } from "@/components/ui/icons";
import { formatRelativeTime, cn } from "@/lib/utils";
import type {
  DeviceAlertSettingsRow,
  DeviceWarningOverrideRow,
  GasGageRow,
} from "@/lib/database.types";
import type { DeviceOrderPayload } from "@/lib/orders/create-supply-order";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Filter, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

type StatusFilter = DeviceStatus | "all";

type DevicesDashboardProps = {
  devices: GasGageRow[];
  alertSettings: DeviceAlertSettingsRow[];
  warningOverrides: DeviceWarningOverrideRow[];
  activeOrderDeviceIds: string[];
  activeOrders: Array<{
    device_id: string;
    status: string;
    toner_color: string | null;
    order_type: string | null;
    ordered_at: string | null;
  }>;
  ordersError?: string;
  settingsError?: string;
  overridesError?: string;
  renderedAt: number;
};

type EnrichedDevice = {
  device: GasGageRow;
  tonerLevels: TonerSnapshot[];
  status: DeviceStatus;
  statusMeta: DeviceStatusMeta;
  lastUpdatedLabel: string;
  mutedScopes: WarningScope[];
  canDismiss: boolean;
  canRestore: boolean;
  hasActiveOrder: boolean;
  needsAttention: boolean;
  automationEnabled: boolean;
  customerLabel: string;
};

type AttentionFilter = "needs_attention" | "active_orders" | "all";

const STATUS_META: Record<DeviceStatus, DeviceStatusMeta & { tone: string }> = {
  critical: {
    label: "Critical",
    accentClass: "from-red-500 via-rose-500 to-pink-500",
    badgeClass: "border-red-400 bg-red-50 text-red-600 dark:border-red-500/70 dark:bg-red-500/15 dark:text-red-200",
    tone: "text-red-600 dark:text-red-300",
  },
  warning: {
    label: "Warning",
    accentClass: "from-amber-400 via-amber-500 to-orange-500",
    badgeClass: "border-amber-400 bg-amber-50 text-amber-600 dark:border-amber-500/70 dark:bg-amber-500/15 dark:text-amber-200",
    tone: "text-amber-600 dark:text-amber-200",
  },
  ok: {
    label: "OK",
    accentClass: "from-emerald-400 via-emerald-500 to-teal-500",
    badgeClass: "border-emerald-400 bg-emerald-50 text-emerald-600 dark:border-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-200",
    tone: "text-emerald-600 dark:text-emerald-200",
  },
};

const STATUS_ORDER: Record<DeviceStatus, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
};

const ROW_ESTIMATE = 560;
const VIRTUAL_THRESHOLD = 9;

const ORDER_SCOPE_LABEL: Record<SupplyScope, string> = {
  black: "Black toner",
  cyan: "Cyan toner",
  magenta: "Magenta toner",
  yellow: "Yellow toner",
  waste: "Waste toner",
};

const getCustomerLabel = (value: string | null | undefined): string => {
  if (!value) {
    return "Unassigned";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Unassigned";
};

const ATTENTION_FILTER_OPTIONS: Array<{
  value: AttentionFilter;
  label: string;
}> = [
  { value: "needs_attention", label: "Needs action" },
  { value: "active_orders", label: "Active orders" },
  { value: "all", label: "All devices" },
];

type ThresholdMap = Record<"black" | "cyan" | "magenta" | "yellow", number>;

const DEFAULT_THRESHOLD_MAP: ThresholdMap = {
  black: DEFAULT_TONER_THRESHOLD,
  cyan: DEFAULT_TONER_THRESHOLD,
  magenta: DEFAULT_TONER_THRESHOLD,
  yellow: DEFAULT_TONER_THRESHOLD,
};

const COLOR_INPUTS: Array<{ key: keyof ThresholdMap; label: string }> = [
  { key: "black", label: "Black" },
  { key: "cyan", label: "Cyan" },
  { key: "magenta", label: "Magenta" },
  { key: "yellow", label: "Yellow" },
];

const ORDER_SCOPE_OPTIONS: Array<{ value: SupplyScope; label: string }> = [
  { value: "black", label: ORDER_SCOPE_LABEL.black },
  { value: "cyan", label: ORDER_SCOPE_LABEL.cyan },
  { value: "magenta", label: ORDER_SCOPE_LABEL.magenta },
  { value: "yellow", label: ORDER_SCOPE_LABEL.yellow },
  { value: "waste", label: ORDER_SCOPE_LABEL.waste },
];

export function DevicesDashboard({
  devices,
  alertSettings,
  warningOverrides,
  activeOrderDeviceIds,
  activeOrders,
  ordersError,
  settingsError,
  overridesError,
  renderedAt,
}: DevicesDashboardProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingDismiss, setPendingDismiss] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [columns, setColumns] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<
    Record<string, { deviceId: string | null }>
  >({});
  const [bulkThresholds, setBulkThresholds] = useState<ThresholdMap>(
    () => ({ ...DEFAULT_THRESHOLD_MAP })
  );
  const [warningAction, setWarningAction] =
    useState<"none" | "mute" | "unmute">("none");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkOrderScope, setBulkOrderScope] = useState<SupplyScope>("black");
  const [bulkOrderLoading, setBulkOrderLoading] = useState(false);
  const [attentionFilter, setAttentionFilter] =
    useState<AttentionFilter>("needs_attention");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [automationFilter, setAutomationFilter] =
    useState<"auto" | "manual" | "all">("auto");
  const [automationAction, setAutomationAction] =
    useState<"leave" | "enable" | "disable">("leave");

  const activeColumns = selectionMode ? 1 : columns;

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      const next = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
      setColumns((prev) => (prev === next ? prev : next));
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const devicesBySerial = useMemo(() => {
    const map = new Map<string, GasGageRow>();
    for (const device of devices) {
      if (device.serial_number) {
        map.set(device.serial_number.trim(), device);
      }
    }
    return map;
  }, [devices]);

  const selectedEntries = useMemo(
    () => Object.entries(selectedDevices),
    [selectedDevices]
  );
  const selectedCount = selectedEntries.length;
  const hasSelection = selectedCount > 0;
  const isBulkBusy = bulkLoading || bulkOrderLoading;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (next) {
        setBulkThresholds({ ...DEFAULT_THRESHOLD_MAP });
        setBulkOrderScope("black");
        setAutomationAction("leave");
      } else {
        setSelectedDevices({});
        setWarningAction("none");
        setBulkThresholds({ ...DEFAULT_THRESHOLD_MAP });
        setBulkOrderScope("black");
        setAutomationAction("leave");
      }
      return next;
    });
  }, []);

  const updateThresholdValue = useCallback((color: keyof ThresholdMap, value: number) => {
    setBulkThresholds((previous) => ({
      ...previous,
      [color]: value,
    }));
  }, []);

  const handleToggleDeviceSelection = useCallback(
    (device: GasGageRow, nextSelected: boolean) => {
      const serial = typeof device.serial_number === "string" ? device.serial_number.trim() : "";
      if (!serial) {
        return;
      }
      const normalizedDeviceId =
        typeof device.device_id === "string" ? device.device_id.trim() : "";
      setSelectedDevices((previous) => {
        const next = { ...previous };
        if (nextSelected) {
          next[serial] = {
            deviceId: normalizedDeviceId || serial,
          };
        } else {
          delete next[serial];
        }
        return next;
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedDevices({});
    setWarningAction("none");
    setBulkThresholds({ ...DEFAULT_THRESHOLD_MAP });
    setBulkOrderScope("black");
    setAutomationAction("leave");
  }, []);

  const applyBulkChanges = useCallback(async () => {
    const entries = Object.entries(selectedDevices);
    if (entries.length === 0) {
      toast({
        title: "No devices selected",
        description: "Select at least one device to manage alerts.",
        variant: "destructive",
      });
      return;
    }

    const sanitize = (value: number) =>
      Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), 100) : 15;
    const sanitizedThresholds: ThresholdMap = {
      black: sanitize(bulkThresholds.black),
      cyan: sanitize(bulkThresholds.cyan),
      magenta: sanitize(bulkThresholds.magenta),
      yellow: sanitize(bulkThresholds.yellow),
    };

    setBulkLoading(true);
    try {
      const { deviceIds, serialNumbers } = entries.reduce(
        (acc, [serial, value]) => {
          const trimmedSerial = serial.trim();
          const resolvedId = value.deviceId?.trim() ?? "";
          if (resolvedId.length > 0) {
            acc.deviceIds.push(resolvedId);
            acc.serialNumbers.push(trimmedSerial);
          }
          return acc;
        },
        { deviceIds: [] as string[], serialNumbers: [] as string[] }
      );

      if (deviceIds.length === 0) {
        throw new Error(
          "No selected devices have valid device IDs. Please pick devices that exist in Supabase."
        );
      }

      const body: {
        deviceIds: string[];
        serialNumbers: string[];
        thresholds: ThresholdMap;
        warningAction?: "none" | "mute" | "unmute";
        automationAction?: "leave" | "enable" | "disable";
      } = {
        deviceIds,
        serialNumbers,
        thresholds: sanitizedThresholds,
      };

      if (warningAction !== "none") {
        body.warningAction = warningAction;
      }

      body.automationAction = automationAction;

      const response = await fetch("/api/device-alert-settings/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update alert settings.");
      }

      const skippedCount = typeof payload?.skipped === "number" ? payload.skipped : 0;
      const appliedCount = Math.max(entries.length - skippedCount, 0);

      toast({
        title: "Alerts updated",
        description:
          appliedCount > 0
            ? `Applied changes to ${appliedCount} device${appliedCount === 1 ? "" : "s"}.`
            : "No devices were updated.",
      });

      if (skippedCount > 0) {
        toast({
          title: "Some devices were skipped",
          description: `${skippedCount} device${skippedCount === 1 ? " was" : "s were"} not updated because Supabase does not contain a matching device ID.`,
        });
      }

      if (appliedCount > 0) {
        router.refresh();
      }

      if (skippedCount === 0) {
        setSelectedDevices({});
        setWarningAction("none");
        setBulkThresholds({ ...DEFAULT_THRESHOLD_MAP });
        setSelectionMode(false);
      } else {
        setBulkThresholds({ ...DEFAULT_THRESHOLD_MAP });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to update alerts",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while applying changes.",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
      setAutomationAction("leave");
    }
  }, [selectedDevices, bulkThresholds, warningAction, automationAction, router, toast]);

  const settingsByDevice = useMemo(() => {
    const map = new Map<string, DeviceAlertSettingsRow>();
    for (const setting of alertSettings) {
      const key = typeof setting.device_id === "string" ? setting.device_id.trim() : "";
      if (key) {
        map.set(key, setting);
      }
    }
    return map;
  }, [alertSettings]);

  const overridesBySerial = useMemo(() => {
    const map = new Map<string, DeviceWarningOverrideRow[]>();
    for (const override of warningOverrides) {
      const key =
        typeof override.serial_number === "string" ? override.serial_number.trim() : "";
      if (!key) {
        continue;
      }
      const list = map.get(key) ?? [];
      list.push(override);
      map.set(key, list);
    }
    return map;
  }, [warningOverrides]);

  const activeOrderSet = useMemo(() => {
    return new Set(
      activeOrderDeviceIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    );
  }, [activeOrderDeviceIds]);

  // Map orders by device and toner color
  const ordersByDevice = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const order of activeOrders) {
      const key = order.device_id?.trim();
      if (!key) {
        continue;
      }
      const colors = map.get(key) ?? new Set<string>();
      if (order.toner_color) {
        colors.add(order.toner_color);
      } else if (order.order_type === "waste_toner") {
        colors.add("waste");
      } else {
        colors.add("waste");
      }
      map.set(key, colors);
    }
    return map;
  }, [activeOrders]);

  const bulkOrderAnalysis = useMemo(() => {
    const eligible: DeviceOrderPayload[] = [];
    let conflictCount = 0;
    let missingCount = 0;

    const scopeKeyValue = bulkOrderScope === "waste" ? "waste" : bulkOrderScope;

    for (const [serial, meta] of selectedEntries) {
      const trimmedSerial = serial.trim();
      if (!trimmedSerial) {
        missingCount += 1;
        continue;
      }
      const device = devicesBySerial.get(trimmedSerial);
      if (!device) {
        missingCount += 1;
        continue;
      }

      const keysToCheck = new Set<string>();
      keysToCheck.add(trimmedSerial);
      if (meta.deviceId) {
        keysToCheck.add(meta.deviceId.trim());
      }
      if (device.device_id) {
        keysToCheck.add(device.device_id.trim());
      }

      let hasExisting = false;
      for (const key of keysToCheck) {
        if (!key) continue;
        const scopes = ordersByDevice.get(key);
        if (scopes?.has(scopeKeyValue)) {
          hasExisting = true;
          break;
        }
      }

      if (hasExisting) {
        conflictCount += 1;
        continue;
      }

      eligible.push({
        serial_number: device.serial_number,
        device_id: meta.deviceId ?? device.device_id ?? device.serial_number,
        customer: device.customer,
        model: device.model,
        device_location: device.device_location,
        latest_receive_date: device.latest_receive_date,
        updated_at: device.updated_at,
        created_at: device.created_at,
        black: device.black,
        cyan: device.cyan,
        magenta: device.magenta,
        yellow: device.yellow,
      });
    }

    return {
      eligible,
      conflictCount,
      missingCount,
    };
  }, [selectedEntries, devicesBySerial, ordersByDevice, bulkOrderScope]);

  const handleBulkOrderCreate = useCallback(async () => {
    if (!hasSelection) {
      toast({
        title: "No devices selected",
        description: "Select at least one device to create supply orders.",
        variant: "destructive",
      });
      return;
    }

    const eligibleDevices = bulkOrderAnalysis.eligible;
    if (eligibleDevices.length === 0) {
      const message =
        bulkOrderAnalysis.conflictCount > 0
          ? "All selected devices already have an active order for this supply."
          : "Selected devices are missing serial numbers required to create orders.";
      toast({
        title: "No eligible devices",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setBulkOrderLoading(true);
    try {
      const response = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: bulkOrderScope,
          devices: eligibleDevices,
          skipExisting: true,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create supply orders.");
      }

      const createdCount =
        typeof payload?.created === "number" ? payload.created : eligibleDevices.length;
      const skippedExisting =
        typeof payload?.skippedDueToExisting === "number" ? payload.skippedDueToExisting : 0;
      const skippedMissing =
        typeof payload?.skippedDueToMissingSerial === "number"
          ? payload.skippedDueToMissingSerial
          : 0;
      const skippedDuplicates =
        typeof payload?.skippedDueToDuplicates === "number"
          ? payload.skippedDueToDuplicates
          : 0;
      const errorMessages: string[] = Array.isArray(payload?.errors) ? payload.errors : [];

      if (createdCount > 0) {
        toast({
          title: "Orders created",
          description: `Created ${createdCount} supply order${
            createdCount === 1 ? "" : "s"
          } for the selected devices.`,
        });
      }

      if (skippedExisting > 0) {
        toast({
          title: "Active orders detected",
          description: `${skippedExisting} device${
            skippedExisting === 1 ? " already has" : "s already have"
          } an open order for ${ORDER_SCOPE_LABEL[bulkOrderScope].toLowerCase()}. They were skipped.`,
        });
      }

      if (skippedMissing > 0 || skippedDuplicates > 0) {
        toast({
          title: "Some devices were skipped",
          description: [
            skippedMissing > 0
              ? `${skippedMissing} missing serial number${skippedMissing === 1 ? "" : "s"}`
              : null,
            skippedDuplicates > 0
              ? `${skippedDuplicates} duplicate selection${skippedDuplicates === 1 ? "" : "s"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      }

      if (errorMessages.length > 0) {
        toast({
          title: "Issues creating orders",
          description: errorMessages.slice(0, 3).join(" "),
          variant: "destructive",
        });
      }

      if (createdCount > 0) {
        router.refresh();
        if (
          errorMessages.length === 0 &&
          skippedExisting === 0 &&
          skippedMissing === 0 &&
          skippedDuplicates === 0
        ) {
          clearSelection();
          setSelectionMode(false);
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to create orders",
        description:
          error instanceof Error ? error.message : "Something went wrong while creating orders.",
        variant: "destructive",
      });
    } finally {
      setBulkOrderLoading(false);
    }
  }, [
    hasSelection,
    bulkOrderAnalysis,
    bulkOrderScope,
    toast,
    clearSelection,
    router,
  ]);

  const enrichedDevices = useMemo<EnrichedDevice[]>(() => {
    return devices.map((device) => {
      const deviceId = typeof device.device_id === "string" ? device.device_id.trim() : "";
      const serial = typeof device.serial_number === "string" ? device.serial_number.trim() : "";
      const settings = deviceId ? settingsByDevice.get(deviceId) : undefined;
      const deviceOverrides = overridesBySerial.get(serial) ?? [];
      const mutedScopes = computeMutedScopes(device, deviceOverrides);
      const combinedOrders = new Set<string>();
      if (serial) {
        const bySerial = ordersByDevice.get(serial);
        bySerial?.forEach((value) => combinedOrders.add(value));
      }
      if (deviceId) {
        const byId = ordersByDevice.get(deviceId);
        byId?.forEach((value) => combinedOrders.add(value));
      }

      const deviceOrders = combinedOrders.size > 0 ? combinedOrders : undefined;
      const tonerLevels = computeTonerSnapshots(device, settings, mutedScopes, deviceOrders);
      const status = computeDeviceStatus(tonerLevels, mutedScopes);
      const { label, accentClass, badgeClass } = STATUS_META[status];
      const visualMeta: DeviceStatusMeta = { label, accentClass, badgeClass };
      const lastUpdatedIso = getDeviceLastUpdatedIso(device);
      const customerLabel = getCustomerLabel(device.customer);
      const automationEnabled = settings?.alerts_enabled !== false;
      const hasActiveOrder = combinedOrders.size > 0;
      const needsAttention =
        status !== "ok" &&
        tonerLevels.some((level) => {
          if (level.muted) {
            return false;
          }
          const value = level.value;
          const isAlerting =
            value === null ||
            value === 0 ||
            (typeof value === "number" && value <= level.threshold);
          return isAlerting && !level.hasActiveOrder;
        });

      return {
        device,
        tonerLevels,
        status,
        statusMeta: visualMeta,
        lastUpdatedLabel: formatRelativeTime(lastUpdatedIso, renderedAt),
        mutedScopes,
        canDismiss: status !== "ok" && !mutedScopes.includes("all") && serial !== "",
        canRestore: mutedScopes.includes("all") && serial !== "",
        hasActiveOrder,
        needsAttention,
        automationEnabled,
        customerLabel,
      };
    });
  }, [devices, overridesBySerial, settingsByDevice, renderedAt, ordersByDevice]);

  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedDevices.forEach((entry) => set.add(entry.customerLabel));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedDevices]);

  useEffect(() => {
    if (customerFilter !== "all" && !customerOptions.includes(customerFilter)) {
      setCustomerFilter("all");
    }
  }, [customerFilter, customerOptions]);

  const automationFilteredDevices = useMemo(() => {
    return enrichedDevices.filter((entry) => {
      if (automationFilter === "auto") {
        return entry.automationEnabled;
      }
      if (automationFilter === "manual") {
        return !entry.automationEnabled;
      }
      return true;
    });
  }, [enrichedDevices, automationFilter]);

  const customerFilteredDevices = useMemo(() => {
    return automationFilteredDevices.filter((entry) => {
      if (customerFilter !== "all" && entry.customerLabel !== customerFilter) {
        return false;
      }
      return true;
    });
  }, [automationFilteredDevices, customerFilter]);

  const counts = useMemo(() => {
    return customerFilteredDevices.reduce(
      (acc, entry) => {
        acc.total += 1;
        acc[entry.status] += 1;
        return acc;
      },
      { total: 0, critical: 0, warning: 0, ok: 0 }
    );
  }, [customerFilteredDevices]);

  const attentionCounts = useMemo(
    () =>
      customerFilteredDevices.reduce(
        (acc, entry) => {
          if (entry.needsAttention) {
            acc.needsAttention += 1;
          }
          if (entry.hasActiveOrder) {
            acc.activeOrders += 1;
          }
          return acc;
        },
        { needsAttention: 0, activeOrders: 0 }
      ),
    [customerFilteredDevices]
  );

  const totalVisible = customerFilteredDevices.length;


  const hiddenManualCount = useMemo(() => {
    if (automationFilter !== "auto") {
      return 0;
    }
    const term = deferredSearchQuery.trim().toLowerCase();

    return enrichedDevices.filter((entry) => {
      if (entry.automationEnabled) {
        return false;
      }
      if (attentionFilter === "needs_attention" && !entry.needsAttention) {
        return false;
      }
      if (attentionFilter === "active_orders" && !entry.hasActiveOrder) {
        return false;
      }
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }
      if (customerFilter !== "all" && entry.customerLabel !== customerFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        entry.customerLabel,
        entry.device.model ?? "",
        entry.device.serial_number ?? "",
        entry.device.device_id ?? "",
        entry.device.device_location ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    }).length;
  }, [
    automationFilter,
    enrichedDevices,
    attentionFilter,
    statusFilter,
    customerFilter,
    deferredSearchQuery,
  ]);
  const filteredDevices = useMemo(() => {
    const term = deferredSearchQuery.trim().toLowerCase();

    return customerFilteredDevices
      .filter((entry) => {
        if (attentionFilter === "needs_attention" && !entry.needsAttention) {
          return false;
        }
        if (attentionFilter === "active_orders" && !entry.hasActiveOrder) {
          return false;
        }
        if (statusFilter !== "all" && entry.status !== statusFilter) {
          return false;
        }
        if (customerFilter !== "all" && entry.customerLabel !== customerFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        const haystack = [
          entry.customerLabel,
          entry.device.model ?? "",
          entry.device.serial_number ?? "",
          entry.device.device_id ?? "",
          entry.device.device_location ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(term);
      })
      .sort((a, b) => {
        const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (byStatus !== 0) return byStatus;

        const nameA = a.customerLabel;
        const nameB = b.customerLabel;
        return nameA.localeCompare(nameB);
      });
  }, [
    customerFilteredDevices,
    deferredSearchQuery,
    statusFilter,
    attentionFilter,
    customerFilter,
  ]);

  const filterLabel =
    statusFilter === "all" ? "All devices" : STATUS_META[statusFilter].label;

  const attentionCountByFilter: Record<AttentionFilter, number> = {
    needs_attention: attentionCounts.needsAttention,
    active_orders: attentionCounts.activeOrders,
    all: counts.total,
  };

  const rowCount = activeColumns > 0 ? Math.ceil(filteredDevices.length / activeColumns) : 0;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 6,
    measureElement: (el) => el?.getBoundingClientRect().height ?? ROW_ESTIMATE,
  });

  const useVirtual = !selectionMode && filteredDevices.length > VIRTUAL_THRESHOLD;

  const measureRow = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        rowVirtualizer.measureElement(node);
      }
    },
    [rowVirtualizer]
  );

  useEffect(() => {
    if (!useVirtual) {
      return;
    }
    rowVirtualizer.measure();
  }, [useVirtual, rowVirtualizer, rowCount, activeColumns]);

  const handleDismissWarnings = useCallback(
    async (device: GasGageRow) => {
      if (!device.serial_number) {
        toast({
          title: "Unable to dismiss alerts",
          description: "This device does not have a serial number associated yet.",
          variant: "destructive",
        });
        return;
      }

      setPendingDismiss(device.serial_number);
      const timestamp = new Date().toISOString();
      const { error } = await supabase.from("device_warning_overrides").upsert(
        {
          device_id: device.device_id ?? null,
          serial_number: device.serial_number,
          scope: "all",
          dismissed_at: timestamp,
          updated_at: timestamp,
        },
        { onConflict: "serial_number,scope" }
      );

      if (error) {
        console.error(error);
        toast({
          title: "Failed to dismiss warnings",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Warnings dismissed",
          description: "Alerts will re-appear when fresh telemetry is imported.",
        });
        router.refresh();
      }

      setPendingDismiss(null);
    },
    [router, supabase, toast]
  );

  const handleRestoreWarnings = useCallback(
    async (device: GasGageRow) => {
      if (!device.serial_number) {
        return;
      }
      setPendingDismiss(device.serial_number);
      const { error } = await supabase
        .from("device_warning_overrides")
        .delete()
        .eq("serial_number", device.serial_number)
        .eq("scope", "all");

      if (error) {
        console.error(error);
        toast({
          title: "Failed to restore warnings",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Warnings restored",
          description: "Alerts will now be displayed for this device.",
        });
        router.refresh();
      }

      setPendingDismiss(null);
    },
    [router, supabase, toast]
  );

  const handleCreateSupplyOrder = useCallback(
    async (device: GasGageRow, scope: SupplyScope) => {
      if (!device.serial_number) {
        toast({
          title: "Unable to create order",
          description: "Device serial number is required to log an order.",
          variant: "destructive",
        });
        return;
      }

      const key = `${device.serial_number}-${scope}`;
      setPendingOrder(key);

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          device: {
            serial_number: device.serial_number,
            device_id: device.device_id,
            customer: device.customer,
            model: device.model,
            device_location: device.device_location,
            latest_receive_date: device.latest_receive_date,
            updated_at: device.updated_at,
            created_at: device.created_at,
            black: device.black,
            cyan: device.cyan,
            magenta: device.magenta,
            yellow: device.yellow,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(payload);
        toast({
          title: "Order not created",
          description:
            payload?.error ?? "Failed to create supply order. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Order logged",
          description: `Created a ${
            scope === "waste" ? "waste toner" : `${scope} toner`
          } order for ${device.customer ?? device.serial_number}.`,
        });
        router.refresh();
      }

      setPendingOrder(null);
    },
    [router, toast]
  );

  return (
    <div className="border-border/50 from-background via-secondary/20 to-secondary/40 relative overflow-hidden rounded-3xl border bg-gradient-to-b">
      <div className="from-primary/10 to-primary/10 absolute inset-x-0 top-0 h-32 bg-gradient-to-r via-transparent blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <span className="border-border/60 bg-background/70 rounded-full border px-3 py-1">
              Device overview
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="gap-2">
              <Link href="/devices/import">
                <IconUpload className="h-4 w-4" />
                Import latest CSV
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/orders">View open orders</Link>
            </Button>
          </div>
        </header>

        {(ordersError || settingsError || overridesError) && (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900">
            <p className="font-semibold">Heads up</p>
            <ul className="list-inside list-disc space-y-1">
              {ordersError ? (
                <li>Orders data could not be refreshed: {ordersError}</li>
              ) : null}
              {settingsError ? (
                <li>Alert settings may be stale: {settingsError}</li>
              ) : null}
              {overridesError ? (
                <li>Warning overrides could not be loaded: {overridesError}</li>
              ) : null}
            </ul>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard
            label="Total devices"
            value={counts.total}
            active={statusFilter === "all"}
            tone="text-foreground"
            onClick={() => setStatusFilter("all")}
          />
          <StatusCard
            label="Critical"
            value={counts.critical}
            active={statusFilter === "critical"}
            tone={STATUS_META.critical.tone}
            onClick={() => setStatusFilter("critical")}
          />
          <StatusCard
            label="Warning"
            value={counts.warning}
            active={statusFilter === "warning"}
            tone={STATUS_META.warning.tone}
            onClick={() => setStatusFilter("warning")}
          />
          <StatusCard
            label="Healthy"
            value={counts.ok}
            active={statusFilter === "ok"}
            tone={STATUS_META.ok.tone}
            onClick={() => setStatusFilter("ok")}
          />
        </section>

        <section className="border-border/60 bg-card/70 flex flex-col gap-4 rounded-2xl border p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by customer, model, serial, or device ID..."
                className="border-border h-11 rounded-xl bg-transparent pl-10"
              />
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 gap-2 rounded-xl">
                    <Filter className="h-4 w-4" />
                    {filterLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All devices
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("critical")}>
                    Critical only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("warning")}>
                    Warning only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("ok")}>
                    Healthy only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <select
                value={customerFilter}
                onChange={(event) => setCustomerFilter(event.target.value)}
                className="h-11 min-w-[180px] rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background/80"
                aria-label="Filter by customer"
              >
                <option value="all">All customers</option>
                {customerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={automationFilter}
                onChange={(event) =>
                  setAutomationFilter(event.target.value as "auto" | "all" | "manual")
                }
                className="h-11 min-w-[200px] rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background/80"
                aria-label="Automation filter"
              >
                <option value="auto">Auto-managed only</option>
                <option value="all">All devices</option>
                <option value="manual">Manual orders only</option>
              </select>
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                className="h-11 rounded-xl"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? "Close bulk actions" : "Bulk actions"}
              </Button>
              <Badge variant="outline" className="w-fit rounded-full px-4 py-1">
                Showing {filteredDevices.length} of {totalVisible} devices
              </Badge>
              {hiddenManualCount > 0 ? (
                <Badge variant="secondary" className="w-fit rounded-full px-4 py-1 text-xs">
                  Hiding {hiddenManualCount} manual-order device
                  {hiddenManualCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ATTENTION_FILTER_OPTIONS.map((option) => {
              const count = attentionCountByFilter[option.value];
              return (
                <Button
                  key={option.value}
                  variant={attentionFilter === option.value ? "secondary" : "outline"}
                  className="h-9 rounded-full px-4"
                  onClick={() => setAttentionFilter(option.value)}
                >
                  {option.label}
                  <span className="ml-2 rounded-full bg-background/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
          {selectionMode ? (
            <div className="border-border/60 bg-background/80 flex flex-col gap-5 rounded-xl border p-4 shadow-sm dark:bg-background/60">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedCount} device{selectedCount === 1 ? "" : "s"} selected
                </p>
                <p className="text-muted-foreground text-xs">
                  Update alert thresholds or create supply orders for every selected device in one place.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border-border/60 bg-card/60 flex flex-col gap-4 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Alert settings</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Adjust toner thresholds and warning behaviour across the selected devices.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {COLOR_INPUTS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex flex-col text-xs font-medium uppercase text-muted-foreground"
                      >
                        {label} threshold (%)
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={bulkThresholds[key]}
                          onChange={(event) => {
                            const nextValue = Number.parseInt(event.target.value, 10);
                            const clamped = Number.isNaN(nextValue)
                              ? 0
                              : Math.min(Math.max(nextValue, 0), 100);
                            updateThresholdValue(key, clamped);
                          }}
                          className="mt-1 h-10 rounded-lg border-border bg-card"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="flex flex-col text-xs font-medium uppercase text-muted-foreground lg:w-full">
                    Warning behaviour
                    <select
                      value={warningAction}
                      onChange={(event) =>
                        setWarningAction(event.target.value as "none" | "mute" | "unmute")
                      }
                      className="mt-1 h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      <option value="none">Leave as-is</option>
                      <option value="mute">Mute warnings</option>
                      <option value="unmute">Enable warnings</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-xs font-medium uppercase text-muted-foreground lg:w-full">
                    Automation mode
                    <select
                      value={automationAction}
                      onChange={(event) =>
                        setAutomationAction(
                          event.target.value as "leave" | "enable" | "disable"
                        )
                      }
                      className="mt-1 h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      <option value="leave">Keep existing behaviour</option>
                      <option value="enable">Enable auto-managed alerts</option>
                      <option value="disable">Manual orders only (hide from main view)</option>
                    </select>
                    <span className="mt-1 text-[11px] normal-case text-muted-foreground">
                      Manual devices are excluded from the dashboard when the automation filter is set to auto-managed.
                    </span>
                  </label>
                  <Button
                    onClick={applyBulkChanges}
                    disabled={!hasSelection || isBulkBusy}
                    className="rounded-full px-5"
                  >
                    {bulkLoading ? "Applying..." : "Apply changes"}
                  </Button>
                </div>
                <div className="border-border/60 bg-card/60 flex flex-col gap-4 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Supply orders</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Create identical supply orders for each eligible device in your selection.
                    </p>
                  </div>
                  <label className="flex flex-col text-xs font-medium uppercase text-muted-foreground">
                    Supply type
                    <select
                      value={bulkOrderScope}
                      onChange={(event) =>
                        setBulkOrderScope(event.target.value as SupplyScope)
                      }
                      className="mt-1 h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    >
                      {ORDER_SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      {bulkOrderAnalysis.eligible.length} device
                      {bulkOrderAnalysis.eligible.length === 1 ? " is" : "s are"} ready for{" "}
                      {ORDER_SCOPE_LABEL[bulkOrderScope].toLowerCase()} orders.
                    </p>
                    {bulkOrderAnalysis.conflictCount > 0 ? (
                      <p className="text-amber-600">
                        {bulkOrderAnalysis.conflictCount} already have an open order for this supply and will be skipped.
                      </p>
                    ) : null}
                    {bulkOrderAnalysis.missingCount > 0 ? (
                      <p className="text-amber-600">
                        {bulkOrderAnalysis.missingCount} cannot be processed without a serial number.
                      </p>
                    ) : null}
                  </div>
                  <Button
                    onClick={handleBulkOrderCreate}
                    disabled={
                      !hasSelection || isBulkBusy || bulkOrderAnalysis.eligible.length === 0
                    }
                    className="rounded-full px-5"
                  >
                    {bulkOrderLoading
                      ? "Creating..."
                      : `Create ${ORDER_SCOPE_LABEL[bulkOrderScope].toLowerCase()} orders`}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={clearSelection}
                  disabled={!hasSelection || isBulkBusy}
                  className="rounded-full"
                >
                  Clear selection
                </Button>
              </div>
            </div>
          ) : null}
          {filteredDevices.length === 0 ? (
            <div className="border-border/70 bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <h2 className="text-foreground text-lg font-semibold">
                No devices match your filters
              </h2>
              <p className="text-muted-foreground text-sm">
                Try adjusting the status filter or clearing the search query.
              </p>
            </div>
          ) : selectionMode ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-border/60 text-sm">
                  <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <span className="sr-only">Select device</span>
                    </th>
                    <th className="px-4 py-3 text-left">Serial</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Automation</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDevices.map((entry, index) => {
                    const serial = (entry.device.serial_number ?? "").trim();
                    const normalizedDeviceId =
                      typeof entry.device.device_id === "string"
                        ? entry.device.device_id.trim()
                        : "";
                    const rowKey = serial || normalizedDeviceId || String(index);
                    const selectionDisabled = !serial || !normalizedDeviceId;
                    const isSelected = Boolean(serial && selectedDevices[serial]);

                    const handleRowToggle = () => {
                      if (selectionDisabled) return;
                      handleToggleDeviceSelection(entry.device, !isSelected);
                    };

                    return (
                      <tr
                        key={rowKey}
                        onClick={handleRowToggle}
                        className={cn(
                          "border-l-2 border-transparent transition-colors",
                          selectionDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/40",
                          isSelected && "border-primary bg-primary/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            checked={isSelected}
                            disabled={selectionDisabled}
                            onChange={(event) => {
                              event.stopPropagation();
                              if (selectionDisabled) return;
                              handleToggleDeviceSelection(entry.device, event.target.checked);
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {serial || "Unknown"}
                        </td>
                        <td className="px-4 py-3">
                          {entry.customerLabel}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.device.model ?? "Unknown model"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.device.device_location ?? "Unknown location"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.automationEnabled ? "Auto-managed" : "Manual only"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {serial ? (
                            <Link
                              href={`/devices/${encodeURIComponent(serial)}`}
                              className="text-primary text-xs font-medium hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              View
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          ) : useVirtual ? (
            <div
              ref={parentRef}
              className="overflow-y-auto pr-2"
              style={{ height: "calc(100vh - 260px)", minHeight: "420px" }}
            >
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowStart = virtualRow.index * activeColumns;
                  const rowItems: ReactNode[] = [];

                  for (let offset = 0; offset < activeColumns; offset++) {
                    const entry = filteredDevices[rowStart + offset];
                    if (!entry) {
                      break;
                    }

                    const serial = (entry.device.serial_number ?? "").trim();
                    const normalizedDeviceId =
                      typeof entry.device.device_id === "string"
                        ? entry.device.device_id.trim()
                        : "";
                    const cardKey =
                      serial || normalizedDeviceId || `${rowStart + offset}`;
                    const dismissing = pendingDismiss === serial;
                    const ordering = pendingOrder?.startsWith(`${serial}-`) ?? false;
                    const deviceTarget =
                      entry.device.serial_number ?? normalizedDeviceId ?? null;
                    const isSelected =
                      selectionMode && !!serial && Boolean(selectedDevices[serial]);
                    const selectionDisabled = !serial || !normalizedDeviceId;
                    const hasActiveOrderForCard =
                      (normalizedDeviceId ? activeOrderSet.has(normalizedDeviceId) : false) ||
                      (serial ? activeOrderSet.has(serial) : false);
                    const toggleSelection =
                      selectionMode && !selectionDisabled
                        ? (nextSelected: boolean) =>
                            handleToggleDeviceSelection(entry.device, nextSelected)
                        : undefined;

                    rowItems.push(
                      <DeviceCard
                        key={cardKey}
                        className="h-full"
                        model={entry.device.model}
                        serialNumber={serial || "Unknown"}
                        customer={entry.device.customer}
                        location={entry.device.device_location}
                        tonerLevels={entry.tonerLevels}
                        lastUpdatedLabel={entry.lastUpdatedLabel}
                        hasActiveOrder={Boolean(hasActiveOrderForCard)}
                        statusMeta={entry.statusMeta}
                        mutedScopes={entry.mutedScopes}
                        dismissLoading={dismissing}
                        orderPending={ordering}
                        onDismissWarnings={
                          !selectionMode && entry.canDismiss
                            ? () => handleDismissWarnings(entry.device)
                            : undefined
                        }
                        onRestoreWarnings={
                          !selectionMode && entry.canRestore
                            ? () => handleRestoreWarnings(entry.device)
                            : undefined
                        }
                        onCreateSupplyOrder={
                          !selectionMode && entry.device.serial_number
                            ? (scope) => handleCreateSupplyOrder(entry.device, scope)
                            : undefined
                        }
                        onSelect={
                          !selectionMode && deviceTarget
                            ? () =>
                                router.push(
                                  `/devices/${encodeURIComponent(deviceTarget)}`
                                )
                            : undefined
                        }
                        selectionMode={selectionMode}
                        selected={isSelected}
                        selectionDisabled={selectionDisabled}
                        onToggleSelect={toggleSelection}
                      />
                    );
                  }

                  if (rowItems.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={virtualRow.key}
                      ref={measureRow}
                      className="absolute right-0 left-0 px-1 pb-6"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        height: virtualRow.size,
                      }}
                    >
                      <div
                        className="grid gap-6"
                        style={{
                          gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                        }}
                      >
                        {rowItems}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                activeColumns === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"
              )}
            >
              {filteredDevices.map((entry, index) => {
                const serial = (entry.device.serial_number ?? "").trim();
                const normalizedDeviceId =
                  typeof entry.device.device_id === "string"
                    ? entry.device.device_id.trim()
                    : "";
                const cardKey = serial || normalizedDeviceId || String(index);
                const dismissing = pendingDismiss === serial;
                const ordering = pendingOrder?.startsWith(`${serial}-`) ?? false;
                const deviceTarget =
                  entry.device.serial_number ?? normalizedDeviceId ?? null;
                const isSelected =
                  selectionMode && !!serial && Boolean(selectedDevices[serial]);
                const selectionDisabled = !serial || !normalizedDeviceId;
                const toggleSelection =
                  selectionMode && !selectionDisabled
                    ? (nextSelected: boolean) =>
                        handleToggleDeviceSelection(entry.device, nextSelected)
                    : undefined;
                const hasActiveOrderForCard =
                  (normalizedDeviceId ? activeOrderSet.has(normalizedDeviceId) : false) ||
                  (serial ? activeOrderSet.has(serial) : false);

                return (
                  <DeviceCard
                    key={cardKey}
                    className="h-full"
                    model={entry.device.model}
                    serialNumber={serial || "Unknown"}
                    customer={entry.device.customer}
                    location={entry.device.device_location}
                    tonerLevels={entry.tonerLevels}
                    lastUpdatedLabel={entry.lastUpdatedLabel}
                    hasActiveOrder={Boolean(hasActiveOrderForCard)}
                    statusMeta={entry.statusMeta}
                    mutedScopes={entry.mutedScopes}
                    dismissLoading={dismissing}
                    orderPending={ordering}
                    onDismissWarnings={
                      !selectionMode && entry.canDismiss
                        ? () => handleDismissWarnings(entry.device)
                        : undefined
                    }
                    onRestoreWarnings={
                      !selectionMode && entry.canRestore
                        ? () => handleRestoreWarnings(entry.device)
                        : undefined
                    }
                    onCreateSupplyOrder={
                      !selectionMode && entry.device.serial_number
                        ? (scope) => handleCreateSupplyOrder(entry.device, scope)
                        : undefined
                    }
                    onSelect={
                      !selectionMode && deviceTarget
                        ? () =>
                            router.push(`/devices/${encodeURIComponent(deviceTarget)}`)
                        : undefined
                    }
                    selectionMode={selectionMode}
                    selected={isSelected}
                    selectionDisabled={selectionDisabled}
                    onToggleSelect={toggleSelection}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type StatusCardProps = {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onClick: () => void;
};

function StatusCard({ label, value, tone, active, onClick }: StatusCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border/70 bg-background/80 focus-visible:ring-primary/40 flex flex-col gap-2 rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none",
        active && "border-primary/40 shadow-md"
      )}
    >
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className={cn("text-3xl font-semibold", tone)}>{value.toLocaleString()}</span>
    </button>
  );
}












