'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'
import { UI_SPRING, FADE_TRANSITION } from '@/lib/motion'

interface WinnerScreenProps {
  players: RoomPlayer[]
  winnerId: string
  selfId: string
  onLeave: () => void
  leaving?: boolean
}

const rowVariants = {
  hidden: {
    opacity: 0,
    x: -6,
  },

  shown: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      ...UI_SPRING,
      delay: i * 0.05,
    },
  }),
}

function revealDurationFor(wpm: number) {
  const multiplier = Math.min(2.2, Math.max(0.6, wpm / 70))
  return Math.round(650 / multiplier)
}

export default function WinnerScreen({
  players,
  winnerId,
  selfId,
  onLeave,
  leaving,
}: WinnerScreenProps) {
  const [runId, setRunId] = useState(0)
  const [displayWpm, setDisplayWpm] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [orbPressed, setOrbPressed] = useState(false)

  const reducedMotion = useReducedMotion()
  const rafRef = useRef<number | null>(null)

  const orbRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
  })

  const winner = players.find(p => p.id === winnerId)

  const sorted = [...players].sort(
    (a, b) => b.wpm - a.wpm,
  )

  const winnerColor =
    PLAYER_COLORS.find(
      c => c.id === winner?.color,
    )?.hex ?? 'var(--teal)'

  const isSelfWinner = winnerId === selfId
  const targetWpm = winner?.wpm ?? 0

  useEffect(() => {
    if (!isSelfWinner) {
      setDisplayWpm(targetWpm)
      return
    }

    if (reducedMotion) {
      setDisplayWpm(targetWpm)
      return
    }

    setDisplayWpm(0)

    const duration = revealDurationFor(targetWpm)
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(
        1,
        (now - start) / duration,
      )

      const eased =
        1 - Math.pow(1 - t, 3)

      setDisplayWpm(
        Math.round(eased * targetWpm),
      )

      if (t < 1) {
        rafRef.current =
          requestAnimationFrame(tick)
      }
    }

    rafRef.current =
      requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = null
    }
  }, [
    runId,
    isSelfWinner,
    reducedMotion,
    targetWpm,
  ])

  useEffect(() => {
    if (!celebrating) return

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [celebrating])

  const resetOrb = () => {
    const orb = orbRef.current
    if (!orb) return

    orb.style.transition =
      'transform 560ms cubic-bezier(.16,1,.3,1)'

    orb.style.transform =
      'translate3d(0,0,0) scale(1)'

    window.setTimeout(() => {
      if (!orbRef.current) return

      orbRef.current.style.transition = ''
      orbRef.current.style.transform = ''
    }, 580)
  }

  const handleOrbPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (reducedMotion) return

    const orb = orbRef.current
    if (!orb) return

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    }

    orb.setPointerCapture(event.pointerId)
    orb.style.animationPlayState = 'paused'
    orb.style.transition = 'none'

    setOrbPressed(true)
  }

  const handleOrbPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current
    const orb = orbRef.current

    if (!drag.active || !orb) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const distance = Math.hypot(dx, dy)

    if (distance > 6) {
      drag.moved = true
    }

    const maxDistance = 170
    const clamped = Math.min(distance, maxDistance)

    const nx = distance > 0 ? dx / distance : 0
    const ny = distance > 0 ? dy / distance : 0

    const pull = clamped / maxDistance

    const x = nx * clamped * 0.22
    const y = ny * clamped * 0.22

    const stretchX =
      1 + Math.abs(nx) * pull * 0.14

    const stretchY =
      1 + Math.abs(ny) * pull * 0.14

    orb.style.transform =
      `translate3d(${x}px, ${y}px, 0) ` +
      `scale(${stretchX}, ${stretchY})`
  }

  const handleOrbPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const orb = orbRef.current
    const drag = dragRef.current

    if (!orb || !drag.active) return

    drag.active = false

    if (orb.hasPointerCapture(event.pointerId)) {
      orb.releasePointerCapture(event.pointerId)
    }

    setOrbPressed(false)
    resetOrb()

    window.setTimeout(() => {
      if (orbRef.current) {
        orbRef.current.style.animationPlayState = ''
      }
    }, 590)
  }

  const handleCelebrateClick = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.target === event.currentTarget ||
      event.target instanceof HTMLElement
    ) {
      if (!dragRef.current.moved) {
        setCelebrating(false)
      }
    }

    dragRef.current.moved = false
  }

  return (
    <>
      <motion.section
        className="result-card mp-results"
        aria-labelledby="mp-results-title"
        initial={{
          opacity: 0,
          y: reducedMotion ? 0 : 8,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: reducedMotion ? 0 : 8,
        }}
        transition={{
          ...UI_SPRING,
          opacity: FADE_TRANSITION,
        }}
        style={{
          '--winner-color': winnerColor,
        } as CSSProperties}
      >
        <motion.div
          className={`mp-trophy-wrap${
            isSelfWinner ? ' is-winner' : ''
          }`}
          initial={
            isSelfWinner && !reducedMotion
              ? {
                  scale: 0.8,
                  opacity: 0,
                }
              : false
          }
          animate={{
            scale: 1,
            opacity: 1,
          }}
          transition={UI_SPRING}
        >
          <Image
            className="mp-result-trophy"
            src="/trophy.svg"
            alt=""
            width={isSelfWinner ? 96 : 64}
            height={isSelfWinner ? 96 : 64}
            priority
          />
        </motion.div>

        <p className="result-stat-label">
          Race winner
        </p>

        <h2
          id="mp-results-title"
          className="result-title mp-break-text mp-winner-name"
        >
          {winner?.name ?? '—'}
        </h2>

        <p className="mp-winner-speed mp-winner-speed-odometer">
          {isSelfWinner ? displayWpm : targetWpm} WPM
        </p>

        <p className="mp-result-message">
          {isSelfWinner
            ? 'That’s you — nice run.'
            : 'Good race. Ready for another?'}
        </p>

        <ol
          className="mp-leaderboard"
          aria-label="Final standings"
        >
          {sorted.map((p, i) => {
            const color =
              PLAYER_COLORS.find(
                x => x.id === p.color,
              )?.hex ?? 'var(--teal)'

            return (
              <motion.li
                key={p.id}
                custom={i}
                initial={
                  reducedMotion
                    ? false
                    : 'hidden'
                }
                animate="shown"
                variants={rowVariants}
                className={`mp-leaderboard-row${
                  p.id === selfId
                    ? ' is-self'
                    : ''
                }`}
                style={{
                  '--player-color': color,
                } as CSSProperties}
              >
                <span
                  className="mp-placement"
                  aria-hidden="true"
                >
                  #{i + 1}
                </span>

                <span
                  className="mp-player-dot"
                  aria-hidden="true"
                />

                <span className="mp-break-text mp-leaderboard-name">
                  {p.name}
                  {p.id === selfId
                    ? ' (you)'
                    : ''}
                </span>

                <span className="mp-leaderboard-wpm">
                  {p.wpm} WPM
                </span>
              </motion.li>
            )
          })}
        </ol>

        <div className="mp-result-actions">
          <button
            type="button"
            className="restart-btn"
            onClick={onLeave}
            disabled={leaving}
          >
            {leaving
              ? 'Leaving…'
              : 'Leave room'}
          </button>

          <Link
            href="/"
            className="mp-secondary-btn"
          >
            Practice Solo
          </Link>

          {isSelfWinner && (
            <button
              type="button"
              className="mp-secondary-btn"
              onClick={() => {
                setRunId(k => k + 1)
                setCelebrating(true)
              }}
            >
              Celebrate 🎉
            </button>
          )}
        </div>
      </motion.section>

      <AnimatePresence>
        {celebrating && isSelfWinner && (
          <motion.div
            className="mp-celebrate-overlay"
            style={{
              '--winner-color': winnerColor,
            } as CSSProperties}
            onClick={() => setCelebrating(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mp-celebrate-panel"
              initial={
                reducedMotion
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.92,
                    }
              }
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={
                reducedMotion
                  ? undefined
                  : {
                      opacity: 0,
                      scale: 0.96,
                    }
              }
              transition={UI_SPRING}
              onClick={handleCelebrateClick}
            >
              <div
                ref={orbRef}
                className={`mp-celebrate-orb${
                  orbPressed
                    ? ' is-pressed'
                    : ''
                }`}
                onPointerDown={
                  handleOrbPointerDown
                }
                onPointerMove={
                  handleOrbPointerMove
                }
                onPointerUp={
                  handleOrbPointerUp
                }
                onPointerCancel={
                  handleOrbPointerUp
                }
              >
                <div className="mp-celebrate-orb-shape" />
              </div>

              <div className="mp-celebrate-content">
                <p className="mp-celebrate-kicker">
                  VICTORY
                </p>

                <div className="mp-celebrate-trophy">
                  <Image
                    src="/trophy.svg"
                    alt=""
                    width={128}
                    height={128}
                    priority
                  />
                </div>

                <h2 id="mp-celebrate-title">
                  You won.
                </h2>

                <p className="mp-celebrate-name">
                  {winner?.name ?? '—'}
                </p>

                <p className="mp-celebrate-wpm">
                  {targetWpm}
                  <span> WPM</span>
                </p>

                <p className="mp-celebrate-message">
                  That’s you — nice run.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
