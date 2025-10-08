export type TonerKey = "c" | "m" | "y" | "k";

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
          }
        ];
      };
      devices: {
        Row: {
          serial_number: string;
          customer_name: string | null;
          model: string | null;
          location: string | null;
          last_updated_at: string | null;
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
          customer_name?: string | null;
          model?: string | null;
          location?: string | null;
          last_updated_at?: string | null;
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
      orders: {
        Row: {
          order_id: string;
          device_id: string;
          customer_name: string;
          order_type: Database["public"]["Enums"]["order_type"];
          status: Database["public"]["Enums"]["order_status"];
          created_at: string;
        };
        Insert: {
          order_id?: string;
          device_id: string;
          customer_name: string;
          order_type: Database["public"]["Enums"]["order_type"];
          status?: Database["public"]["Enums"]["order_status"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "orders_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
            referencedColumns: ["serial_number"];
          }
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
          }
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
      order_status: "open" | "in_progress" | "completed";
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
export type DeviceAlertSettingsRow = Database["public"]["Tables"]["device_alert_settings"]["Row"];
