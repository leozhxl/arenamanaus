const FACILITIES = [
  { icon: '🏐', title: 'Quadras de areia tratada', desc: 'Areia nivelada e peneirada, padrão oficial.' },
  { icon: '🥅', title: 'Redes oficiais', desc: 'Redes reguláveis para futevôlei e vôlei.' },
  { icon: '💡', title: 'Iluminação para jogos à noite', desc: 'Luz de LED para jogar até as 22h.' },
  { icon: '🚿', title: 'Vestiário e banheiros', desc: 'Chuveiros e vestiário limpo pra você sair de boas.' },
  { icon: '🌴', title: 'Área de descanso com sombra', desc: 'Barracas e guarda-sóis pra resenhar entre os jogos.' },
  { icon: '🥤', title: 'Bebidas e lanchonete', desc: 'Água, sucos, isotônicos e lanches sempre gelados.' },
  { icon: '⚽', title: 'Aluguel de bolas e raquetes', desc: 'Esqueceu o material? Tem pra alugar na hora.' },
  { icon: '🚗', title: 'Estacionamento', desc: 'Vagas próximas às quadras, sem dor de cabeça.' },
];

export default function Estrutura() {
  return (
    <section id="estrutura" className="bg-sand-burnt sand-texture py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-sea text-lg mb-2">a estrutura</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Tudo que você precisa
          </h2>
          <p className="font-body text-base md:text-lg text-ink/60 mt-4 max-w-xl mx-auto">
            Da areia ao chuveiro — pensamos em cada detalhe pra você só se preocupar com o jogo.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {FACILITIES.map((fac) => (
            <div
              key={fac.title}
              className="bg-foam rounded-xl p-5 md:p-6 shadow-sm lift border border-sand-dark/20"
            >
              <div className="text-3xl mb-3">{fac.icon}</div>
              <h3 className="font-display text-base md:text-lg text-ink uppercase leading-tight">
                {fac.title}
              </h3>
              <p className="font-body text-sm text-ink/60 mt-2 leading-snug">
                {fac.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center font-body text-sm text-ink/50 mt-8">
          Tem alguma dúvida sobre a estrutura?{' '}
          <a href="#contato" className="text-sea font-bold underline">Fala com a gente</a>
        </p>
      </div>
    </section>
  );
}
