import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, CalendarCheck, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import { formatDateShort, useCourts, type AdminReservation, type Lead } from './lib';
import { notifyDataChanged, playChime, unlockAudio } from './realtime';

type Toast = { id: number; kind: 'reservation' | 'lead'; title: string; body: string; date?: string };

const TOAST_MS = 15_000;
const POLL_MS = 60_000; // segurança: recarrega a cada minuto mesmo se o tempo real cair
const BASE_TITLE = 'Admin · Arena Manaus';

/**
 * Escuta o banco em tempo real. Quando chega reserva ou pedido de aula pelo site:
 * mostra aviso na tela, toca um som, conta na aba do navegador e atualiza a página aberta.
 */
export default function LiveUpdates({
  onOpen,
  onConnectedChange,
}: {
  onOpen: (tab: 'agenda' | 'leads', date?: string) => void;
  onConnectedChange: (connected: boolean) => void;
}) {
  const { courts } = useCourts();
  const courtsRef = useRef(courts);
  courtsRef.current = courts;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const unseen = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const announce = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), TOAST_MS);
      playChime();

      if (document.hidden) {
        unseen.current += 1;
        document.title = `(${unseen.current}) ${toast.title} · Arena Manaus`;
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(toast.title, { body: toast.body, tag: String(id) });
          n.onclick = () => {
            window.focus();
            onOpen(toast.kind === 'reservation' ? 'agenda' : 'leads', toast.date);
            n.close();
          };
        }
      }
    },
    [dismiss, onOpen]
  );

  // Conexão em tempo real com o Supabase
  useEffect(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        notifyDataChanged();
        if (payload.eventType !== 'INSERT') return;
        const r = payload.new as AdminReservation;
        if (r.source === 'admin') return; // feita pela própria equipe
        const court = courtsRef.current.find((c) => c.id === r.court_id)?.name ?? `Quadra ${r.court_id}`;
        announce({
          kind: 'reservation',
          title: 'Nova reserva pelo site',
          body: `${r.player_name} · ${court} · ${formatDateShort(r.date)} às ${r.start_time.slice(0, 5)}`,
          date: r.date,
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trial_classes' }, (payload) => {
        notifyDataChanged();
        if (payload.eventType !== 'INSERT') return;
        const l = payload.new as Lead;
        announce({
          kind: 'lead',
          title: 'Novo pedido de aula experimental',
          body: `${l.name} · ${SPORT_LABELS[l.sport as Sport] ?? l.sport} · ${l.level}`,
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, notifyDataChanged)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'court_blocks' }, notifyDataChanged)
      .subscribe((status) => onConnectedChange(status === 'SUBSCRIBED'));

    const poll = setInterval(notifyDataChanged, POLL_MS);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [announce, onConnectedChange]);

  // Zera o contador da aba quando a pessoa volta para o painel
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        unseen.current = 0;
        document.title = BASE_TITLE;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    // Libera o som no primeiro clique
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <>
      {/* Avisos na tela */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex animate-float-up items-start gap-3 rounded-2xl border-l-4 border-lime bg-ink p-4 text-foam shadow-2xl"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
              {t.kind === 'reservation' ? <CalendarCheck size={18} /> : <Sparkles size={18} />}
            </div>
            <button
              className="flex-1 text-left"
              onClick={() => {
                onOpen(t.kind === 'reservation' ? 'agenda' : 'leads', t.date);
                dismiss(t.id);
              }}
            >
              <p className="text-sm font-bold">{t.title}</p>
              <p className="mt-0.5 text-sm text-foam/70">{t.body}</p>
              <p className="mt-1 text-xs font-semibold text-lime">Ver {t.kind === 'reservation' ? 'na agenda' : 'pedido'} →</p>
            </button>
            <button onClick={() => dismiss(t.id)} className="text-foam/40 hover:text-foam" aria-label="Fechar aviso">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Indicador "Ao vivo" e botão para ativar alertas do navegador (fica no menu lateral) */
export function LiveStatus({ connected }: { connected: boolean }) {
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));

  const askPermission = async () => {
    unlockAudio();
    if ('Notification' in window) setPermission(await Notification.requestPermission());
  };

  return (
    <div className="space-y-2 px-3 pb-3">
      <p className="flex items-center gap-2 text-xs text-foam/50">
        <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-lime' : 'bg-foam/30'}`} />
        {connected ? 'Ao vivo: novas reservas aparecem sozinhas' : 'Conectando...'}
      </p>
      {permission === 'default' && (
        <button
          onClick={askPermission}
          className="flex w-full items-center gap-2 rounded-lg bg-foam/10 px-3 py-2 text-left text-xs font-semibold text-foam hover:bg-foam/20"
        >
          <BellRing size={14} /> Ativar alertas do navegador
        </button>
      )}
    </div>
  );
}
