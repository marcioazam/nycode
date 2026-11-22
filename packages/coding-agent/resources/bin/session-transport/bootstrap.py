"""Bootstrap fino dentro do pane tmux: dono do wait/exit code. Uso: bootstrap.py <id> <runDir>.

Argumentos do usuário chegam só pelo buffer tmux nativo (nunca argv/arquivo/log). O supervisor existente continua
dono de restart; aqui só se espera o launcher e se grava o código de saída."""
import json
import os
import signal
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import transport_state as st  # noqa: E402

C = st.C
FAIL = 70  # falha de handoff/spawn (EX_SOFTWARE)


def tmux(sock, *args, **kw):
    return subprocess.run([kw.pop("tmux_bin", "tmux"), "-S", sock, "-f", "/dev/null", *args], **kw)


def end_record(rdir, tid, code, base):
    """Lê o registro FRESCO (a raiz pode ter atualizado a identidade) e grava ended; sem sobrescrever identidade."""
    rec = st.read_record(rdir, tid) or base
    rec = dict(rec, state="ended", exitCode=code)
    try:
        st.write_record(rdir, tid, rec)
    except (st.TransportError, OSError):
        pass


def handoff(sock, tmux_bin):
    """Espera o canal, captura o buffer em memória e o remove na hora. Retorna dict ou None."""
    try:
        w = tmux(sock, "wait-for", C["channelName"], tmux_bin=tmux_bin, timeout=C["bootTimeoutSeconds"],
                 stdin=subprocess.DEVNULL, capture_output=True)
        if w.returncode != 0:
            return None
        p = tmux(sock, "save-buffer", "-b", C["bufferName"], "-", tmux_bin=tmux_bin,
                 timeout=C["controlTimeoutSeconds"], stdin=subprocess.DEVNULL, capture_output=True)
        tmux(sock, "delete-buffer", "-b", C["bufferName"], tmux_bin=tmux_bin,
             timeout=C["controlTimeoutSeconds"], stdin=subprocess.DEVNULL, capture_output=True)
    except (subprocess.SubprocessError, OSError):
        return None
    if p.returncode != 0 or len(p.stdout) > C["bootMaxBytes"]:
        return None
    try:
        data = json.loads(p.stdout.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    argv = data.get("argv") if isinstance(data, dict) else None
    if not isinstance(argv, list) or not argv or not all(isinstance(a, str) and "\x00" not in a for a in argv):
        return None
    return {"argv": argv}


def main(argv, env=None):
    env = dict(os.environ if env is None else env)
    if len(argv) != 2 or not st.valid_id(argv[0]):
        return FAIL
    tid, rdir = argv
    try:
        st.run_dir(os.path.dirname(rdir), tid)
    except st.TransportError:
        return FAIL
    sock = os.path.join(rdir, C["socketName"])
    pid = os.getpid()
    base = st.base_record(tid, rdir, env.get("TMUX_PANE"), pid, st.proc_birth(pid) or 0)
    try:
        st.write_record(rdir, tid, base)
    except (st.TransportError, OSError):
        return FAIL
    tmux_bin = env.get("NYCODE_SESSION_TMUX", "tmux")
    payload = handoff(sock, tmux_bin)
    if payload is None:
        end_record(rdir, tid, FAIL, base)
        return FAIL
    child_env = {k: v for k, v in env.items() if k not in ("NYCODE_SESSION_TMUX",)}
    child_env[C["markerEnv"]] = tid
    got = {"sig": 0, "child": None}

    def forward(signum, _frame):
        if got["sig"] == 0:  # no máximo uma vez, só ao filho próprio
            got["sig"] = signum
            if got["child"] is not None:
                try:
                    got["child"].send_signal(signum)
                except OSError:
                    pass

    signal.signal(signal.SIGINT, lambda *_: None)  # o grupo já recebe INT; handler (não SIG_IGN) não cruza o exec
    signal.signal(signal.SIGTERM, forward)
    signal.signal(signal.SIGHUP, forward)
    try:
        run = dict(base, state="running")
        st.write_record(rdir, tid, run)
        got["child"] = subprocess.Popen(payload["argv"], env=child_env)
    except (OSError, st.TransportError):
        end_record(rdir, tid, 127, base)
        return 127
    payload = None
    if got["sig"]:  # sinal chegou entre o spawn e a atribuição
        got["child"].send_signal(got["sig"])
    while True:
        try:
            rc = got["child"].wait()
            break
        except InterruptedError:
            continue
    code = 128 + got["sig"] if got["sig"] else (128 - rc if rc < 0 else rc)
    code = min(code, 255)
    end_record(rdir, tid, code, base)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
