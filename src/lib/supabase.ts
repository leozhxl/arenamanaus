import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sem as variáveis (ex.: esquecidas na Vercel), o site continua abrindo;
// só reservas, eventos e o admin deixam de funcionar até configurar.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (arquivo .env ou Environment Variables da hospedagem).'
  );
}

export const supabase = createClient(supabaseUrl || 'https://nao-configurado.supabase.co', supabaseAnonKey || 'nao-configurado');
