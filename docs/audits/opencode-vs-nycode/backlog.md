# Backlog priorizado

Ordem: classe A primeiro (custo zero), depois B por benefício/custo. Nada aqui está implementado; cada item B só
entra após o eval descrito no achado. Estimativas de tokens: ver cada achado e `README.md`, Medições.

| Ordem | Achado | Classe | Prioridade | Benefício | Custo (tokens / manutenção) | Bloqueio |
|---|---|---|---|---|---|---|
| 1 | [01 Reparo de input de tool](achados/01-reparo-de-input-de-tool.md) | A | P1 | Menos retries por input malformado | 0 tok; ~200 linhas em `packages/schema` | nenhum |
| 2 | [02 Snapshots por passo e /redo](achados/02-snapshots-por-passo-e-redo.md) | A | P1 | Rewind cobre mudanças de `bash`; desfazer por passo | 0 tok; latência por passo a medir | medir latência |
| 3 | [03 Esc retira a última mensagem](achados/03-esc-retira-ultima-mensagem.md) | A | P2 | UX; remove par abortado do contexto | negativo; mexe em navegação de árvore | nenhum |
| 4 | [04 Aprovações salvas por site](achados/04-aprovacoes-salvas-por-site.md) | A | P3 | Menos prompts em modo seguro | 0 tok; ~250 linhas | dono usa bypass |
| 5 | [05 Regras de permissão ordenadas](achados/05-regras-de-permissao-ordenadas.md) | A | P3 | Agentes restritos sem hooks | 0 tok; manutenção alta | decidir se vale o 2º motor |
| 6 | [19 Prompts MCP como slash commands](achados/19-prompts-mcp-como-comandos.md) | A | P2 | Primitiva MCP acessível pelo usuário | 0 tok fixo; cliente + registro de comandos | teste de contrato |
| 7 | [06 Compactação com prefixo em cache](achados/06-compactacao-com-prefixo-em-cache.md) | B | P0 | ~135k tok-equivalentes por compactação de 150k; sem espera | resumo descartado custa; manutenção alta | eval de qualidade do resumo |
| 8 | [13 Verbosidade baixa OpenAI/Azure](achados/13-verbosidade-baixa-openai.md) | B | P1 | Menos saída em GPT pela API | ~15 linhas | eval curto em GPT |
| 9 | [11 Dica no erro do edit](achados/11-dica-no-erro-do-edit.md) | B | P1 | Evita `read` pós-erro e edit duplicado | +0..700 tok só no erro; ~60 linhas | eval de edição |
| 10 | [08 /goal: lembrete pós-compactação e estagnação](achados/08-goal-lembrete-e-estagnacao.md) | B | P1 | Objetivo literal sobrevive; corta rodadas inúteis | +60 tok + objetivo só pós-compactação | eval de goals longos |
| 11 | [07 /goal: revisor no prefixo em cache](achados/07-goal-revisor-no-prefixo-em-cache.md) | B | P1 | Mais barato em sessões > 100k; juiz vê tool results reais | mais caro em sessões curtas | eval de falso "met" |
| 12 | [09 Continuação após limite de saída](achados/09-continuacao-apos-limite-de-saida.md) | B | P2 | Menos "continue" manual | +32 tok por continuação | eval de geração longa |
| 13 | [10 Passo final de resumo no maxTurns](achados/10-passo-final-sem-tools-preservando-cache.md) | B | P2 | Pai recebe resumo do filho | +1 passo por limite | eval de delegação |
| 14 | [12 Ocultar tools negadas](achados/12-ocultar-tools-totalmente-negadas.md) | B | P2 | -schema de tools nunca permitidas | depende do 05 | achado 05 |
| 15 | [15 Code Mode padrão para MCP](achados/15-code-mode-como-padrao-para-mcp.md) | B | P2 | -schemas MCP | catálogo em texto | A/B já decidido pelo dono |
| 16 | [14 Busca de sessões pelo modelo](achados/14-busca-de-sessoes-pelo-modelo.md) | B | P3 | Retomada sem colar histórico | 0 se diferida via `tool_search` | eval de retomada |
| 17 | [16 Prompt por família de modelo](achados/16-prompt-por-familia-de-modelo.md) | B | P3 | Hipotético | +150..+1400 tok fixos | eval por família |
| 18 | [17 Tool patch (apply_patch)](achados/17-tool-patch-apply-patch.md) | B | P3 | Hipotético em GPT | +262 tok de descrição | eval em GPT |
| 19 | [18 Aviso de fork](achados/18-aviso-de-fork.md) | B | P2 | Evita esperar resultado de background que ficou no original | +226 tok por fork (só com background ativo na variante proposta) | eval de fork com subagente |
| 20 | [20 Identidade do modelo](achados/20-identidade-do-modelo.md) | B | P3 | Hipotético: escolha de modelo de subagente | +35 tok/req no prefixo | eval de escolha de modelo |

Critério de ordem dentro de B: economia por evento x frequência do evento ÷ manutenção. O 06 vem primeiro porque toda
sessão longa compacta e a economia por evento é a maior medida/estimada; 13 e 11 são baratos de implementar e testar.
