const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  }
  async checkSimilarity(localName, googleName, distance) {
    try {
      const prompt = `
            You are a data reconciliation expert.
            Compare these two place names and determine if they refer to the same physical establishment.
            
            Rules:
            1. Allow for translations (e.g., "Apt. Cafe" == "小公寓咖啡").
            2. Allow for abbreviations or missing branch names.
            3. Strict differentiation for major brands (e.g., "Starbucks" != "Louisa").
            
            Input:
            - Local Name: "${localName}"
            - Google Name: "${googleName}"
            - Distance: ${distance.toFixed(1)} meters
            
            Output ONLY a JSON object with no markdown formatting:
            { "isSame": boolean, "reason": "short string" }
            `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const jsonResult = JSON.parse(text);
      console.log(
        `Gemini result [${localName}] vs [${googleName}]: ${jsonResult.isSame} (${jsonResult.reason})`
      );
      return jsonResult.isSame;
    } catch (error) {
      console.error("Gemini check error:", error);
      return false; // conservative fallback on failure
    }
  }
}

module.exports = new AIService();
