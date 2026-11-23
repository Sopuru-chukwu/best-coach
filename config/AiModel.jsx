import Constants from 'expo-constants';
import { auth } from './firebaseConfig';
import {
  buildChapterLessonPrompt,
  buildCoachLessonContext,
  buildSyllabusPrompt,
} from '../constant/Prompts';
import {
  extractCourses,
  normalizeDiagnosticQuestion,
  normalizeFeynmanGrade,
  normalizeFlashcard,
  normalizeLessonSection,
  normalizeList,
  normalizeQuizQuestion,
  pickArray,
} from './aiValidation';

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FAST_MODEL_ORDER = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const DEEP_MODEL_ORDER = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const COACH_SYSTEM_INSTRUCTION =
  'You are Best Coach, a world-class personal tutor who teaches from first principles. ' +
  'You build intuition with concrete analogies before jargon, explain WHY concepts work rather than just definitions, ' +
  'walk through real worked examples step by step, anticipate common misconceptions, and adapt depth to the learner level. ' +
  'Be clear, structured, encouraging, and accurate.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getGeminiApiKey() {
  const candidates = [
    process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    Constants.expoConfig?.extra?.geminiApiKey,
    Constants.manifest?.extra?.geminiApiKey,
  ];

  for (const key of candidates) {
    if (typeof key === 'string') {
      const trimmed = key.trim();
      if (trimmed && !trimmed.startsWith('@') && trimmed !== 'your_gemini_api_key_here') {
        return trimmed;
      }
    }
  }

  return '';
}

export function getAiProxyUrl() {
  const candidates = [
    process.env.EXPO_PUBLIC_AI_PROXY_URL,
    Constants.expoConfig?.extra?.aiProxyUrl,
    Constants.manifest?.extra?.aiProxyUrl,
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
      return url.trim();
    }
  }
  return '';
}

export function isAiConfigured() {
  return Boolean(getAiProxyUrl() || getGeminiApiKey());
}

export function getGeminiModel() {
  return (
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() ||
    Constants.expoConfig?.extra?.geminiModel?.trim() ||
    DEFAULT_GEMINI_MODEL
  );
}

function getModelFallbackOrder(preferredOrder = FAST_MODEL_ORDER) {
  const configured = getGeminiModel();
  return [...new Set([configured, ...preferredOrder])];
}

