import { GoogleGenAI, Type } from "@google/genai";
import { TestStep } from '../types';

export const generateTestSteps = async (testCaseTitle: string): Promise<TestStep[]> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a list of sequential test steps for a software test case titled: "${testCaseTitle}". 
      Each step should have an Action and an Expected Result. Keep it concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING },
              expectedResult: { type: Type.STRING }
            },
            required: ["action", "expectedResult"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawSteps = JSON.parse(text);
    
    return rawSteps.map((s: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      action: s.action,
      expectedResult: s.expectedResult
    }));

  } catch (error) {
    console.error("Failed to generate test steps:", error);
    throw error;
  }
};