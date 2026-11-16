# GGC Pasrur LMS — Supabase Cloud Database Setup (100% Free)

This project is now fully wired with **Supabase PostgreSQL**. Follow these simple 3 steps to connect your free cloud database so all data is permanently saved across all devices.

---

### Step 1: Create a Free Supabase Project (1 Minute)
1. Go to [https://supabase.com](https://supabase.com) and click **Start your project** (Sign in with your GitHub account).
2. Click **New Project**:
   - **Name**: `ggcp-cs-lms`
   - **Database Password**: Set a strong password (e.g. `GgcPasrur2026!`)
   - **Region**: Choose closest (e.g., `Singapore` or `Frankfurt`)
   - **Pricing Plan**: **Free Plan** ($0/month forever)
3. Click **Create new project**.

---

### Step 2: Run the SQL Schema (30 Seconds)
1. In your Supabase project dashboard, click on **SQL Editor** on the left menu (icon `>_`).
2. Click **New query**.
3. Open the file `supabase-schema.sql` from this repository, copy its entire contents, and paste it into the query box.
4. Click the green **Run** button at the bottom right.
5. All 4 tables (`users`, `subjects`, `assignments`, `submissions`) and official curriculum courses will be created and seeded automatically.

---

### Step 3: Add Credentials to Vercel (1 Minute)
1. In Supabase, go to **Project Settings** (gear icon at the bottom left) -> **API**.
2. Copy these two values:
   - **Project URL** (`https://xxxxxxxxxxxx.supabase.co`)
   - **Project API keys -> anon (public)**
3. Go to your Vercel Dashboard -> Select `ggcp-cs-lms` -> **Settings** -> **Environment Variables**.
4. Add these two variables:
   - Name: `NEXT_PUBLIC_SUPABASE_URL` | Value: *(Your Supabase Project URL)*
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Value: *(Your Supabase anon key)*
5. Click **Save** and trigger a **Redeploy** on Vercel.

---

### You are Live!
From now on, every student submission, faculty account, and assignment is stored in your PostgreSQL cloud database and synchronized live across every device!
