/** Catálogo pt-BR: comandos (grupo, descrição, aliases, tecla) e ações de tecla (rótulo, contexto, origem). Só dados e consultas puras. */

import { CLAUDE_KEYBINDINGS } from "../claude-compat/shortcuts.ts";

export const GROUPS = [
	"Conversa",
	"Modelo e raciocínio",
	"Sessão",
	"Plano e tarefas",
	"Agentes",
	"Arquivos e Git",
	"Configuração",
	"Ajuda",
] as const;
export type Group = (typeof GROUPS)[number] | "Outros";

export interface Cmd {
	name: string;
	group: Group;
	desc: string;
	aliases?: string[];
	act?: string;
}

// Compacto: grupo | nome | aliases (espaço) | tecla (id de ação) | descrição. `act` é resolvido para a tecla efetiva na paleta.
const RAW = `
Conversa|new|clear reset||Começa uma sessão nova, sem turno do modelo
Conversa|compact|||Compacta o contexto da sessão
Conversa|copy||app.message.copy|Copia a última resposta do agente
Conversa|copy-code|||Copia um bloco de código da última resposta
Conversa|imagem|||Abre a última imagem do transcript no visualizador
Conversa|claude-copy|||Copia a N-ésima resposta, só o texto ou um bloco escolhido
Conversa|btw|||Pergunta lateral, sem gravar na sessão
Conversa|fork|||Nova ramificação a partir de uma mensagem anterior
Conversa|clone|||Duplica a sessão na posição atual
Conversa|claude-branch|||Duplica a conversa no ponto atual com um nome
Conversa|rewind|||Volta código e/ou conversa a um ponto salvo
Conversa|stop|||Interrompe o agente; com "agents", cancela também os subagentes
Conversa|transcript|||Abre a transcrição rolável da conversa
Conversa|focus|||Alterna o modo foco: último prompt, resumo e resposta final
Conversa|recap|||Resume os últimos pedidos da sessão
Configuração|docs-pointer|||Aponta os docs do nycode no prompt do sistema: completo, compacto ou automático
Configuração|llama|||Gerencia os modelos do roteador llama.cpp
Configuração|ponytail|||Muda o modo do ponytail e mostra o estado
Modelo e raciocínio|model||app.model.select|Escolhe o modelo
Modelo e raciocínio|thinking||app.thinking.cycle|Define o nível de raciocínio
Modelo e raciocínio|claude-effort|||Define o esforço de raciocínio da sessão
Modelo e raciocínio|advisor|||Configura ou desliga o modelo consultor
Modelo e raciocínio|scoped-models||app.model.cycleForward|Escolhe os modelos do ciclo de troca rápida
Modelo e raciocínio|output-style|||Escolhe o estilo de saída
Modelo e raciocínio|context|||Mostra o uso da janela de contexto
Modelo e raciocínio|contexto|||Define o limite de compactação automática desta sessão
Modelo e raciocínio|autocompact|||Liga ou desliga a compactação automática
Sessão|resume|||Retoma outra sessão
Sessão|rename|name||Renomeia a sessão atual
Sessão|session|||Mostra informações e estatísticas da sessão
Sessão|insights|||Mostra estatísticas locais da sessão atual
Sessão|tree|||Navega pela árvore da sessão e troca de ramo
Sessão|export|||Exporta a sessão (HTML ou .jsonl)
Sessão|import|||Importa uma sessão .jsonl
Sessão|share|||Compartilha a sessão (artefato ou gist)
Sessão|heapdump|||Grava um heap snapshot local, após confirmação
Sessão|quit||app.exit|Sai do nycode
Plano e tarefas|plan||ext.plan|Entra no modo plano
Plano e tarefas|todos|||Mostra as tarefas do ramo
Plano e tarefas|todos-widget|off, compact, full||Escolhe como a lista de tarefas aparece
Plano e tarefas|plan-todos|||Mostra as tarefas do plano
Plano e tarefas|goal|||Define uma meta que a sessão persegue até ser confirmada
Plano e tarefas|loop|||Repete um prompt em intervalos, até parar ou atingir o limite
Agentes|agents|||Lista os subagentes disponíveis
Agentes|tasks|||Mostra subagentes em segundo plano
Agentes|team|||Liga ou desliga o modo equipe de agentes
Agentes|subagents-setup|||Escolhe modelos e esforços dos subagentes
Agentes|travar-modelos|||Trava a sessão nos modelos e esforços escolhidos
Arquivos e Git|diff|||Revisa as mudanças do repositório por arquivo
Arquivos e Git|init|||Cria ou melhora o AGENTS.md do projeto
Arquivos e Git|cd|||Muda o diretório de trabalho desta sessão
Arquivos e Git|add-dir|||Adiciona, lista ou remove diretórios de trabalho extras
Arquivos e Git|memory|||Mostra, abre ou liga a memória automática
Configuração|settings|||Abre as configurações
Configuração|claude-config|||Lista, mostra ou grava configurações (chave=valor)
Configuração|claude-theme|||Troca o tema ao vivo e grava a escolha
Configuração|claude-tui|||Define o modo de tela: regular ou tela cheia
Configuração|scroll-speed|||Define as linhas por giro da roda na tela cheia
Configuração|color|||Define a cor da barra do prompt desta sessão
Configuração|terminal-setup|||Instala o Shift+Enter (nova linha) no terminal detectado
Configuração|login|||Configura a autenticação do provedor
Configuração|logout|||Remove a autenticação do provedor
Configuração|trust|||Salva a confiança neste projeto
Configuração|bypass||ext.bypass|Alterna as confirmações do guard
Configuração|hooks|||Mostra os hooks configurados
Configuração|mcp|||Mostra servidores MCP e suas ferramentas
Configuração|skills|||Lista as skills carregadas
Configuração|skill-doctor|||Valida o frontmatter e as duplicatas das skills
Configuração|claude-plugins|||Liga ou desliga os plugins do Claude Code instalados
Configuração|reload|||Recarrega atalhos, extensões, skills e temas
Configuração|painel|||Visão geral do que está ligado
Configuração|notifications|avisos||Avisos, notificação, som e progresso na aba
Configuração|diagnostico|||Erros, avisos e eventos do nycode nesta sessão
Configuração|doctor|||Verifica a saúde do harness
Configuração|keybindings|||Edita keybindings.json direto (avançado)
Ajuda|atalhos|hotkeys|ext.atalhos|Ver, buscar e mudar atalhos
Ajuda|help|||Ajuda: compatibilidade com o Claude Code e comandos carregados
Ajuda|claude-help|||Mapa de comandos do Claude Code e seus limites
Ajuda|changelog|||Mostra as novidades da versão
Ajuda|bug|||Reporta um bug aos desenvolvedores do nycode`;

