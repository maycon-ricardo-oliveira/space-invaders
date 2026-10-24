/**
 * Archero-style auto-fire cadence. Owns its own timer; the actual bullet spawn
 * is delegated to the injected `fire` callback (kept in GameLoop, which knows the
 * bullet shape). No renderer, no other system.
 */
export class AutoFireSystem {
  private timer = 0
  private active = false
  private intervalMs: number

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs
  }

  /**
   * Fire-rate cards change the cadence mid-run, so this is not fixed at construction.
   * A shorter interval also clamps the shot already pending: picking a fire-rate card
   * speeds the ship up immediately instead of making the player wait out the old,
   * slower window one last time. It can never delay a shot that was already due.
   */
  setInterval(intervalMs: number): void {
    this.intervalMs = intervalMs
    this.timer = Math.min(this.timer, intervalMs)
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
