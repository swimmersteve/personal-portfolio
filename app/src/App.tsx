import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Application,
  defaultPreferences,
  validPreferences,
} from "./Applications";
import { Icon } from "./Icon";
import { portfolio } from "./content";
import {
  apps,
  boundRect,
  modeRect,
  windowReducer,
  type AppId,
  type AppWindow,
  type Mode,
  type Rect,
  type Viewport,
  type WindowAction,
} from "./model";
import { readStored, useStored, writeStored } from "./storage";

const desktopIds: AppId[] = [
  "about",
  "projects",
  "resume",
  "contact",
  "recycle",
];
const pinnedIds: AppId[] = ["projects", "notepad", "calculator"];
type Positions = Partial<Record<AppId, { x: number; y: number }>>;
function validPositions(v: unknown): v is Positions {
  return (
    !!v &&
    typeof v === "object" &&
    Object.entries(v).every(
      ([key, p]) =>
        key in apps && p && Number.isFinite(p.x) && Number.isFinite(p.y),
    )
  );
}
function viewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight - (window.innerWidth < 768 ? 56 : 40),
  };
}
function cycleMenu(e: KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      "button:not(:disabled),input,a",
    ),
  ).filter((el) => el.offsetParent !== null);
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? items.length - 1
        : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  e.preventDefault();
  items[next]?.focus();
}
export function App() {
  const [stage, setStage] = useState<"boot" | "login" | "desktop" | "off">(
    () =>
      readStored<boolean>("entered", false, true) === true ? "desktop" : "boot",
  );
  const [windows, dispatch] = useReducer(windowReducer, []);
  const [size, setSize] = useState(viewport);
  const [prefs, setPrefs, prefsSaved] = useStored(
    "preferences",
    defaultPreferences,
    validPreferences,
  );
  const [positions, setPositions] = useStored<Positions>(
    "icons",
    {},
    validPositions,
  );
  const [popup, setPopup] = useState<"start" | "clock" | "volume" | null>(null);
  const [query, setQuery] = useState("");
  const [allPrograms, setAllPrograms] = useState(false);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    id?: AppId;
  } | null>(null);
  const [selected, setSelected] = useState<AppId | null>(null);
  const [snap, setSnap] = useState<Mode | null>(null);
  const [now, setNow] = useState(new Date());
  const [preview, setPreview] = useState<AppId | null>(null);
  const launcher = useRef<Partial<Record<AppId, HTMLElement>>>({});
  const shownBefore = useRef<AppId[]>([]);
  const bootTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const active = windows
    .filter((w) => !w.minimized)
    .sort((a, b) => b.z - a.z)[0]?.id;
  const isMobile = size.width < 768;
  function chime() {
    if (prefs.muted || prefs.volume === 0) return;
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      void ctx.resume();
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          t = ctx.currentTime + i * 0.085;
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(
          (prefs.volume / 100) * 0.06,
          t + 0.025,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    } catch {
      /* Audio is optional. */
    }
  }
  function focusWindow(id: AppId) {
    requestAnimationFrame(() =>
      (id === "calculator"
        ? document.querySelector<HTMLElement>(".calculator-app")
        : document.getElementById(`window-${id}`)
      )?.focus({ preventScroll: true }),
    );
  }
  function open(id: AppId) {
    if (
      document.activeElement instanceof HTMLElement &&
      !document.activeElement.closest(".aero-window")
    )
      launcher.current[id] = document.activeElement;
    dispatch({ type: "open", id, viewport: size });
    setPopup(null);
    setContext(null);
    setPreview(null);
    focusWindow(id);
  }
  function close(id: AppId) {
    dispatch({ type: "close", id });
    setContext(null);
    const next = windows
      .filter((w) => w.id !== id && !w.minimized)
      .sort((a, b) => b.z - a.z)[0];
    requestAnimationFrame(() => {
      if (next) focusWindow(next.id);
      else if (launcher.current[id]?.isConnected) launcher.current[id]?.focus();
      else document.getElementById("start-orb")?.focus();
    });
  }
  function minimize(id: AppId) {
    dispatch({ type: "minimize", id });
    setPreview(null);
    const next = windows
      .filter((w) => w.id !== id && !w.minimized)
      .sort((a, b) => b.z - a.z)[0];
    requestAnimationFrame(() =>
      next
        ? focusWindow(next.id)
        : document.getElementById(`task-${id}`)?.focus(),
    );
  }
  function login() {
    writeStored("entered", true, true);
    setStage("desktop");
    chime();
  }
  function restart() {
    writeStored("entered", false, true);
    dispatch({ type: "reset" });
    setPopup(null);
    setStage("boot");
  }
  function shutdown() {
    writeStored("entered", false, true);
    dispatch({ type: "reset" });
    setPopup(null);
    setStage("off");
  }
  function showDesktop() {
    const visible = windows.filter((w) => !w.minimized);
    if (visible.length) {
      shownBefore.current = visible.sort((a, b) => a.z - b.z).map((w) => w.id);
      visible.forEach((w) => dispatch({ type: "minimize", id: w.id }));
    } else {
      shownBefore.current.forEach((id) => dispatch({ type: "focus", id }));
      shownBefore.current = [];
    }
    setPopup(null);
    document.getElementById("show-desktop")?.focus();
  }
  useEffect(() => {
    if (stage === "boot")
      bootTimer.current = setTimeout(() => setStage("login"), 1900);
    return () => {
      if (bootTimer.current) clearTimeout(bootTimer.current);
    };
  }, [stage]);
  useEffect(() => {
    if (stage === "desktop") {
      dispatch({ type: "open", id: "welcome", viewport: viewport() });
      focusWindow("welcome");
    }
  }, [stage]);
  useEffect(() => {
    function resize() {
      const next = viewport();
      setSize(next);
      dispatch({ type: "viewport", viewport: next });
      setContext(null);
    }
    window.addEventListener("resize", resize);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    if (popup === "start") {
      setQuery("");
      setAllPrograms(false);
      requestAnimationFrame(() =>
        document.getElementById("start-search")?.focus(),
      );
    }
  }, [popup]);
  useEffect(() => {
    if (context)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(".context-menu button")
          ?.focus(),
      );
  }, [context]);
  useEffect(() => {
    if (popup === "clock" || popup === "volume")
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`.${popup}-popup`)?.focus(),
      );
  }, [popup]);
  function dismiss() {
    setPopup(null);
    setContext(null);
    setPreview(null);
  }
  function keyboard(e: KeyboardEvent) {
    if (e.key === "Escape") {
      dismiss();
      document.getElementById("start-orb")?.focus();
    }
    if (e.ctrlKey && e.key === "Escape") {
      e.preventDefault();
      setPopup(popup === "start" ? null : "start");
    }
    if (
      e.altKey &&
      active &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      dispatch({
        type: "mode",
        id: active,
        mode: (
          {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "maximized",
            ArrowDown: "normal",
          } as const
        )[e.key as "ArrowLeft"],
        viewport: size,
      });
    }
  }
  const style = {
    "--aero-color": prefs.color,
    "--desktop-wallpaper": `url('/assets/${prefs.wallpaper}.webp')`,
  } as CSSProperties;
  if (stage !== "desktop")
    return (
      <main className={`entry-screen ${stage}`} onKeyDown={keyboard}>
        {stage === "boot" ? (
          <>
            <div className="boot-center">
              <img src="/assets/orb.svg" alt="" />
              <h1>Starting Windows</h1>
              <div className="boot-progress" />
              <button onClick={() => setStage("login")}>Skip startup</button>
            </div>
            <p className="entry-edition">
              Windows 7 <span>Portfolio Edition</span>
            </p>
          </>
        ) : stage === "login" ? (
          <>
            <div className="login-center">
              <button
                className="login-tile"
                onClick={login}
                autoFocus
                aria-label={`Log in as ${portfolio.name}`}
              >
                <div className="login-avatar">
                  <Icon name="user" size={84} />
                </div>
                <span>{portfolio.name}</span>
              </button>
              <p>Click your picture to begin</p>
              <small>No password needed. Just curiosity.</small>
            </div>
            <div className="login-footer">
              <button title="Shut down" onClick={shutdown}>
                Shut down
              </button>
              <p>
                Windows <strong>7</strong>
                <span>Portfolio Edition</span>
              </p>
              <button onClick={restart}>Restart</button>
            </div>
          </>
        ) : (
          <div className="off-center">
            <h1>See you next time.</h1>
            <p>Your desktop will be here when you get back.</p>
            <button onClick={restart}>Start Windows</button>
          </div>
        )}
      </main>
    );
  return (
    <main
      className="desktop"
      style={style}
      onKeyDown={keyboard}
      onPointerDown={(e) => {
        if (!(e.target as Element).closest(".popup,.taskbar,.context-menu"))
          dismiss();
      }}
      onContextMenu={(e) => {
        if ((e.target as Element).closest(".aero-window,.taskbar,.popup"))
          return;
        e.preventDefault();
        setContext({
          x: Math.min(e.clientX, size.width - 225),
          y: Math.min(e.clientY, size.height - 210),
        });
        setPopup(null);
      }}
    >
      <a className="skip-link" href="#start-orb">
        Skip to Start menu
      </a>
      <div
        className="desktop-icons"
        aria-label="Desktop applications"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {desktopIds.map((id, index) => (
          <DesktopIcon
            key={id}
            id={id}
            position={positions[id] ?? { x: 12, y: 12 + index * 98 }}
            size={size}
            selected={selected === id}
            select={() => setSelected(id)}
            open={() => open(id)}
            move={(p) => setPositions({ ...positions, [id]: p })}
            context={(p) => setContext({ ...p, id })}
          />
        ))}
      </div>
      <div className="desktop-signature">
        <span>Windows 7</span>
        <small>Portfolio Edition</small>
      </div>
      {snap && (
        <div
          className="snap-preview"
          style={
            modeRect(
              snap,
              { x: 0, y: 0, width: 0, height: 0 },
              size,
            ) as CSSProperties
          }
        />
      )}
      {windows.map((w) => (
        <DesktopWindow
          key={w.id}
          w={w}
          active={active === w.id}
          size={size}
          mobile={isMobile}
          dispatch={dispatch}
          close={() => close(w.id)}
          minimize={() => minimize(w.id)}
          setSnap={setSnap}
        >
          <Application
            id={w.id}
            open={open}
            preferences={prefs}
            setPreferences={setPrefs}
          />
        </DesktopWindow>
      ))}
      {popup === "start" && (
        <div
          className="start-menu popup"
          role="dialog"
          aria-label="Start menu"
          onKeyDown={cycleMenu}
        >
          <div className="start-left">
            <div className="start-programs">
              {Object.entries(apps)
                .filter(
                  ([id, def]) =>
                    id !== "recycle" &&
                    (allPrograms || query.length > 0 || id !== "personalize") &&
                    `${def.title} ${def.description}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map(([id, def]) => (
                  <button
                    key={id}
                    onClick={() => open(id as AppId)}
                    title={def.description}
                  >
                    <Icon name={def.icon} size={32} />
                    <span>{def.title.replace("Untitled — ", "")}</span>
                  </button>
                ))}
              {Object.entries(apps).filter(
                ([id, a]) =>
                  id !== "recycle" &&
                  (allPrograms || query.length > 0 || id !== "personalize") &&
                  (a.title + " " + a.description)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              ).length === 0 && (
                <p className="no-programs">No programs found.</p>
              )}
            </div>
            <button
              className="all-programs"
              onClick={() => {
                setAllPrograms(!allPrograms);
                setQuery("");
              }}
            >
              {allPrograms ? "◂ Back" : "▸ All Programs"}
            </button>
            <div className="start-search">
              <input
                id="start-search"
                placeholder="Search programs and files"
                aria-label="Search programs and files"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Icon name="search" size={16} />
            </div>
          </div>
          <div className="start-right">
            <div className="start-avatar">
              <Icon name="user" size={48} />
            </div>
            <button className="start-name" onClick={() => open("about")}>
              {portfolio.name}
            </button>
            <button onClick={() => open("projects")}>Documents</button>
            <button onClick={() => open("projects")}>My Projects</button>
            <button onClick={() => open("resume")}>My Résumé</button>
            <button onClick={() => open("contact")}>Contact</button>
            <hr />
            <button onClick={() => open("welcome")}>Computer</button>
            <button onClick={() => open("personalize")}>Control Panel</button>
            <button onClick={() => open("personalize")}>Personalization</button>
            <hr />
            <button onClick={() => open("welcome")}>Help and Support</button>
            <div className="power-buttons">
              <button onClick={shutdown}>Shut down</button>
              <button
                title="Restart Windows"
                aria-label="Restart Windows"
                onClick={restart}
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      )}
      {popup === "clock" && <Calendar now={now} />}
      {popup === "volume" && (
        <div
          className="volume-popup popup"
          role="dialog"
          aria-label="Volume"
          tabIndex={-1}
        >
          <h3>Speakers</h3>
          <Icon name="volume" size={40} />
          <label htmlFor="volume">Volume: {prefs.volume}%</label>
          <input
            id="volume"
            type="range"
            min="0"
            max="100"
            value={prefs.volume}
            onChange={(e) =>
              setPrefs({ ...prefs, volume: Number(e.target.value) })
            }
          />
          <button
            aria-pressed={prefs.muted}
            onClick={() => {
              setPrefs({ ...prefs, muted: !prefs.muted });
            }}
          >
            {prefs.muted ? "Unmute sounds" : "Mute sounds"}
          </button>
          <button onClick={chime} disabled={prefs.muted}>
            Test sound
          </button>
        </div>
      )}
      {context && (
        <div
          className="context-menu"
          role="menu"
          aria-label="Desktop actions"
          style={{ left: Math.max(0, context.x), top: Math.max(0, context.y) }}
          onKeyDown={cycleMenu}
        >
          {context.id && (
            <>
              <button role="menuitem" onClick={() => open(context.id!)}>
                <strong>Open</strong>
              </button>
              <hr />
            </>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setPositions({});
              setContext(null);
            }}
          >
            Arrange icons
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setPositions({});
              setContext(null);
            }}
          >
            Restore icon positions
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setContext(null);
              document.getElementById("start-orb")?.focus();
            }}
          >
            Refresh
          </button>
          <hr />
          <button role="menuitem" onClick={() => open("welcome")}>
            <Icon name="computer" size={16} />
            Getting Started
          </button>
          <button role="menuitem" onClick={() => open("personalize")}>
            <Icon name="personalize" size={16} />
            Personalize
          </button>
        </div>
      )}
      {!prefsSaved && (
        <div className="storage-notice" role="status">
          Preferences apply now, but this browser can’t save them.
        </div>
      )}
      <footer className="taskbar">
        <button
          id="start-orb"
          className={`start-orb ${popup === "start" ? "pressed" : ""}`}
          title="Start"
          aria-label="Start"
          aria-expanded={popup === "start"}
          onClick={() => {
            setPopup(popup === "start" ? null : "start");
            setContext(null);
          }}
        >
          <img src="/assets/orb.svg" alt="" />
          <img className="orb-hover" src="/assets/orb-hover.svg" alt="" />
        </button>
        <div className="taskband">
          {[
            ...pinnedIds,
            ...windows.map((w) => w.id).filter((id) => !pinnedIds.includes(id)),
          ].map((id) => {
            const running = windows.find((w) => w.id === id);
            return (
              <div
                className="task-item"
                key={id}
                onMouseEnter={() => setPreview(running ? id : null)}
                onMouseLeave={() => setPreview(null)}
              >
                <button
                  id={`task-${id}`}
                  className={`task-button ${running ? "running" : ""} ${active === id ? "active" : ""}`}
                  title={apps[id].title}
                  aria-label={`${apps[id].title}${running ? " — running" : ""}`}
                  aria-pressed={active === id}
                  onFocus={() => setPreview(running ? id : null)}
                  onBlur={(e) => {
                    if (
                      !e.currentTarget.parentElement?.contains(e.relatedTarget)
                    )
                      setPreview(null);
                  }}
                  onClick={() => {
                    if (running && active === id) minimize(id);
                    else open(id);
                  }}
                >
                  <Icon name={apps[id].icon} size={32} />
                </button>
                {preview === id && running && (
                  <div className="task-preview">
                    <div className="preview-title">
                      <Icon name={apps[id].icon} size={16} />
                      <span>{apps[id].title}</span>
                      <button
                        title={`Close ${apps[id].title}`}
                        aria-label={`Close ${apps[id].title}`}
                        onClick={() => close(id)}
                      >
                        ×
                      </button>
                    </div>
                    <button
                      className="preview-body has-thumbnail"
                      aria-label={`Restore ${apps[id].title}`}
                      onClick={() => open(id)}
                    >
                      <WindowThumbnail id={id} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="system-tray">
          <button
            className="tray-network"
            title="About this portfolio desktop"
            aria-label="About this desktop"
            onClick={() => open("welcome")}
          >
            <Icon name="network" size={17} />
          </button>
          <button
            title={prefs.muted ? "Speakers: muted" : "Speakers"}
            aria-label="Adjust volume"
            aria-expanded={popup === "volume"}
            onClick={() => setPopup(popup === "volume" ? null : "volume")}
          >
            <Icon name="volume" size={18} />
            {prefs.muted && <span className="mute-mark">×</span>}
          </button>
          <button
            className="tray-clock"
            title={now.toLocaleDateString(undefined, { dateStyle: "full" })}
            aria-label="Open calendar"
            aria-expanded={popup === "clock"}
            onClick={() => setPopup(popup === "clock" ? null : "clock")}
          >
            <span>
              {now.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span>{now.toLocaleDateString()}</span>
          </button>
          <button
            id="show-desktop"
            className="show-desktop"
            title="Show desktop"
            aria-label="Show desktop"
            onClick={showDesktop}
          />
        </div>
      </footer>
    </main>
  );
}

function DesktopIcon({
  id,
  position,
  size,
  selected,
  select,
  open,
  move,
  context,
}: {
  id: AppId;
  position: { x: number; y: number };
  size: Viewport;
  selected: boolean;
  select: () => void;
  open: () => void;
  move: (p: { x: number; y: number }) => void;
  context: (p: { x: number; y: number }) => void;
}) {
  const [dragged, setDragged] = useState<{ x: number; y: number } | null>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
    long: boolean;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const suppressClick = useRef(false);
  const x = Math.max(0, Math.min(dragged?.x ?? position.x, size.width - 86)),
    y = Math.max(0, Math.min(dragged?.y ?? position.y, size.height - 88));
  useEffect(
    () => () => {
      if (gesture.current) clearTimeout(gesture.current.timer);
    },
    [],
  );
  return (
    <button
      className={`desktop-icon ${selected ? "selected" : ""}`}
      style={{ left: x, top: y }}
      title={apps[id].description}
      aria-label={`Open ${apps[id].title}`}
      onClick={() => {
        select();
        if (size.width < 768 && !suppressClick.current) open();
        suppressClick.current = false;
      }}
      onDoubleClick={() => {
        if (!suppressClick.current) open();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
        if (e.shiftKey && e.key === "F10") {
          e.preventDefault();
          context({ x, y });
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        context({
          x: Math.min(e.clientX, size.width - 225),
          y: Math.min(e.clientY, size.height - 230),
        });
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        select();
        e.currentTarget.setPointerCapture(e.pointerId);
        const timer = setTimeout(() => {
          if (gesture.current && !gesture.current.moved) {
            gesture.current.long = true;
            suppressClick.current = true;
            context({
              x: Math.min(x + 70, size.width - 225),
              y: Math.min(y, size.height - 230),
            });
          }
        }, 650);
        gesture.current = {
          x: e.clientX,
          y: e.clientY,
          px: x,
          py: y,
          moved: false,
          long: false,
          timer,
        };
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g) return;
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5) {
          g.moved = true;
          clearTimeout(g.timer);
          setDragged({ x: g.px + e.clientX - g.x, y: g.py + e.clientY - g.y });
        }
      }}
      onPointerUp={() => {
        const g = gesture.current;
        if (!g) return;
        clearTimeout(g.timer);
        suppressClick.current = g.moved || g.long;
        if (g.moved)
          move({
            x: Math.max(0, Math.min(Math.round(x / 10) * 10, size.width - 86)),
            y: Math.max(0, Math.min(Math.round(y / 10) * 10, size.height - 88)),
          });
        gesture.current = null;
        setDragged(null);
      }}
      onPointerCancel={() => {
        if (gesture.current) clearTimeout(gesture.current.timer);
        gesture.current = null;
        setDragged(null);
      }}
    >
      <Icon name={apps[id].icon} size={48} />
      <span>{apps[id].title}</span>
    </button>
  );
}

function DesktopWindow({
  w,
  active,
  size,
  mobile,
  dispatch,
  close,
  minimize,
  setSnap,
  children,
}: {
  w: AppWindow;
  active: boolean;
  size: Viewport;
  mobile: boolean;
  dispatch: (a: WindowAction) => void;
  close: () => void;
  minimize: () => void;
  setSnap: (m: Mode | null) => void;
  children: React.ReactNode;
}) {
  const drag = useRef<{
    x: number;
    y: number;
    rect: Rect;
    edge: string;
    mode: Mode | null;
  } | null>(null);
  const [systemMenu, setSystemMenu] = useState(false);
  const rect = mobile
    ? { x: 0, y: 0, width: size.width, height: size.height }
    : w.rect;
  function start(e: ReactPointerEvent, edge = "move") {
    if (mobile || e.button !== 0 || (e.target as HTMLElement).closest("button"))
      return;
    e.preventDefault();
    dispatch({ type: "focus", id: w.id });
    e.currentTarget.setPointerCapture(e.pointerId);
    const r =
      w.mode === "normal"
        ? w.rect
        : boundRect(
            {
              ...w.restore,
              x: e.clientX - w.restore.width / 2,
              y: e.clientY - 14,
            },
            size,
          );
    drag.current = { x: e.clientX, y: e.clientY, rect: r, edge, mode: null };
  }
  function moving(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    let next = { ...d.rect };
    if (d.edge === "move") {
      next.x += dx;
      next.y += dy;
      d.mode =
        e.clientY < 22
          ? "maximized"
          : e.clientX < 22
            ? "left"
            : e.clientX > size.width - 22
              ? "right"
              : null;
      setSnap(d.mode);
    } else {
      const minW = Math.min(300, size.width),
        minH = Math.min(240, size.height);
      if (d.edge.includes("e")) next.width = Math.max(minW, d.rect.width + dx);
      if (d.edge.includes("s"))
        next.height = Math.max(minH, d.rect.height + dy);
      if (d.edge.includes("w")) {
        next.width = Math.max(minW, d.rect.width - dx);
        next.x = d.rect.x + d.rect.width - next.width;
      }
      if (d.edge.includes("n")) {
        next.height = Math.max(minH, d.rect.height - dy);
        next.y = d.rect.y + d.rect.height - next.height;
      }
    }
    dispatch({ type: "rect", id: w.id, rect: boundRect(next, size) });
  }
  function end() {
    if (drag.current?.mode)
      dispatch({
        type: "mode",
        id: w.id,
        mode: drag.current.mode,
        viewport: size,
      });
    drag.current = null;
    setSnap(null);
  }
  function mode(mode: Mode) {
    dispatch({ type: "mode", id: w.id, mode, viewport: size });
    setSystemMenu(false);
  }
  return (
    <section
      id={`window-${w.id}`}
      className={`window glass aero-window ${active ? "active" : ""} ${w.minimized ? "minimized" : ""} ${w.mode === "maximized" || mobile ? "maximized" : ""}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: w.z,
      }}
      role="dialog"
      aria-label={apps[w.id].title}
      aria-hidden={w.minimized}
      tabIndex={-1}
      inert={w.minimized}
      onPointerDown={() => {
        if (!active) dispatch({ type: "focus", id: w.id });
      }}
      onFocus={() => {
        if (!active) dispatch({ type: "focus", id: w.id });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setSystemMenu(false);
        if (e.altKey && e.key === "F4") {
          e.preventDefault();
          close();
        }
        if (e.altKey && e.code === "Space") {
          e.preventDefault();
          setSystemMenu(!systemMenu);
        }
      }}
    >
      <div
        className="title-bar"
        onPointerDown={start}
        onPointerMove={moving}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest("button"))
            mode(w.mode === "maximized" ? "normal" : "maximized");
        }}
      >
        <div className="title-bar-text">
          <button
            className="window-system-button"
            aria-label={`Window options for ${apps[w.id].title}`}
            title="Window options"
            onClick={() => setSystemMenu(!systemMenu)}
          >
            <Icon name={apps[w.id].icon} size={16} />
          </button>
          <span>{apps[w.id].title}</span>
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" title="Minimize" onClick={minimize} />
          <button
            aria-label={w.mode === "maximized" ? "Restore" : "Maximize"}
            className={w.mode === "maximized" ? "is-restore" : "is-maximize"}
            title={w.mode === "maximized" ? "Restore down" : "Maximize"}
            onClick={() =>
              mode(w.mode === "maximized" ? "normal" : "maximized")
            }
          />
          <button aria-label="Close" title="Close" onClick={close} />
        </div>
      </div>
      <div className="window-body">{children}</div>
      {systemMenu && (
        <div
          className="context-menu window-menu"
          role="menu"
          aria-label="Window actions"
          onKeyDown={cycleMenu}
        >
          <button role="menuitem" onClick={() => mode("normal")}>
            Restore
          </button>
          <button
            role="menuitem"
            onClick={() => {
              minimize();
              setSystemMenu(false);
            }}
          >
            Minimize
          </button>
          <button role="menuitem" onClick={() => mode("maximized")}>
            Maximize
          </button>
          <button role="menuitem" onClick={() => mode("left")}>
            Snap left <small>Alt + ←</small>
          </button>
          <button role="menuitem" onClick={() => mode("right")}>
            Snap right <small>Alt + →</small>
          </button>
          <hr />
          <button role="menuitem" onClick={close}>
            Close
          </button>
        </div>
      )}
      {!mobile &&
        w.mode === "normal" &&
        ["n", "ne", "e", "se", "s", "sw", "w", "nw"].map((edge) => (
          <div
            key={edge}
            className={`resize-handle resize-${edge}`}
            onPointerDown={(e) => start(e, edge)}
            onPointerMove={moving}
            onPointerUp={end}
            onPointerCancel={end}
          />
        ))}
    </section>
  );
}
function WindowThumbnail({ id }: { id: AppId }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const source = document.querySelector<HTMLElement>(
      `#window-${id} > .window-body`,
    );
    if (!source || !host.current) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.inert = true;
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone
      .querySelectorAll("input,textarea,button,a,[tabindex]")
      .forEach((el) => el.setAttribute("tabindex", "-1"));
    const width = source.offsetWidth,
      height = source.offsetHeight,
      scale = Math.min(224 / width, 126 / height);
    Object.assign(clone.style, {
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${scale})`,
      left: `${(224 - width * scale) / 2}px`,
      top: `${(126 - height * scale) / 2}px`,
    });
    host.current.replaceChildren(clone);
    return () => clone.remove();
  }, [id]);
  return <span ref={host} className="preview-thumbnail" aria-hidden="true" />;
}
function Calendar({ now }: { now: Date }) {
  const [month, setMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const offset = month.getDay(),
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <div
      className="clock-popup popup"
      role="dialog"
      aria-label="Calendar"
      tabIndex={-1}
    >
      <h3>
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </h3>
      <div className="calendar-heading">
        <button
          aria-label="Previous month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          ‹
        </button>
        <strong>
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          aria-label="Next month"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <b key={day}>{day}</b>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => (
          <span
            className={
              i + 1 === now.getDate() &&
              month.getMonth() === now.getMonth() &&
              month.getFullYear() === now.getFullYear()
                ? "today"
                : ""
            }
            key={i}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <time>{now.toLocaleTimeString()}</time>
      <button
        className="text-link"
        onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
      >
        Today
      </button>
    </div>
  );
}
