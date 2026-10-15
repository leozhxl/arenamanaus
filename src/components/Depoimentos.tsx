import { useState } from 'react';
import { ExternalLink, Quote, Star } from 'lucide-react';

// Avaliações reais do Google (todas 5 estrelas), transcritas da página da arena no Google Maps
const REVIEWS = [
  { name: 'Flávia Backes', text: 'Adoro treinar aqui! Ambiente muito bom, pessoal parceiro e professores sempre incentivando a gente a evoluir 💖' },
  { name: 'Caline Peres', text: 'Fui para incentivar meu sobrinho!! E não é que me apaixonei pelo futevôlei e pelo lugar, super indico pessoal nota dez, são bem atenciosos e divertidos.' },
  { name: 'Matt Phillips', text: 'Arena Fantástica aulas muito boas!', guide: true },
  { name: 'Bernardo Medeiros', text: 'Local top demais, fora o atendimento e parceria!! Pessoal muito gente boa!' },
  { name: 'Marlon Vitor', text: 'Lugar top, diversão garantida, proprietário super gente fina, recomendo!!' },
  { name: 'Suelen Moschem', text: 'Ambiente descontraído, ótimo local para praticar esportes e se divertir com os amigos, super recomendo.', guide: true },
  { name: 'André Lima', text: 'Local aconchegante, com profissionais capacitados e ótimo atendimento! Sou cliente assíduo' },
  { name: 'Vinícius Eduardo', text: 'Arena top demais, os eventos são showw parabéns pelo esforço' },
  { name: 'Rafael Nunes Vieira', text: 'Legal espetacular para quem que praticar um esporte!' },
  { name: 'Gustavo Souza', text: 'Lugar totalmente divertido, ótimo pra atividades com amigos e família...' },
  { name: 'Vinicius Rodrigues', text: 'Melhor lugar pra praticar esportes na região' },
  { name: 'Mario Rodon', text: 'Uma ótima arena de esportes de areia!!' },
  { name: 'Laura Borges Boteon', text: 'Ótimos profissionais' },
  { name: 'Diego Borges', text: 'Arena top, sempre melhorando a cada dia!' },
  { name: 'Matheus Silva', text: 'Lugar muito bom para jogar e se divertir' },
  { name: 'Lipe ff', text: 'Top demais a energia do lugar' },
  { name: 'Alessandra Motta', text: 'Showww, super recomendo!' },
  { name: 'Kauã Maciel', text: 'Arena boa e bem localizada 👍' },
  { name: 'Bernardo', text: 'Arena diferenciada!!!' },
  { name: 'Cauã', text: 'Tope de mais o lugar' },
  { name: 'Bruno Samuel', text: 'Melhor arena!!' },
  { name: 'Maria Souza', text: 'A melhor!!!!!' },
  { name: 'Arthur Dresch', text: 'Excelente lugar!' },
  { name: 'Jefferson Borba de Lima', text: 'Top melhor arena' },
  { name: 'João Domingos', text: 'Ótimo lugar!' },
  { name: 'Sandoval Padilha', text: 'Top demais....' },
];

const RATING = { score: '5,0', total: 49 };

const GOOGLE_REVIEWS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  'Arena Manaus Quadra de esportes, Av. Santa Catarina, 632, Balneário Gaivota - SC'
)}`;

const AVATAR_COLORS = ['bg-sea', 'bg-sunset', 'bg-lime-dark', 'bg-ink', 'bg-sea-dark'];
const INITIAL_COUNT = 9;

function Stars({ size = 16 }: { size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label="5 de 5 estrelas">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className="fill-[#FBBC04] text-[#FBBC04]" />
      ))}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC04" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export default function Depoimentos() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? REVIEWS : REVIEWS.slice(0, INITIAL_COUNT);

  return (
    <section id="depoimentos" className="bg-sand py-16 md:py-24 sand-texture">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <p className="font-marker text-sunset text-lg mb-2">depoimentos</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">Quem joga, fala</h2>
        </div>

        {/* Resumo da nota no Google */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 bg-foam rounded-2xl border border-sand-dark/20 shadow-sm px-6 py-5 max-w-2xl mx-auto mb-12">
          <div className="flex items-center gap-4">
            <span className="font-display text-6xl text-ink leading-none">{RATING.score}</span>
            <div>
              <Stars size={20} />
              <p className="font-body text-sm text-ink/60 mt-1 flex items-center gap-1.5">
                <GoogleLogo /> {RATING.total} avaliações no Google
              </p>
            </div>
          </div>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-ink hover:bg-ink/85 text-foam font-body font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            Ver no Google <ExternalLink size={14} />
          </a>
        </div>

        {/* Avaliações em colunas (alturas variadas encaixam melhor) */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
          {visible.map((r, i) => (
            <figure
              key={r.name}
              className="break-inside-avoid mb-5 relative bg-foam rounded-2xl p-6 border border-sand-dark/20 shadow-sm lift"
            >
              <Quote size={28} className="absolute top-5 right-5 text-lime/40" />
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-foam font-body font-bold flex items-center justify-center shrink-0`}
                >
                  {r.name[0]}
                </div>
                <div>
                  <figcaption className="font-body font-semibold text-ink leading-tight">{r.name}</figcaption>
                  <p className="font-body text-xs text-ink/50">
                    {'guide' in r && r.guide ? 'Local Guide · ' : ''}Google
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Stars />
              </div>
              <blockquote className="font-body text-ink/80 mt-3 leading-relaxed">{r.text}</blockquote>
            </figure>
          ))}
        </div>

        {!showAll && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAll(true)}
              className="font-body font-bold text-ink border-2 border-ink/80 hover:bg-ink hover:text-foam px-7 py-3 rounded-full transition-colors"
            >
              Ver mais {REVIEWS.length - INITIAL_COUNT} avaliações
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
