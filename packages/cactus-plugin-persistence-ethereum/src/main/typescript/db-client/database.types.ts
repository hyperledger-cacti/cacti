export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  ethereum: {
    Tables: {
      block: {
        Row: {
          number: number;
          created_at: string;
          hash: string;
          number_of_tx: number;
          sync_at: string;
        };
        Insert: {
          number: number;
          created_at: string;
          hash: string;
          number_of_tx: number;
          sync_at?: string;
        };
        Update: {
          number?: number;
          created_at?: string;
          hash?: string;
          number_of_tx?: number;
          sync_at?: string;
        };
      };
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
      token_erc721: {
        Row: {
          account_address: string;
          token_address: string;
          uri: string;
          token_id: number;
          id: string;
          last_owner_change: string;
        };
        Insert: {
          account_address: string;
          token_address: string;
          uri: string;
          token_id: number;
          id?: string;
          last_owner_change?: string;
        };
        Update: {
          account_address?: string;
          token_address?: string;
          uri?: string;
          token_id?: number;
          id?: string;
          last_owner_change?: string;
        };
      };
      token_metadata_erc20: {
        Row: {
          address: string;
          name: string;
          symbol: string;
          total_supply: number;
          created_at: string;
        };
        Insert: {
          address: string;
          name: string;
          symbol: string;
          total_supply: number;
          created_at?: string;
        };
        Update: {
          address?: string;
          name?: string;
          symbol?: string;
          total_supply?: number;
          created_at?: string;
        };
      };
      token_metadata_erc721: {
        Row: {
          address: string;
          name: string;
          symbol: string;
          created_at: string;
        };
        Insert: {
          address: string;
          name: string;
          symbol: string;
          created_at?: string;
        };
        Update: {
          address?: string;
          name?: string;
          symbol?: string;
          created_at?: string;
        };
      };
      token_transfer: {
        Row: {
          transaction_id: string;
          sender: string;
          recipient: string;
          value: number;
          id: string;
        };
        Insert: {
          transaction_id: string;
          sender: string;
          recipient: string;
          value: number;
          id?: string;
        };
        Update: {
          transaction_id?: string;
          sender?: string;
          recipient?: string;
          value?: number;
          id?: string;
        };
      };
      transaction: {
        Row: {
          index: number;
          hash: string;
          block_number: number;
          from: string;
          to: string;
          eth_value: number;
          method_signature: string;
          method_name: string;
          id: string;
        };
        Insert: {
          index: number;
          hash: string;
          block_number: number;
          from: string;
          to: string;
          eth_value: number;
          method_signature: string;
          method_name: string;
          id?: string;
        };
        Update: {
          index?: number;
          hash?: string;
          block_number?: number;
          from?: string;
          to?: string;
          eth_value?: number;
          method_signature?: string;
          method_name?: string;
          id?: string;
        };
      };
    };
    Views: {
      erc20_token_history_view: {
        Row: {
          transaction_hash: string | null;
          token_address: string | null;
          created_at: string | null;
          sender: string | null;
          recipient: string | null;
          value: number | null;
        };
      };
      erc721_token_history_view: {
        Row: {
          transaction_hash: string | null;
          token_address: string | null;
          created_at: string | null;
          sender: string | null;
          recipient: string | null;
          token_id: number | null;
        };
      };
    };
    Functions: {
      get_missing_blocks_in_range: {
        Args: { start_number: number; end_number: number };
        Returns: { block_number: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
