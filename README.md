# Windows 7 Aero Portfolio

The application is in `app/`. It is a React + TypeScript + Vite desktop portfolio,
with an original window manager and 7.css controls. No backend is required.

## Development

```sh
cd app
npm install
npm run dev -- --host 127.0.0.1 --port 5173
npm run typecheck
npm test
npm run build
```

The production static site is emitted to `app/dist/client`. The starter also
emits a Sites-compatible Worker, but no site has been published.

## Make it yours

Edit `app/src/content.ts` for your display name, title, biography, skills,
projects, contact URLs, and résumé URL. Put your résumé PDF under `app/public/`
and reference it with a root-relative URL such as `/resume.pdf`.
Replace the initial HTML copy in `app/index.html` with your real content too.
Set `sample: false` for your profile and finished projects to remove sample labels.
No personal claims are made by the provided sample entries.

## Behavior

- Double-click desktop icons; single-tap on phones.
- Drag title bars and window edges. Drag to the top/left/right edge to snap.
- Alt + arrow keys snap/restore the active window. Title-bar icon opens window actions.
- Ctrl + Escape opens Start; Escape dismisses shell menus.
- Right-click or long-press desktop icons for context menus.
- Notepad saves locally; Save as downloads text. Ctrl/Cmd + S also downloads.
- Theme, notes, and icon positions use versioned browser storage. Login lasts
  for the current browser tab session. Restart replays boot and login.
- Sounds are off by default. Enable them in Personalization or the volume flyout.

Asset sources and attribution are in `app/public/assets/credits.txt`.
The repository's Windows 7 screenshot is a research reference, not an app asset.
