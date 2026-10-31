import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { queryOllama, getOllamaEmbedding, checkOllamaStatus, OLLAMA_BASE_URL } from '../services/ollamaService.js';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'been', 'being', 'below', 'both', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'explain', 'few', 'for', 'from', 'further', 'give', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'pdf', 'document', 'file', 'material',
  'materials', 'notes', 'please', 'same', 'she', 'should', 'so', 'some', 'such', 'summary',
  'summarize', 'tell', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export async function askTutor(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { question, materialId } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Verify course access
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      console.warn(`[AITutor] Unauthorized query attempt by user ${req.user!.email} on course ${courseId}.`);
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

    console.log(`[AITutor] User ${req.user!.email} asked: "${question}" in course ${courseId}${materialId ? ` (material: ${materialId})` : ''}`);

    // Check if course has any materials
    const totalMaterials = await prisma.material.count({
      where: {
        courseId,
        ...(materialId ? { id: materialId } : {}),
      },
    });

    if (totalMaterials === 0) {
      console.warn(`[AITutor] No materials found for course ${courseId}.`);
      return res.json({
        answer: 'No materials have been uploaded to this course yet. Please ask your course professor to upload lecture notes or PDFs.',
        citations: [],
        ollamaActive: false,
      });
    }

    // Check total chunks available
    const totalChunks = await prisma.documentChunk.count({
      where: {
        material: {
          courseId,
          ...(materialId ? { id: materialId } : {}),
        },
      },
    });

    if (totalChunks === 0) {
      console.warn(`[AITutor] Materials exist but 0 document chunks are indexed for course ${courseId}.`);
      return res.json({
        answer: 'The uploaded course materials are still being processed or contain no extractable text. Please check the Materials tab.',
        citations: [],
        ollamaActive: false,
      });
    }

    // Extract tokens and meaningful keywords for retrieval and intent analysis
    const rawTokens = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const meaningfulKeywords = rawTokens.filter((token: string) => !STOP_WORDS.has(token) && token.length > 1);

    // 1. Try semantic pgvector search if embedding model is active
    let topPassages: Array<{
      materialTitle: string;
      fileName: string;
      pageNumber: number;
      content: string;
      score?: number;
    }> = [];

    const queryVec = await getOllamaEmbedding(question.trim());
    if (queryVec && Array.isArray(queryVec) && queryVec.length === 768) {
      try {
        const vecStr = `[${queryVec.join(',')}]`;
        const vectorResults: any[] = await prisma.$queryRawUnsafe(
          `SELECT c.id, c."pageNumber", c.content, m.title as "materialTitle", m."fileName"
           FROM "DocumentChunk" c
           JOIN "Material" m ON c."materialId" = m.id
           WHERE m."courseId" = $1 ${materialId ? 'AND m.id = $3' : ''}
             AND c.embedding IS NOT NULL
           ORDER BY c.embedding <=> $2::vector ASC
           LIMIT 4`,
          courseId,
          vecStr,
          ...(materialId ? [materialId] : [])
        );

        if (vectorResults && vectorResults.length > 0) {
          topPassages = vectorResults.map((r) => ({
            materialTitle: r.materialTitle,
            fileName: r.fileName,
            pageNumber: r.pageNumber,
            content: r.content,
          }));
          console.log(`[AITutor] pgvector semantic search retrieved ${topPassages.length} passages.`);
        }
      } catch (vecErr: any) {
        console.warn(`[AITutor] pgvector query error: ${vecErr.message}. Falling back to lexical retrieval.`);
      }
    }

    // 2. Lexical / Keyword retrieval fallback if vector returned no matches
    if (topPassages.length === 0) {
      const chunks = await prisma.documentChunk.findMany({
        where: {
          material: {
            courseId,
            ...(materialId ? { id: materialId } : {}),
          },
        },
        include: {
          material: {
            select: { id: true, title: true, fileName: true },
          },
        },
        orderBy: [
          { materialId: 'asc' },
          { chunkIndex: 'asc' },
        ],
        take: 60,
      });

      console.log(`[AITutor] Lexical query tokens: [${rawTokens.join(', ')}]. Filtered keywords: [${meaningfulKeywords.join(', ')}]`);

      let scoredPassages: Array<{
        materialTitle: string;
        fileName: string;
        pageNumber: number;
        content: string;
        score: number;
      }> = [];

      if (meaningfulKeywords.length > 0) {
        scoredPassages = chunks.map((chunk) => {
          const lower = chunk.content.toLowerCase();
          const titleLower = chunk.material.title.toLowerCase();
          let score = 0;

          meaningfulKeywords.forEach((term: string) => {
            // Count occurrences
            const regex = new RegExp(`\\b${term}`, 'gi');
            const matches = lower.match(regex);
            if (matches) {
              score += matches.length * 4;
            } else if (lower.includes(term)) {
              score += 2;
            }
            if (titleLower.includes(term)) {
              score += 3;
            }
          });

          return {
            materialTitle: chunk.material.title,
            fileName: chunk.material.fileName,
            pageNumber: chunk.pageNumber,
            content: chunk.content,
            score,
          };
        });

        scoredPassages.sort((a, b) => b.score - a.score);
        const topScored = scoredPassages.filter((s) => s.score > 0).slice(0, 3);

        if (topScored.length > 0) {
          topPassages = topScored;
          console.log(`[AITutor] Lexical search matched ${topPassages.length} passages (top score: ${topScored[0].score}).`);
        }
      }

      // If no keyword matches found, or question was an exploratory / overview query (e.g. "explain me this pdf")
      if (topPassages.length === 0) {
        console.log(`[AITutor] Overview or exploratory query. Returning primary introductory document chunks.`);
        const overviewChunks = chunks.slice(0, 3);
        topPassages = overviewChunks.map((c) => ({
          materialTitle: c.material.title,
          fileName: c.material.fileName,
          pageNumber: c.pageNumber,
          content: c.content,
          score: 1,
        }));
      }
    }

    // Prepare verified citations
    const citations = topPassages.map((p) => ({
      documentTitle: p.materialTitle,
      fileName: p.fileName,
      pageNumber: p.pageNumber,
      snippet: p.content.slice(0, 180) + '...',
    }));

    const contextText = topPassages
      .map((p) => `[Source: ${p.materialTitle}, Page ${p.pageNumber}]\n${p.content}`)
      .join('\n\n');

    // 3. Try Ollama LLM synthesis
    let aiAnswer: string | null = null;
    let isOllamaActive = false;

    if (contextText) {
      const systemPrompt = `You are a helpful college AI Tutor. Answer the student's question accurately using ONLY the provided course material passages. If the passage does not contain the answer, say so honestly. Always refer to relevant pages.`;
      const prompt = `Context Material:\n${contextText}\n\nStudent Question: ${question}`;
      try {
        aiAnswer = await queryOllama(prompt, systemPrompt);
        if (aiAnswer) {
          isOllamaActive = true;
          console.log(`[AITutor] Generated synthesis answer via Ollama model.`);
        }
      } catch (ollamaErr: any) {
        console.warn(`[AITutor] Ollama query failed: ${ollamaErr.message}`);
      }
    }

    // 4. Honest, authentic direct synthesis if Ollama is offline or not installed
    if (!aiAnswer) {
      if (topPassages.length > 0) {
        const isOverview = !meaningfulKeywords || meaningfulKeywords.length === 0;
        const headerTitle = isOverview
          ? `### Document Overview: ${topPassages[0].materialTitle}`
          : `### Verified Course Material Answer: "${question}"`;

        const sections = topPassages
          .map((p, idx) => `**Excerpt ${idx + 1} (${p.materialTitle} — Page ${p.pageNumber}):**\n> ${p.content.trim()}`)
          .join('\n\n');

        aiAnswer = `${headerTitle}\n\nHere are the verified passages retrieved from your uploaded course document (**${topPassages[0].fileName}**):\n\n${sections}\n\n*(Note: Retrieved directly from authentic course document chunks without AI hallucination. To enable conversational synthesis, launch \`ollama serve\`.)*`;
      } else {
        aiAnswer = `No specific matching passages found in the uploaded course materials for "${question}". Please verify that your professor has uploaded the corresponding lecture slides or PDF notes.`;
      }
    }

    res.json({
      answer: aiAnswer,
      citations,
      ollamaActive: isOllamaActive,
    });
  } catch (error: any) {
    console.error('[AITutor] Tutor error:', error);
    res.status(500).json({ error: 'Failed to process AI Tutor query.' });
  }
}

