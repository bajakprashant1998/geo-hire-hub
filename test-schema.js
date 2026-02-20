import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: d1 } = await supabase.from('candidate_resumes').select('*').limit(1);
  console.log('candidate_resumes fields:', d1 && d1.length > 0 ? Object.keys(d1[0]) : 'empty or missing');
  const { data: d2, error } = await supabase.from('candidate_documents').select('*').limit(1);
  if (error) {
    console.log('No candidate_documents table or error:', error.message);
  } else {
    console.log('candidate_documents fields:', d2 && d2.length > 0 ? Object.keys(d2[0]) : 'empty');
  }
}
check();
