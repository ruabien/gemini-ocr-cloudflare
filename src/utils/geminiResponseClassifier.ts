export function classifyGeminiResponse(cleanJson: any): string | null {
  const blockReason = cleanJson.promptFeedback?.blockReason;
  const candidate = cleanJson.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const safetyRatings = candidate?.safetyRatings || [];

  const hasExplicitSafetyBlock = safetyRatings.some(
    (rating: any) => rating.blocked === true
  );

  if (blockReason) {
    return "CONTENT_BLOCKED";
  } else if (finishReason === "SAFETY") {
    return "CONTENT_BLOCKED";
  } else if (hasExplicitSafetyBlock) {
    return "CONTENT_BLOCKED";
  } else if (finishReason === "RECITATION") {
    return "RECITATION_BLOCKED";
  } else if (finishReason === "OTHER") {
    return "OTHER_FINISH_REASON";
  }

  return null;
}