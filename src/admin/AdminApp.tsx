import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CalendarDays, ExternalLink, GraduationCap, LayoutDashboard, LogOut, Megaphone, Menu, Settings, Sparkles, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Login from './Login';
import Dashboard from './Dashboard';
import Agenda from './Agenda';
import Clientes from './Clientes';
import Leads from './Leads';
import Quadras from './Quadras';
import Eventos from './Eventos';
import Alunos from './Alunos';
import LiveUpdates, { LiveStatus } from './LiveUpdates';
import { Button, Spinner } from './ui';

const TABS = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'alunos', label: 'Alunos', icon: GraduationCap },
  { id: 'leads', label: 'Aulas experimentais', icon: Sparkles },
  { id: 'eventos', label: 'Eventos', icon: Megaphone },
  { id: 'quadras', label: 'Quadras', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

// O endereço fica como /admin#agenda ou /admin#agenda?d=2026-10-20 (abre a agenda nesse dia)
const readTab = (): TabId => {
  const hash = window.location.hash.slice(1).split('?')[0];
  return (TABS.some((t) => t.id === hash) ? hash : 'dashboard') as TabId;
};

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [dbMissing, setDbMissing] = useState(false);
  const [tab, setTab] = useState<TabId>(readTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [live, setLive] = useState(false);

  const openFromAlert = useCallback((id: 'agenda' | 'leads', date?: string) => {
    window.location.hash = date ? `${id}?d=${date}` : id;
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    document.title = 'Admin · Arena Manaus';
    // O painel não deve aparecer no Google
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('hashchange', onHash);
      robots.remove();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setIsStaff(null);
      return;
    }
    supabase.rpc('is_staff').then(({ data, error }) => {
      // PGRST202 = a função não existe: o SQL do admin ainda não foi rodado
      setDbMissing(error?.code === 'PGRST202');
      setIsStaff(!error && data === true);
    });
  }, [session]);

  // Sai sozinho depois de 30 min sem uso (ex.: computador da recepção esquecido aberto)
  useEffect(() => {
    if (!session) return;
    const IDLE_MS = 30 * 60 * 1000;
    let last = Date.now();
    const touch = () => (last = Date.now());
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last > IDLE_MS) {
        sessionStorage.setItem('admin:idle-logout', '1');
        supabase.auth.signOut();
      }
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(timer);
    };
  }, [session]);

  const logout = () => supabase.auth.signOut();

  if (checking) return <Spinner />;
  if (!session) return <Login />;
  if (isStaff === null) return <Spinner label="Verificando acesso..." />;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-4 font-body">
        <div className="max-w-md rounded-2xl bg-foam p-8 text-center shadow-lg">
          <h1 className="font-display text-2xl uppercase text-ink">{dbMissing ? 'Banco não configurado' : 'Sem acesso'}</h1>
          <p className="mt-2 text-sm text-ink/60">
            {dbMissing ? (
              <>
                O login funcionou, mas o banco ainda não tem as tabelas do admin. Rode o arquivo{' '}
                <strong>supabase/admin-crm.sql</strong> no SQL Editor do Supabase e depois libere o e-mail{' '}
                <strong>{session.user.email}</strong> na tabela <strong>staff</strong>.
              </>
            ) : (
              <>
                A conta <strong>{session.user.email}</strong> ainda não faz parte da equipe. Rode no SQL Editor do Supabase a
                linha que libera o acesso (final do arquivo supabase/admin-crm.sql) com este e-mail.
              </>
            )}
          </p>
          <Button variant="dark" className="mt-6" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const go = (id: TabId) => {
    window.location.hash = id;
    setMenuOpen(false);
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => go(id)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
            tab === id ? 'bg-lime text-ink' : 'text-foam/70 hover:bg-foam/10 hover:text-foam'
          }`}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="mt-auto space-y-1 border-t border-foam/10 pt-4">
      <LiveStatus connected={live} />
      <p className="truncate px-3 pb-2 text-xs text-foam/40">{session.user.email}</p>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foam/70 hover:bg-foam/10 hover:text-foam"
      >
        <ExternalLink size={16} /> Ver site
      </a>
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foam/70 hover:bg-foam/10 hover:text-foam"
      >
        <LogOut size={16} /> Sair
      </button>
    </div>
  );

  const logo = (
    <p className="font-display text-xl uppercase leading-none text-lime">
      Arena <span className="text-foam">Manaus</span>
      <span className="mt-1 block font-body text-[10px] font-normal tracking-[0.25em] text-foam/40">ADMIN</span>
    </p>
  );

  return (
    <div className="min-h-screen bg-sand font-body text-ink">
      {/* Menu lateral (computador) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-ink p-4 lg:flex">
        <div className="mb-8 px-3 pt-2">{logo}</div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        {logo}
        <button onClick={() => setMenuOpen(true)} className="p-1 text-foam" aria-label="Abrir menu">
          <Menu size={24} />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex w-72 flex-col bg-ink p-4">
            <div className="mb-6 flex items-center justify-between px-3 pt-2">
              {logo}
              <button onClick={() => setMenuOpen(false)} className="text-foam" aria-label="Fechar menu">
                <X size={22} />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </div>
          <div className="flex-1 bg-ink/50" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="px-4 py-6 md:px-8 md:py-8 lg:ml-60">
        {tab === 'dashboard' && <Dashboard onNavigate={go} />}
        {tab === 'agenda' && <Agenda />}
        {tab === 'clientes' && <Clientes />}
        {tab === 'leads' && <Leads />}
        {tab === 'alunos' && <Alunos />}
        {tab === 'eventos' && <Eventos />}
        {tab === 'quadras' && <Quadras />}
      </main>

      <LiveUpdates onOpen={openFromAlert} onConnectedChange={setLive} />
    </div>
  );
}
