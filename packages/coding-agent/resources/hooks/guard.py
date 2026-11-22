#!/usr/bin/env python3
"""Guard de permissões do nycode (hook PreToolUse do nycode, no estilo Claude Code).

Registrado em settings-defaults.ts (hooks.PreToolUse, matcher Bash|run|Edit|Write|Read|Grep).
Lê o payload JSON do stdin e responde:
  - nada (exit 0)  -> allow
  - permissionDecision "ask"  -> o nycode mostra confirmação; sem UI (nycode -p, subagent) vira bloqueio
  - permissionDecision "deny" -> bloqueado sempre

Política "Equilibrada":
  DENY (catastrófico; nem o bypass libera):
    rm recursivo+force, mkfs, dd of=/dev/..., redirecionar para disco (/dev/sd*, nvme*...),
    curl|wget com pipe para shell, git push --force para main/master, fork bomb,
    chmod/chown -R na raiz, pkill -f / pgrep -f ligado a kill cujo padrão casa com a própria linha
    do `bash -c` (o shell se mata: exit 143/144; use o colchete, `pkill -f '[n]ome'`, ou o PID).
    Também (2026-11): dispositivos de bloco (dm/loop/md/mapper...) via redirect/dd/tee/cp/mv, wipefs -a,
    cryptsetup luksFormat/erase, blkdiscard, sgdisk --zap-all, parted mklabel, sfdisk em /dev,
    shutdown/reboot/poweroff/halt/init 0|6/systemctl poweroff|reboot|halt|kexec, kill -1 ou PID 1,
    git push apagando main/master, rm -r em /, ~, $HOME e diretórios de sistema.
    Corpo de heredoc (exceto lido por shell) é mascarado: texto citado não é comando.
  ASK (arriscado):
    sudo/su/doas, rm -r, git reset --hard / clean -f / push / rebase / branch -D,
    chmod -R, chown -R, shred, kill -9, docker rm/rmi/prune, npm|pnpm|yarn publish,
    Edit/Write em arquivo sensível (.env*, chaves, ~/.ssh, ~/.aws, auth.json, settings do nycode,
    wrapper ~/.local/bin/nycode, rc do shell) ou fora do projeto atual (/tmp é livre).
  MODOS (2026-11-14): com NYCODE_PERMISSION_MODE definido (default|acceptEdits|plan; aliases ask, auto; legado bypassPermissions), o pacote
  permissions/ decide depois dos DENY acima (que nunca mudam); com NYCODE_BYPASS_PERMISSIONS verdadeiro todo ASK
  vira allow em qualquer modo (bypass ortogonal); sem a variável de modo, tudo acima vale bit a bit.
  DENY de Read (paridade com as 13 regras Read(...) deny de ~/.claude/settings.json, mais as
    credenciais do nycode): ~/.ssh/**, ~/.config/claude-secrets/**, ~/.claude*/.credentials.json,
    claude-home/.credentials.json, ~/.codex/auth.json, ~/.config/mcp/secrets.env,
    ~/.nycode/agent/auth.json e mcp-auth.json, e em qualquer lugar .env e .env.<qualquer> (G7, 2026-11-19; só .example, .sample,
    .template e .dist passam). Só a ferramenta read: `cat` via bash não é coberto (rules/safety.md).
  Auditoria 2026-11-19 (docs/audit-2026-11-19/02-seguranca-performance.md, D1-D10): o comando interno de `bash -c`,
    eval, ( ), { }, $( ), crase, <( ), env -S, xargs, find -exec e do corpo de if/while/for/case é reanalisado
    (profundidade <= 5, senão ask) com a decisão que teria escrito direto; wrappers consomem o valor das próprias
    opções; palavra de comando vinda de expansão ($X, $IFS) é ask (deny se `rm` com esses argumentos seria deny);
    baixar-e-executar (curl|wget|base64 -d|xxd -r|openssl enc -d ligado a interpretador) é deny; heredoc só é
    mascarado fora de aspas; opções longas do rm casam por prefixo; escrita em /dev/* fora de null, zero, full,
    stdout, stderr, stdin, tty, fd, pts e shm é deny; leitura nega também credenciais de nuvem/git/npm e usa realpath;
    a ferramenta Grep passa pelo guard (negada em segredo, em diretório que guarda segredo, em $HOME e em /).
    Comando acima de 256 KB vira ask (nunca allow sem análise).
  Limite conhecido (lista não resolve): baixar para arquivo e executar depois, script escrito pelo próprio agente,
    alias em arquivo de configuração; a resposta é sandbox de SO.
  Resto: allow.

Bypass (igual ao "Bypass Permissions" do Claude Code): NYCODE_BYPASS_PERMISSIONS=1 transforma
todo ASK em allow; DENY continua. O wrapper bin/nycode inicia com NYCODE_BYPASS_PERMISSIONS=0.
`nycode --bypass` liga; `nycode --safe` ou /bypass desliga. Na sessão: /bypass ou Ctrl+Shift+B
(~/.nycode/agent/extensions/bypass-permissions/index.ts); independe do modo (Ask, Auto, Plan).

Ajustar: edite as listas/funções abaixo e rode `python3 -m unittest -v test_guard` aqui.
Desligar tudo: remova o bloco "hooks" de ~/.nycode/agent/settings.json.
Falha interna (JSON inválido, exceção, módulo ausente): bloqueia com exit 2 e escreve o motivo no stderr; saída de
emergência NYCODE_GUARD_FAIL_OPEN=1 no ambiente de quem lança o nycode.
"""

