import { Subject, User, Assignment, Submission } from '@/types';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-cs101',
    code: 'CS101',
    name: 'Programming Fundamentals',
    semester: 1,
    creditHours: 4,
    description: 'Basics of procedural programming, variables, loops, arrays, pointers, and functions in C++.',
  },
  {
    id: 'sub-cs102',
    code: 'CS102',
    name: 'Introduction to ICT',
    semester: 1,
    creditHours: 3,
    description: 'Computer hardware architectures, networking fundamentals, web technologies, and security basics.',
  },
  {
    id: 'sub-cs201',
    code: 'CS201',
    name: 'Object Oriented Programming',
    semester: 2,
    creditHours: 4,
    description: 'Classes, objects, inheritance, polymorphism, templates, and memory management in modern C++ and Java.',
  },
  {
    id: 'sub-cs202',
    code: 'CS202',
    name: 'Discrete Structures',
    semester: 2,
    creditHours: 3,
    description: 'Set theory, propositional logic, mathematical induction, graph theory, and combinatorics for computing.',
  },
  {
    id: 'sub-cs301',
    code: 'CS301',
    name: 'Data Structures',
    semester: 3,
    creditHours: 4,
    description: 'Stacks, Queues, Linked Lists, Binary Trees, AVL Trees, Heaps, Hash Tables, and Graph traversal algorithms.',
  },
  {
    id: 'sub-cs302',
    code: 'CS302',
    name: 'Digital Logic Design',
    semester: 3,
    creditHours: 3,
    description: 'Boolean algebra, logic gates, combinational circuits, flip-flops, registers, counters, and state machines.',
  },
  {
    id: 'sub-cs401',
    code: 'CS401',
    name: 'Design & Analysis of Algorithms',
    semester: 4,
    creditHours: 3,
    description: 'Asymptotic notation, divide-and-conquer, greedy techniques, dynamic programming, and NP-completeness.',
  },
  {
    id: 'sub-cs402',
    code: 'CS402',
    name: 'Database Systems',
    semester: 4,
    creditHours: 4,
    description: 'Relational data models, ER diagrams, normalization (1NF-BCNF), complex SQL queries, and transaction ACID properties.',
  },
  {
    id: 'sub-cs501',
    code: 'CS501',
    name: 'Operating Systems',
    semester: 5,
    creditHours: 4,
    description: 'Process management, concurrency, semaphores, memory paging/segmentation, virtual memory, and file systems.',
  },
  {
    id: 'sub-cs601',
    code: 'CS601',
    name: 'Computer Networks',
    semester: 6,
    creditHours: 3,
    description: 'OSI & TCP/IP layers, socket programming, routing protocols (BGP/OSPF), congestion control, and DNS.',
  },
  {
    id: 'sub-cs701',
    code: 'CS701',
    name: 'Artificial Intelligence',
    semester: 7,
    creditHours: 3,
    description: 'State space search, heuristics, min-max game trees, knowledge representation, and foundational machine learning.',
  },
  {
    id: 'sub-cs801',
    code: 'CS801',
    name: 'Final Year Project (Cap-Stone)',
    semester: 8,
    creditHours: 6,
    description: 'Comprehensive software engineering or research project demonstrating mastery of computer science competencies.',
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
    id: 'usr-teach-1',
    loginId: 'sarah',
    name: 'Dr. Sarah Khan',
    email: 'sarah.khan@college.edu',
    password: 'teacher123',
    phone: '03001234567',
    role: 'teacher',
    status: 'approved',
    taughtSemester: 3,
    taughtSubjectId: 'sub-cs301',
    taughtSubjectName: 'CS301 - Data Structures',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'usr-teach-2',
    loginId: 'hamza',
    name: 'Engr. Hamza Ali',
    email: 'hamza.ali@college.edu',
    password: 'teacher123',
    phone: '03017654321',
    role: 'teacher',
    status: 'pending',
    taughtSemester: 1,
    taughtSubjectId: 'sub-cs101',
    taughtSubjectName: 'CS101 - Programming Fundamentals',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
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
    teacherId: 'usr-teach-1',
    teacherName: 'Dr. Sarah Khan',
    semester: 3,
    subjectId: 'sub-cs301',
    subjectCode: 'CS301',
    subjectName: 'Data Structures',
    targetSections: ['All'],
    title: 'Assignment 01: Balanced Parentheses Checker using Stack ADT',
    description: `Implement a robust Parentheses Checker in C++ or Python utilizing an array-based or pointer-based Stack data structure.
Your program must validate matching pairs of parentheses: '()', '{}', and '[]'.
Ensure to handle empty strings, mismatched closers, and premature closures. Include time and space complexity explanations in your comments or text description.`,
    totalMarks: 20,
    deadlineDate: futureDeadline, // Expires at 11:59:59 PM on this date
    gradingMode: 'hybrid',
    testCases: [
      {
        id: 'tc-1',
        input: '{[()]}',
        expectedOutput: 'BALANCED',
        points: 5,
      },
      {
        id: 'tc-2',
        input: '{[(])}',
        expectedOutput: 'NOT_BALANCED',
        points: 5,
      },
      {
        id: 'tc-3',
        input: '((()',
        expectedOutput: 'NOT_BALANCED',
        points: 5,
      },
      {
        id: 'tc-4',
        input: '{[]}',
        expectedOutput: 'BALANCED',
        points: 5,
      },
    ],
    aiRubric: [
      {
        id: 'rub-1',
        title: 'Stack ADT Implementation',
        weight: 40,
        description: 'Proper push/pop/peek operations with memory boundary checks.',
      },
      {
        id: 'rub-2',
        title: 'Algorithmic Accuracy & Edge Cases',
        weight: 35,
        description: 'Correct evaluation of nested and mismatched bracket structures.',
      },
      {
        id: 'rub-3',
        title: 'Code Quality & Documentation',
        weight: 25,
        description: 'Clean indentation, descriptive identifier names, and complexity analysis.',
      },
    ],
    resourceFileName: 'stack_starter_template.cpp',
    resourceFileContent: `// CS301 Data Structures Starter Template
#include <iostream>
#include <string>
using namespace std;

bool isBalanced(string expr) {
    // TODO: Implement using your custom Stack
    return false;
}

int main() {
    string input;
    if (cin >> input) {
        cout << (isBalanced(input) ? "BALANCED" : "NOT_BALANCED") << endl;
    }
    return 0;
}`,
    createdAt: '2026-11-15T09:00:00Z',
  },
  {
    id: 'asg-301-02',
    teacherId: 'usr-teach-1',
    teacherName: 'Dr. Sarah Khan',
    semester: 3,
    subjectId: 'sub-cs301',
    subjectCode: 'CS301',
    subjectName: 'Data Structures',
    targetSections: ['A1'],
    title: 'Assignment 02: In-place Reversal of Doubly Linked List',
    description: `Construct a Doubly Linked List with insert, delete, and in-place pointer reversal methods.
Draw the memory pointer changes on paper or write code with complete step-by-step comments.`,
    totalMarks: 15,
    deadlineDate: '2026-11-10', // Expired! Demonstrates the automatic lockout
    gradingMode: 'manual',
    createdAt: '2026-11-01T12:00:00Z',
  },
  {
    id: 'asg-501-01',
    teacherId: 'usr-teach-1',
    teacherName: 'Prof. Dr. Tariq Mahmood',
    semester: 5,
    subjectId: 'sub-cs501',
    subjectCode: 'CS501',
    subjectName: 'Operating Systems',
    targetSections: ['All'],
    title: 'Assignment 01: CPU Scheduling Simulator (FCFS, SJF & Round Robin)',
    description: `Develop a process scheduling simulator in C++ or Python that reads process arrival times and burst times from standard input.
Compute and display the Gantt chart sequence, Average Waiting Time (AWT), and Average Turnaround Time (ATAT).
Your solution must handle arbitrary quantum values for Round Robin scheduling.`,
    totalMarks: 20,
    deadlineDate: futureDeadline, // Locks at 11:59:59 PM (Midnight)
    gradingMode: 'hybrid',
    testCases: [
      { id: 'tc-501-1', input: '3\nP1 0 5\nP2 1 3\nP3 2 8', expectedOutput: 'AWT: 4.33', points: 10 },
      { id: 'tc-501-2', input: '2\nP1 0 4\nP2 0 4', expectedOutput: 'AWT: 2.00', points: 10 },
    ],
    aiRubric: [
      { id: 'rub-501-1', title: 'Process Queue & State Management', weight: 40, description: 'Correct state transitions from Ready to Running to Terminated' },
      { id: 'rub-501-2', title: 'Round Robin Quantum Preemption', weight: 40, description: 'Proper context switching when quantum expires' },
      { id: 'rub-501-3', title: 'Metrics Calculation', weight: 20, description: 'Accurate AWT and ATAT formulas' },
    ],
    resourceFileName: 'cpu_scheduler_template.py',
    resourceFileContent: `# CS501 Operating Systems Starter Template
# Implement Process class and Scheduling algorithms
class Process:
    def __init__(self, pid, arrival, burst):
        self.pid = pid
        self.arrival = arrival
        self.burst = burst
        self.waiting_time = 0
        self.turnaround_time = 0

def simulate_fcfs(processes):
    pass
`,
    createdAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'asg-101-01',
    teacherId: 'usr-teach-2',
    teacherName: 'Engr. Hamza Ali',
    semester: 1,
    subjectId: 'sub-cs101',
    subjectCode: 'CS101',
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
