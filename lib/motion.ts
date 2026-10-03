/** Critically damped UI motion: retargetable, with no decorative overshoot. */
export const UI_SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 40,
  mass: 1,
}

/** Non-spatial feedback for people who prefer reduced motion. */
export const FADE_TRANSITION = {
  duration: 0.15,
  ease: 'easeOut' as const,
}
