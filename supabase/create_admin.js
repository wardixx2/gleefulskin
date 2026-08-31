import { createClient } from '@supabase/supabase-js';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(-12);
  const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL) {
    console.error('Missing required environment variables.');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL');
    console.error('Optional: ADMIN_PASSWORD, ADMIN_NAME');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    console.log(`Creating user ${ADMIN_EMAIL}...`);
    const { data: user, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (createErr) throw createErr;

    const userId = user?.id;
    if (!userId) throw new Error('No user id returned from Supabase createUser');

    console.log('Inserting profile with admin role...');
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: ADMIN_NAME, role: 'admin' }, { onConflict: 'id' });

    if (profileErr) throw profileErr;

    console.log('Admin account created successfully:');
    console.log('  Email:', ADMIN_EMAIL);
    console.log('  Password:', ADMIN_PASSWORD);
    console.log('  User ID:', userId);
    console.log('\nIMPORTANT: Store the password securely and rotate the service role key after use.');
  } catch (err) {
    console.error('Failed to create admin:', err.message || err);
    process.exit(1);
  }
}

main();
