import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import { LEAD_STATUSES, formatDateShort, formatPhone, whatsappTo, type Lead } from './lib';
import { Card, PageHeader, Spinner } from './ui';
import { useDataChanged } from './realtime';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('trial_classes').select('*').order('created_at', { ascending: false });
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  const update = async (lead: Lead, changes: Partial<Lead>) => {
    setLeads((all) => all.map((l) => (l.id === lead.id ? { ...l, ...changes } : l)));
    await supabase.from('trial_classes').update(changes).eq('id', lead.id);
  };

  const remove = async (lead: Lead) => {
    if (!confirm(`Excluir o pedido de ${lead.name}?`)) return;
    setLeads((all) => all.filter((l) => l.id !== lead.id));
    await supabase.from('trial_classes').delete().eq('id', lead.id);
  };

  // Status desconhecido (ex.: antigo) cai em "Novo"
  const statusOf = (l: Lead) => (LEAD_STATUSES.some((s) => s.id === l.status) ? l.status : 'pending');

  return (
    <div>
      <PageHeader title="Aulas experimentais" subtitle="Pedidos que chegam pelo formulário do site. Mude o status conforme o atendimento." />

      {loading ? (
        <Spinner />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => {
            const items = leads.filter((l) => statusOf(l) === status.id);
            return (
              <div key={status.id} className="w-72 shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>{status.label}</span>
                  <span className="text-xs text-ink/40">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && <p className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-xs text-ink/40">Vazio</p>}
                  {items.map((l) => (
                    <Card key={l.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-ink">{l.name}</p>
                          <p className="text-xs text-ink/50">Pedido em {formatDateShort(l.created_at)}</p>
                        </div>
                        <button onClick={() => remove(l)} className="p-1 text-ink/30 hover:text-red-600" aria-label="Excluir">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-ink/70">
                        <p>
                          <strong className="text-ink">{SPORT_LABELS[l.sport as Sport] ?? l.sport}</strong> · {l.level}
                        </p>
                        {(l.preferred_day || l.preferred_time) && (
                          <p>Prefere: {[l.preferred_day, l.preferred_time].filter(Boolean).join(', ')}</p>
                        )}
                        {l.email && <p className="truncate">{l.email}</p>}
                      </div>
                      <textarea
                        defaultValue={l.notes ?? ''}
                        onBlur={(e) => e.target.value !== (l.notes ?? '') && update(l, { notes: e.target.value || null })}
                        placeholder="Anotações..."
                        rows={2}
                        className="mt-3 w-full resize-none rounded-lg border border-ink/10 bg-sand/40 px-2 py-1.5 text-xs outline-none focus:border-ink/30"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={whatsappTo(
                            l.phone,
                            `Oi, ${l.name.split(' ')[0]}! Aqui é da Arena Manaus 👋 Recebemos seu pedido de aula experimental de ${
                              SPORT_LABELS[l.sport as Sport] ?? l.sport
                            }. Vamos combinar o melhor horário?`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => statusOf(l) === 'pending' && update(l, { status: 'contacted' })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          title={formatPhone(l.phone)}
                        >
                          <MessageCircle size={14} /> Chamar
                        </a>
                        <select
                          value={statusOf(l)}
                          onChange={(e) => update(l, { status: e.target.value })}
                          className="ml-auto rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-xs outline-none"
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
