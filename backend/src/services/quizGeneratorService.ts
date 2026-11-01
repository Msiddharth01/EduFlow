import { prisma } from '../config/db.js';
import { checkOllamaStatus, queryOllama } from './ollamaService.js';
import { notifyEnrolledStudents } from './notificationService.js';
import { validateQuestionQuality } from './questionValidator.js';
import { NotificationType } from '@prisma/client';

export type QuestionType = 'CONCEPTUAL' | 'APPLICATION' | 'ANALYTICAL' | 'SCENARIO' | 'KNOWLEDGE';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pageReference: number | null;
  questionType?: QuestionType;
  difficulty?: DifficultyLevel;
}

interface ParsedConcept {
  term: string;
  definition: string;
  category: 'conceptual' | 'operational' | 'analytical' | 'knowledge' | 'scenario';
  page: number;
}

const BLACKLISTED_TERMS = new Set([
  'description', 'fr1', 'fr2', 'fr3', 'step', 'steps', 'step1', 'step2', 'step3', 'step4',
  'note', 'notes', 'figure', 'part', 'parts', 'participants', 'usually', 'things',
  'while there', 'while', 'there', 'if', 'and', 'the team', 'you make a list',
  'you size things up', 'you set some priorities', 'you start executing', 'the pilot',
  'in this case the user', 'nction a system provides an end user', 'ack if the customer \r\nrepresentative',
  'ack if the customer representative', 'credit', 'university', 'bennett', 'times',
  'www', 'com', 'http', 'https', 'page', 'slide', 'chapter', 'author', 'lecture',
  'table', 'chart', 'summary', 'overview', 'fama in cs', 'al', 'tu', 'thinks', 'fi',
  'single person', 'responsible for product', 'responsible for declaring', 'single'
]);

/**
 * Remove trailing dangling words to ensure complete, readable sentences
 */
