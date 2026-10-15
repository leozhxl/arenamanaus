import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import ReservationModal from './ReservationModal';
import { useDataChanged } from './realtime';
import {
  PAYMENT_METHODS,
  addDays,
  endTime,
  formatPhone,
  formatPrice,
  onlyDigits,
  parseDateStr,
  toDateStr,
  type AdminReservation,
  type Court,
} from './lib';
import { Card, Spinner, inputCls, inputAutoCls } from './ui';

type SortKey = 'date' | 'court' | 'name' | 'price';

const weekday = (d: string) => parseDateStr(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
const dateBR = (d: string) => parseDateStr(d).toLocaleDateString('pt-BR');

/** Atalhos de período */
function presetRange(id: string): [string, string] {
  const now = new Date();
  const today = toDateStr(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case 'hoje':
      return [today, today];
    case 'semana': {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return [toDateStr(monday), addDays(toDateStr(monday), 6)];
    }
    case 'mes':
      return [toDateStr(new Date(y, m, 1)), toDateStr(new Date(y, m + 1, 0))];
    case 'mes-passado':
      return [toDateStr(new Date(y, m - 1, 1)), toDateStr(new Date(y, m, 0))];
    default: // próximos 30 dias
      return [today, addDays(today, 30)];
  }
}

const PRESETS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'proximos', label: 'Próximos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes-passado', label: 'Mês passado' },
];

/** CSV que o Excel em português abre certinho (separador ; e acentos) */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(escape).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const money = (v: number) => v.toFixed(2).replace('.', ',');

