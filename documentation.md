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
- Restart support through the restart button or `Escape` key; `Tab` retains normal keyboard navigation.
- Mobile-friendly hidden input layer for touch keyboards.
- Inlined datasets for instant test generation without network requests.
- Multiplayer typing races (up to 5 players) with a 4-digit room code, live
  progress lanes, and a countdown-to-finish flow, powered by Pusher Presence
  Channels and authoritative room snapshots.

---

## Tech Stack

- TypeScript
- React 18
- Next.js 15 App Router
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
│       ├── pusher/route.ts       # Applies authenticated race commands
│       ├── pusher/auth/route.ts  # Authenticates Presence subscriptions
│       └── rooms/                 # Admission, snapshots, and explicit leave
├── components/
│   └── multiplayer/
│       ├── MultiplayerLobby.tsx  # Create/join room UI
│       ├── MultiplayerRace.tsx   # Race screen: lanes, countdown, timer
│       ├── PlayerLane.tsx        # Per-player progress lane
│       ├── WinnerScreen.tsx      # Post-race results and leaderboard
│       └── MultiplayerSiteChrome.tsx # Shared header/footer for MP pages
├── hooks/
│   ├── useTypingEngine.ts       # Core typing engine, timer, metrics, and lifecycle state
│   └── useRoom.ts               # Presence + authoritative snapshot client
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

