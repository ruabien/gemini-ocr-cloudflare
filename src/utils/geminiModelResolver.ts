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

export const POLICY_VERSION = 2; // Incrementing invalidates old model caches

 // Priority list for auto mode
const OCR_MODEL_PRIORITY = [
  "gemini-2.5-flash"
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

  for (const preferred of OCR_MODEL_PRIORITY) {
    if (modelNames.has(preferred)) {
      return preferred;
    }
  }

  // Ưu tiên availableModels của API key
  // Không chọn model không nằm trong availableModels
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
  let staleCache: any = null;
  if (!force) {
    const cachedObj = getUserStorageItem(uid, 'gemini_model_cache');
    if (cachedObj) {
      try {
        const cache = JSON.parse(cachedObj);
        if (cache.policyVersion === POLICY_VERSION && cache.keyHash === keyHash) {
          if (cache.timestamp > Date.now() - CACHE_TTL_MS) {
            if (cache.resolvedModel) {
              return cache.resolvedModel;
            }
          } else {
            // Đánh dấu stale
            staleCache = cache;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }

  // Call API
  try {
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
      policyVersion: POLICY_VERSION,
      keyHash,
      resolvedModel: bestModel,
      availableModels: ocrCapable.map(m => m.name.replace('models/', '')),
      timestamp: Date.now()
    }));

    return bestModel;
  } catch (err: any) {
    // Nếu stale: cho phép kiểm tra lại trước OCR
    // Nếu không kiểm tra được: có thể dùng cache cũ
    if (staleCache && staleCache.resolvedModel) {
      return staleCache.resolvedModel;
    }
    throw err;
  }
};

import { requireResolvedGeminiModel as sharedRequireResolvedGeminiModel } from "../../shared/geminiModelResolver";
export const requireResolvedGeminiModel = sharedRequireResolvedGeminiModel;

export const getActiveModel = (uid: string | null | undefined, apiKey?: string): string => {
  const modelMode = getUserStorageItem(uid, 'gemini_model_mode') || 'auto';
  
  let keyAvailableModels: string[] | null = null;
  if (apiKey) {
    const cachedObj = getUserStorageItem(uid, 'gemini_model_cache');
    if (cachedObj) {
      try {
        const cache = JSON.parse(cachedObj);
        if (cache.keyHash === hashKey(apiKey) && Array.isArray(cache.availableModels)) {
          keyAvailableModels = cache.availableModels;
        }
      } catch(e) {}
    }
    if (!keyAvailableModels) {
      const metaStr = getUserStorageItem(uid, `gemini_key_metadata_${apiKey}`);
      if (metaStr) {
        try {
          const meta = JSON.parse(metaStr);
          if (Array.isArray(meta.availableModels)) {
            keyAvailableModels = meta.availableModels.map((m: any) => m.name);
          }
        } catch(e) {}
      }
    }
  }

  let selectedModel: string | null = null;

  if (modelMode === 'auto') {
    if (apiKey) {
      const cachedObj = getUserStorageItem(uid, 'gemini_model_cache');
      if (cachedObj) {
        try {
          const cache = JSON.parse(cachedObj);
          if (cache.keyHash === hashKey(apiKey) && cache.resolvedModel) {
            selectedModel = cache.resolvedModel;
          }
        } catch (e) {}
      }
    }
    if (!selectedModel) {
      selectedModel = getUserStorageItem(uid, 'gemini_resolved_model');
    }
  } else {
    selectedModel = getUserStorageItem(uid, 'ocr_model');
  }

  if (!selectedModel) {
    throw new Error("MODEL_NOT_RESOLVED");
  }

  const cleanModel = requireResolvedGeminiModel(selectedModel);

  // In Manual mode, do NOT auto‑switch to another model.
  // If the user‑selected model is not supported by the API key,
  // throw a structured error that UI can handle.
  if (modelMode === 'manual' && keyAvailableModels && keyAvailableModels.length > 0 && !keyAvailableModels.includes(cleanModel)) {
    const err: any = {
      ok: false,
      errorType: "MANUAL_MODEL_UNSUPPORTED",
      selectedModel: cleanModel,
      availableModels: keyAvailableModels
    };
    throw err;
  }

  return cleanModel;
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

  if (!ocrModel || ocrModel === 'gemini-3.5-flash' || ocrModel === 'gemini-1.5-flash') {
    // Reset to verified model by default, but let user change manually if desired
    setUserStorageItem(uid, 'ocr_model', 'gemini-2.5-flash');
  }

  if (!mode) {
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

/**
 * Migration function for metadata (migrating old array of string structures to new format).
 * Returns true if migration was performed.
 */
export const migrateMetadataObj = (metadata: any): boolean => {
  if (metadata && Array.isArray(metadata.availableModels) && metadata.availableModels.length > 0) {
    if (typeof metadata.availableModels[0] === 'string') {
      metadata.availableModels = metadata.availableModels.map((m: string) => ({
        name: m,
        supportsGenerateContent: true
      }));
      return true;
    }
  }
  return false;
};

/**
 * Checks model availability for an API key and saves the metadata.
 */
export const checkAndSaveKeyMetadata = async (apiKey: string, uid?: string | null): Promise<void> => {
  const checkedAt = Date.now();
  let status = "success";
  let availableModels: Array<{ name: string; supportsGenerateContent: boolean }> = [];
  let errorType: string | null = null;
  let errorMessage: string | null = null;

  try {
    const models = await listAvailableGeminiModels(apiKey);
    availableModels = models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        name: m.name.replace('models/', ''),
        supportsGenerateContent: true
      }));
  } catch (error: any) {
    status = "error";
    errorType = error.message || "UNKNOWN";
    errorMessage = error.toString();
  }

  const metadata = {
    checkedAt,
    status,
    availableModels,
    errorType,
    errorMessage
  };

  setUserStorageItem(uid, `gemini_key_metadata_${apiKey}`, JSON.stringify(metadata));
};

/**
 * Get metadata for an API key, performs on-the-fly migration to memory, and writes back if migrated.
 */
export const getKeyMetadataWithMigration = (apiKey: string, uid?: string | null): any => {
  const metaStr = getUserStorageItem(uid, `gemini_key_metadata_${apiKey}`);
  if (!metaStr) return null;
  try {
    const parsed = JSON.parse(metaStr);
    if (migrateMetadataObj(parsed)) {
      setUserStorageItem(uid, `gemini_key_metadata_${apiKey}`, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    return null;
  }
};