export default function AgendaPlanilha({ courts }: { courts: Court[] }) {
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('proximos'));
  const [preset, setPreset] = useState('proximos');
  const [rows, setRows] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [court, setCourt] = useState('all');
  const [status, setStatus] = useState<'active' | 'cancelled' | 'all'>('active');
  const [payment, setPayment] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'date', asc: true });
  const [editing, setEditing] = useState<AdminReservation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('start_time')
      .limit(5000);
    setRows((data ?? []) as AdminReservation[]);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  const courtName = useCallback((id: number) => courts.find((c) => c.id === id)?.name ?? `Quadra ${id}`, [courts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = onlyDigits(q);
    const list = rows.filter((r) => {
      if (court !== 'all' && String(r.court_id) !== court) return false;
      if (status === 'active' && r.status === 'cancelled') return false;
      if (status === 'cancelled' && r.status !== 'cancelled') return false;
      if (payment === 'paid' && !r.paid) return false;
      if (payment === 'unpaid' && r.paid) return false;
      if (q && !r.player_name.toLowerCase().includes(q) && !(digits.length >= 3 && onlyDigits(r.player_phone).includes(digits))) return false;
      return true;
    });
    const dir = sort.asc ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === 'court') return dir * (courtName(a.court_id).localeCompare(courtName(b.court_id)) || a.date.localeCompare(b.date));
      if (sort.key === 'name') return dir * a.player_name.localeCompare(b.player_name);
      if (sort.key === 'price') return dir * (Number(a.total_price) - Number(b.total_price));
      return dir * (a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    });
  }, [rows, court, status, payment, query, sort, courtName]);

  const totals = useMemo(() => {
    const active = filtered.filter((r) => r.status !== 'cancelled');
    const total = active.reduce((s, r) => s + Number(r.total_price || 0), 0);
    const paid = active.filter((r) => r.paid).reduce((s, r) => s + Number(r.total_price || 0), 0);
    const hours = active.reduce((s, r) => s + Number(r.duration_hours || 0), 0);
    return { count: active.length, total, paid, open: total - paid, hours };
  }, [filtered]);

  const pickPreset = (id: string) => {
    setPreset(id);
    setRange(presetRange(id));
  };

  const togglePaid = async (r: AdminReservation) => {
    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, paid: !r.paid } : x)));
    await supabase.from('reservations').update({ paid: !r.paid }).eq('id', r.id);
  };

  const exportCsv = () => {
    const header = ['Data', 'Dia', 'Início', 'Fim', 'Duração (h)', 'Quadra', 'Modalidade', 'Cliente', 'WhatsApp', 'E-mail', 'Jogadores', 'Valor (R$)', 'Pagamento', 'Pago', 'Status', 'Origem', 'Observações'];
    const body = filtered.map((r) => {
      const start = r.start_time.slice(0, 5);
      return [
        dateBR(r.date),
        weekday(r.date),
        start,
        endTime(start, r.duration_hours),
        String(r.duration_hours).replace('.', ','),
        courtName(r.court_id),
        SPORT_LABELS[r.sport as Sport] ?? r.sport,
        r.player_name,
        formatPhone(r.player_phone),
        r.player_email ?? '',
        r.num_players,
        money(Number(r.total_price || 0)),
        PAYMENT_METHODS[r.payment_method] ?? r.payment_method,
        r.paid ? 'Sim' : 'Não',
        r.status === 'cancelled' ? 'Cancelada' : 'Confirmada',
        r.source === 'admin' ? 'Admin' : 'Site',
        r.notes ?? '',
      ];
    });
    const footer = ['', '', '', '', String(totals.hours).replace('.', ','), '', '', `${totals.count} reservas`, '', '', '', money(totals.total), '', `Recebido: ${money(totals.paid)}`, `A receber: ${money(totals.open)}`, '', ''];
    downloadCsv(`reservas_${from}_a_${to}.csv`, [header, ...body, [], footer]);
  };

  const sortHeader = (key: SortKey, label: string, className = '') => (
    <th className={`px-3 py-3 font-semibold ${className}`}>
      <button onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))} className="inline-flex items-center gap-1 uppercase hover:text-ink">
        {label}
        {sort.key === key && (sort.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div>
      {/* Período */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => pickPreset(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${preset === p.id ? 'bg-ink text-foam' : 'border border-ink/15 bg-white text-ink/70 hover:bg-ink/5'}`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 text-sm text-ink/60">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPreset('');
              setRange([e.target.value, to < e.target.value ? e.target.value : to]);
            }}
            className={`${inputAutoCls} py-1.5`}
            aria-label="De"
          />
          até
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setPreset('');
              setRange([from, e.target.value]);
            }}
            className={`${inputAutoCls} py-1.5`}
            aria-label="Até"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente ou telefone" className={`${inputCls} pl-9`} />
        </div>
        <select value={court} onChange={(e) => setCourt(e.target.value)} className={inputAutoCls} aria-label="Quadra">
          <option value="all">Todas as quadras</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)} className={inputAutoCls} aria-label="Pagamento">
          <option value="all">Pagas e a receber</option>
          <option value="paid">Só pagas</option>
          <option value="unpaid">Só a receber</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputAutoCls} aria-label="Situação">
          <option value="active">Confirmadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D6F42] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Download size={16} /> Baixar planilha (Excel)
        </button>
      </div>

      {/* Totais */}
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/60">
        <span>
          <strong className="text-ink">{totals.count}</strong> reservas
        </span>
        <span>
          <strong className="text-ink">{String(totals.hours).replace('.', ',')}h</strong> de quadra
        </span>
        <span>
          Total <strong className="text-ink">{formatPrice(totals.total)}</strong>
        </span>
        <span>
          Recebido <strong className="text-lime-dark">{formatPrice(totals.paid)}</strong>
        </span>
        <span>
          A receber <strong className="text-sunset">{formatPrice(totals.open)}</strong>
        </span>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink/50">Nenhuma reserva nesse período com esses filtros.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="sticky top-0 z-10 bg-sand text-left text-xs uppercase tracking-wider text-ink/50 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                <tr>
                  {sortHeader('date', 'Data')}
                  <th className="px-3 py-3 font-semibold">Horário</th>
                  {sortHeader('court', 'Quadra')}
                  {sortHeader('name', 'Cliente')}
                  <th className="px-3 py-3 font-semibold">WhatsApp</th>
                  <th className="px-3 py-3 text-center font-semibold">Jog.</th>
                  {sortHeader('price', 'Valor', 'text-right')}
                  <th className="px-3 py-3 font-semibold">Pagamento</th>
                  <th className="px-3 py-3 text-center font-semibold">Pago</th>
                  <th className="px-3 py-3 font-semibold">Origem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const start = r.start_time.slice(0, 5);
                  const cancelled = r.status === 'cancelled';
                  const newDay = i === 0 || filtered[i - 1].date !== r.date;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setEditing(r)}
                      className={`cursor-pointer hover:bg-lime/10 ${newDay && sort.key === 'date' ? 'border-t-2 border-ink/10' : 'border-t border-ink/5'} ${
                        cancelled ? 'text-ink/40 line-through' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="font-semibold">{dateBR(r.date)}</span> <span className="text-xs text-ink/50">{weekday(r.date)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {start}–{endTime(start, r.duration_hours)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {courtName(r.court_id)}
                        <span className="block text-xs text-ink/50">{SPORT_LABELS[r.sport as Sport] ?? r.sport}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{r.player_name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink/70">{formatPhone(r.player_phone)}</td>
                      <td className="px-3 py-2.5 text-center">{r.num_players}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">{formatPrice(Number(r.total_price))}</td>
                      <td className="px-3 py-2.5 text-ink/70">{PAYMENT_METHODS[r.payment_method] ?? r.payment_method}</td>
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {!cancelled && (
                          <input
                            type="checkbox"
                            checked={r.paid}
                            onChange={() => togglePaid(r)}
                            className="h-4 w-4 cursor-pointer accent-lime-dark"
                            aria-label={r.paid ? 'Marcar como a receber' : 'Marcar como pago'}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold no-underline ${r.source === 'admin' ? 'bg-ink/10 text-ink/60' : 'bg-sea/15 text-sea-dark'}`}>
                          {r.source === 'admin' ? 'Admin' : 'Site'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <ReservationModal
          courts={courts}
          reservation={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
