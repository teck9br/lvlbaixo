# lvlbaixo

Um "Discord privado" bem mais simples, feito para um grupo pequeno de
amigos: canais de texto, canais de voz, microfone e **compartilhamento de
tela em Full HD**. Sem servidores públicos, sem criação livre de canais,
sem recursos que você não vai usar.

## O que é / o que não é

- **É:** voz em tempo real, compartilhamento de tela (alvo 1920×1080/30fps
  com fallback automático), mute, chat de texto em tempo real, indicador de
  quem está falando/mutado/compartilhando, reconexão automática. Basta
  digitar um nome para entrar — sem senha de servidor.
- **Não é:** um clone do Discord. Sem threads, reações, bots, cargos,
  emojis customizados, upload de arquivo no chat, webcam, ou criação de
  canais pela interface — os 6 canais são fixos (veja `supabase/seed.sql`).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| Ícones | Lucide React |
| Voz + tela | LiveKit Cloud (ou self-hosted) + `livekit-client` |
| Backend | Next.js API Routes (geração de token LiveKit, autenticação, chat) |
| Banco | Supabase (Postgres) + Supabase Realtime (chat) |
| Autenticação | Sessão própria via cookie assinado (HMAC), sem OAuth |
| Deploy | Vercel (app) + LiveKit Cloud (mídia) + Supabase (banco) |

Todo o áudio/vídeo passa pelo LiveKit — nada de WebRTC "na mão".

## Estrutura do projeto

```
app/
  page.tsx              # entrada — decide nome/app
  layout.tsx
  api/
    auth/route.ts        # POST login (por nome), GET sessão, PATCH renomear, DELETE logout
    livekit/token/route.ts  # POST — gera token temporário do LiveKit
    messages/route.ts    # GET histórico, POST enviar mensagem
    rooms/route.ts       # GET lista de canais
components/
  auth/                  # NameGate
  chat/                  # Chat, MessageList, MessageInput, ChatMessage
  voice/                 # VoiceRoomView, ParticipantGrid, ScreenShareView,
                          # ControlBar, MuteButton, ScreenShareButton, LeaveButton
  Sidebar.tsx, ChannelList.tsx, ChannelItem.tsx, ServerShell.tsx,
  ConnectionStatus.tsx, UserFooter.tsx, AppRoot.tsx
hooks/
  useVoiceRoom.ts        # toda a lógica de LiveKit (conectar, mute, tela, erros)
  useMessages.ts         # histórico + Supabase Realtime
  useLocalUser.ts, useOnlineStatus.ts
lib/
  livekit/               # config centralizada (resolução/fps/bitrate) + geração de token
  supabase/               # client (anon, browser) e server (service role)
  auth/                   # sessão assinada + nome do servidor
  utils.ts
supabase/
  migrations/0001_init.sql  # schema + RLS
  migrations/0002_drop_access_password.sql  # remove a antiga senha de servidor
  migrations/0003_polls.sql  # enquetes (polls/poll_votes) + messages.poll_id
  seed.sql                  # os 6 canais fixos
__tests__/                  # Vitest
```

## Como instalar

```bash
npm install
cp .env.example .env.local
```

Preencha o `.env.local` seguindo as seções abaixo.

## Como configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (nunca exponha esta)
3. Abra o **SQL Editor** e rode, nesta ordem:
   - o conteúdo de `supabase/migrations/0001_init.sql`
   - o conteúdo de `supabase/migrations/0002_drop_access_password.sql` (só
     necessário se o banco já existia de antes da remoção da senha)
   - o conteúdo de `supabase/migrations/0003_polls.sql` (enquetes — cria
     `polls`/`poll_votes` e a coluna `messages.poll_id`)
   - o conteúdo de `supabase/seed.sql`
4. Isso cria as tabelas (`users`, `rooms`, `messages`, `server_settings`,
   `polls`, `poll_votes`), as políticas de RLS (o anon key só consegue
   *ler* — toda escrita passa pelas API Routes com a service role key) e
   semeia os 6 canais fixos.
5. Em **Database → Replication**, confirme que as tabelas `messages` e
   `poll_votes` estão habilitadas para Realtime (o `supabase db push`/SQL
   já deixa isso habilitado via `alter publication supabase_realtime add
   table messages` / `... add table poll_votes` se você usar a CLI; pelo
   painel, habilite manualmente em Database → Replication →
   supabase_realtime). Sem isso, os votos em enquetes só aparecem para
   quem votou até a página ser recarregada.

## Como configurar o LiveKit

1. Crie um projeto em [cloud.livekit.io](https://cloud.livekit.io) (o plano
   gratuito é suficiente para um grupo pequeno) ou rode um servidor
   self-hosted.
2. Em **Settings → Keys**, copie:
   - `WebSocket URL` → `NEXT_PUBLIC_LIVEKIT_URL`
   - `API Key` → `LIVEKIT_API_KEY`
   - `API Secret` → `LIVEKIT_API_SECRET`
3. Nada além disso é necessário — as salas de voz (`cs-de-cadeira`,
   `cs-de-rua`, `gay-por`) são criadas automaticamente pelo LiveKit na
   primeira pessoa que entra, e destruídas quando ficam vazias.

