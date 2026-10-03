'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import { useRoom, type ConnectionStatus } from '@/hooks/useRoom'
import type { ActiveRoomSession } from '@/lib/multiplayer/types'
import { loadRaceInput, saveRaceInput } from '@/lib/multiplayer/checkpoint'
import { WORDS_LIST } from '@/lib/datasets'
import { seededWordList } from '@/lib/seededRandom'
import { FADE_TRANSITION } from '@/lib/motion'
import WordDisplay from '@/components/typing/WordDisplay'
import PlayerLane from './PlayerLane'
import WinnerScreen from './WinnerScreen'
import { MultiplayerFooter, MultiplayerHeader } from './MultiplayerSiteChrome'

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === 'connected') return null
  const text = {
    connecting: 'Restoring room connection…',
    syncing: 'Restoring current race state…',
    error: 'Room synchronization paused. Retry to reconnect.',
    disconnected: 'Connection lost — attempting to reconnect…',
  }[status]
  return (
    <motion.div
      className={`mp-connection-banner is-${status}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={FADE_TRANSITION} role="status" aria-live="polite"
    >
      {text}
    </motion.div>
  )
}

interface Props {
  session: ActiveRoomSession
  onLeave: () => void
}

export default function MultiplayerRace({ session, onLeave }: Props) {
  const { roomCode, playerId } = session
  const {
    state, isHost, hasSnapshot, connectionStatus, error, retry,
    emitProgress, emitFinish, startRace, leaveRoom,
  } = useRoom(session)
  const engine = useTypingEngine()
  const { enterCustomWordRace, exitCustomWordRace, restoreCustomWordRace, captureCustomWordRace, finishCurrentTest } = engine
  const words = useMemo(() => seededWordList(WORDS_LIST, 60, parseInt(roomCode, 10)), [roomCode])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const finishEmittedRef = useRef(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inputReady, setInputReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [leaving, setLeaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [copyHint, setCopyHint] = useState<'idle' | 'copied' | 'err'>('idle')
  const phase = state.phase
  const self = state.players.find(player => player.id === playerId)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    enterCustomWordRace(words)
    return () => exitCustomWordRace()
  }, [words, enterCustomWordRace, exitCustomWordRace])

  useEffect(() => {
    if (inputReady || engine.mode !== 'words' || engine.words.length !== words.length ||
      !engine.words.every((word, index) => word === words[index])) return
    const checkpoint = loadRaceInput(session, words)
    if (checkpoint) restoreCustomWordRace(checkpoint)
    setInputReady(true)
  }, [inputReady, engine.mode, engine.words, words, session, restoreCustomWordRace])

  useEffect(() => {
    if (inputReady) saveRaceInput(session, captureCustomWordRace())
  }, [inputReady, session, captureCustomWordRace, engine.currentInput, engine.wordResults, engine.phase])

  const canType = inputReady && hasSnapshot && connectionStatus === 'connected' &&
    phase === 'racing' && state.timeLeft > 0 && !state.closed &&
    !self?.finished && !self?.withdrawn && engine.phase !== 'finished'

  useEffect(() => {
    if (!canType) return
    const focused = document.activeElement
    if (!focused || focused === document.body || focused.id === 'main-content') {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [canType])

  useEffect(() => {
    if (inputReady && hasSnapshot && (phase === 'finished' || self?.finished ||
      (phase === 'racing' && state.timeLeft === 0))) finishCurrentTest()
  }, [inputReady, hasSnapshot, phase, self?.finished, state.timeLeft, finishCurrentTest])

  useEffect(() => {
    if (!inputReady || connectionStatus !== 'connected' || phase !== 'racing' ||
      state.closed || self?.finished || self?.withdrawn || engine.phase !== 'active') return
    emitProgress(engine.wordResults.length / Math.max(engine.words.length, 1), Math.min(400, engine.liveWPM))
  }, [inputReady, connectionStatus, phase, state.closed, self?.finished, self?.withdrawn,
    engine.phase, engine.wordResults.length, engine.words.length, engine.liveWPM, emitProgress])

  useEffect(() => {
    // A timer-expired test is not a full-word completion. Never turn it into
    // progress=1, or resubmit a finish the server already acknowledged.
    if (!inputReady || connectionStatus !== 'connected' || phase !== 'racing' ||
      state.closed || self?.finished || self?.withdrawn || engine.phase !== 'finished' ||
      engine.wordResults.length < engine.words.length || finishEmittedRef.current) return
    finishEmittedRef.current = true
    void emitFinish(Math.min(400, engine.finalResults?.wpm ?? engine.liveWPM)).then(sent => {
      if (!sent) finishEmittedRef.current = false
    })
  }, [inputReady, connectionStatus, phase, state.closed, self?.finished, self?.withdrawn,
    engine.phase, engine.wordResults.length, engine.words.length, engine.finalResults, engine.liveWPM, emitFinish])

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
  }, [])

  const handleLeave = useCallback(async () => {
    if (leaving) return
    setLeaving(true)
    if (await leaveRoom()) onLeave()
    else setLeaving(false)
  }, [leaving, leaveRoom, onLeave])

  const handleStart = async () => {
    setStarting(true)
    await startRace(timeLimit)
    setStarting(false)
  }

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

  const showWinner = phase === 'finished' && state.winnerId
  const connectedCount = state.players.filter(player => player.connected).length

  return (
    <div className="app-shell bg-grid">
      <div className="app-window">
        <MultiplayerHeader
          right={(
            <>
              <div className="mp-room-actions" role="group" aria-label="Room details">
                <span className="mp-room-code"><span className="sr-only">Room code </span>{roomCode}</span>
                <button
                  type="button" className="mp-secondary-btn" onClick={copyRoomCode}
                  aria-label={copyHint === 'copied' ? 'Copied room code' : copyHint === 'err' ? 'Try again to copy room code' : 'Copy room code'}
                >
                  {copyHint === 'copied' ? 'Copied' : copyHint === 'err' ? 'Try again' : 'Copy'}
                </button>
                <span className="sr-only" role="status">
                  {copyHint === 'copied' ? 'Room code copied.' : copyHint === 'err' ? 'Could not copy. Select the room code to copy it manually.' : ''}
                </span>
                <span className="mp-room-meta"><span className="sr-only">Connected players </span>{connectedCount}/5</span>
              </div>
              <button type="button" className="mp-nav-link" disabled={leaving} onClick={() => void handleLeave()}>
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
            </>
          )}
        />

        <main id="main-content" className="app-main" tabIndex={-1} aria-labelledby="mp-race-heading">
          <h1 id="mp-race-heading" className="sr-only">Multiplayer race</h1>
          <AnimatePresence>
            {connectionStatus !== 'connected' && <ConnectionBanner key="connection" status={connectionStatus} />}
          </AnimatePresence>
          {(error || connectionStatus === 'error') && (
            <div className="mp-banner" role="alert">
              <p>{error || 'Could not connect to the room.'}</p>
              <button type="button" className="mp-secondary-btn" onClick={retry}>Retry</button>
            </div>
          )}
          {state.closed && <p className="mp-banner" role="status">The host ended this room. Choose Leave to return to the lobby.</p>}

          <AnimatePresence initial={false} mode="popLayout">
            {showWinner ? (
              <motion.div
                key="winner" className="mp-winner-panel"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE_TRANSITION}
              >
                <WinnerScreen
                  players={state.players} winnerId={state.winnerId!} selfId={playerId}
                  onLeave={() => void handleLeave()} leaving={leaving}
                />
              </motion.div>
            ) : (
              <motion.div
                key="race" className="mp-race-content"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE_TRANSITION}
              >
                <section className="mp-lanes-panel" aria-label="Race progress">
                  <AnimatePresence initial={false}>
                    {phase === 'countdown' && !state.closed && (
                      <motion.div
                        key="countdown" className="mp-countdown-notice" role="status"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE_TRANSITION}
                      >
                        <span>Race starts in</span><span className="mp-countdown-num">{state.countdown}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {phase === 'racing' && !state.closed && (
                    <p
                      className={`mp-race-timer${state.timeLeft <= 10 ? ' is-urgent' : ''}`}
                      role="timer" aria-label={`${state.timeLeft} seconds remaining`}
                    >
                      {state.timeLeft}s
                    </p>
                  )}
                  {state.players.length === 0 ? (
                    <p className="mp-tap-hint mp-empty-lanes">
                      {connectionStatus === 'connected' ? 'Waiting for players to join…' : 'Restoring room presence…'}
                    </p>
                  ) : state.players.map(player => (
                    <PlayerLane
                      key={player.id} player={player} isSelf={player.id === playerId}
                      isWinner={state.winnerId === player.id} compact={isMobile} isRacing={phase === 'racing'}
                    />
                  ))}
                </section>

                {hasSnapshot && !state.closed && (
                  <>
                    <div
                      className={`word-shell mp-word-shell ${canType && engine.phase === 'active' ? 'is-active' : 'is-idle'}${!canType ? ' is-waiting' : ''}`}
                      onClick={() => canType && inputRef.current?.focus({ preventScroll: true })}
                    >
                      <input
                        ref={inputRef} className="typing-input-proxy" value={engine.currentInput}
                        onChange={event => canType && engine.handleTextInput(event.target.value)}
                        onKeyDown={event => {
                          if (!canType || event.key !== 'Enter' || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
                          event.preventDefault()
                          engine.handleTextInput(`${engine.currentInput} `)
                        }}
                        disabled={!canType} autoCapitalize="none" autoCorrect="off" autoComplete="off"
                        spellCheck={false} inputMode="text" enterKeyHint="done"
                        data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"
                        aria-label="Type the displayed words" aria-describedby="mp-typing-hint"
                      />
                      <WordDisplay
                        words={engine.words} curIdx={engine.currentWordIdx} input={engine.currentInput}
                        results={engine.wordResults} isIdle={engine.phase === 'idle'}
                      />
                    </div>
                    <p id="mp-typing-hint" className="mp-tap-hint">
                      {phase === 'racing'
                        ? self?.finished || engine.phase === 'finished' ? 'Waiting for others to finish…'
                          : 'Select the words to type. Space moves to the next word; Tab moves between controls.'
                        : 'Your words are ready. Typing opens when the race starts.'}
                    </p>
                  </>
                )}

                {hasSnapshot && phase === 'waiting' && !state.closed && (
                  <div className="mp-waiting-controls">
                    {isHost ? (
                      <>
                        <div className="mp-time-options" role="group" aria-label="Race duration">
                          {[30, 60, 90, 120].map(duration => (
                            <button
                              key={duration} type="button" className={`mode-btn${timeLimit === duration ? ' active' : ''}`}
                              onClick={() => setTimeLimit(duration)} aria-pressed={timeLimit === duration}
                            >
                              {duration}s
                            </button>
                          ))}
                        </div>
                        <button
                          type="button" className="restart-btn mp-start-btn" onClick={() => void handleStart()}
                          disabled={connectedCount < 2 || connectionStatus !== 'connected' || starting}
                        >
                          {starting ? 'Starting…' : 'Start Race'}
                        </button>
                        <p className="mp-tap-hint mp-waiting-hint">
                          {connectedCount < 2 ? 'Share the room code so a second player can join.' : 'Start when everyone is ready.'}
                        </p>
                      </>
                    ) : <p className="mp-tap-hint">Waiting for host to start…</p>}
                  </div>
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
