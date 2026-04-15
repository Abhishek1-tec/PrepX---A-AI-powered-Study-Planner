/**
 * AI evaluation: short-answer marking, quiz generation, topic tests, parent remarks.
 * Uses OpenRouter (OPENROUTER_API_KEY).
 */
import OpenAI from 'openai';

let openRouterClient = null;
function getOpenRouter() {
  if (!openRouterClient) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY not set');
    openRouterClient = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'PrepX',
      },
    });
  }
  return openRouterClient;
}

function openRouterModelName() {
  return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
}

async function generateCompletion(prompt, temperature) {
  const response = await getOpenRouter().chat.completions.create({
    model: openRouterModelName(),
    temperature,
    messages: [
      { role: 'system', content: 'You are a helpful academic assistant. Return clean, concise output.' },
      { role: 'user', content: prompt },
    ],
  });
  return response.choices?.[0]?.message?.content || '';
}

export function hasOpenRouter() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

const MARKING_PROMPT = `You are an exam evaluator. Score the following short answer.

Question: {{question}}
Expected keywords (must consider): {{keywords}}
Word count expected: {{wordCount}} words (approx).

Student's answer:
"{{answer}}"

Rules:
- 1 mark: 15-20 words, at least 70% keywords present
- 2 marks: 30-40 words, 100% keywords
- 3 marks: 50-60 words, at least 90% keywords
- 5 marks: 120-150 words, good structure and coverage

Max marks for this question: {{maxMarks}}
Return JSON only: { "marks": number, "feedback": "brief feedback string" }`;

export async function evaluateShortAnswer(question, expectedKeywords, wordCountMin, wordCountMax, studentAnswer, maxMarks) {
  if (!hasOpenRouter()) return { marks: 0, feedback: 'AI evaluation not configured.' };
  const wordCount = wordCountMin && wordCountMax ? `${wordCountMin}-${wordCountMax}` : 'as appropriate';
  const prompt = MARKING_PROMPT
    .replace('{{question}}', question)
    .replace('{{keywords}}', (expectedKeywords || []).join(', '))
    .replace('{{wordCount}}', wordCount)
    .replace('{{answer}}', (studentAnswer || '').slice(0, 2000))
    .replace('{{maxMarks}}', String(maxMarks || 5));
  try {
    const text = await generateCompletion(prompt, 0.2);
    const parsed = JSON.parse(text.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    const marks = Math.min(maxMarks || 5, Math.max(0, Number(parsed.marks) || 0));
    return { marks, feedback: parsed.feedback || '' };
  } catch (err) {
    console.error('AI evaluate error:', err);
    return { marks: 0, feedback: 'Evaluation failed.' };
  }
}

/**
 * Generate quiz questions from PYQ pattern (exam-style). Returns array of { question, options, correctIndex, maxMarks }.
 */
export async function generateQuizQuestions(subject, chapter, topic, difficulty, count = 5) {
  if (!hasOpenRouter()) return [];
  const prompt = `Generate ${count} multiple-choice questions for exam preparation.
Subject: ${subject}, Chapter: ${chapter}, Topic: ${topic}
Difficulty: ${difficulty}
Style: exam/PYQ pattern. Each with 4 options, one correct.
Return JSON array: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"maxMarks":1}]`;
  try {
    const text = await generateCompletion(prompt, 0.5);

    try {
      let cleaned = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']') + 1;

      if (start === -1 || end === -1) {
        throw new Error('Invalid JSON format from AI');
      }

      const jsonStr = cleaned.slice(start, end);

      const parsed = JSON.parse(jsonStr);

      return Array.isArray(parsed) ? parsed.slice(0, count) : [];

    } catch (parseError) {
      console.error('PARSE ERROR:', parseError);
      console.log('RAW AI RESPONSE:', text);
      return [];
    }
  } catch (err) {
    console.error('AI quiz gen error:', err);
    return [];
  }
}

/**
 * Topic completion test: exactly 10 questions total (8 MCQs + 2 short), exam-type aligned.
 * Pass threshold is enforced in routes (60% topic, 65% revision).
 */