function cleanSentenceEnding(text: string): string {
  let cleaned = text.replace(/^[●■•\-\*–—\s]+/, '').trim();
  // Strip trailing dangling prepositions and conjunctions
  const danglingRegex = /\s+(?:that|which|with|and|or|the|a|an|to|for|in|on|at|from|by|as|can be|is|are|of|so|its|their)$/i;
  while (danglingRegex.test(cleaned)) {
    cleaned = cleaned.replace(danglingRegex, '').trim();
  }
  // Strip trailing isolated punctuation
  cleaned = cleaned.replace(/[,;:\-–—]\s*$/, '').trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Clean lines, stripping bullets, URLs, page headers, and noise
 */
function cleanChunkLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.replace(/^[●■•\-\*–—\s]+/, '').trim())
    .filter((l) =>
      l.length >= 15 &&
      !l.match(/^[=\-_~*#\s]+$/) &&
      !l.match(/^[0-9\s.,;:]+$/) &&
      !l.match(/^https?:\/\//i) &&
      !l.match(/^www\./i) &&
      !l.toLowerCase().includes('times of india') &&
      !l.toLowerCase().includes('bennett university')
    );
}

/**
 * Extract clean, high-signal semantic concepts from material chunks
 * STRICT ISOLATION: Parses exclusively from the supplied material's chunks.
 */
export function extractConceptsFromMaterial(
  materialTitle: string,
  chunks: Array<{ chunkIndex: number; pageNumber: number; content: string }>
): ParsedConcept[] {
  const concepts: ParsedConcept[] = [];
  const seenTerms = new Set<string>();
  const cleanTitle = materialTitle.replace(/\.[^/.]+$/, '').trim();

  for (const chunk of chunks) {
    const page = chunk.pageNumber || 1;
    const text = chunk.content;

    // 1. Sentence-level definition parsing: "X is (a/an/the) Y that/which Z"
    const fullSentences = text
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.?!])\s+/);

    for (const sent of fullSentences) {
      const match = sent.match(/(?:what is\s+)?([A-Z][A-Za-z0-9_\s()\/]{2,35})\s+(?:is|refers to|is defined as|means|measures the)\s+(?:a|an|the)?\s*([^.?!;]{25,250})/i);
      if (match) {
        let term = match[1].replace(/^[●■•\-\*–—\s]+/, '').trim();
        let rawDef = match[2].trim();

        if (
          term.length >= 3 &&
          term.length <= 35 &&
          term.split(/\s+/).length <= 4 &&
          !BLACKLISTED_TERMS.has(term.toLowerCase()) &&
          !/^(?:if|when|where|then|also|correct|incorrect|true|false|yes|no|as|the array|the idea|the data|lists until|during|once|after|before|such|some|each|all|any)\b/i.test(term) &&
          !term.toLowerCase().startsWith('this') &&
          !term.toLowerCase().startsWith('it') &&
          !term.toLowerCase().startsWith('here') &&
          !term.toLowerCase().startsWith('what') &&
          !term.toLowerCase().startsWith('why') &&
          !term.toLowerCase().startsWith('how')
        ) {
          const cleanDef = cleanSentenceEnding(rawDef);
          if (cleanDef.length >= 25) {
            const key = term.toLowerCase();
            if (!seenTerms.has(key)) {
              seenTerms.add(key);
              concepts.push({
                term,
                definition: cleanDef,
                category: 'conceptual',
                page,
              });
            }
          }
        }
      }
    }

    // 2. Labeled items and operations: "push() - insert element", "ILF : Internal Logical Files"
    const lines = text.split(/\r?\n/).map((l) => l.replace(/^[●■•\-\*–—\s]+/, '').trim());
    for (const line of lines) {
      // Operation definition
      const opMatch = line.match(/^([A-Za-z0-9_()]{3,28})\s+[−\-–—:]\s*(.+)$/);
      if (opMatch) {
        const term = opMatch[1].trim();
        const rawDef = opMatch[2].trim();
        if (
          term.length >= 3 &&
          !BLACKLISTED_TERMS.has(term.toLowerCase()) &&
          !term.toLowerCase().startsWith('step') &&
          !term.toLowerCase().startsWith('figure') &&
          !term.toLowerCase().startsWith('note') &&
          !term.toLowerCase().startsWith('fr')
        ) {
          const cleanDef = cleanSentenceEnding(rawDef);
          if (cleanDef.length >= 18) {
            const key = term.toLowerCase();
            if (!seenTerms.has(key)) {
              seenTerms.add(key);
              concepts.push({
                term,
                definition: cleanDef,
                category: 'operational',
                page,
              });
            }
          }
        }
      }

      // Role responsibilities: "Product Owner is responsible for...", "Scrum Master is responsible for..."
      const respMatch = line.match(/([A-Z][A-Za-z\s]{3,30})\s+(?:is\s+)?responsible for\s+([^.?!;]{20,180})/i);
      if (respMatch) {
        const term = respMatch[1].trim();
        const rawDef = 'Responsible for ' + respMatch[2].trim();
        if (
          !BLACKLISTED_TERMS.has(term.toLowerCase()) &&
          !term.toLowerCase().startsWith('single') &&
          !term.toLowerCase().startsWith('the team')
        ) {
          const cleanDef = cleanSentenceEnding(rawDef);
          const key = term.toLowerCase();
          if (!seenTerms.has(key)) {
            seenTerms.add(key);
            concepts.push({
              term,
              definition: cleanDef,
              category: 'operational',
              page,
            });
          }
        }
      }

      // Key distinction: "Difference between X and Y"
      const diffMatch = line.match(/(?:difference between|comparison between)\s+([A-Za-z0-9\s]{3,25})\s+(?:and|&)\s+([A-Za-z0-9\s]{3,25})/i);
      if (diffMatch) {
        const termA = diffMatch[1].trim();
        const termB = diffMatch[2].trim();
        const rawDef = cleanSentenceEnding(line);
        if (rawDef.length >= 25) {
          const term = `${termA} vs ${termB}`;
          const key = term.toLowerCase();
          if (!seenTerms.has(key)) {
            seenTerms.add(key);
            concepts.push({
              term,
              definition: rawDef,
              category: 'analytical',
              page,
            });
          }
        }
      }
    }
  }

  return concepts;
}

/**
 * Generate diverse, academically rigorous MCQs grounded strictly in the material's extracted concepts
 */
