export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          patient_id: string
          phone: string
          priority: number | null
          relation: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          patient_id: string
          phone: string
          priority?: number | null
          relation: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          patient_id?: string
          phone?: string
          priority?: number | null
          relation?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          note: string | null
          scheduled_for: string | null
          skipped: boolean
          taken_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          note?: string | null
          scheduled_for?: string | null
          skipped?: boolean
          taken_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          note?: string | null
          scheduled_for?: string | null
          skipped?: boolean
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_notification_state: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          state_json: Json
          synced_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          state_json?: Json
          synced_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          state_json?: Json
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_notification_state_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          doctor_name: string | null
          dosage: string
          end_date: string | null
          form: string | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          meal_rule: string | null
          name: string
          notes: string | null
          patient_id: string
          quantity_type: string | null
          reason: string | null
          refill_threshold: number | null
          remaining_quantity: number | null
          schedule_type: string | null
          start_date: string | null
          strength: string | null
          time_of_day: string[] | null
          times: Json | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          doctor_name?: string | null
          dosage: string
          end_date?: string | null
          form?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          meal_rule?: string | null
          name: string
          notes?: string | null
          patient_id: string
          quantity_type?: string | null
          reason?: string | null
          refill_threshold?: number | null
          remaining_quantity?: number | null
          schedule_type?: string | null
          start_date?: string | null
          strength?: string | null
          time_of_day?: string[] | null
          times?: Json | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          doctor_name?: string | null
          dosage?: string
          end_date?: string | null
          form?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          meal_rule?: string | null
          name?: string
          notes?: string | null
          patient_id?: string
          quantity_type?: string | null
          reason?: string | null
          refill_threshold?: number | null
          remaining_quantity?: number | null
          schedule_type?: string | null
          start_date?: string | null
          strength?: string | null
          time_of_day?: string[] | null
          times?: Json | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          id: string
          notification_type: string
          os_identifier: string | null
          reference_id: string | null
          scheduled_for: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          notification_type: string
          os_identifier?: string | null
          reference_id?: string | null
          scheduled_for?: string | null
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          notification_type?: string
          os_identifier?: string | null
          reference_id?: string | null
          scheduled_for?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_conditions: {
        Row: {
          condition_key: string
          created_at: string | null
          custom_note: string | null
          id: string
          patient_id: string
        }
        Insert: {
          condition_key: string
          created_at?: string | null
          custom_note?: string | null
          id?: string
          patient_id: string
        }
        Update: {
          condition_key?: string
          created_at?: string | null
          custom_note?: string | null
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_data: Json | null
          age: number | null
          birth_date: string | null
          blood_type: string | null
          condition_type: string | null
          created_at: string
          emergency_contact: string | null
          full_name: string
          gender: string | null
          geocoded_address: string | null
          hospital_data: Json | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          phone: string | null
          relationship: string | null
          reporter_data: Json | null
          risk_level: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          address_data?: Json | null
          age?: number | null
          birth_date?: string | null
          blood_type?: string | null
          condition_type?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          geocoded_address?: string | null
          hospital_data?: Json | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          reporter_data?: Json | null
          risk_level?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          address_data?: Json | null
          age?: number | null
          birth_date?: string | null
          blood_type?: string | null
          condition_type?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          geocoded_address?: string | null
          hospital_data?: Json | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          reporter_data?: Json | null
          risk_level?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reassurance_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          created_at: string | null
          heart_rate: number | null
          id: string
          oxygen_saturation: number | null
          patient_id: string
          recorded_at: string | null
          source: string | null
          temperature: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          heart_rate?: number | null
          id?: string
          oxygen_saturation?: number | null
          patient_id: string
          recorded_at?: string | null
          source?: string | null
          temperature?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          heart_rate?: number | null
          id?: string
          oxygen_saturation?: number | null
          patient_id?: string
          recorded_at?: string | null
          source?: string | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals_readings: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          created_at: string | null
          device_id: string | null
          device_name: string | null
          heart_rate: number | null
          id: string
          oxygen_level: number | null
          patient_id: string
          recorded_at: string | null
          source: string
          steps: number | null
          temperature: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          heart_rate?: number | null
          id?: string
          oxygen_level?: number | null
          patient_id: string
          recorded_at?: string | null
          source?: string
          steps?: number | null
          temperature?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          heart_rate?: number | null
          id?: string
          oxygen_level?: number | null
          patient_id?: string
          recorded_at?: string | null
          source?: string
          steps?: number | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_readings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_medication_notification_state: {
        Args: { p_patient_id: string; p_state_json: Json; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
