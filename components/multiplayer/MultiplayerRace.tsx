'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import { useRoom } from '@/hooks/useRoom'
import type { ConnectionStatus } from '@/hooks/useRoom'
import { WORDS_LIST } from '@/lib/datasets'
import { seededWordList } from '@/lib/seededRandom'
import WordDisplay from '@/components/typing/WordDisplay'
import PlayerLane from './PlayerLane'
import WinnerScreen from './WinnerScreen'
import { MultiplayerFooter, MultiplayerHeader } from './MultiplayerSiteChrome'

function getPlayerId() {
  if (typeof window === 'undefined') return 'server'
  let id = sessionStorage.getItem('tg_pid')
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem('tg_pid', id) }
  return id
}

// ── Connection status banner ───────────────────────────────────────────────────

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return null

  const config = {
    connecting:   { bg: 'var(--teal-dim)',   border: 'rgba(74,158,135,0.28)', color: 'var(--teal)',          text: 'Connecting to room…' },
    error:        { bg: 'var(--coral-dim)',   border: 'rgba(217,108,90,0.28)', color: 'var(--coral)',         text: 'Connection error — check your network and refresh.' },
    disconnected: { bg: 'rgba(201,134,78,0.10)', border: 'rgba(201,134,78,0.28)', color: 'var(--accent-orange)', text: 'Connection lost — attempting to reconnect…' },
  }[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{
        width: '100%', padding: '9px 14px', borderRadius: 'var(--r-control)',
        background: config.bg, border: `1px solid ${config.border}`,
        color: config.color, fontSize: 13,
        fontFamily: 'var(--font-geist), system-ui, sans-serif',
        textAlign: 'center', lineHeight: 1.5,
      }}
      role="status"
      aria-live="polite"
    >
      {config.text}
    </motion.div>
  )
}

interface Props {
  roomCode:    string
  playerName:  string
  playerColor: string
  isHost:      boolean
  onLeave:     () => void
}

