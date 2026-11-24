# Migração do harness Nycode para o core do Nycode

Plano e guias para levar o harness Nycode pré-migração para dentro do
[`marcioazam/nycode`](https://github.com/marcioazam/nycode), o fork do pi.

**Estado: plano. Nada foi implementado.** Estes documentos descrevem o trabalho; nenhuma linha de código, regra do
GitHub ou arquivo fora desta pasta foi alterado.

Levantamento: 2026-11-20, sobre Nycode pré-migração e `nycode@fb05db936`.

## Ordem de leitura

| # | Documento | Para quê |
|---|---|---|
| 00 | [Mega plano](00-mega-plano.md) | Objetivo, princípios, as 13 fases, critérios de aceite, riscos principais |
| 01 | [Inventário](01-inventario-origem.md) | O que existe hoje na origem e no destino, com contagens |
| 02 | [Arquitetura alvo](02-arquitetura-alvo.md) | Onde cada peça passa a morar, costuras no core, configuração |
| 03 | [Mapa de migração](03-mapa-de-migracao.md) | Destino de cada arquivo, módulo, terceiro e dado do usuário |
| 04 | [Regras do repositório](04-regras-do-repositorio.md) | Todas as regras do harness Nycode no Nycode: GitHub e arquivos |
| 05 | [Marca e README](05-marca-e-readme.md) | Logo do Nycode recuperado do histórico; README sem o logo do pi |
| 06 | [Guia de execução](06-guia-de-execucao.md) | Passo a passo com comandos, fase por fase |
| 07 | [CI, qualidade e segurança](07-ci-qualidade-seguranca.md) | Workflows, checks obrigatórios, cadeia de suprimento |
| 08 | [Sincronização com o upstream](08-sincronizacao-upstream.md) | Como o fork continua recebendo o pi |
| 09 | [Paridade e benchmark](09-paridade-e-benchmark.md) | Como provar que o Nycode faz o que o harness Nycode fazia |
| 10 | [Riscos e reversão](10-riscos-e-rollback.md) | Registro de riscos, como desfazer cada fase |
| 11 | [Decisões e pendências](11-decisoes-e-pendencias.md) | 37 decisões e 20 pendências |
| 12 | [Checklist mestre](12-checklist-mestre.md) | 186 itens verificáveis |
| 13 | [Fontes](13-fontes.md) | Comandos e fontes de cada fato; o que não foi verificado |
| 14 | [Prompt de `/goal`](14-prompt-goal.md) | Condição pronta para executar a migração com `/goal` |

## Anexos

| Anexo | Conteúdo |
|---|---|
| A | Levantamento bruto do harness Nycode |
| [B](anexos/B-mapa-core-nycode.md) | Levantamento bruto do core do Nycode |
| [C](anexos/C-logo-historico.md) | O logo do Nycode no histórico git |
| D | Regras do GitHub dos dois repositórios |
| E | Mapa por regra; um arquivo por linha; gerador |

## Em uma página

- O harness Nycode é um harness montado por fora do pi: um wrapper aplica 19 patches no pi-code e 2 no pi a cada início, e
  carrega 23 extensões, 17 agentes, 30 skills e um conjunto de hooks de uma pasta de configuração.
- O Nycode já é o fork do pi (1.6.0), renomeado. Ele tem extensões embutidas no binário, e é por elas que quase todo
  o harness Nycode entra: código novo em diretórios novos, com 14 edições pequenas em arquivos do upstream.
- A ordem é: congelar e medir (F0), trazer o histórico (F1), regras e marca (F2), CI e benchmark (F3), core (F4),
  camada base do pi-code (F5), subagentes e plano (F6), extensões próprias (F7), agentes, skills e permissões (F8),
  terceiros (F9), paridade (F10), publicação (F11), corte (F12).
- Cada fase só fecha com teste portado e gate do benchmark não inferior à referência.
- Uma regra do harness Nycode é afrouxada: histórico linear. Um fork precisa de merge commit para receber o upstream; isso
  fica restrito aos PRs de sincronização e é auditado (D-07).

## Antes de começar

Quatro respostas do dono travam o início de alguma fase
([detalhe](11-decisoes-e-pendencias.md)):

1. D-15: apagar os 213 ramos herdados do antigo Nycode em Rust?
2. D-16: fechar os 8 alertas de secret scanning como credencial pública do upstream?
3. ~~D-17: criar a organização `@nycode` no npm?~~ Respondida em 2026-11-20: sem npm, o canal é o repositório (GitHub Releases)
4. D-22: arquivar o repositório Nycode pré-migração no corte?

## Evidências

Cada fase executada grava registro do mantenedor nesta pasta (modelo em [06](06-guia-de-execucao.md)). A pasta ainda
não existe porque nada foi executado.
