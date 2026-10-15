import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Modalidades from '@/components/Modalidades';
import Estrutura from '@/components/Estrutura';
import Reserva from '@/components/Reserva';
import Precos from '@/components/Precos';
import Aulas from '@/components/Aulas';
import Professores from '@/components/Professores';
import Eventos from '@/components/Eventos';
import Depoimentos from '@/components/Depoimentos';
import FAQ from '@/components/FAQ';
import Localizacao from '@/components/Localizacao';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

function App() {
  return (
    <div className="min-h-screen bg-sand font-body text-ink">
      <TopBar />
      <Header />
      <main>
        <Hero />
        <Modalidades />
        <Estrutura />
        <Reserva />
        <Precos />
        <Aulas />
        <Professores />
        <Eventos />
        <Depoimentos />
        <FAQ />
        <Localizacao />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;