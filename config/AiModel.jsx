import Constants from 'expo-constants';

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };
  
   export const GenerateTopicsAIModel = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "Learn Python: : As you are coaching teacher\n-User wants to learn about the topic\n-Generate 5-7 course titles for study (short)\n-Make sure it is related to description\n-Output would be ARRAY of string in JSON FORMAT only\n-Do not add any plain text in output"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "```json\n[\n  \"Python Basics: A Beginner's Journey\",\n  \"Python Data Structures & Algorithms\",\n  \"Object-Oriented Programming in Python\",\n  \"Python for Data Science & Machine Learning\",\n  \"Web Development with Python & Django\",\n  \"Automate Your Life: Python Scripting\",\n  \"Python for Cybersecurity: An Introduction\"\n]\n```"},
          ],
        },
      ],
    });

    export const GenerateCourseAIModel = model.startChat({
        generationConfig,
        history: [
         
        ],
      });
  
    // const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    // console.log(result.response.text());
