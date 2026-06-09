Creating an Admin account (secure)

This repository includes a helper script to create an administrative account in Supabase.

WARNING: The script requires the Supabase *service role key* and will perform administrative actions. Keep the key secret and run this script only on a trusted machine.

Steps:

1. Install dependencies (if not already):

```bash
npm install
```

2. Run the script with required environment variables set:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=supersecurepassword \
ADMIN_NAME="Salon Administrator" \
node supabase/create_admin.js
```

- `ADMIN_PASSWORD` is optional; if omitted, the script prints a generated password.
- After creating the admin, consider rotating your service role key if it was exposed.

What the script does:
- Creates a new auth user in Supabase using the admin API.
- Inserts/updates a row in `profiles` with `role = 'admin'` for that user id.

If you prefer, you can create a user via the Supabase dashboard and then run an SQL statement to set the profile's `role` column to `'admin'`:

```sql
update profiles set role = 'admin' where id = '<user-uuid>';
```
