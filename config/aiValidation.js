/**
 * Checks and cleans up JSON produced by the AI before the app uses or saves it.
 *
 * The model usually follows the requested shape, but not always: a quiz answer
 * that doesn't exactly match any option makes every choice "wrong", and a
 * flashcard with no back renders as a blank card. Each `normalize*` function
 * returns a cleaned item, or null when the item can't be repaired, so callers
 * can drop bad items instead of showing broken screens.
 */

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function textList(value, max = 20) {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean).slice(0, max);
}

/** Pull the list out of `{ [key]: [...] }` or a bare `[...]`. */
export function pickArray(parsed, key) {
  if (Array.isArray(parsed?.[key])) return parsed[key];
  if (Array.isArray(parsed)) return parsed;
  return [];
}

/** Keep only the items the normalizer accepts. */
export function normalizeList(items, normalizer, max = 50) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => normalizer(item, index))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Resolve `correctAns` to the exact text of one of the options. Accepts an exact
 * match, a case/whitespace-insensitive match, a letter ("B", "b)", "Option C") or
 * a 0-based index.
 */
export function resolveCorrectAnswer(correctAns, options) {
  if (!Array.isArray(options) || options.length === 0) return null;

  const answer = text(correctAns);
  if (answer) {
    if (options.includes(answer)) return answer;

    const squash = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const loose = options.find((opt) => squash(opt) === squash(answer));
    if (loose) return loose;

    const letter = answer.match(/^(?:option\s*)?([a-z])[).:]?$/i);
    if (letter) {
      const idx = letter[1].toLowerCase().charCodeAt(0) - 97;
      if (idx >= 0 && idx < options.length) return options[idx];
    }

    // "B) Some option text" style answers
    const prefixed = answer.match(/^([a-z])[).:]\s+(.+)$/i);
    if (prefixed) {
      const rest = options.find((opt) => squash(opt) === squash(prefixed[2]));
      if (rest) return rest;
    }
  }

  if (typeof correctAns === 'number' && Number.isInteger(correctAns)) {
    if (correctAns >= 0 && correctAns < options.length) return options[correctAns];
  }

  return null;
}

export function normalizeQuizQuestion(item) {
  const question = text(item?.question);
  const options = [...new Set(textList(item?.options, 6))];
  if (!question || options.length < 2) return null;

  const correctAns = resolveCorrectAnswer(item?.correctAns, options);
  if (!correctAns) return null;

  return {
    question,
    options,
    correctAns,
    explanation: text(item?.explanation),
  };
}

export function normalizeDiagnosticQuestion(item, index = 0) {
  const base = normalizeQuizQuestion(item);
  if (!base) return null;
  const difficulty = DIFFICULTIES.find(
    (d) => d.toLowerCase() === text(item?.difficulty).toLowerCase()
  );
  return { ...base, difficulty: difficulty || DIFFICULTIES[Math.min(index, 2)] };
}

export function normalizeFlashcard(item) {
  const front = text(item?.front);
  const back = text(item?.back);
  if (!front || !back) return null;
  return { front, back };
}

export function normalizeQa(item) {
  const question = text(item?.question);
  const answer = text(item?.answer);
  if (!question || !answer) return null;
  return { question, answer };
}

function normalizeComparisonTable(table) {
  const headers = textList(table?.headers, 6);
  if (headers.length < 2 || !Array.isArray(table?.rows)) return null;
  const rows = table.rows
    .filter(Array.isArray)
    .map((row) => headers.map((_, i) => text(row[i])))
    .filter((row) => row.some(Boolean))
    .slice(0, 8);
  return rows.length ? { headers, rows } : null;
}

export function normalizeLessonSection(item) {
  const topic = text(item?.topic);
  const explain = text(item?.explain);
  const intuition = text(item?.intuition);
  if (!topic || (!explain && !intuition)) return null;

  return {
    topic,
    intuition,
    explain,
    code: text(item?.code),
    example: text(item?.example),
    commonMistake: text(item?.commonMistake),
    keyTakeaway: text(item?.keyTakeaway),
    checkQuestion: text(item?.checkQuestion),
    checkAnswer: text(item?.checkAnswer),
    visualFlow: textList(item?.visualFlow, 8),
    comparisonTable: normalizeComparisonTable(item?.comparisonTable),
  };
}

export function normalizeChapterOutline(item) {
  const chapterName = text(item?.chapterName);
  if (!chapterName) return null;

  const minutes = Math.round(Number(item?.estimatedMinutes));
  const content = normalizeList(item?.content, normalizeLessonSection, 8);

  return {
    ...item,
    chapterName,
    summary: text(item?.summary),
    learningGoal: text(item?.learningGoal),
    estimatedMinutes: Number.isFinite(minutes) ? Math.min(Math.max(minutes, 3), 30) : 10,
    content,
    isDetailed: content.length > 0,
  };
}

export function normalizeCourse(item) {
  const courseTitle = text(item?.courseTitle);
  const chapters = normalizeList(item?.chapters, normalizeChapterOutline, 12);
  if (!courseTitle || chapters.length === 0) return null;

  return {
    ...item,
    courseTitle,
    description: text(item?.description),
    learningObjectives: textList(item?.learningObjectives, 6),
    banner_image: text(item?.banner_image) || '/banner1.png',
    category: text(item?.category),
    chapters,
    quiz: normalizeList(item?.quiz, normalizeQuizQuestion, 20),
    flashcards: normalizeList(item?.flashcards, normalizeFlashcard, 30),
    qa: normalizeList(item?.qa, normalizeQa, 20),
  };
}

/** `{ courses: [...] }`, a bare array, or a single course object. */
export function extractCourses(parsed) {
  const raw = Array.isArray(parsed?.courses)
    ? parsed.courses
    : Array.isArray(parsed)
      ? parsed
      : parsed?.courseTitle
        ? [parsed]
        : [];
  return normalizeList(raw, normalizeCourse, 5);
}

export function normalizeFeynmanGrade(parsed) {
  const score = Number(parsed?.score);
  if (!Number.isFinite(score)) return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    verdict: text(parsed?.verdict) || 'Good effort!',
    strengths: textList(parsed?.strengths, 3),
    gaps: textList(parsed?.gaps, 3),
    improvedExplanation: text(parsed?.improvedExplanation),
  };
}