export async function generateTopicTest(subject, topic, options = {}) {
  const purpose = options.purpose || 'Board';
  const isRevision = options.revision === true;
  if (!hasOpenRouter()) return { mcqs: [], shortAnswers: [] };
  const revisionHint = isRevision ? ' This is a weekly revision test: focus on recall and application.' : '';
  const prompt = `Generate a topic completion test for exam type: ${purpose}. Subject: ${subject}. Topic: ${topic}.${revisionHint}
Rules:
- Exactly 10 questions total: 8 multiple-choice (4 options each, exactly one isCorrect: true) + 2 short answers.
- MCQs: 1 mark each. Difficulty matches ${purpose} standard.
- Short answers: maxMarks 3 each, include expectedKeywords (3-6 keywords), wordCountMin 40, wordCountMax 80.
Return JSON only:
{ "mcqs": [ { "question": "...", "options": [{"text":"...","isCorrect":false}], "marks": 1 } ], "shortAnswers": [ { "question": "...", "maxMarks": 3, "expectedKeywords": ["k1"], "wordCountMin": 40, "wordCountMax": 80 } ] }
Use exactly 8 mcqs and 2 shortAnswers.`;
  try {
    const text = await generateCompletion(prompt, 0.4);
    const parsed = JSON.parse(text.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    const mcqs = Array.isArray(parsed.mcqs) ? parsed.mcqs.slice(0, 8) : [];
    const shortAnswers = Array.isArray(parsed.shortAnswers) ? parsed.shortAnswers.slice(0, 2) : [];
    return { mcqs, shortAnswers };
  } catch (err) {
    console.error('AI topic test gen error:', err);
    return { mcqs: [], shortAnswers: [] };
  }
}

/**
 * PYQ-style topic weight analysis for timetable (OpenRouter). Returns items for AITopicAnalysis.
 */
export async function generateTimetableTopicAnalysis(profile, syllabusNotes, pyqYearRangeLabel) {
  if (!hasOpenRouter()) return null;
  const subjects = (profile.subjects || []).join(', ');
  const excerpt = (syllabusNotes || '').trim().slice(0, 4000);
  const prompt = `You are an exam preparation analyst. Infer likely PYQ topic importance as if you analyzed ${pyqYearRangeLabel} of ${profile.purpose} exams.
Subjects: ${subjects}
Approximate days until exam: ${profile.daysRemaining}.
${excerpt ? `Optional syllabus / notes excerpt:\n${excerpt}\n` : ''}
For each subject, output 6–10 distinct, specific subtopics (not generic placeholders). Assign frequencyScore 0–100 (higher = more frequently asked). Map priority: high if score>=70, medium if score>=45, else low.

Return a JSON array ONLY, sorted by frequencyScore descending:
[{"subject":"string","topic":"string","frequencyScore":number,"priority":"high"|"medium"|"low"}, ...]`;
  try {
    const text = await generateCompletion(prompt, 0.35);
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']') + 1;
    if (start === -1 || end === 0) throw new Error('No JSON array in response');
    const parsed = JSON.parse(cleaned.slice(start, end));
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((row) => row && row.subject && row.topic && row.frequencyScore != null && !Number.isNaN(Number(row.frequencyScore)))
      .map((row) => {
        const score = Number(row.frequencyScore);
        const pr = String(row.priority || '').toLowerCase();
        return {
          subject: String(row.subject).trim(),
          topic: String(row.topic).trim(),
          frequencyScore: Math.max(0, Math.min(100, score)),
          priority: ['high', 'medium', 'low'].includes(pr) ? pr : priorityFromScore(score),
        };
      })
      .sort((a, b) => b.frequencyScore - a.frequencyScore);
  } catch (err) {
    console.error('AI timetable analysis error:', err);
    return null;
  }
}

function priorityFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

/**
 * Concise study notes for focus mode (cached per exam type + subject + topic).
 */
