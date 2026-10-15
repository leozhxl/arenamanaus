import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PRICING } from '@/lib/constants';
import type { Court, CourtBlock, Reservation, TrialClass } from '@/lib/types';

// ── Tipos do admin (colunas extras criadas pelo supabase/admin-crm.sql) ──
export type AdminReservation = Reservation & {
  customer_id: string | null;
  notes: string | null;
  paid: boolean;
  source: string;
  created_at: string;
};

export type Lead = TrialClass & {
  customer_id: string | null;
  notes: string | null;
  created_at: string;
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export type { Court, CourtBlock };

const pad = (n: number) => String(n).padStart(2, '0');

// ── Agenda ──
export const DAY_START = 6 * 60; // 06:00
export const DAY_END = 23 * 60; // 23:00
export const DURATIONS = [1, 1.5, 2, 2.5, 3];
export const START_TIMES = Array.from({ length: (DAY_END - DAY_START) / 30 }, (_, i) => minToTime(DAY_START + i * 30));

export const PAYMENT_METHODS: Record<string, string> = {
  pix: 'Pix',
  arena: 'Na arena',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
};

export const LEAD_STATUSES = [
  { id: 'pending', label: 'Novo', color: 'bg-sunset/15 text-sunset' },
  { id: 'contacted', label: 'Em contato', color: 'bg-sea/15 text-sea-dark' },
  { id: 'scheduled', label: 'Aula marcada', color: 'bg-lime/30 text-ink' },
  { id: 'converted', label: 'Virou aluno', color: 'bg-ink text-lime' },
  { id: 'lost', label: 'Perdido', color: 'bg-ink/10 text-ink/50' },
] as const;

export const SPORT_COLORS: Record<string, string> = {
  futevolei: 'bg-lime/25 border-lime-dark text-ink',
  volei: 'bg-sea/15 border-sea text-ink',
  beachtennis: 'bg-sunset/15 border-sunset text-ink',
};

// ── Datas e horários ──
export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function formatDateLong(dateStr: string) {
  return parseDateStr(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function formatDateShort(dateStr: string) {
  return parseDateStr(dateStr.slice(0, 10)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minToTime(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function endTime(start: string, durationHours: number) {
  return minToTime(timeToMin(start) + Math.round(durationHours * 60));
}

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

// ── Dinheiro e telefone ──
export function formatPrice(value: number) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export function formatPhone(phone: string) {
  let d = onlyDigits(phone);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function whatsappTo(phone: string, message = '') {
  let d = onlyDigits(phone);
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Mesma tabela de preços do site: fim de semana, noite (a partir das 18h) ou dia */
export function suggestedPrice(dateStr: string, start: string, durationHours: number) {
  const day = parseDateStr(dateStr).getDay();
  const base =
    day === 0 || day === 6 ? PRICING.courtWeekend : timeToMin(start) >= 18 * 60 ? PRICING.courtNight : PRICING.courtDay;
  return base * durationHours;
}

// ── Dados ──
export function useCourts(onlyActive = false) {
  const [courts, setCourts] = useState<Court[]>([]);
  const reload = useCallback(async () => {
    let q = supabase.from('courts').select('*').order('id');
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    setCourts((data ?? []) as Court[]);
  }, [onlyActive]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { courts, reload };
}

/** Procura reserva ou bloqueio que bata com o horário. Devolve a mensagem do conflito, ou null. */
export async function findConflict(r: { id?: string; court_id: number; date: string; start_time: string; duration_hours: number }) {
  const [res, blocks] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, start_time, duration_hours, player_name')
      .eq('court_id', r.court_id)
      .eq('date', r.date)
      .neq('status', 'cancelled'),
    supabase.from('court_blocks').select('*').eq('date', r.date),
  ]);
  const s = timeToMin(r.start_time);
  const e = s + r.duration_hours * 60;

  const clash = (res.data ?? []).find((x) => {
    const xs = timeToMin(x.start_time);
    return x.id !== r.id && overlaps(s, e, xs, xs + x.duration_hours * 60);
  });
  if (clash) return `Já existe reserva de ${clash.player_name} às ${clash.start_time.slice(0, 5)} nessa quadra.`;

  const block = ((blocks.data ?? []) as CourtBlock[]).find(
    (b) => (b.court_id === null || b.court_id === r.court_id) && overlaps(s, e, timeToMin(b.start_time), timeToMin(b.end_time))
  );
  if (block) return `Horário bloqueado: ${block.reason}.`;
  return null;
}
