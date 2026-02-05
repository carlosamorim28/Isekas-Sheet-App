
import { GoogleGenAI } from "@google/genai";

export async function generateCharacterInsight(characterName: string, traits: string[]) {
  // Always use { apiKey: process.env.API_KEY } according to guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base no personagem ${characterName} (um jovem anão artífice de 12 anos, focado em ferraria e encantamento, com atributos de força e ofício altos), gere um pequeno comentário narrativo (máximo 3 frases) sobre seu próximo desafio em uma masmorra ou oficina. Seja evocativo e heróico.`,
      config: {
        temperature: 0.8,
      }
    });
    // Use response.text property directly
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O destino de Ardrin está envolto em névoas rúnicas...";
  }
}
