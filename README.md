# 🎓 GGC Pasrur LMS — BS Computer Science Assignment Management System

A production-grade, responsive, and modern Learning Management System tailored for **BS Computer Science** classes. Engineered for **zero-cost operation** (100% free domain and hosting), strict **academic integrity**, and a **step-by-step wizard workflow** for students and instructors.

---

## 🌟 Key Features

### 1. 🛡️ 3-Tier Role Governance
- **Admin Portal (HOD / Administration):**
  - Manage official Computer Science curriculum across all 8 semesters.
  - Review and **approve newly registered faculty members** before they can publish assignments.
  - Audit student rosters and class strengths across sections.
- **Teacher Portal:**
  - Register account by choosing semester and taught subject from the admin-managed catalogue.
  - **4-Step Assignment Creation Wizard** with instant publishing:
    - Target: All Sections (`A1`, `A2`, `B`) or individual sections.
    - Automated test cases (Input / Expected Output execution).
    - AI-assisted evaluation rubric.
    - Resource code templates & problem prompt.
    - **Midnight Expiry Enforcement:** Automatically locks at 11:59:59 PM of the deadline date.
  - **Submissions & Grading Hub:**
    - Live list of submissions with filter by section.
    - **Missing Submissions Roster Tracker:** Detects which Roll numbers from $1$ to $N$ have **not** submitted.
    - **Plagiarism & AI Suite:** Side-by-side peer matching %, AI likelihood %, and paste audit trail.
- **Student Portal:**
  - Fast registration with Roll Number ($1$ to $N$), Semester ($1$ to $8$), and Section (`A1`, `A2`, `B`).
  - Card-based course dashboard with active assignment badges (inspired by VU LMS layout).
  - **3-Step Assignment Submission Wizard:**
    - View problem prompt, starter templates, and midnight countdown timer.
    - Direct code/text editor with live **typing and paste telemetry tracker**.
    - Multi-image & file upload (up to 10 MB) for handwritten photos, diagrams, or source archives.
    - Resubmission allowed anytime before midnight.

### 2. 🧠 3-Layer Zero-Cost Academic Integrity Engine
- **Layer 1: Peer-to-Peer Cross-Student Plagiarism:** In-engine tokenization & MOSS-like winnowing algorithm comparing student solutions against peers.
- **Layer 2: AI Likelihood Detection:** Evaluates lexical diversity, prompt artifacts, and comment regularity to flag AI-generated code/text.
- **Layer 3: Keystroke & Paste Telemetry:** Measures active composition duration, typing speed (WPM), and flags bulk clipboard bursts (e.g., pasting 800 characters in 1 second).

---

## 💻 Local Development

1. Run the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Use the **Role Preview** dropdown in the top navbar to instantly test:
   - **Admin:** Prof. Dr. Tariq Mahmood
   - **Approved Faculty:** Dr. Sarah Khan (CS301 Data Structures)
   - **Pending Faculty:** Engr. Hamza Ali (CS101 Programming Fundamentals)
   - **Student (Roll 1):** Ahmad Ali (Sec A1)
   - **Student (Roll 2):** Bilal Raza (Sec A1, flagged for 89% plagiarism)
   - **Student (Roll 3):** Zainab Noor (Sec A1, missing submission)

---

## 🚀 Free Domain & Hosting

Refer to [FREE_DEPLOYMENT_GUIDE.md](file:///d:/Projects/GGCP%20Assignments/LMS/FREE_DEPLOYMENT_GUIDE.md) for 2-minute deployment on **Vercel** with a free SSL subdomain (`*.vercel.app`).
