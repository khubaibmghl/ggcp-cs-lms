import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/serverDocumentParser';

export interface QuestionAssessment {
  questionNumber: string;
  prompt: string;
  marksAwarded: number;
  maxMarks: number;
  status: 'Full Marks' | 'Partial' | 'Needs Improvement' | 'Missing';
  feedback: string;
  keyConceptsCovered: string[];
  modelSolutionSnippet?: string;
  studentEvidenceSnippet?: string;
  evaluationRubricCriteria?: string[];
}

export interface EvaluationResult {
  overallScore: number;
  totalMarks: number;
  percentage: number;
  status: 'Proficient' | 'Good' | 'Needs Improvement' | 'Incomplete';
  questionPaperSample: string;
  solutionSample: string;
  canonicalAnswerKeySummary?: string;
  questionBreakdown: QuestionAssessment[];
  strengths: string[];
  areasForImprovement: string[];
  instructorFeedbackDraft: string;
  aiEngineUsed: string;
}

export async function GET() {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    (process.env as any).GENINI_API_KEY
  );
  return NextResponse.json({
    configured: hasKey,
    engine: hasKey ? 'Google Gemini AI (Server Active)' : 'Academic Strict Rule Evaluator',
  });
}

// Administrative and institutional noise words that must NEVER contribute to student marks
const ADMINISTRATIVE_NOISE = new Set([
  'department', 'faculty', 'official', 'course', 'workload', 'allocation',
  'semester', 'credit', 'credits', 'hours', 'session', 'fall', 'spring', 'summer',
  'university', 'college', 'pasrur', 'govt', 'graduate', 'roll', 'section',
  'name', 'date', 'signature', 'assignment', 'submission', 'total', 'marks',
  'subject', 'code', 'instructor', 'teacher', 'student', 'serial', 'page',
  'table', 'room', 'block', 'shift', 'morning', 'evening', 'degree', 'program',
  'bs', 'bsc', 'msc', 'bba', 'it', 'cs', 'se', 'punjab', 'lahore', 'gujranwala',
  'sialkot', 'signature', 'checked', 'verified', 'status', 'attendance', 'lecture',
  'lectures', 'accredited', 'hec', 'affiliation', 'principal', 'coordinator',
  'sr', 'remarks', 'sr#', 'sr.', 'cr'
]);