from __future__ import annotations

import json
import os
import re
import sys

TYPE_CHECKING = False  # `from typing import TYPE_CHECKING` custa ~1 ms de import em toda chamada do hook
if TYPE_CHECKING:
    from typing import Any

# realpath: a instalação viva liga cada arquivo por symlink; os módulos irmãos vêm do diretório real do guard (a mesma
# versão do guard.py), nunca de um permissions/ vivo com links faltando (ModuleNotFoundError = hook não bloqueante).
sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))

try:
    from diag import relatar
except Exception:  # noqa: BLE001 - o diagnóstico nunca pode quebrar o hook
    relatar = lambda *a, **k: None


def falha_interna(e: BaseException, tb: str) -> int:
    """Erro do próprio guard: bloqueia (exit 2), porque exit 1 é erro não bloqueante no Claude Code e no nycode e a tool
    rodaria sem guarda (OWASP AI Agent Security: "fail closed when ... policy lookup ... fails"). Saída de emergência
    só pelo ambiente de quem lança o nycode: NYCODE_GUARD_FAIL_OPEN=1 (o agente não altera o ambiente do hook)."""
    if os.environ.get("NYCODE_GUARD_FAIL_OPEN") == "1":
        msg = f"guard.py: erro interno, permitindo (NYCODE_GUARD_FAIL_OPEN=1): {e!r}"
    else:
        msg = (
            f"guard.py: erro interno, bloqueando: {e!r}. Conserte fora do agente (veja o erro com "
            f"`python3 {os.path.realpath(__file__)} </dev/null`) ou relance com NYCODE_GUARD_FAIL_OPEN=1 nycode"
        )
    print(msg, file=sys.stderr)
    relatar(17, "guard", "erro-interno", msg, tb)
    return 0 if os.environ.get("NYCODE_GUARD_FAIL_OPEN") == "1" else 2


try:  # módulo ausente ou quebrado (instalação incompleta) também fecha
    from permissions.parse import (
        FETCH_SUBST,
        MAX_CMD,
        PLAIN_SUBST,
        SHELLS,
        extract_substitutions,
        fetch_tag,
        fetches,
        fork_bomb,
        is_interpreter,
        join_continuations,
        long_opt,
        mask_heredocs,
        reads_stdin,
        segments,
        short_flags,
        strip_prefixes,
        tokenize,
    )
    from permissions.rules import (
        PGREP_VALUE_OPTS,  # noqa: F401 - reexportado: testes e consumidores antigos
        PROTECTED_BRANCHES,  # noqa: F401 - reexportado: testes e consumidores antigos
        SELF_KILL_MSG,
        check_git,
        check_grep,
        check_read,
        check_self_kill,
        dev_blocked,
        full_match_pattern,
        inside,
        matches_self,
        pkill_self_match,
    )
except Exception as _e:  # noqa: BLE001 - qualquer falha de import do guard bloqueia
    import traceback

    sys.exit(falha_interna(_e, traceback.format_exc()))

