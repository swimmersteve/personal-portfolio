import { useState } from "react";
import { portfolio } from "./content";
import { Icon } from "./Icon";
import { apps, calculate, initialCalc, type AppId } from "./model";
import { useStored } from "./storage";

export interface Preferences {
  wallpaper: "wallpaper" | "starter" | "logon";
  color: string;
  muted: boolean;
  volume: number;
}
export const defaultPreferences: Preferences = {
  wallpaper: "wallpaper",
  color: "#73aad3",
  muted: true,
  volume: 50,
};
export function validPreferences(v: unknown): v is Preferences {
  if (!v || typeof v !== "object") return false;
  const p = v as Preferences;
  return (
    ["wallpaper", "starter", "logon"].includes(p.wallpaper) &&
    /^#[\da-f]{6}$/i.test(p.color) &&
    typeof p.muted === "boolean" &&
    Number.isFinite(p.volume) &&
    p.volume >= 0 &&
    p.volume <= 100
  );
}
type Props = {
  id: AppId;
  open: (id: AppId) => void;
  preferences: Preferences;
  setPreferences: (p: Preferences) => void;
};
export function Application({ id, open, preferences, setPreferences }: Props) {
  if (id === "welcome") return <Welcome open={open} />;
  if (id === "projects") return <Projects open={open} />;
  if (id === "about") return <About open={open} />;
  if (id === "resume") return <Resume />;
  if (id === "contact") return <Contact />;
  if (id === "notepad") return <Notepad />;
  if (id === "calculator") return <Calculator />;
  if (id === "personalize")
    return (
      <Personalization
        preferences={preferences}
        setPreferences={setPreferences}
      />
    );
  return (
    <>
      <Toolbar title="Recycle Bin" />
      <div className="empty-folder">This folder is empty.</div>
      <div className="statusbar">0 items</div>
    </>
  );
}
function Toolbar({
  title,
  back,
  search,
  setSearch,
}: {
  title: string;
  back?: () => void;
  search?: string;
  setSearch?: (s: string) => void;
}) {
  return (
    <div className="explorer-navigation">
      <button
        className="nav-back"
        aria-label="Back to project folders"
        disabled={!back}
        onClick={back}
      >
        <Icon name="back" size={20} />
      </button>
      <div className="breadcrumb">
        <Icon name="folder" size={16} />
        <span>Portfolio</span>
        <span className="crumb-separator">›</span>
        <span>{title}</span>
      </div>
      {setSearch && (
        <div className="search-field">
          <input
            aria-label="Search projects"
            placeholder="Search My Projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Icon name="search" size={16} />
        </div>
      )}
    </div>
  );
}
function Welcome({ open }: { open: Props["open"] }) {
  return (
    <div className="welcome-app">
      <div className="welcome-banner">
        <Icon name="computer" size={64} />
        <div>
          <h1>Make yourself at home.</h1>
          <p>A familiar desktop. A different kind of portfolio.</p>
        </div>
      </div>
      <div className="welcome-main">
        <h2>There’s a little more to explore.</h2>
        <p>
          Open a folder, move a window, look around.
          <br />
          <span className="desktop-hint">
            Everything starts with a double-click.
          </span>
          <span className="touch-hint">Tap an icon to get started.</span>
        </p>
        <div className="welcome-actions">
          <button className="command-link" onClick={() => open("projects")}>
            <Icon name="folder" size={48} />
            <span>
              <strong>Explore my projects</strong>
              <small>A few things worth opening</small>
            </span>
            <span className="command-arrow">›</span>
          </button>
          <button className="command-link" onClick={() => open("about")}>
            <Icon name="user" size={48} />
            <span>
              <strong>Get to know me</strong>
              <small>The person behind the desktop</small>
            </span>
            <span className="command-arrow">›</span>
          </button>
        </div>
      </div>
      <div className="welcome-footer">
        <Icon name="personalize" size={20} />
        <button className="text-link" onClick={() => open("personalize")}>
          Make this desktop yours
        </button>
        <span>Windows 7 · Portfolio Edition</span>
      </div>
    </div>
  );
}
function About({ open }: { open: Props["open"] }) {
  return (
    <>
      <Toolbar title="About Me" />
      <div className="content-page">
        <div className="identity">
          <div className="profile-frame">
            <Icon name="user" size={64} />
          </div>
          <div>
            <span className="eyebrow">HELLO, WORLD</span>
            <h1>{portfolio.name}</h1>
            <p>{portfolio.role}</p>
          </div>
        </div>
        {portfolio.sample && <div className="sample-label">Sample content</div>}
        <h2>{portfolio.introduction}</h2>
        <p>{portfolio.biography}</p>
        <h3>A few things I’m into</h3>
        <div className="skill-list">
          {portfolio.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="page-actions">
          <button onClick={() => open("projects")}>View my projects</button>
          <button onClick={() => open("contact")}>Get in touch</button>
        </div>
        <div className="about-credit">
          An independent desktop tribute. Windows imagery and trademarks belong
          to Microsoft.{" "}
          <a href="/assets/credits.txt" target="_blank" rel="noreferrer">
            Asset credits
          </a>
        </div>
      </div>
    </>
  );
}
function Projects({ open }: { open: Props["open"] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const project = portfolio.projects.find((p) => p.id === selected);
  const filtered = portfolio.projects.filter((p) =>
    (p.title + " " + p.category).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="explorer">
      <Toolbar
        title={project?.title ?? "My Projects"}
        back={selected ? () => setSelected(null) : undefined}
        search={query}
        setSearch={(q) => {
          setQuery(q);
          setSelected(null);
        }}
      />
      <div className="explorer-tools">
        <span>{project ? "Project details" : "Arrange by: Folder"}</span>
        <span>
          {project ? "Sample portfolio project" : `${filtered.length} folders`}
        </span>
      </div>
      <div className="explorer-layout">
        <nav className="explorer-sidebar" aria-label="Portfolio folders">
          <h3>Favorites</h3>
          <button onClick={() => open("welcome")}>
            <Icon name="computer" size={16} />
            Desktop
          </button>
          <h3>Libraries</h3>
          <button
            className="selected"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
          >
            <Icon name="folder" size={16} />
            My Projects
          </button>
          <button onClick={() => open("about")}>
            <Icon name="user" size={16} />
            About Me
          </button>
          <button onClick={() => open("resume")}>
            <Icon name="notepad" size={16} />
            My Résumé
          </button>
          <h3>Network</h3>
          <button onClick={() => open("contact")}>
            <Icon name="mail" size={16} />
            Contact Me
          </button>
        </nav>
        <div className="project-content">
          {project ? (
            <article className="project-detail">
              <div className="project-heading">
                <Icon name="folder" size={64} />
                <div>
                  {project.sample && (
                    <div className="sample-label">Sample project</div>
                  )}
                  <h1>{project.title}</h1>
                  <p>{project.category}</p>
                </div>
              </div>
              <h2>Behind the project</h2>
              <p>{project.description}</p>
              <dl>
                <dt>Role</dt>
                <dd>{project.role}</dd>
                <dt>Tools & process</dt>
                <dd>{project.tools.join(" · ")}</dd>
              </dl>
              {project.url ? (
                <a
                  className="button-link"
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open project
                </a>
              ) : (
                <p className="unavailable">
                  <Icon name="network" size={16} /> Project link hasn’t been
                  added yet.
                </p>
              )}
              <button onClick={() => setSelected(null)}>
                Back to all projects
              </button>
            </article>
          ) : (
            <>
              <h1 className="library-title">My Projects</h1>
              <p className="library-subtitle">
                A collection of work, ideas, and things in between.
              </p>
              <div className="project-grid">
                {filtered.map((p) => (
                  <button
                    className="project-folder"
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    <Icon name="folder" size={72} />
                    <strong>{p.title}</strong>
                    <span>{p.category}</span>
                    {p.sample && <small>Sample project</small>}
                  </button>
                ))}
              </div>
              {filtered.length === 0 && <p>No projects match “{query}”.</p>}
              <div className="folder-note">
                Open a folder to take a closer look.
              </div>
            </>
          )}
        </div>
      </div>
      <div className="statusbar">
        <Icon name="folder" size={18} />
        <span>{project ? project.title : `${filtered.length} items`}</span>
        <span>Portfolio library</span>
      </div>
    </div>
  );
}
function Resume() {
  return (
    <>
      <Toolbar title="My Résumé" />
      <div className="content-page resume-page">
        <Icon name="notepad" size={64} />
        <h1>A little more on paper.</h1>
        <p>Experience, skills, and the path so far.</p>
        {portfolio.resumeUrl ? (
          <>
            <p>The résumé is ready to view or download.</p>
            <a
              className="button-link"
              href={portfolio.resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open résumé
            </a>
          </>
        ) : (
          <div className="empty-state">
            <h2>No résumé attached yet</h2>
            <p>
              A résumé will appear here once it’s been added.
              <br />
              Check back for the full story.
            </p>
            <button disabled>Download résumé</button>
          </div>
        )}
      </div>
    </>
  );
}
function Contact() {
  return (
    <>
      <Toolbar title="Contact Me" />
      <div className="content-page">
        <div className="contact-heading">
          <Icon name="mail" size={56} />
          <div>
            <h1>Let’s start a conversation.</h1>
            <p>Good things often begin with a hello.</p>
          </div>
        </div>
        <div className="contact-list">
          {portfolio.links.map((link) => (
            <div className="contact-row" key={link.label}>
              <Icon
                name={link.label === "Email" ? "mail" : "network"}
                size={28}
              />
              <div>
                <strong>{link.label}</strong>
                <p>{link.detail}</p>
              </div>
              {link.url ? (
                <a href={link.url} target="_blank" rel="noreferrer">
                  Open {link.label}
                </a>
              ) : (
                <span>Not added yet</span>
              )}
            </div>
          ))}
        </div>
        {!portfolio.links.some((link) => link.url) && (
          <p className="muted-text">
            Contact details are waiting to be added to this portfolio.
          </p>
        )}
      </div>
    </>
  );
}
function Notepad() {
  const [text, setText, saved] = useStored(
    "notes",
    "Welcome to Notepad.\n\nA little space to think. Your notes stay in this browser.\n",
    (v): v is string => typeof v === "string",
  );
  const [wrap, setWrap] = useState(true);
  const [notice, setNotice] = useState("");
  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "My notes.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Downloaded My notes.txt");
  }
  return (
    <div className="notepad-app">
      <div className="app-menubar">
        <button onClick={download}>Save as…</button>
        <button
          onClick={() => {
            setText(text);
            setNotice("Notes saved in this browser.");
          }}
        >
          Save
        </button>
        <button aria-pressed={wrap} onClick={() => setWrap(!wrap)}>
          Word wrap {wrap ? "✓" : ""}
        </button>
      </div>
      <textarea
        aria-label="Notepad text"
        spellCheck={false}
        wrap={wrap ? "soft" : "off"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setNotice("");
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            download();
          }
        }}
      />
      <div className="statusbar" role="status">
        <span>
          {!saved
            ? "Storage unavailable — use Save as…"
            : notice || "Saved on this device"}
        </span>
        <span>{text.length} characters · UTF-8</span>
      </div>
    </div>
  );
}
function Calculator() {
  const [state, setState] = useState(initialCalc);
  const keys = [
    "Backspace",
    "CE",
    "C",
    "±",
    "√",
    "7",
    "8",
    "9",
    "/",
    "%",
    "4",
    "5",
    "6",
    "*",
    "1/x",
    "1",
    "2",
    "3",
    "-",
    "=",
    "0",
    ".",
    "+",
  ];
  function press(key: string) {
    setState((s) => calculate(s, key));
  }
  return (
    <div
      className="calculator-app"
      tabIndex={0}
      aria-label="Standard calculator"
      onKeyDown={(e) => {
        if (
          /^[\d.+\-*/%=]$/.test(e.key) ||
          ["Enter", "Escape", "Backspace"].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
          press(e.key);
        }
      }}
    >
      <div className="calc-mode">Standard</div>
      <div className="calc-display">
        <small>{state.history || "\u00a0"}</small>
        <output aria-live="polite" aria-label="Calculator result">
          {state.display}
        </output>
      </div>
      <div className="calc-keys">
        {keys.map((key) => (
          <button
            key={key}
            className={`${/\d/.test(key) ? "number" : ""} ${key === "=" ? "equals" : ""} ${key === "0" ? "zero" : ""}`}
            aria-label={key === "Backspace" ? "Backspace" : key}
            onClick={() => press(key)}
          >
            {key === "Backspace"
              ? "←"
              : key === "*"
                ? "×"
                : key === "/"
                  ? "÷"
                  : key}
          </button>
        ))}
      </div>
      <p className="calc-tip">You can use your keyboard, too.</p>
    </div>
  );
}
function Personalization({
  preferences: p,
  setPreferences: set,
}: Pick<Props, "preferences" | "setPreferences">) {
  const colors = [
    ["Sky", "#73aad3"],
    ["Twilight", "#6874aa"],
    ["Leaf", "#6eaa89"],
    ["Rose", "#bf889b"],
    ["Graphite", "#73808a"],
    ["Frost", "#bccad4"],
  ];
  return (
    <>
      <Toolbar title="Personalization" />
      <div className="content-page personalization">
        <h1>Change the visuals on your desktop</h1>
        <p>Choose a background and window color to make it feel like home.</p>
        <fieldset>
          <legend>Aero themes</legend>
          <div className="theme-grid">
            {(["wallpaper", "starter", "logon"] as const).map(
              (wallpaper, i) => (
                <button
                  className={`theme-choice ${p.wallpaper === wallpaper ? "selected" : ""}`}
                  aria-pressed={p.wallpaper === wallpaper}
                  key={wallpaper}
                  onClick={() => set({ ...p, wallpaper })}
                >
                  <img src={`/assets/${wallpaper}.webp`} alt="" />
                  <span>{["Windows 7", "Aero Blue", "Harmony"][i]}</span>
                </button>
              ),
            )}
          </div>
        </fieldset>
        <h2>Window color</h2>
        <div className="color-choices">
          {colors.map(([name, color]) => (
            <button
              key={color}
              className={`color-choice ${p.color === color ? "selected" : ""}`}
              style={{ backgroundColor: color }}
              title={name}
              aria-label={name}
              aria-pressed={p.color === color}
              onClick={() => set({ ...p, color })}
            >
              {p.color === color ? "✓" : ""}
            </button>
          ))}
        </div>
        <div className="personalization-bottom">
          <label>
            <input
              type="checkbox"
              checked={!p.muted}
              onChange={(e) => set({ ...p, muted: !e.target.checked })}
            />{" "}
            Play interface sounds
          </label>
          <button onClick={() => set(defaultPreferences)}>
            Restore default theme
          </button>
        </div>
        <p className="muted-text">Your preferences are saved on this device.</p>
      </div>
    </>
  );
}
