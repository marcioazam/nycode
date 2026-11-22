"""nycode-session: opt-in de sessão destacável em tmux privado. start [-- args...] | list | attach <hex32>."""
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import transport_state as st  # noqa: E402
import transport_tmux as tx  # noqa: E402

C = st.C
HERE = os.path.dirname(os.path.realpath(__file__))
USAGE = "uso: nycode-session start [-- <argumentos do nycode>] | list | attach <id>"

# The same rule as core/lifecycle/supervisor.ts (isHeadless); test_cli.py compares the two lists.
HEADLESS_FLAGS = ("-p", "--print", "--mode", "--export", "--list-models", "-h", "--help", "-v", "--version")
HEADLESS_PREFIXES = ("--mode=", "--export=", "--list-models=")


def err(msg):
    print(f"nycode-session: {msg}", file=sys.stderr)
    return 1


def resolve_launcher(env=None):
    """The nycode that supervises itself: the override, else the first `nycode` of the PATH."""
    env = os.environ if env is None else env
    override = env.get(C["launcherEnv"])
    candidate = override or shutil.which("nycode", path=env.get("PATH"))
    if candidate and os.path.isabs(candidate):
        real = os.path.realpath(candidate)
        if os.path.isfile(real) and os.access(real, os.X_OK):
            return real
    raise st.TransportError("nycode não encontrado (defina NYCODE_SESSION_LAUNCHER)")


def headless(args, is_tty=None):
    """Same rule as the native supervisor: print, rpc/json, export, help and version runs are headless; so is no TTY."""
    tty = (os.isatty(0) and os.isatty(1)) if is_tty is None else is_tty
    if not tty:
        return True
    for a in args:
        if a == "--":
            return False
        if a in HEADLESS_FLAGS or a.startswith(HEADLESS_PREFIXES):
            return True
    return False


def passthrough(launcher, args):
    os.execv(launcher, [launcher, *args])


def finish(tmux_bin, rdir, tid, client_rc):
    rec = st.read_record(rdir, tid)
    if rec and rec["state"] == "ended":
        return rec["exitCode"]
    if rec and rec["state"] == "running" and client_rc == 0 and tx.alive(tmux_bin, rec):
        print(f"nycode-session: desanexado; reanexe com: nycode-session attach {tid}", file=sys.stderr)
        return 0
    return err(f"transporte {tid} em estado inconsistente (cliente rc={client_rc}); nada foi relançado")


def attach_flow(tmux_bin, rdir, tid, rec):
    got = []

    def done(rc):
        got.append(finish(tmux_bin, rdir, tid, rc))
        return rc
    try:
        rc = tx.attach(tmux_bin, rdir, rec, on_exit=done)
    except (st.TransportError, OSError, subprocess.SubprocessError) as e:
        return err(f"attach recusado: {e}; sessão {tid} segue viva")
    return got[0] if got else finish(tmux_bin, rdir, tid, rc)


def find_tmux():
    t = shutil.which("tmux")
    if not t:
        raise st.TransportError("tmux não encontrado (opt-in exige tmux; nada é instalado)")
    return os.path.realpath(t)


def cmd_start(args, env=None):
    env = os.environ if env is None else env
    if args and args[0] != "--":
        return err(USAGE)
    args = args[1:]
    try:
        launcher = resolve_launcher(env)
        if env.get("NYCODE_SUBAGENT") == "1" or headless(args):
            passthrough(launcher, args)
        tmux_bin = find_tmux()
        payload = json.dumps({"argv": [launcher, *args]}).encode()
        if len(payload) > C["bootMaxBytes"]:
            return err("argumentos acima de 1 MiB")
        root = st.root_dir(st.agent_dir(env))
        tid, rdir = st.allocate(root)
        sock = st.socket_path(rdir)
    except (st.TransportError, OSError) as e:
        return err(str(e))
    committed = False  # handoff sinalizado: o Pi pode já estar rodando; dali em diante nada é morto nem apagado
    try:
        tx.start_server(tx.server_args(tmux_bin, sock, tid, rdir, HERE))
        tx.handoff(tmux_bin, sock, payload)
        committed = True
        rec = tx.wait_running(rdir, tid)
    except (st.TransportError, OSError, subprocess.SubprocessError) as e:
        if committed:
            return err(f"handoff concluído, mas o estado não confirmou: {e}; transporte {tid} mantido, "
                       f"verifique com: nycode-session list / nycode-session attach {tid}; nada foi relançado")
        tx.kill_own(tmux_bin, sock)
        try:
            st.remove_own(rdir)
        except (st.TransportError, OSError):
            pass
        return err(f"início falhou antes do handoff: {e}")
    payload = None
    if rec["state"] == "ended":  # saiu antes do attach; 70/127 = falha de handoff/spawn do bootstrap
        if rec["exitCode"] in (70, 127):
            err(f"transporte {tid} terminou com {rec['exitCode']} (possível falha de handoff/spawn)")
        return rec["exitCode"]
    return attach_flow(tmux_bin, rdir, tid, rec)


def cmd_attach(tid, env=None):
    try:
        tmux_bin = find_tmux()
        rdir = st.run_dir(st.root_dir(st.agent_dir(env), create=False), tid)
    except (st.TransportError, OSError) as e:
        return err(str(e))
    rec = st.read_record(rdir, tid)
    if rec is None:
        return err("registro ausente ou incompatível")
    if rec["state"] == "ended" or not tx.alive(tmux_bin, rec):
        return err("transporte encerrado ou obsoleto")
    return attach_flow(tmux_bin, rdir, tid, rec)


def cmd_list(env=None):
    try:
        tmux_bin = find_tmux()
        root = st.root_dir(st.agent_dir(env), create=False)
        for tid in st.entries(root):
            rec = st.read_record(os.path.join(root, tid), tid)
            if rec is None:
                print(f"{tid} invalid")
            elif rec["state"] == "ended":
                print(f"{tid} ended exit={rec['exitCode']}")
            else:
                print(f"{tid} {rec['state']} {'live' if tx.alive(tmux_bin, rec) else 'stale'}")
    except st.TransportError as e:
        return err(str(e))
    return 0


def main(argv, env=None):
    if argv and argv[0] == "start":
        return cmd_start(argv[1:], env)
    if argv == ["list"]:
        return cmd_list(env)
    if len(argv) == 2 and argv[0] == "attach":
        return cmd_attach(argv[1], env)
    return err(USAGE)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