HOME = os.path.expanduser("~")
# Above MAX_DEPTH: ask, but the analysis goes on (a deny still wins) up to HARD_DEPTH.
MAX_DEPTH = 3
HEREDOC_MARK_RE = re.compile(r"<<-?[ \t]*['\"]?\w+['\"]?")
SSH_AGENT_EVAL_RE = re.compile(
    r'(?:^|[;&|]\s*)eval\s+"?(?:\$\(ssh-agent(?: -s)?\)|`ssh-agent(?: -s)?`)"?\s*(?:$|[;&|])'
)
HARD_DEPTH = 24
POWER_CMDS = {"shutdown", "reboot", "poweroff", "halt"}
SYSTEMCTL_POWER = {"poweroff", "reboot", "halt", "kexec"}
CATASTROPHIC_RM = {
    "",
    "~",
    "$HOME",
    "${HOME}",
    HOME,
    "/home",
    "/usr",
    "/etc",
    "/bin",
    "/sbin",
    "/lib",
    "/lib64",
    "/boot",
    "/var",
    "/opt",
    "/root",
    "/srv",
}
SFDISK_READ_FLAGS = {
    "-l",
    "--list",
    "-s",
    "--show-size",
    "-d",
    "--dump",
    "-J",
    "--json",
    "-F",
    "--list-free",
    "-V",
    "--verify",
    "-h",
    "--help",
}
FIND_EXEC = {"-exec", "-execdir", "-ok", "-okdir"}
XARGS_VALUE_OPTS = {
    "-I",
    "-L",
    "-n",
    "-P",
    "-s",
    "-d",
    "-E",
    "-a",
    "--max-args",
    "--max-lines",
    "--max-procs",
    "--max-chars",
    "--delimiter",
    "--arg-file",
    "--process-slot-var",
}
EXPANSION_WORD_RE = re.compile(
    r"^(\$\w+|\$\{[^}]*\}|__SUBST__|__FETCHSUBST__)$"
)  # palavra de comando que é expansão
IFS_RE = re.compile(r"\$\{IFS[^}]*\}|\$IFS\b")
SHELL_C_RE = re.compile(r"^[-+][A-Za-z]*c[A-Za-z]*$")

Finding = tuple[str, str]

SENSITIVE_DIRS = [
    os.path.join(HOME, d)
    for d in (".ssh", ".aws", ".gnupg", ".config/gh", ".kube", ".docker")
]
SENSITIVE_FILES = {
    os.path.join(HOME, p)
    for p in (
        ".nycode/agent/settings.json",
        ".nycode/agent/auth.json",
        ".local/bin/nycode",
        ".zshrc",
        ".zshenv",
        ".zprofile",
        ".bashrc",
        ".bash_profile",
        ".profile",
        ".netrc",
        ".npmrc",
        ".git-credentials",
    )
}
ENV_SAFE_SUFFIXES = (".example", ".sample", ".template", ".dist")
# Segredos ao lado do agente: ask (o bypass ainda promove ask a allow).
ASK_WRITE_SUFFIXES = (
    "/.nycode/agent/local.env",
    "/.nycode/agent/mcp-auth.json",
    "/.nycode/agent/claude-home/settings.json",
)
# Auto-modificação do guard. Deny: o bypass não promove deny a allow.
PROTECTED_WRITE_SUFFIXES = ("/claude-home/hooks/guard.py",)


# ---------- regras bash ----------


def shell_script(args: list[str]) -> str | None:
    """Texto que um shell executa: o argumento de `-c` (inclusive `-lc`) ou a here-string (`<<< texto`).
    `-o`/`+o` consomem a opção seguinte (`bash -c -o errexit SCRIPT`)."""
    if "<<<" in args:
        k = args.index("<<<")
        return args[k + 1] if k + 1 < len(args) else None
    for k, a in enumerate(args):
        if not SHELL_C_RE.match(a):
            continue
        i = k + 1
        while i < len(args):
            b = args[i]
            if b in ("-o", "+o") and i + 1 < len(args):
                i += 2
                continue
            if re.fullmatch(
                r"[-+][\w=-]*", b
            ):  # only option-shaped words; `+ ; x` is text, judged as a script
                i += 1
                continue
            return b
        return None
    return None


def xargs_command(args: list[str]) -> list[str]:
    i = 0
    while i < len(args) and args[i].startswith("-"):
        a = args[i]
        i += 1
        if a == "--":
            break
        if a in XARGS_VALUE_OPTS and i < len(args):
            i += 1
    return args[i:]


