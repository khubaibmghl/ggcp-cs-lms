import { Subject, User, Assignment, Submission } from '@/types';

export const INITIAL_SUBJECTS: Subject[] = [
  // --- 1st Semester (BS Computer Science - Fall) ---
  {
    id: 'sub-ge-160a',
    code: 'GE-160A',
    name: 'Applications of Information & Comm. Tech',
    semester: 1,
    creditHours: 3,
    description: 'Foundations of ICT, digital computing architectures, office applications, and computer communications.',
  },
  {
    id: 'sub-ge-161',
    code: 'GE-161',
    name: 'Discrete Structures',
    semester: 1,
    creditHours: 3,
    description: 'Propositional and predicate logic, set theory, functions, mathematical induction, relations, and graphs.',
  },
  {
    id: 'sub-ge-162-s1',
    code: 'GE-162',
    name: 'Functional English',
    semester: 1,
    creditHours: 3,
    description: 'Grammar mechanics, academic reading comprehension, professional vocabulary, and oral communication skills.',
  },
  {
    id: 'sub-ge-163',
    code: 'GE-163',
    name: 'Introduction to Economics',
    semester: 1,
    creditHours: 3,
    description: 'Principles of micro and macroeconomics, market dynamics, fiscal policies, and computational economics.',
  },
  {
    id: 'sub-ge-166',
    code: 'GE-166',
    name: 'Pakistan Studies',
    semester: 1,
    creditHours: 2,
    description: 'Historical ideology, independence movement, constitutional development, and contemporary issues of Pakistan.',
  },
  {
    id: 'sub-csc-110',
    code: 'CSC-110',
    name: 'Programming Fundamentals',
    semester: 1,
    creditHours: 4,
    description: 'Procedural problem solving, variables, control flow, functions, arrays, pointers, and memory manipulation in C++.',
  },
  {
    id: 'sub-md-001',
    code: 'MD-001',
    name: 'Math Deficiency-I',
    semester: 1,
    creditHours: 3,
    description: 'Fundamental algebraic techniques, trigonometry, matrices, quadratic systems, and coordinate geometry.',
  },

  // --- 2nd Semester (BS Computer Science - Spring) ---
  {
    id: 'sub-cc-112',
    code: 'CC-112',
    name: 'Digital Logic Design',
    semester: 2,
    creditHours: 3,
    description: 'Boolean algebra, logic gates, combinational and sequential circuit design, flip-flops, and counters.',
  },
  {
    id: 'sub-mt-102',
    code: 'MT-102',
    name: 'Calculus & Analytical Geometry',
    semester: 2,
    creditHours: 3,
    description: 'Differential and integral calculus, limits, transcendental functions, and analytical geometry.',
  },
  {
    id: 'sub-ge-104',
    code: 'GE-104',
    name: 'Communication & Interpersonal Skills',
    semester: 2,
    creditHours: 3,
    description: 'Technical presentation, interpersonal dynamics, formal technical writing, and business correspondence.',
  },

  // --- 3rd Semester (BS Computer Science - Fall) ---
  {
    id: 'sub-hq-003',
    code: 'HQ-003',
    name: 'Tarjuma-e-Quran',
    semester: 3,
    creditHours: 1,
    description: 'Translation and thematic understanding of selected Quranic Surahs and moral guidance.',
  },
  {
    id: 'sub-gpst-201',
    code: 'GPST-201',
    name: 'Pakistan Studies',
    semester: 3,
    creditHours: 2,
    description: 'Socio-political history, 1973 Constitution, foreign policy, and economic challenges of Pakistan.',
  },
  {
    id: 'sub-cc-211',
    code: 'CC-211',
    name: 'Object Oriented Programming',
    semester: 3,
    creditHours: 4,
    description: 'Object-oriented programming principles, classes, inheritance, polymorphism, templates, and exception handling.',
  },
  {
    id: 'sub-cc-215',
    code: 'CC-215',
    name: 'Database Systems',
    semester: 3,
    creditHours: 4,
    description: 'Relational data models, normalization (1NF-BCNF), complex SQL queries, transactions, and ACID principles.',
  },
  {
    id: 'sub-cc-210n',
    code: 'CC-210N',
    name: 'Computer Organization & Assembly Language',
    semester: 3,
    creditHours: 4,
    description: 'Processor architecture, register sets, machine instructions, memory addressing, and x86 assembly programming.',
  },
  {
    id: 'sub-ge-162-s3',
    code: 'GE-162',
    name: 'Calculus & Analytical Geometry',
    semester: 3,
    creditHours: 3,
    description: 'Advanced calculus techniques, analytical geometry, vectors, and multivariate mathematical operations.',
  },
  {
    id: 'sub-ge-192',
    code: 'GE-192',
    name: 'Introduction to Management',
    semester: 3,
    creditHours: 3,
    description: 'Management theory, leadership, organizational culture, strategic planning, and project coordination.',
  },
  {
    id: 'sub-hq-003n',
    code: 'HQ-003N',
    name: 'Fehm-e-Quran-I',
    semester: 3,
    creditHours: 1,
    description: 'Reflective comprehension of Quranic teachings, ethical tenets, and Islamic civilization.',
  },

  // --- 4th Semester (BS Computer Science - Spring) ---
  {
    id: 'sub-cc-214',
    code: 'CC-214',
    name: 'Data Structures & Algorithms',
    semester: 4,
    creditHours: 4,
    description: 'Linear and non-linear data structures, trees, graphs, sorting, searching, and complexity analysis.',
  },
  {
    id: 'sub-cc-216',
    code: 'CC-216',
    name: 'Operating Systems',
    semester: 4,
    creditHours: 4,
    description: 'Processes, CPU scheduling, thread concurrency, memory management, virtual memory, and file systems.',
  },
  {
    id: 'sub-mt-202',
    code: 'MT-202',
    name: 'Linear Algebra',
    semester: 4,
    creditHours: 3,
    description: 'Matrices, vector spaces, eigenvalues, eigenvectors, orthogonal projections, and linear transformations.',
  },

  // --- 5th Semester (BS Computer Science - Fall) ---
  {
    id: 'sub-cc-310',
    code: 'CC-310',
    name: 'Artificial Intelligence',
    semester: 5,
    creditHours: 4,
    description: 'State space search, heuristics, min-max trees, knowledge representation, expert systems, and ML foundations.',
  },
  {
    id: 'sub-cc-313',
    code: 'CC-313',
    name: 'Analysis of Algorithms',
    semester: 5,
    creditHours: 3,
    description: 'Asymptotic notation, divide-and-conquer, greedy strategies, dynamic programming, and NP-completeness.',
  },
  {
    id: 'sub-dc-320',
    code: 'DC-320',
    name: 'Theory of Automata and Formal Languages',
    semester: 5,
    creditHours: 3,
    description: 'Finite automata, regular expressions, context-free grammars, pushdown automata, and Turing machines.',
  },
  {
    id: 'sub-dc-321',
    code: 'DC-321',
    name: 'Human Computer Interaction',
    semester: 5,
    creditHours: 3,
    description: 'User-centered design principles, usability inspection, interactive prototyping, UX evaluation, and interfaces.',
  },
  {
    id: 'sub-dc-322',
    code: 'DC-322',
    name: 'Computer Architecture',
    semester: 5,
    creditHours: 4,
    description: 'Instruction-level parallelism, pipelining hazards, cache hierarchies, superscalar processors, and multi-core systems.',
  },
  {
    id: 'sub-ec-330',
    code: 'EC-330',
    name: 'Web Technologies',
    semester: 5,
    creditHours: 3,
    description: 'Modern full-stack web development, HTML5/CSS3, responsive design, JavaScript/TypeScript, and RESTful APIs.',
  },
  {
    id: 'sub-hq-005',
    code: 'HQ-005',
    name: 'Tarjuma-e-Quran',
    semester: 5,
    creditHours: 1,
    description: 'Quranic studies, ethical framework, community leadership, and moral philosophy.',
  },

  // --- 6th Semester (BS Computer Science - Spring) ---
  {
    id: 'sub-cc-314',
    code: 'CC-314',
    name: 'Computer Networks',
    semester: 6,
    creditHours: 4,
    description: 'OSI and TCP/IP protocol suite, IP routing, subnetting, socket programming, and transport protocols.',
  },
  {
    id: 'sub-cc-316',
    code: 'CC-316',
    name: 'Software Engineering',
    semester: 6,
    creditHours: 3,
    description: 'Software development life cycles, requirement engineering, Agile/Scrum methodologies, and design modeling.',
  },

  // --- 7th Semester (BS Computer Science - Fall) ---
  {
    id: 'sub-sc-342',
    code: 'SC-342',
    name: 'Numerical Computing',
    semester: 7,
    creditHours: 3,
    description: 'Numerical algorithms, root-finding techniques, interpolation, numerical integration, and error estimation.',
  },
  {
    id: 'sub-ec-431',
    code: 'EC-431',
    name: 'Software Project Management',
    semester: 7,
    creditHours: 3,
    description: 'Software project estimation, COCOMO, scheduling, risk mitigation, resource allocation, and quality monitoring.',
  },
  {
    id: 'sub-ec-432',
    code: 'EC-432',
    name: 'Software Quality Assurance',
    semester: 7,
    creditHours: 3,
    description: 'Software testing methodologies, black-box/white-box testing, unit/integration testing, and quality standards.',
  },
  {
    id: 'sub-cc-411',
    code: 'CC-411',
    name: 'Final Year Project - I',
    semester: 7,
    creditHours: 3,
    description: 'Capstone project initiation, literature review, software requirement specification (SRS), and system architecture.',
  },
  {
    id: 'sub-ge-461',
    code: 'GE-461',
    name: 'Technical & Business Writing',
    semester: 7,
    creditHours: 3,
    description: 'Research methodology, technical proposals, executive documentation, formal reports, and professional writing.',
  },

  // --- 8th Semester (BS Computer Science - Spring) ---
  {
    id: 'sub-cc-412',
    code: 'CC-412',
    name: 'Final Year Project - II',
    semester: 8,
    creditHours: 3,
    description: 'Capstone project implementation, empirical testing, deployment, final thesis presentation, and defense.',
  },
  {
    id: 'sub-ge-462',
    code: 'GE-462',
    name: 'Professional Practices & Ethics',
    semester: 8,
    creditHours: 3,
    description: 'Legal considerations in IT, cyber law, intellectual property rights, data privacy, and ethical computing.',
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    loginId: 'admin',
    name: 'Prof. Dr. Tariq Mahmood',
    email: 'admin@college.edu',
    password: 'admin123',
    phone: '03009999999',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'usr-teach-khubaib',
    loginId: '03001234567',
    name: 'Khubaib Ahmad',
    email: 'khubaib.ahmad@college.edu',
    password: 'teacher123',
    phone: '03001234567',
    role: 'teacher',
    status: 'approved',
    taughtSemester: 1,
    taughtSubjectId: 'sub-csc-110',
    taughtSubjectName: 'CSC-110 (A1, A2, B), DC-322 (A1, A2, B), CC-411 (A1, A2, B)',
    assignedCourses: [
      {
        subjectId: 'sub-csc-110',
        subjectCode: 'CSC-110',
        subjectName: 'Programming Fundamentals',
        semester: 1,
        sections: ['A1', 'A2', 'B'],
      },
      {
        subjectId: 'sub-dc-322',
        subjectCode: 'DC-322',
        subjectName: 'Computer Architecture',
        semester: 5,
        sections: ['A1', 'A2', 'B'],
      },
      {
        subjectId: 'sub-cc-411',
        subjectCode: 'CC-411',
        subjectName: 'Final Year Project - I',
        semester: 7,
        sections: ['A1', 'A2', 'B'],
      },
    ],
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'usr-teach-cti-1',
    loginId: '03017654321',
    name: 'Faculty CTI-1',
    email: 'cti1@college.edu',
    password: 'teacher123',
    phone: '03017654321',
    role: 'teacher',
    status: 'approved',
    taughtSemester: 3,
    taughtSubjectId: 'sub-cc-211',
    taughtSubjectName: 'CC-211 (A1, A2, B), CC-313 (A1, A2, B)',
    assignedCourses: [
      {
        subjectId: 'sub-cc-211',
        subjectCode: 'CC-211',
        subjectName: 'Object Oriented Programming',
        semester: 3,
        sections: ['A1', 'A2', 'B'],
      },
      {
        subjectId: 'sub-cc-313',
        subjectCode: 'CC-313',
        subjectName: 'Analysis of Algorithms',
        semester: 5,
        sections: ['A1', 'A2', 'B'],
      },
    ],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-11-14T11:20:00Z',
  },
  {
    id: 'usr-stud-1',
    loginId: 'BCS3-A1-001',
    name: 'Ahmad Ali',
    fatherName: 'Muhammad Ali',
    email: 'ahmad.ali@student.college.edu',
    password: 'student123',
    role: 'student',
    rollNumber: 1,
    semester: 3,
    section: 'A1',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: 'usr-stud-2',
    loginId: 'BCS3-A1-002',
    name: 'Bilal Raza',
    fatherName: 'Raza Hussain',
    email: 'bilal.raza@student.college.edu',
    password: 'student123',
    role: 'student',
    rollNumber: 2,
    semester: 3,
    section: 'A1',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-10T10:15:00Z',
  },
  {
    id: 'usr-stud-3',
    loginId: 'BCS3-A1-003',
    name: 'Zainab Noor',
    fatherName: 'Noor Ahmad',
    email: 'zainab.noor@student.college.edu',
    password: 'student123',
    role: 'student',
    rollNumber: 3,
    semester: 3,
    section: 'A1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-10T10:30:00Z',
  },
  {
    id: 'usr-stud-4',
    loginId: 'BCS3-A1-004',
    name: 'Usman Tariq',
    fatherName: 'Tariq Mehmood',
    email: 'usman.tariq@student.college.edu',
    password: 'student123',
    role: 'student',
    rollNumber: 4,
    semester: 3,
    section: 'A1',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-10T10:45:00Z',
  },
  {
    id: 'usr-stud-5',
    loginId: 'BCS3-B-001',
    name: 'Fatima Zahra',
    fatherName: 'Syed Zahir Shah',
    email: 'fatima.zahra@student.college.edu',
    password: 'student123',
    role: 'student',
    rollNumber: 1,
    semester: 3,
    section: 'B',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-10T11:00:00Z',
  },
];

