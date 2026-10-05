import { createClient } from "@supabase/supabase-js";

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(-12);
  const ADMIN_NAME = process.env.ADMIN_NAME || "Admin User";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL) {
    console.error("Missing required environment variables.");
    console.error("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    console.log(`Ensuring admin user ${email}...`);

    let userId = null;
    const created = await supabase.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME },
    });

    if (created.error && !String(created.error.message || "").toLowerCase().includes("already")) {
      throw created.error;
    }

    userId = created.data?.user?.id || created.data?.id || null;

    if (!userId) {
      const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listed.error) throw listed.error;
      const existing = (listed.data?.users || []).find(
        (user) => String(user.email || "").toLowerCase() === email
      );
      userId = existing?.id || null;
    }

    if (!userId) {
      throw new Error("Could not create or find the admin user");
    }

    const updated = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (updated.error) throw updated.error;

    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: ADMIN_NAME,
        email,
        role: "admin",
        approval_status: "approved",
      },
      { onConflict: "id" }
    );

    if (profileErr) throw profileErr;

    console.log("Admin account ready:");
    console.log("  Email:", email);
    console.log("  Password:", ADMIN_PASSWORD);
    console.log("  User ID:", userId);
  } catch (err) {
    console.error("Failed to create admin:", err.message || err);
    process.exit(1);
  }
}

main();
