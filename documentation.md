# TypeGym

> A personal deep-dive into how typing test platforms work -- built from scratch out of curiosity.

---

## Motivation

TypeGym started as a way to understand what makes typing test platforms like Monkeytype feel fast, responsive, and addictive to use.

The goal was not just to clone the surface UI. The interesting questions were underneath:

- How does a typing test track every word and character without feeling delayed?
- How are WPM and accuracy calculated in real time?
- How does a timed test finish reliably without leaving the UI stuck?
- How do you keep the text, cursor, metrics, and result screen visually stable while state changes quickly?

Building TypeGym from scratch made those details easier to explore directly.

---

## What is TypeGym?

TypeGym is a fast typing practice web app built with Next.js, React, and TypeScript.

It supports timed tests, fixed word-count tests, quote typing, and code snippet typing. The app tracks live WPM, accuracy, mistakes, elapsed time, and final session results.

---

## Features

- Time-based typing tests with 15, 30, 60, and 120 second options.
- Fixed word-count tests with 25, 50, and 100 word options.
- Quote mode using curated programming and productivity quotes.
- Code mode with snippets for JavaScript, Python, Java, C, and C++.
- Real-time WPM and accuracy tracking.
- Final result card with WPM, accuracy, errors, duration, correct characters, and total characters.
- Animated typing cursor and per-character visual feedback.
- Incorrect character highlighting and wrong-word underline.
- Restart support through the restart button or `Tab` key.
- Mobile-friendly hidden input layer for touch keyboards.
- Inlined datasets for instant test generation without network requests.
- Multiplayer typing races (up to 5 players) with a 4-digit room code, live
  progress lanes, and a countdown-to-finish flow, powered by Pusher Channels.

---

## Tech Stack

- TypeScript
- React 18
- Next.js 14 App Router
- Framer Motion
- Tailwind CSS
- CSS custom properties
- Node.js and npm

---

## Project Structure

```text
TypeGym/
├── app/
│   ├── globals.css              # Global styling, layout, typing UI, responsive rules
│   ├── layout.tsx               # Root app layout and metadata
│   └── page.tsx                 # Home page entry point
├── components/
│   └── typing/
│       ├── LiveMetrics.tsx      # Live WPM, accuracy, and timer display
│       ├── ModeBar.tsx          # Mode and test-setting controls
│       ├── ResultsScreen.tsx    # Final results card
│       ├── TypingApp.tsx        # Main app shell and UI orchestration
│       └── WordDisplay.tsx      # Word rendering, character states, and cursor
│   ├── multiplayer/
│   │   └── page.tsx              # Multiplayer lobby entry point
│   └── api/
│       └── pusher/route.ts       # Validates and relays race events to Pusher
├── components/
│   └── multiplayer/
│       ├── MultiplayerLobby.tsx  # Create/join room UI
│       ├── MultiplayerRace.tsx   # Race screen: lanes, countdown, timer
│       ├── PlayerLane.tsx        # Per-player progress lane
│       ├── WinnerScreen.tsx      # Post-race results and leaderboard
│       └── MultiplayerSiteChrome.tsx # Shared header/footer for MP pages
├── hooks/
│   ├── useTypingEngine.ts       # Core typing engine, timer, metrics, and lifecycle state
│   └── useRoom.ts               # Multiplayer room state synced over Pusher
├── lib/
│   ├── datasets.ts              # Word list, quote list, and code snippets
│   └── seededRandom.ts          # Deterministic word list shared by all racers
├── public/
│   ├── logo.svg                 # TypeGym logo asset
│   └── trophy.svg               # Multiplayer winner trophy asset
├── next.config.js               # Next.js configuration
├── package.json                 # Scripts and dependencies
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── documentation.md             # Project documentation
```

---

## Multiplayer Mode