## Configurando o `.env.local`

Veja `.env.example` para a lista completa, com comentários sobre o que é
público e o que é secreto. Resumo:

- **Públicas** (`NEXT_PUBLIC_*`): vão para o navegador. Já são seguras de
  expor (URLs e a chave anon do Supabase, protegida por RLS).
- **Secretas** (sem prefixo): só existem no servidor. `LIVEKIT_API_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` nunca devem ir para o
  frontend — o projeto está estruturado (imports com `import "server-only"`)
  para que isso vire erro de build se acontecer por engano.

Gere o `SESSION_SECRET` com algo como:

```bash
openssl rand -base64 32
```

## Como rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Na primeira vez, o
Next.js vai avisar se alguma variável de ambiente crítica estiver faltando
(erros aparecem só quando a rota que precisa dela é chamada, não no boot).

## Como fazer deploy

1. **Vercel** (frontend + API Routes):
   - Importe o repositório na Vercel.
   - Adicione todas as variáveis do `.env.example` em
     Project Settings → Environment Variables (as secretas como "secret",
     as `NEXT_PUBLIC_*` normalmente).
   - Deploy.
2. **Supabase**: já está rodando o banco (passo acima) — nada mais a fazer.
3. **LiveKit Cloud**: já está rodando a mídia (passo acima) — nada mais a
   fazer.

Não é necessário nenhum servidor adicional: tokens do LiveKit são gerados
sob demanda pela própria função serverless da Vercel.

## Como testar voz

Veja o roteiro completo em [`TESTING.md`](./TESTING.md#3--voz--dois-participantes).
Resumo rápido: abra o app em dois navegadores (ou um normal + uma aba
anônima), entre na mesma sala de voz com nomes diferentes, fale em um e
confirme que o indicador 🟢 acende no outro.

## Como testar compartilhamento de tela

Veja [`TESTING.md`](./TESTING.md#4--compartilhamento-de-tela). Resumo:
compartilhe uma janela com texto, confirme legibilidade e resolução (via
`chrome://webrtc-internals`) no outro participante, e confirme que uma
segunda pessoa tentando compartilhar ao mesmo tempo recebe o aviso de
"alguém já está compartilhando".

## Como alterar os canais

Os canais são fixos por design (não há UI de "criar canal"). Para
adicionar, renomear ou reordenar:

```sql
-- exemplo: renomear um canal
update rooms set name = 'Novo Nome' where slug = 'cs-de-rua';

-- exemplo: adicionar um canal de texto novo
insert into rooms (name, slug, type, category, position)
values ('anúncios', 'anuncios', 'text', 'text', 7);
```

Se for um canal de **voz**, adicione o `slug` também na lista
`ALLOWED_VOICE_ROOMS` em `app/api/livekit/token/route.ts` — isso existe de
propósito, para que o backend nunca gere um token de voz para uma sala
arbitrária que não esteja na sidebar.

## Como alterar o nome do servidor

```sql
update server_settings set server_name = 'Nome Novo' where id = 1;
```

O nome aparece no topo da sidebar e no título da aba. Também dá para
mudar o valor padrão (usado antes de semear o banco) via
`NEXT_PUBLIC_APP_NAME` no `.env.local`.

## Limitações conhecidas (decisões conscientes de escopo)

- **Sem senha de servidor**: quem tem a URL entra digitando qualquer nome —
  não há mais um segredo compartilhado protegendo o acesso. Adequado para
  um link que só circula dentro do grupo de amigos; se a URL vazar,
  qualquer pessoa consegue entrar (mas ainda não consegue banir/apagar
  nada — isso continua exigindo a service role key, só usada no servidor).
- **Chat via anon key + RLS de leitura pública**: qualquer pessoa com a
  chave anon do Supabase consegue *ler* mensagens/canais diretamente pela
  API do Supabase, sem precisar nem do nome. É assim que o Supabase
  Realtime funciona no navegador. Para um grupo pequeno de amigos isso é
  um tradeoff aceitável (nada sensível trafega ali); toda **escrita**
  passa pela sessão autenticada.
- **Um compartilhamento de tela por vez**, checado no cliente — em caso de
  corrida (dois cliques quase simultâneos) pode raramente permitir dois
  streams por um instante. Suficiente para um grupo pequeno; um MVP2
  poderia mover essa checagem para o backend/webhooks do LiveKit.
- **Sem webcam** — de propósito (spec prioriza voz + tela, banda menor).
- **Painel de admin** ainda não tem interface — a arquitetura já separa
  `server_settings`/`is_banned`/RLS para isso ser adicionado depois sem
  redesenhar o resto.

## Testes

```bash
npm test          # Vitest — autenticação, token LiveKit, salas, mensagens
npm run lint
npx tsc --noEmit
npm run build
```

Veja [`TESTING.md`](./TESTING.md) para o que é coberto automaticamente e o
roteiro de teste manual para voz/tela (que depende de navegador real e de
um projeto LiveKit de verdade, então não é praticável em CI).
