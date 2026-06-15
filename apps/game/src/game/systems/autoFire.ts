/**
 * Archero-style auto-fire cadence. Owns its own timer; the actual bullet spawn
 * is delegated to the injected `fire` callback (kept in GameLoop, which knows the
 * bullet shape). No renderer, no other system.
 */
export class AutoFireSystem {
  private timer = 0
  private active = false
  private readonly intervalMs: number

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs
  }

  /** true = auto-fire (stationary), false = stop firing (moving). */
  setActive(active: boolean): void {
    this.active = active
    if (!active) this.timer = 0 // reset so firing resumes immediately on next stationary
  }

  tick(deltaMs: number, fire: () => void): void {
    if (!this.active) return
    this.timer -= deltaMs
    if (this.timer <= 0) {
      fire()
      this.timer = this.intervalMs
    }
  }
}
