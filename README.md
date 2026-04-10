# ⌨️ TypeGym

> A fast, elegant typing practice platform built for developers.
> Inspired by Monkeytype — engineered from scratch with Next.js, TypeScript, and Framer Motion.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

---

## ✨ Features

- ⚡ **Real-time per-character feedback** — correct / incorrect / pending states on every keystroke
- 📊 **Live WPM & accuracy** — calculated continuously while you type
- ⏱ **Multiple test modes** — Time (15s / 30s / 60s / 120s), Words (25 / 50 / 100), Quote, Code
- 🎯 **Animated blinking cursor** — flows naturally inline with text
- 📈 **Detailed results screen** — WPM, accuracy, errors, correct chars, duration + coaching tip
- 🌑 **Distraction-free dark UI** — terminal-inspired, minimal, keyboard-first
- ⌨️ **Tab to restart** anywhere, **Space** to advance words — no mouse needed

---

## 🛠 Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Framework  | Next.js 14 (App Router)           |
| Language   | TypeScript 5                      |
| Styling    | Tailwind CSS 3 + CSS Variables    |
| Animations | Framer Motion 11                  |
| State      | React hooks (useState / useRef)   |
| Fonts      | JetBrains Mono + Outfit (Google)  |

---

## 📦 Setup & Installation

### Prerequisites

Make sure you have the following installed before starting:

| Tool    | Minimum Version | Check command       |
|---------|-----------------|---------------------|
| Node.js | 18.x or higher  | `node --version`    |
| npm     | 9.x or higher   | `npm --version`     |
| git     | any             | `git --version`     |

> **Tip:** Use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.
> Run `nvm use 20` to switch to Node 20 LTS if needed.

---

### Step 1 — Get the code

**Option A — Clone from GitHub:**
```bash
git clone https://github.com/yourusername/typegym.git
cd typegym
```

**Option B — Unzip the downloaded archive:**
```bash
cd ~/Downloads
unzip typegym.zip
cd typegym
```

---

### Step 2 — Install dependencies

```bash
npm install
```

This installs all packages listed in `package.json`:
- `next` — framework
- `react` + `react-dom` — UI library
- `framer-motion` — animations
- `zustand` — state management (available for extension)
- `tailwindcss`, `autoprefixer`, `postcss` — styling

Expected output:
```
added 312 packages in 14s
```

> If you see warnings about peer dependencies, they are safe to ignore.

---

### Step 3 — Start the development server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:   http://localhost:3000
- ready in 1234ms
```

Open **http://localhost:3000** in your browser — TypeGym is live. 🎉

---

### Step 4 — Start typing

- The test starts the moment you press any key
- Press **Space** to submit each word
- Press **Tab** anywhere to restart
- Use the toolbar at the top to switch modes and settings

---

## 🏗 Project Structure

```
typegym/
├── app/
│   ├── globals.css               # Global styles, CSS variables, char/cursor classes
│   ├── layout.tsx                # Root layout + HTML metadata
│   └── page.tsx                  # Entry point — renders <TypingApp />
│
├── components/
│   └── typing/
│       ├── TypingApp.tsx         # Root client component, keyboard event wiring
│       ├── WordDisplay.tsx       # Per-word + per-character rendering, cursor
│       ├── ModeBar.tsx           # Mode selector toolbar (time/words/quote/code)
│       ├── LiveMetrics.tsx       # WPM / accuracy / timer cards while typing
│       └── ResultsScreen.tsx     # End-of-test stats with animated bars
│
├── hooks/
│   └── useTypingEngine.ts        # ALL typing logic: state, timer, WPM, accuracy
│
├── lib/
│   └── datasets.ts               # Word list, quotes, code snippets
│
├── public/                       # Static assets
├── package.json
├── tailwind.config.ts            # Custom dark theme palette
├── tsconfig.json
└── next.config.js
```

---

## 🧪 Other Useful Commands

```bash
# Run the production build locally
npm run build
npm run start

# Lint the codebase
npm run lint

# Check TypeScript types
npx tsc --noEmit
```

---

## 🚀 Deployment

### Deploy to Vercel (recommended — free)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (follow the prompts)
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deploys on every push.

### Deploy to Netlify

```bash
npm run build

# Then drag the .next/ folder into netlify.com/drop
# Or use the Netlify CLI:
npx netlify deploy --prod
```

---

## 🔧 Troubleshooting

**`npm error: Could not read package.json`**
> You are not inside the project folder. Run `cd typegym` first, then `npm install`.

**Port 3000 already in use**
```bash
# Run on a different port
npm run dev -- -p 3001
```

**`Module not found` errors after install**
```bash
# Delete node_modules and reinstall cleanly
rm -rf node_modules .next
npm install
```

**Fonts not loading**
> The app imports JetBrains Mono and Outfit from Google Fonts.
> If you are offline, the UI falls back to system monospace — everything still works.

---

## 🗺 Roadmap

- [ ] User accounts + login (NextAuth.js)
- [ ] Saved typing history + personal stats dashboard
- [ ] Global leaderboards (daily + all-time)
- [ ] Multiplayer typing races (Socket.io)
- [ ] Keyboard heatmap visualization
- [ ] Custom themes (Catppuccin, Dracula, Nord…)
- [ ] Typing sound effects (mechanical keyboard simulation)
- [ ] Language packs (Python, Rust, Go snippets)

---

## 🤝 Contributing

Contributions are welcome!

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.comabhaypratap08/typegym.git

# 3. Create a feature branch
git checkout -b feat/your-feature-name

# 4. Make your changes, then commit
git commit -m "feat: add your feature description"

# 5. Push and open a Pull Request
git push origin feat/your-feature-name
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

MIT © 2024 TypeGym Contributors — see [LICENSE](LICENSE) for full details.

---

<p align="center">Built with ❤️ for developers who care about their craft</p>