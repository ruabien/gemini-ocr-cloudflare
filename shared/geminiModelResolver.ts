/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const requireResolvedGeminiModel = (model: string | null | undefined): string => {
  if (!model) {
    throw new Error("MODEL_NOT_RESOLVED");
  }
  let cleanModel = model.trim();
  if (!cleanModel) {
    throw new Error("MODEL_NOT_RESOLVED");
  }
  
  if (cleanModel.startsWith("models/")) {
    cleanModel = cleanModel.substring("models/".length);
  }
  
  if (cleanModel.endsWith(":generateContent")) {
    cleanModel = cleanModel.substring(0, cleanModel.length - ":generateContent".length);
  }

  // Reject display labels with spaces or suffixes
  if (cleanModel.includes(" ") || cleanModel.includes("Mặc định") || cleanModel.includes("Mới nhất")) {
    throw new Error("MODEL_NOT_RESOLVED");
  }

  return cleanModel;
};