export async function generateSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const courseId = req.params.courseId as string;
    const { materialId, summaryType = 'detailed' } = req.body; // 'concise' | 'detailed' | 'revision-notes'

    // Verify access
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user!.id,
          courseId,
        },
      },
    });

    if (!enrollment && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not enrolled in this course.' });
    }

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: {
        chunks: {
          take: 10,
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    if (material.chunks.length === 0) {
      return res.status(400).json({ error: 'Material is not yet processed or has no text chunks.' });
    }

    const combinedText = material.chunks.map((c) => c.content).join('\n\n').slice(0, 4000);

    const typePrompts: Record<string, string> = {
      concise: 'Generate a high-level 3-5 bullet point executive summary.',
      detailed: 'Generate an in-depth structured breakdown with Key Topics, Explanations, and Takeaways.',
      'revision-notes': 'Generate quick-revision exam flash notes with definitions, key formulas/rules, and common pitfalls.',
    };

    const sysPrompt = `You are an academic summarizer for college students. ${typePrompts[summaryType] || typePrompts.detailed}`;
    const ollamaResponse = await queryOllama(`Document Title: ${material.title}\n\nContent:\n${combinedText}`, sysPrompt);

    let summary = ollamaResponse;
    if (!summary) {
      // Clean structured fallback from chunks
      summary = `### ${summaryType.toUpperCase()} SUMMARY: ${material.title}\n\n` +
        `**Overview:**\nThis document covers foundational course concepts extracted from **${material.fileName}**.\n\n` +
        `**Key Excerpts & Principles:**\n` +
        material.chunks.slice(0, 3).map((c, idx) => `* **Key Section ${idx + 1} (Page ${c.pageNumber}):** ${c.content.slice(0, 180)}...`).join('\n\n') +
        `\n\n*(Note: Generated via direct textbook chunk index while Ollama is offline)*`;
    }

    res.json({
      summary,
      materialTitle: material.title,
      summaryType,
    });
  } catch (error: any) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
}
