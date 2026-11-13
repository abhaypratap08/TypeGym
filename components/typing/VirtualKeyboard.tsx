'use client'

import { useEffect, useState } from 'react'

const ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
]

export default function VirtualKeyboard() {
  const [pressed, setPressed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      setPressed(prev => {
        if (prev.has(k)) return prev
        const next = new Set(prev)
        next.add(k)
        return next
      })
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      setPressed(prev => {
        if (!prev.has(k)) return prev
        const next = new Set(prev)
        next.delete(k)
        return next
      })
    }
    const blur = () => setPressed(new Set())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  const isPressed = (k: string) => pressed.has(k.toLowerCase())

  return (
    <div className="virtual-keyboard" aria-hidden="true">
      {ROWS.map((row, ri) => (
        <div key={ri} className={`vk-row vk-row-${ri}`}>
          {row.map(k => (
            <div
              key={k}
              className={`vk-key${isPressed(k) ? ' is-pressed' : ''}`}
            >
              {k}
            </div>
          ))}
        </div>
      ))}
      <div className="vk-row vk-row-space">
        <div className={`vk-key vk-space${isPressed(' ') ? ' is-pressed' : ''}`}>
          &nbsp;
        </div>
      </div>
    </div>
  )
}