export default function MultiplayerRace({ roomCode, playerName, playerColor, isHost, onLeave }: Props) {
  const playerId = useRef(getPlayerId()).current
  const {
    state, connectionStatus, emitProgress, emitFinish, startRace, forceFinish,
  } = useRoom(roomCode, playerId, playerName, playerColor, isHost)
  const engine = useTypingEngine()
  const { enterCustomWordRace, exitCustomWordRace } = engine
  const inputRef = useRef<HTMLInputElement | null>(null)
  const finishEmittedRef = useRef(false)
  const [raceStarted, setRaceStarted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [copyHint, setCopyHint] = useState<'idle' | 'copied' | 'err'>('idle')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const seed = parseInt(roomCode, 10)
    if (!Number.isFinite(seed) || roomCode.length !== 4) return
    const words = seededWordList(WORDS_LIST, 60, seed)
    enterCustomWordRace(words)
    return () => exitCustomWordRace()
  }, [roomCode, enterCustomWordRace, exitCustomWordRace])

  const phase = state.phase

  useEffect(() => {
    if (phase === 'countdown') finishEmittedRef.current = false
    if (phase === 'racing') {
      setRaceStarted(true)
      inputRef.current?.focus()
    }
    if (phase === 'finished' && engine.phase === 'active') {
      engine.finishCurrentTest()
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'racing' && state.timeLeft === 0) forceFinish()
  }, [phase, state.timeLeft, forceFinish])

  // Emit on word commit (throttled inside useRoom)
  useEffect(() => {
    if (!raceStarted) return
    const progress = engine.wordResults.length / Math.max(engine.words.length, 1)
    emitProgress(progress, engine.liveWPM)
  }, [engine.wordResults.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Also emit on WPM ticker — throttle handles rate
  useEffect(() => {
    if (!raceStarted) return
    const progress = engine.wordResults.length / Math.max(engine.words.length, 1)
    emitProgress(progress, engine.liveWPM)
  }, [engine.liveWPM]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (engine.phase !== 'finished' || !raceStarted || finishEmittedRef.current) return
    finishEmittedRef.current = true
    emitFinish(engine.finalResults?.wpm ?? engine.liveWPM)
  }, [engine.phase, engine.finalResults, engine.liveWPM, emitFinish, raceStarted])

  useEffect(() => {
    const onTab = (e: KeyboardEvent) => { if (e.key === 'Tab') e.preventDefault() }
    window.addEventListener('keydown', onTab)
    return () => window.removeEventListener('keydown', onTab)
  }, [])

  const handleLeave = useCallback(() => {
    exitCustomWordRace()
    onLeave()
  }, [exitCustomWordRace, onLeave])

  const copyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopyHint('copied')
      window.setTimeout(() => setCopyHint('idle'), 1600)
    } catch {
      setCopyHint('err')
      window.setTimeout(() => setCopyHint('idle'), 2000)
    }
  }, [roomCode])

  const showWinner = state.phase === 'finished' && state.winnerId

  return (
    <div className="app-shell bg-grid">
      <div className="app-window">
        <MultiplayerHeader
          right={(
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontWeight: 600, fontSize: 15,
                  color: 'var(--ink)', letterSpacing: '0.10em',
                }}>
                  {roomCode}
                </span>
                <button type="button" className="mp-secondary-btn" onClick={copyRoomCode}>
                  {copyHint === 'copied' ? 'Copied' : copyHint === 'err' ? 'Failed' : 'Copy'}
                </button>
                <span className="mp-room-meta">{state.players.length}/5</span>
              </div>
              <button type="button" className="mp-nav-link" onClick={handleLeave}>leave</button>
            </>
          )}
        />

        <main className="app-main">
          {showWinner ? (
            <motion.div key="winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WinnerScreen
                players={state.players}
                winnerId={state.winnerId!}
                selfId={playerId}
                onPlayAgain={handleLeave}
              />
            </motion.div>
          ) : (
            <motion.div
              key="race"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14 }}
            >
              {/* Connection banner */}
              <AnimatePresence>
                {connectionStatus !== 'connected' && (
                  <ConnectionBanner key="conn" status={connectionStatus} />
                )}
              </AnimatePresence>

              {/* Countdown overlay */}
              <AnimatePresence>
                {phase === 'countdown' && (
                  <motion.div
                    key="cd"
                    className="mp-countdown-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.span
                      className="mp-countdown-num"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                    >
                      {state.countdown}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player lanes */}
              <div className="mp-lanes-panel">
                {phase === 'racing' && state.timeLimit > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end',
                    marginBottom: 10,
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em',
                    color: state.timeLeft <= 10 ? 'var(--coral)' : 'var(--ink-secondary)',
                    transition: 'color 0.3s ease',
                  }}>
                    {state.timeLeft}s
                  </div>
                )}

                {state.players.length === 0 ? (
                  <p className="mp-tap-hint" style={{ padding: '10px 0' }}>
                    {connectionStatus === 'connecting'
                      ? 'Connecting…'
                      : connectionStatus === 'error'
                      ? 'Could not connect. Check your network and refresh.'
                      : 'Waiting for players to join…'}
                  </p>
                ) : (
                  state.players.map(p => (
                    <PlayerLane
                      key={p.id}
                      player={p}
                      isSelf={p.id === playerId}
                      isWinner={state.winnerId === p.id}
                      compact={isMobile}
                      isRacing={phase === 'racing'}
                    />
                  ))
                )}
              </div>

              {/* Typing area */}
              {(phase === 'racing' || phase === 'waiting') && (
                <div
                  className={`word-shell ${phase === 'racing' && engine.phase === 'active' ? 'is-active' : 'is-idle'}`}
                  onClick={() => phase === 'racing' && inputRef.current?.focus()}
                  onTouchStart={() => phase === 'racing' && inputRef.current?.focus()}
                  style={{
                    opacity: phase === 'racing' ? 1 : 0.55,
                    pointerEvents: phase === 'racing' ? 'auto' : 'none',
                    filter: phase === 'waiting' ? 'blur(5px)' : 'none',
                    transition: 'filter 0.3s ease, opacity 0.3s ease',
                    userSelect: 'none',
                    touchAction: 'manipulation',
                  }}
                >
                  <input
                    ref={inputRef}
                    className="typing-input-proxy"
                    value={engine.currentInput}
                    onChange={e => phase === 'racing' && engine.handleTextInput(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                    enterKeyHint="done"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    aria-label="Typing input"
                  />
                  <WordDisplay
                    words={engine.words}
                    curIdx={engine.currentWordIdx}
                    input={engine.currentInput}
                    results={engine.wordResults}
                    isIdle={engine.phase === 'idle'}
                  />
                </div>
              )}

              {/* Host controls / waiting notice */}
              {phase === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                  {isHost ? (
                    <>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                        {[30, 60, 90, 120].map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`mode-btn${timeLimit === t ? ' active' : ''}`}
                            onClick={() => setTimeLimit(t)}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="restart-btn"
                        onClick={() => startRace(timeLimit)}
                        disabled={state.players.length < 2 || connectionStatus !== 'connected'}
                        style={{ padding: '11px 28px', fontSize: 14 }}
                      >
                        Start Race
                      </button>
                      <p className="mp-tap-hint" style={{ marginTop: 10 }}>
                        {state.players.length < 2
                          ? 'Share the room code so a second player can join.'
                          : 'Start when everyone is ready.'}
                      </p>
                    </>
                  ) : (
                    <p className="mp-tap-hint">Waiting for host to start…</p>
                  )}
                </div>
              )}

              {/* "Others still typing" notice */}
              {phase === 'racing' && engine.phase === 'finished' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mp-tap-hint"
                >
                  Waiting for others to finish…
                </motion.p>
              )}
            </motion.div>
          )}
        </main>

        <MultiplayerFooter />
      </div>
    </div>
  )
}
