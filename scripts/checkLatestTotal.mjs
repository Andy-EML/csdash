import fs from "fs";
import Papa from "papaparse";

const file = fs.readFileSync("CSV-REF/GridViewReportLatestTotal (12).csv", "utf8");
const normalizeHeader = (header) => header.trim();
const padTimeComponent = (value) => (value ? value.padStart(2, "0") : "00");
const normalizeTimestampString = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (!match) return trimmed;
  const [, y, m, d, hh, mm, ss] = match;
  const datePart = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const timePart = `${padTimeComponent(hh)}:${padTimeComponent(mm)}:${padTimeComponent(ss)}`;
  return `${datePart}T${timePart}Z`;
};

const results = Papa.parse(file, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
const invalid = [];
for (const row of results.data) {
  const iso = normalizeTimestampString(row["Server received date"]);
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    invalid.push({ iso, original: row["Server received date"] });
    if (invalid.length >= 10) break;
  }
}
console.log('invalid count', invalid.length);
console.log(invalid);