export function buildAcademicQuestionsFromConcepts(
  materialTitle: string,
  concepts: ParsedConcept[],
  chunks: Array<{ chunkIndex: number; pageNumber: number; content: string }>,
  targetCount: number = 10
): GeneratedQuestion[] {
  const cleanTitle = materialTitle.replace(/\.[^/.]+$/, '').trim();
  const questions: GeneratedQuestion[] = [];

  // Filter out noisy terms
  const validConcepts = concepts.filter(
    (c) =>
      c.term.length >= 3 &&
      !BLACKLISTED_TERMS.has(c.term.toLowerCase()) &&
      c.definition.length >= 20
  );

  // Pool of distinct definitions from this material to serve as high-plausibility distractors
  const defPool = validConcepts.map((c) => c.definition);

  // Helper to get 3 unique distractors strictly from the same material
  const getDistractors = (correctDef: string, count: number = 3): string[] => {
    const distractors: string[] = [];
    const shuffled = [...defPool].filter((d) => d !== correctDef).sort(() => 0.5 - Math.random());

    for (const d of shuffled) {
      if (distractors.length < count && !distractors.includes(d)) {
        distractors.push(d);
      }
    }

    // Synthesize domain-aligned educational distractors if needed
    let counter = 1;
    while (distractors.length < count) {
      if (counter === 1) {
        distractors.push(`An alternate methodology that executes all operations in a single static batch without iterative verification.`);
      } else if (counter === 2) {
        distractors.push(`A secondary mechanism that modifies underlying structures without preserving established relative constraints.`);
      } else {
        distractors.push(`A centralized protocol restricted to external auxiliary memory buffers.`);
      }
      counter++;
    }

    return distractors.slice(0, count);
  };

  const typesDistribution: QuestionType[] = [
    'CONCEPTUAL',
    'APPLICATION',
    'ANALYTICAL',
    'KNOWLEDGE',
    'SCENARIO',
  ];

  const difficultyLevels: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

  // 1. Generate questions for each extracted concept
  for (let i = 0; i < validConcepts.length && questions.length < targetCount; i++) {
    const concept = validConcepts[i];
    const qType = typesDistribution[i % typesDistribution.length];
    const difficulty = difficultyLevels[i % difficultyLevels.length];

    let questionText = '';
    let correctOption = concept.definition;
    let explanation = '';

    if (qType === 'CONCEPTUAL') {
      questionText = `In the study of ${cleanTitle}, what is the foundational definition and primary role of ${concept.term}?`;
      explanation = `In ${cleanTitle}, ${concept.term} is defined as: "${concept.definition}". This accurately reflects the core academic principle.`;
    } else if (qType === 'APPLICATION') {
      questionText = `When implementing ${concept.term} in practice, which of the following best describes its operational behavior?`;
      explanation = `The operational function of ${concept.term} involves: ${concept.definition}.`;
    } else if (qType === 'ANALYTICAL') {
      questionText = `Which of the following statements provides the most accurate analysis of ${concept.term}?`;
      explanation = `Detailed analysis of ${cleanTitle} demonstrates that ${concept.term} functions as: ${concept.definition}.`;
    } else if (qType === 'SCENARIO') {
      questionText = `Consider a system or engineering workflow governed by ${cleanTitle}. How should ${concept.term} be addressed?`;
      explanation = `According to the principles of ${cleanTitle}, addressing ${concept.term} requires: ${concept.definition}.`;
    } else {
      // KNOWLEDGE
      questionText = `Which key principle or specification accurately corresponds to ${concept.term} in ${cleanTitle}?`;
      explanation = `Course material establishes that ${concept.term} corresponds to: "${concept.definition}".`;
    }

    // Assemble options and shuffle
    const distractors = getDistractors(correctOption, 3);
    const rawOptions = [correctOption, ...distractors];

    // Distribute correct index evenly across 0, 1, 2, 3
    const desiredIndex = questions.length % 4;
    const shuffledOptions = [...rawOptions];
    shuffledOptions.splice(0, 1); // Remove correct
    shuffledOptions.splice(desiredIndex, 0, correctOption); // Insert at desiredIndex

    const candidateQuestion: GeneratedQuestion = {
      questionText,
      options: shuffledOptions,
      correctIndex: desiredIndex,
      explanation,
      pageReference: concept.page,
      questionType: qType,
      difficulty,
    };

    const validation = validateQuestionQuality(candidateQuestion as any, cleanTitle);
    if (validation.valid) {
      questions.push(candidateQuestion);
    }
  }

  // 2. If additional questions are needed to reach targetCount, formulate from verified paragraph statements
  if (questions.length < targetCount && chunks.length > 0) {
    const step = Math.max(1, Math.floor(chunks.length / (targetCount - questions.length)));
    for (let cIdx = 0; cIdx < chunks.length && questions.length < targetCount; cIdx += step) {
      const chunk = chunks[cIdx];
      const lines = cleanChunkLines(chunk.content);
      const meaningfulLine = lines.find((l) => l.length >= 45 && l.length <= 150 && !l.endsWith(':') && !BLACKLISTED_TERMS.has(l.toLowerCase()));

      if (meaningfulLine) {
        const correctText = cleanSentenceEnding(meaningfulLine);
        const qType = typesDistribution[questions.length % typesDistribution.length];
        const difficulty = difficultyLevels[questions.length % difficultyLevels.length];

        const questionText = `Which of the following principles reflects a verified concept presented in ${cleanTitle}?`;
        const distractors = [
          `It mandates that all testing and integration occur exclusively in a single phase at the conclusion of the life cycle.`,
          `It strictly prohibits incremental customer feedback or mid-course adjustments.`,
          `It replaces data structures with unverified temporary file caches.`,
        ];

        const desiredIndex = questions.length % 4;
        const shuffledOptions = [...distractors];
        shuffledOptions.splice(desiredIndex, 0, correctText);

        const candidateQuestion: GeneratedQuestion = {
          questionText,
          options: shuffledOptions,
          correctIndex: desiredIndex,
          explanation: `The lecture material confirms: "${correctText}". The alternative options represent contradictory or unverified practices.`,
          pageReference: chunk.pageNumber || 1,
          questionType: qType,
          difficulty,
        };

        const validation = validateQuestionQuality(candidateQuestion as any, cleanTitle);
        if (validation.valid) {
          questions.push(candidateQuestion);
        }
      }
    }
  }

  return questions;
}

