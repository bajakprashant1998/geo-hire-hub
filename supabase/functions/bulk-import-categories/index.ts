import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { categories } = await req.json();
    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: "categories array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing categories to skip duplicates
    const { data: existing } = await adminClient
      .from("job_categories")
      .select("name");
    const existingNames = new Set((existing || []).map((c: any) => c.name.toLowerCase()));

    // Get max sort_order
    const { data: maxOrder } = await adminClient
      .from("job_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    let sortOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

    // Filter out duplicates and empty names
    const newCategories = categories
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0 && !existingNames.has(name.toLowerCase()))
      // Remove duplicate entries within the import itself
      .filter((name: string, index: number, arr: string[]) => 
        arr.findIndex(n => n.toLowerCase() === name.toLowerCase()) === index
      )
      .map((name: string) => ({
        name,
        is_active: true,
        sort_order: sortOrder++,
      }));

    if (newCategories.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, skipped: categories.length, message: "All categories already exist" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert in batches of 500
    let totalInserted = 0;
    for (let i = 0; i < newCategories.length; i += 500) {
      const batch = newCategories.slice(i, i + 500);
      const { error: insertError, data: inserted } = await adminClient
        .from("job_categories")
        .insert(batch)
        .select("id");

      if (insertError) {
        console.error("Batch insert error:", insertError);
        throw insertError;
      }
      totalInserted += inserted?.length || 0;
    }

    return new Response(
      JSON.stringify({
        inserted: totalInserted,
        skipped: categories.length - newCategories.length,
        total: categories.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
