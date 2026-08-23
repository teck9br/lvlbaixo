# Testes — lvlbaixo

## Testes automatizados

```bash
npm test        # roda a suíte com Vitest (autenticação, geração de token
                 # LiveKit, listagem de salas, envio de mensagens,
                 # permissões, tratamento de erros)
npm run lint     # ESLint (inclui as regras de React Hooks)
npx tsc --noEmit # checagem de tipos
npm run build    # build de produção completo
```

A suíte cobre, com mocks para Supabase/sessão (sem precisar de credenciais reais):

- **Autenticação** (`__tests__/api-auth.test.ts`): nome inválido (400),
  usuário banido (403), login de usuário novo cria a linha no banco e
  abre sessão (200), renomear exige sessão válida (401/200).
- **Geração de token LiveKit** (`__tests__/livekit-token.test.ts`): o JWT
  gerado carrega a identidade, o nome e o grant de sala corretos; erro claro
  quando as credenciais não estão configuradas.
- **Token de sala de voz via API** (`__tests__/api-livekit-token.test.ts`):
  exige sessão (401), rejeita nomes de sala fora da lista fixa (400), gera
  token para uma sala permitida (200), retorna 503 se o LiveKit não estiver
  configurado.
- **Listagem de salas** (`__tests__/api-rooms.test.ts`): exige sessão,
  retorna os 6 canais na ordem correta do seed, trata falha do banco (503).
- **Envio de mensagem** (`__tests__/api-messages.test.ts`): exige sessão,
  rejeita mensagem vazia/roomId inválido, impede postar em canal de voz,
  insere e retorna a mensagem em um canal de texto válido.
- **Sessão assinada** (`__tests__/session.test.ts`): round-trip do cookie
  assinado, detecção de payload adulterado, rejeição de token malformado ou
  assinado com outro segredo.
- **Utilitários** (`__tests__/utils.test.ts`): normalização de nome de
  usuário, iniciais de avatar, cor determinística, formatação de horário.

## Por que WebRTC/LiveKit não tem teste automatizado

Conexão de mídia real (microfone, compartilhamento de tela, áudio entre
participantes) depende do navegador, de hardware (microfone/câmera) e de um
projeto LiveKit Cloud real — não é praticamente testável em CI sem uma
suíte de testes E2E pesada (ex.: Playwright com fixtures de mídia falsas).
Em vez disso, use o roteiro manual abaixo sempre que mexer em
`hooks/useVoiceRoom.ts`, `components/voice/*` ou nas configurações de
`lib/livekit/config.ts`.

## Roteiro de teste manual

### Pré-requisitos

1. Projeto Supabase criado, com `supabase/migrations/0001_init.sql`,
   `supabase/migrations/0002_drop_access_password.sql` (se o banco já
   existia de antes da remoção da senha) e `supabase/seed.sql` executados.
2. Projeto no LiveKit Cloud (ou LiveKit self-hosted) com API Key/Secret.
3. `.env.local` preenchido (veja `.env.example` e o README).
4. `npm run dev` rodando, ou build publicado (Vercel/local).

### 1. Login

- [ ] Abrir o app pela primeira vez → aparece "Qual é o seu nome?".
- [ ] Digitar um nome e clicar ENTRAR → entra direto no servidor (sem
      senha) e vê a lista de canais na ordem: link-gc, regras,
      bate-papo-do-uol, CS de Cadeira 🎮🚨, CS de Rua, GAY POR:.
- [ ] Recarregar a página → continua logado (cookie de sessão persistiu),
      não pede nome de novo.
- [ ] Limpar cookies (mas manter o localStorage) e recarregar → reabre
      sessão automaticamente usando o nome salvo localmente, sem pedir
      nada ao usuário.
- [ ] Alterar o nome pelo lápis no rodapé da barra lateral → nome atualiza
      em tempo real.
- [ ] Sair (ícone de logout) → volta para a tela "Qual é o seu nome?", mas
      mantém o nome salvo localmente (digitar o mesmo nome de novo — ou
      qualquer nome — entra sem pedir mais nada).

### 2. Chat de texto

- [ ] Abrir `bate-papo-do-uol`, enviar mensagem com Enter → aparece na
      lista, com nome, avatar e horário.
