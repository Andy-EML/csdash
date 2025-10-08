import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSVUpload } from "@/components/devices/csv-upload";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/devices">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Devices
          </Link>
        </Button>
      </div>

      <div className="max-w-4xl">
        <CSVUpload />
      </div>

      <div className="max-w-4xl space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold mb-2">CSV Format Requirements</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your CSV file must include the following columns:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1">
              <p><span className="font-medium">Required:</span></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>CenterID</li>
                <li>DeviceID</li>
                <li>Serial Number</li>
                <li>Model</li>
                <li>Customer</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p><span className="font-medium">Toner Levels:</span></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Black (0-100)</li>
                <li>Cyan (0-100)</li>
                <li>Magenta (0-100)</li>
                <li>Yellow (0-100)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h3 className="font-semibold mb-2">How It Works</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Upload your CSV file using the form above</li>
            <li>Review the parsed data to ensure it's correct</li>
            <li>Click "Upload to Database" to update the Gas Gage table</li>
            <li>Existing devices will be updated, new devices will be added</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
