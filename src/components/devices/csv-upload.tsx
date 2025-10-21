"use client";

import { useState, useCallback } from "react";
import { FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { IconUpload } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  canonicalizeDeviceImportHeader,
  detectDeviceImportType,
  DeviceImportRow,
  DeviceImportType,
  getDeviceImportSchema,
  normalizeDeviceImportRows,
} from "@/lib/csv/device-import";

type UploadStatus = "idle" | "parsing" | "uploading" | "success" | "error";

export type CSVUploadProps = {
  onUploadComplete?: () => void;
};

const CHUNK_SIZE = 1000;

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedImport, setParsedImport] = useState<{
    type: DeviceImportType;
    rows: DeviceImportRow[];
    headers: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    errors: number;
    errorDetails: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const resetState = useCallback(() => {
    setStatus("idle");
    setFile(null);
    setParsedImport(null);
    setError(null);
    setUploadResult(null);
    setUploadProgress(null);
  }, []);

  const parseCSV = useCallback((file: File) => {
    setStatus("parsing");
    setError(null);

    // Lazy-load papaparse only when parsing is requested
    import("papaparse")
      .then((module) => {
        const PapaLib = module.default || module;
        PapaLib.parse<Record<string, unknown>>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: canonicalizeDeviceImportHeader,
          complete: (results: {
            data: Record<string, unknown>[];
            errors: Array<{ message: string }>;
            meta: { fields?: string[] };
          }) => {
            if (results.errors.length > 0) {
              setError(
                `CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`
              );
              setStatus("error");
              return;
            }

            const headers = results.meta.fields || [];
            const detectedType = detectDeviceImportType(headers);
            if (!detectedType) {
              setError(
                "CSV header does not match any supported format (Gas Gage, LatestTotal, WarningHistory, Yields/Consumables)."
              );
              setStatus("error");
              return;
            }

            if (results.data.length === 0) {
              setError("CSV file is empty.");
              setStatus("error");
              return;
            }

            const normalizedRows = normalizeDeviceImportRows(detectedType, results.data);
            setParsedImport({
              type: detectedType,
              rows: normalizedRows,
              headers,
            });
            setStatus("idle");
          },
          error: (error: Error) => {
            setError(`Failed to parse CSV: ${error.message}`);
            setStatus("error");
          },
        });
      })
      .catch((err) => {
        setError(
          `Failed to load CSV parser: ${err instanceof Error ? err.message : String(err)}`
        );
        setStatus("error");
      });
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.name.endsWith(".csv")) {
          setError("Please select a CSV file.");
          return;
        }
        setFile(selectedFile);
        parseCSV(selectedFile);
      }
    },
    [parseCSV]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        if (!droppedFile.name.endsWith(".csv")) {
          setError("Please select a CSV file.");
          return;
        }
        setFile(droppedFile);
        parseCSV(droppedFile);
      }
    },
    [parseCSV]
  );

  const handleUpload = useCallback(async () => {
    if (!parsedImport || parsedImport.rows.length === 0) {
      return;
    }

    setStatus("uploading");
    setError(null);
    setUploadProgress({
      completed: 0,
      total: Math.ceil(parsedImport.rows.length / CHUNK_SIZE),
    });

    let aggregatedSuccess = 0;
    let aggregatedErrors = 0;
    const aggregatedDetails: string[] = [];

    try {
      const totalChunks = Math.ceil(parsedImport.rows.length / CHUNK_SIZE);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunkRows = parsedImport.rows.slice(start, end);

        const response = await fetch("/api/gas-gage/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: parsedImport.type,
            rows: chunkRows,
            headers: parsedImport.headers,
            fileName: file?.name,
            chunkIndex,
            totalChunks,
            totalRows: parsedImport.rows.length,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to upload data");
        }

        aggregatedSuccess += result.success ?? 0;
        aggregatedErrors += result.errors ?? 0;
        if (Array.isArray(result.errorDetails)) {
          aggregatedDetails.push(...result.errorDetails);
        }

        setUploadProgress({ completed: chunkIndex + 1, total: totalChunks });
      }

      setUploadResult({
        success: aggregatedSuccess,
        errors: aggregatedErrors,
        errorDetails: aggregatedDetails.slice(0, 25),
      });
      setUploadProgress(null);
      setStatus("success");
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload");
      setStatus("error");
      setUploadProgress(null);
    }
  }, [parsedImport, file, onUploadComplete]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Device Data</CardTitle>
        <CardDescription>
          Upload a supported CSV file to update device information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "idle" && !parsedImport && (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <IconUpload className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="mb-2 text-sm font-medium">Drag and drop your CSV file here</p>
            <p className="text-muted-foreground mb-4 text-xs">or</p>
            <label htmlFor="file-upload">
              <Button
                type="button"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Select File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {status === "parsing" && (
          <div className="flex items-center justify-center rounded-lg border p-12">
            <div className="text-center">
              <div className="border-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              <p className="text-muted-foreground text-sm">Parsing CSV file...</p>
            </div>
          </div>
        )}

        {parsedImport && parsedImport.rows.length > 0 && status !== "success" && (
          <div className="space-y-4">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="text-primary h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {parsedImport.rows.length} row
                    {parsedImport.rows.length !== 1 ? "s" : ""} detected (
                    {getDeviceImportSchema(parsedImport.type).label})
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {parsedImport.type === "gas_gage" && (
              <div className="rounded-lg border">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Device ID</th>
                        <th className="px-4 py-2 text-left font-medium">Customer</th>
                        <th className="px-4 py-2 text-left font-medium">Model</th>
                        <th className="px-4 py-2 text-left font-medium">
                          Toners (K/C/M/Y)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedImport.rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row["DeviceID"]}
                          </td>
                          <td className="px-4 py-2">{row["Customer"]}</td>
                          <td className="px-4 py-2">{row["Model"]}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                K: {row["Black"]}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                C: {row["Cyan"]}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                M: {row["Magenta"]}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Y: {row["Yellow"]}%
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedImport.rows.length > 10 && (
                  <div className="bg-muted/50 text-muted-foreground border-t px-4 py-2 text-center text-xs">
                    Showing 10 of {parsedImport.rows.length} rows
                  </div>
                )}
              </div>
            )}

            {parsedImport.type === "latest_total" && (
              <div className="rounded-lg border">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Device ID</th>
                        <th className="px-4 py-2 text-left font-medium">Customer</th>
                        <th className="px-4 py-2 text-left font-medium">Server Date</th>
                        <th className="px-4 py-2 text-left font-medium">Total</th>
                        <th className="px-4 py-2 text-left font-medium">Copy Total</th>
                        <th className="px-4 py-2 text-left font-medium">Printer Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedImport.rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row["DeviceID"]}
                          </td>
                          <td className="px-4 py-2">{row["Customer"]}</td>
                          <td className="px-4 py-2">{row["Server received date"]}</td>
                          <td className="px-4 py-2">{row["Total"]}</td>
                          <td className="px-4 py-2">{row["Copy:Total"]}</td>
                          <td className="px-4 py-2">{row["Printer:Total"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedImport.rows.length > 10 && (
                  <div className="bg-muted/50 text-muted-foreground border-t px-4 py-2 text-center text-xs">
                    Showing 10 of {parsedImport.rows.length} rows
                  </div>
                )}
              </div>
            )}

            {parsedImport.type === "warning_history" && (
              <div className="rounded-lg border">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Device ID</th>
                        <th className="px-4 py-2 text-left font-medium">Code</th>
                        <th className="px-4 py-2 text-left font-medium">Warning</th>
                        <th className="px-4 py-2 text-left font-medium">Server Date</th>
                        <th className="px-4 py-2 text-left font-medium">Recovered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedImport.rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row["DeviceID"]}
                          </td>
                          <td className="px-4 py-2">{row["Code"]}</td>
                          <td className="px-4 py-2">{row["Warning Contents"]}</td>
                          <td className="px-4 py-2">{row["Server received date"]}</td>
                          <td className="px-4 py-2">{row["Recovered"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedImport.rows.length > 10 && (
                  <div className="bg-muted/50 text-muted-foreground border-t px-4 py-2 text-center text-xs">
                    Showing 10 of {parsedImport.rows.length} rows
                  </div>
                )}
              </div>
            )}

            {parsedImport.type === "consumable_events" && (
              <div className="rounded-lg border">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Device ID</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-left font-medium">Warning Code</th>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">TC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedImport.rows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="px-4 py-2 font-mono text-xs">
                            {row["DeviceID"]}
                          </td>
                          <td className="px-4 py-2">{row["Type"]}</td>
                          <td className="px-4 py-2">{row["Warning Code"]}</td>
                          <td className="px-4 py-2">{row["Description"]}</td>
                          <td className="px-4 py-2">{row["Status"]}</td>
                          <td className="px-4 py-2">{row["TC"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedImport.rows.length > 10 && (
                  <div className="bg-muted/50 text-muted-foreground border-t px-4 py-2 text-center text-xs">
                    Showing 10 of {parsedImport.rows.length} rows
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={status === "uploading"}
                className="flex-1"
              >
                {status === "uploading" ? "Uploading..." : "Upload to Database"}
              </Button>
              <Button
                variant="outline"
                onClick={resetState}
                disabled={status === "uploading"}
              >
                Cancel
              </Button>
            </div>

            {status === "uploading" && uploadProgress && (
              <p className="text-muted-foreground text-right text-xs">
                Uploading chunk {uploadProgress.completed} of {uploadProgress.total}…
              </p>
            )}
          </div>
        )}

        {status === "success" && uploadResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">Upload Successful</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Successfully processed {uploadResult.success} device
                  {uploadResult.success !== 1 ? "s" : ""}.
                  {uploadResult.errors > 0 &&
                    ` ${uploadResult.errors} error${uploadResult.errors !== 1 ? "s" : ""} occurred.`}
                </p>
                <Button variant="outline" size="sm" onClick={resetState} className="mt-3">
                  Upload Another File
                </Button>
              </div>
            </div>
            {uploadResult.errorDetails.length > 0 && (
              <div className="mt-3 rounded border border-emerald-200 bg-white/60 p-3">
                <p className="text-xs font-medium text-emerald-900">
                  Notes from Supabase (showing up to {uploadResult.errorDetails.length}{" "}
                  issues):
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-emerald-800">
                  {uploadResult.errorDetails.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-destructive mt-0.5 h-5 w-5" />
              <div className="flex-1">
                <p className="text-destructive font-medium">Error</p>
                <p className="text-destructive/90 mt-1 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={resetState} className="mt-3">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
