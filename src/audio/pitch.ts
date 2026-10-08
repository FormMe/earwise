import { audio } from './engine';

/** YIN pitch detector. Returns null when there is no clear pitch. */
export function detectPitch(buf: Float32Array, sr: number, minF = 70, maxF = 1100): { freq: number; clarity: number } | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return null;

  const tauMin = Math.floor(sr / maxF);
  const tauMax = Math.min(Math.floor(sr / minF), Math.floor(buf.length / 2) - 1);
  const W = buf.length - tauMax;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // cumulative mean normalized difference
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    run += d[tau];
    cmnd[tau] = run > 0 ? (d[tau] * tau) / run : 1;
  }
  const TH = 0.15;
  let tau = -1;
  for (let t = Math.max(2, tauMin); t <= tauMax; t++) {
    if (cmnd[t] < TH) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // parabolic interpolation
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau + 1 <= tauMax ? cmnd[tau + 1] : cmnd[tau];
  const denom = 2 * (2 * cmnd[tau] - x2 - x0);
  const better = denom !== 0 ? tau + (x2 - x0) / denom : tau;
  return { freq: sr / better, clarity: 1 - cmnd[tau] };
}

export class MicPitch {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(2048);

  async start() {
    const ctx = audio.ensure();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const src = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
  }

  read() {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.buf);
    return detectPitch(this.buf, this.analyser.context.sampleRate);
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }
}
