# 🚀 Zero-Cost Deployment Guide (100% Free Domain & Hosting)

This guide walks you through deploying the **GGC Pasrur LMS (BS Computer Science Assignment Management System)** to the internet with **0 budget (100% free forever)** using **Vercel** and **GitHub**.

---

## 🌟 What You Get for Free:
- **Free High-Speed Hosting:** Deployed on Vercel's global CDN (100 GB bandwidth/month free).
- **Free SSL & Domain:** Instant free HTTPS domain (e.g. `your-college-cs-lms.vercel.app`).
- **Zero Configuration:** Ready to run out-of-the-box with persistent client-side data, with clean hooks for Supabase PostgreSQL if desired.

---

## 🛠️ Step-by-Step Deployment (Takes 2 Minutes)

### Step 1: Push Code to GitHub
1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Initialize and push this repository:
```bash
git init
git add .
git commit -m "Initial commit of BS CS Assignment Management System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/college-cs-lms.git
git push -u origin main
```

### Step 2: Deploy on Vercel (100% Free)
1. Go to [vercel.com](https://vercel.com) and click **"Sign Up"** (Choose "Continue with GitHub").
2. Click **"Add New Project"** and select your `college-cs-lms` repository.
3. Keep default settings (Framework Preset: **Next.js**).
4. Click **"Deploy"**.
5. Within 45 seconds, your system is live on the internet at `https://your-project-name.vercel.app`!

---

## 👥 Pre-Configured Test Accounts

The system comes pre-seeded with realistic data across all 3 roles:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Admin** | Prof. Dr. Tariq Mahmood | `admin@college.edu` | `demo123` | Head of CS Department. Can add curriculum subjects and approve faculty. |
| **Teacher (Approved)** | Dr. Sarah Khan | `sarah.khan@college.edu` | `demo123` | Taught Course: `CS301 - Data Structures` (Sem 3). Full assignment builder & grading suite. |
| **Teacher (Pending)** | Engr. Hamza Ali | `hamza.ali@college.edu` | `demo123` | Registered for `CS101 - Programming Fundamentals` (Sem 1). Awaiting Admin approval. |
| **Student (Roll 1)** | Ahmad Ali | `ahmad.ali@student.college.edu` | `student123` | Sem 3, Sec A1. Organic typing sample, 19/20 score. |
| **Student (Roll 2)** | Bilal Raza | `bilal.raza@student.college.edu` | `student123` | Sem 3, Sec A1. Flagged for copy-paste burst & 89% plagiarism match! |
| **Student (Roll 3)** | Zainab Noor | `zainab.noor@student.college.edu` | `student123` | Sem 3, Sec A1. Highlighted in Missing Submissions roster. |
| **Student (Roll 1 Sec B)**| Fatima Zahra | `fatima.zahra@student.college.edu` | `student123` | Sem 3, Sec B. Roll 1 in Section B. |

> **Pro Tip:** You can also use the **"Role Preview"** dropdown in the top navbar at any time to instantly switch between any of these accounts with zero friction!

---

## 🛡️ The 3-Layer Integrity Engine Explained
1. **Peer-to-Peer Plagiarism Engine:** Uses MOSS/Winnowing token hashing to compare every student's code and text against every peer in the class, highlighting matches side-by-side with similarity %.
2. **AI-Generation Likelihood Engine:** Scans code comments, lexical diversity, and syntactic patterns to detect LLM-written solutions with zero external API fees.
3. **Typing & Paste Telemetry:** Monitors client keystrokes and flags sudden clipboard bursts (e.g. 800 characters pasted in 1.4 seconds) in an audit trail for the instructor.
