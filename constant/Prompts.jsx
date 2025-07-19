import dedent from "dedent";

export default {
  IDEA: dedent`
    As your are a coaching teacher
    - User want to learn about the topic
    - Generate 5-7 Course title for study (Short)
    - Make sure it is releated to description
    - Output will be ARRAY of String in JSON FORMAT only
    - Do not add any plain text in output
  `,

  COURSE: dedent`
    As you are coaching teacher
    - User want to learn about all topics
    - Create 2 Courses With Course Name, Description, and 5/8 Chapters in each course
    - Make sure to add chapters 
    - List Content in each chapter along with Description in 5 to 8 lines
    - Do not Just Explain what chapter about, Explain in Detail with Example
    - Also Make Easy, Moderate and Advance Course depends on topics
    - Add CourseBanner Image from ["/banner1.png","/banner2.png","/banner3.png","/banner4.png","/banner5.png","/banner6.png"], select It randomly
    - Explain the chapter content as detailed tutorial with list of content
    - Generate 10 Quizz, 10 Flashcard and 10 Questions answer
    - Tag each course to one of the categorty from: ["Tech & Coding","Business & Finance","Health & Fitness","Science & Engineering","Arts & Creativity"]
    - Output in JSON Format only

    Example:
    {
      "courses": [
        {
          "courseTitle": "Intro to Python",
          "description": "This course introduces beginners to Python programming...",
          "banner_image": "/banner3.png",
          "category": "Tech & Coding",
          "chapters": [
            {
              "chapterName": "Getting Started",
              "content": [
                {
                  "topic": "Installing Python",
                  "explain": "To begin using Python, install the interpreter from the official website...",
                  "code": "python --version",
                  "example": "e.g., To check version, run: python --version"
                }
              ]
            }
          ],
          "quiz": [
            {
              "question": "What is Python?",
              "options": ["A snake", "A programming language", "A fruit", "A database"],
              "correctAns": "A programming language"
            }
          ],
          "flashcards": [
            {
              "front": "Define variable",
              "back": "A named memory location to store data"
            }
          ],
          "qa": [
            {
              "question": "How do you print in Python?",
              "answer": "Using the print() function"
            }
          ]
        }
      ]
    }
    - Do not include any plain text, greetings, or markdown. Just JSON only.
  `
};
