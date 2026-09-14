import { useState } from "react";
const prefix = "aero-portfolio:v1:";
export function readStored<T>(key: string, fallback: T, session = false): T {
  try {
    const raw = (session ? window.sessionStorage : window.localStorage).getItem(
      prefix + key,
    );
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function writeStored(
  key: string,
  value: unknown,
  session = false,
): boolean {
  try {
    (session ? window.sessionStorage : window.localStorage).setItem(
      prefix + key,
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}
export function useStored<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
) {
  const [value, setValue] = useState<T>(() => {
    const v = readStored<unknown>(key, fallback);
    return validate(v) ? v : fallback;
  });
  const [saved, setSaved] = useState(true);
  function update(next: T) {
    setValue(next);
    setSaved(writeStored(key, next));
  }
  return [value, update, saved] as const;
}
