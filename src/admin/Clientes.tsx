import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, MessageCircle, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import ReservationModal from './ReservationModal';
import { useDataChanged } from './realtime';
import {
  LEAD_STATUSES,
  endTime,
  formatDateShort,
  formatPhone,
  formatPrice,
  onlyDigits,
  toDateStr,
  useCourts,
  whatsappTo,
  type AdminReservation,
  type Customer,
  type Lead,
} from './lib';
import { Button, Card, ErrorText, Field, Modal, PageHeader, Spinner, inputCls, inputAutoCls } from './ui';

type Stats = { count: number; spent: number; last: string | null; unpaid: number };

export default function Clientes() {
  const { courts } = useCourts(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'spent'>('recent');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('reservations').select('id, customer_id, date, total_price, status, paid'),
    ]);
    setCustomers((c.data ?? []) as Customer[]);
    setReservations((r.data ?? []) as AdminReservation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  const stats = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const r of reservations) {
      if (!r.customer_id || r.status === 'cancelled') continue;
      const s = map.get(r.customer_id) ?? { count: 0, spent: 0, last: null, unpaid: 0 };
      s.count += 1;
      s.spent += Number(r.total_price || 0);
      if (!r.paid) s.unpaid += 1;
      if (!s.last || r.date > s.last) s.last = r.date;
      map.set(r.customer_id, s);
    }
    return map;
  }, [reservations]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = onlyDigits(q);
    const empty: Stats = { count: 0, spent: 0, last: null, unpaid: 0 };
    return customers
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && c.phone.includes(digits)) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
      .map((c) => ({ ...c, stats: stats.get(c.id) ?? empty }))
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'spent') return b.stats.spent - a.stats.spent;
        return (b.stats.last ?? b.created_at).localeCompare(a.stats.last ?? a.created_at);
      });
  }, [customers, stats, query, sort]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} clientes. Quem reserva ou pede aula pelo site entra aqui automaticamente.`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Novo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, telefone ou etiqueta" className={`${inputCls} pl-9`} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={inputAutoCls}>
          <option value="recent">Mais recentes</option>
          <option value="spent">Quem mais gastou</option>
          <option value="name">Nome (A–Z)</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink/50">{query ? 'Nenhum cliente encontrado.' : 'Ainda não há clientes.'}</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-sand/60 text-left text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">WhatsApp</th>
                  <th className="px-4 py-3 text-center font-semibold">Reservas</th>
                  <th className="px-4 py-3 font-semibold">Última vez</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer border-t border-ink/5 hover:bg-sand/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.name}</p>
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span key={t} className="rounded-full bg-lime/30 px-2 py-0.5 text-[11px] font-medium text-ink">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/70">{formatPhone(c.phone)}</td>
                    <td className="px-4 py-3 text-center">
                      {c.stats.count}
                      {c.stats.unpaid > 0 && <span className="ml-1 text-xs font-semibold text-sunset">({c.stats.unpaid} a receber)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink/70">{c.stats.last ? formatDateShort(c.stats.last) : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPrice(c.stats.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <CustomerModal
          customer={selected}
          courts={courts}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
      {creating && (
        <NewCustomerModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({
  customer,
  courts,
  onClose,
  onChanged,
}: {
  customer: Customer;
  courts: { id: number; name: string; sport: string; active: boolean }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email ?? '',
    notes: customer.notes ?? '',
    tags: customer.tags.join(', '),
  });
  const [history, setHistory] = useState<AdminReservation[] | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ reservation?: AdminReservation } | null>(null);

  const loadHistory = useCallback(async () => {
    const [r, l] = await Promise.all([
      supabase.from('reservations').select('*').eq('customer_id', customer.id).order('date', { ascending: false }).order('start_time', { ascending: false }),
      supabase.from('trial_classes').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
    ]);
    setHistory((r.data ?? []) as AdminReservation[]);
    setLeads((l.data ?? []) as Lead[]);
  }, [customer.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const save = async () => {
    if (!form.name.trim()) return setError('O nome não pode ficar vazio.');
    setSaving(true);
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const { error: dbError } = await supabase
      .from('customers')
      .update({ name: form.name.trim(), email: form.email.trim() || null, notes: form.notes.trim() || null, tags, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    setSaving(false);
    if (dbError) setError('Não foi possível salvar.');
    else onChanged();
  };

  const remove = async () => {
    if (!confirm(`Excluir ${customer.name} do CRM? As reservas continuam salvas, só perdem o vínculo.`)) return;
    await supabase.from('customers').delete().eq('id', customer.id);
    onChanged();
  };

  const active = (history ?? []).filter((r) => r.status !== 'cancelled');
  const spent = active.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const today = toDateStr(new Date());

  if (booking) {
    return (
      <ReservationModal
        courts={courts}
        reservation={booking.reservation}
        preset={{ player_name: customer.name, player_phone: customer.phone, player_email: customer.email ?? '', date: today }}
        onClose={() => setBooking(null)}
        onSaved={() => {
          setBooking(null);
          loadHistory();
        }}
      />
    );
  }

  return (
    <Modal
      title={customer.name}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={save} loading={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="danger" className="ml-auto" onClick={remove}>
            Excluir cliente
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Resumo e ações rápidas */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={whatsappTo(customer.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle size={16} /> {formatPhone(customer.phone)}
          </a>
          <Button variant="dark" onClick={() => setBooking({})}>
            <CalendarPlus size={16} /> Nova reserva
          </Button>
          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <p className="text-xs text-ink/50">Reservas</p>
              <p className="font-display text-2xl">{active.length}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Total gasto</p>
              <p className="font-display text-2xl">{formatPrice(spent)}</p>
            </div>
          </div>
        </div>

        {/* Dados */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="E-mail">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Etiquetas (separe por vírgula)" className="sm:col-span-2">
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="aluno, mensalista, vip" className={inputCls} />
          </Field>
          <Field label="Anotações" className="sm:col-span-2">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferências, nível de jogo, aniversário..."
              className={inputCls}
            />
          </Field>
        </div>
        {error && <ErrorText>{error}</ErrorText>}

        {/* Histórico */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">Histórico de reservas</h3>
          {history === null ? (
            <Spinner />
          ) : history.length === 0 ? (
            <p className="text-sm text-ink/50">Nenhuma reserva ainda.</p>
          ) : (
            <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
              {history.map((r) => {
                const start = r.start_time.slice(0, 5);
                const cancelled = r.status === 'cancelled';
                return (
                  <button
                    key={r.id}
                    onClick={() => setBooking({ reservation: r })}
                    className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left text-sm hover:bg-sand/40 ${cancelled ? 'opacity-50' : ''}`}
                  >
                    <span className="w-20 font-semibold">{formatDateShort(r.date)}</span>
                    <span className="text-ink/70">
                      {start}–{endTime(start, r.duration_hours)}
                    </span>
                    <span className="text-ink/70">{courts.find((c) => c.id === r.court_id)?.name ?? `Quadra ${r.court_id}`}</span>
                    <span className="text-ink/50">{SPORT_LABELS[r.sport as Sport] ?? r.sport}</span>
                    <span className="ml-auto font-semibold">{formatPrice(Number(r.total_price))}</span>
                    {cancelled ? (
                      <span className="text-xs text-ink/50">cancelada</span>
                    ) : r.paid ? (
                      <span className="text-xs font-semibold text-lime-dark">pago</span>
                    ) : (
                      <span className="text-xs font-semibold text-sunset">a receber</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {leads.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/40">Aulas experimentais</h3>
            <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
              {leads.map((l) => {
                const st = LEAD_STATUSES.find((s) => s.id === l.status) ?? LEAD_STATUSES[0];
                return (
                  <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="w-20 font-semibold">{formatDateShort(l.created_at)}</span>
                    <span>{SPORT_LABELS[l.sport as Sport] ?? l.sport}</span>
                    <span className="text-ink/60">{l.level}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function NewCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const phone = onlyDigits(form.phone);
    if (!form.name.trim() || phone.length < 10) return setError('Preencha o nome e um WhatsApp com DDD.');
    setSaving(true);
    const { error: dbError } = await supabase.from('customers').insert({
      name: form.name.trim(),
      phone,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (dbError) setError(dbError.code === '23505' ? 'Já existe um cliente com esse telefone.' : 'Não foi possível salvar.');
    else onSaved();
  };

  return (
    <Modal
      title="Novo cliente"
      onClose={onClose}
      footer={
        <>
          <Button onClick={save} loading={saving}>
            Cadastrar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nome *">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="WhatsApp *">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(48) 99999-9999" className={inputCls} />
        </Field>
        <Field label="E-mail">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Anotações">
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Modal>
  );
}
