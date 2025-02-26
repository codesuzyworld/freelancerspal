<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Freelancer's Pal, manage and deliver your projects with ease" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Freelancer's Pal</h1>
</a>

<p align="center">
 Manage and deliver your projects with ease
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
</p>
<br/>

## Features

- Create Projects
- Upload Files
- Upload Links
- Create timesheets and Timesheet Calendar
- Client Facing Page for Deliverables with Privacy Toggle
- Timesheet Calendar

## Demo

You can view a fully working demo at [freelancerspal-rzpb.vercel.app](freelancerspal-rzpb.vercel.app).

## Clone and run locally

1. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be obtained by contacting CodeSuzy

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The application should now be running on [localhost:3000](http://localhost:3000/).
