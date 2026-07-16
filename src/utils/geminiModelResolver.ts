/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getUserStorageItem, setUserStorageItem } from "./userStorage";

// Cache time: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const MODEL_MODES = {
  AUTO: "auto",
  MANUAL: "manual",
};

 // Priority list for auto mode
const PREFERRED_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash",
  "gemini-3-flash",
  "gemini-flash-latest"
];

export interface ModelConfig {
  name: string;
  version: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

export const listAvailableGeminiModels = async (apiKey: string): Promise<ModelConfig[]> => {
  try {
    const cleanKey = apiKey.replace(/[\[\]"']/g, "").trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 400 || response.status === 403 || response.status === 401) {
        throw new Error("INVALID_KEY");
      }
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      throw new Error("MODELS_LIST_FAILED");
    }
    const data = await response.json();
    return data.models || [];
  } catch (error: any) {
    if (error.message === "INVALID_KEY" || error.message === "RATE_LIMIT" || error.message === "MODELS_LIST_FAILED") {
      throw error;
    }
    // Network or other fetch errors
    throw new Error("NETWORK");
  }
};

export const filterOcrCapableModels = (models: ModelConfig[]): ModelConfig[] => {
  return models.filter(model => {
    const name = model.name.toLowerCase();

    // Loại bỏ embeddings, tts, image gen, vv.
    if (
      name.includes('embedding') ||
      name.includes('tts') ||
      name.includes('imagen') ||
      name.includes('vision') || // Older vision specific
      name.includes('aqa') ||
      name.includes('bison')
    ) {
      return false;
    }

    // Must support generateContent
    if (!model.supportedGenerationMethods?.includes('generateContent')) {
      return false;
    }

    // Must be a flash model suitable for OCR
    if (!name.includes('flash')) {
      return false;
    }

    return true;
  });
};

export const resolveBestGeminiModel = (models: ModelConfig[]): string | null => {
  const ocrCapable = filterOcrCapableModels(models);

  // Create a map for quick lookup (models API returns names prefixed with "models/")
  const modelNames = new Set(ocrCapable.map(m => m.name.replace('models/', '')));

  for (const preferred of PREFERRED_MODELS) {
    if (modelNames.has(preferred)) {
      return preferred;
    }
  }

  // If no preferred model found, fall back to the first available flash model (if any)
  if (ocrCapable.length > 0) {
    return ocrCapable[0].name.replace('models/', '');
  }

  return null;
};

// Safe way to compute a string hash for cache invalidation
const hashKey = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
};

export const autoResolveModel = async (uid: string | null | undefined, apiKey: string, force: boolean = false): Promise<string> => {
  if (!apiKey) {
    throw new Error("No API Key provided.");
  }

  const keyHash = hashKey(apiKey);

  // Check cache
  if (!force) {
    const cachedObj = getUserStorageItem(uid, 'gemini_model_cache');
    if (cachedObj) {
      try {
        const cache = JSON.parse(cachedObj);
        if (cache.keyHash === keyHash && cache.timestamp > Date.now() - CACHE_TTL_MS) {
          if (cache.resolvedModel) {
            return cache.resolvedModel;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }

  // Call API
  const models = await listAvailableGeminiModels(apiKey);
  // Determine OCR‑capable models for caching
  const ocrCapable = filterOcrCapableModels(models);
  const bestModel = resolveBestGeminiModel(models);

  if (!bestModel) {
    throw new Error("NO_COMPATIBLE_MODEL");
  }

  // Save cache (include list of OCR‑capable model IDs)
  setUserStorageItem(uid, 'gemini_resolved_model', bestModel);
  setUserStorageItem(uid, 'gemini_model_cache', JSON.stringify({
    keyHash,
    resolvedModel: bestModel,
    availableModels: ocrCapable.map(m => m.name.replace('models/', '')),
    timestamp: Date.now()
  }));

  return bestModel;
};

import { requireResolvedGeminiModel as sharedRequireResolvedGeminiModel } from "../../shared/geminiModelResolver";
export const requireResolvedGeminiModel = sharedRequireResolvedGeminiModel;

export const getActiveModel = (uid: string | null | undefined, apiKey?: string): string => {
  const modelMode = getUserStorageItem(uid, 'gemini_model_mode') || 'auto';

  if (modelMode === 'auto') {
    if (apiKey) {
      const cachedObj = getUserStorageItem(uid, 'gemini_model_cache');
      if (cachedObj) {
        try {
          const cache = JSON.parse(cachedObj);
          if (cache.keyHash === hashKey(apiKey) && cache.resolvedModel) {
            return requireResolvedGeminiModel(cache.resolvedModel);
          }
        } catch (e) {}
      }
    }
    const resolved = getUserStorageItem(uid, 'gemini_resolved_model');
    if (!resolved) {
      throw new Error("MODEL_NOT_RESOLVED");
    }
    return requireResolvedGeminiModel(resolved);
  } else {
    const manual = getUserStorageItem(uid, 'ocr_model');
    if (!manual) {
      throw new Error("MODEL_NOT_RESOLVED");
    }
    return requireResolvedGeminiModel(manual);
  }
};

export const migrateOldStorage = (uid: string | null | undefined) => {
  // Migrate non-scoped legacy keys if they exist
  const legacyKeys = ['gemini_model_mode', 'ocr_model', 'gemini_resolved_model', 'gemini_model_cache'];
  
  for (const key of legacyKeys) {
    const legacyValue = localStorage.getItem(key);
    if (legacyValue !== null) {
      if (!getUserStorageItem(uid, key)) {
        setUserStorageItem(uid, key, legacyValue);
      }
      localStorage.removeItem(key);
    }
  }

  const ocrModel = getUserStorageItem(uid, 'ocr_model');
  const mode = getUserStorageItem(uid, 'gemini_model_mode');

  if (ocrModel === 'gemini-2.5-flash') {
    // Migrate 2.5-flash to auto mode
    setUserStorageItem(uid, 'gemini_model_mode', 'auto');
  } else if (!mode) {
    // Default cho người dùng mới
    setUserStorageItem(uid, 'gemini_model_mode', 'auto');
  }
};

export const validateGeminiModel = async (apiKey: string, modelId: string): Promise<boolean> => {
  try {
    const models = await listAvailableGeminiModels(apiKey);
    const validModels = filterOcrCapableModels(models);
    return validModels.some(m => m.name === `models/${modelId}` || m.name === modelId);
  } catch (error) {
    return false;
  }
};