// Calculate future midnight date (5 days ahead)
const targetDate = new Date();
targetDate.setDate(targetDate.getDate() + 5);
const futureDeadline = targetDate.toISOString().split('T')[0];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg-301-01',
    teacherId: 'usr-teach-cti-1',
    teacherName: 'Faculty CTI-1',
    semester: 3,
    subjectId: 'sub-cc-211',
    subjectCode: 'CC-211',
    subjectName: 'Object Oriented Programming',
    targetSections: ['All'],
    title: 'Assignment 01: Polymorphic Shape Hierarchy & Operator Overloading',
    description: `Implement a robust class hierarchy in C++ utilizing pure virtual functions, inheritance, and overloaded stream operators.
Ensure to handle dynamic memory allocation, deep copying, and proper virtual destructors. Include time and space complexity explanations.`,
    totalMarks: 20,
    deadlineDate: futureDeadline, // Expires at 11:59:59 PM on this date
    gradingMode: 'hybrid',
    testCases: [
      {
        id: 'tc-1',
        input: 'Circle 5',
        expectedOutput: 'Area: 78.54',
        points: 5,
      },
      {
        id: 'tc-2',
        input: 'Rectangle 4 6',
        expectedOutput: 'Area: 24.00',
        points: 5,
      },
      {
        id: 'tc-3',
        input: 'Triangle 3 4',
        expectedOutput: 'Area: 6.00',
        points: 5,
      },
      {
        id: 'tc-4',
        input: 'Square 5',
        expectedOutput: 'Area: 25.00',
        points: 5,
      },
    ],
    aiRubric: [
      {
        id: 'rub-1',
        title: 'OOP Architecture & Polymorphism',
        weight: 40,
        description: 'Proper use of virtual base classes, inheritance, and dynamic binding.',
      },
      {
        id: 'rub-2',
        title: 'Memory Management & Rule of Three',
        weight: 35,
        description: 'Proper copy constructors, assignment operators, and memory deallocation.',
      },
      {
        id: 'rub-3',
        title: 'Code Quality & Documentation',
        weight: 25,
        description: 'Clean indentation, descriptive identifier names, and complexity analysis.',
      },
    ],
    resourceFileName: 'oop_starter_template.cpp',
    resourceFileContent: `// CC-211 Object Oriented Programming Starter Template
#include <iostream>
#include <string>
using namespace std;

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() {}
};

int main() {
    cout << "Enter shape details:" << endl;
    return 0;
}`,
    createdAt: '2026-11-15T09:00:00Z',
  },
  {
    id: 'asg-301-02',
    teacherId: 'usr-teach-cti-1',
    teacherName: 'Faculty CTI-1',
    semester: 3,
    subjectId: 'sub-cc-211',
    subjectCode: 'CC-211',
    subjectName: 'Object Oriented Programming',
    targetSections: ['A1'],
    title: 'Assignment 02: Template-based Generic Linked Collection',
    description: `Construct a generic template class in C++ supporting insert, remove, and iterator traversal.
Demonstrate with user-defined types and complete step-by-step comments.`,
    totalMarks: 15,
    deadlineDate: '2026-11-10', // Expired! Demonstrates the automatic lockout
    gradingMode: 'manual',
    createdAt: '2026-11-01T12:00:00Z',
  },
  {
    id: 'asg-501-01',
    teacherId: 'usr-teach-khubaib',
    teacherName: 'Khubaib Ahmad',
    semester: 5,
    subjectId: 'sub-dc-322',
    subjectCode: 'DC-322',
    subjectName: 'Computer Architecture',
    targetSections: ['All'],
    title: 'Assignment 01: 5-Stage MIPS Pipelining Hazard Detector & Simulator',
    description: `Develop a pipeline simulator in C++ or Python that reads MIPS assembly instructions and detects Data Hazards (RAW, WAR, WAW) and Control Hazards.
Compute total cycle count, CPI (Cycles Per Instruction), and stall penalties with and without forwarding.`,
    totalMarks: 20,
    deadlineDate: futureDeadline, // Locks at 11:59:59 PM (Midnight)
    gradingMode: 'hybrid',
    testCases: [
      { id: 'tc-501-1', input: 'LW $1, 0($2)\nADD $3, $1, $4', expectedOutput: 'Stalls: 1 with forwarding', points: 10 },
      { id: 'tc-501-2', input: 'ADD $1, $2, $3\nSUB $4, $1, $5', expectedOutput: 'Stalls: 0 with forwarding', points: 10 },
    ],
    aiRubric: [
      { id: 'rub-501-1', title: 'Hazard Detection Unit', weight: 40, description: 'Accurate detection of read-after-write registers across EX/MEM and MEM/WB stages' },
      { id: 'rub-501-2', title: 'Forwarding Unit Logic', weight: 40, description: 'Proper routing of operand values directly to execution stage' },
      { id: 'rub-501-3', title: 'CPI and Performance Analysis', weight: 20, description: 'Accurate mathematical breakdown of pipeline efficiency' },
    ],
    resourceFileName: 'pipeline_simulator.py',
    resourceFileContent: `# DC-322 Computer Architecture Starter Template
# Implement Pipeline Register and Hazard Detection
class PipelineSimulator:
    def __init__(self):
        self.cycles = 0
        self.stalls = 0
`,
    createdAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'asg-101-01',
    teacherId: 'usr-teach-khubaib',
    teacherName: 'Khubaib Ahmad',
    semester: 1,
    subjectId: 'sub-csc-110',
    subjectCode: 'CSC-110',
    subjectName: 'Programming Fundamentals',
    targetSections: ['All'],
    title: 'Assignment 01: Procedural Logic & Dynamic 2D Matrix Manipulation',
    description: `Write a modular C++ program to perform dynamic 2D array memory allocation using pointers.
Implement matrix multiplication, transpose, and saddle point detection without using the standard vector library.`,
    totalMarks: 15,
    deadlineDate: futureDeadline,
    gradingMode: 'hybrid',
    createdAt: '2026-11-15T11:00:00Z',
  },
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-001',
    assignmentId: 'asg-301-01',
    studentId: 'usr-stud-1',
    studentName: 'Ahmad Ali',
    studentRollNumber: 1,
    studentSemester: 3,
    studentSection: 'A1',
    textSubmission: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

