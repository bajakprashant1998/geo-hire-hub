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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      application_notes: {
        Row: {
          application_id: string
          created_at: string
          employer_id: string
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          employer_id: string
          id?: string
          note: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          cover_letter: string | null
          created_at: string | null
          id: string
          job_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_resumes: {
        Row: {
          candidate_id: string
          content: Json
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          resume_score: number | null
          style: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          content?: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          resume_score?: number | null
          style?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          content?: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          resume_score?: number | null
          style?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          audio_resume_created_at: string | null
          audio_resume_text: string | null
          audio_resume_tone: string | null
          audio_resume_url: string | null
          availability_status: string | null
          bio: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          certifications: string[] | null
          created_at: string | null
          education: Json | null
          expected_salary: string | null
          experience_years: number | null
          headline: string | null
          id: string
          is_blocked: boolean | null
          job_title: string
          languages: Json | null
          portfolio_urls: string[] | null
          preferred_job_types: string[] | null
          preferred_locations: string[] | null
          profile_id: string
          resume_filename: string | null
          resume_uploaded_at: string | null
          resume_url: string | null
          resume_visibility: string | null
          skills: string[] | null
          social_links: Json | null
          updated_at: string | null
          work_experience: Json | null
        }
        Insert: {
          audio_resume_created_at?: string | null
          audio_resume_text?: string | null
          audio_resume_tone?: string | null
          audio_resume_url?: string | null
          availability_status?: string | null
          bio?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          expected_salary?: string | null
          experience_years?: number | null
          headline?: string | null
          id?: string
          is_blocked?: boolean | null
          job_title: string
          languages?: Json | null
          portfolio_urls?: string[] | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          profile_id: string
          resume_filename?: string | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          resume_visibility?: string | null
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
          work_experience?: Json | null
        }
        Update: {
          audio_resume_created_at?: string | null
          audio_resume_text?: string | null
          audio_resume_tone?: string | null
          audio_resume_url?: string | null
          availability_status?: string | null
          bio?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          certifications?: string[] | null
          created_at?: string | null
          education?: Json | null
          expected_salary?: string | null
          experience_years?: number | null
          headline?: string | null
          id?: string
          is_blocked?: boolean | null
          job_title?: string
          languages?: Json | null
          portfolio_urls?: string[] | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          profile_id?: string
          resume_filename?: string | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          resume_visibility?: string | null
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
          work_experience?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      employer_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_active_jobs: number
          name: string
          price_monthly: number
          price_yearly: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_active_jobs?: number
          name: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_active_jobs?: number
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      employer_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: string | null
          employer_id: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          employer_id: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          employer_id?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employer_subscriptions: {
        Row: {
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          employer_id: string
          id: string
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          employer_id: string
          id?: string
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          employer_id?: string
          id?: string
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_subscriptions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: true
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "employer_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          benefits: string[] | null
          business_card_url: string | null
          company_name: string
          country_code: string | null
          created_at: string | null
          culture_description: string | null
          description: string | null
          founding_year: number | null
          government_domain_verified: boolean | null
          government_email_domain: string | null
          hiring_process: string | null
          id: string
          industry: string | null
          is_government: boolean | null
          is_suspended: boolean | null
          office_photo_url: string | null
          profile_completeness: number | null
          profile_id: string
          social_links: Json | null
          specializations: string[] | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          tax_id: string | null
          tax_type: string | null
          team_size: string | null
          terms_accepted_at: string | null
          updated_at: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          website_url: string | null
        }
        Insert: {
          benefits?: string[] | null
          business_card_url?: string | null
          company_name: string
          country_code?: string | null
          created_at?: string | null
          culture_description?: string | null
          description?: string | null
          founding_year?: number | null
          government_domain_verified?: boolean | null
          government_email_domain?: string | null
          hiring_process?: string | null
          id?: string
          industry?: string | null
          is_government?: boolean | null
          is_suspended?: boolean | null
          office_photo_url?: string | null
          profile_completeness?: number | null
          profile_id: string
          social_links?: Json | null
          specializations?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_type?: string | null
          team_size?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Update: {
          benefits?: string[] | null
          business_card_url?: string | null
          company_name?: string
          country_code?: string | null
          created_at?: string | null
          culture_description?: string | null
          description?: string | null
          founding_year?: number | null
          government_domain_verified?: boolean | null
          government_email_domain?: string | null
          hiring_process?: string | null
          id?: string
          industry?: string | null
          is_government?: boolean | null
          is_suspended?: boolean | null
          office_photo_url?: string | null
          profile_completeness?: number | null
          profile_id?: string
          social_links?: Json | null
          specializations?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_type?: string | null
          team_size?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      government_domains: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          domain: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          application_id: string
          candidate_id: string
          created_at: string
          employer_id: string
          id: string
          interview_type: string
          job_id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_id: string
          created_at?: string
          employer_id: string
          id?: string
          interview_type?: string
          job_id: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          interview_type?: string
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          candidate_id: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_email_enabled: boolean | null
          is_push_enabled: boolean | null
          location: string | null
          name: string
          skills: string[] | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_email_enabled?: boolean | null
          is_push_enabled?: boolean | null
          location?: string | null
          name: string
          skills?: string[] | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_email_enabled?: boolean | null
          is_push_enabled?: boolean | null
          location?: string | null
          name?: string
          skills?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      job_category_stats: {
        Row: {
          category_name: string
          created_at: string
          id: string
          last_used_at: string | null
          search_count: number
          selection_count: number
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          search_count?: number
          selection_count?: number
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          search_count?: number
          selection_count?: number
        }
        Relationships: []
      }
      job_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          employer_id: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_data?: Json
          employer_id: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          employer_id?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_drafts_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_matches: {
        Row: {
          candidate_id: string
          created_at: string
          experience_match: boolean | null
          id: string
          job_id: string
          location_match: boolean | null
          match_reasons: Json | null
          match_score: number
          missing_skills: string[] | null
          salary_match: boolean | null
          skill_overlap: string[] | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          experience_match?: boolean | null
          id?: string
          job_id: string
          location_match?: boolean | null
          match_reasons?: Json | null
          match_score: number
          missing_skills?: string[] | null
          salary_match?: boolean | null
          skill_overlap?: string[] | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          experience_match?: boolean | null
          id?: string
          job_id?: string
          location_match?: boolean | null
          match_reasons?: Json | null
          match_score?: number
          missing_skills?: string[] | null
          salary_match?: boolean | null
          skill_overlap?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: string | null
          id: string
          job_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          job_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          job_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_views: {
        Row: {
          id: string
          ip_hash: string | null
          job_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          job_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          job_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          category: string | null
          certifications: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_role: string | null
          created_at: string | null
          description: string | null
          education: string | null
          employer_id: string
          end_time: string | null
          experience_type: string | null
          expires_at: string | null
          gender_preference: string | null
          has_bonus: boolean | null
          hiring_frequency: string | null
          hiring_urgency: string | null
          id: string
          interview_days: string[] | null
          interview_time: string | null
          is_active: boolean | null
          job_address: string | null
          job_category: string | null
          job_type: string | null
          languages: string[] | null
          latitude: number
          longitude: number
          max_age: number | null
          max_experience: number | null
          min_age: number | null
          min_experience: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status: string | null
          openings: number | null
          organization_size: string | null
          salary_range: string | null
          shift_type: string | null
          skills: string[] | null
          start_time: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string | null
          view_count: number | null
          work_days: string[] | null
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          category?: string | null
          certifications?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          description?: string | null
          education?: string | null
          employer_id: string
          end_time?: string | null
          experience_type?: string | null
          expires_at?: string | null
          gender_preference?: string | null
          has_bonus?: boolean | null
          hiring_frequency?: string | null
          hiring_urgency?: string | null
          id?: string
          interview_days?: string[] | null
          interview_time?: string | null
          is_active?: boolean | null
          job_address?: string | null
          job_category?: string | null
          job_type?: string | null
          languages?: string[] | null
          latitude: number
          longitude: number
          max_age?: number | null
          max_experience?: number | null
          min_age?: number | null
          min_experience?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          openings?: number | null
          organization_size?: string | null
          salary_range?: string | null
          shift_type?: string | null
          skills?: string[] | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          work_days?: string[] | null
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          category?: string | null
          certifications?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string | null
          description?: string | null
          education?: string | null
          employer_id?: string
          end_time?: string | null
          experience_type?: string | null
          expires_at?: string | null
          gender_preference?: string | null
          has_bonus?: boolean | null
          hiring_frequency?: string | null
          hiring_urgency?: string | null
          id?: string
          interview_days?: string[] | null
          interview_time?: string | null
          is_active?: boolean | null
          job_address?: string | null
          job_category?: string | null
          job_type?: string | null
          languages?: string[] | null
          latitude?: number
          longitude?: number
          max_age?: number | null
          max_experience?: number | null
          min_age?: number | null
          min_experience?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?: string | null
          openings?: number | null
          organization_size?: string | null
          salary_range?: string | null
          shift_type?: string | null
          skills?: string[] | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          work_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          target_audience: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          target_audience?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          target_audience?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          custom_email_verified: boolean | null
          full_name: string
          id: string
          is_visible_on_map: boolean | null
          last_login_at: string | null
          latitude: number | null
          longitude: number | null
          profile_completed: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          custom_email_verified?: boolean | null
          full_name: string
          id?: string
          is_visible_on_map?: boolean | null
          last_login_at?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_completed?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          custom_email_verified?: boolean | null
          full_name?: string
          id?: string
          is_visible_on_map?: boolean | null
          last_login_at?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_completed?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          id?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_candidates_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          candidate_id: string
          candidate_notes: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          employer_id: string
          id: string
          job_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          candidate_notes?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employer_id: string
          id?: string
          job_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          candidate_notes?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employer_id?: string
          id?: string
          job_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_visible_on_map: boolean | null
          latitude: number | null
          longitude: number | null
          profile_completed: boolean | null
          updated_at: string | null
          user_id: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_visible_on_map?: boolean | null
          latitude?: number | null
          longitude?: number | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_visible_on_map?: boolean | null
          latitude?: number | null
          longitude?: number | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_employer_profile_completeness: {
        Args: { p_employer_id: string }
        Returns: number
      }
      can_employer_activate_job: {
        Args: { p_employer_id: string; p_exclude_job_id?: string }
        Returns: Json
      }
      cleanup_old_messages: { Args: never; Returns: undefined }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_current_user_candidate_id: { Args: never; Returns: string }
      get_current_user_employer_id: { Args: never; Returns: string }
      get_current_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_type"]
      }
      get_job_analytics: { Args: { p_job_id: string }; Returns: Json }
      get_nearby_candidates: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          avatar_url: string
          distance_km: number
          experience_years: number
          full_name: string
          id: string
          job_title: string
          latitude: number
          longitude: number
          profile_id: string
          skills: string[]
        }[]
      }
      get_nearby_jobs: {
        Args: { radius_km?: number; user_lat: number; user_lng: number }
        Returns: {
          company_name: string
          created_at: string
          description: string
          distance_km: number
          employer_id: string
          id: string
          job_category: string
          job_type: string
          latitude: number
          longitude: number
          salary_range: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }[]
      }
      get_popular_categories: {
        Args: { p_limit?: number }
        Returns: {
          category_name: string
          popularity_score: number
        }[]
      }
      has_application_relationship: {
        Args: { _profile_id: string; _viewer_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_employer_profile: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_candidate: { Args: { _user_id: string }; Returns: boolean }
      is_employer: { Args: { _user_id: string }; Returns: boolean }
      is_government_email: { Args: { email: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      track_category_usage: {
        Args: { p_category_name: string; p_is_selection?: boolean }
        Returns: undefined
      }
      verify_email_token: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      job_status: "open" | "closed"
      user_type: "candidate" | "employer"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      job_status: ["open", "closed"],
      user_type: ["candidate", "employer"],
    },
  },
} as const
