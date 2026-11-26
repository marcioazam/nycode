# Provider `devin` (modelos da assinatura Devin)

Extensão embutida `packages/coding-agent/src/extensions/devin/`, classe `core` (pedido do dono: "Instalar no Core do Nycode").
Usa só o modelo do Devin. As ferramentas, o loop e a sessão continuam do nycode; não há ACP nem o harness do Devin.

## Origem

Porte do pacote npm `pi-devin-plus` 0.1.3 (MIT, Copyright (c) 2026 Kashyab Ambarani e pi-dal; texto em
`src/extensions/devin/LICENSE`, aviso em `NOTICE`). Fonte revisada pelo intake de terceiros de 2026-11-26
(resultado `accept-with-changes`). Nada do pacote é instalado nem executado: o código foi reescrito no repositório.

## Como usar

1. Instale o Devin CLI (`~/.local/bin/devin`, `~/.devin/bin/devin`, `/opt/homebrew/bin`, `/usr/local/bin` ou o app Devin). Outro
   caminho: `DEVIN_CLI=/caminho/absoluto/devin`. Não há busca no PATH.
2. `/login devin`. Se o CLI já estiver logado, a chave é lida de `~/.local/share/devin/credentials.toml` (só leitura). Se houver
   um login do Devin Desktop e o CLI não estiver logado, o nycode pergunta antes de reusar a sessão do Desktop. Sem nenhum dos
   dois, roda `devin auth login`.
3. Escolha um modelo `devin/...` no seletor. `/devin-refresh` atualiza o catálogo (`devin models list`); `/devin-status` mostra
   binário, versão, login e idade do catálogo.

A chave fica só no `auth.json` do nycode. O nycode nunca escreve nos arquivos do Devin. O cache do catálogo fica em
`<agentDir>/cache/devin/models.json` (modo 0600).

## Mudanças em relação ao upstream (intake)

| # | Mudança |
|---|---------|
| 1 | Host fixo `https://server.codeium.com`; sem `DEVIN_API_SERVER_URL` nem `api_server_url`; `redirect: "error"` nos dois POSTs |
| 2 | Frame de no máximo 16 MiB, gunzip de no máximo 64 MiB (`maxOutputLength`), timeout de inatividade de 120 s no stream |
| 3 | Importação do Desktop só dentro de `/login`, com confirmação; sem varredura bruta do SQLite (sem `node:sqlite` não há importação) |
| 4 | Nenhum `devin` roda na inicialização: o catálogo vem do cache ou da lista fixa; o CLI roda só em `/login`, `/devin-refresh`, `/devin-status` e, uma vez por processo, `devin --version` na primeira requisição (identidade do cliente). Binário só de caminhos absolutos |
| 5 | Credencial só no auth store do nycode; `getApiKey` devolve o `access` guardado |
| 7 | `model_uid`, `slug` e `family_uid` do catálogo validados (`[A-Za-z0-9._-]{1,100}`), rótulos até 200 caracteres |

Outras diferenças: o cache saiu de `~/.cache/pi-devin-plus` para o diretório do agente; `NYCODE_OFFLINE` bloqueia o refresh do
catálogo (upstream olhava `PI_OFFLINE`); o catálogo só roda o CLI em `/devin-refresh` e `/login`; em segundo plano há apenas um refresh
só pela API (sem CLI), uma vez por processo, na primeira requisição com cache vencido; o `console.warn` de falha de cache saiu (corromperia a TUI).

## Evolução 2026-11-26 (lista de lacunas)

Capacidades: `maxTokens` das opções vai ao #8.2 do CompletionConfiguration (padrão: máximo de saída do modelo, limitado à
janela de contexto; #8.3 fixo em 128000), temperatura ao #8.5 (mínimo 0,001, porque 0 devolve "an internal error occurred") e
`top_p` ao #8.8. Uso: ModelUsageStats (#7: entrada 2, saída 3, escrita de cache 4, leitura de cache 5, modelo 9, recusa 12) é a
fonte; o trailer #28 só vale sem estatísticas, sem somar. `#23 actual_model_uid` vira `responseModel`. Stop reasons (#5): 1, 3,
5, 9 = length; 10 = toolUse; 11 ou recusa = erro "Model refused (content filter)"; 13 = erro (redigido para ser repetido);
demais = stop. Stream vazio = "Devin stream ended without content". Resultado de ferramenta com erro marca o prompt #9;
`toolChoice` vai ao #12; assinatura de pensamento Gemini (#20) é capturada e reenviada no #17; só imagens do último turno do
usuário seguem (as antigas viram "[image omitted from history]"); modelo sem entrada de imagem rejeita localmente.

