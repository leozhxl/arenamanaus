import { useEffect, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import {
  DURATIONS,
  PAYMENT_METHODS,
  START_TIMES,
  endTime,
  findConflict,
  formatDateShort,
  formatPhone,
  formatPrice,
  onlyDigits,
  suggestedPrice,
  whatsappTo,
  type AdminReservation,
  type Court,
  type Customer,
} from './lib';
import { Button, ErrorText, Field, Modal, inputCls } from './ui';

type Props = {
  courts: Court[];
  reservation?: AdminReservation;
  preset?: Partial<AdminReservation>;
  onClose: () => void;
  onSaved: () => void;
};

export default function ReservationModal({ courts, reservation, preset, onClose, onSaved }: Props) {
  const editing = !!reservation;
  const base = reservation ?? preset ?? {};
  const firstCourt = courts.find((c) => c.id === base.court_id) ?? courts[0];

  const [form, setForm] = useState({
    player_name: base.player_name ?? '',
    player_phone: base.player_phone ? formatPhone(base.player_phone) : '',
    player_email: base.player_email ?? '',
    court_id: firstCourt?.id ?? 0,
    sport: (base.sport ?? firstCourt?.sport ?? 'futevolei') as string,
    date: base.date ?? '',
    start_time: (base.start_time ?? '18:00').slice(0, 5),
    duration_hours: Number(base.duration_hours ?? 1),
    num_players: Number(base.num_players ?? 4),
    total_price: Number(base.total_price ?? 0),
    payment_method: base.payment_method ?? 'pix',
    paid: base.paid ?? false,
    notes: base.notes ?? '',
    status: base.status ?? 'confirmed',
  });
  const [priceTouched, setPriceTouched] = useState(editing);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Preço sugerido pela tabela, até a pessoa mexer no valor
  useEffect(() => {
    if (!priceTouched && form.date) {
      const price = suggestedPrice(form.date, form.start_time, form.duration_hours);
      setForm((f) => ({ ...f, total_price: price }));
    }
  }, [form.date, form.start_time, form.duration_hours, priceTouched]);

  // Busca de cliente já cadastrado
  useEffect(() => {
    const q = search.trim().replace(/[,()%]/g, '');
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const digits = onlyDigits(q);
      const filter = digits.length >= 3 ? `name.ilike.%${q}%,phone.ilike.%${digits}%` : `name.ilike.%${q}%`;
      const { data } = await supabase.from('customers').select('*').or(filter).order('name').limit(6);
      setResults((data ?? []) as Customer[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const pickCustomer = (c: Customer) => {
    setForm((f) => ({ ...f, player_name: c.name, player_phone: formatPhone(c.phone), player_email: c.email ?? '' }));
    setSearch('');
    setResults([]);
  };

  const onCourtChange = (id: number) => {
    const court = courts.find((c) => c.id === id);
    setForm((f) => ({ ...f, court_id: id, sport: court?.sport ?? f.sport }));
  };

  const save = async () => {
    setError(null);
    if (!form.player_name.trim() || onlyDigits(form.player_phone).length < 10) {
      setError('Preencha o nome e um WhatsApp com DDD.');
      return;
    }
    if (!form.date) {
      setError('Escolha a data.');
      return;
    }
    setSaving(true);

    if (form.status !== 'cancelled') {
      const conflict = await findConflict({ id: reservation?.id, ...form });
      if (conflict) {
        setError(conflict);
        setSaving(false);
        return;
      }
    }

    const payload = {
      ...form,
      player_name: form.player_name.trim(),
      player_phone: form.player_phone.trim(),
      player_email: form.player_email.trim(),
      notes: form.notes.trim() || null,
    };
    const { error: dbError } = editing
      ? await supabase.from('reservations').update(payload).eq('id', reservation.id)
      : await supabase.from('reservations').insert({ ...payload, source: 'admin' });

    setSaving(false);
    if (dbError) {
      console.error(dbError);
      // 23P01 = o banco barrou: já existe reserva nesse horário/quadra
      setError(dbError.code === '23P01' ? 'Esse horário acabou de ser reservado nessa quadra. Escolha outro.' : 'Não foi possível salvar. Tente de novo.');
      return;
    }
    onSaved();
  };

  const setStatus = async (status: string) => {
    if (!reservation) return;
    if (status === 'cancelled' && !confirm('Cancelar esta reserva? O horário fica livre de novo.')) return;
    setSaving(true);
    const { error: dbError } = await supabase.from('reservations').update({ status }).eq('id', reservation.id);
    setSaving(false);
    if (dbError) setError('Não foi possível alterar a reserva.');
    else onSaved();
  };

  const remove = async () => {
    if (!reservation || !confirm('Excluir esta reserva de vez? Isso não pode ser desfeito.')) return;
    setSaving(true);
    const { error: dbError } = await supabase.from('reservations').delete().eq('id', reservation.id);
    setSaving(false);
    if (dbError) setError('Não foi possível excluir.');
    else onSaved();
  };

  const courtName = courts.find((c) => c.id === form.court_id)?.name ?? '';
  const confirmMsg = `Oi, ${form.player_name.split(' ')[0]}! Sua reserva na Arena Manaus está confirmada ✅\n${courtName} · ${
    form.date ? formatDateShort(form.date) : ''
  } · ${form.start_time} às ${endTime(form.start_time, form.duration_hours)}\nValor: ${formatPrice(form.total_price)}`;

  return (
    <Modal
      title={editing ? 'Editar reserva' : 'Nova reserva'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={save} loading={saving}>
            {editing ? 'Salvar alterações' : 'Criar reserva'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {editing && (
            <div className="ml-auto flex flex-wrap gap-2">
              {form.player_phone && (
                <a
                  href={whatsappTo(form.player_phone, confirmMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {reservation.status === 'cancelled' ? (
                <Button variant="ghost" onClick={() => setStatus('confirmed')} disabled={saving}>
                  Reativar
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setStatus('cancelled')} disabled={saving}>
                  Cancelar reserva
                </Button>
              )}
              <Button variant="danger" onClick={remove} disabled={saving}>
                Excluir
              </Button>
            </div>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {editing && reservation.status === 'cancelled' && <ErrorText>Esta reserva está cancelada.</ErrorText>}

        {/* Cliente */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Cliente</h3>
          {!editing && (
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente cadastrado (nome ou telefone)"
                className={`${inputCls} pl-9`}
              />
              {results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ink/10 bg-white shadow-lg">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickCustomer(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-sand"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-ink/50">{formatPhone(c.phone)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome *">
              <input value={form.player_name} onChange={(e) => set('player_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="WhatsApp *">
              <input
                type="tel"
                value={form.player_phone}
                onChange={(e) => set('player_phone', e.target.value)}
                placeholder="(48) 99999-9999"
                className={inputCls}
              />
            </Field>
            <Field label="E-mail">
              <input type="email" value={form.player_email} onChange={(e) => set('player_email', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </section>

        {/* Horário */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Quadra e horário</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quadra">
              <select value={form.court_id} onChange={(e) => onCourtChange(Number(e.target.value))} className={inputCls}>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modalidade">
              <select value={form.sport} onChange={(e) => set('sport', e.target.value)} className={inputCls}>
                {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
                  <option key={s} value={s}>
                    {SPORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Data *">
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Início">
              <select value={form.start_time} onChange={(e) => set('start_time', e.target.value)} className={inputCls}>
                {START_TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Duração">
              <select value={form.duration_hours} onChange={(e) => set('duration_hours', Number(e.target.value))} className={inputCls}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d === 1 ? '1 hora' : `${String(d).replace('.', ',')} horas`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jogadores">
              <input
                type="number"
                min={1}
                max={20}
                value={form.num_players}
                onChange={(e) => set('num_players', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          <p className="text-xs text-ink/50">
            Termina às <strong>{endTime(form.start_time, form.duration_hours)}</strong>
          </p>
        </section>

        {/* Pagamento */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Pagamento</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Valor (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.total_price}
                onChange={(e) => {
                  setPriceTouched(true);
                  set('total_price', Number(e.target.value));
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Forma de pagamento">
              <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} className={inputCls}>
                {Object.entries(PAYMENT_METHODS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-medium">
              <input type="checkbox" checked={form.paid} onChange={(e) => set('paid', e.target.checked)} className="h-4 w-4 accent-lime-dark" />
              Já foi pago
            </label>
          </div>
        </section>

        <Field label="Observações">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Ex.: vai trazer as próprias bolas, aluguel de raquete..."
            className={inputCls}
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Modal>
  );
}
