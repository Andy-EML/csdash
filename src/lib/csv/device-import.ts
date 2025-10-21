const stripBom = (value: string): string => value.replace(/^\uFEFF/, "");

const normalizeHeaderKey = (header: string): string =>
  stripBom(header)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export type DeviceImportType =
  | "gas_gage"
  | "latest_total"
  | "warning_history"
  | "consumable_events";

export type DeviceImportRow = Record<string, string>;

export type DeviceImportSchema = {
  type: DeviceImportType;
  label: string;
  description: string;
  requiredHeaders: readonly string[];
  optionalHeaders?: readonly string[];
  previewColumns: readonly string[];
  aliases?: Record<string, string>;
};

const GAS_GAGE_REQUIRED = [
  "CenterID",
  "DeviceID",
  "Model",
  "Serial Number",
  "Black",
  "Cyan",
  "Magenta",
  "Yellow",
  "Customer",
] as const;

const GAS_GAGE_OPTIONAL = [
  "Code Name",
  "ERPID",
  "Protocol",
  "Special Color",
  "Special Color Gage",
  "Sales Office",
  "Service Office",
  "Latest Receive Date",
  "Device Host Name",
  "Device Location",
  "Toner Replacement Date (Black)",
  "Toner Replacement Date (Cyan)",
  "Toner Replacement Date (Magenta)",
  "Toner Replacement Date (Yellow)",
  "Toner Replacement Date (Special Color)",
] as const;

const LATEST_TOTAL_REQUIRED = [
  "CenterID",
  "DeviceID",
  "Serial Number",
  "Model",
  "Server received date",
  "Total",
  "Copy:Total",
  "Printer:Total",
] as const;

const LATEST_TOTAL_OPTIONAL = [
  "Duplex:Total",
  "Copy:Black",
  "Copy:Full Color",
  "Printer:Black",
  "Printer:Full Color",
  "Scanner/FAX:Scan",
  "Scanner/FAX:Print",
  "Black:Total",
  "Full Color:Total",
  "Meter A",
  "Meter B",
  "Meter C",
  "Customer",
  "Department",
  "Service Office",
  "Device Host Name",
  "Device Location",
  "Special Color",
  "Special Color: Total",
] as const;

const WARNING_HISTORY_REQUIRED = [
  "CenterID",
  "DeviceID",
  "Code",
  "Warning Contents",
  "Server received date",
] as const;

const WARNING_HISTORY_OPTIONAL = [
  "Model",
  "Code Name",
  "Recovered",
  "TC",
  "Customer Name",
  "Department",
  "Service Office",
  "Alert Registration Date",
  "Occurred device Date",
  "Recovered server Date",
  "Recovered device Date",
  "Serial Number",
  "Device Host Name",
  "Device Location",
] as const;

const CONSUMABLE_EVENTS_REQUIRED = [
  "CenterID",
  "DeviceID",
  "Serial Number",
  "Model",
  "Type",
  "Warning Code",
  "Description",
  "Status",
  "TC",
] as const;

const CONSUMABLE_EVENTS_OPTIONAL = [
  "Code Name",
  "Customer",
  "Department",
  "Service Office",
  "Device Host Name",
  "Device Location",
] as const;