Multiplayer races use [Pusher Presence Channels](https://pusher.com/channels)
for live membership and an authenticated room authority for race state. Presence
answers “who is here?”; a versioned room snapshot answers “what is happening?”
on initial subscription and every reconnect. Browser refresh is treated as a
connection lifecycle event, not a leave.

- A host creates a room and gets a random 4-digit code; up to 4 more players
  can join with that code (5 players max per room).
- All players in a room type the same word list, deterministically generated
  from the room code via a seeded PRNG (`lib/seededRandom.ts`), so no network
  round-trip is needed to sync the text itself.
- The room channel is `presence-room-{roomCode}`. Pusher's
  `subscription_succeeded`, `member_added`, and `member_removed` events hydrate
  membership immediately; there is no re-announce or 300 ms handshake.
- Race commands are authenticated by the room session and applied with a
  versioned compare-and-set update before a complete `room-state` snapshot is
  published through `POST /api/pusher`. Progress and finish commands are
  idempotent by player sequence number.
- `POST /api/pusher/auth` signs Presence subscriptions with server-only Pusher
  credentials. The Pusher app secret never reaches the browser.
- Room sessions are stored in `sessionStorage` under `tg-active-room`. The
  record contains the room, stable player identity, host identity, and a
  per-session token. Only explicit **Leave** calls the room DELETE endpoint and
  clears this record.
- `tg-race-input` separately checkpoints completed words and partial input in
  the current tab, so a race refresh resumes typing at the same position.
- An admitted seat survives a socket disconnect. Leave releases it; host Leave
  closes the room without electing a replacement host. New admissions are closed
  after a race starts, but existing players can reconnect through the results.
- Countdown and deadline use the server's absolute `raceStartedAt`. Local clock
  ticks update the display only. A single deadline command asks the authority to
  finalize the race; there is no periodic snapshot-fetch loop.

### Environment variables

Copy `.env.example` to `.env.local` and fill in values from your own
[Pusher dashboard](https://dashboard.pusher.com/) (Channels app → App Keys):

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | client | Public app key, safe to expose |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | client | e.g. `mt1` |
| `PUSHER_APP_ID` | server only | Never prefix with `NEXT_PUBLIC_` |
| `PUSHER_SECRET` | server only | Never prefix with `NEXT_PUBLIC_` — keep this out of git |
| `UPSTASH_REDIS_REST_URL` | server | Required for production shared room snapshots |
| `UPSTASH_REDIS_REST_TOKEN` | server | Required for production shared room snapshots |
| `NEXT_PUBLIC_ROOM_DEBUG` (optional) | client | Set to `1` in development for lifecycle diagnostics |

For production, connect an Upstash Redis database and set **both** REST variables
on every deployment using the same Pusher app. `KV_REST_API_URL` and
`KV_REST_API_TOKEN` are accepted aliases. A compare-and-set Lua operation enforces
room admission and race updates atomically across instances. Rooms expire 24 hours
after their last state write. Local `npm run dev` can use a process-local store;
that fallback intentionally is unavailable in production and resets if the dev
server restarts. No new npm dependency is required.

The old shared `TYPEGYM_PUSHER_TRIGGER_SECRET` / public counterpart are no longer
used. Each room admission receives its own random session token, validated by all
snapshot, presence-auth, race-command, and leave endpoints. Only its hash is kept
in storage; neither tokens nor storage records are included in Pusher events.

### Verify the network lifecycle

Set `NEXT_PUBLIC_ROOM_DEBUG=1` in `.env.local`, restart `npm run dev`, and open two
independent tabs (new navigation, not a duplicated tab with copied sessionStorage).
The diagnostics include event names, counts, revisions, and phases, never auth
headers, player names, or tokens. They are disabled in production.

1. Create a room in the first tab; join with its code in the second. Expect
   `subscription_requested` → `subscription_succeeded` → `room_snapshot_received`
   for the joiner, and `member_added` for the host. Opponent lanes must already
   appear before the snapshot HTTP response completes. There is no `player-join`.
2. Join a third tab: its subscription contains both existing opponents.
3. Refresh the host, then the joiner. Expect `session_restored` and the same
   subscribe/snapshot sequence. Confirm the same code/ID, host controls on the
   host only, no `POST /api/rooms`, and no DELETE during reload.
4. Start a race, type in both tabs, take one offline briefly in DevTools, then
   reconnect. Expect `reconnect` → subscription → `room_snapshot_received`.
   Opponent progress and finishes, the original deadline, and local input must
   recover without waiting for another progress update.
5. Click Leave. This alone sends `DELETE /api/rooms/{code}`, logs
   `session_cleared`, and removes `tg-active-room` and `tg-race-input`. Peers see
   `member_removed`; host Leave also publishes the closed-room snapshot.

Automated coverage in `tests/multiplayer-*.test.cjs` exercises these client
lifecycles with a controlled Pusher transport, actual route handlers/signatures,
concurrent admissions, host authorization, deadline snapshots, and duplicate or
out-of-order updates. Live Pusher/WebSocket and hosted Redis verification still
requires configured service credentials; the controlled transport is not a live
network test.

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

The project currently uses Next.js 15 and React 18.

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

### Interface and accessibility

The interface applies the supplied Apple-design guidance without adding gestures
that distract from typing:

- One translucent, sticky navigation surface above solid content cards. No fake
  window controls, repeated dock navigation, or stacked glass panels.
- Platform system typography, size-specific tracking, readable pending words in
  both themes, and layouts that use relative sizing. Browser zoom is enabled.
- Mode selections and progress use the shared critically damped spring in
  `lib/motion.ts`. Controls respond on press; actions commit on release. Results
  have no stagger delays and remain immediately actionable.
- Metrics occupy space from the idle state onward, so starting a test does not
  insert a new row and move the text. Per-character feedback stays immediate.
- `Escape` restarts; `Space` or `Enter` commits a word. `Tab` navigates normally.
  Leaving the typing field never pulls focus back. Desktop initially focuses the
  field; touch users explicitly tap it. Results receive heading focus, and
  restarting returns focus to the input.
- Reduced-motion preferences remove spatial feedback; reduced-transparency and
  increased-contrast preferences independently replace glass with solid surfaces.
  Focus indicators and pressed/selected states remain visible in forced colors.
- Theme follows the OS until the person explicitly chooses light or dark. That
  choice is stored under the existing `tg-theme` key and synchronized across tabs.

### Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test` uses Node's test runner, the existing TypeScript compiler, and jsdom.
It mounts the real React components to check typing/word commits, mode changes,
focus retention, native Tab handling, Escape/restart, quote completion/results,
theme synchronization, touch focus, reduced motion, and room-code validation.
Separate tests measure semantic text-color contrast, including idle text opacity,
on both light and dark content surfaces. These are component/token checks, not a
claim of complete WCAG conformance or browser visual coverage.

Remaining manual checks: at 320 px, tablet, and desktop widths, try all four modes,
200% zoom, light/dark, each accessibility preference, and a two-player race with
configured Pusher credentials. Check native mobile keyboard behavior and that
rapid mode changes remain interruptible. The built-in browser timed out during
the design pass, so visual inspection and a real networked race remain unverified.

### Typing lifecycle

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

Progress events (typed word count + current WPM) are emitted at most once every 2 seconds. Pusher's free tier limits message rates, and one network call per keystroke would both exceed those limits and produce visible jank on slow connections. Presence handles online/offline status independently of typing activity.

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

- **Ephemeral rooms, durable connection recovery.** Rooms are retained in shared
  storage for 24 hours so a refresh/reconnect can recover the active race. This
  is not match history; finished rooms are not a historical leaderboard.
- **Production storage is required.** The development fallback is an in-process
  store. Configure Upstash Redis REST (or the supported Vercel KV aliases)
  before deploying multiple/serverless instances.
- **Presence reflects socket membership.** A temporary disconnect removes a player from the live presence map, while the race snapshot keeps their last progress and identity visible for reconnect. It is not treated as an intentional leave.
- **Progress emit throttle (2 s).** Opponent progress statistics are published at most once every 2 seconds per player. This limits API usage; it does not delay membership or initial/reconnect snapshot hydration.
- **Authoritative finish timing.** The server snapshot owns the race deadline and winner selection. A reconnecting client receives the current phase, timer origin, progress, and finish state without waiting for a future progress event.
- **Maximum 5 players per room.** Admission and race start are checked server-side with stable player IDs. Presence and snapshot reconciliation are idempotent, so reconnecting a player does not append a duplicate lane.
- **Requires Pusher and shared storage credentials.** Without Pusher variables or production room storage, room creation returns a setup error rather than pretending that a multiplayer room can synchronize.

### Mobile

- **iOS Safari keyboard visibility.** `interactiveWidget: resizes-content` (set in the Next.js `viewport` export) is the standard mechanism to prevent layout shifts when the virtual keyboard opens. It is supported in Chrome for Android and Safari 16+. On older iOS Safari (< 16), the page may still scroll slightly when the keyboard opens.
- **Native mobile keyboard behavior requires device testing.** Inputs use at least 1rem text and viewport zoom is unrestricted. Focus is no longer forcibly restored after blur; tap the word area to resume after using another control.
- **Short landscape screens.** The word display has a bounded height and shows fewer lines on compact screens; the page remains scrollable rather than locking the viewport.

### General

- **No account system or persistent history.** Solo test results are session-only and disappear on refresh.
- **Datasets are inlined and relatively small.** The word list, quote collection, and code snippets are bundled with the app. Adding user-defined word lists or server-fetched content would require a backend.
- **Focused, not exhaustive, automated coverage.** Component tests exercise the typing flow and interface behavior; live networking, real browser layout, native mobile keyboards, and a full timer/browser-throttling matrix still require manual verification.
- **Code mode snippets are short.** Code mode uses hand-written short snippets rather than real parsed source files. The snippets are typed as space-delimited words, which means some multi-character tokens (e.g. `!=`, `=>`) are split at spaces and may not reflect real coding ergonomics.

---

## Roadmap

- Add persistent typing history.
- Add personal bests and session trends.
- Add more quotes and larger word datasets.
- Expand code mode with more languages and longer snippets.
- Add theme customization.
- Add sound and haptic feedback options.
- Expand automated tests for timer edge cases and multiplayer synchronization.
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
