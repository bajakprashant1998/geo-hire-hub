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
          candidate_notes: string | null
          cover_letter: string | null
          created_at: string | null
          follow_up_date: string | null
          id: string
          job_id: string
          kanban_stage: string
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          candidate_notes?: string | null
          cover_letter?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          job_id: string
          kanban_stage?: string
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          candidate_notes?: string | null
          cover_letter?: string | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          job_id?: string
          kanban_stage?: string
          priority?: string | null
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
      assessment_questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json
          points: number
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          points?: number
          question_text: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          points?: number
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          answers: Json
          assessment_id: string
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_id: string | null
          max_score: number
          passed: boolean
          percentage: number
          score: number
          started_at: string
          time_taken_seconds: number | null
        }
        Insert: {
          answers?: Json
          assessment_id: string
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          max_score?: number
          passed?: boolean
          percentage?: number
          score?: number
          started_at?: string
          time_taken_seconds?: number | null
        }
        Update: {
          answers?: Json
          assessment_id?: string
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          max_score?: number
          passed?: boolean
          percentage?: number
          score?: number
          started_at?: string
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_apply_logs: {
        Row: {
          application_id: string | null
          candidate_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          match_score: number
          skip_reason: string | null
          status: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          match_score?: number
          skip_reason?: string | null
          status?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number
          skip_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_apply_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_apply_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_apply_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_apply_preferences: {
        Row: {
          candidate_id: string
          company_size_preference: string[]
          created_at: string
          daily_limit: number
          excluded_companies: string[]
          experience_level: string | null
          focus_skills: string[]
          generate_cover_letter: boolean
          id: string
          industry_preference: string[]
          is_enabled: boolean
          location_radius: string
          match_threshold: number
          min_salary: string | null
          preferred_locations: string[]
          preferred_titles: string[]
          remote_only: boolean
          salary_currency: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company_size_preference?: string[]
          created_at?: string
          daily_limit?: number
          excluded_companies?: string[]
          experience_level?: string | null
          focus_skills?: string[]
          generate_cover_letter?: boolean
          id?: string
          industry_preference?: string[]
          is_enabled?: boolean
          location_radius?: string
          match_threshold?: number
          min_salary?: string | null
          preferred_locations?: string[]
          preferred_titles?: string[]
          remote_only?: boolean
          salary_currency?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company_size_preference?: string[]
          created_at?: string
          daily_limit?: number
          excluded_companies?: string[]
          experience_level?: string | null
          focus_skills?: string[]
          generate_cover_letter?: boolean
          id?: string
          industry_preference?: string[]
          is_enabled?: boolean
          location_radius?: string
          match_threshold?: number
          min_salary?: string | null
          preferred_locations?: string[]
          preferred_titles?: string[]
          remote_only?: boolean
          salary_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_apply_preferences_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
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
          achievements: string[] | null
          address_line: string | null
          audio_resume_created_at: string | null
          audio_resume_text: string | null
          audio_resume_tone: string | null
          audio_resume_url: string | null
          availability_status: string | null
          bio: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          career_objective: string | null
          certifications: string[] | null
          city: string | null
          country: string | null
          cover_letter_default: string | null
          created_at: string | null
          current_company: string | null
          current_salary: string | null
          date_of_birth: string | null
          disability_status: string | null
          driving_license: boolean | null
          education: Json | null
          expected_salary: string | null
          experience_years: number | null
          gender: string | null
          headline: string | null
          hobbies: string[] | null
          id: string
          industry_preference: string[] | null
          is_blocked: boolean | null
          job_title: string
          languages: Json | null
          marital_status: string | null
          military_veteran: boolean | null
          nationality: string | null
          notice_period: string | null
          pincode: string | null
          portfolio_urls: string[] | null
          preferred_job_types: string[] | null
          preferred_locations: string[] | null
          profile_id: string
          projects: Json | null
          references_available: boolean | null
          remote_preference: string | null
          resume_filename: string | null
          resume_uploaded_at: string | null
          resume_url: string | null
          resume_visibility: string | null
          salary_currency: string | null
          skills: string[] | null
          social_links: Json | null
          state: string | null
          strengths: string[] | null
          updated_at: string | null
          video_intro_url: string | null
          willing_to_relocate: boolean | null
          work_authorization: string | null
          work_experience: Json | null
        }
        Insert: {
          achievements?: string[] | null
          address_line?: string | null
          audio_resume_created_at?: string | null
          audio_resume_text?: string | null
          audio_resume_tone?: string | null
          audio_resume_url?: string | null
          availability_status?: string | null
          bio?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          career_objective?: string | null
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          cover_letter_default?: string | null
          created_at?: string | null
          current_company?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          disability_status?: string | null
          driving_license?: boolean | null
          education?: Json | null
          expected_salary?: string | null
          experience_years?: number | null
          gender?: string | null
          headline?: string | null
          hobbies?: string[] | null
          id?: string
          industry_preference?: string[] | null
          is_blocked?: boolean | null
          job_title: string
          languages?: Json | null
          marital_status?: string | null
          military_veteran?: boolean | null
          nationality?: string | null
          notice_period?: string | null
          pincode?: string | null
          portfolio_urls?: string[] | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          profile_id: string
          projects?: Json | null
          references_available?: boolean | null
          remote_preference?: string | null
          resume_filename?: string | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          resume_visibility?: string | null
          salary_currency?: string | null
          skills?: string[] | null
          social_links?: Json | null
          state?: string | null
          strengths?: string[] | null
          updated_at?: string | null
          video_intro_url?: string | null
          willing_to_relocate?: boolean | null
          work_authorization?: string | null
          work_experience?: Json | null
        }
        Update: {
          achievements?: string[] | null
          address_line?: string | null
          audio_resume_created_at?: string | null
          audio_resume_text?: string | null
          audio_resume_tone?: string | null
          audio_resume_url?: string | null
          availability_status?: string | null
          bio?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          career_objective?: string | null
          certifications?: string[] | null
          city?: string | null
          country?: string | null
          cover_letter_default?: string | null
          created_at?: string | null
          current_company?: string | null
          current_salary?: string | null
          date_of_birth?: string | null
          disability_status?: string | null
          driving_license?: boolean | null
          education?: Json | null
          expected_salary?: string | null
          experience_years?: number | null
          gender?: string | null
          headline?: string | null
          hobbies?: string[] | null
          id?: string
          industry_preference?: string[] | null
          is_blocked?: boolean | null
          job_title?: string
          languages?: Json | null
          marital_status?: string | null
          military_veteran?: boolean | null
          nationality?: string | null
          notice_period?: string | null
          pincode?: string | null
          portfolio_urls?: string[] | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          profile_id?: string
          projects?: Json | null
          references_available?: boolean | null
          remote_preference?: string | null
          resume_filename?: string | null
          resume_uploaded_at?: string | null
          resume_url?: string | null
          resume_visibility?: string | null
          salary_currency?: string | null
          skills?: string[] | null
          social_links?: Json | null
          state?: string | null
          strengths?: string[] | null
          updated_at?: string | null
          video_intro_url?: string | null
          willing_to_relocate?: boolean | null
          work_authorization?: string | null
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
      company_reviews: {
        Row: {
          cons: string | null
          created_at: string
          culture_rating: number | null
          employer_id: string
          growth_rating: number | null
          helpful_count: number
          id: string
          is_anonymous: boolean
          is_approved: boolean
          is_flagged: boolean
          management_rating: number | null
          overall_rating: number
          pros: string | null
          relationship: string
          reviewer_id: string
          salary_rating: number | null
          title: string
          updated_at: string
          worklife_rating: number | null
        }
        Insert: {
          cons?: string | null
          created_at?: string
          culture_rating?: number | null
          employer_id: string
          growth_rating?: number | null
          helpful_count?: number
          id?: string
          is_anonymous?: boolean
          is_approved?: boolean
          is_flagged?: boolean
          management_rating?: number | null
          overall_rating: number
          pros?: string | null
          relationship: string
          reviewer_id: string
          salary_rating?: number | null
          title: string
          updated_at?: string
          worklife_rating?: number | null
        }
        Update: {
          cons?: string | null
          created_at?: string
          culture_rating?: number | null
          employer_id?: string
          growth_rating?: number | null
          helpful_count?: number
          id?: string
          is_anonymous?: boolean
          is_approved?: boolean
          is_flagged?: boolean
          management_rating?: number | null
          overall_rating?: number
          pros?: string | null
          relationship?: string
          reviewer_id?: string
          salary_rating?: number | null
          title?: string
          updated_at?: string
          worklife_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
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
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          status: string
          subject: string
          template_key: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          status?: string
          subject: string
          template_key: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          status?: string
          subject?: string
          template_key?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_body: string
          id: string
          is_active: boolean | null
          subject: string
          template_key: string
          updated_at: string
          updated_by: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_body: string
          id?: string
          is_active?: boolean | null
          subject: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_body?: string
          id?: string
          is_active?: boolean | null
          subject?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[] | null
        }
        Relationships: []
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
      employer_blacklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type?: string
          value?: string
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
      employer_verification_checks: {
        Row: {
          check_type: string
          created_at: string
          details: Json | null
          employer_id: string
          id: string
          score: number
          status: string
        }
        Insert: {
          check_type: string
          created_at?: string
          details?: Json | null
          employer_id: string
          id?: string
          score?: number
          status?: string
        }
        Update: {
          check_type?: string
          created_at?: string
          details?: Json | null
          employer_id?: string
          id?: string
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_verification_checks_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          assessment_types: string[] | null
          avg_salary_range: string | null
          awards_recognition: string[] | null
          benefits: string[] | null
          bonus_structure: string | null
          business_card_url: string | null
          career_growth_paths: string | null
          careers_page_url: string | null
          company_name: string
          company_registration_url: string | null
          company_values: string[] | null
          country_code: string | null
          created_at: string | null
          culture_description: string | null
          description: string | null
          diversity_policies: string | null
          education_preference: string | null
          employee_retention_rate: string | null
          founding_year: number | null
          fresher_hiring: boolean | null
          google_business_url: string | null
          google_business_verified: boolean | null
          government_domain_verified: boolean | null
          government_email_domain: string | null
          gst_license_url: string | null
          hiring_process: string | null
          hiring_timeline: string | null
          hr_contact_email: string | null
          id: string
          industry: string | null
          internship_available: boolean | null
          interview_rounds_count: number | null
          is_government: boolean | null
          is_suspended: boolean | null
          key_skills_hiring: string[] | null
          last_verification_at: string | null
          learning_budget: string | null
          location_city: string | null
          location_country: string | null
          location_state: string | null
          next_reverification_at: string | null
          office_locations: string[] | null
          office_photo_url: string | null
          paid_leaves_policy: string | null
          pan_url: string | null
          preferred_certifications: string[] | null
          profile_completeness: number | null
          profile_id: string
          promotion_frequency: string | null
          relocation_support: boolean | null
          slug: string | null
          social_links: Json | null
          specializations: string[] | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          tax_id: string | null
          tax_type: string | null
          team_size: string | null
          tech_stack: string[] | null
          terms_accepted_at: string | null
          trust_score: number | null
          updated_at: string | null
          verification_method: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          website_url: string | null
          work_culture_type: string | null
          work_environment: string | null
          work_life_balance_rating: number | null
        }
        Insert: {
          assessment_types?: string[] | null
          avg_salary_range?: string | null
          awards_recognition?: string[] | null
          benefits?: string[] | null
          bonus_structure?: string | null
          business_card_url?: string | null
          career_growth_paths?: string | null
          careers_page_url?: string | null
          company_name: string
          company_registration_url?: string | null
          company_values?: string[] | null
          country_code?: string | null
          created_at?: string | null
          culture_description?: string | null
          description?: string | null
          diversity_policies?: string | null
          education_preference?: string | null
          employee_retention_rate?: string | null
          founding_year?: number | null
          fresher_hiring?: boolean | null
          google_business_url?: string | null
          google_business_verified?: boolean | null
          government_domain_verified?: boolean | null
          government_email_domain?: string | null
          gst_license_url?: string | null
          hiring_process?: string | null
          hiring_timeline?: string | null
          hr_contact_email?: string | null
          id?: string
          industry?: string | null
          internship_available?: boolean | null
          interview_rounds_count?: number | null
          is_government?: boolean | null
          is_suspended?: boolean | null
          key_skills_hiring?: string[] | null
          last_verification_at?: string | null
          learning_budget?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          next_reverification_at?: string | null
          office_locations?: string[] | null
          office_photo_url?: string | null
          paid_leaves_policy?: string | null
          pan_url?: string | null
          preferred_certifications?: string[] | null
          profile_completeness?: number | null
          profile_id: string
          promotion_frequency?: string | null
          relocation_support?: boolean | null
          slug?: string | null
          social_links?: Json | null
          specializations?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_type?: string | null
          team_size?: string | null
          tech_stack?: string[] | null
          terms_accepted_at?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website_url?: string | null
          work_culture_type?: string | null
          work_environment?: string | null
          work_life_balance_rating?: number | null
        }
        Update: {
          assessment_types?: string[] | null
          avg_salary_range?: string | null
          awards_recognition?: string[] | null
          benefits?: string[] | null
          bonus_structure?: string | null
          business_card_url?: string | null
          career_growth_paths?: string | null
          careers_page_url?: string | null
          company_name?: string
          company_registration_url?: string | null
          company_values?: string[] | null
          country_code?: string | null
          created_at?: string | null
          culture_description?: string | null
          description?: string | null
          diversity_policies?: string | null
          education_preference?: string | null
          employee_retention_rate?: string | null
          founding_year?: number | null
          fresher_hiring?: boolean | null
          google_business_url?: string | null
          google_business_verified?: boolean | null
          government_domain_verified?: boolean | null
          government_email_domain?: string | null
          gst_license_url?: string | null
          hiring_process?: string | null
          hiring_timeline?: string | null
          hr_contact_email?: string | null
          id?: string
          industry?: string | null
          internship_available?: boolean | null
          interview_rounds_count?: number | null
          is_government?: boolean | null
          is_suspended?: boolean | null
          key_skills_hiring?: string[] | null
          last_verification_at?: string | null
          learning_budget?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          next_reverification_at?: string | null
          office_locations?: string[] | null
          office_photo_url?: string | null
          paid_leaves_policy?: string | null
          pan_url?: string | null
          preferred_certifications?: string[] | null
          profile_completeness?: number | null
          profile_id?: string
          promotion_frequency?: string | null
          relocation_support?: boolean | null
          slug?: string | null
          social_links?: Json | null
          specializations?: string[] | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_type?: string | null
          team_size?: string | null
          tech_stack?: string[] | null
          terms_accepted_at?: string | null
          trust_score?: number | null
          updated_at?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          website_url?: string | null
          work_culture_type?: string | null
          work_environment?: string | null
          work_life_balance_rating?: number | null
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
      fraud_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
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
          cancel_reason: string | null
          cancelled_by: string | null
          candidate_id: string
          candidate_message: string | null
          completed_at: string | null
          confirmed_by_candidate: boolean
          confirmed_by_employer: boolean
          created_at: string
          employer_id: string
          employer_notes: string | null
          id: string
          interview_type: string
          job_id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          requested_by: string
          rescheduled_from: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          cancel_reason?: string | null
          cancelled_by?: string | null
          candidate_id: string
          candidate_message?: string | null
          completed_at?: string | null
          confirmed_by_candidate?: boolean
          confirmed_by_employer?: boolean
          created_at?: string
          employer_id: string
          employer_notes?: string | null
          id?: string
          interview_type?: string
          job_id: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          requested_by?: string
          rescheduled_from?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          cancel_reason?: string | null
          cancelled_by?: string | null
          candidate_id?: string
          candidate_message?: string | null
          completed_at?: string | null
          confirmed_by_candidate?: boolean
          confirmed_by_employer?: boolean
          created_at?: string
          employer_id?: string
          employer_notes?: string | null
          id?: string
          interview_type?: string
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          requested_by?: string
          rescheduled_from?: string | null
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
          {
            foreignKeyName: "interviews_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "interviews"
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
          ai_screening_score: number | null
          candidate_id: string
          created_at: string
          experience_match: boolean | null
          id: string
          job_id: string
          location_match: boolean | null
          match_reasons: Json | null
          match_score: number
          missing_skills: string[] | null
          recommendation: string | null
          salary_match: boolean | null
          screening_summary: string | null
          skill_gaps: Json | null
          skill_overlap: string[] | null
          updated_at: string
        }
        Insert: {
          ai_screening_score?: number | null
          candidate_id: string
          created_at?: string
          experience_match?: boolean | null
          id?: string
          job_id: string
          location_match?: boolean | null
          match_reasons?: Json | null
          match_score: number
          missing_skills?: string[] | null
          recommendation?: string | null
          salary_match?: boolean | null
          screening_summary?: string | null
          skill_gaps?: Json | null
          skill_overlap?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_screening_score?: number | null
          candidate_id?: string
          created_at?: string
          experience_match?: boolean | null
          id?: string
          job_id?: string
          location_match?: boolean | null
          match_reasons?: Json | null
          match_score?: number
          missing_skills?: string[] | null
          recommendation?: string | null
          salary_match?: boolean | null
          screening_summary?: string | null
          skill_gaps?: Json | null
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
          assessment_id: string | null
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
          location_city: string | null
          location_country: string | null
          location_state: string | null
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
          salary_currency: string | null
          salary_range: string | null
          shift_type: string | null
          skills: string[] | null
          slug: string | null
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
          assessment_id?: string | null
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
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
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
          salary_currency?: string | null
          salary_range?: string | null
          shift_type?: string | null
          skills?: string[] | null
          slug?: string | null
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
          assessment_id?: string | null
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
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
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
          salary_currency?: string | null
          salary_range?: string | null
          shift_type?: string | null
          skills?: string[] | null
          slug?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          work_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "skill_assessments"
            referencedColumns: ["id"]
          },
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
      notification_preferences: {
        Row: {
          created_at: string
          email_digest_frequency: string
          email_notifications_enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_digest_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_digest_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
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
      profile_views: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          location_city: string | null
          location_country: string | null
          location_state: string | null
          longitude: number | null
          profile_completed: boolean | null
          slug: string | null
          timezone: string | null
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
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          longitude?: number | null
          profile_completed?: boolean | null
          slug?: string | null
          timezone?: string | null
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
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          longitude?: number | null
          profile_completed?: boolean | null
          slug?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          points_earned: number
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          points_earned?: number
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          points_earned?: number
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_points: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          points: number
          referral_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          referral_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          referral_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_points_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_job_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_name: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_name: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_name?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          body: string | null
          content_key: string
          content_type: string
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          content_key: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          content_key?: string
          content_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      skill_assessments: {
        Row: {
          avg_score: number | null
          created_at: string
          description: string | null
          difficulty: string
          employer_id: string
          id: string
          is_active: boolean
          passing_score: number
          skill_category: string
          time_limit_minutes: number
          title: string
          total_attempts: number
          updated_at: string
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string
          employer_id: string
          id?: string
          is_active?: boolean
          passing_score?: number
          skill_category: string
          time_limit_minutes?: number
          title: string
          total_attempts?: number
          updated_at?: string
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string
          employer_id?: string
          id?: string
          is_active?: boolean
          passing_score?: number
          skill_category?: string
          time_limit_minutes?: number
          title?: string
          total_attempts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
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
          file_name: string | null
          file_url: string | null
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
          file_name?: string | null
          file_url?: string | null
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
          file_name?: string | null
          file_url?: string | null
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
      employer_ratings: {
        Row: {
          avg_culture: number | null
          avg_growth: number | null
          avg_management: number | null
          avg_overall: number | null
          avg_salary: number | null
          avg_worklife: number | null
          employer_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      admin_delete_candidate: {
        Args: { p_candidate_id: string }
        Returns: undefined
      }
      admin_delete_employer: {
        Args: { p_employer_id: string }
        Returns: undefined
      }
      calculate_employer_profile_completeness: {
        Args: { p_employer_id: string }
        Returns: number
      }
      can_employer_activate_job: {
        Args: { p_employer_id: string; p_exclude_job_id?: string }
        Returns: Json
      }
      cleanup_old_messages: { Args: never; Returns: undefined }
      generate_slug: { Args: { input_text: string }; Returns: string }
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
