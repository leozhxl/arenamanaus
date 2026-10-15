import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, Plus, RotateCcw, Search, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LESSON_PRICING } from '@/lib/constants';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import { PAYMENT_METHODS, formatDateShort, formatPhone, formatPrice, onlyDigits, parseDateStr, toDateStr, whatsappTo } from './lib';
import { useDataChanged } from './realtime';
import { Button, Card, ErrorText, Field, Modal, PageHeader, Spinner, inputCls } from './ui';

// ── Tipos ──
type StudentStatus = 'active' | 'paused' | 'cancelled';

interface Student {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  sport: string;
  level: string | null;
  plan: string;
  monthly_fee: number;
  due_day: number;
  start_date: string;
  status: StudentStatus;
  notes: string | null;
}

interface Payment {
  id: string;
  student_id: string;
  reference_month: string;
  due_date: string;
  amount: number;
  paid_at: string | null;
  method: string | null;
  notes: string | null;
}

// ── Planos (mesmos valores da seção Aulas do site) ──
const PLANS = [
  { label: '1x/semana', price: LESSON_PRICING.onceWeek },
  { label: '2x/semana', price: LESSON_PRICING.twiceWeek },
  { label: '3x/semana', price: LESSON_PRICING.thriceWeek },
  { label: 'Aula particular', price: LESSON_PRICING.private },
  { label: 'Personalizado', price: 0 },
];

const LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Kids', 'Feminino'];

const STATUS_LABELS: Record<StudentStatus, string> = { active: 'Ativo', paused: 'Pausado', cancelled: 'Cancelado' };

const MONTHS_BACK = 11; // gera cobranças até 12 meses para trás (desde o início do aluno)

// ── Datas ──
const monthStart = (d: Date) => toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));

function dueDateFor(refMonth: string, dueDay: number) {
  const d = parseDateStr(refMonth);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), Math.min(dueDay, last)));
}

