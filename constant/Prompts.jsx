import dedent from "dedent";

export const LEARNER_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const TEACHING_STYLES = [
  "Hands-on & Examples",
  "Exam Prep",
  "Deep Theory",
];

export function buildTopicIdeaPrompt({
  userInput = "",
  level = "Beginner",
  style = "Hands-on & Examples",
  sourceNotes = "",
  hasAttachment = false,
}) {
  const trimmedNotes = sourceNotes.trim().slice(0, 4000);
  return dedent`
    ${userInput ? `Topic request: ${userInput}` : "Topic request: Derive from the provided study material / attachment."}
    Learner level: ${level}
    Preferred teaching style: ${style}
    ${trimmedNotes ? `\nLearner's study notes / source material:\n"""\n${trimmedNotes}\n"""` : ""}
    ${hasAttachment ? "\nAn image or PDF document is attached. Extract the key concepts and syllabus topics directly from it." : ""}

    Generate 5-7 sharp, well-scoped subtopics or modules tailored to this learner level, style, and source material.
    Output ONLY a JSON array of strings, with no extra text.
  `;
}

export function buildSyllabusPrompt({
  topics,
  level = "Beginner",
  style = "Hands-on & Examples",
  sourceNotes = "",
  hasAttachment = false,
  diagnosticSummary = "",
}) {
  const trimmedNotes = sourceNotes.trim().slice(0, 4000);
  return dedent`
    Selected topics: ${topics.join(", ")}
    Learner level: ${level}
    Preferred teaching style: ${style}
    ${diagnosticSummary ? `\nSkill diagnostic result (tailor the syllabus to skip what they already mastered and focus on their gaps):\n${diagnosticSummary}` : ""}
    ${trimmedNotes ? `\nReference study notes provided by the learner (base the course directly on this material where relevant):\n"""\n${trimmedNotes}\n"""` : ""}
    ${hasAttachment ? "\nAn image or PDF study document is attached. Anchor the chapters, quizzes, flashcards, and Q&A directly to the material in the attachment." : ""}

    Design 1 high-quality, structured course syllabus that teaches these topics progressively from foundations to mastery at the ${level} level with a ${style} approach.

    Requirements:
    - Create 1 course with:
      - "courseTitle": compelling, specific course title
      - "description": clear 2-3 sentence overview of what the learner will be able to do
      - "level": "${level}"
      - "style": "${style}"
      - "learningObjectives": 3-4 concrete, measurable outcomes
      - "banner_image": randomly pick one of ["/banner1.png","/banner2.png","/banner3.png","/banner4.png","/banner5.png","/banner6.png"]
      - "category": pick one of ["Tech & Coding","Business & Finance","Health & Fitness","Science & Engineering","Arts & Creativity"]
      - "chapters": 5 progressive chapters. For each chapter include ONLY its outline (full lesson content will be generated on demand when opened):
        - "chapterName": concise chapter title
        - "summary": 1 sentence overview of what this chapter teaches
        - "learningGoal": the single concrete skill/concept mastered in this chapter
        - "estimatedMinutes": integer between 5 and 15
      - "quiz": 4 concise applied questions (4 options each, "correctAns" matching one option verbatim, plus a 1-sentence "explanation")
      - "flashcards": 5 concise active-recall flashcards ("front" and "back")
      - "qa": 4 concise key questions with clear answers ("question" and "answer")

    Output valid JSON ONLY matching this exact structure:
    {
      "courses": [
        {
          "courseTitle": "...",
          "description": "...",
          "level": "${level}",
          "style": "${style}",
          "learningObjectives": ["..."],
          "banner_image": "/banner3.png",
          "category": "Tech & Coding",
          "chapters": [
            {
              "chapterName": "...",
              "summary": "...",
              "learningGoal": "...",
              "estimatedMinutes": 8
            }
          ],
          "quiz": [
            {
              "question": "...",
              "options": ["A", "B", "C", "D"],
              "correctAns": "A",
              "explanation": "..."
            }
          ],
          "flashcards": [
            { "front": "...", "back": "..." }
          ],
          "qa": [
            { "question": "...", "answer": "..." }
          ]
        }
      ]
    }
    Return JSON only. No markdown fences or extra commentary.
  `;
}

export function buildChapterLessonPrompt({
  courseTitle,
  courseDescription = "",
  chapterName,
  chapterSummary = "",
  learningGoal = "",
  level = "Beginner",
  style = "Hands-on & Examples",
  sourceNotes = "",
}) {
  const trimmedNotes = sourceNotes.trim().slice(0, 2500);
  return dedent`
    Course: ${courseTitle}
    ${courseDescription ? `Course overview: ${courseDescription}` : ""}
    Chapter: ${chapterName}
    ${chapterSummary ? `Chapter summary: ${chapterSummary}` : ""}
    ${learningGoal ? `Chapter learning goal: ${learningGoal}` : ""}
    Learner level: ${level}
    Teaching style: ${style}
    ${trimmedNotes ? `\nLearner's reference notes to stay aligned with:\n"""\n${trimmedNotes}\n"""` : ""}

    Write a thorough, genuinely illuminating chapter divided into 3-4 progressive lesson sections ("content").
    Teach like an extraordinary human tutor—never write shallow one-liner summaries.

    For EACH section in "content", include:
    - "topic": clear section title
    - "intuition": 2-3 sentences building intuition first using an everyday analogy or "why this exists" mental model
    - "explain": detailed, clear, step-by-step explanation (2-3 rich paragraphs separated by "\\n\\n") tailored to a ${level} learner with a ${style} focus
    - "code": clean, runnable, well-commented code or formula snippet if relevant to the subject (otherwise empty string "")
    - "example": a concrete, step-by-step worked example walking through real numbers, scenarios, or execution trace
    - "commonMistake": a specific misconception or mistake learners frequently make here and how to avoid it
    - "keyTakeaway": crisp 1-2 sentence summary worth remembering
    - "checkQuestion": 1 short active-recall or applied question to test understanding of this section
    - "checkAnswer": clear, concise answer explaining the reasoning
    - "visualFlow": optional array of 3-5 short ordered step labels (e.g. ["Input", "Transform", "Output"]) illustrating the concept flow when helpful (or [])
    - "comparisonTable": optional object { "headers": ["Concept", "Pros", "When to Use"], "rows": [["...", "...", "..."]] } when comparing 2-3 approaches/ideas (or null)

    Output valid JSON ONLY matching:
    {
      "content": [
        {
          "topic": "...",
          "intuition": "...",
          "explain": "...",
          "code": "...",
          "example": "...",
          "commonMistake": "...",
          "keyTakeaway": "...",
          "checkQuestion": "...",
          "checkAnswer": "...",
          "visualFlow": ["Step 1", "Step 2", "Step 3"],
          "comparisonTable": null
        }
      ]
    }
    Return JSON only. No markdown fences or extra text.
  `;
}

export function buildCoachLessonContext({
  courseTitle,
  chapterName,
  currentLesson,
  level = "Beginner",
  style = "Hands-on & Examples",
}) {
  return dedent`
    Active Course: ${courseTitle || "General Course"}
    Active Chapter: ${chapterName || "Current Chapter"}
    Learner Level: ${level}
    Preferred Style: ${style}
    Current Section: ${currentLesson?.topic || "N/A"}
    Intuition: ${currentLesson?.intuition || "N/A"}
    Explanation: ${currentLesson?.explain || "N/A"}
    Code: ${currentLesson?.code || "None"}
    Worked Example: ${currentLesson?.example || "N/A"}
    Common Mistake: ${currentLesson?.commonMistake || "N/A"}
  `;
}

export default {
  IDEA: dedent`
    As a coaching teacher:
    - The user wants to learn about the topic above.
    - Generate 5-7 short, focused course titles related to the topic.
    - Output ONLY a JSON array of strings, with no extra text.
  `,
  COURSE: buildSyllabusPrompt({ topics: ["the selected topics"] }),
};
