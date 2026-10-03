'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import { useRoom } from '@/hooks/useRoom'
import type { ConnectionStatus } from '@/hooks/useRoom'
import { WORDS_LIST } from '@/lib/datasets'
import { seededWordList } from '@/lib/seededRandom'
import { FADE_TRANSITION } from '@/lib/motion'
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

  const text = {
    connecting: 'Connecting to room…',
    error: 'Connection error — check your network and refresh.',
    disconnected: 'Connection lost — attempting to reconnect…',
  }[status]

  return (
    <motion.div
      className={`mp-connection-banner is-${status}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE_TRANSITION}
      role="status"
      aria-live="polite"
    >
      {text}
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
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      const focused = document.activeElement
      if (!focused || focused === document.body || focused.id === 'main-content') {
        inputRef.current?.focus({ preventScroll: true })
      }
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

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
  }, [])

  const handleLeave = useCallback(() => {
    exitCustomWordRace()
    onLeave()
  }, [exitCustomWordRace, onLeave])

  const copyRoomCode = useCallback(async () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopyHint('copied')
    } catch {
      setCopyHint('err')
    }
    copyResetRef.current = setTimeout(() => setCopyHint('idle'), 2000)
  }, [roomCode])

  const showWinner = state.phase === 'finished' && state.winnerId

  return (
    <div className="app-shell bg-grid">
      <div className="app-window">
        <MultiplayerHeader
          right={(
            <>
              <div className="mp-room-actions" role="group" aria-label="Room details">
                <span className="mp-room-code">
                  <span className="sr-only">Room code </span>{roomCode}
                </span>
                <button
                  type="button"
                  className="mp-secondary-btn"
                  onClick={copyRoomCode}
                  aria-label={copyHint === 'copied' ? 'Copied room code' : copyHint === 'err' ? 'Try again to copy room code' : 'Copy room code'}
                >
                  {copyHint === 'copied' ? 'Copied' : copyHint === 'err' ? 'Try again' : 'Copy'}
                </button>
                <span className="sr-only" role="status">
                  {copyHint === 'copied' ? 'Room code copied.' : copyHint === 'err' ? 'Could not copy. Select the room code to copy it manually.' : ''}
                </span>
                <span className="mp-room-meta"><span className="sr-only">Players </span>{state.players.length}/5</span>
              </div>
              <button type="button" className="mp-nav-link" onClick={handleLeave}>Leave</button>
            </>
          )}
        />

        <main id="main-content" className="app-main" tabIndex={-1} aria-labelledby="mp-race-heading">
          <h1 id="mp-race-heading" className="sr-only">Multiplayer race</h1>
          <AnimatePresence initial={false} mode="popLayout">
          {showWinner ? (
            <motion.div
              key="winner"
              className="mp-winner-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE_TRANSITION}
            >
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
              className="mp-race-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE_TRANSITION}
            >
              {/* Connection banner */}
              <AnimatePresence>
                {connectionStatus !== 'connected' && (
                  <ConnectionBanner key="conn" status={connectionStatus} />
                )}
              </AnimatePresence>

              {/* Player lanes */}
              <section className="mp-lanes-panel" aria-label="Race progress">
                <AnimatePresence initial={false}>
                  {phase === 'countdown' && (
                    <motion.div
                      key="countdown"
                      className="mp-countdown-notice"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={FADE_TRANSITION}
                      role="status"
                    >
                      <span>Race starts in</span>
                      <span className="mp-countdown-num">{state.countdown}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {phase === 'racing' && state.timeLimit > 0 && (
                  <p
                    className={`mp-race-timer${state.timeLeft <= 10 ? ' is-urgent' : ''}`}
                    role="timer"
                    aria-label={`${state.timeLeft} seconds remaining`}
                  >
                    {state.timeLeft}s
                  </p>
                )}

                {state.players.length === 0 ? (
                  <p className="mp-tap-hint mp-empty-lanes">
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
              </section>

              {/* Typing area */}
              {(phase === 'racing' || phase === 'waiting' || phase === 'countdown') && (
                <div
                  className={`word-shell mp-word-shell ${phase === 'racing' && engine.phase === 'active' ? 'is-active' : 'is-idle'}${phase !== 'racing' ? ' is-waiting' : ''}`}
                  onClick={() => phase === 'racing' && engine.phase !== 'finished' && inputRef.current?.focus({ preventScroll: true })}
                >
                  <input
                    ref={inputRef}
                    className="typing-input-proxy"
                    value={engine.currentInput}
                    onChange={e => phase === 'racing' && engine.handleTextInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
                      e.preventDefault()
                      engine.handleTextInput(`${engine.currentInput} `)
                    }}
                    disabled={phase !== 'racing' || engine.phase === 'finished'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                    enterKeyHint="done"
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    aria-label="Type the displayed words"
                    aria-describedby="mp-typing-hint"
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
              {(phase === 'waiting' || phase === 'countdown' || (phase === 'racing' && engine.phase !== 'finished')) && (
                <p id="mp-typing-hint" className="mp-tap-hint">
                  {phase === 'racing'
                    ? 'Select the words to type. Space moves to the next word; Tab moves between controls.'
                    : 'Your words are ready. Typing opens when the race starts.'}
                </p>
              )}

              {/* Host controls / waiting notice */}
              {phase === 'waiting' && (
                <div className="mp-waiting-controls">
                  {isHost ? (
                    <>
                      <div className="mp-time-options" role="group" aria-label="Race duration">
                        {[30, 60, 90, 120].map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`mode-btn${timeLimit === t ? ' active' : ''}`}
                            onClick={() => setTimeLimit(t)}
                            aria-pressed={timeLimit === t}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="restart-btn mp-start-btn"
                        onClick={() => startRace(timeLimit)}
                        disabled={state.players.length < 2 || connectionStatus !== 'connected'}
                      >
                        Start Race
                      </button>
                      <p className="mp-tap-hint mp-waiting-hint">
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
                  exit={{ opacity: 0 }}
                  transition={FADE_TRANSITION}
                  className="mp-tap-hint"
                  role="status"
                >
                  Waiting for others to finish…
                </motion.p>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </main>

        <MultiplayerFooter />
      </div>
    </div>
  )
}
