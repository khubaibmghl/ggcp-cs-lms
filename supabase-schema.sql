-- ==============================================================================
-- GGC Pasrur (Govt. Graduate College Pasrur) BS Computer Science LMS
-- Supabase PostgreSQL Production Schema & Seed Script
-- ==============================================================================

-- 1. USERS TABLE (Admin, Faculty, Students)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  login_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT,
  email TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  phone TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  taught_semester INT,
  taught_subject_id TEXT,
  taught_subject_name TEXT,
  assigned_courses JSONB DEFAULT '[]'::jsonb,
  roll_number INT,
  semester INT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CURRICULUM SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  credit_hours INT NOT NULL DEFAULT 3,
  description TEXT
);

-- 3. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  semester INT NOT NULL,
  subject_id TEXT,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  target_sections JSONB DEFAULT '["All"]'::jsonb,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_marks INT NOT NULL DEFAULT 20,
  deadline_date TEXT NOT NULL,
  grading_mode TEXT NOT NULL DEFAULT 'hybrid',
  test_cases JSONB DEFAULT '[]'::jsonb,
  ai_rubric JSONB DEFAULT '[]'::jsonb,
  resource_file_name TEXT,
  resource_file_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUBMISSIONS TABLE (With Telemetry & Plagiarism Reports)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_roll_number INT NOT NULL,
  student_semester INT NOT NULL,
  student_section TEXT NOT NULL,
  text_submission TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'flagged')),
  marks NUMERIC,
  feedback TEXT,
  test_cases_passed INT,
  test_cases_total INT,
  ai_suggested_score INT,
  integrity_report JSONB DEFAULT '{}'::jsonb
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- CREATE OPEN POLICIES FOR COLLEGE PORTAL API
DROP POLICY IF EXISTS "Public access to users" ON public.users;
CREATE POLICY "Public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to subjects" ON public.subjects;
CREATE POLICY "Public access to subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to assignments" ON public.assignments;
CREATE POLICY "Public access to assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to submissions" ON public.submissions;
CREATE POLICY "Public access to submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED INITIAL DATA
-- ==============================================================================

-- Seed Master Admin Account
INSERT INTO public.users (id, login_id, name, email, password, role, phone, status)
VALUES (
  'usr-admin',
  'admin',
  'Prof. Dr. Tariq Mahmood',
  'admin@college.edu',
  'admin123',
  'admin',
  '03009999999',
  'approved'
)
ON CONFLICT (login_id) DO UPDATE SET password = EXCLUDED.password;

