import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HighlightBadge } from "@/components/ui/highlight-badge";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Clock,
  Settings,
  ArrowUpRight,
  Printer,
  Hash,
  BellRing,
  BellOff,
  Package,
  Bell,
  Check,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type WarningScope = "all" | "black" | "cyan" | "magenta" | "yellow" | "waste";

export type SupplyScope = Exclude<WarningScope, "all">;

type TonerColor = "black" | "cyan" | "magenta" | "yellow";

export type TonerSnapshot = {
  key: TonerColor;
  label: string;
  value: number | null;
  threshold: number;
  muted: boolean;
  hasActiveOrder?: boolean;
};

export type DeviceStatusMeta = {
  label: string;
  accentClass: string;
  badgeClass: string;
};

export type DeviceCardProps = {
  model: string | null;
  serialNumber: string;
  customer: string | null;
  location: string | null;
  tonerLevels: TonerSnapshot[];
  wasteTonerPercent?: number | null;
  lastUpdatedLabel: string;
  hasActiveOrder: boolean;
  statusMeta: DeviceStatusMeta;
  mutedScopes: WarningScope[];
  dismissLoading: boolean;
  orderPending: boolean;
  onDismissWarnings?: () => void;
  onRestoreWarnings?: () => void;
  onCreateSupplyOrder?: (scope: SupplyScope) => void;
  onSelect?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelect?: (selected: boolean) => void;
  className?: string;
};

const TONER_STYLES: Record<
  TonerColor,
  { track: string; fill: string; label: string }
> = {
  black: {
    track: "bg-neutral-200 dark:bg-neutral-800",
    fill: "from-neutral-900 via-neutral-800 to-neutral-700 dark:from-neutral-200 dark:via-neutral-300 dark:to-neutral-400",
    label: "text-neutral-900 dark:text-neutral-100",
  },
  cyan: {
    track: "bg-cyan-100 dark:bg-cyan-500/20",
    fill: "from-sky-500 via-cyan-500 to-teal-500 dark:from-sky-400 dark:via-cyan-400 dark:to-teal-300",
    label: "text-cyan-600 dark:text-cyan-200",
  },
  magenta: {
    track: "bg-pink-100 dark:bg-fuchsia-500/20",
    fill: "from-pink-500 via-fuchsia-500 to-rose-500 dark:from-pink-400 dark:via-fuchsia-400 dark:to-rose-300",
    label: "text-pink-600 dark:text-pink-200",
  },
  yellow: {
    track: "bg-amber-100 dark:bg-amber-500/20",
    fill: "from-amber-400 via-amber-500 to-orange-500 dark:from-amber-300 dark:via-amber-400 dark:to-orange-300",
    label: "text-amber-600 dark:text-amber-200",
  },
};

type WasteBadge = {
  className: string;
  label: string;
};

const resolveWasteBadge = (value: number | null | undefined): WasteBadge | null => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  const rounded = Math.round(value);

  if (rounded >= 95) {
    return {
      label: `Waste ${rounded}%`,
      className:
        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-100",
    };
  }

  if (rounded >= 85) {
    return {
      label: `Waste ${rounded}%`,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100",
    };
  }

  if (rounded >= 75) {
    return {
      label: `Waste ${rounded}%`,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
    };
  }

  return null;
};