export function extractJsonText(rawText) {
  if (typeof rawText !== 'string') return '';
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function getThinkingConfig(model, depth = 'fast') {
  if (model.includes('lite')) {
    return { thinkingLevel: depth === 'deep' ? 'LOW' : 'MINIMAL' };
  }
  return { thinkingLevel: 'LOW' };
}

const TOPIC_FEW_SHOT_HISTORY = [
  {
    role: 'user',
    parts: [
      {
        text: 'Topic request: Learn Python\nLearner level: Beginner\nPreferred teaching style: Hands-on & Examples\nGenerate 5-7 sharp, well-scoped subtopics or modules tailored to this learner level and style.\nOutput ONLY a JSON array of strings, with no extra text.',
      },
    ],
  },
  {
    role: 'model',
    parts: [
      {
        text: JSON.stringify([
          'Python Fundamentals: Variables, Types & Control Flow',
          'Functions, Scope & Reusable Modules',
          'Working with Lists, Dictionaries & Sets',
          'File Handling, Errors & Debugging',
          'Object-Oriented Programming in Practice',
          'Building Real Automation Scripts with Python',
        ]),
      },
    ],
  },
];

async function requestModel({
  model,
  apiKey,
  proxyUrl,
  prompt,
  contents,
  systemInstruction,
  maxOutputTokens,
  timeoutMs,
  jsonMode = true,
  depth = 'fast',
  temperature = 0.7,
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const generationConfig = {
    temperature,
    topP: 0.95,
    topK: 40,
    maxOutputTokens,
    thinkingConfig: getThinkingConfig(model, depth),
  };

  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body = {
    contents,
    generationConfig,
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const useProxy = Boolean(proxyUrl);
  const url = useProxy
    ? proxyUrl
    : `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;

  const headers = { 'Content-Type': 'application/json' };
  if (useProxy) {
    const idToken = await auth.currentUser?.getIdToken?.().catch(() => '');
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
  } else {
    headers['x-goog-api-key'] = apiKey;
  }

  const requestBody = useProxy ? { model, ...body } : body;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
  } catch (fetchErr) {
    const wasAborted =
      controller.signal.aborted ||
      fetchErr?.name === 'AbortError' ||
      /canceled|cancelled|aborted/i.test(fetchErr?.message || '');

    if (wasAborted) {
      const timeoutErr = new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s.`
      );
      timeoutErr.retryable = true;
      throw timeoutErr;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message || `Gemini API request failed with status ${response.status}.`;
    const err = new Error(apiMessage);
    err.status = response.status;
    err.retryable =
      RETRYABLE_STATUS_CODES.has(response.status) ||
      /high demand|overloaded|temporarily unavailable|try again/i.test(apiMessage);
    throw err;
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text ?? '')
      .join('')
      .trim() || '';

  if (!text) {
    const blockReason = payload?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the request (${blockReason}).`
        : 'Gemini returned an empty response.'
    );
  }

  return text;
}

async function callGemini({
  prompt,
  history = [],
  attachments = [],
  contentsOverride = null,
  systemInstruction = COACH_SYSTEM_INSTRUCTION,
  maxOutputTokens = 4096,
  timeoutMs = 25000,
  jsonMode = true,
  depth = 'fast',
  temperature = 0.7,
  preferredModels = FAST_MODEL_ORDER,
}) {
  const proxyUrl = getAiProxyUrl();
  const apiKey = getGeminiApiKey();
  if (!proxyUrl && !apiKey) {
    throw new Error(
      'AI is not configured. Set EXPO_PUBLIC_AI_PROXY_URL or EXPO_PUBLIC_GEMINI_API_KEY in .env and restart Expo.'
    );
  }

  const attachmentParts = (attachments || [])
    .filter((att) => att?.mimeType && att?.data)
    .map((att) => ({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data,
      },
    }));

  const contents = contentsOverride || [
    ...history,
    {
      role: 'user',
      parts: [...attachmentParts, { text: prompt }],
    },
  ];

  const models = getModelFallbackOrder(preferredModels);
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await requestModel({
          model,
          apiKey,
          proxyUrl,
          contents,
          systemInstruction,
          maxOutputTokens,
          timeoutMs,
          jsonMode,
          depth,
          temperature,
        });
      } catch (err) {
        lastError = err;
        const isNotFound = err?.status === 404;
        const shouldRetrySameModel = Boolean(err?.retryable) && attempt === 0;

        if (shouldRetrySameModel) {
          await sleep(600);
          continue;
        }

        if (err?.retryable || isNotFound) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError || new Error('Gemini API request failed. Please try again.');
}

/**
 * Call Gemini for JSON, parse it, and run it through `normalize`. If the reply
 * isn't valid JSON or nothing usable survives validation, ask once more before
 * giving up — a second sample usually comes back well-formed.
 */
async function callGeminiJson(callOptions, normalize, emptyMessage) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGemini({ ...callOptions, jsonMode: true });
    try {
      const result = normalize(JSON.parse(extractJsonText(raw)));
      const usable = Array.isArray(result) ? result.length > 0 : Boolean(result);
      if (usable) return result;
      console.warn(`AI reply failed validation (attempt ${attempt + 1}).`);
    } catch {
      console.warn(`AI reply was not valid JSON (attempt ${attempt + 1}).`);
    }
  }
  throw new Error(emptyMessage);
}

export async function generateTopics(prompt, attachments = []) {
  return callGemini({
    prompt,
    history: attachments.length ? [] : TOPIC_FEW_SHOT_HISTORY,
    attachments,
    maxOutputTokens: 512,
    timeoutMs: attachments.length ? 45000 : 30000,
    jsonMode: true,
    depth: 'fast',
  });
}

export async function generateCourseSyllabus({
  topics,
  level,
  style,
  sourceNotes = '',
  attachments = [],
  diagnosticSummary = '',
}) {
  const prompt = buildSyllabusPrompt({
    topics,
    level,
    style,
    sourceNotes,
    hasAttachment: attachments.length > 0,
    diagnosticSummary,
  });
  return callGeminiJson(
    {
      prompt,
      attachments,
      maxOutputTokens: 3072,
      timeoutMs: 65000,
      depth: 'fast',
    },
    extractCourses,
    'We had trouble building your course outline. Please try again.'
  );
}

export async function generateChapterLesson({
  courseTitle,
  courseDescription,
  chapterName,
  chapterSummary,
  learningGoal,
  level,
  style,
  sourceNotes = '',
}) {
  const prompt = buildChapterLessonPrompt({
    courseTitle,
    courseDescription,
    chapterName,
    chapterSummary,
    learningGoal,
    level,
    style,
    sourceNotes,
  });

  return callGeminiJson(
    {
      prompt,
      maxOutputTokens: 6144,
      timeoutMs: 75000,
      depth: 'deep',
      preferredModels: DEEP_MODEL_ORDER,
    },
    (parsed) => normalizeList(pickArray(parsed, 'content'), normalizeLessonSection, 8),
    'Coach returned an empty chapter lesson. Please retry.'
  );
}

export async function askCoach({
  courseTitle,
  chapterName,
  currentLesson,
  level,
  style,
  chatHistory = [],
  userQuestion,
}) {
  const contextText = buildCoachLessonContext({
    courseTitle,
    chapterName,
    currentLesson,
    level,
    style,
  });

  const tutorSystemInstruction =
    `${COACH_SYSTEM_INSTRUCTION}\n\n` +
    'You are currently tutoring the learner inside an active lesson. ' +
    'Answer concisely (usually 1-3 short paragraphs or crisp bullet points) using clear examples, ' +
    'and check understanding when helpful. Do not output JSON—respond in natural, easy-to-read plain text.\n\n' +
    contextText;

  const trimmedHistory = chatHistory.slice(-8).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const contentsOverride = [
    ...trimmedHistory,
    {
      role: 'user',
      parts: [{ text: userQuestion }],
    },
  ];

  return callGemini({
    contentsOverride,
    systemInstruction: tutorSystemInstruction,
    maxOutputTokens: 1024,
    timeoutMs: 25000,
    jsonMode: false,
    depth: 'fast',
    temperature: 0.6,
  });
}

export async function generateMoreQuizQuestions({
  courseTitle,
  chapters = [],
  existingQuestions = [],
  level = 'Beginner',
  style = 'Hands-on & Examples',
}) {
  const chapterNames = chapters.map((c) => c?.chapterName).filter(Boolean).join(', ');
  const avoidList = existingQuestions.slice(0, 12).join(' | ');
  const prompt =
    `Course: ${courseTitle}\n` +
    (chapterNames ? `Chapters: ${chapterNames}\n` : '') +
    `Learner level: ${level}\n` +
    `Teaching style: ${style}\n` +
    (avoidList ? `Do NOT repeat these existing questions: ${avoidList}\n` : '') +
    '\nGenerate 5 NEW, applied multiple-choice quiz questions testing genuine understanding.\n' +
    'Each item must have: "question", "options" (4 distinct choices), "correctAns" (matching one option verbatim), and "explanation" (1-2 sentences explaining why).\n' +
    'Output valid JSON ONLY: { "quiz": [ { "question": "...", "options": ["..."], "correctAns": "...", "explanation": "..." } ] }';

  return callGeminiJson(
    { prompt, maxOutputTokens: 2048, timeoutMs: 45000, depth: 'fast' },
    (parsed) => normalizeList(pickArray(parsed, 'quiz'), normalizeQuizQuestion, 10),
    'Could not generate new quiz questions. Please try again.'
  );
}

export async function generateQuizRemediation({
  courseTitle,
  missedItems = [],
  level = 'Beginner',
}) {
  const summaryLines = missedItems
    .map(
      (item, idx) =>
        `${idx + 1}. Question: ${item.question}\n   Learner picked: ${item.userChoice}\n   Correct answer: ${item.correctAns}`
    )
    .join('\n');

  const prompt =
    `Course: ${courseTitle || 'Course'}\n` +
    `Learner level: ${level}\n\n` +
    `The learner missed these quiz questions:\n${summaryLines}\n\n` +
    'Write a crisp, encouraging mini-review lesson addressing ONLY the underlying concepts they missed. ' +
    'For each missed concept, briefly clarify why the wrong choice was tempting, explain the right mental model with a concrete example, and end with 1 quick takeaway. ' +
    'Respond in clear, easy-to-read plain text (no JSON).';

  return callGemini({
    prompt,
    maxOutputTokens: 1536,
    timeoutMs: 35000,
    jsonMode: false,
    depth: 'fast',
    temperature: 0.6,
  });
}

export async function generateMoreFlashcards({
  courseTitle,
  chapters = [],
  existingFronts = [],
  level = 'Beginner',
}) {
  const chapterNames = chapters.map((c) => c?.chapterName).filter(Boolean).join(', ');
  const avoidList = existingFronts.slice(0, 15).join(' | ');
  const prompt =
    `Course: ${courseTitle}\n` +
    (chapterNames ? `Chapters: ${chapterNames}\n` : '') +
    `Learner level: ${level}\n` +
    (avoidList ? `Do NOT repeat these existing card fronts: ${avoidList}\n` : '') +
    '\nGenerate 6 NEW active-recall flashcards covering high-value concepts, distinctions, or practical patterns.\n' +
    'Each card has "front" (concise prompt/question) and "back" (clear, memorable answer).\n' +
    'Output valid JSON ONLY: { "flashcards": [ { "front": "...", "back": "..." } ] }';

  return callGeminiJson(
    { prompt, maxOutputTokens: 2048, timeoutMs: 45000, depth: 'fast' },
    (parsed) => normalizeList(pickArray(parsed, 'flashcards'), normalizeFlashcard, 12),
    'Could not generate new flashcards. Please try again.'
  );
}

export async function generateCourseCheatSheet({
  courseTitle,
  description = '',
  chapters = [],
  level = 'Beginner',
  style = 'Hands-on & Examples',
}) {
  const chapterOutline = chapters
    .map((c, idx) => `${idx + 1}. ${c?.chapterName}${c?.summary ? ` — ${c.summary}` : ''}`)
    .join('\n');

  const prompt =
    `Course: ${courseTitle}\n` +
    (description ? `Overview: ${description}\n` : '') +
    (chapterOutline ? `Chapters:\n${chapterOutline}\n` : '') +
    `Learner level: ${level}\n` +
    `Style: ${style}\n\n` +
    'Create a high-density, exam-ready 1-page revision Cheat Sheet for this entire course.\n' +
    'Organize it clearly with bold headings and bullet points covering:\n' +
    '1. **Core Mental Models** (the 3-4 big ideas everything builds on)\n' +
    '2. **Key Terms, Rules & Formulas** (concise definitions/syntax with inline `code` where useful)\n' +
    '3. **Common Traps to Avoid** (top 3-4 mistakes learners make)\n' +
    '4. **Rapid Revision Checklist** (5 quick self-check bullets)\n' +
    'Keep it crisp, scannable, and directly useful right before an exam or project. Respond in clean plain text with **bold** headings and `- ` bullets (no JSON).';

  return callGemini({
    prompt,
    maxOutputTokens: 2048,
    timeoutMs: 45000,
    jsonMode: false,
    depth: 'fast',
    temperature: 0.5,
  });
}

export async function generateDiagnosticQuiz({ topic }) {
  const prompt =
    `Topic: ${topic}\n\n` +
    'Create a quick 3-question skill diagnostic to place a learner as Beginner, Intermediate, or Advanced:\n' +
    '- Question 1: Beginner level\n' +
    '- Question 2: Intermediate level\n' +
    '- Question 3: Advanced level\n' +
    'Each question must have: "question", "options" (4 concise choices), "correctAns" (matching one option verbatim), and "difficulty" ("Beginner" | "Intermediate" | "Advanced").\n' +
    'Output valid JSON ONLY: { "questions": [ { "question": "...", "options": ["..."], "correctAns": "...", "difficulty": "Beginner" } ] }';

  return callGeminiJson(
    { prompt, maxOutputTokens: 1200, timeoutMs: 30000, depth: 'fast' },
    (parsed) => normalizeList(pickArray(parsed, 'questions'), normalizeDiagnosticQuestion, 3),
    'Could not generate diagnostic questions.'
  );
}

export async function gradeFeynmanExplanation({
  courseTitle,
  concept,
  referenceSummary = '',
  userExplanation,
  level = 'Beginner',
}) {
  const prompt =
    `Course: ${courseTitle}\n` +
    `Concept to explain: ${concept}\n` +
    (referenceSummary ? `Reference overview: ${referenceSummary}\n` : '') +
    `Learner level: ${level}\n` +
    `Learner's explanation in their own words:\n"""\n${userExplanation}\n"""\n\n` +
    'Evaluate this Feynman-technique explanation like an encouraging, sharp tutor.\n' +
    'Output valid JSON ONLY with:\n' +
    '- "score": integer 0-100\n' +
    '- "verdict": short 1-sentence encouraging summary\n' +
    '- "strengths": array of 1-3 specific things they explained accurately\n' +
    '- "gaps": array of 1-3 missing pieces or inaccuracies to tighten up\n' +
    '- "improvedExplanation": a crisp, clear model explanation in 3-4 sentences showing how to explain it cleanly';

  return callGeminiJson(
    { prompt, maxOutputTokens: 1200, timeoutMs: 35000, depth: 'fast', temperature: 0.4 },
    normalizeFeynmanGrade,
    'Could not grade your explanation right now. Please try again.'
  );
}

// Backward-compatible exports
export async function generateCourses(prompt) {
  return callGemini({
    prompt,
    maxOutputTokens: 6144,
    timeoutMs: 40000,
    jsonMode: true,
    depth: 'fast',
  });
}

export const GenerateTopicsAIModel = {
  async sendMessage(prompt) {
    const text = await generateTopics(prompt);
    return { response: { text: () => text } };
  },
};

export const GenerateCourseAIModel = {
  async sendMessage(prompt) {
    const text = await generateCourses(prompt);
    return { response: { text: () => text } };
  },
};