export const COMMANDS: Cmd[] = RAW.trim()
	.split("\n")
	.map((l) => {
		const [group, name, aliases, act, desc] = l.split("|");
		return {
			name: name!,
			group: group as Group,
			desc: desc!,
			...(aliases ? { aliases: aliases.split(" ") } : {}),
			...(act ? { act } : {}),
		};
	});

/** Entrada pelo nome ou alias; `viaAlias` quando o nome dado é um alias. Desconhecido (skill, prompt, MCP) → undefined. */
export function findCommand(name: string): { cmd: Cmd; viaAlias: boolean } | undefined {
	for (const cmd of COMMANDS) {
		if (cmd.name === name) return { cmd, viaAlias: false };
		if (cmd.aliases?.includes(name)) return { cmd, viaAlias: true };
	}
	return undefined;
}

export type Context = "editor" | "sessões" | "modelos" | "árvore" | "seletores" | "tela cheia" | "subagentes";
export const CONTEXTS: Record<Context, string> = {
	editor: "Editor e atalhos globais",
	sessões: "Lista de sessões",
	modelos: "Seletor de modelos",
	árvore: "Árvore da sessão",
	seletores: "Menus e seletores",
	"tela cheia": "Tela cheia",
	subagentes: "Painel de subagentes",
};

const SESSION_LIST = new Set([
	"toggleNamedFilter",
	"togglePath",
	"toggleSort",
	"rename",
	"delete",
	"deleteNoninvasive",
]);
/** Contexto em que a tecla vale; global e editor dividem o mesmo (ações globais rodam no editor). */
export function contextOf(id: string): Context {
	if (id.startsWith("app.tree.")) return "árvore";
	if (id.startsWith("app.models.")) return "modelos";
	if (id.startsWith("app.session.") && SESSION_LIST.has(id.slice("app.session.".length))) return "sessões";
	if (id.startsWith("tui.select.")) return "seletores";
	if (id.startsWith("tui.altScreen.")) return "tela cheia";
	return "editor";
}

