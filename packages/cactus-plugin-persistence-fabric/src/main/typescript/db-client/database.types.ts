export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      plugin_status: {
        Row: {
          name: string;
          last_instance_id: string;
          is_schema_initialized: boolean;
          created_at: string;
          last_connected_at: string;
        };
        Insert: {
          name: string;
          last_instance_id: string;
          is_schema_initialized: boolean;
          created_at?: string;
          last_connected_at?: string;
        };
        Update: {
          name?: string;
          last_instance_id?: string;
          is_schema_initialized?: boolean;
          created_at?: string;
          last_connected_at?: string;
        };
      };
    };
  };
  fabric: {
    Tables: {
      block: {
        Row: {
          hash: string;
          id: string;
          number: string;
          transaction_count: number;
        };
        Insert: {
          hash: string;
          id?: string;
          number: number;
          transaction_count?: number;
        };
        Update: {
          hash?: string;
          id?: string;
          number?: number;
          transaction_count?: number;
        };
        Relationships: [];
      };
      certificate: {
        Row: {
          id: string;
          issuer_common_name: string | null;
          issuer_country: string | null;
          issuer_locality: string | null;
          issuer_org: string | null;
          issuer_org_unit: string | null;
          issuer_state: string | null;
          pem: string;
          serial_number: string;
          subject_alt_name: string;
          subject_common_name: string | null;
          subject_country: string | null;
          subject_locality: string | null;
          subject_org: string | null;
          subject_org_unit: string | null;
          subject_state: string | null;
          valid_from: string;
          valid_to: string;
        };
        Insert: {
          id?: string;
          issuer_common_name?: string | null;
          issuer_country?: string | null;
          issuer_locality?: string | null;
          issuer_org?: string | null;
          issuer_org_unit?: string | null;
          issuer_state?: string | null;
          pem: string;
          serial_number: string;
          subject_alt_name: string;
          subject_common_name?: string | null;
          subject_country?: string | null;
          subject_locality?: string | null;
          subject_org?: string | null;
          subject_org_unit?: string | null;
          subject_state?: string | null;
          valid_from: string;
          valid_to: string;
        };
        Update: {
          id?: string;
          issuer_common_name?: string | null;
          issuer_country?: string | null;
          issuer_locality?: string | null;
          issuer_org?: string | null;
          issuer_org_unit?: string | null;
          issuer_state?: string | null;
          pem?: string;
          serial_number?: string;
          subject_alt_name?: string;
          subject_common_name?: string | null;
          subject_country?: string | null;
          subject_locality?: string | null;
          subject_org?: string | null;
          subject_org_unit?: string | null;
          subject_state?: string | null;
          valid_from?: string;
          valid_to?: string;
        };
        Relationships: [];
      };
      transaction: {
        Row: {
          block_id: string | null;
          block_number: number | null;
          channel_id: string;
          epoch: number;
          hash: string;
          id: string;
          protocol_version: number;
          timestamp: string;
          type: string;
        };
        Insert: {
          block_id?: string | null;
          block_number?: number | null;
          channel_id: string;
          epoch: number;
          hash: string;
          id?: string;
          protocol_version?: number;
          timestamp: string;
          type: string;
        };
        Update: {
          block_id?: string | null;
          block_number?: number | null;
          channel_id?: string;
          epoch?: number;
          hash?: string;
          id?: string;
          protocol_version?: number;
          timestamp?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "block";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_block_number_fkey";
            columns: ["block_number"];
            isOneToOne: false;
            referencedRelation: "block";
            referencedColumns: ["number"];
          },
        ];
      };
      transaction_action: {
        Row: {
          chaincode_id: string;
          creator_certificate_id: string | null;
          creator_msp_id: string;
          function_args: string | null;
          function_name: string | null;
          id: string;
          transaction_id: string | null;
        };
        Insert: {
          chaincode_id: string;
          creator_certificate_id?: string | null;
          creator_msp_id: string;
          function_args?: string | null;
          function_name?: string | null;
          id?: string;
          transaction_id?: string | null;
        };
        Update: {
          chaincode_id?: string;
          creator_certificate_id?: string | null;
          creator_msp_id?: string;
          function_args?: string | null;
          function_name?: string | null;
          id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_action_creator_certificate_id_fkey";
            columns: ["creator_certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificate";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_action_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transaction";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_action_endorsement: {
        Row: {
          certificate_id: string;
          id: string;
          mspid: string;
          signature: string;
          transaction_action_id: string | null;
        };
        Insert: {
          certificate_id: string;
          id?: string;
          mspid: string;
          signature: string;
          transaction_action_id?: string | null;
        };
        Update: {
          certificate_id?: string;
          id?: string;
          mspid?: string;
          signature?: string;
          transaction_action_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_action_endorsement_transaction_action_id_fkey";
            columns: ["transaction_action_id"];
            isOneToOne: false;
            referencedRelation: "transaction_action";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transaction_action_endorsements_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "certificate";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_missing_blocks_in_range: {
        Args: {
          start_number: number;
          end_number: number;
        };
        Returns: {
          block_number: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
