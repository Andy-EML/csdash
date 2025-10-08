"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CSVRow = {
  CenterID: string;
  DeviceID: string;
  Model: string;
  "Code Name": string;
  "Serial Number": string;
  ERPID: string;
  Protocol: string;
  Black: string;
  Cyan: string;
  Magenta: string;
  Yellow: string;
  "Special Color": string;
  "Special Color Gage": string;
  Customer: string;
  "Sales Office": string;
  "Service Office": string;
  "Latest Receive Date": string;
  "Device Host Name": string;
  "Device Location": string;
  "Toner Replacement Date (Black)": string;
  "Toner Replacement Date (Cyan)": string;
  "Toner Replacement Date (Magenta)": string;
  "Toner Replacement Date (Yellow)": string;
  "Toner Replacement Date (Special Color)": string;
};

type UploadStatus = "idle" | "parsing" | "uploading" | "success" | "error";

export type CSVUploadProps = {
  onUploadComplete?: () => void;
};

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = useCallback(() => {
    setStatus("idle");
    setFile(null);
    setParsedData([]);
    setError(null);
    setUploadResult(null);
  }, []);

  const validateCSVHeaders = (headers: string[]): boolean => {
    const requiredHeaders = [
      "CenterID",
      "DeviceID",
      "Model",
      "Serial Number",
      "Black",
      "Cyan",
      "Magenta",
      "Yellow",
      "Customer",
    ];
    return requiredHeaders.every((header) => headers.includes(header));
  };

  const parseCSV = useCallback((file: File) => {
    setStatus("parsing");
    setError(null);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`);
          setStatus("error");
          return;
        }

        const headers = results.meta.fields || [];
        if (!validateCSVHeaders(headers)) {
          setError("CSV file is missing required columns. Please check the format.");
          setStatus("error");
          return;
        }

        if (results.data.length === 0) {
          setError("CSV file is empty.");
          setStatus("error");
          return;
        }

        setParsedData(results.data);
        setStatus("idle");
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        setStatus("error");
      },
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
    if (parsedData.length === 0) {
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      const response = await fetch("/api/gas-gage/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: parsedData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload data");
      }

      setUploadResult({ success: result.success, errors: result.errors });
      setStatus("success");
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload");
      setStatus("error");
    }
  }, [parsedData, onUploadComplete]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Gas Gage Data</CardTitle>
        <CardDescription>Upload a CSV file to update device information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "idle" && parsedData.length === 0 && (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">Drag and drop your CSV file here</p>
            <p className="mb-4 text-xs text-muted-foreground">or</p>
            <label htmlFor="file-upload">
              <Button type="button" onClick={() => document.getElementById("file-upload")?.click()}>
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
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground">Parsing CSV file...</p>
            </div>
          </div>
        )}

        {parsedData.length > 0 && status !== "success" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} device{parsedData.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Device ID</th>
                      <th className="px-4 py-2 text-left font-medium">Customer</th>
                      <th className="px-4 py-2 text-left font-medium">Model</th>
                      <th className="px-4 py-2 text-left font-medium">Toners (K/C/M/Y)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono text-xs">{row.DeviceID}</td>
                        <td className="px-4 py-2">{row.Customer}</td>
                        <td className="px-4 py-2">{row.Model}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">K: {row.Black}%</Badge>
                            <Badge variant="outline" className="text-xs">C: {row.Cyan}%</Badge>
                            <Badge variant="outline" className="text-xs">M: {row.Magenta}%</Badge>
                            <Badge variant="outline" className="text-xs">Y: {row.Yellow}%</Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <div className="border-t bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
                  Showing 10 of {parsedData.length} devices
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={status === "uploading"} className="flex-1">
                {status === "uploading" ? "Uploading..." : "Upload to Database"}
              </Button>
              <Button variant="outline" onClick={resetState} disabled={status === "uploading"}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {status === "success" && uploadResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">Upload Successful</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Successfully processed {uploadResult.success} device{uploadResult.success !== 1 ? "s" : ""}.
                  {uploadResult.errors > 0 && ` ${uploadResult.errors} error${uploadResult.errors !== 1 ? "s" : ""} occurred.`}
                </p>
                <Button variant="outline" size="sm" onClick={resetState} className="mt-3">
                  Upload Another File
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Error</p>
                <p className="mt-1 text-sm text-destructive/90">{error}</p>
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
