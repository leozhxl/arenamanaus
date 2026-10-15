import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, ErrorText, Field, inputCls } from './ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idleNotice] = useState(() => {
    const was = sessionStorage.getItem('admin:idle-logout') === '1';
    sessionStorage.removeItem('admin:idle-logout');
    return was;
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError(
        authError.message.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos.'
          : authError.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          : 'Não foi possível entrar. Tente de novo.'
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 font-body">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-foam p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-lime">
            <Lock size={22} className="text-ink" />
          </div>
          <p className="font-display text-2xl uppercase leading-none text-ink">
            Arena <span className="text-lime-dark">Manaus</span>
          </p>
          <p className="mt-1 text-sm text-ink/50">Painel da equipe</p>
        </div>
        <div className="space-y-4">
          {idleNotice && (
            <p className="rounded-lg bg-sand px-3 py-2 text-center text-sm text-ink/70">Você saiu automaticamente por inatividade.</p>
          )}
          <Field label="E-mail">
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" loading={loading} className="w-full py-3">
            Entrar
          </Button>
        </div>
      </form>
    </div>
  );
}