/** Ação de extensão (sem API pública de listagem): o harness declara as teclas que ele mesmo trata. */
export interface ExtAction {
	id: string;
	contexto?: Context;
	label: string;
	keys: string[];
	origin: "extensão" | "harness";
	intentional?: boolean;
	unless?: string;
}
// `unless`: o editor só trata a tecla quando a ação nativa do nycode não a tem (ui/editor.ts handleInput); então some do catálogo, do painel e dos conflitos.
export const EXT_ACTIONS: ExtAction[] = [
	{ id: "ext.stash", label: "Guardar e devolver o rascunho", keys: ["ctrl+s"], origin: "harness" },
	{ id: "ext.history", label: "Histórico de prompts", keys: ["ctrl+r"], origin: "harness" },
	{ id: "ext.redraw", label: "Redesenhar a tela", keys: ["ctrl+l"], origin: "harness", unless: "app.model.select" },
	{ id: "ext.tasks", label: "Lista de tarefas", keys: ["ctrl+t"], origin: "harness", unless: "app.thinking.toggle" },
	{
		id: "ext.up",
		label: "Linha ou histórico anterior",
		keys: ["ctrl+p"],
		origin: "harness",
		unless: "app.model.cycleForward",
	},
	{ id: "ext.down", label: "Linha ou histórico seguinte", keys: ["ctrl+n"], origin: "harness", intentional: true },
	{
		id: "ext.interrupt",
		label: "Interromper com o agente ocupado",
		keys: ["ctrl+c"],
		origin: "harness",
		intentional: true,
	},
	{ id: "ext.sendnow", label: "Enviar agora (Ctrl+X Ctrl+S)", keys: ["ctrl+enter"], origin: "harness" },
	{ id: "ext.sendprefix", label: "Prefixo de “enviar agora”", keys: ["ctrl+x"], origin: "harness", intentional: true },
	{ id: "ext.dropqueue", label: "Excluir última da fila", keys: ["shift+backspace"], origin: "harness" },
	{
		id: "ext.fleet",
		label: "Subagente para segundo plano",
		keys: ["ctrl+b"],
		origin: "extensão",
		contexto: "subagentes",
	}, // nycode fleet-ui/panel.ts: só consome com subagente em primeiro plano
	{ id: "ext.plan", label: "Modo plano", keys: ["ctrl+shift+p"], origin: "extensão" },
	{ id: "ext.bypass", label: "Bypass de permissões", keys: ["ctrl+shift+b"], origin: "harness" },
	{ id: "ext.atalhos", label: "Painel de atalhos (editor vazio)", keys: ["?"], origin: "harness" },
	{
		id: "ext.transcript",
		label: "Transcrição da conversa",
		keys: ["ctrl+o"],
		origin: "harness",
		unless: "app.tools.expand",
	}, // claude-compat/interface/transcript.ts
	{ id: "ext.diagnostico", label: "Diagnóstico: erros e avisos", keys: ["ctrl+e"], origin: "harness" }, // diagnostico/index.ts (ATALHO)
];

/** Alt de paridade com o Claude Code: vale como “intencional”, não !. */
// Alt intencional = o que a paridade Claude Code grava (fonte única: claude-compat/shortcuts.ts).
export const PARIDADE_ALT: Record<string, string[]> = Object.fromEntries(
	Object.entries(CLAUDE_KEYBINDINGS)
		.map(([id, v]) => [id, [v].flat().filter((k) => /(^|\+)alt(\+|$)/.test(k))])
		.filter(([, ks]) => ks.length),
);

// Pares que o próprio nycode desenhou com a mesma tecla (a ação vale conforme o estado): não são conflito.
export const NATIVOS_DUPLOS: string[][] = [["app.exit", "tui.editor.deleteCharForward"]];

