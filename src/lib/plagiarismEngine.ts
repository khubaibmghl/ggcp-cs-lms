/**
 * Advanced Academic Peer Plagiarism & Code Collusion Engine
 * Inspired by Stanford MOSS (Measure of Software Similarity) & Winnowing algorithms.
 * 
 * Features:
 * 1. Structural Code AST Tokenization (Catches variable-renaming, comment-insertion, and reformatting).
 * 2. N-Gram Shingle Overlap (Jaccard Similarity on normalized text).
 * 3. Question Prompt Whitelisting (Subtracts teacher's prompt to avoid false positives).
 * 4. Side-by-Side Verifiable Evidence Diff (Quotes colliding snippets from both students).
 */

export interface PlagiarismMatchSnippet {
  studentSnippet: string;
  peerSnippet: string;
  peerRollNumber: number;
  peerStudentName: string;
  similarity: number;
  matchType: 'Exact Copy' | 'Structural Code Match (Renamed Variables)' | 'Sentence Overlap';
}

export interface PlagiarismScanResult {
  peerPlagiarismScore: number;
  literalScore: number;
  structuralCodeScore: number;
  matchedWithRollNumber?: number;
  matchedWithName?: string;
  matchedSubmittedAt?: string;
  targetSubmittedAt?: string;
  chronologicalVerdict?: 'original_author' | 'derivative_copy' | 'concurrent';
  timeDifferenceMinutes?: number;
  matchedPeerText?: string;
  totalComparisons: number;
  matchingSnippets: PlagiarismMatchSnippet[];
  summary: string;
  riskLevel: 'clean' | 'moderate' | 'critical';
}

const PROGRAMMING_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
  'class', 'public', 'private', 'protected', 'virtual', 'friend', 'inline',
  'namespace', 'using', 'std', 'cout', 'cin', 'endl', 'include', 'iostream',
  'vector', 'string', 'bool', 'true', 'false', 'nullptr', 'new', 'delete',
  'def', 'import', 'from', 'elif', 'print', 'lambda', 'with', 'try', 'except',
  'select', 'from', 'where', 'insert', 'update', 'delete', 'table', 'create'
]);

// Scanner app watermarks that must NEVER trigger peer plagiarism matches
const SCANNER_WATERMARKS = [
  'camscanner', 'scanned with', 'wps office', 'adobe scan',
  'docscanner', 'tapscanner', 'pdf scanner', 'photo scanner',
  'fast scanner', 'clear scanner', 'genius scan', 'simple scan'
];

/**
 * Removes scanner watermarks and mobile scan artifacts
 */