def exec_findings(tokens: list[str], cmd: str, depth: int) -> list[Finding]:
    """Comando de `find -exec|-execdir|-ok|-okdir CMD {} ;|+`."""
    cmdv: list[str] = []
    for k, t in enumerate(tokens):
        if t in FIND_EXEC or t == ";" or (t == "+" and k > 0 and tokens[k - 1] == "{}"):
            break
        cmdv.append(t)
    return check_segment(cmdv, False, set(), cmd, depth)[0] if cmdv else []


def check_find(args: list[str], cmd: str, depth: int) -> list[Finding]:
    found: list[Finding] = []
    roots = []
    for a in args:
        if a.startswith("-") or a in ("(", "!"):
            break
        roots.append(a)
    if "-delete" in args and any(catastrophic_rm_target(r) for r in roots):
        found.append(("deny", "find -delete em diretório raiz, home ou sistema"))
    for k, a in enumerate(args):
        if a in FIND_EXEC:
            found.extend(exec_findings(args[k + 1 :], cmd, depth))
    return found


def check_indirection(
    name: str, args: list[str], cmd: str, depth: int
) -> list[Finding]:
    """D1/D2/D4: o comando interno de shell -c, eval, xargs e find -exec recebe a decisão que teria direto."""
    found: list[Finding] = []
    pos = [a for a in args if not a.startswith("-")]
    if name in SHELLS:
        script = shell_script(args)
        if script is not None:
            found.extend(check_bash(script, depth=depth + 1, top=cmd))
            if (
                "<<" in script
            ):  # as the core: a heredoc inside a `-c` script is judged as commands too
                found.extend(
                    check_bash(
                        HEREDOC_MARK_RE.sub("", script), depth=depth + 1, top=cmd
                    )
                )
    elif name == "eval":
        # Explicit, tested exception (as in the core): the standard ssh-agent bootstrap. Its substitution is still
        # analysed by the caller; any other eval argument goes through the re-analysis.
        if not (args == ["__SUBST__"] and SSH_AGENT_EVAL_RE.search(cmd)):
            found.extend(check_bash(" ".join(args), depth=depth + 1, top=cmd))
            if any(PLAIN_SUBST in a for a in args):
                found.append(("ask", "eval de texto montado por substituição"))
    elif name == "xargs":
        inner = xargs_command(args)
        if inner:
            found.extend(check_segment(inner, False, set(), cmd, depth)[0])
    elif name == "find":
        found.extend(check_find(args, cmd, depth))
    runs_text = (is_interpreter(name) and bool(pos) and FETCH_SUBST in pos[0]) or (
        name in ("eval", "source", ".") and any(FETCH_SUBST in a for a in args)
    )
    if runs_text:
        found.append(
            (
                "deny",
                "executa texto baixado ou decodificado (curl/wget/base64 -d via $( ) ou <( ))",
            )
        )
    return found