-- Seed Official BS CS Odd Semesters Curriculum (from GGC Pasrur Workload Allocation)
INSERT INTO public.subjects (id, code, name, semester, credit_hours, description)
VALUES
  -- 1st Semester
  ('sub-ge-160a', 'GE-160A', 'Applications of Information & Comm. Tech', 1, 3, 'Foundations of ICT, digital computing architectures, office applications, and computer communications.'),
  ('sub-ge-161', 'GE-161', 'Discrete Structures', 1, 3, 'Propositional and predicate logic, set theory, functions, mathematical induction, relations, and graphs.'),
  ('sub-ge-162-s1', 'GE-162', 'Functional English', 1, 3, 'Grammar mechanics, academic reading comprehension, professional vocabulary, and oral communication skills.'),
  ('sub-ge-163', 'GE-163', 'Introduction to Economics', 1, 3, 'Principles of micro and macroeconomics, market dynamics, fiscal policies, and computational economics.'),
  ('sub-ge-166', 'GE-166', 'Pakistan Studies', 1, 2, 'Historical ideology, independence movement, constitutional development, and contemporary issues of Pakistan.'),
  ('sub-csc-110', 'CSC-110', 'Programming Fundamentals', 1, 4, 'Procedural problem solving, variables, control flow, functions, arrays, pointers, and memory manipulation in C++.'),
  ('sub-md-001', 'MD-001', 'Math Deficiency-I', 1, 3, 'Fundamental algebraic techniques, trigonometry, matrices, quadratic systems, and coordinate geometry.'),

  -- 3rd Semester
  ('sub-hq-003', 'HQ-003', 'Tarjuma-e-Quran', 3, 1, 'Translation and thematic understanding of selected Quranic Surahs and moral guidance.'),
  ('sub-gpst-201', 'GPST-201', 'Pakistan Studies', 3, 2, 'Socio-political history, 1973 Constitution, foreign policy, and economic challenges of Pakistan.'),
  ('sub-cc-211', 'CC-211', 'Object Oriented Programming', 3, 4, 'Object-oriented programming principles, classes, inheritance, polymorphism, templates, and exception handling.'),
  ('sub-cc-215', 'CC-215', 'Database Systems', 3, 4, 'Relational data models, normalization (1NF-BCNF), complex SQL queries, transactions, and ACID principles.'),
  ('sub-cc-210n', 'CC-210N', 'Computer Organization & Assembly Language', 3, 4, 'Processor architecture, register sets, machine instructions, memory addressing, and x86 assembly programming.'),
  ('sub-ge-162-s3', 'GE-162', 'Calculus & Analytical Geometry', 3, 3, 'Advanced calculus techniques, analytical geometry, vectors, and multivariate mathematical operations.'),
  ('sub-ge-192', 'GE-192', 'Introduction to Management', 3, 3, 'Management theory, leadership, organizational culture, strategic planning, and project coordination.'),
  ('sub-hq-003n', 'HQ-003N', 'Fehm-e-Quran-I', 3, 1, 'Reflective comprehension of Quranic teachings, ethical tenets, and Islamic civilization.'),

  -- 5th Semester
  ('sub-cc-310', 'CC-310', 'Artificial Intelligence', 5, 4, 'State space search, heuristics, min-max trees, knowledge representation, expert systems, and ML foundations.'),
  ('sub-cc-313', 'CC-313', 'Analysis of Algorithms', 5, 3, 'Asymptotic notation, divide-and-conquer, greedy strategies, dynamic programming, and NP-completeness.'),
  ('sub-dc-320', 'DC-320', 'Theory of Automata and Formal Languages', 5, 3, 'Finite automata, regular expressions, context-free grammars, pushdown automata, and Turing machines.'),
  ('sub-dc-321', 'DC-321', 'Human Computer Interaction', 5, 3, 'User-centered design principles, usability inspection, interactive prototyping, UX evaluation, and interfaces.'),
  ('sub-dc-322', 'DC-322', 'Computer Architecture', 5, 4, 'Instruction-level parallelism, pipelining hazards, cache hierarchies, superscalar processors, and multi-core systems.'),
  ('sub-ec-330', 'EC-330', 'Web Technologies', 5, 3, 'Modern full-stack web development, HTML5/CSS3, responsive design, JavaScript/TypeScript, and RESTful APIs.'),
  ('sub-hq-005', 'HQ-005', 'Tarjuma-e-Quran', 5, 1, 'Quranic studies, ethical framework, community leadership, and moral philosophy.'),

  -- 7th Semester
  ('sub-sc-342', 'SC-342', 'Numerical Computing', 7, 3, 'Numerical algorithms, root-finding techniques, interpolation, numerical integration, and error estimation.'),
  ('sub-ec-431', 'EC-431', 'Software Project Management', 7, 3, 'Software project estimation, COCOMO, scheduling, risk mitigation, resource allocation, and quality monitoring.'),
  ('sub-ec-432', 'EC-432', 'Software Quality Assurance', 7, 3, 'Software testing methodologies, black-box/white-box testing, unit/integration testing, and quality standards.'),
  ('sub-cc-411', 'CC-411', 'Final Year Project - I', 7, 3, 'Capstone project initiation, literature review, software requirement specification (SRS), and system architecture.'),
  ('sub-ge-461', 'GE-461', 'Technical & Business Writing', 7, 3, 'Research methodology, technical proposals, executive documentation, formal reports, and professional writing.')
ON CONFLICT (id) DO NOTHING;
