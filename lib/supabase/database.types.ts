export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          student_id: string | null
          phone: string | null
          line_user_id: string | null
          preferred_contact: string | null
          role: 'USER' | 'ADMIN' | 'STAFF'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          student_id?: string | null
          phone?: string | null
          line_user_id?: string | null
          preferred_contact?: string | null
          role?: 'USER' | 'ADMIN' | 'STAFF'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          student_id?: string | null
          phone?: string | null
          line_user_id?: string | null
          preferred_contact?: string | null
          role?: 'USER' | 'ADMIN' | 'STAFF'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      items: {
        Row: {
          id: string
          user_id: string
          type: 'LOST' | 'FOUND'
          title: string
          description: string | null
          category: string | null
          image_urls: string[]
          location_building: string | null
          location_floor: string | null
          location_detail: string | null
          dropoff_location: string | null
          secret_challenge: string | null
          ai_tags: string[]
          ai_category: string | null
          ai_color: string | null
          ai_metadata: Json
          ai_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
          retry_count: number
          status: 'OPEN' | 'MATCHED' | 'CLAIMED' | 'RETURNED' | 'EXPIRED'
          event_date: string
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'LOST' | 'FOUND'
          title: string
          description?: string | null
          category?: string | null
          image_urls?: string[]
          location_building?: string | null
          location_floor?: string | null
          location_detail?: string | null
          dropoff_location?: string | null
          secret_challenge?: string | null
          ai_tags?: string[]
          ai_category?: string | null
          ai_color?: string | null
          ai_metadata?: Json
          ai_status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
          retry_count?: number
          status?: 'OPEN' | 'MATCHED' | 'CLAIMED' | 'RETURNED' | 'EXPIRED'
          event_date?: string
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'LOST' | 'FOUND'
          title?: string
          description?: string | null
          category?: string | null
          image_urls?: string[]
          location_building?: string | null
          location_floor?: string | null
          location_detail?: string | null
          dropoff_location?: string | null
          secret_challenge?: string | null
          ai_tags?: string[]
          ai_category?: string | null
          ai_color?: string | null
          ai_metadata?: Json
          ai_status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
          retry_count?: number
          status?: 'OPEN' | 'MATCHED' | 'CLAIMED' | 'RETURNED' | 'EXPIRED'
          event_date?: string
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      claims: {
        Row: {
          id: string
          item_id: string
          claimant_id: string
          challenge_answer: string | null
          proof_description: string | null
          proof_image_urls: string[]
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          reviewed_by: string | null
          review_note: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          claimant_id: string
          challenge_answer?: string | null
          proof_description?: string | null
          proof_image_urls?: string[]
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          reviewed_by?: string | null
          review_note?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          claimant_id?: string
          challenge_answer?: string | null
          proof_description?: string | null
          proof_image_urls?: string[]
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          reviewed_by?: string | null
          review_note?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      match_suggestions: {
        Row: {
          id: string
          lost_item_id: string
          found_item_id: string
          score: number
          match_details: Json
          notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lost_item_id: string
          found_item_id: string
          score: number
          match_details?: Json
          notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lost_item_id?: string
          found_item_id?: string
          score?: number
          match_details?: Json
          notified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_suggestions_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_suggestions_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
