import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Preciso saber jogar?',
    a: 'Não! Tem aula pra todos os níveis, do primeiro toque ao jogo competitivo. Dá pra agendar uma aula experimental pra conhecer.',
  },
  {
    q: 'Tem aluguel de material?',
    a: 'Tem sim. Bola de futevôlei/vôlei e raquete de beach tênis por R$ 10 a unidade. Esqueceu? Pega aqui.',
  },
  {
    q: 'E se chover?',
    a: 'Sem problema! Temos quadra coberta, então o jogo continua mesmo com chuva.',
  },
  {
    q: 'Posso levar amigos de fora?',
    a: 'Claro! A arena é de todos. Só reservar a quadra e chamar a galera.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-sand-burnt py-16 md:py-24 sand-texture">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <p className="font-marker text-lime text-lg mb-2">dúvidas</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Perguntas frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-foam rounded-xl overflow-hidden border border-sand-dark/20">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-body font-bold text-ink text-base">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-ink/50 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="font-body text-ink/70 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}