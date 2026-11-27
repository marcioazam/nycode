# 18 — `web_search` multi-backend API-first e content negotiation (`llms.txt` / `<link rel="alternate">`)

- **Classe**: **B** (adiciona backends de rede e altera comportamento de `web_search`/`web_fetch`, exigindo validação de segurança SSRF e revisão da decisão D-52; *os 76 scrapers individuais por site ficam rejeitados em [rejeitados.md](../rejeitados.md#r10---76-scrapers-web-específicos-por-site-e-clis-trafilaturalynx)*).
- **Prioridade**: **P2** (conserta a fragilidade do scraping único de DuckDuckGo HTML em `web_search` quando o usuário possui chaves de API configuradas e melhora qualidade de MD em sites modernos).

## O que o `omp` faz

1. **Busca multi-backend ordenada com cooldown 429**: `executeSearch` (`omp:packages/coding-agent/src/web/search/index.ts:266-538`) suporta operadores estruturados (`site:`, `after:`, `before:`, `inurl:`, `intitle:`, `filetype:`, `OR`, `-term` em `web/search/query.ts:44-86`), escolhe backends por alvo (`xai`, `hackernews`, APIs configuradas como Brave, Exa, Tavily, Perplexity, SearXNG, Kagi, Gemini/Anthropic/Codex grounded), aplica cooldown de 5 min após HTTP 429 e relaxa restrições no fallback.
2. **Negociação de conteúdo em `fetch.ts`**: antes de fazer parse de HTML ruidoso, `omp:packages/coding-agent/src/tools/fetch.ts:626-635,1799-1855` verifica cabeçalho `Accept: text/markdown`, `<link rel="alternate" type="text/markdown">` e fallback para `/llms.txt`:

```ts
export type FetchProvider = "native" | "trafilatura" | "lynx" | "parallel" | "firecrawl" | "jina";

const FETCH_PROVIDER_ORDER: readonly FetchProvider[] = [
	"native",
	"trafilatura",
	"lynx",
	"parallel",
	"firecrawl",
	"jina",
];
```

- **Ancestralidade Pi**: ausente em `pi0.9.4` e `pibase`; ambos os forks implementaram busca/fetch web independentemente.

## Como o `nycode` faz

Em `packages/coding-agent/src/extensions/web/index.ts:168-207,398-538` e `extensions/_shared/web/web-transport.ts:38-74` (`880` LOC totais):
- **`web_fetch` é superior em segurança e economia**: bloqueia SSRF/DNS rebinding com `isPrivateAddress` (`:168-174`) + `resolveAndPin` (`:196-207`) + `httpFetch` com `lookup` fixado (ao contrário do `omp`, que usa `fetch()` global em `web/scrapers/types.ts:210`), já envia `Accept: text/markdown, text/html;q=0.9, */*;q=0.8`, reporta redirect cross-host ao modelo sem seguir cegamente, e suporta `prompt` para devolver apenas resposta resumida via LLM.
- **Lacunas concretas**:
  1. `web_search` nasce **desligada por padrão** (`NYCODE_KEEP_WEB_SEARCH=1` em `extensions/web/index.ts:430-469`) por causa da D-52 (`docs/migration/nycode-core/11-decisoes-e-pendencias.md:64`: scraping de DuckDuckGo HTML falha com frequência). Não aceita backends confiáveis via API key (`BRAVE_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `SEARXNG_URL` ou endpoint do próprio provedor).
  2. `web_fetch` já manda `Accept: text/markdown`, mas não checa `<link rel="alternate" type="text/markdown">` no HTML retornado nem tenta `/llms.txt` como alternativa quando encontra página SPA quase vazia.

## Diferença concreta

| Aspecto | `omp` (`v19.2.1`) | `nycode` (`00fed2ae`) |
|---|---|---|
| Backends de `web_search` | 30 backends com fallback e cooldown 429 (`web/search/index.ts:266-538`) | Apenas DuckDuckGo HTML, desligado por default (`extensions/web/index.ts:430-469`) |
| Proteção SSRF / DNS rebinding | `fetch()` direto sem pinagem DNS (`web/scrapers/types.ts:210`) | `resolveAndPin` + bloqueio RFC1918/IPv6 + redirect explícito (`extensions/web/index.ts:168-207`) |
| Markdown nativo da página | `Accept: text/markdown` + `<link rel="alternate">` + `llms.txt` (`tools/fetch.ts:1799-1855`) | Envia `Accept: text/markdown` (`web-transport.ts:52`), sem `<link rel="alternate">` nem `llms.txt` |

## Benefício

- **Problema**: hoje `nycode` sem `NYCODE_KEEP_WEB_SEARCH=1` não tem `web_search` mesmo quando o usuário já tem chave de busca (`BRAVE_API_KEY`, `EXA_API_KEY`, `TAVILY_API_KEY`) ou instância `SearXNG`; e sites SPA modernos (React docs, etc.) devolvem HTML vazio no `web_fetch` mesmo expondo `<link rel="alternate" type="text/markdown">` ou `/llms.txt`.
- **Solução enxuta em TS puro (rejeitando os 76 scrapers + Rust `html-to-markdown-rs`)**:
  1. Manter 100% intacto o transporte `resolveAndPin` + `httpFetch` (jamais usar `globalThis.fetch` para URLs arbitrárias!).
  2. Em `web_fetch`, após baixar HTML dentro do limite `10 MiB`, inspecionar `<link rel="alternate" type="text/markdown">` (seguindo apenas via `fetchText` / política de cross-host existente) e, se o Markdown extraído resultar vazio/boilerplate mínimo (< 200 chars em página SPA), sugerir/consultar `/llms.txt` no mesmo origin.
  3. Em `web_search` (revisando D-52 caso autorizado), habilitar busca ordenada **API-first** (ex.: Brave Search -> Exa -> Tavily -> SearXNG configurável, caindo para DuckDuckGo apenas se habilitado), usando exclusivamente `web-transport.ts` e só ativando a tool se houver backend configurado (0 tokens quando nenhuma API key/SearXNG existir!).

## Custo

- **Tokens / turno**: **0** quando não há backend configurado ou `web_search` continua opt-in; **~103–150 tokens** na declaração da tool quando habilitada (com `web_fetch` já ativo em **145 tok**).
- **Latência**: menor quando `llms.txt` ou API JSON responde direto sem scraping HTML.
- **Manutenção**: ~180 LOC TS puro em `extensions/web/`, zero dependências npm/Rust novas.

## Riscos

- **Regressão de SSRF**: qualquer URL vinda de `<link rel="alternate" href="...">` ou `/llms.txt` é não confiável e **tem** de passar por `normalizeUrl` + `resolveAndPin` + regra de redirect cross-host do `extensions/web/index.ts`.
- **Gasto inesperado em chaves de API**: ativar busca automática silenciosamente pode consumir cota paga do usuário; deixar claro na configuração / env explícita.
- **Offline tests**: `vitest.config.ts` roda com `NYCODE_OFFLINE=1`; novos testes precisam mockar HTTP localmente sem rede externa.
- Docs: revisar decisão D-52 (`docs/migration/nycode-core/11-decisoes-e-pendencias.md:64`) e documentar em `docs/ADR.md` (checkout principal) se o default de `web_search` mudar.

## Licença

**MIT** (`omp:LICENSE:1-23`).

## Proposta

- **`packages/coding-agent/src/extensions/web/index.ts`**: adicionar inspeção de `<link rel="alternate" type="text/markdown">` e probe `/llms.txt` opcional para páginas SPA vazias passando por `fetchText` (`resolveAndPin`), além de adaptadores leves `POST`/`GET` para backends REST configurados (SearXNG/Brave/Tavily/Exa).
- **`packages/coding-agent/src/extensions/_shared/web/web-transport.ts`**: estender `httpFetch` para aceitar `method: "POST"` e cabeçalhos `Authorization`/`X-API-Key` mantendo exatamente o mesmo `pinnedLookup` anti-SSRF.

## Testes

- `packages/coding-agent/test/harness/web/`: testar com servidor HTTP loopback (`allowNetwork()` local ou mock de `httpFetch`) que:
  1. `<link rel="alternate" type="text/markdown">` em IP privado `127.0.0.1` / `169.254.169.254` é **bloqueado** por `resolveAndPin`.
  2. Página SPA vazia busca `<origin>/llms.txt` no mesmo host e extrai conteúdo útil.
  3. Cadeia multi-backend faz fallback para o 2º provedor após HTTP 429 e respeita cooldown.

## Plano de eval

- **Base e candidato**: (1) medir offline com replay de páginas SPA reais gravadas em fixture (`text/markdown` via `llms.txt` vs `htmlToMarkdown` atual) verificando redução de tokens/ruído e preservação da segurança SSRF; (2) se ligar `web_search` por padrão fora de modo offline, rodar `bench/run.py` em `suite.s1` (`pr_cases`) confirmando que não altera taxa/custo quando web não é usado (`NYCODE_OFFLINE=1` em containers de código). Não reexecutar `cc-vanilla`/`pi-vanilla`.

## Critérios de aceite

1. Zero bypass de `resolveAndPin` / `isPrivateAddress` em qualquer requisição nova.
2. Economia de tokens/ruído em sites de documentação com `<link rel="alternate">` ou `/llms.txt`.
3. `test/harness/web/` 100% verde offline.

## Rollback

Reverter os adaptadores extras e manter apenas `web_fetch` atual + `NYCODE_KEEP_WEB_SEARCH`.