export async function generateFocusStudyNotes(subject, topic, purpose) {
  if (!hasOpenRouter()) return '';
  const prompt = `For exam type ${purpose}, subject "${subject}", topic "${topic}", write concise study notes for a student in focus mode.
Structure with short headings:
- How it works
- Why it matters
Use simple language, exam-focused, no fluff. Max ~250 words. Plain text only, no markdown code fences.`;
  try {
    const text = await generateCompletion(prompt, 0.45);
    return (text || '').trim();
  } catch (err) {
    console.error('AI focus notes error:', err);
    return '';
  }
}

/**
 * Full focus study pack: notes + Mermaid diagram + ASCII + video search query (same OpenRouter key).
 */
export async function generateFocusStudyAid(subject, topic, purpose) {
  if (!hasOpenRouter()) {
    return { notesText: '', mermaidDiagram: '', asciiDiagram: '', videoSearchQuery: '' };
  }
  const prompt = `For exam type "${purpose}", subject "${subject}", topic "${topic}", produce study aids for a focus session.

Return JSON only with this shape (no markdown fences):
{
  "notesText": "Plain text, max ~220 words. Use short headings: How it works / Why it matters. Exam-focused.",
  "mermaidDiagram": "A single valid Mermaid diagram: prefer flowchart TD or graph LR. Max 14 nodes, short English labels only, no HTML, no parentheses in node text.",
  "asciiDiagram": "Optional small ASCII diagram, max 18 lines; can be empty string.",
  "videoSearchQuery": "One short English phrase for YouTube search (conceptual explainer), no URLs."
}`;
  try {
    const text = await generateCompletion(prompt, 0.42);
    const parsed = JSON.parse(text.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    const notesText = String(parsed.notesText || '').trim().slice(0, 8000);
    let mermaidDiagram = String(parsed.mermaidDiagram || '').trim().replace(/^```mermaid\s*/i, '').replace(/```\s*$/i, '').slice(0, 4000);
    if (mermaidDiagram && !/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram)/i.test(mermaidDiagram)) {
      mermaidDiagram = `flowchart TD\n${mermaidDiagram}`;
    }
    const asciiDiagram = String(parsed.asciiDiagram || '').trim().slice(0, 2500);
    const videoSearchQuery = String(parsed.videoSearchQuery || '').trim().slice(0, 200);
    if (!notesText) {
      const fallback = await generateFocusStudyNotes(subject, topic, purpose);
      return { notesText: fallback, mermaidDiagram, asciiDiagram, videoSearchQuery };
    }
    return { notesText, mermaidDiagram, asciiDiagram, videoSearchQuery };
  } catch (err) {
    console.error('AI focus aid error:', err);
    const notesText = await generateFocusStudyNotes(subject, topic, purpose);
    return { notesText, mermaidDiagram: '', asciiDiagram: '', videoSearchQuery: '' };
  }
}

/**
 * Short actionable tips for analytics dashboard (OpenRouter).
 */
export async function generateAnalyticsInsights(snapshot) {
  if (!hasOpenRouter()) return [];
  try {
    const text = await generateCompletion(
      `You are a study coach. Given student analytics JSON, return JSON only: {"tips":["..."]} with exactly 4 concise bullet tips (max 18 words each), actionable and encouraging. No markdown.\n${JSON.stringify(snapshot).slice(0, 3500)}`,
      0.35
    );
    const parsed = JSON.parse(text.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
    return Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5).filter(Boolean) : [];
  } catch (err) {
    console.error('AI analytics tips error:', err);
    return [];
  }
}

/**
 * AI-generated remark for weekly parent email (summary of study hours, focus, weak subjects).
 */
export async function generateParentRemark(summary) {
  if (!hasOpenRouter()) return 'No AI summary available.';
  const prompt = `Summarize this student study report in 2-3 short, encouraging sentences for a parent. Be factual and supportive.\n${JSON.stringify(summary)}`;
  try {
    const text = await generateCompletion(prompt, 0.5);
    return text?.trim() || 'Summary not available.';
  } catch (err) {
    console.error('AI remark error:', err);
    return 'Summary could not be generated.';
  }
}
