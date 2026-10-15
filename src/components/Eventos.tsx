import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EVENT_TYPES, type ArenaEvent } from '@/lib/types';
import { whatsappLink } from '@/lib/constants';
import { Calendar, Trophy, Cake, Building2, GraduationCap, Sparkles, Tag, Megaphone } from 'lucide-react';

const TYPE_ICONS: Record<string, typeof Trophy> = {
  torneio: Trophy,
  dayuse: Calendar,
  aula: GraduationCap,
  especial: Sparkles,
  promocao: Tag,
  aviso: Megaphone,
  aniversario: Cake,
  empresa: Building2,
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Eventos() {
  const [events, setEvents] = useState<ArenaEvent[]>([]);

  useEffect(() => {
    (async () => {
      // Só eventos de hoje em diante, publicados pela equipe no admin
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('date', todayStr())
        .order('date', { ascending: true })
        .limit(6);
      setEvents(((data ?? []) as ArenaEvent[]).filter((e) => e.published !== false));
    })();
  }, []);

  const eventMsg = whatsappLink('Oi! Vim pelo site da Arena Manaus 👋\n\nQuero fazer meu evento na arena. Pode me passar mais informações?');

  return (
    <section id="eventos" className="bg-ink py-16 md:py-24 net-pattern">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-lime text-lg mb-2">eventos e torneios</p>
          <h2 className="font-display text-4xl md:text-6xl text-foam uppercase">
            Tem sempre rolê
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="mb-10 rounded-2xl border border-dashed border-foam/20 p-8 text-center">
            <Megaphone size={28} className="mx-auto text-lime" />
            <p className="font-body text-foam/80 mt-3">Novos torneios e eventos são anunciados aqui.</p>
            <p className="font-body text-sm text-foam/50 mt-1">Fique de olho no nosso Instagram para não perder nada.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {events.map((event) => {
              const Icon = TYPE_ICONS[event.type] || Calendar;
              const dateObj = new Date(event.date + 'T00:00:00');
              const rawLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
              const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
              return (
                <article key={event.id} className="flex flex-col overflow-hidden bg-foam/5 backdrop-blur rounded-2xl border border-foam/10 lift">
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title} loading="lazy" className="block w-full h-auto max-h-[560px] object-contain bg-black/30" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-lime rounded-xl p-3 shrink-0">
                        <Icon size={24} className="text-ink" />
                      </div>
                      <div className="flex-1">
                        <span className="font-body text-xs text-lime font-bold uppercase">{EVENT_TYPES[event.type] || event.type}</span>
                        <h3 className="font-display text-xl text-foam uppercase leading-tight mt-1">{event.title}</h3>
                        <p className="font-body text-sm text-foam/50 mt-1">{dateLabel}</p>
                      </div>
                    </div>
                    {event.description && (
                      <p className="font-body text-sm text-foam/70 mt-4 whitespace-pre-line">{event.description}</p>
                    )}
                    <a
                      href={whatsappLink(
                        `Oi! Vim pelo site da Arena Manaus 👋\n\nQuero saber mais sobre: *${event.title}* (${dateObj.toLocaleDateString('pt-BR')})`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 self-start font-body text-sm font-bold text-lime hover:text-lime-light"
                    >
                      Quero participar →
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <p className="font-body text-foam/60 mb-4">
            Aniversário, evento de empresa, torneio da sua turma? A arena é sua.
          </p>
          <a
            href={eventMsg}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-lime hover:bg-lime-dark text-ink font-body font-bold px-8 py-4 rounded-full transition-colors"
          >
            Quero fazer meu evento na Arena
          </a>
        </div>
      </div>
    </section>
  );
}
