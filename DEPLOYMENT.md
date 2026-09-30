# Static Website Setup

This version is a static HTML/CSS/JavaScript website. It does not need Node.js hosting. Supabase provides its shared database and administrator authentication.

## 1. Create the Supabase project

1. Create a project in Supabase and wait for it to finish provisioning.
2. Open **SQL Editor**, create a query, paste all of `supabase/setup.sql`, and run it. It creates and secures the branches, fees, bookings, and admin membership tables, and inserts the current sample branch/fee data when those tables are empty.
3. In **Project Settings > API**, copy the Project URL and the publishable key (or legacy anon key). Do not use or publish the `service_role` secret key.
4. Put those two public values into `public/js/supabase-config.js`, replacing `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`.

The browser key is intended to be public. Row Level Security in the SQL script is what restricts data access; never disable those policies or put a service-role key in the website.

## 2. Create the first administrator

1. In Supabase **Authentication > Users**, add the administrator with the chosen email and a strong password. Disable public signups in the Auth settings after adding the administrator.
2. Copy that user's UUID from the Users list.
3. In SQL Editor, run this statement with that UUID:

```sql
insert into public.admin_users (user_id)
values ('14a89bb1-c905-499e-9be3-5a9dc4c880d5');
```

Only user IDs in `admin_users` can open the dashboard data or edit branches, fees, and booking statuses. Do not share the password or account access.

## 3. Publish on static hosting

Upload the contents of the `public` folder to the hosting account's website document root. Keep the folder structure (`css`, `images`, and `js`). The root `index.html` is the homepage; `admin.html` and `branch.html?id=...` are static pages.

If the host lets you configure security headers, allow scripts from the site's origin and `https://cdn.jsdelivr.net` (the Supabase browser SDK), connections to your Supabase project URL, and map frames from Google Maps. Enforce HTTPS for the site and custom domain.

A custom domain is optional for initial testing and can be connected to the static host later. Configure its DNS as instructed by the hosting provider.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project. A public repository is the simplest option on GitHub Free.
2. Keep `.github/workflows/pages.yml` in the repository. It publishes the `public` folder when code is pushed to `main` or `master`.
3. In the repository, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.
4. Push to the default branch and wait for the Pages workflow in the **Actions** tab to finish. GitHub will show the published URL, usually `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. In Supabase **Authentication > URL Configuration**, set the Site URL to the published site URL. Add that URL as an allowed redirect URL if prompted.

The workflow publishes only `public`; the SQL setup and workflow files remain in the repository but are not served as website pages. The Supabase publishable/anon key in the browser config is designed to be public; never place a `service_role` key in the repo. A custom domain can be connected later in GitHub Pages settings, with DNS configured at the domain provider.

## Shared data and uploaded images

All admin pages and devices connect to the same Supabase project, so their changes are stored centrally. The admin dashboard polls for updates every five seconds. Public visitors can submit tour requests; only administrators can read or update those requests.

Tour requests are saved to the admin dashboard. This static version does not send booking email notifications; adding email requires a Supabase Edge Function or another hosted mail service.

Admin image uploads are intentionally not part of this version. Branch images remain the local image assets shipped in `public/images`.

## Local preview

You can open `public/index.html` directly to view the static layout, but browsers may limit database requests from `file://` pages. For a functional test, upload it to the static host or use any local static-file server. No Node.js backend is required in production.
