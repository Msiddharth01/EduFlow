export interface CleanQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pageReference: number | null;
  questionType: 'CONCEPTUAL' | 'APPLICATION' | 'ANALYTICAL' | 'SCENARIO' | 'KNOWLEDGE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

/**
 * Validate that a question meets all academic quality standards
 */
export function validateQuestionQuality(q: CleanQuestion, materialTitle: string): { valid: boolean; reason?: string } {
  if (!q.questionText || typeof q.questionText !== 'string') {
    return { valid: false, reason: 'Missing question text' };
  }

  const text = q.questionText.trim();
  if (text.length < 25) {
    return { valid: false, reason: 'Question text too short (< 25 chars)' };
  }

  // Must not have broken fragments or end with ellipsis
  if (text.endsWith('...') || text.endsWith('…') || text.endsWith('..')) {
    return { valid: false, reason: 'Question ends with broken ellipsis' };
  }

  // Must not begin with bullet points
  if (/^[●■•\-\*]/.test(text)) {
    return { valid: false, reason: 'Question starts with bullet symbol' };
  }

  // Must not mention page numbers or PDF extraction phrases
  const forbiddenPhrases = [
    /\bpage\s*\d+\b/i,
    /according to page/i,
    /on page/i,
    /regarding the content on/i,
    /as mentioned on page/i,
    /in the pdf/i,
    /extracted from/i,
    /lecture slides?\s*page/i,
    /source material page/i,
  ];

  for (const regex of forbiddenPhrases) {
    if (regex.test(text)) {
      return { valid: false, reason: `Contains forbidden citation phrase: ${regex}` };
    }
  }

  // Must have exactly 4 options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return { valid: false, reason: `Must have exactly 4 options (found ${q.options?.length})` };
  }

  // Options must be non-empty and reasonably sized
  for (let i = 0; i < 4; i++) {
    const opt = q.options[i];
    if (!opt || typeof opt !== 'string' || opt.trim().length < 2) {
      return { valid: false, reason: `Option ${i + 1} is empty or too short` };
    }
    // Check forbidden phrase in options too
    for (const regex of forbiddenPhrases) {
      if (regex.test(opt)) {
        return { valid: false, reason: `Option ${i + 1} contains page citation: ${regex}` };
      }
    }
  }

  // Options must be distinct
  const normalizedOpts = q.options.map(o => o.trim().toLowerCase());
  const uniqueOpts = new Set(normalizedOpts);
  if (uniqueOpts.size !== 4) {
    return { valid: false, reason: 'Options contain duplicate choices' };
  }

  // Correct index must be 0, 1, 2, or 3
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
    return { valid: false, reason: `Invalid correctIndex: ${q.correctIndex}` };
  }

  // Check that the question does not simply give away the answer
  const correctOpt = q.options[q.correctIndex].trim().toLowerCase();
  if (text.toLowerCase() === correctOpt) {
    return { valid: false, reason: 'Question text is identical to correct answer' };
  }

  return { valid: true };
}