def check_segment(
    argv: list[str], piped: bool, prev_names: set[str], cmd: str = "", depth: int = 0
) -> tuple[list[Finding], str | None]:
    """Retorna lista de (nivel, motivo) para um segmento. `cmd` é a linha inteira do shell (auto-kill casa com ela)."""
    found: list[Finding] = []
    real, priv = strip_prefixes(argv)
    if priv:
        found.append(("ask", "comando com privilégio (sudo/su/doas)"))
    if not real:
        return found, None
    if real[0] in FIND_EXEC:  # continuação de `find ... -exec CMD \; -exec CMD2 \;`
        return found + exec_findings(real[1:], cmd, depth), None
    if EXPANSION_WORD_RE.match(real[0]):
        # D3: o comando vem de uma expansão; vale o pior caso `rm` com esses argumentos, senão ask
        found.extend(
            f
            for f in check_segment(["rm", *real[1:]], False, set(), cmd, depth)[0]
            if f[0] == "deny"
        )
        found.append(("ask", "palavra de comando vem de expansão ($VAR, $( ), $IFS)"))
        return found, None
    name = os.path.basename(real[0])
    args = real[1:]
    flags = short_flags(args)
    positional = [a for a in args if not a.startswith("-")]

    if (
        piped
        and "<fetch>" in prev_names
        and (name in SHELLS or (is_interpreter(name) and reads_stdin(args)))
    ):
        found.append(("deny", "download com pipe direto para shell"))
    if fetch_tag(real):
        prev_names.add("<fetch>")
    found.extend(check_indirection(name, args, cmd, depth))

    for i, t in enumerate(argv):
        if (
            t in (">", ">>", ">|", "&>", ">&", "&>>")
            and i + 1 < len(argv)
            and dev_blocked(argv[i + 1])
        ):
            found.append(
                (
                    "deny",
                    f"escrita direta em disco {argv[i + 1]}",
                )
            )

    if name == "rm":
        rec = bool(flags & {"-r", "-R"}) or long_opt(flags, "--recursive")
        force = "-f" in flags or long_opt(flags, "--force")
        if rec and force:
            found.append(("deny", "rm recursivo forçado"))
        elif rec:
            found.append(("ask", "rm recursivo"))
        if rec and any(catastrophic_rm_target(a) for a in positional):
            found.append(("deny", "rm recursivo em diretório raiz, home ou sistema"))
    elif name.startswith("mkfs"):
        found.append(("deny", "formatação de sistema de arquivos"))
    elif name == "dd" and any(a.startswith("of=") and dev_blocked(a[3:]) for a in args):
        found.append(("deny", "dd escrevendo em dispositivo"))
    elif name == "tee" and any(dev_blocked(a) for a in positional):
        found.append(("deny", "tee escrevendo em dispositivo de bloco"))
    elif name in ("cp", "mv") and (
        (positional and dev_blocked(positional[-1]))
        or any(dev_blocked(t) for t in target_dirs(args))
    ):
        found.append(("deny", f"{name} escrevendo em dispositivo de bloco"))
    elif name == "wipefs" and flags & {"-a", "--all", "-o", "--offset"}:
        found.append(("deny", "wipefs apagando assinaturas"))
    elif name == "cryptsetup" and set(positional) & {
        "luksFormat",
        "erase",
        "luksErase",
    }:
        found.append(("deny", "cryptsetup destruindo cabeçalho LUKS"))
    elif name == "blkdiscard":
        found.append(("deny", "blkdiscard apaga o dispositivo"))
    elif name == "sgdisk" and flags & {"-Z", "-z", "--zap-all", "--zap"}:
        found.append(("deny", "sgdisk apagando tabela de partições"))
    elif name == "parted" and {"mklabel", "mktable"} & set(positional):
        found.append(("deny", "parted mklabel apaga a tabela de partições"))
    elif (
        name == "sfdisk"
        and any(a.startswith("/dev/") for a in positional)
        and not flags & SFDISK_READ_FLAGS
    ):
        found.append(("deny", "sfdisk reescrevendo tabela de partições"))
    elif name in POWER_CMDS and "-c" not in flags:
        found.append(("deny", f"{name} desliga/reinicia a máquina"))
    elif name == "systemctl" and set(positional) & SYSTEMCTL_POWER:
        found.append(("deny", "systemctl desliga/reinicia a máquina"))
    elif name in ("init", "telinit") and positional[:1] and positional[0] in ("0", "6"):
        found.append(("deny", f"{name} desliga/reinicia a máquina"))
    elif name in ("chmod", "chown", "chgrp"):
        rec = bool(flags & {"-R", "--recursive"})
        if rec and any(norm_path(a) == "/" for a in positional):
            found.append(("deny", f"{name} recursivo na raiz"))
        elif rec:
            found.append(("ask", f"{name} recursivo"))
    elif name == "shred":
        found.append(("ask", "shred"))
    elif name in ("kill", "pkill", "killall"):
        if any(a in ("-9", "-KILL", "-SIGKILL") for a in args) or (
            "-s" in args and any(a in ("KILL", "9") for a in args)
        ):
            found.append(("ask", "kill -9"))
        if name == "kill" and kill_targets(args) & {"-1", "1"}:
            found.append(("deny", "kill em todos os processos ou no PID 1"))
        pattern = full_match_pattern(args) if name == "pkill" else None
        if pattern and matches_self(pattern, cmd):
            found.append(("deny", SELF_KILL_MSG.format("pkill")))
    elif name in ("docker", "podman"):
        if any(a in ("rm", "rmi", "prune") for a in args):
            found.append(("ask", f"{name} removendo recursos"))
    elif name in ("npm", "pnpm", "yarn", "bun") and "publish" in positional:
        found.append(("ask", f"{name} publish"))
    elif name == "git":
        found.extend(check_git(args, _CWD[0]))
    return found, name


