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

## Known Limitations

- The word, quote, and code datasets are currently inlined and relatively small.
- There is no account system, persistent leaderboard, or saved history yet — solo results are session-only, and multiplayer rooms are ephemeral (Pusher channel, no database).
- Multiplayer requires a Pusher account/environment variables; without them the lobby degrades to solo-only.
- Code mode uses short snippets rather than full language-aware parsing.
- The UI is optimized for the current app layout, but more viewport testing would help polish edge cases.
- Automated test coverage has not been added yet.

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