Autenticação (`/login devin` oferece as três): Devin CLI; navegador (PKCE S256, `app.devin.ai/auth/cli/continue`, loopback
`127.0.0.1/callback` com checagem de `state`, troca em `https://api.devin.ai/auth/cli/token`); código colado (mesmo link, sem
redirect). Também `DEVIN_LLM_API_KEY`. O token nunca é impresso nem registrado. O `session.json` (modo 0600) guarda só a origem
do login e o host. Identidade de reserva: constante única `WINDSURF_IDENTITY` (`windsurf` 2.0.0, última conhecida boa, verificada ao vivo em 2026-11-26). O caminho do `product.json` do Desktop (só macOS, nunca verificado) foi removido.

Host de tenant: só `https`, sem porta nem credenciais, com nome terminando em `.codeium.com`, `.windsurf.com` ou `.devin.ai`;
senão é ignorado e o `/devin-status` avisa. Todas as RPCs usam o mesmo host (substitui a mudança 1 do intake, que fixava o host). O host só vale vindo da resposta da troca PKCE ou das credenciais do Devin CLI, com no máximo 4 rótulos antes do sufixo (`^[a-z0-9-]+(\.[a-z0-9-]+)*\.(codeium\.com|windsurf\.com|devin\.ai)$`). Risco residual: qualquer subdomínio dessas zonas passa; o takeover de um deles receberia a chave de API, e quem escreve as credenciais do CLI (ou a resposta da troca) escolhe o subdomínio. Leituras de corpo são limitadas (16 MiB unário, 64 KiB erro/troca), varints a 10 bytes, e tokens (`devin-session-token$`, `wspkce$`, JWT) saem do texto do servidor antes de chegar à mensagem de erro.

Catálogo (decisão 2026-11-26: ids estáveis): com o CLI disponível, `devin models list` define famílias, ids (slugs com ponto,
`swe-2.1`) e agrupamento por esforço; a RPC `GetCascadeModelConfigs` só enriquece por `model_uid` (imagem só com
`supports_images`, variantes desativadas descartadas, janela de contexto e saída quando o CLI não os traz). Se o CLI falha,
as famílias vêm da RPC com o slug normalizado ao estilo do CLI (`claude-opus-5-5` -> `claude-opus-5.5`, `claude-5-fable` ->
`claude-fable-5`; uids em maiúsculas, internos, são ignorados) e o `family_uid` segue para a requisição. Ids salvos na grafia
com traço ou no `family_uid` da RPC continuam valendo: o registro de modelos casa ids exatamente e não tem alias, então cada
grafia vira um modelo "(alias of ...)" com o mesmo mapa de esforço. Fonte no `/devin-status`: "Devin CLI + API enrichment",
"Devin API only (no CLI)" ou "Devin CLI (API unavailable: motivo)". Sem rede na inicialização; atualiza em `/login`,
`/devin-refresh` e uma vez, em segundo plano e só pela API (enriquecendo o catálogo do CLI em cache), no primeiro uso com cache
vencido. O contrato de ouro do devin-core é a fixture de teste.
A RPC usa sempre `WINDSURF_IDENTITY`, independente da identidade do chat (com `devin-cli` o servidor responde 200 com corpo
vazio). Resposta sem modelos é erro; o motivo da API indisponível é gravado no cache (`fallbackReason`) e aparece no
`/devin-status` e no `/devin-refresh`. A lista estática de reserva inclui swe-1.7, swe-2, swe-2-flash e swe-2.1 (gratuitos).

Erros (união etiquetada `DevinFailure`, com código, mensagem e trace ID do corpo HTTP ou do trailer): quota (não repetida, cita
"quota exceeded" e <https://app.devin.ai/settings/usage>), `client_version` ("version is out of date", não repetida; com
identidade CLI vira dica de cota + URL de uso; com a reserva windsurf diz que a identidade de reserva foi recusada e manda
instalar/logar o Devin CLI), model_unavailable, content_policy, auth (401: renova o JWT uma vez e repete uma vez; depois
manda rodar `/login devin`), invalid_request (todas não repetidas) e transient (repetida por `packages/ai/src/utils/retry.ts`).
Timeout até o primeiro byte: 60 s, separado dos 120 s de inatividade; cancelar antes de começar não envia nada.

Exclusões deliberadas e o motivo: contornar recusas, nova tentativa guardada, escada de temperatura, prompts de sistema
sobrepostos, higienização de recusas no histórico, rodízio de contas, remoção de identidade, remoção de esquemas de
ferramentas, impressão digital aleatória de dispositivo e o truque de token Basic. Todos burlam controles do provedor ou da conta
(termos de serviço e segurança) e nenhum é necessário para o produto funcionar.

Riscos residuais da evolução: os números de campo do `ClientModelConfig` e do `ModelUsageStats` vêm do proto de terceiros
(cniu6) e não foram vistos contra o servidor real; a regra "version is out of date" depende do texto do servidor; o fluxo PKCE
depende de a Cognition manter a rota `/auth/cli/*`.

## Riscos aceitos e não verificados

