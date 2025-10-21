import Link from "next/link";
import { IconArrowLeft } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { CSVUpload } from "@/components/devices/csv-upload";
import { DEVICE_IMPORT_SCHEMAS } from "@/lib/csv/device-import";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/devices">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </Link>
        </Button>
      </div>

      <div className="max-w-4xl">
        <CSVUpload />
      </div>

      <div className="max-w-4xl space-y-4">
        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Supported CSV Types</h3>
          <div className="text-muted-foreground space-y-4 text-sm">
            {DEVICE_IMPORT_SCHEMAS.map((schema) => (
              <div key={schema.type}>
                <p className="text-foreground font-medium">{schema.label}</p>
                <p className="mt-1">{schema.description}</p>
                <p className="text-foreground mt-2 text-xs font-medium">
                  Required columns:
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {schema.requiredHeaders.map((header) => (
                    <li key={header}>{header}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">How It Works</h3>
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
            <li>
              Upload a Gas Gage, LatestTotal, WarningHistory, or Yields/Consumables CSV
              export.
            </li>
            <li>
              Confirm the detected file type and preview the first rows for accuracy.
            </li>
            <li>
              Click Upload to Database to store the readings and events in Supabase.
            </li>
            <li>
              Gas Gage snapshots and meter readings are upserted by device/time; warning
              and consumable events append when new.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
