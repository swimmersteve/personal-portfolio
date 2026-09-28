export type AppId =
  | "chat"
  | "welcome"
  | "about"
  | "projects"
  | "resume"
  | "contact"
  | "notepad"
  | "calculator"
  | "personalize"
  | "recycle";
export interface AppDefinition {
  title: string;
  icon: string;
  width: number;
  height: number;
  description: string;
}
export const apps: Record<AppId, AppDefinition> = {
  chat: {
    title: "Chat with Steve",
    icon: "aim",
    width: 720,
    height: 570,
    description: "Chat with Steve's digital twin about his experience and projects",
  },
  welcome: {
    title: "Getting Started",
    icon: "computer",
    width: 670,
    height: 465,
    description: "Welcome to your desktop",
  },
  about: {
    title: "About Me",
    icon: "user",
    width: 680,
    height: 510,
    description: "Meet the person behind the work",
  },
  projects: {
    title: "My Projects",
    icon: "folder",
    width: 820,
    height: 550,
    description: "Browse selected work and experiments",
  },
  resume: {
    title: "My Résumé",
    icon: "notepad",
    width: 620,
    height: 480,
    description: "Experience and background",
  },
  contact: {
    title: "Contact Me",
    icon: "mail",
    width: 650,
    height: 470,
    description: "Let’s start a conversation",
  },
  notepad: {
    title: "Untitled — Notepad",
    icon: "notepad",
    width: 650,
    height: 450,
    description: "A space for your thoughts",
  },
  calculator: {
    title: "Calculator",
    icon: "calculator",
    width: 310,
    height: 395,
    description: "Standard calculator",
  },
  personalize: {
    title: "Personalization",
    icon: "personalize",
    width: 740,
    height: 540,
    description: "Make this desktop your own",
  },
  recycle: {
    title: "Recycle Bin",
    icon: "trash",
    width: 610,
    height: 390,
    description: "This folder is empty",
  },
};
export type Rect = { x: number; y: number; width: number; height: number };
export type Mode = "normal" | "maximized" | "left" | "right";
export interface AppWindow {
  id: AppId;
  rect: Rect;
  restore: Rect;
  mode: Mode;
  minimized: boolean;
  z: number;
}
export type Viewport = { width: number; height: number };
export function boundRect(r: Rect, v: Viewport): Rect {
  const width = Math.min(Math.max(280, r.width), v.width);
  const height = Math.min(Math.max(220, r.height), v.height);
  return {
    width,
    height,
    x: Math.max(0, Math.min(r.x, v.width - width)),
    y: Math.max(0, Math.min(r.y, v.height - height)),
  };
}
export function modeRect(mode: Mode, r: Rect, v: Viewport): Rect {
  if (mode === "normal") return boundRect(r, v);
  if (mode === "maximized") return { x: 0, y: 0, ...v };
  const width = Math.floor(v.width / 2);
  return {
    x: mode === "left" ? 0 : width,
    y: 0,
    width: mode === "left" ? width : v.width - width,
    height: v.height,
  };
}
export type WindowAction =
  | { type: "open"; id: AppId; viewport: Viewport }
  | { type: "focus" | "close" | "minimize"; id: AppId }
  | { type: "mode"; id: AppId; mode: Mode; viewport: Viewport }
  | { type: "rect"; id: AppId; rect: Rect }
  | { type: "viewport"; viewport: Viewport }
  | { type: "show-desktop" }
  | { type: "reset" };
