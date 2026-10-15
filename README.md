# arenamanaus

Site e painel administrativo da **Arena Manaus** — quadras de areia para futevôlei, vôlei de praia e beach tênis em Balneário Gaivota/SC.

- **Site:** modalidades, reserva de quadra online, aulas, eventos, depoimentos e contato.
- **Admin (`/admin`):** agenda das quadras, CRM de clientes, alunos e mensalidades, aulas experimentais, eventos e quadras.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a chave anon do Supabase
npm run dev
```

## Banco de dados

Os scripts SQL ficam em `supabase/`. Para um projeto novo, rode `supabase/setup-completo.sql` no SQL Editor do Supabase.

Feito com React, TypeScript, Vite, Tailwind CSS e Supabase.
