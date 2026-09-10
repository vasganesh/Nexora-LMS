import type { InteractionSignal, MouseTelemetry } from "./types";

export class DataCollector {
  private signals: InteractionSignal[] = [];
  private maxBufferSize = 500;
  private totalRawBytesGuarded = 0;

  // Mouse Behavioral Telemetry
  private lastMousePos = { x: 0, y: 0, time: Date.now() };
  private mouseDistancePx = 0;
  private mouseSpeeds: number[] = [];
  private directionChanges = 0;
  private lastVelocity = { vx: 0, vy: 0 };
  private lastInteractionTime = Date.now();
  private totalIdleTimeMs = 0;

  // Notes Reading Telemetry
  private notesReadingMinutes = 0;
  private notesScrollDepth = 0;
  private lastNotesTimestamp = Date.now();

  constructor() {
    this.loadFromStorage();
    this.initMouseListener();
  }

  public captureInteraction(signal: Omit<InteractionSignal, "id" | "timestamp">): InteractionSignal {
    const fullSignal: InteractionSignal = {
      ...signal,
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.signals.push(fullSignal);
    this.lastInteractionTime = Date.now();

    // Approximate size in bytes of raw interaction payload
    const approxBytes = JSON.stringify(fullSignal).length * 2;
    this.totalRawBytesGuarded += approxBytes;

    // Keep ring buffer within max size
    if (this.signals.length > this.maxBufferSize) {
      this.signals.shift();
    }

    this.saveToStorage();
    return fullSignal;
  }

  public recordMouseMove(x: number, y: number): void {
    const now = Date.now();
    const dt = Math.max(1, now - this.lastMousePos.time);
    const dx = x - this.lastMousePos.x;
    const dy = y - this.lastMousePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Filter tiny noise
    if (dist > 3) {
      this.mouseDistancePx += dist;
      const speed = dist / dt; // px per ms
      this.mouseSpeeds.push(speed);
      if (this.mouseSpeeds.length > 50) this.mouseSpeeds.shift();

      const vx = dx / dt;
      const vy = dy / dt;

      // Check for abrupt angle/direction change (mouse hesitation/jitter)
      if (this.lastVelocity.vx !== 0 || this.lastVelocity.vy !== 0) {
        const dot = vx * this.lastVelocity.vx + vy * this.lastVelocity.vy;
        if (dot < 0) {
          this.directionChanges++;
        }
      }

      this.lastVelocity = { vx, vy };
      this.lastMousePos = { x, y, time: now };
      this.lastInteractionTime = now;
    }
  }

  public recordNotesReading(minutes: number, scrollDepthPercent: number): void {
    this.notesReadingMinutes += minutes;
    this.notesScrollDepth = Math.max(this.notesScrollDepth, scrollDepthPercent);
    this.lastNotesTimestamp = Date.now();
    this.saveToStorage();
  }

  public getMouseTelemetry(): MouseTelemetry {
    const avgVelocity = this.mouseSpeeds.length > 0
      ? (this.mouseSpeeds.reduce((a, b) => a + b, 0) / this.mouseSpeeds.length) * 1000
      : 240; // px per sec

    const totalSamples = Math.max(1, this.mouseSpeeds.length);
    const jitterIndex = Math.min(1.0, (this.directionChanges / totalSamples) * 0.4);

    let hesitationLevel: MouseTelemetry["hesitationLevel"] = "Smooth";
    if (jitterIndex > 0.6) hesitationLevel = "High Jitter";
    else if (jitterIndex > 0.4) hesitationLevel = "Hesitant";
    else if (jitterIndex > 0.2) hesitationLevel = "Moderate";

    return {
      totalDistancePx: Math.round(this.mouseDistancePx),
      avgVelocity: Math.round(avgVelocity),
      jitterIndex: Math.round(jitterIndex * 100) / 100,
      hesitationLevel,
      idleTimeMs: this.totalIdleTimeMs,
    };
  }

  public getNotesTelemetry(): { totalMinutesRead: number; scrollDepthPercent: number; lastActiveTimestamp: number } {
    return {
      totalMinutesRead: Math.round(this.notesReadingMinutes * 10) / 10,
      scrollDepthPercent: Math.round(this.notesScrollDepth),
      lastActiveTimestamp: this.lastNotesTimestamp,
    };
  }

  public getRawData(limit?: number): InteractionSignal[] {
    if (limit && limit > 0) {
      return this.signals.slice(-limit);
    }
    return [...this.signals];
  }

  public getSignalsForConcept(conceptId: string, limit: number = 30): InteractionSignal[] {
    return this.signals
      .filter((s) => s.conceptId === conceptId)
      .slice(-limit);
  }

  public getSignalsForTopic(topicId: string, limit: number = 50): InteractionSignal[] {
    return this.signals
      .filter((s) => s.topicId === topicId)
      .slice(-limit);
  }

  public getRecentSignals(windowMs: number = 5 * 60 * 1000): InteractionSignal[] {
    const cutoff = Date.now() - windowMs;
    return this.signals.filter((s) => s.timestamp >= cutoff);
  }

  public getRawBytesGuarded(): number {
    return this.totalRawBytesGuarded;
  }

  public clear(): void {
    this.signals = [];
    this.mouseDistancePx = 0;
    this.directionChanges = 0;
    this.notesReadingMinutes = 0;
    localStorage.removeItem("edge_raw_signals");
  }

  private initMouseListener(): void {
    if (typeof window !== "undefined") {
      let lastCall = 0;
      window.addEventListener("mousemove", (e) => {
        const now = Date.now();
        if (now - lastCall > 50) { // throttle 50ms
          lastCall = now;
          this.recordMouseMove(e.clientX, e.clientY);
        }
      });
    }
  }

  private saveToStorage(): void {
    try {
      const recent = this.signals.slice(-100);
      localStorage.setItem("edge_raw_signals", JSON.stringify(recent));
      localStorage.setItem("edge_guarded_bytes", this.totalRawBytesGuarded.toString());
      localStorage.setItem("edge_notes_minutes", this.notesReadingMinutes.toString());
      localStorage.setItem("edge_notes_depth", this.notesScrollDepth.toString());
    } catch (e) {
      console.warn("[EdgeAI:DataCollector] LocalStorage save warning", e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("edge_raw_signals");
      if (stored) {
        this.signals = JSON.parse(stored);
      }
      const bytes = localStorage.getItem("edge_guarded_bytes");
      if (bytes) {
        this.totalRawBytesGuarded = parseInt(bytes, 10) || 0;
      }
      const nm = localStorage.getItem("edge_notes_minutes");
      if (nm) this.notesReadingMinutes = parseFloat(nm) || 0;
      const nd = localStorage.getItem("edge_notes_depth");
      if (nd) this.notesScrollDepth = parseFloat(nd) || 0;
    } catch (e) {
      console.warn("[EdgeAI:DataCollector] LocalStorage load warning", e);
    }
  }
}
