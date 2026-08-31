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

## Approval login email

When an admin clicks **Approve**, Gleeful emails that person so they can log in.

The default mail looks like “Your sign-in link” from `noreply@mail.app.supabase.io` until you change the template below. The link goes to **localhost:3000** until you change Site URL — that is why the browser said it could not connect.

### A. Make the email look like Gleeful (no code deploy)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **ssxltdsoikgmkybervok**.
2. Go to **Authentication** → **Email Templates** → **Magic Link**.
3. Set **Subject** to: `Your Gleeful account is ready`
4. Replace the body with the HTML in `supabase/templates/magic_link.html` (keep `{{ .ConfirmationURL }}`).
5. Click **Save**.

### B. Fix the broken localhost link

1. Still in the dashboard: **Authentication** → **URL Configuration**.
2. Set **Site URL** to your live app, for example:
   `https://YOUR_GITHUB_USERNAME.github.io/gleefulskin`
3. Under **Redirect URLs**, add:
   - `https://YOUR_GITHUB_USERNAME.github.io/gleefulskin/**`
   - `http://localhost:5173/gleefulskin/**`
4. Save.

Do **not** leave Site URL as `http://localhost:3000`.

### C. Deploy the website so the login page exists

From `gleefulskin-main`:

```powershell
npm run deploy
```

That publishes the app to GitHub Pages. After it finishes, open  
`https://YOUR_GITHUB_USERNAME.github.io/gleefulskin/login`  
and confirm it loads.

Then approve a user again and click the new email (old links expire and still point at localhost).

### D. Optional: branded function (Resend)

Only if you want a custom “account approved” email instead of Magic Link:

```powershell
npx supabase login
npx supabase link --project-ref ssxltdsoikgmkybervok
npx supabase functions deploy notify-account-approved
```
