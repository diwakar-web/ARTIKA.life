const axios = require("axios");

const ollamaClient = axios.create({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  timeout: Number(process.env.OLLAMA_TIMEOUT_MS) || 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function cleanLlmResponse(rawResponse, responseOptions = {}) {
  const trimmed = String(rawResponse || "").trim();
  if (!responseOptions.jsonOnly) {
    return trimmed;
  }

  return trimmed
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function buildPayload(prompt, stream = false, requestOptions = {}) {
  return {
    model: requestOptions.model || process.env.OLLAMA_MODEL || "phi3",
    prompt,
    stream,
    options: {
      num_predict: 120,
      temperature: 0.7,
      ...(requestOptions.options || {}),
    },
  };
}

function throwNormalizedLlmError(error) {
  if (error.statusCode) {
    throw error;
  }

  if (error.code === "ECONNABORTED") {
    throw createServiceError("LLM request timed out. Try again in a moment.", 504, "LLM_TIMEOUT");
  }

  // Normalize upstream provider failures into API-friendly errors.
  if (error.response) {
    throw createServiceError(
      `Ollama request failed with status ${error.response.status}.`,
      502,
      "LLM_UPSTREAM_ERROR"
    );
  }

  throw createServiceError(
    "Unable to connect to Ollama. Ensure Ollama is running locally.",
    502,
    "LLM_UNREACHABLE"
  );
}

function safelyHandleToken(onToken, token) {
  if (typeof onToken !== "function" || !token) {
    return;
  }

  try {
    onToken(token);
  } catch (_error) {
    // Token callback errors should not fail the LLM request.
  }
}

function appendParsedChunk(line, state, onToken) {
  const payloadLine = String(line || "").trim();
  if (!payloadLine) {
    return;
  }

  try {
    const parsed = JSON.parse(payloadLine);
    if (typeof parsed.response === "string" && parsed.response) {
      state.fullReply += parsed.response;
      safelyHandleToken(onToken, parsed.response);
    }
  } catch (_error) {
    // Ignore malformed partial chunks and continue parsing stream.
  }
}

function consumeStream(stream, onToken, responseOptions = {}) {
  return new Promise((resolve, reject) => {
    const state = {
      fullReply: "",
      buffer: "",
    };

    stream.on("data", (chunk) => {
      state.buffer += chunk.toString("utf8");

      const lines = state.buffer.split("\n");
      state.buffer = lines.pop() || "";

      for (const line of lines) {
        appendParsedChunk(line, state, onToken);
      }
    });

    stream.on("end", () => {
      appendParsedChunk(state.buffer, state, onToken);

      const cleanedReply = cleanLlmResponse(state.fullReply, responseOptions);
      if (!cleanedReply) {
        return reject(createServiceError("Invalid stream response from Ollama.", 502, "LLM_BAD_RESPONSE"));
      }

      return resolve(cleanedReply);
    });

    stream.on("error", (error) => {
      return reject(error);
    });
  });
}

async function callLLM(prompt, requestOptions = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw createServiceError("Prompt is required for callLLM.", 400, "LLM_PROMPT_MISSING");
  }

  // Fixed model params for deterministic API behavior across environments.
  const payload = buildPayload(prompt, false, requestOptions);

  try {
    const endpoint = process.env.OLLAMA_GENERATE_PATH || "/api/generate";
    const response = await ollamaClient.post(endpoint, payload);
    const reply = response?.data?.response;

    if (!reply || typeof reply !== "string") {
      throw createServiceError("Invalid response from Ollama.", 502, "LLM_BAD_RESPONSE");
    }

    const cleanedReply = cleanLlmResponse(reply, {
      jsonOnly: Boolean(requestOptions.jsonOnly),
    });

    if (!cleanedReply) {
      throw createServiceError("Invalid response from Ollama.", 502, "LLM_BAD_RESPONSE");
    }

    return cleanedReply;
  } catch (error) {
    throwNormalizedLlmError(error);
  }
}

async function callLLMStream(prompt, requestOptions = {}) {
  if (!prompt || !String(prompt).trim()) {
    throw createServiceError("Prompt is required for callLLMStream.", 400, "LLM_PROMPT_MISSING");
  }

  const payload = buildPayload(prompt, true, requestOptions);
  const endpoint = process.env.OLLAMA_GENERATE_PATH || "/api/generate";

  try {
    const response = await ollamaClient.post(endpoint, payload, {
      responseType: "stream",
    });

    return await consumeStream(response.data, requestOptions.onToken, {
      jsonOnly: Boolean(requestOptions.jsonOnly),
    });
  } catch (error) {
    throwNormalizedLlmError(error);
  }
}

module.exports = {
  callLLM,
  callLLMStream,
};
