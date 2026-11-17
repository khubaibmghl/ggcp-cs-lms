/**
 * Plagiarism Engine for GGC Pasrur CS LMS
 * Performs real mathematical n-gram shingle comparison and sentence-level
 * overlap analysis against peer student submissions and question papers.
 */

export interface PlagiarismMatchSnippet {
  studentSnippet: string;
  peerSnippet: string;
  peerRollNumber: number;
  peerStudentName: string;
  similarity: number;
}

export interface PlagiarismScanResult {
  peerPlagiarismScore: number;
  matchedWithRollNumber?: number;
  matchedWithName?: string;
  totalComparisons: number;
  matchingSnippets: PlagiarismMatchSnippet[];
  summary: string;
  riskLevel: 'clean' | 'moderate' | 'critical';
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!;:\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

function createWordShingles(text: string, shingleSize = 4): Set<string> {
  const words = normalizeText(text).split(' ').filter(Boolean);
  const shingles = new Set<string>();
  if (words.length < shingleSize) {
    if (words.length > 0) shingles.add(words.join(' '));
    return shingles;
  }
  for (let i = 0; i <= words.length - shingleSize; i++) {
    shingles.add(words.slice(i, i + shingleSize).join(' '));
  }
  return shingles;
}

export function computePeerPlagiarism(
  targetText: string,
  peers: { rollNumber: number; name: string; text: string }[],
  questionText?: string
): PlagiarismScanResult {
  if (!targetText || targetText.trim().length < 15) {
    return {
      peerPlagiarismScore: 0,
      totalComparisons: peers.length,
      matchingSnippets: [],
      summary: 'Insufficient text to perform a reliable comparison.',
      riskLevel: 'clean',
    };
  }

  if (peers.length === 0) {
    return {
      peerPlagiarismScore: 0,
      totalComparisons: 0,
      matchingSnippets: [],
      summary: 'This is currently the only submission in this class. No other classmate submissions exist yet to compare against.',
      riskLevel: 'clean',
    };
  }

  // Question shingles to exclude question prompts from peer plagiarism penalties
  const questionShingles = questionText ? createWordShingles(questionText, 4) : new Set<string>();

  const targetShingles = createWordShingles(targetText, 4);
  const cleanTargetShingles = new Set<string>();
  targetShingles.forEach((s) => {
    if (!questionShingles.has(s)) {
      cleanTargetShingles.add(s);
    }
  });

  if (cleanTargetShingles.size === 0) {
    return {
      peerPlagiarismScore: 0,
      totalComparisons: peers.length,
      matchingSnippets: [],
      summary: 'Student text matches question paper prompt only. No peer collision detected.',
      riskLevel: 'clean',
    };
  }

  const targetSentences = extractSentences(targetText);
  let highestScore = 0;
  let highestPeerRoll: number | undefined;
  let highestPeerName: string | undefined;
  const allMatchingSnippets: PlagiarismMatchSnippet[] = [];

  for (const peer of peers) {
    if (!peer.text || peer.text.trim().length < 15) continue;

    const peerShingles = createWordShingles(peer.text, 4);
    let matchCount = 0;

    cleanTargetShingles.forEach((shingle) => {
      if (peerShingles.has(shingle)) {
        matchCount++;
      }
    });

    const score = Math.round((matchCount / cleanTargetShingles.size) * 100);

    if (score > highestScore) {
      highestScore = score;
      highestPeerRoll = peer.rollNumber;
      highestPeerName = peer.name;
    }

    // Identify exact or near-exact matching sentences if score > 10%
    if (score >= 10) {
      const peerSentences = extractSentences(peer.text);
      for (const tSent of targetSentences) {
        const normT = normalizeText(tSent);
        for (const pSent of peerSentences) {
          const normP = normalizeText(pSent);
          if (normT.length > 30 && (normP.includes(normT) || normT.includes(normP))) {
            allMatchingSnippets.push({
              studentSnippet: tSent,
              peerSnippet: pSent,
              peerRollNumber: peer.rollNumber,
              peerStudentName: peer.name,
              similarity: 100,
            });
            break;
          }
        }
      }
    }
  }

  let riskLevel: 'clean' | 'moderate' | 'critical' = 'clean';
  let summary = `Original student work. No significant peer overlap detected across ${peers.length} classmate submissions.`;

  if (highestScore > 35) {
    riskLevel = 'critical';
    summary = `Critical overlap detected (${highestScore}%) matching peer Roll #${highestPeerRoll} (${highestPeerName}). Immediate faculty review recommended.`;
  } else if (highestScore > 15) {
    riskLevel = 'moderate';
    summary = `Moderate similarity (${highestScore}%) detected with peer Roll #${highestPeerRoll} (${highestPeerName}). Check if common templates or boilerplate were used.`;
  }

  return {
    peerPlagiarismScore: highestScore,
    matchedWithRollNumber: highestPeerRoll,
    matchedWithName: highestPeerName,
    totalComparisons: peers.length,
    matchingSnippets: allMatchingSnippets.slice(0, 5), // top 5 matching snippets
    summary,
    riskLevel,
  };
}