function DeviceCardComponent({
  model,
  serialNumber,
  customer,
  location,
  tonerLevels,
  wasteTonerPercent,
  lastUpdatedLabel,
  hasActiveOrder,
  statusMeta,
  mutedScopes,
  dismissLoading,
  orderPending,
  onDismissWarnings,
  onRestoreWarnings,
  onCreateSupplyOrder,
  onSelect,
  selectionMode = false,
  selected = false,
  selectionDisabled = false,
  onToggleSelect,
  className,
}: DeviceCardProps) {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  const wasteBadge = resolveWasteBadge(wasteTonerPercent);

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const handleCopySerial = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!serialNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(serialNumber);
      setCopied(true);
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy serial number", error);
    }
  };

  const muteAll = mutedScopes.includes("all");
  const isDismissed = muteAll || mutedScopes.length > 0;
  const isClickable = typeof onSelect === "function";
  const isSelectable = selectionMode && typeof onToggleSelect === "function";
  const handleCardClick = () => {
    if (isSelectable) {
      if (!selectionDisabled) {
        onToggleSelect?.(!selected);
      }
      return;
    }
    if (isClickable) {
      onSelect?.();
    }
  };

  return (
    <Card
      className={cn(
        "group border-border/60 bg-card/95 relative overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        isClickable &&
          !isSelectable &&
          "focus-visible:ring-primary/40 cursor-pointer focus-visible:ring-2 focus-visible:outline-none",
        isSelectable && "cursor-pointer",
        isSelectable && selected && "ring-2 ring-primary/60 border-primary/40 shadow-lg",
        className
      )}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick();
        }
      }}
      role={isClickable || isSelectable ? "button" : undefined}
      tabIndex={isClickable || isSelectable ? 0 : undefined}
    >
      {isSelectable ? (
        <div className="absolute left-4 top-4 z-20">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs transition-colors",
              selectionDisabled
                ? "border-muted-foreground/40 bg-muted/30 text-muted-foreground"
                : selected
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-muted-foreground/60 bg-background/80 text-transparent"
            )}
          >
            <Check className="h-3 w-3" />
          </span>
        </div>
      ) : null}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r transition-colors duration-700",
          statusMeta.accentClass
        )}
      />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-foreground text-lg font-semibold">
              {customer ?? "Unassigned customer"}
            </CardTitle>
            {location ? (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("tracking-wide uppercase", statusMeta.badgeClass)}
              >
                {statusMeta.label}
              </Badge>
              {hasActiveOrder ? (
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-600 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-200"
                >
                  Active order
                </Badge>
              ) : null}
              {isDismissed ? (
                <Badge variant="outline" className="border-muted text-muted-foreground">
                  Dismissed
                </Badge>
              ) : null}
            </div>
            {statusMeta.label !== "OK" ? (
              isDismissed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 rounded-full text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestoreWarnings?.();
                  }}
                  disabled={dismissLoading || !onRestoreWarnings}
                >
                  <BellRing className="h-3.5 w-3.5" />
                  Restore warnings
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 rounded-full text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDismissWarnings?.();
                  }}
                  disabled={dismissLoading || !onDismissWarnings}
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Dismiss warnings
                </Button>
              )
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Printer className="text-muted-foreground h-4 w-4" />
            <span className="text-foreground font-medium">
              {model ?? "Unknown model"}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 pl-6 text-xs tracking-wide uppercase">
            <Hash className="h-3.5 w-3.5" />
            <span className="text-foreground font-mono">{serialNumber}</span>
            <button
              type="button"
              onClick={handleCopySerial}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border border-transparent transition",
                copied
                  ? "border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "text-muted-foreground hover:border-border hover:text-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
              )}
              aria-label={copied ? "Serial number copied" : "Copy serial number"}
              title={copied ? "Copied!" : "Copy serial number"}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {wasteBadge ? (
              <HighlightBadge
                icon="waste"
                className={cn(
                  "ml-1 shrink-0 border border-transparent",
                  wasteBadge.className
                )}
              >
                {wasteBadge.label}
              </HighlightBadge>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {tonerLevels.map((toner) => (
            <TonerLevelBar key={toner.key} toner={toner} />
          ))}
        </div>
      </CardContent>

      <CardFooter className="border-border/60 text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{lastUpdatedLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SupplyOrderMenu
            onCreateSupplyOrder={onCreateSupplyOrder}
            disabled={orderPending || !onCreateSupplyOrder}
            pending={orderPending}
          />
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1"
            onClick={(event) => event.stopPropagation()}
            disabled={selectionMode}
          >
            <Link
              href={`/devices/${encodeURIComponent(serialNumber)}`}
              className={cn(selectionMode && "pointer-events-none opacity-60")}
              tabIndex={selectionMode ? -1 : undefined}
            >
              <ArrowUpRight className="h-4 w-4" />
              View device
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1"
            onClick={(event) => event.stopPropagation()}
            disabled={selectionMode}
          >
            <Link
              href={`/devices/${encodeURIComponent(serialNumber)}/settings`}
              className={cn(selectionMode && "pointer-events-none opacity-60")}
              tabIndex={selectionMode ? -1 : undefined}
            >
              <Settings className="h-4 w-4" />
              Manage alerts
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function SupplyOrderMenu({
  disabled,
  pending,
  onCreateSupplyOrder,
}: {
  disabled: boolean;
  pending: boolean;
  onCreateSupplyOrder?: (scope: SupplyScope) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1 rounded-full"
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
        >
          <Package className="h-4 w-4" />
          {pending ? "Creating..." : "Supply order"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!onCreateSupplyOrder}
          onClick={(event) => {
            event.stopPropagation();
            onCreateSupplyOrder?.("black");
          }}
        >
          Black toner
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onCreateSupplyOrder}
          onClick={(event) => {
            event.stopPropagation();
            onCreateSupplyOrder?.("cyan");
          }}
        >
          Cyan toner
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onCreateSupplyOrder}
          onClick={(event) => {
            event.stopPropagation();
            onCreateSupplyOrder?.("magenta");
          }}
        >
          Magenta toner
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onCreateSupplyOrder}
          onClick={(event) => {
            event.stopPropagation();
            onCreateSupplyOrder?.("yellow");
          }}
        >
          Yellow toner
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!onCreateSupplyOrder}
          onClick={(event) => {
            event.stopPropagation();
            onCreateSupplyOrder?.("waste");
          }}
        >
          Waste toner
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TonerLevelBar({ toner }: { toner: TonerSnapshot }) {
  const style = TONER_STYLES[toner.key];
  const level =
    toner.value === null || Number.isNaN(toner.value) ? null : clamp(toner.value);
  const isCritical = level === 0;
  const isWarning =
    level !== null && level <= toner.threshold && level > 0 && !toner.muted;
  const displayValue = level === null ? "—" : `${Math.round(level)}`.concat("%");
  const width = level === null ? 0 : Math.max(level, 4);
  const hasOrder = toner.hasActiveOrder === true;

  return (
    <div
      className={cn(
        "space-y-1 rounded-lg transition-all",
        toner.muted && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium tracking-wide uppercase">
        <div className="flex items-center gap-1.5">
          {hasOrder && <Bell className="h-3.5 w-3.5 text-blue-600" />}
          <span className={style.label}>{toner.label}</span>
        </div>
        <span
          className={cn(
            "font-semibold",
            toner.muted
              ? "text-muted-foreground"
              : isCritical
                ? "text-destructive"
                : isWarning
                  ? "text-amber-600"
                  : "text-muted-foreground"
          )}
        >
          {displayValue}
        </span>
      </div>
      <div
        className={cn("relative h-2.5 w-full overflow-hidden rounded-full", style.track)}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            level === null
              ? "bg-muted-foreground/20"
              : toner.muted
                ? "bg-muted-foreground/30"
                : isCritical
                  ? "bg-destructive"
                  : isWarning
                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500"
                    : cn("bg-gradient-to-r", style.fill),
            isWarning && !isCritical && !toner.muted ? "animate-pulse" : null
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      {toner.muted ? (
        <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
          Alert dismissed
        </p>
      ) : null}
    </div>
  );
}

function clamp(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

DeviceCardComponent.displayName = "DeviceCard";

export const DeviceCard = memo(DeviceCardComponent);