export const DEVICE_IMPORT_SCHEMAS: DeviceImportSchema[] = [
  {
    type: "gas_gage",
    label: "Gas Gage Toner Snapshot",
    description: "Toner levels and device metadata exported from the Gas Gage dashboard.",
    requiredHeaders: GAS_GAGE_REQUIRED,
    optionalHeaders: GAS_GAGE_OPTIONAL,
    previewColumns: [
      "DeviceID",
      "Customer",
      "Model",
      "Black",
      "Cyan",
      "Magenta",
      "Yellow",
    ],
    aliases: {
      customername: "Customer",
      serial: "Serial Number",
      serialno: "Serial Number",
      serialnum: "Serial Number",
      serialnumber: "Serial Number",
      codename: "Code Name",
      devicehostname: "Device Host Name",
      devicehost: "Device Host Name",
      devicelocation: "Device Location",
      serviceoffice: "Service Office",
      salesoffice: "Sales Office",
    },
  },
  {
    type: "latest_total",
    label: "Latest Total Meter Reading",
    description: "Cumulative meter counters from the LatestTotal CSV export.",
    requiredHeaders: LATEST_TOTAL_REQUIRED,
    optionalHeaders: LATEST_TOTAL_OPTIONAL,
    previewColumns: [
      "DeviceID",
      "Customer",
      "Server received date",
      "Total",
      "Copy:Total",
      "Printer:Total",
    ],
  },
  {
    type: "warning_history",
    label: "Warning History",
    description: "Warning and alert events from the WarningHistory CSV export.",
    requiredHeaders: WARNING_HISTORY_REQUIRED,
    optionalHeaders: WARNING_HISTORY_OPTIONAL,
    previewColumns: [
      "DeviceID",
      "Code",
      "Warning Contents",
      "Server received date",
      "Recovered",
    ],
    aliases: {
      customer: "Customer Name",
      customername: "Customer Name",
    },
  },
  {
    type: "consumable_events",
    label: "Yields / Consumables",
    description: "Consumable lifecycle records from the Yields_Consumables CSV export.",
    requiredHeaders: CONSUMABLE_EVENTS_REQUIRED,
    optionalHeaders: CONSUMABLE_EVENTS_OPTIONAL,
    previewColumns: ["DeviceID", "Type", "Warning Code", "Description", "Status", "TC"],
  },
];

const DEVICE_IMPORT_SCHEMA_MAP = DEVICE_IMPORT_SCHEMAS.reduce<
  Record<DeviceImportType, DeviceImportSchema>
>(
  (acc, schema) => {
    acc[schema.type] = schema;
    return acc;
  },
  {} as Record<DeviceImportType, DeviceImportSchema>
);

const HEADER_ALIAS_MAP = (() => {
  const map = new Map<string, string>();

  const register = (header: string) => {
    map.set(normalizeHeaderKey(header), header);
  };

  DEVICE_IMPORT_SCHEMAS.forEach((schema) => {
    schema.requiredHeaders.forEach(register);
    schema.optionalHeaders?.forEach(register);
    if (schema.aliases) {
      Object.entries(schema.aliases).forEach(([alias, canonical]) => {
        if (!map.has(alias)) {
          map.set(alias, canonical);
        }
      });
    }
  });

  return map;
})();

export const canonicalizeDeviceImportHeader = (header: string): string => {
  const normalizedKey = normalizeHeaderKey(header);
  const canonical = HEADER_ALIAS_MAP.get(normalizedKey);
  if (canonical) {
    return canonical;
  }
  return stripBom(header).trim();
};

const headersToSet = (headers: string[]): Set<string> =>
  new Set(headers.map((header) => canonicalizeDeviceImportHeader(header)));

export const validateHeadersForType = (
  type: DeviceImportType,
  headers: string[]
): boolean => {
  const schema = DEVICE_IMPORT_SCHEMA_MAP[type];
  if (!schema) {
    return false;
  }
  const headerSet = headersToSet(headers);
  return schema.requiredHeaders.every((required) => headerSet.has(required));
};

export const detectDeviceImportType = (headers: string[]): DeviceImportType | null => {
  const matches = DEVICE_IMPORT_SCHEMAS.filter((schema) =>
    validateHeadersForType(schema.type, headers)
  );

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0].type;
  }

  // Prefer the schema with the most required headers matched to break ties.
  return matches
    .slice()
    .sort((a, b) => b.requiredHeaders.length - a.requiredHeaders.length)[0].type;
};

const valueToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
};

export const normalizeDeviceImportRows = (
  type: DeviceImportType,
  rows: Record<string, unknown>[]
): DeviceImportRow[] => {
  const schema = DEVICE_IMPORT_SCHEMA_MAP[type];
  const headersToEnsure = new Set<string>([
    ...schema.requiredHeaders,
    ...(schema.optionalHeaders ?? []),
  ]);

  return rows.map((row) => {
    const normalized: DeviceImportRow = {};

    Object.entries(row).forEach(([key, value]) => {
      const canonicalKey = canonicalizeDeviceImportHeader(key);
      normalized[canonicalKey] = valueToString(value);
    });

    headersToEnsure.forEach((header) => {
      if (!(header in normalized)) {
        normalized[header] = "";
      }
    });

    return normalized;
  });
};

export const getDeviceImportSchema = (type: DeviceImportType): DeviceImportSchema =>
  DEVICE_IMPORT_SCHEMA_MAP[type];
