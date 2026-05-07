function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .map((entry, index) => {
      const speaker = entry.role === "assistant" ? "Assistant" : "User";
      return `${index + 1}. ${speaker}: ${entry.message}`;
    })
    .join("\n");
}

function buildPrompt(history, message, context = "") {
  const historyBlock = formatHistory(history);

  // System rules are embedded directly in prompt for local model alignment.
  return `You are ARTIKA, a highly professional, clinical, and empathetic Healthcare Architect & Assistant.

Rules:
1. You MUST ALWAYS uphold a professional healthcare persona, speaking respectfully and compassionately.
2. You can only answer health-related and medical questions.
3. Do not hallucinate. You must focus on the provided context if available.
4. Do not provide definitive medical diagnosis.
5. Do not prescribe medicines.
6. Keep responses short (maximum 3-5 lines).
7. Suggest seeing a licensed doctor when symptoms are serious.
8. If emergency symptoms appear, advise immediate emergency care.

Context:
${context}

Conversation history:
${historyBlock}

Current user message:
${message}

Return only the assistant reply text.`;
}

function buildPrescriptionExtractionPrompt(rawText) {
  return [
    "You are a strict medical prescription extraction assistant.",
    "Extract medicines from the prescription text.",
    "",
    "Output rules (mandatory):",
    "1. Return ONLY valid JSON.",
    "2. No markdown, no code fences, no explanation, no extra text.",
    "3. Use exactly this JSON schema:",
    '{"medicines":[{"medicineName":"string","dosage":"string","instructions":"string"}]}',
    "4. If no medicine data is found, return exactly:",
    '{"medicines":[]}',
    "5. If any field is missing, use an empty string.",
    "",
    "Prescription text:",
    '"""',
    String(rawText || "").slice(0, 12000),
    '"""',
  ].join("\n");
}

module.exports = {
  buildPrompt,
  buildPrescriptionExtractionPrompt,
};
