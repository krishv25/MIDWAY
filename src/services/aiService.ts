import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateMilestones = async (description: string, budget: number) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Break down the following project description into simple, easy-to-understand steps with a price for each. Total price is $${budget}. Use very simple language.
    
    Project Description: ${description}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
          },
          required: ["title", "description", "amount"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

export const verifyWork = async (milestoneTitle: string, milestoneDesc: string, submission: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As an AI helper, check if the following work was done for the step: "${milestoneTitle}".
    What was needed: ${milestoneDesc}
    What was done: ${submission}
    
    Check if the work is good. Say if it is "approved" or "rejected" and give simple feedback.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["approved", "rejected"] },
          feedback: { type: Type.STRING },
        },
        required: ["status", "feedback"],
      },
    },
  });

  return JSON.parse(response.text || '{"status": "rejected", "feedback": "AI failed to verify."}');
};