def norm_path(p: str) -> str:
    """Normaliza caminho absoluto (`//dev/./sda` -> `/dev/sda`); outros ficam como estão."""
    return re.sub(r"^/+", "/", os.path.normpath(p)) if p.startswith("/") else p


def target_dirs(args: list[str]) -> list[str]:
    """Valores de -t / --target-directory (cp, mv)."""
    out = []
    for i, a in enumerate(args):
        if a.startswith("--target-directory="):
            out.append(a.split("=", 1)[1])
        elif a in ("-t", "--target-directory") and i + 1 < len(args):
            out.append(args[i + 1])
    return out


def catastrophic_rm_target(t: str) -> bool:
    if not t or t[0] not in "/~$":
        return False
    t = norm_path(t)
    return re.sub(r"(/\*?)+$", "", t) in CATASTROPHIC_RM


def kill_targets(args: list[str]) -> set[str]:
    """Alvos de `kill` sem a especificação de sinal (-9, -KILL, -s X, -n X, --)."""
    i = 0
    if args and args[0] in ("-s", "-n", "--signal"):
        i = 2
    elif args and args[0].startswith("-") and args[0] != "--":
        i = 1
    if i < len(args) and args[i] == "--":
        i += 1
    return set(args[i:])


def check_bash(
    cmd: str, cwd: str = "", depth: int = 0, top: str | None = None
) -> list[Finding]:
    if cwd:
        _CWD[0] = cwd
    top = cmd if top is None else top
    if depth > HARD_DEPTH:
        return [("ask", f"shell aninhado além de {MAX_DEPTH} níveis")]
    if len(cmd) > MAX_CMD:
        return [("ask", f"comando maior que {MAX_CMD // 1024} KB: não analisado")]
    found: list[Finding] = (
        [("ask", f"shell aninhado além de {MAX_DEPTH} níveis")]
        if depth > MAX_DEPTH
        else []
    )
    text = mask_heredocs(
        join_continuations(cmd)
    )  # \\\n fora de aspas simples; corpo de heredoc não-shell é texto
    if fork_bomb(text):
        found.append(("deny", "fork bomb"))
    found.extend(check_self_kill(cmd, top))
    if IFS_RE.search(text):
        found.append(("ask", "uso de $IFS: o comando pode se montar na execução"))
        text = IFS_RE.sub(" ", text)  # reavalia com o IFS trocado por espaço
    text, inners = extract_substitutions(text, fetches)
    for inner in inners:
        found.extend(check_bash(inner, depth=depth + 1, top=top))
        # A heredoc whose terminator line carries the closing `)` is not terminated for the shell: its body is
        # not data. The outer pass left it unmasked, so judge the inner text with the heredoc markers dropped.
        if "<<" in inner and mask_heredocs(text) == text:
            found.extend(
                check_bash(HEREDOC_MARK_RE.sub("", inner), depth=depth + 1, top=top)
            )
    found.extend(pkill_self_match(tokenize(text), top))
    prev_names: set[str] = set()
    for argv, piped in segments(tokenize(text)):
        if not piped:
            prev_names = set()
        f, name = check_segment(argv, piped, prev_names, top, depth)
        found.extend(f)
        if name:
            prev_names.add(name)
    return found


# ---------- regras de arquivo ----------


def _sensitive_file(path: str) -> tuple[str, str] | None:
    base = os.path.basename(path)
    if path.endswith(PROTECTED_WRITE_SUFFIXES):
        return "deny", f"escrita em arquivo protegido {path}"
    if path.endswith(ASK_WRITE_SUFFIXES):
        return "ask", f"arquivo sensível {path}"
    if (base == ".env" or base.startswith(".env.")) and not base.endswith(
        ENV_SAFE_SUFFIXES
    ):
        return "ask", f"arquivo de segredos {base}"
    if base.endswith((".pem", ".key", ".p12", ".pfx")) or re.match(
        r"^id_(rsa|ed25519|ecdsa|dsa)", base
    ):
        return "ask", f"chave/certificado {base}"
    if (
        base == "auth.json"
        or path in SENSITIVE_FILES
        or any(inside(path, d) for d in SENSITIVE_DIRS)
    ):
        return "ask", f"arquivo sensível {path}"
    return None


