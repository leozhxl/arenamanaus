import { useCallback, useEffect, useState } from 'react';
import { useDataChanged } from './realtime';
import { ArrowRight, CalendarDays, DollarSign, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { endTime, formatPrice, toDateStr, useCourts, type AdminReservation } from './lib';
import { Card, PageHeader, Spinner } from './ui';

type Data = {
  today: AdminReservation[];
  month: AdminReservation[];
  newLeads: number;
  customers: number;
};

export default function Dashboard({ onNavigate }: { onNavigate: (tab: 'agenda' | 'leads' | 'clientes') => void }) {
  const { courts } = useCourts();
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    {
      const now = new Date();
      const today = toDateStr(now);
      const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      const monthEnd = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

      const [t, m, l, c] = await Promise.all([
        supabase.from('reservations').select('*').eq('date', today).neq('status', 'cancelled').order('start_time'),
        supabase.from('reservations').select('*').gte('date', monthStart).lte('date', monthEnd).neq('status', 'cancelled'),
        supabase.from('trial_classes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);
      setData({
        today: (t.data ?? []) as AdminReservation[],
        month: (m.data ?? []) as AdminReservation[],
        newLeads: l.count ?? 0,
        customers: c.count ?? 0,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  if (!data) return <Spinner />;

  const monthTotal = data.month.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const monthPaid = data.month.filter((r) => r.paid).reduce((s, r) => s + Number(r.total_price || 0), 0);
  const todayTotal = data.today.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  const stats = [
    { icon: CalendarDays, label: 'Reservas hoje', value: String(data.today.length), hint: formatPrice(todayTotal), tab: 'agenda' as const },
    {
      icon: DollarSign,
      label: `Faturamento de ${monthName}`,
      value: formatPrice(monthTotal),
      hint: `${formatPrice(monthTotal - monthPaid)} a receber`,
      tab: 'agenda' as const,
    },
    { icon: Sparkles, label: 'Aulas experimentais novas', value: String(data.newLeads), hint: 'aguardando contato', tab: 'leads' as const },
    { icon: Users, label: 'Clientes', value: String(data.customers), hint: `${data.month.length} reservas no mês`, tab: 'clientes' as const },
  ];

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div>
      <PageHeader title="Visão geral" subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, hint, tab }) => (
          <button key={label} onClick={() => onNavigate(tab)} className="text-left">
            <Card className="h-full p-5 transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink/60">{label}</p>
                <Icon size={18} className="text-ink/30" />
              </div>
              <p className="mt-2 font-display text-3xl text-ink">{value}</p>
              <p className="mt-1 text-xs text-ink/50">{hint}</p>
            </Card>
          </button>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display text-xl uppercase">Hoje na arena</h2>
          <button onClick={() => onNavigate('agenda')} className="inline-flex items-center gap-1 text-sm font-semibold text-sea hover:text-sea-dark">
            Abrir agenda <ArrowRight size={14} />
          </button>
        </div>
        {data.today.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink/50">Nenhuma reserva para hoje.</p>
        ) : (
          <div className="divide-y divide-ink/5">
            {data.today.map((r) => {
              const start = r.start_time.slice(0, 5);
              const end = endTime(start, r.duration_hours);
              const [h, m] = end.split(':').map(Number);
              const done = h * 60 + m <= nowMin;
              return (
                <div key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm ${done ? 'opacity-50' : ''}`}>
                  <span className="w-24 font-semibold">
                    {start}–{end}
                  </span>
                  <span className="font-medium">{r.player_name}</span>
                  <span className="text-ink/60">{courts.find((c) => c.id === r.court_id)?.name ?? `Quadra ${r.court_id}`}</span>
                  <span className="ml-auto font-semibold">{formatPrice(Number(r.total_price))}</span>
                  {r.paid ? (
                    <span className="text-xs font-semibold text-lime-dark">pago</span>
                  ) : (
                    <span className="text-xs font-semibold text-sunset">a receber</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
