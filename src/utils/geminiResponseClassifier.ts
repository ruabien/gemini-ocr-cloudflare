export const classifyGeminiResponse = (response: any): string | null => {
  if (!response) return null;

  const errorCode = response?.error?.code;
  const errorStatus = response?.error?.status || "";
  const errorMessage = response?.error?.message || "";

  if (errorCode === 404 || errorStatus === "NOT_FOUND" || errorCode === "NOT_FOUND") {
    if (errorMessage.includes("no longer available to new users")) {
      return "MODEL_DEPRECATED_FOR_KEY";
    }
    return "MODEL_NOT_AVAILABLE";
  }

  if (!errorCode) {
    // No explicit error code; attempt to infer from response structure if needed
    return null;
  }

  // Direct mapping of known Gemini failure categories
  switch (errorCode) {
    case "RECITATION_BLOCKED":
      return "RECITATION_BLOCKED";
    case "RECITATION_BLOCKED_AFTER_RETRY":
      return "RECITATION_BLOCKED_AFTER_RETRY";
    case "CONTENT_BLOCKED":
      return "CONTENT_BLOCKED";
    case "SAFETY":
      return "SAFETY";
    case "MODEL_NOT_RESOLVED":
      return "MODEL_NOT_RESOLVED";
    case "INVALID_KEY":
      return "INVALID_KEY";
    case "QUOTA_EXCEEDED":
      return "QUOTA_EXCEEDED";
    case "BLOCKED_REQUEST":
      return "BLOCKED_REQUEST";
    case "MALFORMED_REQUEST":
      return "MALFORMED_REQUEST";
    case "NO_TEXT":
      return "NO_TEXT";
    default:
      // Unknown error code – return as is for downstream handling
      return errorCode;
  }
};