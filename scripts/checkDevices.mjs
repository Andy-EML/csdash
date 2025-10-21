import fs from "fs";
import Papa from "papaparse";

const file = fs.readFileSync("CSV-REF/GridViewReportLatestTotal (12).csv", "utf8");
const normalizeHeader = (header) => header.trim();
const results = Papa.parse(file, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });

const deviceIds = new Set();
for (const row of results.data) {
  if (row["DeviceID"]) {
    deviceIds.add(row["DeviceID"].trim());    
  }
}
console.log('device ids', deviceIds.size);
console.log(Array.from(deviceIds).some((id) => id.includes('\"') || id.includes("'")));