/**
 * Generate quiz questions for a material using Ollama AI or the Grounded Academic Synthesis Engine
 */
export async function generateQuestionsForMaterial(
  materialId: string,
  requestedCount: number = 10
): Promise<{ questions: GeneratedQuestion[]; materialTitle: string; courseId: string }> {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: { chunkIndex: true, pageNumber: true, content: true },
      },
    },
  });

  if (!material) {
    throw new Error('Material not found.');
  }

  if (material.status !== 'READY' || material.chunks.length === 0) {
    throw new Error('Material has not completed text extraction or contains no readable text.');
  }

  // Check if content is sufficient
  const totalWords = material.chunks.reduce((acc, c) => acc + c.content.split(/\s+/).length, 0);
  if (material.chunks.length < 1 || totalWords < 40) {
    throw new Error(
      `Insufficient readable content in material "${material.title}" to generate a reliable academic quiz. Please verify that the uploaded document contains readable lecture text.`
    );
  }

  const targetCount = Math.max(3, Math.min(requestedCount, 15));
  let questions: GeneratedQuestion[] = [];

  // 1. Try Ollama AI generation if available
  const ollamaStatus = await checkOllamaStatus();
  if (ollamaStatus.available) {
    console.log(`[QuizGenerator] Ollama is available. Generating questions with ${ollamaStatus.model}...`);
    try {
      const sampledChunks = material.chunks
        .slice(0, Math.min(12, material.chunks.length))
        .map((c) => c.content.slice(0, 500))
        .join('\n\n')
        .slice(0, 4500);

      const sysPrompt = `You are a university professor creating an exam for the course topic "${material.title}".
Based ONLY on the provided verified lecture excerpts, create exactly ${targetCount} high-quality academic multiple-choice questions.

CRITICAL RULES:
1. Every question must be a complete, grammatically sound sentence testing genuine understanding.
2. NEVER include phrases like "According to Page X", "On Page Y", or source references.
3. Avoid copying raw fragments or incomplete clauses.
4. Provide exactly 4 distinct, plausible options (one correct, three plausible distractors). Never use "All of the above" or "None of the above".
5. Include questionType ("CONCEPTUAL", "APPLICATION", "ANALYTICAL", "SCENARIO", or "KNOWLEDGE") and difficulty ("EASY", "MEDIUM", or "HARD").
6. Provide a concise explanation grounded in the text.
7. Return ONLY a valid JSON array of objects with keys: "questionText", "options" (array of exactly 4 strings), "correctIndex" (0-3), "explanation", "questionType", "difficulty". Do not include markdown codeblocks or preamble.`;

      const prompt = `Course Material Topic: "${material.title}"\n\nVerified Lecture Content:\n${sampledChunks}\n\nGenerate exactly ${targetCount} academic MCQs:`;

      const aiResponse = await queryOllama(prompt, sysPrompt);
      if (aiResponse) {
        const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const candidate: GeneratedQuestion = {
                questionText: String(item.questionText || '').trim(),
                options: Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [],
                correctIndex: Number(item.correctIndex),
                explanation: String(item.explanation || 'Verified by course lecture material.').trim(),
                pageReference: null,
                questionType: (['CONCEPTUAL', 'APPLICATION', 'ANALYTICAL', 'SCENARIO', 'KNOWLEDGE'].includes(item.questionType)
                  ? item.questionType
                  : 'CONCEPTUAL') as QuestionType,
                difficulty: (['EASY', 'MEDIUM', 'HARD'].includes(item.difficulty)
                  ? item.difficulty
                  : 'MEDIUM') as DifficultyLevel,
              };

              // Strict validation
              const validation = validateQuestionQuality(candidate as any, material.title);
              if (validation.valid && !questions.some((q) => q.questionText === candidate.questionText)) {
                questions.push(candidate);
              }
            }
          }
        }
      }
    } catch (ollamaErr: any) {
      console.warn('[QuizGenerator] Ollama query or parsing error, falling back to Academic Synthesis Engine:', ollamaErr.message);
    }
  }

  // 2. If Ollama was offline or returned insufficient questions, complete with Academic Synthesis Engine
  if (questions.length < targetCount) {
    console.log(`[QuizGenerator] Using Grounded Academic Synthesis Engine to generate questions for "${material.title}"...`);
    const concepts = extractConceptsFromMaterial(material.title, material.chunks);
    const synthesized = buildAcademicQuestionsFromConcepts(material.title, concepts, material.chunks, targetCount);

    for (const sq of synthesized) {
      if (!questions.some((q) => q.questionText === sq.questionText)) {
        questions.push(sq);
      }
      if (questions.length >= targetCount) break;
    }
  }

  if (questions.length === 0) {
    throw new Error(`Failed to generate any valid questions from material "${material.title}".`);
  }

  return {
    questions: questions.slice(0, targetCount),
    materialTitle: material.title,
    courseId: material.courseId,
  };
}