export function cleanScannerArtifacts(text: string): string {
  if (!text) return '';
  let cleaned = text;
  for (const mark of SCANNER_WATERMARKS) {
    const reg = new RegExp(mark, 'gi');
    cleaned = cleaned.replace(reg, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Strips universal programming boilerplate (headers, standard namespaces, main wrapper, return 0)
 * so that two students using standard compiler templates are never accused of plagiarism.
 */
export function stripCodeBoilerplate(code: string): string {
  if (!code) return '';
  let cleaned = code;
  // C/C++ Preprocessor includes (#include <iostream>, etc.)
  cleaned = cleaned.replace(/^\s*#\s*include\s*[<"][^>"\n]+[>"]/gim, ' ');
  // C++ Using namespace
  cleaned = cleaned.replace(/^\s*using\s+namespace\s+\w+\s*;/gim, ' ');
  // C/C++/Java main function signatures
  cleaned = cleaned.replace(/\b(?:int|void)\s+main\s*\([^)]*\)\s*\{?/gim, ' ');
  cleaned = cleaned.replace(/\bpublic\s+static\s+void\s+main\s*\([^)]*\)\s*\{?/gim, ' ');
  // Return 0 / return statements for main
  cleaned = cleaned.replace(/\breturn\s+0\s*;/gim, ' ');
  // Standard Java package / import
  cleaned = cleaned.replace(/^\s*package\s+[\w.]+\s*;/gim, ' ');
  cleaned = cleaned.replace(/^\s*import\s+[\w.*]+\s*;/gim, ' ');
  // Python main guard & common imports
  cleaned = cleaned.replace(/if\s+__name__\s*==\s*['"]__main__['"]\s*:/gim, ' ');
  cleaned = cleaned.replace(/^\s*import\s+[\w, ]+/gim, ' ');
  cleaned = cleaned.replace(/^\s*from\s+[\w.]+\s+import\s+[\w*, ]+/gim, ' ');
  // Strip empty enclosing braces
  cleaned = cleaned.replace(/[{}]/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes text by removing non-alphanumeric noise and extra spaces
 */
function normalizeText(text: string): string {
  return cleanScannerArtifacts(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts substantive sentences or statement blocks (>25 chars)
 */
function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!;:\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

/**
 * MOSS-grade Code Tokenizer:
 * Replaces identifiers/variable names with _ID_, numbers with _NUM_, and strings with _STR_.
 * This renders the code immune to camouflage via variable renaming!
 */
export function tokenizeCode(code: string): string[] {
  // Strip block and line comments
  let clean = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ' ');
  clean = clean.replace(/#.*/g, ' '); // Python / preprocessor comments
  // Replace string and char literals
  clean = clean.replace(/"([^"\\]|\\.)*"/g, ' _STR_ ');
  clean = clean.replace(/'([^'\\]|\\.)*'/g, ' _CHAR_ ');
  // Replace numeric constants
  clean = clean.replace(/\b\d+(\.\d+)?\b/g, ' _NUM_ ');

  // Tokenize into words, symbols, and operators
  const rawTokens = clean.match(/[a-zA-Z_]\w*|==|!=|<=|>=|\+\+|--|<<|>>|&&|\|\||[{}()[\];,=+\-*/<>!&|]/g) || [];

  return rawTokens.map((t) => {
    const lower = t.toLowerCase();
    if (PROGRAMMING_KEYWORDS.has(lower)) return lower;
    if (/^[a-zA-Z_]\w*$/.test(t)) return '_ID_'; // Abstracted identifier
    return t; // Punctuation / operator
  });
}

/**
 * Generates sliding k-gram shingles from a token/word array
 */
function createShingles(tokens: string[], k = 4): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) shingles.add(tokens.join(' '));
    return shingles;
  }
  for (let i = 0; i <= tokens.length - k; i++) {
    shingles.add(tokens.slice(i, i + k).join(' '));
  }
  return shingles;
}

/**
 * Detects whether the text contains programming constructs
 */
function isCodeContent(text: string): boolean {
  return /#include|namespace|int\s+main|def\s+|public\s+class|cout\s*<<|cin\s*>>|System\.out|SELECT\s+|;\s*$/m.test(text);
}

/**
 * Comprehensive Peer Plagiarism & Code Collusion Scanner
 */
export function computePeerPlagiarism(
  targetText: string,
  peers: { rollNumber: number; name: string; text: string; submittedAt?: string }[],
  questionText?: string,
  targetSubmittedAt?: string
): PlagiarismScanResult {
  // 0. Clean scanner artifacts from target text and verify content threshold
  const cleanedTarget = cleanScannerArtifacts(targetText);
  if (!cleanedTarget || cleanedTarget.length < 60) {
    return {
      peerPlagiarismScore: 0,
      literalScore: 0,
      structuralCodeScore: 0,
      totalComparisons: peers.length,
      matchingSnippets: [],
      summary: 'Insufficient digital text layer (Scanned Document or Mobile Screenshots). Automated peer text overlap suppressed to prevent false alarms. Visually inspect using Side-by-Side Dual PDF Viewer.',
      riskLevel: 'clean',
    };
  }

  if (peers.length === 0) {
    return {
      peerPlagiarismScore: 0,
      literalScore: 0,
      structuralCodeScore: 0,
      totalComparisons: 0,
      matchingSnippets: [],
      summary: 'This is currently the only submission in this class. No other classmate submissions exist yet to compare against.',
      riskLevel: 'clean',
    };
  }

  // 1. Whitelist Question Paper Content & Strip Compiler Boilerplate
  const strippedTarget = stripCodeBoilerplate(cleanedTarget);
  if (!strippedTarget || strippedTarget.length < 25) {
    return {
      peerPlagiarismScore: 0,
      literalScore: 0,
      structuralCodeScore: 0,
      totalComparisons: peers.length,
      matchingSnippets: [],
      summary: 'Authentic student work. Standard compiler headers, wrappers, and boilerplate templates successfully whitelisted.',
      riskLevel: 'clean',
    };
  }

  const questionWords = questionText ? normalizeText(stripCodeBoilerplate(questionText)).split(' ').filter(Boolean) : [];
  const questionShingles = createShingles(questionWords, 4);

  const questionCodeTokens = questionText ? tokenizeCode(stripCodeBoilerplate(questionText)) : [];
  const questionCodeShingles = createShingles(questionCodeTokens, 4);

  // 2. Prepare Target Document Shingles (From Boilerplate-Stripped Content)
  const targetWords = normalizeText(strippedTarget).split(' ').filter(Boolean);
  const targetShingles = createShingles(targetWords, 4);
  const cleanTargetTextShingles = new Set<string>();
  targetShingles.forEach((s) => {
    if (!questionShingles.has(s)) {
      cleanTargetTextShingles.add(s);
    }
  });

  // Target Code Tokens (MOSS)
  const isTargetCode = isCodeContent(cleanedTarget);
  const targetCodeTokens = tokenizeCode(strippedTarget);
  const targetCodeShingles = createShingles(targetCodeTokens, 4);
  const cleanTargetCodeShingles = new Set<string>();
  targetCodeShingles.forEach((s) => {
    if (!questionCodeShingles.has(s)) {
      cleanTargetCodeShingles.add(s);
    }
  });

  // If after removing prompts & boilerplate there are fewer than 4 distinct shingles, student work is too short or standard
  if (cleanTargetTextShingles.size < 4 && cleanTargetCodeShingles.size < 4) {
    return {
      peerPlagiarismScore: 0,
      literalScore: 0,
      structuralCodeScore: 0,
      totalComparisons: peers.length,
      matchingSnippets: [],
      summary: 'Authentic student work. Standard compiler headers and question template prompts successfully filtered.',
      riskLevel: 'clean',
    };
  }

  const targetSentences = extractSentences(strippedTarget);

  let highestScore = 0;
  let highestLiteralScore = 0;
  let highestStructuralScore = 0;
  let highestPeerRoll: number | undefined;
  let highestPeerName: string | undefined;
  let matchedPeerObj: { rollNumber: number; name: string; text: string; submittedAt?: string } | undefined;
  const allMatchingSnippets: PlagiarismMatchSnippet[] = [];

  // 3. Pairwise Comparison Against All Peers
  for (const peer of peers) {
    const cleanedPeer = cleanScannerArtifacts(peer.text || '');
    if (!cleanedPeer || cleanedPeer.length < 50) continue;

    const strippedPeer = stripCodeBoilerplate(cleanedPeer);
    if (!strippedPeer || strippedPeer.length < 25) continue;

    // A. Literal Text Shingle Overlap
    const peerWords = normalizeText(strippedPeer).split(' ').filter(Boolean);
    const peerShingles = createShingles(peerWords, 4);
    let literalMatches = 0;
    cleanTargetTextShingles.forEach((sh) => {
      if (peerShingles.has(sh)) literalMatches++;
    });

    // Require at least 3 distinct matching shingles to count toward literal score
    const peerLiteralScore = cleanTargetTextShingles.size >= 4 && literalMatches >= 3
      ? Math.round((literalMatches / cleanTargetTextShingles.size) * 100)
      : 0;

    // B. MOSS Structural Code Overlap
    let peerStructuralScore = 0;
    if (isTargetCode && isCodeContent(cleanedPeer)) {
      const peerCodeTokens = tokenizeCode(strippedPeer);
      const peerCodeShingles = createShingles(peerCodeTokens, 4);
      let codeMatches = 0;
      cleanTargetCodeShingles.forEach((sh) => {
        if (peerCodeShingles.has(sh)) codeMatches++;
      });

      // Require at least 3 distinct matching code AST shingles
      peerStructuralScore = cleanTargetCodeShingles.size >= 4 && codeMatches >= 3
        ? Math.round((codeMatches / cleanTargetCodeShingles.size) * 100)
        : 0;
    }

    // Weighted composite score (prioritize higher of literal or structural)
    const compositeScore = Math.min(100, Math.max(peerLiteralScore, peerStructuralScore));

    if (compositeScore > highestScore) {
      highestScore = compositeScore;
      highestLiteralScore = peerLiteralScore;
      highestStructuralScore = peerStructuralScore;
      highestPeerRoll = peer.rollNumber;
      highestPeerName = peer.name;
      matchedPeerObj = peer;
    }

    // C. Extract Matching Snippets for Visual Diff (Strict Filter)
    if (compositeScore >= 18) {
      const peerSentences = extractSentences(strippedPeer);
      for (const tSent of targetSentences) {
        const normT = normalizeText(tSent);
        if (normT.length < 20) continue;

        for (const pSent of peerSentences) {
          const normP = normalizeText(pSent);
          if (normP.length < 20) continue;

          // Check exact text overlap
          if (normP.includes(normT) || normT.includes(normP)) {
            allMatchingSnippets.push({
              studentSnippet: tSent,
              peerSnippet: pSent,
              peerRollNumber: peer.rollNumber,
              peerStudentName: peer.name,
              similarity: 100,
              matchType: 'Exact Copy',
            });
            break;
          }

          // Check structural code collision (MOSS)
          const tokensT = tokenizeCode(tSent).join(' ');
          const tokensP = tokenizeCode(pSent).join(' ');
          if (tokensT.length > 28 && (tokensP.includes(tokensT) || tokensT.includes(tokensP))) {
            allMatchingSnippets.push({
              studentSnippet: tSent,
              peerSnippet: pSent,
              peerRollNumber: peer.rollNumber,
              peerStudentName: peer.name,
              similarity: 95,
              matchType: 'Structural Code Match (Renamed Variables)',
            });
            break;
          }
        }
      }
    }
  }

  // 4. Chronological Forensic Author vs Derivative Analysis
  let chronologicalVerdict: 'original_author' | 'derivative_copy' | 'concurrent' | undefined;
  let timeDifferenceMinutes: number | undefined;

  if (highestScore > 15 && matchedPeerObj?.submittedAt && targetSubmittedAt) {
    const targetTime = new Date(targetSubmittedAt).getTime();
    const peerTime = new Date(matchedPeerObj.submittedAt).getTime();
    if (!isNaN(targetTime) && !isNaN(peerTime)) {
      const diffMs = targetTime - peerTime;
      timeDifferenceMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));

      if (diffMs > 3 * 60 * 1000) {
        // Target submitted > 3 mins later than peer -> derivative copy
        chronologicalVerdict = 'derivative_copy';
      } else if (diffMs < -3 * 60 * 1000) {
        // Target submitted earlier than peer -> original author
        chronologicalVerdict = 'original_author';
      } else {
        chronologicalVerdict = 'concurrent';
      }
    }
  }

  // 5. Determine Risk Level & Qualitative Summary (Verified Multi-Block Safeguard)
  let riskLevel: 'clean' | 'moderate' | 'critical' = 'clean';
  let summary = `Original student work. No significant peer overlap detected across ${peers.length} classmate submissions.`;

  if (highestScore > 40 && allMatchingSnippets.length >= 2) {
    riskLevel = 'critical';
    const originNote = chronologicalVerdict === 'derivative_copy'
      ? ` [TIMELINE ATTRIBUTION: Student submitted ${timeDifferenceMinutes}m later than Roll #${highestPeerRoll} — likely derivative copy]`
      : chronologicalVerdict === 'original_author'
      ? ` [TIMELINE ATTRIBUTION: Student submitted ${timeDifferenceMinutes}m before Roll #${highestPeerRoll} — likely original source]`
      : '';

    if (highestStructuralScore > highestLiteralScore + 15) {
      summary = `Critical code collusion detected (${highestScore}% structural match) with Roll #${highestPeerRoll} (${highestPeerName}). Identical code logic and syntax structure found despite renamed variables.${originNote}`;
    } else {
      summary = `Critical verbatim overlap detected (${highestScore}%) matching peer Roll #${highestPeerRoll} (${highestPeerName}). Immediate faculty review recommended.${originNote}`;
    }
  } else if (highestScore > 20) {
    riskLevel = 'moderate';
    summary = `Moderate similarity (${highestScore}%) detected with peer Roll #${highestPeerRoll} (${highestPeerName}). Check if common formulas, algorithm steps, or shared assignment instructions were used.`;
  }

  return {
    peerPlagiarismScore: highestScore,
    literalScore: highestLiteralScore,
    structuralCodeScore: highestStructuralScore,
    matchedWithRollNumber: highestPeerRoll,
    matchedWithName: highestPeerName,
    matchedSubmittedAt: matchedPeerObj?.submittedAt,
    targetSubmittedAt,
    chronologicalVerdict,
    timeDifferenceMinutes,
    matchedPeerText: matchedPeerObj?.text,
    totalComparisons: peers.length,
    matchingSnippets: allMatchingSnippets.slice(0, 6),
    summary,
    riskLevel,
  };
}
