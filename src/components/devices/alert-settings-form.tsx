"use client";

import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DeviceAlertSettingsRow } from "@/lib/database.types";

const DEFAULT_THRESHOLD = 15;

export type AlertSettingsFormProps = {
  deviceId: string;
  deviceName?: string;
  initialSettings?: DeviceAlertSettingsRow | null;
  onSave?: () => void;
};

export function AlertSettingsForm({
  deviceId,
  deviceName,
  initialSettings,
  onSave,
}: AlertSettingsFormProps) {
  const [blackThreshold, setBlackThreshold] = useState(
    initialSettings?.black_threshold ?? DEFAULT_THRESHOLD
  );
  const [cyanThreshold, setCyanThreshold] = useState(
    initialSettings?.cyan_threshold ?? DEFAULT_THRESHOLD
  );
  const [magentaThreshold, setMagentaThreshold] = useState(
    initialSettings?.magenta_threshold ?? DEFAULT_THRESHOLD
  );
  const [yellowThreshold, setYellowThreshold] = useState(
    initialSettings?.yellow_threshold ?? DEFAULT_THRESHOLD
  );
  const [automationEnabled, setAutomationEnabled] = useState(
    initialSettings?.alerts_enabled ?? true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleReset = () => {
    setBlackThreshold(DEFAULT_THRESHOLD);
    setCyanThreshold(DEFAULT_THRESHOLD);
    setMagentaThreshold(DEFAULT_THRESHOLD);
    setYellowThreshold(DEFAULT_THRESHOLD);
    setAutomationEnabled(true);
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/device-alert-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: deviceId,
          black_threshold: blackThreshold,
          cyan_threshold: cyanThreshold,
          magenta_threshold: magentaThreshold,
          yellow_threshold: yellowThreshold,
          alerts_enabled: automationEnabled,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings");
      }

      setMessage({ type: "success", text: "Alert thresholds saved successfully!" });
      onSave?.();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred while saving",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Thresholds</CardTitle>
        <CardDescription>
          {deviceName
            ? `Configure alert thresholds for ${deviceName}`
            : `Configure alert thresholds for device ${deviceId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            Set the toner level percentage at which alerts should be triggered for this
            device. Alerts will appear on the dashboard when toner levels fall below these
            thresholds.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Include in automation</p>
            <p className="text-muted-foreground text-xs">Disable this to keep the device off automation lists and manage toner manually.</p>
          </div>
          <Switch
            checked={automationEnabled}
            onCheckedChange={(value) => setAutomationEnabled(Boolean(value))}
            aria-label="Toggle automated toner management"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="black-threshold">Black Toner (%)</Label>
            <Input
              id="black-threshold"
              type="number"
              min="0"
              max="100"
              value={blackThreshold}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBlackThreshold(parseInt(e.target.value) || 0)
              }
            />
            <p className="text-muted-foreground text-xs">
              Alert when black toner falls below this level
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cyan-threshold">Cyan Toner (%)</Label>
            <Input
              id="cyan-threshold"
              type="number"
              min="0"
              max="100"
              value={cyanThreshold}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCyanThreshold(parseInt(e.target.value) || 0)
              }
            />
            <p className="text-muted-foreground text-xs">
              Alert when cyan toner falls below this level
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="magenta-threshold">Magenta Toner (%)</Label>
            <Input
              id="magenta-threshold"
              type="number"
              min="0"
              max="100"
              value={magentaThreshold}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMagentaThreshold(parseInt(e.target.value) || 0)
              }
            />
            <p className="text-muted-foreground text-xs">
              Alert when magenta toner falls below this level
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yellow-threshold">Yellow Toner (%)</Label>
            <Input
              id="yellow-threshold"
              type="number"
              min="0"
              max="100"
              value={yellowThreshold}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setYellowThreshold(parseInt(e.target.value) || 0)
              }
            />
            <p className="text-muted-foreground text-xs">
              Alert when yellow toner falls below this level
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-4 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            }`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