/**
 * Queue or execute quiz generation for a specific material
 * ENFORCES STRICT COURSE & MATERIAL ISOLATION
 */
export async function queueQuizGenerationForMaterial(
  courseId: string,
  materialId: string,
  questionCount: number = 10,
  force: boolean = false,
  targetQuizId?: string
): Promise<{ success: boolean; quizId: string; message: string }> {
  // 1. Verify material exists AND belongs strictly to this course
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, courseId: true, title: true, status: true },
  });

  if (!material) {
    throw new Error('Material not found.');
  }

  if (material.courseId !== courseId) {
    throw new Error(`Course isolation mismatch: Material "${material.title}" (${materialId}) belongs to course ${material.courseId}, not ${courseId}.`);
  }

  if (material.status !== 'READY') {
    throw new Error(`Material status is '${material.status}'. Quizzes can only be generated for materials in READY status.`);
  }

  // 2. Check if a quiz record already exists for this exact courseId and materialId
  const existing = targetQuizId
    ? await prisma.quiz.findUnique({
        where: { id: targetQuizId },
        include: { _count: { select: { questions: true } } },
      })
    : await prisma.quiz.findFirst({
        where: {
          courseId,
          materialId,
        },
        include: {
          _count: { select: { questions: true } },
        },
      });

  if (existing && existing.status === 'READY' && !force && existing._count.questions > 0) {
    console.log(`[QuizGenerator] Quiz already exists in READY state for material ${materialId} (Quiz ID: ${existing.id}).`);
    return {
      success: true,
      quizId: existing.id,
      message: 'Quiz already exists and is ready.',
    };
  }

  const quizTitle = `Practice Quiz: ${material.title}`;
  const quizTopic = material.title;

  let quizRecord: any = existing;

  if (!quizRecord) {
    quizRecord = await prisma.quiz.create({
      data: {
        courseId,
        materialId,
        title: quizTitle,
        topic: quizTopic,
        status: 'PROCESSING',
        errorMessage: null,
      },
    });
  } else {
    quizRecord = await prisma.quiz.update({
      where: { id: quizRecord.id },
      data: {
        courseId, // Ensure courseId is always matching
        materialId, // Ensure materialId is always matching
        status: 'PROCESSING',
        errorMessage: null,
      },
    });
  }

  console.log(`[QuizGenerator] Generating questions for Quiz ${quizRecord.id} (Course: ${courseId}, Material: ${material.title})...`);

  try {
    const { questions } = await generateQuestionsForMaterial(materialId, questionCount);

    // Delete previous questions
    await prisma.question.deleteMany({
      where: { quizId: quizRecord.id },
    });

    // Create validated questions with questionType & difficulty
    await prisma.question.createMany({
      data: questions.map((q) => ({
        quizId: quizRecord!.id,
        questionText: q.questionText,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        pageReference: q.pageReference,
        questionType: q.questionType || 'CONCEPTUAL',
        difficulty: q.difficulty || 'MEDIUM',
      })),
    });

    // Mark quiz READY
    await prisma.quiz.update({
      where: { id: quizRecord.id },
      data: {
        status: 'READY',
        errorMessage: null,
      },
    });

    console.log(`[QuizGenerator] Quiz ${quizRecord.id} generated successfully with ${questions.length} questions.`);

    // Dispatch notification to enrolled students
    notifyEnrolledStudents(courseId, {
      title: 'New Quiz Published',
      message: `A new quiz "${quizTitle}" is now available in your course.`,
      type: NotificationType.QUIZ_PUBLISHED,
      relatedResourceId: quizRecord.id,
      linkUrl: `/dashboard/courses/${courseId}`,
    }).catch((notifErr) => {
      console.error('[QuizGenerator] Error notifying students of generated quiz:', notifErr);
    });

    return {
      success: true,
      quizId: quizRecord.id,
      message: `Quiz generated successfully with ${questions.length} questions.`,
    };
  } catch (genErr: any) {
    console.error(`[QuizGenerator] Failed to generate quiz for material ${materialId}:`, genErr);
    await prisma.quiz.update({
      where: { id: quizRecord.id },
      data: {
        status: 'FAILED',
        errorMessage: genErr.message || 'Quiz generation failed.',
      },
    });

    return {
      success: false,
      quizId: quizRecord.id,
      message: genErr.message || 'Quiz generation failed.',
    };
  }
}

/**
 * Scan course materials and generate quizzes for all READY materials missing a quiz
 */
export async function generateMissingQuizzesForCourse(courseId: string): Promise<{
  processedCount: number;
  quizzes: any[];
}> {
  const materials = await prisma.material.findMany({
    where: {
      courseId,
      status: 'READY',
    },
    include: {
      quizzes: true,
      _count: { select: { chunks: true } },
    },
  });

  const generatedQuizzes: any[] = [];
  let processedCount = 0;

  for (const mat of materials) {
    const hasReadyQuiz = mat.quizzes.some((q) => q.status === 'READY');
    if (!hasReadyQuiz && mat._count.chunks > 0) {
      console.log(`[QuizGenerator] Material "${mat.title}" (${mat.id}) has no READY quiz. Initiating generation...`);
      const res = await queueQuizGenerationForMaterial(courseId, mat.id, 10, false);
      if (res.success) {
        processedCount++;
        const q = await prisma.quiz.findUnique({
          where: { id: res.quizId },
          include: { _count: { select: { questions: true } } },
        });
        if (q) generatedQuizzes.push(q);
      }
    }
  }

  return {
    processedCount,
    quizzes: generatedQuizzes,
  };
}
