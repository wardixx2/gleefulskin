 # TODO - Inbox appointment notifications

- [x] Add Supabase migration: `inbox_notifications` table + RLS + policies
- [x] Add trigger/function: when a new appointment is inserted, create an inbox notification for `appointments.user_id`
- [x] Add React route/page: `src/pages/Inbox.jsx` to list notifications and show appointment info
- [x] Add UI entry: link to `/inbox` in `TopNav.jsx` and/or `Dashboard.jsx`
- [x] Update `App.jsx` to include the `/inbox` route (protected)
- [x] Update `AppointmentBooking.jsx` if needed (ensure notification payload includes treatment/date/time)
- [x] Verify by running migrations and testing booking → inbox shows the appointment
