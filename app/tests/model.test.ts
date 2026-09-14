import test from "node:test";
import assert from "node:assert/strict";
import {
  boundRect,
  modeRect,
  windowReducer,
  calculate,
  initialCalc,
  type AppWindow,
} from "../src/model.ts";
const viewport = { width: 1280, height: 680 };
test("opening twice focuses one instance; task ordering stays stable", () => {
  let w = windowReducer([], { type: "open", id: "about", viewport });
  w = windowReducer(w, { type: "open", id: "projects", viewport });
  w = windowReducer(w, { type: "open", id: "about", viewport });
  assert.deepEqual(
    w.map((x) => x.id),
    ["about", "projects"],
  );
  assert.ok(w[0].z > w[1].z);
});
test("snap and maximize preserve the original restore bounds", () => {
  let w = windowReducer([], { type: "open", id: "projects", viewport });
  const original = w[0].rect;
  w = windowReducer(w, {
    type: "mode",
    id: "projects",
    mode: "left",
    viewport,
  });
  assert.deepEqual(w[0].rect, { x: 0, y: 0, width: 640, height: 680 });
  w = windowReducer(w, {
    type: "mode",
    id: "projects",
    mode: "maximized",
    viewport,
  });
  w = windowReducer(w, {
    type: "mode",
    id: "projects",
    mode: "normal",
    viewport,
  });
  assert.deepEqual(w[0].rect, original);
});
test("minimized windows preserve their state and can reopen", () => {
  let w = windowReducer([], { type: "open", id: "notepad", viewport });
  const rect = w[0].rect;
  w = windowReducer(w, { type: "minimize", id: "notepad" });
  assert.equal(w[0].minimized, true);
  w = windowReducer(w, { type: "open", id: "notepad", viewport });
  assert.equal(w[0].minimized, false);
  assert.deepEqual(w[0].rect, rect);
  assert.equal(windowReducer(w, { type: "close", id: "notepad" }).length, 0);
});
test("viewport changes keep every window reachable and fill snaps correctly", () => {
  let w: AppWindow[] = [];
  for (const id of ["about", "projects", "notepad"] as const)
    w = windowReducer(w, { type: "open", id, viewport });
  w = windowReducer(w, {
    type: "viewport",
    viewport: { width: 390, height: 600 },
  });
  for (const win of w) {
    assert.ok(win.rect.x >= 0 && win.rect.y >= 0);
    assert.ok(win.rect.x + win.rect.width <= 390);
    assert.ok(win.rect.y + win.rect.height <= 600);
  }
  assert.deepEqual(modeRect("right", w[0].rect, { width: 391, height: 600 }), {
    x: 195,
    y: 0,
    width: 196,
    height: 600,
  });
  assert.deepEqual(
    boundRect(
      { x: -100, y: 900, width: 800, height: 400 },
      { width: 250, height: 190 },
    ),
    { x: 0, y: 0, width: 250, height: 190 },
  );
});
function calc(keys: string[]) {
  return keys.reduce(calculate, initialCalc);
}
test("calculator supports decimals, chaining, and replacing operators", () => {
  assert.equal(calc(["0", ".", "1", "+", "0", ".", "2", "="]).display, "0.3");
  assert.equal(calc(["2", "+", "3", "*", "4", "="]).display, "20");
  assert.equal(calc(["8", "+", "-", "3", "="]).display, "5");
});
test("calculator recovers from division by zero and handles unary operations", () => {
  assert.equal(calc(["5", "/", "0", "="]).display, "Error");
  assert.equal(calc(["5", "/", "0", "=", "7", "+", "1", "="]).display, "8");
  assert.equal(calc(["9", "√"]).display, "3");
  assert.equal(calc(["2", "0", "0", "+", "1", "0", "%", "="]).display, "220");
  assert.equal(calc(["9", "±", "√"]).display, "Error");
});
