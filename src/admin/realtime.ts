import { useEffect } from 'react';

/** Evento disparado quando algo muda no banco (tempo real ou atualização periódica) */
export const DATA_CHANGED = 'admin:data-changed';

export const notifyDataChanged = () => window.dispatchEvent(new Event(DATA_CHANGED));

/** Recarrega os dados da tela sempre que o banco mudar */
export function useDataChanged(reload: () => void) {
  useEffect(() => {
    window.addEventListener(DATA_CHANGED, reload);
    return () => window.removeEventListener(DATA_CHANGED, reload);
  }, [reload]);
}

let audioCtx: AudioContext | null = null;

/** O navegador só libera som depois de um clique na página */
export function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // navegador sem suporte a áudio
  }
}

/** Toque curto de duas notas, gerado no navegador (sem arquivo de áudio) */
export function playChime() {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // sem som, segue só o aviso visual
  }
}
