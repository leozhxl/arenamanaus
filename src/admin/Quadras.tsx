import { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import { useCourts, type Court } from './lib';
import { Button, Card, ErrorText, PageHeader, inputCls } from './ui';

export default function Quadras() {
  const { courts, reload } = useCourts();
  const [error, setError] = useState<string | null>(null);

  const update = async (court: Court, changes: Partial<Court>) => {
    setError(null);
    const { error: dbError } = await supabase.from('courts').update(changes).eq('id', court.id);
    if (dbError) setError('Não foi possível salvar a quadra.');
    reload();
  };

  const add = async () => {
    setError(null);
    const { error: dbError } = await supabase
      .from('courts')
      .insert({ name: `Quadra ${courts.length + 1}`, sport: 'futevolei', active: true });
    if (dbError) setError('Não foi possível criar a quadra.');
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Quadras"
        subtitle="Quadras desativadas somem da agenda e do site, mas as reservas antigas continuam salvas."
        actions={
          <Button onClick={add}>
            <Plus size={16} /> Nova quadra
          </Button>
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courts.map((c) => (
          <Card key={c.id} className={`space-y-3 p-5 ${c.active ? '' : 'opacity-60'}`}>
            <input
              defaultValue={c.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c, { name: e.target.value.trim() })}
              className={`${inputCls} font-semibold`}
              aria-label="Nome da quadra"
            />
            <select value={c.sport} onChange={(e) => update(c, { sport: e.target.value })} className={inputCls} aria-label="Modalidade principal">
              {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
                <option key={s} value={s}>
                  {SPORT_LABELS[s]}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={c.active} onChange={(e) => update(c, { active: e.target.checked })} className="h-4 w-4 accent-lime-dark" />
              Ativa (aparece na agenda e no site)
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}