const monthLabel = (refMonth: string) => {
  const s = parseDateStr(refMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const daysBetween = (from: string, to: string) => Math.round((parseDateStr(to).getTime() - parseDateStr(from).getTime()) / 86_400_000);

// ── Situação da mensalidade ──
type PayState = 'paid' | 'late' | 'soon' | 'open';

function payState(p: Payment, today: string): PayState {
  if (p.paid_at) return 'paid';
  if (p.due_date < today) return 'late';
  if (daysBetween(today, p.due_date) <= 5) return 'soon';
  return 'open';
}

function payBadge(p: Payment, today: string) {
  const state = payState(p, today);
  if (state === 'paid') return { text: 'Pago', cls: 'bg-lime/30 text-ink' };
  if (state === 'late') {
    const d = daysBetween(p.due_date, today);
    return { text: `Atrasada ${d} dia${d > 1 ? 's' : ''}`, cls: 'bg-red-100 text-red-700' };
  }
  if (state === 'soon') {
    const d = daysBetween(today, p.due_date);
    return { text: d === 0 ? 'Vence hoje' : `Vence em ${d} dia${d > 1 ? 's' : ''}`, cls: 'bg-sunset/20 text-sunset' };
  }
  return { text: 'Em aberto', cls: 'bg-ink/10 text-ink/60' };
}

/** Cria as mensalidades que faltam (do início do aluno até o mês atual) */
async function ensureCharges(students: Student[]) {
  const now = new Date();
  const current = monthStart(now);
  const oldest = monthStart(new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1));
  const rows: Omit<Payment, 'id' | 'paid_at' | 'method' | 'notes'>[] = [];

  for (const s of students) {
    if (s.status !== 'active' || Number(s.monthly_fee) <= 0) continue;
    let ref = [monthStart(parseDateStr(s.start_date)), oldest].sort().reverse()[0];
    while (ref <= current) {
      rows.push({ student_id: s.id, reference_month: ref, due_date: dueDateFor(ref, s.due_day), amount: Number(s.monthly_fee) });
      const d = parseDateStr(ref);
      ref = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }
  if (rows.length) {
    await supabase.from('student_payments').upsert(rows, { onConflict: 'student_id,reference_month', ignoreDuplicates: true });
  }
}

function chargeMessage(s: Student, p: Payment) {
  const late = !p.paid_at && p.due_date < toDateStr(new Date());
  return [
    `Oi, ${s.name.split(' ')[0]}! Tudo bem? Aqui é da Arena Manaus 👋`,
    '',
    late
      ? `A mensalidade de *${monthLabel(p.reference_month).toLowerCase()}* venceu em ${formatDateShort(p.due_date)} e ainda consta em aberto.`
      : `Passando para lembrar da mensalidade de *${monthLabel(p.reference_month).toLowerCase()}*.`,
    `• Plano: ${s.plan}`,
    `• Valor: ${formatPrice(Number(p.amount))}`,
    `• Vencimento: ${formatDateShort(p.due_date)}`,
    '',
    'Se já pagou, pode desconsiderar. Qualquer dúvida é só chamar!',
  ].join('\n');
}

// ════════════════════════════════════════════════════════════════════
export default function Alunos() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'late' | 'soon' | 'paid' | 'inactive'>('all');
  const [open, setOpen] = useState<Student | 'new' | null>(null);
  const [receiving, setReceiving] = useState<{ student: Student; payment: Payment } | null>(null);
  const ensuredMonth = useRef<string | null>(null);

  const load = useCallback(async () => {
    const since = monthStart(new Date(new Date().getFullYear(), new Date().getMonth() - MONTHS_BACK, 1));
    const { data: s } = await supabase.from('students').select('*').order('name');
    const list = (s ?? []) as Student[];
    // Na primeira carga e na virada do mês, cria as mensalidades que ainda não existem
    const month = monthStart(new Date());
    if (ensuredMonth.current !== month) {
      ensuredMonth.current = month;
      await ensureCharges(list);
    }
    const { data: p } = await supabase.from('student_payments').select('*').gte('reference_month', since).order('reference_month');
    setStudents(list);
    setPayments((p ?? []) as Payment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  const today = toDateStr(new Date());
  const currentMonth = monthStart(new Date());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = onlyDigits(q);
    return students
      .map((s) => {
        const mine = payments.filter((p) => p.student_id === s.id);
        const late = mine.filter((p) => payState(p, today) === 'late');
        const current = mine.find((p) => p.reference_month === currentMonth) ?? null;
        // Próxima a receber: a atrasada mais antiga, senão a do mês
        const toReceive = late[0] ?? (current && !current.paid_at ? current : null);
        return { s, late, current, toReceive };
      })
      .filter(({ s }) => !q || s.name.toLowerCase().includes(q) || (digits.length >= 3 && onlyDigits(s.phone).includes(digits)))
      .filter(({ s, late, current }) => {
        if (filter === 'inactive') return s.status !== 'active';
        if (filter === 'all') return true;
        if (s.status !== 'active') return false;
        if (filter === 'late') return late.length > 0;
        if (filter === 'soon') return late.length === 0 && !!current && payState(current, today) === 'soon';
        return late.length === 0 && !!current?.paid_at;
      })
      .sort((a, b) => b.late.length - a.late.length || a.s.name.localeCompare(b.s.name));
  }, [students, payments, query, filter, today, currentMonth]);

  // Resumo do mês
  const active = students.filter((s) => s.status === 'active');
  const monthPayments = payments.filter((p) => p.reference_month === currentMonth);
  const expected = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const received = monthPayments.filter((p) => p.paid_at).reduce((sum, p) => sum + Number(p.amount), 0);
  const latePays = payments.filter((p) => payState(p, today) === 'late' && students.find((s) => s.id === p.student_id)?.status === 'active');
  const lateTotal = latePays.reduce((sum, p) => sum + Number(p.amount), 0);

  const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'late', label: 'Atrasados' },
    { id: 'soon', label: 'Vencendo' },
    { id: 'paid', label: 'Em dia' },
    { id: 'inactive', label: 'Pausados/cancelados' },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle="Planos e mensalidades. A cobrança de cada mês é criada sozinha no dia 1."
        actions={
          <Button onClick={() => setOpen('new')}>
            <Plus size={16} /> Novo aluno
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-ink/60">Alunos ativos</p>
          <p className="mt-2 font-display text-3xl">{active.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink/60">Previsto no mês</p>
          <p className="mt-2 font-display text-3xl">{formatPrice(expected)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink/60">Recebido no mês</p>
          <p className="mt-2 font-display text-3xl text-lime-dark">{formatPrice(received)}</p>
          <p className="mt-1 text-xs text-ink/50">{formatPrice(Math.max(expected - received, 0))} a receber</p>
        </Card>
        <button className="text-left" onClick={() => setFilter('late')}>
          <Card className={`h-full p-5 ${latePays.length ? 'border-red-200 bg-red-50' : ''}`}>
            <p className="text-sm text-ink/60">Em atraso</p>
            <p className={`mt-2 font-display text-3xl ${latePays.length ? 'text-red-600' : ''}`}>{formatPrice(lateTotal)}</p>
            <p className="mt-1 text-xs text-ink/50">
              {latePays.length} mensalidade{latePays.length === 1 ? '' : 's'}
            </p>
          </Card>
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno por nome ou telefone" className={`${inputCls} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-ink/10 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? 'bg-ink text-foam' : 'text-ink/60 hover:bg-ink/5'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink/50">
          {students.length === 0 ? (
            <>
              Nenhum aluno cadastrado. Clique em <strong>Novo aluno</strong> para começar.
            </>
          ) : (
            'Nenhum aluno neste filtro.'
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-sand/60 text-left text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Plano</th>
                  <th className="px-4 py-3 text-right font-semibold">Mensalidade</th>
                  <th className="px-4 py-3 font-semibold">Vence</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, late, current, toReceive }) => {
                  const inactive = s.status !== 'active';
                  const badge = inactive
                    ? { text: STATUS_LABELS[s.status], cls: 'bg-ink/10 text-ink/50' }
                    : late.length > 1
                    ? { text: `${late.length} mensalidades atrasadas`, cls: 'bg-red-100 text-red-700' }
                    : late.length === 1
                    ? payBadge(late[0], today)
                    : current
                    ? payBadge(current, today)
                    : { text: 'Sem cobrança', cls: 'bg-ink/10 text-ink/50' };
                  return (
                    <tr key={s.id} onClick={() => setOpen(s)} className={`cursor-pointer border-t border-ink/5 hover:bg-sand/40 ${inactive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{s.name}</p>
                        <p className="text-xs text-ink/50">
                          {SPORT_LABELS[s.sport as Sport] ?? s.sport}
                          {s.level && ` · ${s.level}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink/70">{s.plan}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatPrice(Number(s.monthly_fee))}</td>
                      <td className="px-4 py-3 text-ink/70">Dia {s.due_day}</td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {!inactive && toReceive && (
                          <div className="flex justify-end gap-2">
                            <a
                              href={whatsappTo(s.phone, chargeMessage(s, toReceive))}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Cobrar no WhatsApp"
                              className="rounded-lg border border-ink/15 bg-white p-2 text-[#128C7E] hover:bg-ink/5"
                            >
                              <MessageCircle size={16} />
                            </a>
                            <Button className="px-3 py-1.5" onClick={() => setReceiving({ student: s, payment: toReceive })}>
                              <Wallet size={14} /> Receber
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && (
        <StudentModal
          student={open === 'new' ? null : open}
          payments={open === 'new' ? [] : payments.filter((p) => p.student_id === open.id)}
          onReceive={(student, payment) => setReceiving({ student, payment })}
          onClose={() => setOpen(null)}
          onSaved={async (saved) => {
            setOpen(null);
            if (saved) await ensureCharges([saved]);
            load();
          }}
          onPaymentsChanged={load}
        />
      )}
      {receiving && (
        <ReceiveModal
          {...receiving}
          onClose={() => setReceiving(null)}
          onSaved={() => {
            setReceiving(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Cadastro / ficha do aluno ──
function StudentModal({
  student,
  payments,
  onReceive,
  onClose,
  onSaved,
  onPaymentsChanged,
}: {
  student: Student | null;
  payments: Payment[];
  onReceive: (s: Student, p: Payment) => void;
  onClose: () => void;
  onSaved: (saved: Student | null) => void;
  onPaymentsChanged: () => void;
}) {
  const [form, setForm] = useState({
    name: student?.name ?? '',
    phone: student ? formatPhone(student.phone) : '',
    email: student?.email ?? '',
    birth_date: student?.birth_date ?? '',
    sport: student?.sport ?? 'futevolei',
    level: student?.level ?? 'Iniciante',
    plan: student?.plan ?? PLANS[1].label,
    monthly_fee: Number(student?.monthly_fee ?? PLANS[1].price),
    due_day: student?.due_day ?? 10,
    start_date: student?.start_date ?? toDateStr(new Date()),
    status: (student?.status ?? 'active') as StudentStatus,
    notes: student?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = toDateStr(new Date());

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pickPlan = (label: string) => {
    const plan = PLANS.find((p) => p.label === label);
    setForm((f) => ({ ...f, plan: label, monthly_fee: plan && plan.price > 0 ? plan.price : f.monthly_fee }));
  };

  const save = async () => {
    setError(null);
    if (!form.name.trim() || onlyDigits(form.phone).length < 10) return setError('Preencha o nome e um WhatsApp com DDD.');
    if (!form.plan.trim()) return setError('Escolha o plano.');
    if (form.due_day < 1 || form.due_day > 31) return setError('O dia de vencimento vai de 1 a 31.');
    setSaving(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      birth_date: form.birth_date || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: dbError } = student
      ? await supabase.from('students').update(payload).eq('id', student.id).select().single()
      : await supabase.from('students').insert(payload).select().single();

    if (dbError) {
      console.error(dbError);
      setSaving(false);
      return setError('Não foi possível salvar o aluno.');
    }

    // Mudou valor ou vencimento: atualiza as mensalidades em aberto a partir deste mês
    if (student && (Number(student.monthly_fee) !== form.monthly_fee || student.due_day !== form.due_day)) {
      const pending = payments.filter((p) => !p.paid_at && p.reference_month >= monthStart(new Date()));
      await Promise.all(
        pending.map((p) =>
          supabase
            .from('student_payments')
            .update({ amount: form.monthly_fee, due_date: dueDateFor(p.reference_month, form.due_day) })
            .eq('id', p.id)
        )
      );
    }
    setSaving(false);
    onSaved(data as Student);
  };

  const undoPayment = async (p: Payment) => {
    if (!confirm(`Desfazer o pagamento de ${monthLabel(p.reference_month)}?`)) return;
    await supabase.from('student_payments').update({ paid_at: null, method: null }).eq('id', p.id);
    onPaymentsChanged();
  };

  const removeStudent = async () => {
    if (!student || !confirm(`Excluir ${student.name} e todo o histórico de mensalidades? Para só parar de cobrar, mude a situação para "Cancelado".`)) return;
    await supabase.from('students').delete().eq('id', student.id);
    onSaved(null);
  };

  const history = [...payments].sort((a, b) => b.reference_month.localeCompare(a.reference_month));
  const paidTotal = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Modal
      title={student ? student.name : 'Novo aluno'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={save} loading={saving}>
            {student ? 'Salvar' : 'Cadastrar aluno'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {student && (
            <Button variant="danger" className="ml-auto" onClick={removeStudent}>
              Excluir
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {student && (
          <a
            href={whatsappTo(student.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle size={16} /> {formatPhone(student.phone)}
          </a>
        )}

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Dados do aluno</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome *">
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="WhatsApp *">
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(48) 99999-9999" className={inputCls} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Data de nascimento">
              <input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Plano e mensalidade</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Modalidade">
              <select value={form.sport} onChange={(e) => set('sport', e.target.value)} className={inputCls}>
                {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
                  <option key={s} value={s}>
                    {SPORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Turma / nível">
              <select value={form.level} onChange={(e) => set('level', e.target.value)} className={inputCls}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Plano *">
              <select value={PLANS.some((p) => p.label === form.plan) ? form.plan : 'Personalizado'} onChange={(e) => pickPlan(e.target.value)} className={inputCls}>
                {PLANS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                    {p.price > 0 ? ` · ${formatPrice(p.price)}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {!PLANS.slice(0, -1).some((p) => p.label === form.plan) && (
            <Field label="Nome do plano personalizado">
              <input
                value={form.plan === 'Personalizado' ? '' : form.plan}
                onChange={(e) => set('plan', e.target.value || 'Personalizado')}
                placeholder="Ex.: 2x/semana + 1 particular"
                className={inputCls}
              />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Valor mensal (R$)">
              <input type="number" min={0} step="0.01" value={form.monthly_fee} onChange={(e) => set('monthly_fee', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Dia do vencimento">
              <input type="number" min={1} max={31} value={form.due_day} onChange={(e) => set('due_day', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Início das aulas">
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Situação">
              <select value={form.status} onChange={(e) => set('status', e.target.value as StudentStatus)} className={inputCls}>
                {Object.entries(STATUS_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-ink/50">
            Todo mês é criada uma mensalidade de <strong>{formatPrice(form.monthly_fee)}</strong> com vencimento no dia{' '}
            <strong>{form.due_day}</strong>
            {form.due_day > 28 && ' (nos meses mais curtos, vence no último dia)'}. Aluno pausado ou cancelado não gera cobrança.
          </p>
        </section>

        <Field label="Observações">
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Desconto combinado, horário fixo, lesões, responsável (se for criança)..."
            className={inputCls}
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        {student && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink/40">Mensalidades</h3>
              <p className="text-xs text-ink/50">
                Total pago: <strong className="text-ink">{formatPrice(paidTotal)}</strong>
              </p>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-ink/50">Nenhuma mensalidade ainda.</p>
            ) : (
              <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
                {history.map((p) => {
                  const badge = payBadge(p, today);
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                      <div className="w-36">
                        <p className="font-semibold">{monthLabel(p.reference_month)}</p>
                        <p className="text-xs text-ink/50">Vence {formatDateShort(p.due_date)}</p>
                      </div>
                      <span className="font-semibold">{formatPrice(Number(p.amount))}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
                      {p.paid_at && (
                        <span className="text-xs text-ink/50">
                          em {formatDateShort(p.paid_at)}
                          {p.method && ` · ${PAYMENT_METHODS[p.method] ?? p.method}`}
                        </span>
                      )}
                      <div className="ml-auto flex gap-2">
                        {p.paid_at ? (
                          <button onClick={() => undoPayment(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50 hover:text-ink">
                            <RotateCcw size={12} /> Desfazer
                          </button>
                        ) : (
                          <>
                            <a
                              href={whatsappTo(student.phone, chargeMessage(student, p))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-[#128C7E] hover:bg-ink/5"
                            >
                              <MessageCircle size={13} /> Cobrar
                            </a>
                            <Button className="px-2.5 py-1.5 text-xs" onClick={() => onReceive(student, p)}>
                              <Wallet size={13} /> Receber
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}

// ── Registrar pagamento ──
function ReceiveModal({ student, payment, onClose, onSaved }: { student: Student; payment: Payment; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ amount: Number(payment.amount), paid_at: toDateStr(new Date()), method: 'pix', notes: payment.notes ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    const { error: dbError } = await supabase
      .from('student_payments')
      .update({ amount: form.amount, paid_at: form.paid_at, method: form.method, notes: form.notes.trim() || null })
      .eq('id', payment.id);
    setSaving(false);
    if (dbError) setError('Não foi possível registrar o pagamento.');
    else onSaved();
  };

  return (
    <Modal
      title="Registrar pagamento"
      onClose={onClose}
      footer={
        <>
          <Button onClick={save} loading={saving}>
            <CheckCircle2 size={16} /> Confirmar pagamento
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink/70">
          <strong className="text-ink">{student.name}</strong> · {student.plan} · mensalidade de {monthLabel(payment.reference_month).toLowerCase()}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor recebido (R$)">
            <input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Data do pagamento">
            <input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Forma de pagamento">
          <div className="flex flex-wrap gap-2">
            {Object.entries(PAYMENT_METHODS)
              .filter(([id]) => id !== 'arena')
              .map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm({ ...form, method: id })}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${form.method === id ? 'border-ink bg-ink text-foam' : 'border-ink/15 bg-white hover:bg-ink/5'}`}
                >
                  {label}
                </button>
              ))}
          </div>
        </Field>
        <Field label="Observação">
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: pagou com desconto" className={inputCls} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Modal>
  );
}
