import { useEffect, useRef, useState } from "react";
import "./chat.css";

type Message = { role: "user" | "assistant"; content: string; time: string };
const greeting = "Hey there! I'm Steve's digital twin. Ask me about his background, projects, or how he approaches his work.";
const starters = ["What’s your background?", "Tell me about your projects", "What do you enjoy working on?"];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [largeText, setLargeText] = useState(false);
  const request = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/chat/health", { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setStatus(data.ready ? "online" : "offline"))
      .catch(() => { if (!controller.signal.aborted) setStatus("offline"); });
    return () => { controller.abort(); const active = request.current; request.current = null; active?.abort(); };
  }, []);
  useEffect(() => {
    const panel = transcript.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [messages, pending, error]);

  async function send(text = draft, retry = false) {
    if (request.current || !text.trim()) return;
    const history = retry ? messages.slice(0, -1) : messages;
    const content = text.trim();
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const next: Message[] = [...history, { role: "user", content, time }];
    setMessages(next);
    setDraft("");
    setError("");
    setPending(true);
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history: history.slice(-20).map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.reply !== "string" || !data.reply.trim())
        throw new Error(data?.error || "Steve's digital twin is unavailable. Please try again in a moment.");
      if (request.current !== controller) return;
      setMessages([...next, { role: "assistant", content: data.reply, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }]);
      setStatus("online");
    } catch (reason) {
      if (request.current !== controller) return;
      setError(reason instanceof Error && reason.name !== "AbortError" ? reason.message : "The reply took too long. Try sending it again.");
      setStatus("offline");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
        window.setTimeout(() => input.current?.focus(), 0);
      }
    }
  }

  return (
    <div className="aim-app">
      <div className="aim-toolbar">
        <span className="aim-wordmark">instant messenger</span>
        <button disabled={pending || messages.length === 0} onClick={() => { setMessages([]); setError(""); setDraft(""); input.current?.focus(); }}>New chat</button>
        <button aria-pressed={largeText} onClick={() => setLargeText(!largeText)}>Larger text</button>
      </div>
      <div className="aim-layout">
        <aside className="aim-buddies" aria-label="Buddy list">
          <div className="aim-buddy-heading">Buddy List</div>
          <div className="aim-group">Buddies (1)</div>
          <div className="aim-selected-buddy"><span className={`aim-presence ${status}`} />Steve</div>
          <img className="aim-portrait" src="/assets/steve-tang.jpg" alt="Steve Tang" />
          <strong>Steve Tang</strong>
          <p className="aim-twin-label">Chat with Steve’s digital twin.</p>
        </aside>
        <section className="aim-conversation" aria-label="Instant message with Steve">
          <header className="aim-recipient">
            <div><span>To:</span> <strong>Steve</strong></div>
            <span className="aim-connection"><span className={`aim-presence ${status}`} />{status === "online" ? "Online" : status === "checking" ? "Connecting…" : "Offline"}</span>
          </header>
          <div ref={transcript} className={`aim-transcript ${largeText ? "aim-large" : ""}`} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0}>
            <p className="aim-system">You’re chatting with Steve’s digital twin.</p>
            <p className="aim-message"><strong className="aim-screenname assistant">Steve:</strong> {greeting}</p>
            {messages.map((message, i) => <p className="aim-message" key={i}><strong className={`aim-screenname ${message.role}`}>{message.role === "user" ? "You" : "Steve"} <small>({message.time})</small>:</strong> {message.content}</p>)}
            {pending && <p className="aim-system">Steve is typing…</p>}
          </div>
          {messages.length === 0 && <div className="aim-starters" aria-label="Conversation starters">{starters.map((text) => <button key={text} onClick={() => void send(text)}>{text}</button>)}</div>}
          {error && <div className="aim-error" role="alert">{error} <button disabled={pending} onClick={() => void send(messages[messages.length - 1]?.content, true)}>Retry message</button></div>}
          <form className="aim-compose" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <label htmlFor="aim-message">Your message</label>
            <textarea id="aim-message" ref={input} value={draft} maxLength={4000} disabled={pending || !!error} placeholder="Say hello…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
            <div className="aim-send-row"><small>Enter to send · Shift + Enter for a new line</small><button className="aim-send" type="submit" disabled={pending || !!error || !draft.trim()}>Send</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
