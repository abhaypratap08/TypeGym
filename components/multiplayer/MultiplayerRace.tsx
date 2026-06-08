'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import { useRoom } from '@/hooks/useRoom'
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

interface Props {
  roomCode:    string
  playerName:  string
  playerColor: string
  isHost:      boolean
  onLeave:     () => void
}

export default function MultiplayerRace({ roomCode, playerName, playerColor, isHost, onLeave }: Props) {
  const playerId = useRef(getPlayerId()).current
  const { state, emitProgress, emitFinish, startRace } = useRoom(roomCode, playerId, playerName, playerColor, isHost)
  const engine = useTypingEngine()
  const { enterCustomWordRace, exitCustomWordRace } = engine
  const inputRef = useRef<HTMLInputElement | null>(null)
  const prevWordCount = useRef(0)
  const finishEmittedRef = useRef(false)
  const [raceStarted, setRaceStarted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [copyHint, setCopyHint] = useState<'idle' | 'copied' | 'err'>('idle')

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
  }, [phase])

  useEffect(() => {
    const len = engine.wordResults.length
    if (len > prevWordCount.current && raceStarted) {
      prevWordCount.current = len
      const progress = len / Math.max(engine.words.length, 1)
      emitProgress(progress, engine.liveWPM)
    }
  }, [engine.wordResults.length, engine.liveWPM, engine.words.length, emitProgress, raceStarted])

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
      <MultiplayerHeader
        right={(
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
              <span
                style={{
                  fontFamily: 'var(--font-outfit), sans-serif',
                  fontWeight: 700,
                  fontSize: 24,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                Room{' '}
                <span style={{ color: 'var(--accent-blue)', letterSpacing: '0.12em' }}>{roomCode}</span>
              </span>
              <button
                type="button"
                className="mp-secondary-btn"
                onClick={copyRoomCode}
                title="Copy room code"
              >
                {copyHint === 'copied' ? 'Copied' : copyHint === 'err' ? 'Copy failed' : 'Copy code'}
              </button>
              <span className="mp-room-meta">{state.players.length}/5 players</span>
            </div>
            <button type="button" className="mp-nav-link" onClick={handleLeave}>
              leave
            </button>
          </>
        )}
      />

      <main className="app-main">
        <AnimatePresence mode="wait">
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
              className="test-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
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

              <div className="mp-lanes-panel">
                {state.players.length === 0 ? (
                  <div className="mp-tap-hint" style={{ padding: '12px 0' }}>
                    Waiting for players to join…
                  </div>
                ) : (
                  state.players.map(p => (
                    <PlayerLane
                      key={p.id}
                      player={p}
                      isSelf={p.id === playerId}
                      isWinner={state.winnerId === p.id}
                      compact={isMobile}
                    />
                  ))
                )}
              </div>

              {(phase === 'racing' || phase === 'waiting') && (
                <div
                  className={`word-shell ${phase === 'racing' && engine.phase === 'active' ? 'is-active' : 'is-idle'}`}
                  onClick={() => phase === 'racing' && inputRef.current?.focus()}
                  style={{
                    opacity: phase === 'racing' ? 1 : 0.6,
                    pointerEvents: phase === 'racing' ? 'auto' : 'none',
                    filter: phase === 'waiting' ? 'blur(6px)' : 'none',
                    transition: 'filter 0.3s ease, opacity 0.3s ease',
                    userSelect: 'none',
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

              {phase === 'waiting' && (
                <div style={{ textAlign: 'center' }}>
                  {isHost ? (
                    <>
                      {/* Time limit picker */}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                        {[30, 60, 90, 120].map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`mode-btn${timeLimit === t ? ' active' : ''}`}
                            onClick={() => setTimeLimit(t)}
                            style={{ fontSize: 14, padding: '8px 16px' }}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="restart-btn"
                        onClick={() => startRace(timeLimit)}
                        disabled={state.players.length < 2}
                        title={state.players.length < 2 ? 'At least two players are required to start' : undefined}
                        style={{ padding: '13px 36px', fontSize: 16, whiteSpace: 'nowrap' }}
                      >
                        Start Race
                      </button>
                      <p className="mp-tap-hint" style={{ marginTop: 12 }}>
                        {state.players.length < 2
                          ? 'Share the room code so a second player can join.'
                          : 'When everyone is ready, start the countdown.'}
                      </p>
                    </>
                  ) : (
                    <p className="mp-tap-hint">Waiting for host to start…</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <MultiplayerFooter />
    </div>
  )
}
