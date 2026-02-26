CREATE OR REPLACE FUNCTION public.calculate_employer_profile_completeness(p_employer_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completeness INTEGER := 0;
  total_weight INTEGER := 0;
  earned_weight INTEGER := 0;
  emp RECORD;
  prof RECORD;
BEGIN
  SELECT * INTO emp FROM public.employers WHERE id = p_employer_id;
  SELECT * INTO prof FROM public.profiles WHERE id = emp.profile_id;
  
  IF emp IS NULL THEN RETURN 0; END IF;
  
  -- Total possible = 100, distributed across all tabs
  -- TAB 1: Basic Info (35 points)
  total_weight := 100;
  
  -- Company name (8)
  IF emp.company_name IS NOT NULL AND LENGTH(TRIM(emp.company_name)) > 0 AND emp.company_name != 'My Company' THEN
    earned_weight := earned_weight + 8;
  END IF;
  
  -- Industry (6)
  IF emp.industry IS NOT NULL AND LENGTH(TRIM(emp.industry)) > 0 THEN
    earned_weight := earned_weight + 6;
  END IF;
  
  -- Description (8)
  IF emp.description IS NOT NULL AND LENGTH(TRIM(emp.description)) >= 20 THEN
    earned_weight := earned_weight + 8;
  END IF;
  
  -- Country code (4)
  IF emp.country_code IS NOT NULL AND LENGTH(TRIM(emp.country_code)) > 0 THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- Tax ID (5)
  IF emp.tax_id IS NOT NULL AND LENGTH(TRIM(emp.tax_id)) > 0 THEN
    earned_weight := earned_weight + 5;
  END IF;
  
  -- Team size (2)
  IF emp.team_size IS NOT NULL AND LENGTH(TRIM(emp.team_size)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- Website URL (2)
  IF emp.website_url IS NOT NULL AND LENGTH(TRIM(emp.website_url)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- TAB 2: Location (10 points)
  -- Work environment (3)
  IF emp.work_environment IS NOT NULL AND emp.work_environment != 'onsite' THEN
    earned_weight := earned_weight + 3;
  ELSIF emp.work_environment = 'onsite' THEN
    earned_weight := earned_weight + 3; -- default counts
  END IF;
  
  -- Office locations (5)
  IF emp.office_locations IS NOT NULL AND array_length(emp.office_locations, 1) > 0 THEN
    earned_weight := earned_weight + 5;
  END IF;
  
  -- Relocation support is boolean, always has value (2)
  earned_weight := earned_weight + 2;
  
  -- TAB 3: Hiring (10 points)
  -- Hiring process (3)
  IF emp.hiring_process IS NOT NULL AND LENGTH(TRIM(emp.hiring_process)) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- Interview rounds (2)
  IF emp.interview_rounds_count IS NOT NULL THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- Hiring timeline (2)
  IF emp.hiring_timeline IS NOT NULL AND LENGTH(TRIM(emp.hiring_timeline)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- Assessment types (3)
  IF emp.assessment_types IS NOT NULL AND array_length(emp.assessment_types, 1) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- TAB 4: Compensation (10 points)
  -- Avg salary range (4)
  IF emp.avg_salary_range IS NOT NULL AND LENGTH(TRIM(emp.avg_salary_range)) > 0 THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- Benefits (4)
  IF emp.benefits IS NOT NULL AND array_length(emp.benefits, 1) > 0 THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- Paid leaves (2)
  IF emp.paid_leaves_policy IS NOT NULL AND LENGTH(TRIM(emp.paid_leaves_policy)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- TAB 5: Growth (8 points)
  -- Promotion frequency (3)
  IF emp.promotion_frequency IS NOT NULL AND LENGTH(TRIM(emp.promotion_frequency)) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- Career growth paths (3)
  IF emp.career_growth_paths IS NOT NULL AND LENGTH(TRIM(emp.career_growth_paths)) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- Employee retention rate (2)
  IF emp.employee_retention_rate IS NOT NULL AND LENGTH(TRIM(emp.employee_retention_rate)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- TAB 6: Skills Match (10 points)
  -- Key skills (4)
  IF emp.key_skills_hiring IS NOT NULL AND array_length(emp.key_skills_hiring, 1) > 0 THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- Tech stack (3)
  IF emp.tech_stack IS NOT NULL AND array_length(emp.tech_stack, 1) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- Education preference (3)
  IF emp.education_preference IS NOT NULL AND LENGTH(TRIM(emp.education_preference)) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- TAB 7: Culture (7 points)
  -- Work culture type (2)
  IF emp.work_culture_type IS NOT NULL AND LENGTH(TRIM(emp.work_culture_type)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- Culture description (3)
  IF emp.culture_description IS NOT NULL AND LENGTH(TRIM(emp.culture_description)) > 0 THEN
    earned_weight := earned_weight + 3;
  END IF;
  
  -- Company values (2)
  IF emp.company_values IS NOT NULL AND array_length(emp.company_values, 1) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- TAB 8: Documents (8 points)
  -- Office photo (4)
  IF emp.office_photo_url IS NOT NULL THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- Business card (4)
  IF emp.business_card_url IS NOT NULL THEN
    earned_weight := earned_weight + 4;
  END IF;
  
  -- TAB 9: Contact (2 points) - already counted via location tab having relocation
  -- HR email (2)
  IF emp.hr_contact_email IS NOT NULL AND LENGTH(TRIM(emp.hr_contact_email)) > 0 THEN
    earned_weight := earned_weight + 2;
  END IF;
  
  -- Cap at 100
  IF earned_weight > 100 THEN
    earned_weight := 100;
  END IF;
  
  RETURN earned_weight;
END;
$function$