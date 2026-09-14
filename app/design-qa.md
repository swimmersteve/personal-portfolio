# Windows 7 portfolio — implementation QA

final result: passed

## Visual evidence

- Source visual truth: `references/windows7-desktop.png`, 640 × 480 raster,
  published as a half-size capture of a 1280 × 960 Windows 7 desktop.
  Source: https://en.wikipedia.org/wiki/File:Windows_7_SP1_screenshot.png
- Window-control reference: `references/aero-controls-reference.png`,
  1264 × 711 browser capture of https://khang-nd.github.io/7.css/#title-bar.
- Matched desktop state: desktop with Start open, no visible application windows.
  Implementation: `references/desktop-reference-size.png`, 1280 × 960 CSS and
  output pixels, devicePixelRatio 1.
- Full-view comparison: `references/comparison-desktop.png`. Reference shown
  at its original 640 × 480; implementation uniformly reduced to 640 × 480.
- Focused Start comparison: `references/comparison-start.png`. Reference enlarged
  2× to recover its original CSS scale; both cropped to the same lower-left region.
- Focused window-control comparison: `references/comparison-controls.png`.
  Reference and application title bars are shown at the same CSS pixel scale;
  inactive source and active application states are explicitly labeled.
- Finished application screens: `references/desktop-final.png` and
  `references/projects-final.png`, 1280 × 720; `references/login.png`.
- Responsive captures: `references/mobile-start.png` and
  `references/mobile-projects.png`, 390 × 844; `references/mobile-landscape.png`,
  740 × 390. Both orientations retain reachable app controls and taskbar.
- The combined images were opened and visually reviewed. Some browser captures
  have compositor resampling softness when the virtual viewport exceeds the
  native preview pane. This is a capture limitation, not a CSS font-size change.

## Findings and fixes

1. **P1 — Hidden application windows.** 7.css hides role=dialog unless it is a
   fragment target. The React window manager now explicitly owns opacity,
   visibility, and transforms. Rechecked welcome, projects, and multiple apps.
2. **P2 — Extra button borders.** Framework specificity gave desktop icons and
   Explorer navigation permanent gray outlines. Added scoped state overrides;
   final captures show borders only for selected, hovered, or focused controls.
3. **P1 — Desktop moved after resizing and focus changes.** Transformed minimized
   windows expanded a hidden scroll container, allowing focus to scroll the
   taskbar away from the screen bottom. The desktop now uses overflow:clip.
   Rechecked desktop scrollTop=0 and taskbar bottom=viewport height.
4. **P2 — Wallpaper color mismatch.** Initial fan recreation differed visibly
   from the stock reference. Replaced the default with the sourced stock Windows
   7 wallpaper, retained alternate themes, and darkened the Start menu glass.
   Repeated the full desktop and focused Start comparison after the changes.
5. **Interaction — Calculator entry focus.** Opening Calculator originally
   focused the outer window instead of its keyboard handler. It now focuses the
   calculator and accepts Enter as equals, including after clicking a key.
   Browser verification: 2 + 3 = 5.
6. **Interaction — Taskbar thumbnail focus.** Keep previews mounted when focus
   enters their controls, and bridge the pointer gap above the taskbar. Verified
   closing Notepad from its actual-content thumbnail.

No remaining P0/P1/P2 findings in the tested scope.

## Required fidelity surfaces

- **Typography:** Segoe UI, 12px shell labels, compact toolbars, lightweight blue
  content headings. Native OS typography is used without redistributing fonts.
  Larger app headings intentionally serve the portfolio content.
- **Spacing/layout:** 40px desktop taskbar, two-column Start, 29px caption bars,
  inset window bodies, Explorer sidebar and status bar. App sizes, extra portfolio
  shortcuts, and menu item counts are intentional departures from a stock install.
- **Colors/tokens:** Stock blue background, adjustable Aero color, darker Start
  glass, active/inactive frames, red close controls, pale-blue selection states.
- **Image fidelity:** Sourced period icons, stock desktop wallpaper, sourced
  Start orb, and 7.css embedded caption assets. No emoji substitutes. All loaded
  images had nonzero naturalWidth; all assets are self-hosted and credited.
- **Copy/content:** Identity, projects, and links are explicitly sample or
  unavailable. No invented credentials, résumé history, or contact destinations.
  Content and sample labels can be changed through the typed content module.

## Verification

Automated checks: TypeScript passed; 8 behavior/storage tests passed; 4 static
serving/packaging tests passed; production build passed.

Browser checks completed:

- Boot, login, session refresh, restart, shutdown, and return from shutdown.
- Project list, project details, missing project link, no-result search, clearing
  search, résumé unavailable state, and contact unavailable state.
- Drag, edge resize, left/right snap, maximize/restore, minimize/reopen, focus
  ordering, close focus restoration, and Show Desktop.
- Desktop icon drag, persistence after reload, context menu, and arrange icons.
- Start search, keyboard menu traversal, Escape dismissal, Alt-arrow snapping.
- Calculator keyboard entry; arithmetic and error recovery additionally covered
  by unit tests.
- Notepad editing, Save as download feedback, content persistence after reload.
- Wallpaper/color persistence and restoration of defaults.
- Calendar month navigation and Today; volume mute/unmute and test-sound action.
- Phone single-tap launch, maximized apps, taskbar switching, landscape scrolling.
- Browser warning/error logs: empty after final interactions.

Blocked storage is covered by tests using throwing storage getters. Reduced-motion
rules were inspected in CSS; an OS-level reduced-motion toggle was not exercised.
No real phone hardware, Safari, or Firefox session was available for this pass.

## Follow-up polish

- The Start user tile uses a sourced account icon until a personal avatar is
  supplied. A personal portrait can make this feel more like a lived-in computer.
- System sounds are an original synthesized chime, not an exact Windows sound pack.
- The desktop is a portfolio simulation; utilities are intentionally bounded to
  the agreed first-version feature set.
- Replace sample content and review recorded asset provenance before any public
  release. No deployment was performed.
