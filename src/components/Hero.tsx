import { ArrowRight, ChevronDown, MapPin, Play } from 'lucide-react';
import { useCountUp, useInView } from '@/lib/hooks';
import { ARENA } from '@/lib/constants';

const HERO_IMAGE = '/arena-fachada.jpg';

const COUNTERS = [
  { target: 3, suffix: '', label: 'Quadras' },
  { target: 120, suffix: '+', label: 'Alunos' },
  { target: 480, suffix: 'h', label: 'De jogo por mês' },
];

const SPORTS = ['Futevôlei', 'Vôlei de praia', 'Beach tênis'];

// Entrada escalonada: cada bloco aparece um pouco depois do anterior
const fadeUp = (delay: number) => ({
  className: 'opacity-0 animate-float-up',
  style: { animationDelay: `${delay}ms` },
});

function Counter({ target, suffix, label, start }: { target: number; suffix: string; label: string; start: boolean }) {
  const count = useCountUp(target, 1500, start);
  return (
    <div className="flex-1 px-4 first:pl-0 last:pr-0 md:px-6">
      <div className="font-display text-3xl md:text-4xl text-foam leading-none tabular-nums">
        {count}
        <span className="text-lime">{suffix}</span>
      </div>
      <div className="font-body text-[11px] md:text-xs text-foam/60 mt-2 uppercase tracking-[0.15em]">{label}</div>
    </div>
  );
}

export default function Hero() {
  const { ref, inView } = useInView({ threshold: 0.3 });

  return (
    <section id="hero" className="relative min-h-screen flex items-end md:items-center overflow-hidden bg-ink">
      {/* Foto de fundo com zoom lento */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Fachada da Arena Manaus com as quadras de areia"
          className="w-full h-full object-cover object-center animate-ken-burns"
        />
        {/* Camadas de gradiente: legibilidade à esquerda e transição suave para a seção seguinte */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="absolute -left-40 top-1/3 w-[500px] h-[500px] rounded-full bg-lime/5 blur-[120px]" />
      </div>

      {/* Conteúdo */}
      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pt-32 pb-16 md:pb-20 w-full">
        <div className="max-w-3xl">
          {/* Selo de localização */}
          <div {...fadeUp(0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-foam/15 bg-foam/10 backdrop-blur-md pl-1.5 pr-4 py-1.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lime text-ink">
                <MapPin size={13} strokeWidth={2.5} />
              </span>
              <span className="font-body text-xs md:text-sm text-foam/90 tracking-wide">{ARENA.location}</span>
              <span className="relative flex w-2 h-2 ml-1">
                <span className="absolute inline-flex h-full w-full rounded-full bg-lime opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-lime" />
              </span>
            </span>
          </div>

          {/* Título */}
          <h1 className="mt-6">
            <span
              {...fadeUp(120)}
              className="block opacity-0 animate-float-up font-display text-[3.25rem] sm:text-7xl lg:text-[5.75rem] text-foam leading-[0.9] uppercase tracking-tight"
            >
              A vibe que você
              <br />
              procura,
            </span>
            <span
              {...fadeUp(240)}
              className="block opacity-0 animate-float-up font-marker text-3xl sm:text-5xl lg:text-6xl text-lime leading-tight mt-3 -rotate-1 drop-shadow-[0_4px_24px_rgba(166,226,46,0.35)]"
            >
              o esporte que você ama!
            </span>
          </h1>

          {/* Modalidades */}
          <div {...fadeUp(360)}>
            <div className="flex flex-wrap items-center gap-2 mt-7">
              {SPORTS.map((s) => (
                <span
                  key={s}
                  className="font-body text-xs md:text-sm text-foam/85 rounded-full border border-foam/20 px-3.5 py-1.5 backdrop-blur-sm"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="font-body text-base md:text-lg text-foam/70 mt-5 max-w-lg leading-relaxed">
              Aulas para todos os níveis, do primeiro toque ao jogo competitivo.
            </p>
          </div>

          {/* Botões */}
          <div {...fadeUp(480)}>
            <div className="flex flex-col sm:flex-row gap-3 mt-9">
              <a
                href="#reserva"
                className="group inline-flex items-center justify-center gap-3 bg-lime hover:bg-lime-light text-ink font-body font-bold text-base pl-7 pr-2 py-2 rounded-full shadow-[0_10px_40px_-10px_rgba(166,226,46,0.7)] transition-all hover:-translate-y-0.5"
              >
                Reservar quadra
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-ink text-lime transition-transform group-hover:translate-x-1">
                  <ArrowRight size={18} />
                </span>
              </a>
              <a
                href="#aulas"
                className="group inline-flex items-center justify-center gap-3 bg-foam/10 hover:bg-foam/20 border border-foam/20 backdrop-blur-md text-foam font-body font-semibold text-base px-7 py-4 rounded-full transition-colors"
              >
                <Play size={16} className="fill-foam" />
                Agendar aula experimental
              </a>
            </div>
          </div>

          {/* Números */}
          <div {...fadeUp(600)}>
            <div className="mt-10 inline-flex w-full sm:w-auto divide-x divide-foam/15 rounded-2xl border border-foam/10 bg-ink/40 backdrop-blur-xl px-5 md:px-6 py-5">
              {COUNTERS.map((c) => (
                <Counter key={c.label} {...c} start={inView} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de rolagem */}
      <a
        href="#modalidades"
        aria-label="Rolar para baixo"
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 text-foam/50 hover:text-lime transition-colors"
      >
        <span className="font-body text-[10px] uppercase tracking-[0.3em]">Role</span>
        <ChevronDown size={20} className="animate-bounce" />
      </a>
    </section>
  );
}
