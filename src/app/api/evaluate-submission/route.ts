import { NextRequest, NextResponse } from 'next/server';
import { extractDocumentText } from '@/lib/serverDocumentParser';

interface QuestionAssessment {
  questionNumber: string;
  prompt: string;
  marksAwarded: number;
  maxMarks: number;
  status: 'Full Marks' | 'Partial' | 'Needs Improvement' | 'Missing';
  feedback: string;
  keyConceptsCovered: string[];
}

interface EvaluationResult {
  overallScore: number;
  totalMarks: number;
  percentage: number;
  status: 'Proficient' | 'Good' | 'Needs Improvement' | 'Incomplete';
  questionPaperSample: string;
  solutionSample: string;
  questionBreakdown: QuestionAssessment[];
  strengths: string[];
  areasForImprovement: string[];
  instructorFeedbackDraft: string;
  aiEngineUsed: 'Gemini AI' | 'Academic Structural Evaluator';
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
  'lectures', 'accredited', 'hec', 'affiliation', 'principal', 'coordinator'
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
 * Strict, authentic academic evaluation engine.
 * Never awards marks to off-topic documents or generic administrative text.
 */
function performDeterministicEvaluation(
  questionText: string,
  solutionText: string,
  totalMarks: number,
  subjectCode: string,
  studentName: string
): EvaluationResult {
  const parsedQuestions = parseQuestionsFromPaper(questionText);
  const qCount = parsedQuestions.length;
  const marksPerQuestion = totalMarks / qCount;

  const solNorm = solutionText.toLowerCase();
  const solWords = solNorm.split(/[^a-z0-9_#+]+/).filter((w) => w.length > 2);
  const solWordSet = new Set(solWords);

  // Measure noise ratio (e.g. if the document is pure course workload / faculty allocation)
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

    // Check if the prompt requires programming
    const isCodingPrompt = /(?:program|code|implement|c\+\+|cpp|java|python|script|function|class|algorithm|syntax|loop|array|pointer)/i.test(promptNorm);
    const isCpp = /c\+\+|cpp|\bc\b/i.test(promptNorm) || /csc-1|programming/i.test(subjectCode);
    const isPython = /python/i.test(promptNorm);
    const isJava = /java\b/i.test(promptNorm);
    const isSql = /sql|database|query|table/i.test(promptNorm);
    const isWeb = /html|css|javascript|web/i.test(promptNorm);

    // Filter meaningful technical keywords from prompt (exclude noise and English stop words)
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
      const cppMatches = CODE_PATTERNS.cpp.filter((p) => p.test(solutionText)).length;
      codeSignatureScore = cppMatches;
    } else if (isPython) {
      codeSignatureScore = CODE_PATTERNS.python.filter((p) => p.test(solutionText)).length;
    } else if (isJava) {
      codeSignatureScore = CODE_PATTERNS.java.filter((p) => p.test(solutionText)).length;
    } else if (isSql) {
      codeSignatureScore = CODE_PATTERNS.sql.filter((p) => p.test(solutionText)).length;
    } else if (isWeb) {
      codeSignatureScore = CODE_PATTERNS.web.filter((p) => p.test(solutionText)).length;
    } else if (isCodingPrompt) {
      // General code fallback
      const anyMatches = [
        ...CODE_PATTERNS.cpp,
        ...CODE_PATTERNS.python,
        ...CODE_PATTERNS.java,
      ].filter((p) => p.test(solutionText)).length;
      codeSignatureScore = anyMatches;
    }

    let qScore = 0;
    let status: QuestionAssessment['status'] = 'Missing';
    let feedback = '';

    // STRICT CODING TASK EVALUATION:
    if (isCodingPrompt) {
      if (codeSignatureScore === 0) {
        // Zero code found in a coding task!
        qScore = 0;
        status = 'Missing';
        if (isDominantlyAdministrative) {
          feedback = `Off-Topic Submission: Question requires programming code, but submitted document contains administrative course allocation/faculty workload text with 0 code constructs.`;
        } else {
          feedback = `No code or valid programming syntax detected. Missing essential constructs (e.g., #include, main(), variables, or logic statements).`;
        }
        improvements.push(`${q.number}: Provide complete, compilable source code with proper syntax and comments.`);
      } else if (codeSignatureScore >= 3 && (keywordRatio >= 0.4 || matchedKeywords >= 1)) {
        // Strong code implementation
        qScore = Number((marksPerQuestion * 0.95).toFixed(1));
        status = 'Full Marks';
        feedback = `Executable code structure found with appropriate language constructs and relevant logic.`;
        strengths.push(`${q.number}: Clean syntax and proper programming structure demonstrated.`);
      } else if (codeSignatureScore >= 1) {
        // Partial code
        qScore = Number((marksPerQuestion * 0.50).toFixed(1));
        status = 'Partial';
        feedback = `Partial code constructs detected, but lacks complete logic, required functions, or full solution.`;
        improvements.push(`${q.number}: Complete the algorithm and verify edge cases/output.`);
      } else {
        qScore = 0;
        status = 'Missing';
        feedback = `Incomplete or irrelevant code. Failed to meet the question requirements.`;
      }
    } else {
      // STRICT THEORETICAL TASK EVALUATION:
      if (isDominantlyAdministrative && keywordRatio < 0.25) {
        qScore = 0;
        status = 'Missing';
        feedback = `Off-topic administrative content detected. The text does not answer the technical question asked.`;
        improvements.push(`${q.number}: Address the specific topic rather than uploading unrelated institutional material.`);
      } else if (keywordRatio >= 0.60 && solWords.length >= 60) {
        qScore = Number((marksPerQuestion * 0.90).toFixed(1));
        status = 'Full Marks';
        feedback = `Comprehensive explanation covering core domain terminology (${coveredConcepts.join(', ')}).`;
        strengths.push(`${q.number}: In-depth conceptual clarity and thorough explanations.`);
      } else if (keywordRatio >= 0.35 && solWords.length >= 35) {
        qScore = Number((marksPerQuestion * 0.60).toFixed(1));
        status = 'Partial';
        feedback = `Basic conceptual understanding shown, but requires deeper elaboration and technical specifics.`;
        improvements.push(`${q.number}: Elaborate further on core principles and provide supporting examples.`);
      } else if (keywordRatio >= 0.15 && solWords.length >= 20) {
        qScore = Number((marksPerQuestion * 0.30).toFixed(1));
        status = 'Needs Improvement';
        feedback = `Superficial response with minimal technical coverage.`;
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
    questionPaperSample: questionText.slice(0, 350) + (questionText.length > 350 ? '...' : ''),
    solutionSample: solutionText.slice(0, 350) + (solutionText.length > 350 ? '...' : ''),
    questionBreakdown: breakdown,
    strengths: strengths.length > 0 ? strengths : ['No valid strengths identified: submitted document is off-topic or empty.'],
    areasForImprovement: improvements.length > 0 ? improvements : ['Review assignment guidelines and submit direct answers.'],
    instructorFeedbackDraft,
    aiEngineUsed: 'Academic Structural Evaluator',
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

    // 1. Extract Question Paper Text
    let questionText = questionTextOverride || '';
    if (!questionText && questionFile) {
      questionText = await extractDocumentText(questionFile);
    }
    if (!questionText && assignment?.description) {
      questionText = assignment.description;
    }

    // 2. Extract Student Solution Text
    let solutionText = solutionTextOverride || '';
    if (!solutionText && solutionFile) {
      solutionText = await extractDocumentText(solutionFile);
    }

    if (!solutionText || solutionText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Unable to extract text from the student solution file. Please ensure the student uploaded a valid PDF or Word document.',
      });
    }

    // 3. Optional: Call Google Gemini API if provided by user or environment
    const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
      try {
        const prompt = `You are a strict, fair, and meticulous Computer Science Professor at Govt. Graduate College Pasrur (GGC Pasrur).
Evaluate this student submission against the official assignment question paper.

ASSIGNMENT DETAILS:
Course: ${subjectCode} (${assignment?.title || 'Assignment'})
Total Marks: ${totalMarks}
Student: ${studentName} (Roll #${student?.rollNumber || 'N/A'}, Section ${student?.section || 'N/A'})

OFFICIAL QUESTION PAPER CONTENT:
"""
${questionText || assignment?.title || 'General Computer Science Assignment'}
"""

STUDENT SUBMITTED SOLUTION CONTENT:
"""
${solutionText}
"""

CRITICAL ACADEMIC INTEGRITY & GRADING RULES:
1. STRICT ZERO TOLERANCE FOR OFF-TOPIC / UNRELATED SUBMISSIONS:
   If the student submitted an off-topic file (such as a faculty course list, timetable, syllabus, random essay, or text unrelated to the questions), you MUST award 0 MARKS overall and 0 marks for every question. NEVER award courtesy or partial marks for off-topic content or mere document length!
2. PROGRAMMING QUESTIONS:
   If a question asks to write a program or code in C++ (or any other language), the student MUST provide actual code syntax (e.g. #include, main(), variables, logic, statements). If no code is present, award 0 marks for that question.
3. FAIR PARTIAL MARKS:
   Only award partial marks if the student genuinely attempted the specific question with relevant concepts or partial code.
4. DETAILED FEEDBACK:
   Provide constructive, honest critique explaining exactly why marks were awarded or deducted.

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": number (0 to ${totalMarks}),
  "questionBreakdown": [
    {
      "questionNumber": "Q1",
      "prompt": "brief question summary",
      "marksAwarded": number,
      "maxMarks": number,
      "status": "Full Marks" | "Partial" | "Needs Improvement" | "Missing",
      "feedback": "specific critique of student's answer",
      "keyConceptsCovered": ["concept1", "concept2"]
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "instructorFeedbackDraft": "comprehensive feedback ready for instructor to give to student"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
          }
        );

        if (geminiRes.ok) {
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
                questionBreakdown: parsed.questionBreakdown || [],
                strengths: parsed.strengths || [],
                areasForImprovement: parsed.areasForImprovement || [],
                instructorFeedbackDraft: parsed.instructorFeedbackDraft || '',
                aiEngineUsed: 'Gemini AI',
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
      solutionText,
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