bool isMatching(char open, char close) {
    return (open == '(' && close == ')') ||
           (open == '{' && close == '}') ||
           (open == '[' && close == ']');
}

bool isBalanced(string expr) {
    stack<char> s;
    for (char ch : expr) {
        if (ch == '(' || ch == '{' || ch == '[') {
            s.push(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (s.empty() || !isMatching(s.top(), ch)) return false;
            s.pop();
        }
    }
    return s.empty();
}

int main() {
    string expr;
    if (cin >> expr) {
        cout << (isBalanced(expr) ? "BALANCED" : "NOT_BALANCED") << endl;
    }
    return 0;
}`,
    files: [
      {
        name: 'stack_solution.cpp',
        size: 840,
        type: 'text/x-c++src',
      },
    ],
    submittedAt: '2026-11-16T14:22:10Z',
    status: 'graded',
    score: 19,
    teacherFeedback: 'Outstanding work, Ahmad. Clean modular structure and all boundary cases handled correctly.',
    testCasesPassed: 4,
    testCasesTotal: 4,
    aiSuggestedScore: 19,
    aiFeedback: 'Clean implementation with linear O(N) time and O(N) auxiliary space. Matching logic is well-factored.',
    integrityReport: {
      peerPlagiarismScore: 3,
      aiLikelihoodScore: 8,
      aiReasoning: 'Variable naming, formatting, and structure reflect natural human programmer habits with organic edits.',
      telemetry: {
        typedCharacterCount: 780,
        pasteEventCount: 0,
        totalPastedCharacters: 0,
        typingDurationSeconds: 412,
        estimatedWPM: 38,
        suspiciousBurstDetected: false,
        timelineLogs: [
          'Session started in LMS editor',
          'Organic typing: 120 chars (includes 14 backspaces)',
          'Function isMatching written organically',
          'Loop construct entered with 8 pauses',
          'Successfully tested and submitted',
        ],
      },
    },
  },
  {
    id: 'sub-002',
    assignmentId: 'asg-301-01',
    studentId: 'usr-stud-2',
    studentName: 'Bilal Raza',
    studentRollNumber: 2,
    studentSemester: 3,
    studentSection: 'A1',
    textSubmission: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

// Function to match parenthesis
bool isMatching(char open, char close) {
    return (open == '(' && close == ')') ||
           (open == '{' && close == '}') ||
           (open == '[' && close == ']');
}

bool isBalanced(string expr) {
    stack<char> s;
    for (char ch : expr) {
        if (ch == '(' || ch == '{' || ch == '[') {
            s.push(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (s.empty() || !isMatching(s.top(), ch)) return false;
            s.pop();
        }
    }
    return s.empty();
}

int main() {
    string expr;
    if (cin >> expr) {
        cout << (isBalanced(expr) ? "BALANCED" : "NOT_BALANCED") << endl;
    }
    return 0;
}`,
    files: [
      {
        name: 'solution_bilal.cpp',
        size: 875,
        type: 'text/x-c++src',
      },
    ],
    submittedAt: '2026-11-16T18:45:00Z',
    status: 'submitted',
    testCasesPassed: 4,
    testCasesTotal: 4,
    aiSuggestedScore: 12,
    aiFeedback: 'Code passes test cases but exhibits 89% exact token match with Roll #1 (Ahmad Ali). Only single comment altered.',
    integrityReport: {
      peerPlagiarismScore: 89,
      matchedWithRollNumber: 1,
      matchedStudentName: 'Ahmad Ali',
      matchedSnippet: 'bool isBalanced(string expr) { stack<char> s; for (char ch : expr) { ... }',
      aiLikelihoodScore: 42,
      aiReasoning: 'Primary flag is high direct peer plagiarism with Roll #1.',
      telemetry: {
        typedCharacterCount: 45,
        pasteEventCount: 2,
        totalPastedCharacters: 820,
        typingDurationSeconds: 14,
        estimatedWPM: 195,
        suspiciousBurstDetected: true,
        timelineLogs: [
          'Session started in LMS editor',
          'SUSPICIOUS: 820 characters pasted in 1.4 seconds from clipboard',
          'Single comment added: "// Function to match parenthesis"',
          'Submitted within 14 seconds of page load',
        ],
      },
    },
  },
];
