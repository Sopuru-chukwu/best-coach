import {
  extractCourses,
  normalizeDiagnosticQuestion,
  normalizeFeynmanGrade,
  normalizeFlashcard,
  normalizeLessonSection,
  normalizeList,
  normalizeQuizQuestion,
  pickArray,
  resolveCorrectAnswer,
} from '../aiValidation';

const OPTIONS = ['Paris', 'London', 'Berlin', 'Madrid'];

describe('resolveCorrectAnswer', () => {
  it('keeps an exact match', () => {
    expect(resolveCorrectAnswer('London', OPTIONS)).toBe('London');
  });
  it('matches ignoring case and spacing', () => {
    expect(resolveCorrectAnswer('  london ', OPTIONS)).toBe('London');
  });
  it('maps a letter answer to the option', () => {
    expect(resolveCorrectAnswer('C', OPTIONS)).toBe('Berlin');
    expect(resolveCorrectAnswer('b)', OPTIONS)).toBe('London');
    expect(resolveCorrectAnswer('Option D', OPTIONS)).toBe('Madrid');
  });
  it('maps "B) text" answers', () => {
    expect(resolveCorrectAnswer('B) London', OPTIONS)).toBe('London');
  });
  it('maps a numeric index', () => {
    expect(resolveCorrectAnswer(0, OPTIONS)).toBe('Paris');
  });
  it('returns null when nothing matches', () => {
    expect(resolveCorrectAnswer('Rome', OPTIONS)).toBeNull();
    expect(resolveCorrectAnswer('Z', OPTIONS)).toBeNull();
  });
});

describe('normalizeQuizQuestion', () => {
  it('cleans a valid question and fixes the answer text', () => {
    expect(
      normalizeQuizQuestion({
        question: ' Capital of France? ',
        options: ['Paris', 'London', 'Paris', ''],
        correctAns: 'paris',
      })
    ).toEqual({
      question: 'Capital of France?',
      options: ['Paris', 'London'],
      correctAns: 'Paris',
      explanation: '',
    });
  });
  it('drops questions it cannot repair', () => {
    expect(normalizeQuizQuestion({ question: 'Q', options: ['A', 'B'], correctAns: 'C' })).toBeNull();
    expect(normalizeQuizQuestion({ question: 'Q', options: ['A'], correctAns: 'A' })).toBeNull();
    expect(normalizeQuizQuestion({ options: ['A', 'B'], correctAns: 'A' })).toBeNull();
    expect(normalizeQuizQuestion(null)).toBeNull();
  });
});

describe('list helpers', () => {
  it('pickArray reads keyed or bare arrays', () => {
    expect(pickArray({ quiz: [1] }, 'quiz')).toEqual([1]);
    expect(pickArray([2], 'quiz')).toEqual([2]);
    expect(pickArray({ other: [] }, 'quiz')).toEqual([]);
    expect(pickArray(null, 'quiz')).toEqual([]);
  });
  it('normalizeList filters bad items and caps length', () => {
    const cards = [{ front: 'a', back: 'b' }, { front: 'x' }, { front: 'c', back: 'd' }];
    expect(normalizeList(cards, normalizeFlashcard)).toHaveLength(2);
    expect(normalizeList(cards, normalizeFlashcard, 1)).toHaveLength(1);
    expect(normalizeList('nope', normalizeFlashcard)).toEqual([]);
  });
});

describe('normalizeDiagnosticQuestion', () => {
  it('falls back to difficulty by position', () => {
    const q = { question: 'Q', options: ['A', 'B'], correctAns: 'A', difficulty: 'expert' };
    expect(normalizeDiagnosticQuestion(q, 2).difficulty).toBe('Advanced');
    expect(normalizeDiagnosticQuestion({ ...q, difficulty: 'intermediate' }, 0).difficulty).toBe(
      'Intermediate'
    );
  });
});

describe('normalizeLessonSection', () => {
  it('requires a topic and some explanation', () => {
    expect(normalizeLessonSection({ topic: 'T' })).toBeNull();
    const section = normalizeLessonSection({
      topic: 'T',
      explain: 'E',
      visualFlow: ['a', 3, null],
      comparisonTable: { headers: ['A', 'B'], rows: [['1', '2'], 'bad', []] },
    });
    expect(section.visualFlow).toEqual(['a', '3']);
    expect(section.comparisonTable).toEqual({ headers: ['A', 'B'], rows: [['1', '2']] });
    expect(section.code).toBe('');
  });
  it('drops a malformed comparison table', () => {
    expect(
      normalizeLessonSection({ topic: 'T', explain: 'E', comparisonTable: { headers: ['A'] } })
        .comparisonTable
    ).toBeNull();
  });
});

describe('extractCourses', () => {
  const course = {
    courseTitle: 'Python',
    chapters: [{ chapterName: 'Basics', estimatedMinutes: 99 }, { summary: 'no name' }],
    quiz: [
      { question: 'Q1', options: ['a', 'b'], correctAns: 'B' },
      { question: 'Q2', options: ['a', 'b'], correctAns: 'zzz' },
    ],
    flashcards: 'oops',
  };

  it('accepts {courses}, a bare array, or one course', () => {
    expect(extractCourses({ courses: [course] })).toHaveLength(1);
    expect(extractCourses([course])).toHaveLength(1);
    expect(extractCourses(course)).toHaveLength(1);
  });

  it('cleans nested chapters and quiz items', () => {
    const [c] = extractCourses({ courses: [course] });
    expect(c.chapters).toHaveLength(1);
    expect(c.chapters[0]).toMatchObject({ chapterName: 'Basics', estimatedMinutes: 30, content: [], isDetailed: false });
    expect(c.quiz).toEqual([{ question: 'Q1', options: ['a', 'b'], correctAns: 'b', explanation: '' }]);
    expect(c.flashcards).toEqual([]);
    expect(c.banner_image).toBe('/banner1.png');
  });

  it('drops courses without a title or chapters', () => {
    expect(extractCourses({ courses: [{ courseTitle: 'X', chapters: [] }, { chapters: [{ chapterName: 'a' }] }] })).toEqual([]);
  });
});

describe('normalizeFeynmanGrade', () => {
  it('clamps the score and fills defaults', () => {
    expect(normalizeFeynmanGrade({ score: '140' })).toEqual({
      score: 100,
      verdict: 'Good effort!',
      strengths: [],
      gaps: [],
      improvedExplanation: '',
    });
  });
  it('rejects a reply without a score', () => {
    expect(normalizeFeynmanGrade({ verdict: 'hi' })).toBeNull();
  });
});
