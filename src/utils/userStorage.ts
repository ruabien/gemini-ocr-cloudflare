export function getUserStorageKey(uid: string, keyType: 'gemini_keys' | 'ocr_model' | 'settings'): string {
  return `lexocr:${uid}:${keyType}`;
}

export function getUserStorageItem(
  uid: string | undefined | null,
  keyType: 'gemini_keys' | 'ocr_model' | 'settings'
): string | null {
  if (!uid) return null;
  return localStorage.getItem(getUserStorageKey(uid, keyType));
}

export function setUserStorageItem(
  uid: string | undefined | null,
  keyType: 'gemini_keys' | 'ocr_model' | 'settings',
  value: string
): void {
  if (!uid) return;
  localStorage.setItem(getUserStorageKey(uid, keyType), value);
}

export function removeUserStorageItem(
  uid: string | undefined | null,
  keyType: 'gemini_keys' | 'ocr_model' | 'settings'
): void {
  if (!uid) return;
  localStorage.removeItem(getUserStorageKey(uid, keyType));
}