export function windowReducer(
  state: AppWindow[],
  action: WindowAction,
): AppWindow[] {
  const nextZ = Math.max(0, ...state.map((w) => w.z)) + 1;
  if (action.type === "reset") return [];
  if (action.type === "show-desktop") {
    const visible = state.some((w) => !w.minimized);
    return state.map((w) => ({ ...w, minimized: visible }));
  }
  if (action.type === "viewport")
    return state.map((w) => ({
      ...w,
      rect: modeRect(w.mode, w.rect, action.viewport),
      restore: boundRect(w.restore, action.viewport),
    }));
  if (action.type === "open") {
    if (state.some((w) => w.id === action.id))
      return state.map((w) =>
        w.id === action.id ? { ...w, minimized: false, z: nextZ } : w,
      );
    const def = apps[action.id],
      v = action.viewport;
    const offset = state.length * 24;
    const rect = boundRect(
      {
        x: (v.width - def.width) / 2 + offset,
        y: Math.max(40, (v.height - def.height) / 2 - 22) + offset,
        width: def.width,
        height: def.height,
      },
      v,
    );
    return [
      ...state,
      {
        id: action.id,
        rect,
        restore: rect,
        mode: "normal",
        minimized: false,
        z: nextZ,
      },
    ];
  }
  if (action.type === "close") return state.filter((w) => w.id !== action.id);
  return state.map((w) => {
    if (w.id !== action.id) return w;
    if (action.type === "focus") return { ...w, z: nextZ, minimized: false };
    if (action.type === "minimize") return { ...w, minimized: true };
    if (action.type === "rect")
      return { ...w, rect: action.rect, restore: action.rect, mode: "normal" };
    if (action.type === "mode")
      return {
        ...w,
        mode: action.mode,
        restore: w.mode === "normal" ? w.rect : w.restore,
        rect: modeRect(
          action.mode,
          action.mode === "normal" ? w.restore : w.rect,
          action.viewport,
        ),
        z: nextZ,
      };
    return w;
  });
}
export interface CalcState {
  display: string;
  stored: number | null;
  operator: string | null;
  fresh: boolean;
  history: string;
}
export const initialCalc: CalcState = {
  display: "0",
  stored: null,
  operator: null,
  fresh: true,
  history: "",
};
export function calculate(s: CalcState, key: string): CalcState {
  if (key === "C" || key === "Escape") return { ...initialCalc };
  if (s.display === "Error") s = { ...initialCalc };
  if (/^\d$/.test(key))
    return {
      ...s,
      display:
        s.fresh || s.display === "0"
          ? key
          : s.display.length < 15
            ? s.display + key
            : s.display,
      fresh: false,
    };
  if (key === ".")
    return {
      ...s,
      display: s.fresh
        ? "0."
        : s.display.includes(".")
          ? s.display
          : s.display + ".",
      fresh: false,
    };
  if (key === "Backspace")
    return {
      ...s,
      display: s.display.length > 1 ? s.display.slice(0, -1) : "0",
    };
  if (key === "CE") return { ...s, display: "0", fresh: true };
  if (key === "±") return { ...s, display: String(-Number(s.display)) };
  if (key === "%")
    return {
      ...s,
      display: String(
        s.stored !== null
          ? (s.stored * Number(s.display)) / 100
          : Number(s.display) / 100,
      ),
    };
  if (key === "√" || key === "1/x") {
    const n = Number(s.display);
    return {
      ...s,
      display: (key === "√" ? n < 0 : n === 0)
        ? "Error"
        : String(Number((key === "√" ? Math.sqrt(n) : 1 / n).toPrecision(12))),
      fresh: true,
    };
  }
  if (["+", "-", "*", "/", "=", "Enter"].includes(key)) {
    let value = Number(s.display);
    if (s.operator && s.stored !== null && !s.fresh) {
      const a = s.stored;
      value =
        s.operator === "+"
          ? a + value
          : s.operator === "-"
            ? a - value
            : s.operator === "*"
              ? a * value
              : a / value;
      if (!Number.isFinite(value)) return { ...initialCalc, display: "Error" };
    }
    const finish = key === "=" || key === "Enter";
    return {
      display: String(Number(value.toPrecision(12))),
      stored: finish ? null : value,
      operator: finish ? null : key,
      fresh: true,
      history: finish ? "" : `${Number(value.toPrecision(12))} ${key}`,
    };
  }
  return s;
}