Multiplayer races run through [Pusher Channels](https://pusher.com/channels)
for realtime sync — there is no persistent backend or database.

- A host creates a room and gets a random 4-digit code; up to 4 more players
  can join with that code (5 players max per room).
- All players in a room type the same word list, deterministically generated
  from the room code via a seeded PRNG (`lib/seededRandom.ts`), so no network
  round-trip is needed to sync the text itself.
- Player joins, progress ticks, race start, and finish events are relayed
  through `POST /api/pusher`, which validates the channel name, event name,
  and payload shape before calling `pusher.trigger(...)` server-side (the
  Pusher app secret never reaches the browser).
- If Pusher environment variables are not configured, the multiplayer lobby
  shows a setup banner and the room still renders locally, but players won't
  see each other.

### Environment variables

Copy `.env.example` to `.env.local` and fill in values from your own
[Pusher dashboard](https://dashboard.pusher.com/) (Channels app → App Keys):

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | client | Public app key, safe to expose |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | client | e.g. `mt1` |
| `PUSHER_APP_ID` | server only | Never prefix with `NEXT_PUBLIC_` |
| `PUSHER_SECRET` | server only | Never prefix with `NEXT_PUBLIC_` — keep this out of git |
| `TYPEGYM_PUSHER_TRIGGER_SECRET` (optional) | server | If set, `POST /api/pusher` requires a matching `x-typegym-pusher-trigger` header |
| `NEXT_PUBLIC_TYPEGYM_PUSHER_TRIGGER_SECRET` (optional) | client | Must equal the server value above |

**Never commit real values for these** — `.env.example` should only ever
contain placeholders. If you're deploying (e.g. on Vercel), set the real
values in your hosting provider's dashboard instead.

---

## Getting Started

### Prerequisites

You need the following installed:

- Node.js
- npm
- Git

The project currently uses Next.js 14 and React 18.

### Installation

Clone the repository:

```bash
git clone https://github.com/abhaypratap08/TypeGym.git
cd TypeGym
```

Install dependencies:

```bash
npm install
```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:3000
```

To create a production build:

```bash
npm run build
```

---

## How It Works

TypeGym is centered around the `useTypingEngine` hook. That hook owns the test configuration, current word, typed input, completed word results, timer state, live metrics, and final results.

When the user starts typing, the test moves from `idle` to `active`. Each typed character is compared against the current expected word. When the user presses space or enters whitespace through the hidden input, the current word is committed into a `WordResult` object:

```ts
{
  word: "expected",
  typed: "actual"
}
```

The app uses those committed results to calculate accuracy, errors, and WPM.

WPM uses the standard typing-test formula:

```text
(correct characters / 5) / minutes
```

Accuracy is calculated as:

```text
correct characters / total characters
```

Timed mode uses a deadline-based timer instead of only decrementing a counter. This keeps the timer tied to actual elapsed time. The engine also has multiple finish paths: interval-based finish, timeout fallback, worker fallback, and UI-level fallback rendering. This prevents the app from reaching the end of a timed test without mounting the result card.

The `WordDisplay` component renders a windowed slice of nearby words instead of rendering the full list. Each character receives a visual state:

- `correct`
- `incorrect`
- `pending`

The animated cursor is rendered around the current character using Framer Motion and CSS.

---

## Performance Architecture

TypeGym targets sub-5 ms per-keystroke rendering. The key decisions that enable this are documented below.

### Isolated word re-renders

`WordDisplay` splits word rendering across three component types:

- **`CurrentWord`** — receives live `input` and re-renders on every keystroke, but only for the one word the user is currently typing.
- **`CompletedWord`** — receives only its stable `WordResult` entry. It never re-renders on keystrokes; it re-renders only when the result for that specific index changes (i.e. on word commit).
- **`PendingWord`** — receives only the word string. It never re-renders until the word list itself changes.

The previous implementation passed `input` and `results` to every word in the window, causing all ~60 visible words to re-render on every keystroke. The new design reduces per-keystroke re-renders to exactly one component.

### Cursor without layout reflow

The animated cursor is a plain `<span>` positioned with `position: absolute` and CSS `left`. Framer Motion's `layoutId` API — used in the original implementation — triggers a layout measurement pass on every render to compute the element's new position, which forces a browser reflow. The CSS-only cursor avoids this entirely; blinking is handled by a `@keyframes` animation on `opacity`.

### Memoized analytics

`analyzeResults` is O(n characters) across all committed words. In the original engine, it was called twice per render: once for `liveWPM` and once for `liveAccuracy`. The fix introduces a single `committedStats` memo that only re-runs when `wordResults` changes (on word commit, not on keystroke). Both live metrics then consume the cached result, so keystroke renders do not touch the committed results at all.

### Deadline-based timer

The timer uses `Date.now()` subtracted from a recorded `deadlineRef` value rather than decrementing a counter in each interval tick. This makes the displayed time immune to interval drift caused by tab throttling or main-thread work. The engine also has layered finish paths: interval check → `setTimeout` fallback → Web Worker fallback → React `useEffect` fallback.

### Multiplayer progress throttle

Progress events (typed word count + current WPM) are emitted at most once every 2 seconds. Pusher's free tier limits message rates, and one network call per keystroke would both exceed those limits and produce visible jank on slow connections. The per-player inactivity checker runs every 3 seconds and marks peers as stale after 8 seconds of silence during a race.

---

The items below are known trade-offs or edge cases that are documented here rather than left as silent bugs.

### Typing engine

- **Timed mode drift under aggressive tab throttling.** The timer is deadline-based (`Date.now()` diff on a 250 ms interval), which keeps it accurate through short background periods. However, if the operating system throttles JavaScript execution for an extended time (e.g. a tab left in the background for several minutes on mobile Safari), the interval itself may fire late. The fallback mechanisms (timeout + worker) ensure the test still finishes, but the displayed time-left value may jump when the tab returns to the foreground.
- **Backspace does not cross word boundaries.** Pressing Backspace at the start of a word does not retrieve the previous word for editing — the previous word is already committed. This matches the behaviour of most typing test apps (including Monkeytype) and is intentional.
- **Ctrl+Backspace / word-delete not handled.** Pressing Ctrl+Backspace on desktop deletes one character, not the whole word, because the handler intercepts all modifier+key combos before the `key` dispatch. This is a minor convenience miss that could be added later.

### Word display

- **Line-advance detection uses `offsetTop`.** The windowing logic advances the visible line by comparing `offsetTop` between the current word and the window-start word. If the browser reports identical `offsetTop` for two words on different visual lines (rare, but possible with certain font scaling), the window may not advance. Adding a `ResizeObserver` on the text container would make this more robust.
- **Pending words re-render on word-list growth.** In timed mode the word list is extended by 100 words whenever the cursor reaches near the end. This updates the `words` array reference, causing `PendingWord` components beyond the current window to remount. These words are off-screen so there is no visible flicker, but the reconciliation cost is non-zero.

### Multiplayer

- **No persistent backend.** Rooms are ephemeral Pusher channels. If all players close the tab, the room is gone. There is no way to rejoin a finished race or view historic results.
- **Peer "disconnected" detection is heuristic.** The peer-inactivity checker marks a player as stale if no progress or finish event arrives within 8 seconds. A player on a very slow connection who is still typing may be incorrectly flagged. When their next event arrives, the stale flag is cleared automatically.
- **Progress emit throttle (2 s).** Opponent progress bars update at most once every 2 seconds per player. This reduces Pusher API usage on the free tier but means opponent bars move in small jumps rather than smoothly. Increasing the cadence (or switching to Pusher Presence Channels for a more efficient push model) would improve smoothness.
- **Race finish is eventually consistent.** The `player-finish` event travels: client → `/api/pusher` (Next.js route) → Pusher → all subscribers. Under high latency this can take 500 ms–2 s. A player who finishes just before the time limit may briefly see the race still running before their finish event propagates.
- **No reconnect for the _other_ player.** If the Pusher connection drops and reconnects, the local player re-subscribes and re-announces themselves. However, already-connected peers do not re-broadcast their current state, so the reconnecting player may see missing progress until the next natural progress event. A dedicated `state-sync` event requested on reconnect would fix this.
- **Maximum 5 players per room.** The cap is enforced client-side. A malicious actor could bypass it by sending crafted events directly to the Pusher API endpoint; the server-side route only validates payload shape, not room capacity.
- **Requires Pusher credentials.** Without the four Pusher environment variables the multiplayer lobby degrades gracefully (shows a setup banner), but real-time sync does not work.

### Mobile

- **iOS Safari keyboard visibility.** `interactiveWidget: resizes-content` (set in the Next.js `viewport` export) is the standard mechanism to prevent layout shifts when the virtual keyboard opens. It is supported in Chrome for Android and Safari 16+. On older iOS Safari (< 16), the page may still scroll slightly when the keyboard opens.
- **`maximumScale: 1` disables user zoom.** This is set to prevent iOS Safari from zooming to the focused input, which would shift the typing area. It also prevents the user from intentionally zooming the page. An alternative approach (ensuring all inputs have `font-size: 16px`) is already in place; `maximumScale` is a belt-and-suspenders guard.
- **Keyboard flicker on older Android WebView.** The `onBlur` → `requestAnimationFrame` → `focus()` chain keeps the software keyboard open across word commits on most devices. On some Android OEM browsers (Samsung Internet < 15, older WebViews) there may still be a brief keyboard animation between words.
- **Landscape mode on 360 px screens.** In landscape on a 360 px-wide device the word display is shorter (due to `clamp(154px, 34dvh, 190px)`) and shows fewer lines. This is a layout trade-off; the test is still functional but the text area is compact.

### General

- **No account system or persistent history.** Solo test results are session-only and disappear on refresh.
- **Datasets are inlined and relatively small.** The word list, quote collection, and code snippets are bundled with the app. Adding user-defined word lists or server-fetched content would require a backend.
- **No automated test coverage.** The typing engine and multiplayer hook have no unit or integration tests. Changes should be manually verified with a full 60 s test, a mobile session, and a two-tab multiplayer race.
- **Code mode snippets are short.** Code mode uses hand-written short snippets rather than real parsed source files. The snippets are typed as space-delimited words, which means some multi-character tokens (e.g. `!=`, `=>`) are split at spaces and may not reflect real coding ergonomics.

---

## Roadmap

- Add persistent typing history.
- Add personal bests and session trends.
- Add more quotes and larger word datasets.
- Expand code mode with more languages and longer snippets.
- Add theme customization.
- Add sound and haptic feedback options.
- Add automated tests for the typing engine.
- Persist multiplayer results (leaderboards, match history).
- Support more than 5 players per multiplayer room.
- Add accessibility polish for screen readers and keyboard-only navigation.
- Add deployment notes and screenshots.

---

## Contributing

Issues and pull requests are welcome.

If something feels broken, visually off, or inconsistent, open an issue with:

- What happened.
- What you expected.
- Browser and device details, if relevant.
- Steps to reproduce the issue.

For pull requests, keep changes focused and describe the behavior being changed.

---

## License

MIT © Abhay Pratap Singh

GitHub: https://github.com/abhaypratap08