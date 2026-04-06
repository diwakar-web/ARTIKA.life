const { callLLM } = require("../services/llm.service");

async function classifyQuery(message) {
  const prompt = `You are a medical classifier. Is the following text related to health, medicine, symptoms, or wellness?
Text: "${message}"
Answer only YES or NO.`;
  
  try {
    const rawResponse = await callLLM(prompt);
    const resText = (rawResponse || "").toUpperCase().trim();
    if (resText.includes("YES")) {
      return "YES";
    }
    // If we're not sure but it's not explicitly YES, let's say NO (strict domain control)
    return "NO";
  } catch (error) {
    console.error("[Classifier] LLM failed, defaulting to YES", error);
    // fallback to YES if LLM call itself fails (so we don't break main flow unexpectedly)
    return "YES";
  }
}

module.exports = { classifyQuery };