def check_file(path: str, cwd: str, project: str) -> list[Finding]:
    if not path:
        return []
    import tempfile  # só Edit/Write chegam aqui; importar no topo custa ~10 ms em toda chamada

    raw = (
        path
        if os.path.isabs(path) or path.startswith("~")
        else os.path.join(cwd or os.getcwd(), path)
    )
    p = os.path.abspath(os.path.expanduser(raw))
    real = os.path.realpath(p)
    candidates = [p] if real == p else [p, real]
    hits = [hit for c in candidates if (hit := _sensitive_file(c))]
    if hits:
        level = "deny" if any(lvl == "deny" for lvl, _ in hits) else "ask"
        return [(level, hits[0][1])]
    tmp_roots = {"/tmp", tempfile.gettempdir(), "/var/tmp"}
    if all(any(inside(c, r) for r in tmp_roots) for c in candidates):
        return []
    if not (inside(p, project) or inside(p, cwd)):
        return [("ask", f"fora do projeto: {p}")]
    return []


# ---------- main ----------


_CWD = [
    ""
]  # cwd of the call being judged (one call per process): git push reads the branch from it


def decide(payload: dict[str, Any]) -> tuple[str, str] | None:
    tool = payload.get("tool_name", "")
    ti = payload.get("tool_input") or {}
    cwd = payload.get("cwd") or os.getcwd()
    _CWD[0] = os.path.abspath(cwd)
    project = os.environ.get("CLAUDE_PROJECT_DIR") or cwd
    if tool == "Bash":
        found = check_bash(ti.get("command") or "")
    elif tool in ("Edit", "Write", "MultiEdit"):
        found = check_file(
            ti.get("file_path") or "", os.path.abspath(cwd), os.path.abspath(project)
        )
    elif tool == "Read":
        found = check_read(ti.get("file_path") or "", os.path.abspath(cwd))
    elif (
        tool == "Grep"
    ):  # o nycode reporta o grep do nycode como "Grep", com `path` absoluto ou ausente
        found = check_grep(ti.get("path"), os.path.abspath(cwd))
    elif tool == "run":
        action = ti.get("action")
        if action == "start":
            found = check_bash(ti.get("command") or "")
        elif action in ("list", "tail", "stop", "wait"):
            found = []
        else:
            return ("deny", "ação desconhecida da tool run")
    else:
        return None
    denies = [r for lvl, r in found if lvl == "deny"]
    if denies:
        return "deny", "Bloqueado pelo guard: " + "; ".join(dict.fromkeys(denies))
    asks = [r for lvl, r in found if lvl == "ask"]
    if os.environ.get("NYCODE_PERMISSION_MODE", "").strip():
        return decide_with_mode(
            tool, ti, os.path.abspath(cwd), os.path.abspath(project), asks
        )
    if asks:
        if os.environ.get("NYCODE_BYPASS_PERMISSIONS", "").lower() in (
            "1",
            "true",
            "on",
            "yes",
        ):
            return None
        return "ask", "Confirmação necessária: " + "; ".join(dict.fromkeys(asks))
    return None


def decide_with_mode(
    tool: str, ti: dict[str, Any], cwd: str, project: str, asks: list[str]
) -> tuple[str, str] | None:
    """Modos locais (NYCODE_PERMISSION_MODE definido): permissions/ decide DEPOIS dos denies legados.
    Falha do código novo (import, bug) é ASK, nunca allow; o ramo sem modo não passa por aqui."""
    try:
        from permissions import modes
        from permissions.decide import decide_mode

        def read_denied(p: str) -> bool:
            return bool(check_read(p, cwd))

        mode = modes.current_mode(os.environ)
        result: tuple[str, str] | None = decide_mode(
            mode, tool, ti, cwd, project, asks, read_denied, os.environ
        )
        return result
    except Exception as e:  # noqa: BLE001 - falha do código novo é ASK, nunca allow
        import traceback

        msg = f"guard.py: erro no modo de permissão, pedindo confirmação: {e!r}"
        print(msg, file=sys.stderr)
        relatar(17, "guard", "erro-interno", msg, traceback.format_exc())
        return (
            "ask",
            f"Confirmação necessária: erro interno no modo de permissão ({type(e).__name__})",
        )


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        result = decide(payload) if isinstance(payload, dict) else None
    except Exception as e:  # noqa: BLE001 - bug do guard fecha (falha_interna)
        import traceback

        return falha_interna(e, traceback.format_exc())
    if result:
        decision, reason = result
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": decision,
                        "permissionDecisionReason": reason,
                    }
                }
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
