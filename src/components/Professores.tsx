import { Instagram } from 'lucide-react';

export default function Professores() {
  return (
    <section id="sobre" className="bg-sand py-16 md:py-24 sand-texture">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-lime text-lg mb-2">quem te ensina</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Os professores
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-foam rounded-2xl overflow-hidden shadow-sm border border-sand-dark/20 lift">
              {/* Photo placeholder */}
              <div className="aspect-square bg-sand-burnt flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-sand-dark/40 mx-auto mb-3" />
                  <p className="font-body text-sm text-ink/30">Foto do professor</p>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl text-ink uppercase">[Nome do professor]</h3>
                <p className="font-body text-sm text-ink/50 mt-1">Modalidade: [futevôlei / vôlei / beach tênis]</p>
                <a
                  href="#"
                  className="mt-3 inline-flex items-center gap-2 font-body text-sm text-sea font-bold hover:text-sea-dark transition-colors"
                >
                  <Instagram size={16} /> @[instagram]
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center font-body text-sm text-ink/40 mt-8">
          Em breve com os perfis completos da nossa equipe.
        </p>
      </div>
    </section>
  );
}