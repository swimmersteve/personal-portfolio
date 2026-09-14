import test from "node:test";
import assert from "node:assert/strict";
import { readStored, writeStored } from "../src/storage.ts";

test("storage is versioned and separates tab sessions from saved preferences", () => {
  const local = new Map<string, string>(),
    session = new Map<string, string>();
  const adapter = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => map.set(key, v),
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: adapter(local), sessionStorage: adapter(session) },
  });
  assert.equal(writeStored("notes", "hello"), true);
  assert.equal(local.get("aero-portfolio:v1:notes"), '"hello"');
  assert.equal(readStored("notes", ""), "hello");
  writeStored("entered", true, true);
  assert.equal(session.get("aero-portfolio:v1:entered"), "true");
  assert.equal(local.has("aero-portfolio:v1:entered"), false);
  local.set("aero-portfolio:v1:notes", "bad JSON");
  assert.equal(readStored("notes", "fallback"), "fallback");
});
test("blocked browser storage returns fallbacks without throwing", () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error("SecurityError");
      },
      get sessionStorage() {
        throw new Error("SecurityError");
      },
    },
  });
  assert.equal(readStored("notes", "fallback"), "fallback");
  assert.equal(readStored("entered", false, true), false);
  assert.equal(writeStored("notes", "hello"), false);
  assert.equal(writeStored("entered", true, true), false);
});
