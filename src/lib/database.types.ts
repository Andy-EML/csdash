export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TonerKey = "c" | "m" | "y" | "k";

export type TonerColor =
  | "black"
  | "cyan"
  | "magenta"
  | "yellow"
  | "waste_toner"
  | "special_color";

export type DeviceStatusLevel = "normal" | "warning" | "critical" | "unknown";

export type Database = {
  public: {
    Tables: {
      Gas_Gage: {
        Row: {
          center_id: string;
          device_id: string;
          model: string | null;
          code_name: string | null;
          serial_number: string;
          erp_id: string | null;
          protocol: string | null;
          black: number | null;
          cyan: number | null;
          magenta: number | null;
          yellow: number | null;
          special_color: number | null;
          special_color_gage: string | null;
          customer: string | null;
          customer_site: string | null;
          customer_number: string | null;
          sales_office: string | null;
          service_office: string | null;
          latest_receive_date: string | null;
          device_host_name: string | null;
          device_location: string | null;
          toner_replacement_date_black: string | null;
          toner_replacement_date_cyan: string | null;
          toner_replacement_date_magenta: string | null;
          toner_replacement_date_yellow: string | null;
          toner_replacement_date_special_color: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          center_id: string;
          device_id: string;
          model?: string | null;
          code_name?: string | null;
          serial_number: string;
          erp_id?: string | null;
          protocol?: string | null;
          black?: number | null;
          cyan?: number | null;
          magenta?: number | null;
          yellow?: number | null;
          special_color?: number | null;
          special_color_gage?: string | null;
          customer?: string | null;
          customer_site?: string | null;
          customer_number?: string | null;
          sales_office?: string | null;
          service_office?: string | null;
          latest_receive_date?: string | null;
          device_host_name?: string | null;
          device_location?: string | null;
          toner_replacement_date_black?: string | null;
          toner_replacement_date_cyan?: string | null;
          toner_replacement_date_magenta?: string | null;
          toner_replacement_date_yellow?: string | null;
          toner_replacement_date_special_color?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Database["public"]["Tables"]["Gas_Gage"]["Insert"];
        Relationships: [];
      };
      device_alert_settings: {
        Row: {
          id: string;
          device_id: string;
          black_threshold: number;
          cyan_threshold: number;
          magenta_threshold: number;
          yellow_threshold: number;
          special_color_threshold: number | null;
          alerts_enabled: boolean;
          black_enabled: boolean;
          cyan_enabled: boolean;
          magenta_enabled: boolean;
          yellow_enabled: boolean;
          replacement_detection_threshold: number;
          offline_alert_enabled: boolean;
          offline_threshold_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          black_threshold?: number;
          cyan_threshold?: number;
          magenta_threshold?: number;
          yellow_threshold?: number;
          special_color_threshold?: number | null;
          alerts_enabled?: boolean;
          black_enabled?: boolean;
          cyan_enabled?: boolean;
          magenta_enabled?: boolean;
          yellow_enabled?: boolean;
          replacement_detection_threshold?: number;
          offline_alert_enabled?: boolean;
          offline_threshold_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["device_alert_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "device_alert_settings_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "Gas_Gage";
            referencedColumns: ["device_id"];
          },
        ];
      };
      device_warning_overrides: {
        Row: {
          id: string;
          device_id: string | null;
          serial_number: string;
          scope: Database["public"]["Enums"]["warning_scope"];
          dismissed_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_id?: string | null;
          serial_number: string;
          scope: Database["public"]["Enums"]["warning_scope"];
          dismissed_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["device_warning_overrides"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "device_warning_overrides_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "Gas_Gage";
            referencedColumns: ["device_id"];
          },
        ];
      };
      devices: {
        Row: {
          serial_number: string;
          device_id: string | null;
          center_id: string | null;
          code_name: string | null;
          service_office: string | null;
          department: string | null;
          device_host_name: string | null;
          customer_name: string | null;
          model: string | null;
          location: string | null;
          last_updated_at: string | null;
          last_seen_at: string | null;
          last_meter_received_at: string | null;
          offline_threshold_minutes: number | null;
          toner_c_percent: number | null;
          toner_m_percent: number | null;
          toner_y_percent: number | null;
          toner_k_percent: number | null;
          waste_toner_percent: number | null;
          warning_message: string | null;
          counter_total: number | null;
          counter_color: number | null;
          counter_mono: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          serial_number: string;
          device_id?: string | null;
          center_id?: string | null;
          code_name?: string | null;
          service_office?: string | null;
          department?: string | null;
          device_host_name?: string | null;
          customer_name?: string | null;
          model?: string | null;
          location?: string | null;
          last_updated_at?: string | null;
          last_seen_at?: string | null;
          last_meter_received_at?: string | null;
          offline_threshold_minutes?: number | null;
          toner_c_percent?: number | null;
          toner_m_percent?: number | null;
          toner_y_percent?: number | null;
          toner_k_percent?: number | null;
          waste_toner_percent?: number | null;
          warning_message?: string | null;
          counter_total?: number | null;
          counter_color?: number | null;
          counter_mono?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Database["public"]["Tables"]["devices"]["Insert"];
        Relationships: [];
      };
      device_toner_snapshots: {
        Row: {
          id: number;
          device_id: string | null;
          serial_number: string | null;
          snapshot_source: string | null;
          captured_at: string;
          black: number | null;
          cyan: number | null;
          magenta: number | null;
          yellow: number | null;
          special_color: number | null;
          waste_toner: number | null;
          raw: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          device_id?: string | null;
          serial_number?: string | null;
          snapshot_source?: string | null;
          captured_at?: string;
          black?: number | null;
          cyan?: number | null;
          magenta?: number | null;
          yellow?: number | null;
          special_color?: number | null;
          waste_toner?: number | null;
          raw?: Json | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["device_toner_snapshots"]["Insert"]>;
        Relationships: [];
      };
      device_meter_readings: {
        Row: {
          id: number;
          device_id: string | null;
          serial_number: string | null;
          captured_at: string;
          total: number | null;
          printer_total: number | null;
          copy_total: number | null;
          scan_total: number | null;
          duplex_total: number | null;
          black_total: number | null;
          color_total: number | null;
          meter_a: number | null;
          meter_b: number | null;
          meter_c: number | null;
          raw: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          device_id?: string | null;
          serial_number?: string | null;
          captured_at?: string;
          total?: number | null;
          printer_total?: number | null;
          copy_total?: number | null;
          scan_total?: number | null;
          duplex_total?: number | null;
          black_total?: number | null;
          color_total?: number | null;
          meter_a?: number | null;
          meter_b?: number | null;
          meter_c?: number | null;
          raw?: Json | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["device_meter_readings"]["Insert"]>;
        Relationships: [];
      };
      device_warning_events: {
        Row: {
          id: number;
          device_id: string | null;
          serial_number: string | null;
          alert_code: string | null;
          message: string | null;
          warning_type: string | null;
          received_at_server: string | null;
          occurred_at_device: string | null;
          recovered_at_server: string | null;
          recovered_at_device: string | null;
          recovered: boolean | null;
          raw: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          device_id?: string | null;
          serial_number?: string | null;
          alert_code?: string | null;
          message?: string | null;
          warning_type?: string | null;
          received_at_server?: string | null;
          occurred_at_device?: string | null;
          recovered_at_server?: string | null;
          recovered_at_device?: string | null;
          recovered?: boolean | null;
          raw?: Json | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["device_warning_events"]["Insert"]>;
        Relationships: [];
      };
      device_consumable_events: {
        Row: {
          id: number;
          device_id: string | null;
          serial_number: string | null;
          event_type: string | null;
          warning_code: string | null;
          description: string | null;
          status: string | null;
          tc: number | null;
          captured_at: string | null;
          raw: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          device_id?: string | null;
          serial_number?: string | null;
          event_type?: string | null;
          warning_code?: string | null;
          description?: string | null;
          status?: string | null;
          tc?: number | null;
          captured_at?: string | null;
          raw?: Json | null;
          created_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["device_consumable_events"]["Insert"]
        >;
        Relationships: [];
      };
      import_jobs: {
        Row: {
          id: string;
          source_file: string | null;
          source_type: string;
          imported_by: string | null;
          imported_at: string | null;
          row_count: number | null;
          status: string | null;
          details: Json | null;
        };
        Insert: {
          id?: string;
          source_file: string | null;
          source_type: string;
          imported_by?: string | null;
          imported_at?: string | null;
          row_count?: number | null;
          status?: string | null;
          details?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["import_jobs"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          order_id: string;
          device_id: string;
          customer_name: string;
          order_type: Database["public"]["Enums"]["order_type"];
          toner_color: string | null;
          status: Database["public"]["Enums"]["order_status"];
          created_at: string;
          ordered_at: string | null;
          sales_order_number: string | null;
        };
        Insert: {
          order_id?: string;
          device_id: string;
          customer_name: string;
          order_type: Database["public"]["Enums"]["order_type"];
          toner_color?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          created_at?: string;
          ordered_at?: string | null;
          sales_order_number?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
            referencedColumns: ["serial_number"];
          },
        ];
      };
      device_logs: {
        Row: {
          id: string;
          device_id: string;
          snapshot_at: string;
          toner_c_percent: number | null;
          toner_m_percent: number | null;
          toner_y_percent: number | null;
          toner_k_percent: number | null;
          waste_toner_percent: number | null;
          counter_total: number | null;
          counter_color: number | null;
          counter_mono: number | null;
          warning_message: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          device_id: string;
          snapshot_at: string;
          toner_c_percent?: number | null;
          toner_m_percent?: number | null;
          toner_y_percent?: number | null;
          toner_k_percent?: number | null;
          waste_toner_percent?: number | null;
          counter_total?: number | null;
          counter_color?: number | null;
          counter_mono?: number | null;
          warning_message?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["device_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "device_logs_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
            referencedColumns: ["serial_number"];
          },
        ];
      };
      device_connection_events: {
        Row: {
          id: string;
          device_id: string | null;
          serial_number: string | null;
          event_type: "went_offline" | "came_online" | "stale_data" | "connection_restored";
          last_seen_at: string | null;
          detected_at: string;
          resolved_at: string | null;
          duration_hours: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id?: string | null;
          serial_number?: string | null;
          event_type: "went_offline" | "came_online" | "stale_data" | "connection_restored";
          last_seen_at?: string | null;
          detected_at?: string;
          resolved_at?: string | null;
          duration_hours?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["device_connection_events"]["Insert"]>;
        Relationships: [];
      };
      order_lifecycle_events: {
        Row: {
          id: string;
          order_id: string;
          event_type: "created" | "opened" | "in_progress" | "completed" | "auto_completed" | "cancelled" | "archived";
          toner_color: string | null;
          toner_level_before: number | null;
          toner_level_after: number | null;
          auto_completed: boolean;
          completed_by: string | null;
          notes: string | null;
          detected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          event_type: "created" | "opened" | "in_progress" | "completed" | "auto_completed" | "cancelled" | "archived";
          toner_color?: string | null;
          toner_level_before?: number | null;
          toner_level_after?: number | null;
          auto_completed?: boolean;
          completed_by?: string | null;
          notes?: string | null;
          detected_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_lifecycle_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "order_lifecycle_events_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["order_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_type: "toner" | "waste_toner" | "service";
      order_status: "open" | "in_progress" | "completed" | "archived";
      warning_scope: "all" | "black" | "cyan" | "magenta" | "yellow" | "waste";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type DeviceLogRow = Database["public"]["Tables"]["device_logs"]["Row"];
export type GasGageRow = Database["public"]["Tables"]["Gas_Gage"]["Row"];
export type DeviceAlertSettingsRow =
  Database["public"]["Tables"]["device_alert_settings"]["Row"];
export type DeviceWarningOverrideRow =
  Database["public"]["Tables"]["device_warning_overrides"]["Row"];
export type DeviceTonerSnapshotRow =
  Database["public"]["Tables"]["device_toner_snapshots"]["Row"];
export type DeviceMeterReadingRow =
  Database["public"]["Tables"]["device_meter_readings"]["Row"];
export type DeviceWarningEventRow =
  Database["public"]["Tables"]["device_warning_events"]["Row"];
export type DeviceConsumableEventRow =
  Database["public"]["Tables"]["device_consumable_events"]["Row"];
