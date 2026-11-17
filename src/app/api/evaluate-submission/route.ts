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

function parseQuestionsFromPaper(paperText: string): { number: string; prompt: string }[] {
  if (!paperText || paperText.trim().length === 0) {
    return [{ number: 'Task 1', prompt: 'Comprehensive Assignment Submission' }];
  }

  // Regex to detect "Question 1", "Q1.", "1)", "1.", "Problem 1", "Task 1"
  const regex = /(?:^|\n)\s*(?:(?:question|q|problem|task)\s*([0-9ivx]+)|([0-9ivx]+)[\.\)\:])[:\.\)]?\s*([^\n]+(?:\n(?!(?:question|q|problem|task|[0-9ivx]+[\.\)\:])).*)*)/gi;
  const questions: { number: string; prompt: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paperText)) !== null) {
    const num = match[1] || match[2] || `Q${questions.length + 1}`;
    const prompt = (match[3] || match[0]).trim();
    if (prompt.length > 5) {
      questions.push({
        number: `Q${num.replace(/[^0-9ivx]/gi, '') || questions.length + 1}`,
        prompt: prompt.slice(0, 200),
      });
    }
  }

  if (questions.length === 0) {
    // Fallback: split by double newlines or sentences
    const paragraphs = paperText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25);
    if (paragraphs.length > 0) {
      return paragraphs.slice(0, 5).map((p, idx) => ({
        number: `Q${idx + 1}`,
        prompt: p.slice(0, 160),
      }));
    }
    return [{ number: 'Q1', prompt: paperText.slice(0, 180) }];
  }

  return questions.slice(0, 10);
}

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
  const solWords = solNorm.split(/\s+/).filter((w) => w.length > 2);
  const solWordSet = new Set(solWords);

  let accumulatedScore = 0;
  const breakdown: QuestionAssessment[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];

  for (const q of parsedQuestions) {
    const promptNorm = q.prompt.toLowerCase();
    const promptWords = promptNorm
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['what', 'explain', 'write', 'define', 'with', 'using', 'that', 'from', 'have', 'this'].includes(w));

    // Match keywords from question in student solution
    let matchedKeywords = 0;
    const coveredConcepts: string[] = [];

    for (const pw of promptWords) {
      if (solWordSet.has(pw) || solNorm.includes(pw)) {
        matchedKeywords++;
        if (coveredConcepts.length < 3) coveredConcepts.push(pw);
      }
    }

    const keywordRatio = promptWords.length > 0 ? matchedKeywords / promptWords.length : 0.5;

    // Check code or technical syntax presence
    const hasCodeBlock = solNorm.includes('function') || solNorm.includes('class') || solNorm.includes('def ') || solNorm.includes('int ') || solNorm.includes('void ') || solNorm.includes('{') || solNorm.includes('import');
    const hasDetailedExplanation = solWords.length > 100;

    let qScore = 0;
    let status: QuestionAssessment['status'] = 'Missing';
    let feedback = '';

    if (keywordRatio >= 0.6 && (hasCodeBlock || hasDetailedExplanation)) {
      qScore = Number((marksPerQuestion * 0.95).toFixed(1));
      status = 'Full Marks';
      feedback = `Thorough response covering required concepts (${coveredConcepts.join(', ') || 'technical concepts'}) with sound logic.`;
      strengths.push(`${q.number}: Strong conceptual articulation and relevant terminology.`);
    } else if (keywordRatio >= 0.3) {
      qScore = Number((marksPerQuestion * 0.7).toFixed(1));
      status = 'Partial';
      feedback = `Adequate understanding demonstrated. Could be improved with deeper algorithmic explanation or code examples.`;
      improvements.push(`${q.number}: Add more detailed step-by-step reasoning or implementation code.`);
    } else if (solWords.length > 30) {
      qScore = Number((marksPerQuestion * 0.4).toFixed(1));
      status = 'Needs Improvement';
      feedback = `Superficial or brief response. Did not fully address key constraints of the question.`;
      improvements.push(`${q.number}: Elaborate on the core concepts asked in the question paper.`);
    } else {
      qScore = 0;
      status = 'Missing';
      feedback = `No substantive answer found corresponding to this question prompt.`;
      improvements.push(`${q.number}: Question was left unattempted or answered too briefly.`);
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
  else if (percentage >= 65) overallStatus = 'Good';
  else if (percentage >= 45) overallStatus = 'Needs Improvement';
  else overallStatus = 'Incomplete';

  const instructorFeedbackDraft = `Assignment evaluated for ${subjectCode}. Student ${studentName} scored ${finalScore}/${totalMarks} (${percentage}%). ${
    strengths.length > 0 ? 'Strengths: ' + strengths.slice(0, 2).join(' ') : ''
  } ${improvements.length > 0 ? 'Areas for improvement: ' + improvements.slice(0, 2).join(' ') : 'Good work overall.'}`;

  return {
    overallScore: finalScore,
    totalMarks,
    percentage,
    status: overallStatus,
    questionPaperSample: questionText.slice(0, 350) + (questionText.length > 350 ? '...' : ''),
    solutionSample: solutionText.slice(0, 350) + (solutionText.length > 350 ? '...' : ''),
    questionBreakdown: breakdown,
    strengths: strengths.length > 0 ? strengths : ['Submitted on time with formatted document structure.'],
    areasForImprovement: improvements.length > 0 ? improvements : ['Review edge cases and add in-depth code comments.'],
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

    // 3. Optional: Call Gemini API if an API key is provided
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are a strict, fair, and meticulous Computer Science Professor at Govt. Graduate College Pasrur.
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

Evaluate each question carefully based on correctness, technical depth, logic, and code accuracy.
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
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
                status: pct >= 85 ? 'Proficient' : pct >= 65 ? 'Good' : pct >= 45 ? 'Needs Improvement' : 'Incomplete',
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

    // 4. Grounded Academic Structural Evaluation
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