- **Endpoint não documentado e Termos de Serviço.** O pacote fala o protocolo interno do Devin/Codeium (`GetUserJwt`,
  `GetChatMessage`) e se apresenta como `devin-cli` (versão real do binário) ou, sem o CLI, como `windsurf` 2.0.0. Notas do dwgx dizem que
  alguns modelos "Devin Local only" (gpt-5.6, família swe-2) recusam o ide `windsurf`; em 2026-11-26 o swe-2 funcionou com ele. Isso pode violar os termos da Cognition e quebrar sem aviso. Ponto 6 do intake
  (decisão do dono): o pedido de instalar no core foi tomado como aceite; o dono pode revertê-lo removendo a extensão (uma linha
  em `src/extensions/index.ts`).
- Evidência ao vivo (2026-11-26, `server.codeium.com`, credenciais reais, CLI 3000.14.30821, cota semanal paga esgotada, só swe-2*):

| Verificado | Resultado |
|---|---|
| `GetCascadeModelConfigs` ide `devin-cli` 3000.14.30821 | HTTP 200, corpo vazio (0 modelos) |
| `GetCascadeModelConfigs` ide `windsurf` 2.0.0 | 319 modelos (294 com imagem); swe-2: imagem sim, swe-2-flash: não |
| `GetCliModelConfigs` devin-cli / windsurf | 0 / 318 modelos |
| Chat swe-2, ide `devin-cli` + versão real | texto, ferramentas, pensamento, multi-turno e abort OK na TUI |
| Chat swe-2, ide `windsurf` 2.0.0 (sem CLI) | OK; `--model swe-2` resolve sem aviso (lista estática) |
| Chat swe-2, ide `devin-desktop` 3.7.0 | "Your Windsurf version is out of date": rejeição real; caminho removido |
| Modelos pagos com `devin-cli` | "version is out of date" = cota (windsurf mostra "weekly usage quota exhausted") |
| Imagem swe-2 via nycode (CLI, cache; sem CLI e sem cache) | "Red" nas duas; requisição byte a byte igual à do devin-core |
| Imagem em swe-2-flash | `invalid_argument` (o modelo não aceita imagem) |
| Imagem swe-2 (PNG 32x32 vermelho), requisição mínima (sem system prompt, imagem antes ou depois do texto, 4 execuções x medium/high) | 24/24 "red" |
| Idem com o system prompt do nycode (32 KB) e o texto `<file name=...>` do `@file`, ordem texto+imagem (160 execuções, medium+high) | 154/160 "red"; 1 "NOIMAGE", 1 markup nativo (`<\|open\|>tools<\|sep\|>...`), o resto "red" com ressalva; sem imagem nunca faltou na requisição (132 chars de base64 em todas) |
| Idem, ordem imagem+texto com system prompt (8 execuções) | 6/8 "red", 2 "NOIMAGE": o modelo, não a codificação, oscila; a ordem do `@file` (texto, imagem) não foi pior |
| `nycode -p --no-tools @red.png` swe-2, depois do build (src 16, dist 12, medium e high) | 28/28 "red" (antes, no relato do teste: 3 "NOIMAGE" + 1 vazamento em 6) |
| Mesmo comando, dist depois das correções, 6 medium + 6 high | 12/12 "red" |
| Texto com markup nativo (`<\|sep\|>`, `<\|close\|>`, `<\|end_message\|>`) sem ferramentas declaradas, prompt que pede um comando de shell | 5/9 com markup; com `tool_choice: none` sem ferramentas 4/7; com a ferramenta declarada 9/9 viram `tool_call` estruturado, 0 vazamentos |
| swe-2-flash + imagem com HOME limpo (lista estática) antes da correção | a imagem seguia ao modelo (a lista estática marcava imagem); depois: erro local "does not accept images" |

Não verificado: modelos pagos (cota esgotada), gpt-5.6 com ide `windsurf`, o login PKCE, o login do Desktop, o caminho de renovação
de JWT em produção. "NOIMAGE" é oscilação do modelo (cerca de 1% a 25% conforme a carga e o prompt; a imagem chega sempre). Causas e correções de 2026-11-26: (1) a lista estática de reserva marcava swe-2-flash com imagem, então sem cache a imagem ia a um modelo sem visão (agora só texto); (2) sem ferramentas declaradas o modelo às vezes emite o markup nativo de chamada de ferramenta como texto; os outros projetos (cniu6, dwgx, devin-core) não tratam isso, e `tool_choice: none` sem ferramentas não resolve, então o texto com `<|open|>`, `<|close|>`, `<|sep|>` ou `<|end_message|>` agora vira erro "server error" (o nycode tenta de novo) em vez de ser impresso. O limite de imagem para modelo só-texto continua um erro local (como `system-one-shared`); o núcleo só troca por texto nas APIs embutidas, não em `streamSimple` de extensão.
- O `devin auth login` usa o terminal herdado: dentro da TUI o resultado depende do terminal.
