import { PRICING } from '@/lib/constants';
import { CourtLineDivider } from './WaveDivider';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const COURT_PRICES = [
  { label: 'Hora avulsa — dia', price: PRICING.courtDay, note: '6h às 17h', highlight: false },
  { label: 'Hora avulsa — noite (com iluminação)', price: PRICING.courtNight, note: '18h às 22h', highlight: false },
  { label: 'Fim de semana / feriado', price: PRICING.courtWeekend, note: 'Sáb, dom e feriados', highlight: false },
];

const PACKAGES = [
  { label: 'Pacote 4x/mês', price: PRICING.monthly4, note: 'Horário fixo semanal', highlight: false },
  { label: 'Pacote 8x/mês', price: PRICING.monthly8, note: 'Horário fixo semanal', highlight: true },
];

export default function Precos() {
  return (
    <section id="precos" className="bg-sand py-16 md:py-24 sand-texture">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-sunset text-lg mb-2">tabela de preços</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Preço na lata
          </h2>
          <p className="font-body text-base text-ink/60 mt-4 max-w-lg mx-auto">
            Sem letra miúda. Você vê o preço, escolhe o horário e joga.
          </p>
        </div>

        <CourtLineDivider />

        {/* Court prices */}
        <div className="mb-10">
          <h3 className="font-display text-2xl text-ink uppercase mb-6 text-center md:text-left">Aluguel de quadra</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {COURT_PRICES.map((item) => (
              <div key={item.label} className="bg-foam rounded-xl p-6 text-center shadow-sm border border-sand-dark/20 lift">
                <p className="font-body text-sm text-ink/60 mb-2">{item.label}</p>
                <p className="font-display text-4xl text-ink">{formatPrice(item.price)}</p>
                <p className="font-body text-xs text-ink/40 mt-2">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Packages */}
        <div className="mb-10">
          <h3 className="font-display text-2xl text-ink uppercase mb-6 text-center md:text-left">Pacotes mensais (horário fixo)</h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {PACKAGES.map((item) => (
              <div
                key={item.label}
                className={`relative rounded-xl p-6 text-center shadow-sm border-2 lift ${
                  item.highlight ? 'bg-lime border-lime-dark' : 'bg-foam border-sand-dark/20'
                }`}
              >
                {item.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sunset text-foam font-body font-bold text-xs px-3 py-1 rounded-full whitespace-nowrap">
                    MAIS ESCOLHIDO
                  </span>
                )}
                <p className="font-body text-sm text-ink/70 mb-2">{item.label}</p>
                <p className={`font-display text-4xl ${item.highlight ? 'text-ink' : 'text-ink'}`}>{formatPrice(item.price)}</p>
                <p className="font-body text-xs text-ink/50 mt-2">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rental */}
        <div className="bg-foam rounded-xl p-6 text-center shadow-sm border border-sand-dark/20 max-w-md mx-auto">
          <p className="font-body text-sm text-ink/60">Aluguel de bola ou raquete</p>
          <p className="font-display text-3xl text-ink mt-1">{formatPrice(PRICING.rental)} <span className="text-base text-ink/40">/unidade</span></p>
        </div>
      </div>
    </section>
  );
}