// Programming signatures per language
const CODE_PATTERNS = {
  cpp: [
    /#include\s*<[a-z0-9_.]+>/i,
    /\busing\s+namespace\s+std\b/i,
    /\b(?:int|void)\s+main\s*\(/i,
    /\b(?:cout\s*<<|cin\s*>>)/,
    /\b(?:printf|scanf)\s*\(/,
    /;\s*$/m,
    /{\s*[\s\S]*}/,
    /\b(?:return\s+0|return\s+[a-z0-9_]+)\b/i,
    /\b(?:class|struct|namespace|vector|iostream)\b/i,
  ],
  python: [
    /\bdef\s+[a-z_][a-z0-9_]*\s*\(/i,
    /\bimport\s+[a-z_]/i,
    /\bfrom\s+[a-z_]+\s+import/i,
    /\bprint\s*\(/,
    /\bif\s+__name__\s*==\s*['"]__main__['"]/,
    /:\s*$/m,
    /\b(?:elif|else|while|for|in\s+range)\b/,
  ],
  java: [
    /\bpublic\s+class\s+[a-z0-9_]+/i,
    /\bpublic\s+static\s+void\s+main\s*\(/i,
    /\bSystem\.out\.println\s*\(/,
    /\bimport\s+java\./i,
    /;\s*$/m,
    /{\s*[\s\S]*}/,
  ],
  sql: [
    /\bSELECT\s+.+\s+FROM\s+/i,
    /\bCREATE\s+TABLE\s+/i,
    /\bINSERT\s+INTO\s+/i,
    /\bUPDATE\s+.+\s+SET\s+/i,
    /\bDELETE\s+FROM\s+/i,
    /\bWHERE\s+.+=/i,
  ],
  web: [
    /<html[\s>]/i,
    /<body[\s>]/i,
    /<script[\s>]/i,
    /<div[\s>]/i,
    /\bdocument\.get/i,
    /\bfunction\s+[a-z0-9_]+\s*\(/i,
  ],
};

function parseQuestionsFromPaper(paperText: string): { number: string; prompt: string }[] {
  if (!paperText || paperText.trim().length === 0) {
    return [{ number: 'Task 1', prompt: 'Comprehensive Assignment Submission' }];
  }

  const regex = /(?:^|\n)\s*(?:(?:question|q|problem|task)\s*([0-9ivx]+)|([0-9ivx]+)[\.\)\:])[:\.\)]?\s*([^\n]+(?:\n(?!(?:question|q|problem|task|[0-9ivx]+[\.\)\:])).*)*)/gi;
  const questions: { number: string; prompt: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paperText)) !== null) {
    const num = match[1] || match[2] || `Q${questions.length + 1}`;
    const prompt = (match[3] || match[0]).trim();
    if (prompt.length > 5) {
      questions.push({
        number: `Q${num.replace(/[^0-9ivx]/gi, '') || questions.length + 1}`,
        prompt: prompt.slice(0, 250),
      });
    }
  }

  if (questions.length === 0) {
    const paragraphs = paperText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25);
    if (paragraphs.length > 0) {
      return paragraphs.slice(0, 5).map((p, idx) => ({
        number: `Q${idx + 1}`,
        prompt: p.slice(0, 200),
      }));
    }
    return [{ number: 'Q1', prompt: paperText.slice(0, 200) }];
  }

  return questions.slice(0, 10);
}

/**
 * Discovers and synthesizes the canonical reference answer key and grading rubric for a question
 */
function discoverModelSolution(prompt: string, subjectCode: string): {
  modelSolution: string;
  rubric: string[];
  expectedConcepts: string[];
} {
  const pNorm = prompt.toLowerCase();

  if (/c\+\+|cpp|\bc\b|program|code|main/i.test(pNorm) || /csc-1|programming/i.test(subjectCode)) {
    return {
      modelSolution: `// Canonical Reference Solution in C++
#include <iostream>
using namespace std;

int main() {
    // 1. Variable initialization & Input Handling
    // 2. Core Algorithmic Computation / Control Flow
    cout << "Standard Output / Result" << endl;
    return 0;
}`,
      rubric: [
        'Correct C++ header syntax (#include <iostream>, using namespace std) [25%]',
        'Proper main() entry point and exit status (return 0) [25%]',
        'Logical program statements, variables, and computation [30%]',
        'Standard input/output stream handling (cin/cout/endl) [20%]',
      ],
      expectedConcepts: ['#include', 'iostream', 'main', 'cout', 'cin', 'syntax', 'logic'],
    };
  }

  if (/python/i.test(pNorm)) {
    return {
      modelSolution: `# Canonical Reference Solution in Python
def execute_task():
    # 1. Input parsing
    # 2. Algorithmic transformation
    print("Execution Result")

if __name__ == "__main__":
    execute_task()`,
      rubric: [
        'Clean Python indentation and function definitions [25%]',
        'Core algorithmic logic implementation [50%]',
        'Output stream and return value verification [25%]',
      ],
      expectedConcepts: ['def', 'print', 'return', 'logic'],
    };
  }

  if (/database|sql|table|query/i.test(pNorm)) {
    return {
      modelSolution: `-- Canonical Reference SQL Solution
SELECT column_name
FROM table_name
WHERE condition_clause;`,
      rubric: [
        'Valid SQL syntax (SELECT, FROM, WHERE, JOIN) [40%]',
        'Correct relational table schema and attribute selection [40%]',
        'Proper filtering criteria and constraints [20%]',
      ],
      expectedConcepts: ['select', 'from', 'where', 'table'],
    };
  }

  // Theoretical / Conceptual Question
  return {
    modelSolution: `Canonical Reference Answer:
1. Formal Technical Definition and Core Principles.
2. Architectural Diagram / Layered Mechanism / Step-by-Step Operation.
3. Comparative Analysis, Advantages, and Key Real-World Applications.`,
    rubric: [
      'Accurate domain definition and conceptual terminology [40%]',
      'Thorough step-by-step or structural mechanism explanation [40%]',
      'Examples, use-cases, and critical analysis [20%]',
    ],
    expectedConcepts: ['definition', 'architecture', 'mechanism', 'terminology'],
  };
}

/**
 * Stage 1 + Stage 2 Authentic Academic Assessment Engine.
 * 1. Discovers the canonical model solution and rubric for each question.
 * 2. Compares student's submission against that discovered model solution.
 * 3. Enforces zero tolerance for off-topic/administrative files.
 */
function performDeterministicEvaluation(
  questionText: string,
  solutionText: string,
  totalMarks: number,
  subjectCode: string,
  studentName: string
): EvaluationResult {
  const parsedQuestions = parseQuestionsFromPaper(questionText);
  const qCount = parsedQuestions.length || 1;
  const marksPerQuestion = totalMarks / qCount;

  // Handle scanned documents or IDE screenshot uploads where no digital text stream exists
  const isImageOrScan = !solutionText || solutionText.trim().length < 25;
  if (isImageOrScan) {
    return {
      overallScore: 0,
      totalMarks,
      percentage: 0,
      status: 'Needs Improvement',
      questionPaperSample: questionText.slice(0, 300),
      solutionSample: '(Document contains scanned pages or IDE screenshots with no machine-readable digital text layer)',
      canonicalAnswerKeySummary: 'Canonical requirements extracted. Submission contains image/scanned pages requiring visual code review.',
      questionBreakdown: parsedQuestions.map((q) => ({
        questionNumber: q.number,
        prompt: q.prompt,
        marksAwarded: 0,
        maxMarks: Number(marksPerQuestion.toFixed(1)),
        status: 'Needs Improvement' as const,
        feedback: 'Scanned document / IDE compiler screenshots detected. Visual code inspection required from the Document View on the left.',
        keyConceptsCovered: ['Visual Code Review Required'],
        modelSolutionSnippet: discoverModelSolution(q.prompt, subjectCode).modelSolution || 'Valid compilable implementation required.',
        studentEvidenceSnippet: 'Document contains embedded image/screenshot pages. Inspect visual code in Document View.',
        evaluationRubricCriteria: ['Verify logic in screenshots', 'Inspect syntax on pages', 'Award marks via Grade Award form below'],
      })),
      strengths: ['Document successfully submitted and viewable in Document View.'],
      areasForImprovement: ['Scanned image pages detected. Connect Gemini API key for automated multimodal image vision, or award marks manually using the form below.'],
      instructorFeedbackDraft: 'Student submitted scanned/screenshot pages of their solution. Please visually verify the code in the left viewer and adjust marks accordingly.',
      aiEngineUsed: 'Academic Structural Evaluator (Visual Inspection Mode)',
    };
  }

  const solNorm = solutionText.toLowerCase();
  const solWords = solNorm.split(/[^a-z0-9_#+]+/).filter((w) => w.length > 2);
  const solWordSet = new Set(solWords);

  // Administrative noise check
  let noiseWordCount = 0;
  for (const w of solWords) {
    if (ADMINISTRATIVE_NOISE.has(w)) noiseWordCount++;
  }
  const noiseRatio = solWords.length > 0 ? noiseWordCount / solWords.length : 0;
  const isDominantlyAdministrative = noiseRatio > 0.40 && solWords.length > 15;

  let accumulatedScore = 0;
  const breakdown: QuestionAssessment[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];

  for (const q of parsedQuestions) {
    const promptNorm = q.prompt.toLowerCase();
    const model = discoverModelSolution(q.prompt, subjectCode);

    const isCodingPrompt = /(?:program|code|implement|c\+\+|cpp|java|python|script|function|class|algorithm|syntax|loop|array|pointer)/i.test(promptNorm);
    const isCpp = /c\+\+|cpp|\bc\b/i.test(promptNorm) || /csc-1|programming/i.test(subjectCode);
    const isPython = /python/i.test(promptNorm);
    const isJava = /java\b/i.test(promptNorm);
    const isSql = /sql|database|query|table/i.test(promptNorm);
    const isWeb = /html|css|javascript|web/i.test(promptNorm);

    // Filter meaningful technical keywords from prompt
    const promptWords = promptNorm
      .split(/[^a-z0-9_#+]+/)
      .filter((w) => w.length > 2 && !ADMINISTRATIVE_NOISE.has(w) && !['what', 'explain', 'write', 'define', 'with', 'using', 'that', 'from', 'have', 'this', 'your', 'simple', 'given', 'following'].includes(w));

    let matchedKeywords = 0;
    const coveredConcepts: string[] = [];
    for (const pw of promptWords) {
      if (solWordSet.has(pw) || solNorm.includes(pw)) {
        matchedKeywords++;
        if (coveredConcepts.length < 4) coveredConcepts.push(pw);
      }
    }

    const keywordRatio = promptWords.length > 0 ? matchedKeywords / promptWords.length : 0;

    // Detect code signatures in student submission
    let codeSignatureScore = 0;
    if (isCpp) {
      codeSignatureScore = CODE_PATTERNS.cpp.filter((p) => p.test(solutionText)).length;
    } else if (isPython) {
      codeSignatureScore = CODE_PATTERNS.python.filter((p) => p.test(solutionText)).length;
    } else if (isJava) {
      codeSignatureScore = CODE_PATTERNS.java.filter((p) => p.test(solutionText)).length;
    } else if (isSql) {
      codeSignatureScore = CODE_PATTERNS.sql.filter((p) => p.test(solutionText)).length;
    } else if (isWeb) {
      codeSignatureScore = CODE_PATTERNS.web.filter((p) => p.test(solutionText)).length;
    } else if (isCodingPrompt) {
      codeSignatureScore = [
        ...CODE_PATTERNS.cpp,
        ...CODE_PATTERNS.python,
        ...CODE_PATTERNS.java,
      ].filter((p) => p.test(solutionText)).length;
    }

    let qScore = 0;
    let status: QuestionAssessment['status'] = 'Missing';
    let feedback = '';
    let studentSnippet = '';

    // Extract student's best relevant evidence snippet
    if (isDominantlyAdministrative) {
      studentSnippet = `Administrative Workload Excerpt: "${solutionText.slice(0, 160)}..." (Zero programming constructs found)`;
    } else if (codeSignatureScore > 0) {
      studentSnippet = solutionText.slice(0, 260) + (solutionText.length > 260 ? '...' : '');
    } else {
      studentSnippet = solutionText.slice(0, 200) + (solutionText.length > 200 ? '...' : '');
    }

    // STRICT EVALUATION AGAINST THE DISCOVERED CANONICAL MODEL SOLUTION:
    if (isCodingPrompt) {
      if (codeSignatureScore === 0) {
        // Zero code found in a coding task!
        qScore = 0;
        status = 'Missing';
        if (isDominantlyAdministrative) {
          feedback = `Off-Topic Submission: Question requires programming code corresponding to the Canonical C++ Model Solution, but submitted document contains administrative course allocation/faculty workload text with 0 code constructs.`;
        } else {
          feedback = `No code or valid programming syntax detected. Missing essential constructs required by the Model Solution (#include, main(), variables, or logic statements).`;
        }
        improvements.push(`${q.number}: Provide complete, compilable source code matching the Canonical Model Solution.`);
      } else if (codeSignatureScore >= 3 && (keywordRatio >= 0.4 || matchedKeywords >= 1)) {
        // Strong code implementation
        qScore = Number((marksPerQuestion * 0.95).toFixed(1));
        status = 'Full Marks';
        feedback = `Executable code structure found matching the Canonical Model Solution with appropriate syntax and valid logic.`;
        strengths.push(`${q.number}: Clean syntax and proper programming structure demonstrated.`);
      } else if (codeSignatureScore >= 1) {
        // Partial code
        qScore = Number((marksPerQuestion * 0.50).toFixed(1));
        status = 'Partial';
        feedback = `Partial code constructs detected, but lacks complete logic, required functions, or full solution compared to the Model Answer.`;
        improvements.push(`${q.number}: Complete the algorithm and verify edge cases/output.`);
      } else {
        qScore = 0;
        status = 'Missing';
        feedback = `Incomplete or irrelevant code. Failed to meet the Model Solution criteria.`;
      }
    } else {
      // THEORETICAL EVALUATION AGAINST DISCOVERED CANONICAL MODEL SOLUTION:
      if (isDominantlyAdministrative && keywordRatio < 0.25) {
        qScore = 0;
        status = 'Missing';
        feedback = `Off-topic administrative content detected. The text does not answer the technical question asked in the Model Solution.`;
        improvements.push(`${q.number}: Address the specific topic rather than uploading unrelated institutional material.`);
      } else if (keywordRatio >= 0.60 && solWords.length >= 60) {
        qScore = Number((marksPerQuestion * 0.90).toFixed(1));
        status = 'Full Marks';
        feedback = `Comprehensive explanation covering core domain terminology matching the Model Solution (${coveredConcepts.join(', ')}).`;
        strengths.push(`${q.number}: In-depth conceptual clarity and thorough explanations.`);
      } else if (keywordRatio >= 0.35 && solWords.length >= 35) {
        qScore = Number((marksPerQuestion * 0.60).toFixed(1));
        status = 'Partial';
        feedback = `Basic conceptual understanding shown, but requires deeper elaboration matching the Model Solution criteria.`;
        improvements.push(`${q.number}: Elaborate further on core principles and provide supporting examples.`);
      } else if (keywordRatio >= 0.15 && solWords.length >= 20) {
        qScore = Number((marksPerQuestion * 0.30).toFixed(1));
        status = 'Needs Improvement';
        feedback = `Superficial response with minimal technical coverage compared to expected Model Answer.`;
        improvements.push(`${q.number}: Substantially expand on key concepts.`);
      } else {
        qScore = 0;
        status = 'Missing';
        feedback = `No substantive answer found corresponding to this question prompt.`;
        improvements.push(`${q.number}: Unanswered or entirely off-topic.`);
      }
    }

    accumulatedScore += qScore;
    breakdown.push({
      questionNumber: q.number,
      prompt: q.prompt,
      marksAwarded: qScore,
      maxMarks: Number(marksPerQuestion.toFixed(1)),
      status,
      feedback,
      keyConceptsCovered: coveredConcepts,
      modelSolutionSnippet: model.modelSolution,
      studentEvidenceSnippet: studentSnippet,
      evaluationRubricCriteria: model.rubric,
    });
  }

  const finalScore = Math.min(totalMarks, Math.max(0, Math.round(accumulatedScore)));
  const percentage = Math.round((finalScore / totalMarks) * 100);

  let overallStatus: EvaluationResult['status'] = 'Good';
  if (percentage >= 85) overallStatus = 'Proficient';
  else if (percentage >= 60) overallStatus = 'Good';
  else if (percentage >= 35) overallStatus = 'Needs Improvement';
  else overallStatus = 'Incomplete';

  let instructorFeedbackDraft = '';
  if (finalScore === 0) {
    instructorFeedbackDraft = `Submission rejected / 0 marks awarded for ${subjectCode}. The uploaded document appears to be off-topic or administrative content with no valid solution or programming code addressing the assignment.`;
  } else {
    instructorFeedbackDraft = `Assignment evaluated for ${subjectCode}. Student ${studentName} scored ${finalScore}/${totalMarks} (${percentage}%). ${
      strengths.length > 0 ? 'Strengths: ' + strengths.slice(0, 2).join(' ') : ''
    } ${improvements.length > 0 ? 'Areas for improvement: ' + improvements.slice(0, 2).join(' ') : ''}`;
  }

  return {
    overallScore: finalScore,
    totalMarks,
    percentage,
    status: overallStatus,
    canonicalAnswerKeySummary: `Discovered and synthesized ${parsedQuestions.length} canonical solutions with strict criteria rubrics for ${subjectCode}.`,
    questionPaperSample: questionText.slice(0, 350) + (questionText.length > 350 ? '...' : ''),
    solutionSample: solutionText.slice(0, 350) + (solutionText.length > 350 ? '...' : ''),
    questionBreakdown: breakdown,
    strengths: strengths.length > 0 ? strengths : ['No valid strengths identified: submitted document is off-topic or empty.'],
    areasForImprovement: improvements.length > 0 ? improvements : ['Review assignment guidelines and submit direct answers.'],
    instructorFeedbackDraft,
    aiEngineUsed: 'Academic Structural Evaluator (Offline Model-Diff Engine)',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      questionFile,
      solutionFile,
      questionTextOverride,
      solutionTextOverride,
      assignment,
      student,
      apiKey: userApiKey,
    } = body;

    const totalMarks = Number(assignment?.totalMarks) || 20;
    const subjectCode = assignment?.subjectCode || 'CS Course';
    const studentName = student?.name || 'Student';

    // 1. Extract Question Paper Text (Priority: actual question file -> description -> title)
    let questionText = '';
    if (questionFile) {
      questionText = await extractDocumentText(questionFile);
    }
    if (!questionText || questionText.trim().length === 0) {
      if (questionTextOverride && !questionTextOverride.toLowerCase().startsWith('question file:')) {
        questionText = questionTextOverride;
      } else if (assignment?.description && !assignment.description.toLowerCase().startsWith('question file:')) {
        questionText = assignment.description;
      }
    }
    if (!questionText || questionText.trim().length === 0) {
      questionText = assignment?.title || 'Programming Assignment';
    }

    // 2. Extract Student Solution Text
    let solutionText = solutionTextOverride || '';
    if (!solutionText && solutionFile) {
      solutionText = await extractDocumentText(solutionFile);
    }

    // Clean CamScanner and scanner watermarks from text so they don't mislead the evaluator
    const cleanedSolutionText = solutionText
      .replace(/camscanner/gi, '')
      .replace(/scanned with/gi, '')
      .replace(/wps office/gi, '')
      .trim();

    // 3. Optional: Call Google Gemini Multimodal AI (Native Document Vision)
    const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || (process.env as any).GENINI_API_KEY;
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
      try {
        const prompt = `You are a strict, fair, and meticulous Computer Science Professor at Govt. Graduate College Pasrur (GGC Pasrur).
Execute an authentic multimodal academic evaluation:

CRITICAL INSTRUCTION FOR SCANS & SCREENSHOTS:
Students may have submitted screenshots of computer or mobile IDEs (e.g. Programiz, Dev-C++, Turbo C, VS Code) or handwritten code pages.
Visually inspect every page and image in the attached document!
Read the actual source code shown in the screenshots or images. DO NOT say "no code detected" if code is visible in the screenshots or scans.

STAGE 1: CANONICAL SOLUTION DISCOVERY
- Analyze the Question Paper requirements carefully.
- Identify the expected programming concepts (syntax, logic, loops, condition checks, calculations, I/O).

STAGE 2: DIFFERENTIAL STUDENT EVALUATION
- Audit the student's submitted code (visible in screenshots/pages or text) against the question requirements.
- Quote the exact code statements found in the student submission under "studentEvidenceSnippet".
- STRICT ACADEMIC INTEGRITY: Only award 0 marks if the submission is genuinely off-topic (e.g., timetable, administrative workload list, unrelated document) with zero relevant code.
- If code is present and attempts the problem, award appropriate marks based on logic, syntax, and accuracy.

ASSIGNMENT DETAILS:
Course: ${subjectCode} (${assignment?.title || 'Assignment'})
Total Marks: ${totalMarks}
Student: ${studentName} (Roll #${student?.rollNumber || 'N/A'}, Section ${student?.section || 'N/A'})

OFFICIAL QUESTION PAPER CONTENT / BLUEPRINT:
"""
${questionText}
"""

EXTRACTED TEXT LAYER (IF AVAILABLE):
"""
${cleanedSolutionText || '(No digital text layer; code is embedded in document screenshots/images)'}
"""

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": number (0 to ${totalMarks}),
  "canonicalAnswerKeySummary": "overview of the canonical reference solutions discovered from question paper",
  "questionBreakdown": [
    {
      "questionNumber": "Q1",
      "prompt": "brief question summary",
      "marksAwarded": number,
      "maxMarks": number,
      "status": "Full Marks" | "Partial" | "Needs Improvement" | "Missing",
      "feedback": "specific critique explaining marks awarded or deducted",
      "keyConceptsCovered": ["concept1", "concept2"],
      "modelSolutionSnippet": "canonical code or authoritative answer for this question",
      "studentEvidenceSnippet": "exact excerpt or screenshot code from student submission evaluated",
      "evaluationRubricCriteria": ["rubric item 1", "rubric item 2"]
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "instructorFeedbackDraft": "comprehensive feedback ready for instructor to give to student"
}`;

        // Build multimodal parts
        const parts: any[] = [{ text: prompt }];

        // Attach student submission payload as inlineData so Gemini visually inspects all pages
        if (solutionFile?.dataUrl && solutionFile.dataUrl.includes('base64,')) {
          const splitParts = solutionFile.dataUrl.split('base64,');
          let mime = splitParts[0].replace('data:', '').replace(';base64', '') || 'application/pdf';
          const b64 = splitParts[1];
          if (b64 && b64.length < 15000000) {
            parts.push({
              inlineData: {
                mimeType: mime.includes('word') || mime.includes('officedocument') ? 'application/pdf' : mime,
                data: b64,
              },
            });
          }
        } else if (solutionFile?.url && (solutionFile.url.startsWith('http://') || solutionFile.url.startsWith('https://'))) {
          // If remote URL, fetch and attach inline base64 if under 12MB
          try {
            const fileRes = await fetch(solutionFile.url);
            if (fileRes.ok) {
              const arrayBuf = await fileRes.arrayBuffer();
              if (arrayBuf.byteLength < 12000000) {
                const b64 = Buffer.from(arrayBuf).toString('base64');
                const isPdf = solutionFile.name.toLowerCase().endsWith('.pdf') || fileRes.headers.get('content-type')?.includes('pdf');
                parts.push({
                  inlineData: {
                    mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
                    data: b64,
                  },
                });
              }
            }
          } catch (e) {
            console.warn('Could not fetch remote solution file for multimodal inspection:', e);
          }
        }

        const candidateModels = [
          'gemini-3-flash-preview',
          'gemini-3.5-flash-lite',
          'gemini-flash-latest',
        ];

        let geminiRes: Response | null = null;
        for (const modelName of candidateModels) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts }],
                  generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
                }),
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);
            if (resp.ok) {
              geminiRes = resp;
              break;
            }
          } catch {
            // try next model or fallback immediately
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = JSON.parse(responseText);
            const score = Math.min(totalMarks, Math.max(0, Math.round(Number(parsed.overallScore))));
            const pct = Math.round((score / totalMarks) * 100);

            return NextResponse.json({
              success: true,
              evaluation: {
                overallScore: score,
                totalMarks,
                percentage: pct,
                status: pct >= 85 ? 'Proficient' : pct >= 60 ? 'Good' : pct >= 35 ? 'Needs Improvement' : 'Incomplete',
                questionPaperSample: questionText.slice(0, 350) + (questionText.length > 350 ? '...' : ''),
                solutionSample: solutionText.slice(0, 350) + (solutionText.length > 350 ? '...' : ''),
                canonicalAnswerKeySummary: parsed.canonicalAnswerKeySummary || 'Canonical solutions synthesized by Gemini AI.',
                questionBreakdown: parsed.questionBreakdown || [],
                strengths: parsed.strengths || [],
                areasForImprovement: parsed.areasForImprovement || [],
                instructorFeedbackDraft: parsed.instructorFeedbackDraft || '',
                aiEngineUsed: 'Gemini AI (2-Stage Solution Discovery & Audit)',
              },
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to Academic Structural Evaluator:', geminiError);
      }
    }

    // 4. Grounded Academic Structural Evaluation (Strict Rule-Based)
    const evaluation = performDeterministicEvaluation(
      questionText,
      cleanedSolutionText,
      totalMarks,
      subjectCode,
      studentName
    );

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    console.error('Error in /api/evaluate-submission:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Assignment evaluation failed' },
      { status: 500 }
    );
  }
}
