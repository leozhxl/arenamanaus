import { useCallback, useEffect, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import ReservationModal from './ReservationModal';
import { useDataChanged } from './realtime';
import {
  DAY_END,
  DAY_START,
  SPORT_COLORS,
  START_TIMES,
  addDays,
  endTime,
  formatDateLong,
  formatPrice,
  minToTime,
  timeToMin,
  toDateStr,
  useCourts,
  type AdminReservation,
  type CourtBlock,
} from './lib';
import { Button, ErrorText, Field, Modal, PageHeader, Spinner, inputCls } from './ui';

const ROW = 64; // altura de 1 hora na grade, em px
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60);

const top = (time: string) => ((timeToMin(time) - DAY_START) / 60) * ROW;

const dateFromHash = () => {
  const d = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('d');
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

export default function Agenda() {
  const { courts } = useCourts(true);
  const [date, setDate] = useState(() => dateFromHash() ?? toDateStr(new Date()));
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [blocks, setBlocks] = useState<CourtBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [modal, setModal] = useState<{ reservation?: AdminReservation; preset?: Partial<AdminReservation> } | null>(null);
  const [blockModal, setBlockModal] = useState(false);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b] = await Promise.all([
      supabase.from('reservations').select('*').eq('date', date).order('start_time'),
      supabase.from('court_blocks').select('*').eq('date', date),
    ]);
    setReservations((r.data ?? []) as AdminReservation[]);
    setBlocks((b.data ?? []) as CourtBlock[]);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  // Aviso de nova reserva leva para /admin#agenda?d=AAAA-MM-DD
  useEffect(() => {
    const onHash = () => {
      const d = dateFromHash();
      if (d) setDate(d);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const visible = reservations.filter((r) => showCancelled || r.status !== 'cancelled');
  const active = reservations.filter((r) => r.status !== 'cancelled');
  const dayTotal = active.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const unpaid = active.filter((r) => !r.paid).length;

  const isToday = date === toDateStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const removeBlock = async (b: CourtBlock) => {
    if (!confirm(`Remover o bloqueio "${b.reason}"?`)) return;
    await supabase.from('court_blocks').delete().eq('id', b.id);
    load();
  };

  const closeAndReload = () => {
    setModal(null);
    setBlockModal(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Clique num horário vazio para reservar. Clique numa reserva para editar."
        actions={
          <>
            <Button variant="ghost" onClick={() => setBlockModal(true)}>
              <Ban size={16} /> Bloquear horário
            </Button>
            <Button onClick={() => setModal({ preset: { date } })}>
              <Plus size={16} /> Nova reserva
            </Button>
          </>
        }
      />

      {/* Navegação de datas */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(addDays(date, -1))} className="rounded-lg border border-ink/15 bg-white p-2 hover:bg-ink/5" aria-label="Dia anterior">
            <ChevronLeft size={18} />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputCls} w-auto`} />
          <button onClick={() => setDate(addDays(date, 1))} className="rounded-lg border border-ink/15 bg-white p-2 hover:bg-ink/5" aria-label="Próximo dia">
            <ChevronRight size={18} />
          </button>
        </div>
        {!isToday && (
          <Button variant="ghost" onClick={() => setDate(toDateStr(new Date()))}>
            Hoje
          </Button>
        )}
        <p className="font-semibold capitalize text-ink">{formatDateLong(date)}</p>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-sm text-ink/60">
          <span>
            <strong className="text-ink">{active.length}</strong> reservas
          </span>
          <span>
            <strong className="text-ink">{formatPrice(dayTotal)}</strong> no dia
          </span>
          {unpaid > 0 && <span className="font-semibold text-sunset">{unpaid} a receber</span>}
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-ink" />
            Mostrar canceladas
          </label>
        </div>
      </div>

      {loading && courts.length === 0 ? (
        <Spinner />
      ) : courts.length === 0 ? (
        <ErrorText>Nenhuma quadra ativa. Cadastre as quadras na aba Quadras.</ErrorText>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${courts.length}, minmax(170px, 1fr))` }}>
            {/* Cabeçalho */}
            <div className="sticky top-0 z-20 border-b border-ink/10 bg-white" />
            {courts.map((c) => (
              <div key={c.id} className="sticky top-0 z-20 border-b border-l border-ink/10 bg-white px-3 py-3">
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-ink/50">{SPORT_LABELS[c.sport as Sport] ?? c.sport}</p>
              </div>
            ))}

            {/* Horas */}
            <div className="relative" style={{ height: HOURS.length * ROW }}>
              {HOURS.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink/40" style={{ top: ((h - DAY_START) / 60) * ROW }}>
                  {h === DAY_START ? '' : minToTime(h)}
                </span>
              ))}
            </div>

            {/* Uma coluna por quadra */}
            {courts.map((court) => (
              <div key={court.id} className="relative border-l border-ink/10" style={{ height: HOURS.length * ROW }}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setModal({ preset: { court_id: court.id, sport: court.sport, date, start_time: minToTime(h) } })}
                    className="group absolute inset-x-0 border-t border-ink/5 hover:bg-lime/10"
                    style={{ top: ((h - DAY_START) / 60) * ROW, height: ROW }}
                    aria-label={`Reservar ${court.name} às ${minToTime(h)}`}
                  >
                    <Plus size={16} className="mx-auto text-lime-dark opacity-0 group-hover:opacity-100" />
                  </button>
                ))}

                {blocks
                  .filter((b) => b.court_id === null || b.court_id === court.id)
                  .map((b) => (
                    <button
                      key={b.id}
                      onClick={() => removeBlock(b)}
                      title="Clique para remover o bloqueio"
                      className="absolute inset-x-1 z-10 overflow-hidden rounded-lg border border-ink/20 px-2 py-1 text-left text-xs text-ink/60"
                      style={{
                        top: top(b.start_time),
                        height: Math.max(((timeToMin(b.end_time) - timeToMin(b.start_time)) / 60) * ROW - 2, 22),
                        background: 'repeating-linear-gradient(45deg, #f1ede6, #f1ede6 6px, #e6e0d6 6px, #e6e0d6 12px)',
                      }}
                    >
                      <span className="font-semibold">Bloqueado</span> · {b.reason}
                    </button>
                  ))}

                {visible
                  .filter((r) => r.court_id === court.id)
                  .map((r) => {
                    const start = r.start_time.slice(0, 5);
                    const cancelled = r.status === 'cancelled';
                    return (
                      <button
                        key={r.id}
                        onClick={() => setModal({ reservation: r })}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md ${
                          SPORT_COLORS[r.sport] ?? 'border-ink bg-ink/5'
                        } ${cancelled ? 'opacity-40 line-through' : ''}`}
                        style={{ top: top(start) + 1, height: Math.max(r.duration_hours * ROW - 2, 24) }}
                      >
                        <p className="truncate font-semibold">{r.player_name}</p>
                        <p className="truncate text-ink/60">
                          {start}–{endTime(start, r.duration_hours)}
                          {!r.paid && !cancelled && <span className="ml-1 font-semibold text-sunset">· a receber</span>}
                        </p>
                      </button>
                    );
                  })}

                {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: ((nowMin - DAY_START) / 60) * ROW }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <ReservationModal courts={courts} reservation={modal.reservation} preset={modal.preset} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {blockModal && <BlockModal date={date} courts={courts} onClose={() => setBlockModal(false)} onSaved={closeAndReload} />}
    </div>
  );
}

function BlockModal({
  date,
  courts,
  onClose,
  onSaved,
}: {
  date: string;
  courts: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ court_id: 'all', date, start_time: '08:00', end_time: '12:00', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form.reason.trim()) return setError('Escreva o motivo (ex.: manutenção, evento, torneio).');
    if (timeToMin(form.end_time) <= timeToMin(form.start_time)) return setError('O fim precisa ser depois do início.');
    setSaving(true);
    const { error: dbError } = await supabase.from('court_blocks').insert({
      court_id: form.court_id === 'all' ? null : Number(form.court_id),
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      reason: form.reason.trim(),
    });
    setSaving(false);
    if (dbError) setError('Não foi possível bloquear.');
    else onSaved();
  };

  const ends = [...START_TIMES.slice(1), minToTime(DAY_END)];

  return (
    <Modal
      title="Bloquear horário"
      onClose={onClose}
      footer={
        <>
          <Button onClick={save} loading={saving}>
            Bloquear
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink/60">O horário bloqueado some do site e não pode ser reservado.</p>
        <Field label="Quadra">
          <select value={form.court_id} onChange={(e) => setForm({ ...form, court_id: e.target.value })} className={inputCls}>
            <option value="all">Todas as quadras</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Início">
            <select value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls}>
              {START_TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Fim">
            <select value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputCls}>
              {ends.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Motivo">
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Manutenção da areia" className={inputCls} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Modal>
  );
}