const LABELS = `
tui.editor.cursorUp|Cursor para cima
tui.editor.cursorDown|Cursor para baixo
tui.editor.historyPrevious|Prompt anterior do histórico
tui.editor.historyNext|Próximo prompt do histórico
tui.editor.cursorLeft|Cursor para a esquerda
tui.editor.cursorRight|Cursor para a direita
tui.editor.cursorWordLeft|Cursor uma palavra à esquerda
tui.editor.cursorWordRight|Cursor uma palavra à direita
tui.editor.cursorLineStart|Início da linha
tui.editor.cursorLineEnd|Fim da linha
tui.editor.jumpForward|Saltar até um caractere (adiante)
tui.editor.jumpBackward|Saltar até um caractere (atrás)
tui.editor.pageUp|Página acima no editor
tui.editor.pageDown|Página abaixo no editor
tui.editor.deleteCharBackward|Apagar caractere anterior
tui.editor.deleteCharForward|Apagar caractere seguinte
tui.editor.deleteWordBackward|Apagar palavra anterior
tui.editor.deleteWordForward|Apagar palavra seguinte
tui.editor.deleteToLineStart|Apagar até o início da linha
tui.editor.deleteToLineEnd|Apagar até o fim da linha
tui.editor.yank|Colar o texto apagado
tui.editor.yankPop|Alternar o texto apagado colado
tui.editor.undo|Desfazer
tui.input.newLine|Nova linha
tui.input.submit|Enviar
tui.input.tab|Completar (Tab)
tui.input.copy|Copiar seleção
tui.select.up|Menu: item anterior
tui.select.down|Menu: próximo item
tui.select.pageUp|Menu: página acima
tui.select.pageDown|Menu: página abaixo
tui.select.confirm|Menu: confirmar
tui.select.cancel|Menu: cancelar
tui.altScreen.pageUp|Tela cheia: página acima
tui.altScreen.pageDown|Tela cheia: página abaixo
tui.altScreen.halfPageUp|Tela cheia: meia página acima
tui.altScreen.halfPageDown|Tela cheia: meia página abaixo
tui.altScreen.lineUp|Tela cheia: linha acima
tui.altScreen.lineDown|Tela cheia: linha abaixo
tui.altScreen.previousPrompt|Tela cheia: prompt anterior
tui.altScreen.nextPrompt|Tela cheia: próximo prompt
tui.altScreen.search|Tela cheia: buscar
tui.altScreen.searchNext|Tela cheia: próximo resultado
tui.altScreen.searchPrevious|Tela cheia: resultado anterior
tui.altScreen.searchClose|Tela cheia: fechar a busca
tui.altScreen.top|Tela cheia: ir ao início
tui.altScreen.bottom|Tela cheia: ir ao fim
app.interrupt|Interromper
app.clear|Limpar o editor
app.exit|Sair (editor vazio)
app.suspend|Suspender para o shell
app.thinking.cycle|Alternar o nível de raciocínio
app.thinking.save|Salvar o nível de raciocínio
app.thinking.toggle|Mostrar ou ocultar o raciocínio
app.model.cycleForward|Próximo modelo do ciclo
app.model.cycleBackward|Modelo anterior do ciclo
app.model.select|Trocar modelo
app.tools.expand|Expandir saída das ferramentas
app.editor.external|Editor externo
app.message.copy|Copiar seleção ou última resposta
app.message.followUp|Enfileirar mensagem
app.message.dequeue|Restaurar mensagens da fila
app.message.sendNow|Interromper e enviar agora
app.message.sendNowChord|Enviar agora (depois do prefixo de copiar)
app.queue.drop|Excluir mensagem da fila
app.queue.selectPrev|Escolher mensagem anterior da fila
app.queue.selectNext|Escolher próxima mensagem da fila
app.clipboard.pasteImage|Colar imagem
app.session.new|Nova sessão
app.session.tree|Abrir a árvore da sessão
app.session.fork|Ramificar a sessão
app.session.resume|Retomar uma sessão
app.session.toggleNamedFilter|Sessões: só as com nome
app.session.togglePath|Sessões: mostrar caminho
app.session.toggleSort|Sessões: ordem
app.session.rename|Sessões: renomear
app.session.delete|Sessões: apagar
app.session.deleteNoninvasive|Sessões: apagar (busca vazia)
app.tree.foldOrUp|Árvore: recolher ou subir
app.tree.unfoldOrDown|Árvore: expandir ou descer
app.tree.editLabel|Árvore: editar rótulo
app.tree.toggleLabelTimestamp|Árvore: mostrar hora do rótulo
app.tree.filter.default|Árvore: visão padrão
app.tree.filter.noTools|Árvore: ocultar resultados de ferramentas
app.tree.filter.userOnly|Árvore: só mensagens suas
app.tree.filter.labeledOnly|Árvore: só rotuladas
app.tree.filter.all|Árvore: tudo
app.tree.filter.cycleForward|Árvore: próximo filtro
app.tree.filter.cycleBackward|Árvore: filtro anterior
app.models.save|Modelos: salvar a seleção
app.models.enableAll|Modelos: ativar todos
app.models.clearAll|Modelos: limpar todos
app.models.toggleProvider|Modelos: alternar o provedor
app.models.reorderUp|Modelos: mover para cima
app.models.reorderDown|Modelos: mover para baixo`;

export const ACTION_LABELS: Record<string, string> = {
	...Object.fromEntries(
		LABELS.trim()
			.split("\n")
			.map((l) => l.split("|") as [string, string]),
	),
	...Object.fromEntries(EXT_ACTIONS.map((a) => [a.id, a.label])),
};
