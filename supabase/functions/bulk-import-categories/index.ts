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

    const body = await req.json();
    const { categories, action, sheet_url } = body;

    // Action: cleanup_from_sheet - fetch CSV from Google Sheet, delete all existing, reimport clean
    if (action === "cleanup_from_sheet" && sheet_url) {
      // Fetch the CSV
      console.log("Fetching CSV from:", sheet_url);
      const csvResponse = await fetch(sheet_url, { redirect: "follow" });
      console.log("CSV response status:", csvResponse.status);
      if (!csvResponse.ok) {
        const errText = await csvResponse.text();
        console.error("CSV fetch failed:", errText.substring(0, 200));
        throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
      }
      const csvText = await csvResponse.text();
      console.log("CSV length:", csvText.length, "First 200 chars:", csvText.substring(0, 200));
      
      // Parse CSV - each line is a category, first line is header
      const lines = csvText.split("\n");
      const seen = new Set<string>();
      const cleanCategories: { name: string; is_active: boolean; sort_order: number }[] = [];
      let sortOrder = 1;

      for (let i = 1; i < lines.length; i++) { // skip header row
        // CSV may have quotes and commas - extract first column only
        let name = lines[i].trim();
        
        // Handle quoted CSV fields
        if (name.startsWith('"')) {
          const endQuote = name.indexOf('"', 1);
          if (endQuote > 0) {
            name = name.substring(1, endQuote);
          }
        } else {
          // Take only the first comma-separated value
          const commaIdx = name.indexOf(',');
          if (commaIdx > 0) {
            name = name.substring(0, commaIdx);
          }
        }
        
        name = name.trim();
        if (name.length === 0 || name === '#VALUE!') continue;
        
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleanCategories.push({ name, is_active: true, sort_order: sortOrder++ });
      }

      console.log("Parsed", cleanCategories.length, "unique categories from CSV");

      // Delete all existing categories in smaller batches
      let deleteCount = 0;
      while (true) {
        const { data: toDelete, error: fetchErr } = await adminClient
          .from("job_categories")
          .select("id")
          .limit(500);
        
        if (fetchErr) {
          console.error("Fetch for delete error:", fetchErr);
          throw fetchErr;
        }
        if (!toDelete || toDelete.length === 0) break;
        
        const ids = toDelete.map((r: any) => r.id);
        console.log("Deleting batch of", ids.length);
        const { error: deleteError } = await adminClient
          .from("job_categories")
          .delete()
          .in("id", ids);
        
        if (deleteError) {
          console.error("Delete error:", JSON.stringify(deleteError));
          throw deleteError;
        }
        deleteCount += ids.length;
      }
      console.log("Deleted", deleteCount, "old categories");

      // Insert in batches of 200
      let totalInserted = 0;
      for (let i = 0; i < cleanCategories.length; i += 200) {
        const batch = cleanCategories.slice(i, i + 200);
        const { error: insertError, data: inserted } = await adminClient
          .from("job_categories")
          .insert(batch)
          .select("id");

        if (insertError) {
          console.error("Batch insert error at offset", i, ":", insertError);
          throw insertError;
        }
        totalInserted += inserted?.length || 0;
      }

      return new Response(
        JSON.stringify({
          action: "cleanup_from_sheet",
          deleted: deleteCount,
          inserted: totalInserted,
          unique_categories: cleanCategories.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: cleanup_and_reimport with provided categories array
    if (action === "cleanup_and_reimport") {
      if (!Array.isArray(categories) || categories.length === 0) {
        return new Response(JSON.stringify({ error: "categories array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete all in batches
      while (true) {
        const { data: toDelete } = await adminClient
          .from("job_categories")
          .select("id")
          .limit(1000);
        if (!toDelete || toDelete.length === 0) break;
        const ids = toDelete.map((r: any) => r.id);
        await adminClient.from("job_categories").delete().in("id", ids);
      }

      const seen = new Set<string>();
      const cleanCategories: { name: string; is_active: boolean; sort_order: number }[] = [];
      let sortOrder = 1;

      for (const rawName of categories) {
        const name = String(rawName).trim();
        if (name.length === 0) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cleanCategories.push({ name, is_active: true, sort_order: sortOrder++ });
      }

      let totalInserted = 0;
      for (let i = 0; i < cleanCategories.length; i += 200) {
        const batch = cleanCategories.slice(i, i + 200);
        const { error: insertError, data: inserted } = await adminClient
          .from("job_categories")
          .insert(batch)
          .select("id");
        if (insertError) throw insertError;
        totalInserted += inserted?.length || 0;
      }

      return new Response(
        JSON.stringify({ action: "cleanup_and_reimport", inserted: totalInserted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: bulk import (skip duplicates)
    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: "categories array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingNames = new Set<string>();
    let offset = 0;
    while (true) {
      const { data: existing } = await adminClient
        .from("job_categories")
        .select("name")
        .range(offset, offset + 999);
      if (!existing || existing.length === 0) break;
      for (const c of existing) existingNames.add(c.name.toLowerCase());
      if (existing.length < 1000) break;
      offset += 1000;
    }

    const { data: maxOrder } = await adminClient
      .from("job_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    let sortOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

    const newCategories = categories
      .map((name: string) => String(name).trim())
      .filter((name: string) => name.length > 0 && !existingNames.has(name.toLowerCase()))
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
        JSON.stringify({ inserted: 0, skipped: categories.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalInserted = 0;
    for (let i = 0; i < newCategories.length; i += 200) {
      const batch = newCategories.slice(i, i + 200);
      const { error: insertError, data: inserted } = await adminClient
        .from("job_categories")
        .insert(batch)
        .select("id");
      if (insertError) throw insertError;
      totalInserted += inserted?.length || 0;
    }

    return new Response(
      JSON.stringify({ inserted: totalInserted, skipped: categories.length - newCategories.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});