- [ ] Abrir o mesmo canal em duas abas/perfis diferentes → mensagem enviada
      em uma aparece em tempo real na outra (Supabase Realtime).
- [ ] Rolar para cima no histórico e mandar mensagem pela outra aba →
      aparece o indicador "N novas mensagens"; clicar nele volta ao fim.
- [ ] Abrir `regras` → mostra a mensagem de boas-vindas semeada.

### 3. Voz — dois participantes

- [ ] Usuário A entra em "CS de Rua" → navegador pede permissão de
      microfone → aceitar → A aparece na grade de participantes.
- [ ] Usuário B (outro navegador/aba anônima/outro dispositivo) entra na
      mesma sala → A e B se veem na grade um do outro.
- [ ] Na barra lateral, sob "CS de Rua", B (numa aba que NÃO entrou na
      sala — ex. está vendo o chat de texto) vê o avatar + nome de A
      listado abaixo do canal, sem precisar entrar (pode levar até ~6s
      pra aparecer — é um polling em `/api/livekit/presence`). Ao sair da
      sala, o nome some da lista em até ~6s.
- [ ] A fala → o círculo do avatar de A pisca/realça (indicador de fala) em
      ambas as telas; ícone muda para 🟢.
- [ ] A clica em "Microfone" para mutar → vira 🔇 para todos, botão fica
      vermelho "Mutado".
- [ ] B sai da sala (Sair) → A vê B desaparecer da grade.

### 4. Compartilhamento de tela

- [ ] Com A e B na mesma sala, A clica "Compartilhar tela", escolhe uma
      janela/tela com texto (ex. um editor de código) → captura inicia.
- [ ] B vê a tela de A ocupando a área principal, com o texto legível.
- [ ] Verificar nas estatísticas do navegador de B (chrome://webrtc-internals
      ou DevTools) que a resolução recebida é próxima de 1920×1080 (ou a
      resolução nativa do monitor de A, se menor — nunca deve haver upscale).
- [ ] B tenta compartilhar tela também → recebe aviso "Outra pessoa já está
      compartilhando a tela nesta sala." e a ação é bloqueada.
- [ ] A clica "Parar compartilhamento" → a grade de participantes volta
      para todos, B não vê mais a tela de A.
- [ ] A cancela a seleção de tela no picker do navegador (em vez de
      escolher uma tela) → aparece mensagem amigável, sem travar a UI.

### 5. Rede instável / reconexão

- [ ] Com A em uma sala de voz, desativar o Wi-Fi/rede por ~5 segundos e
      reativar → status muda para "🟡 Reconectando...", depois volta a
      "🟢 Conectado" automaticamente, sem precisar recarregar a página.
- [ ] Repetir com A compartilhando tela → após reconectar, o
      compartilhamento continua ativo (recuperado pelo LiveKit SDK).
- [ ] Usar as ferramentas de rede do navegador (throttling para "Slow 3G"
      ou similar) durante um compartilhamento → observar a qualidade caindo
      (fallback para 15 FPS) sem travar a chamada.

### 6. Erros e permissões

- [ ] Negar a permissão de microfone no navegador → mensagem amigável
      explicando como habilitar, sem stack trace.
- [ ] Testar em um navegador/dispositivo sem suporte a
      `getDisplayMedia` (ex. um navegador mobile comum) → botão de
      compartilhar tela é substituído por um aviso, em vez de falhar
      silenciosamente.
- [ ] Derrubar o Supabase (ou usar uma URL inválida temporariamente) →
      canais de texto mostram mensagem de erro amigável ao carregar.
- [ ] Deixar o token LiveKit expirar/ser inválido (ex. trocar o
      `LIVEKIT_API_SECRET` no servidor sem reiniciar o token do cliente) →
      erro amigável ao tentar entrar na sala de voz.

### 7. Responsividade

- [ ] Reduzir a janela para largura mobile (ou usar o modo device do
      DevTools) → barra lateral vira menu recolhível acessível por botão.
- [ ] Testar em um celular real (Chrome Android e Safari iOS) → login,
      chat e voz funcionam; compartilhamento de tela funciona no Android
      recente (Chrome) e mostra aviso claro nos que não suportam (ex. a
      maioria dos navegadores iOS).
