export function getUserStorageKey(uid: string | undefined | null, keyType: string): string {
  const userSegment = uid || "guest";
  return `lexocr:${userSegment}:${keyType}`;
}

export function getUserStorageItem(
  uid: string | undefined | null,
  keyType: string
): string | null {
  return localStorage.getItem(getUserStorageKey(uid, keyType));
}

export function setUserStorageItem(
  uid: string | undefined | null,
  keyType: string,
  value: string
): void {
  localStorage.setItem(getUserStorageKey(uid, keyType), value);
}

export function removeUserStorageItem(
  uid: string | undefined | null,
  keyType: string
): void {
  localStorage.removeItem(getUserStorageKey(uid, keyType));
}