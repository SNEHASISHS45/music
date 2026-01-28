
import { GoogleGenAI, Type } from "@google/genai";

// Always use new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getVibeRecommendation = async (userPrompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User wants a music vibe based on: "${userPrompt}". Suggest a fictional track name, a cool artist name, and a brief description of the mood. Format as valid JSON: { "title": "...", "artist": "...", "description": "..." }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    // Use .text property to access extracted text
    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Vibe Error:", error);
    return null;
  }
};

/**
 * Robust fallback search using Google Search grounding
 */
export const searchMusicWithGemini = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Use Pro for complex tasks like grounding
      contents: `Find the 5 most relevant YouTube music videos for the search query: "${query}". 
      Return only a JSON array of objects. 
      Each object must have: "title", "artist", "videoId", and a "thumbnail" URL if possible.
      Format: [{"title": "...", "artist": "...", "videoId": "...", "thumbnail": "..."}]`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              videoId: { type: Type.STRING },
              thumbnail: { type: Type.STRING }
            },
            required: ["title", "artist", "videoId"]
          }
        }
      }
    });

    // Use .text property to access extracted text
    const text = response.text;
    if (!text) return [];
    
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      console.warn("Gemini Search output was not valid JSON:", text);
      return [];
    }
  } catch (error) {
    console.error("Gemini Search Fallback Error:", error);
    return [];
  }
};
