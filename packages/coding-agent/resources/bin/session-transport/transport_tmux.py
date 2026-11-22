"""Controle do tmux privado: argv fixo e separado, deadline de controle, liveness e attach sem cliente concorrente."""

import fcntl
import os
import stat
import subprocess
import sys
import time
from typing import Any

import transport_state as st

C = st.C
SESSION = C["tmuxSession"]
SEP = ";"


def _env() -> Any:
    # TMUX/TMUX_PANE herdados nunca valem: só o socket -S privado.
    return {k: v for k, v in os.environ.items() if k not in ("TMUX", "TMUX_PANE")}


def ctl(
    tmux_bin: Any, sock: Any, *args: Any, data: Any = None, timeout: Any = None
) -> Any:
    return subprocess.run(
        [tmux_bin, "-S", sock, "-f", "/dev/null", *args],
        input=data,
        capture_output=True,
        env=_env(),
        timeout=timeout or C["controlTimeoutSeconds"],
        check=False,
    )


def terminal_size() -> Any:
    for fd in (1, 0, 2):
        try:
            s = os.get_terminal_size(fd)
            return max(s.columns, 2), max(s.lines, 2)
        except OSError:
            continue
    return 80, 24


def server_args(tmux_bin: Any, sock: Any, tid: Any, rdir: Any, code_dir: Any) -> Any:
    """Uma única invocação: opções (só neste servidor) antes da sessão, para valerem no primeiro pane."""
    cols, rows = terminal_size()
    opts = [
        ("-g", "prefix", "None"),
        ("-g", "prefix2", "None"),
        ("-g", "status", "off"),
        ("-g", "history-limit", str(C["historyLines"])),
        ("-g", "exit-unattached", "off"),
        ("-g", "exit-empty", "on"),
        ("-s", "extended-keys", "on"),
        ("-s", "extended-keys-format", "csi-u"),
        ("-s", "set-clipboard", "external"),
    ]
    argv = [tmux_bin, "-S", sock, "-f", "/dev/null", "start-server"]
    for flag, name, value in opts:
        argv += [SEP, "set-option", flag, name, value]
    argv += [
        SEP,
        "new-session",
        "-d",
        "-s",
        SESSION,
        "-x",
        str(cols),
        "-y",
        str(rows),
        sys.executable,
        os.path.join(code_dir, "bootstrap.py"),
        tid,
        rdir,
    ]
    return argv


def start_server(argv: Any) -> None:
    r = subprocess.run(
        argv,
        capture_output=True,
        env=_env(),
        timeout=C["controlTimeoutSeconds"],
        check=False,
    )
    if r.returncode != 0:
        raise st.TransportError("tmux privado não iniciou")


def handoff(tmux_bin: Any, sock: Any, payload: Any) -> None:
    """load-buffer por stdin (sem -w: não toca o clipboard) e sinal do canal; o bootstrap consome e apaga."""
    r = ctl(tmux_bin, sock, "load-buffer", "-b", C["bufferName"], "-", data=payload)
    if r.returncode != 0:
        raise st.TransportError("handoff falhou (buffer)")
    r = ctl(tmux_bin, sock, "wait-for", "-S", C["channelName"])
    if r.returncode != 0:
        ctl(tmux_bin, sock, "delete-buffer", "-b", C["bufferName"])
        raise st.TransportError("handoff falhou (sinal)")


def wait_running(rdir: Any, tid: Any) -> Any:
    deadline = time.monotonic() + C["bootTimeoutSeconds"]
    while time.monotonic() < deadline:
        rec = st.read_record(rdir, tid)
        if rec and rec["state"] in (
            "running",
            "ended",
        ):  # ended: saída rápida do launcher (ou falha 70/127)
            return rec
        time.sleep(0.05)
    raise st.TransportError("tempo esgotado no handoff")


def kill_own(tmux_bin: Any, sock: Any) -> None:
    """Só o servidor do socket privado deste transporte."""
    try:
        if os.path.exists(sock):
            ctl(tmux_bin, sock, "kill-server")
    except (subprocess.SubprocessError, OSError):
        pass


def alive(tmux_bin: Any, rec: Any) -> Any:
    """Liveness: socket próprio + pane/PID + birth-time; o arquivo sozinho não é autoridade."""
    try:
        s = os.lstat(rec["tmuxSocket"])
        if not stat.S_ISSOCK(s.st_mode) or s.st_uid != os.getuid():
            return False
        if st.proc_birth(rec["panePid"]) != rec["paneStart"]:
            return False
        r = ctl(
            tmux_bin,
            rec["tmuxSocket"],
            "list-panes",
            "-s",
            "-t",
            SESSION,
            "-F",
            "#{pane_id} #{pane_pid}",
        )
    except (OSError, subprocess.SubprocessError):
        return False
    want = f"{rec['paneId']} {rec['panePid']}"
    return r.returncode == 0 and want in r.stdout.decode(errors="replace").splitlines()


def client_count(tmux_bin: Any, sock: Any) -> Any:
    r = ctl(tmux_bin, sock, "list-clients", "-t", SESSION, "-F", "#{client_pid}")
    if r.returncode != 0:
        raise st.TransportError("não foi possível listar clientes")
    return len([x for x in r.stdout.decode().splitlines() if x.strip()])


def attach(tmux_bin: Any, rdir: Any, rec: Any, on_exit: Any = None) -> Any:
    """Lock privado não bloqueante + zero clientes; sem -d/-a/-P. Retorna o rc do cliente."""
    fd = os.open(
        os.path.join(rdir, C["attachLockName"]),
        os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW,
        0o600,
    )
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise st.TransportError("outro attach em andamento")
        if client_count(tmux_bin, rec["tmuxSocket"]) != 0:
            raise st.TransportError("já existe cliente anexado")
        rc = subprocess.run(
            [
                tmux_bin,
                "-S",
                rec["tmuxSocket"],
                "-f",
                "/dev/null",
                "attach-session",
                "-t",
                SESSION,
            ],
            env=_env(),
            check=False,
        ).returncode
        return (
            on_exit(rc) if on_exit else rc
        )  # on_exit roda ainda sob o lock: cleanup não apaga o exitCode antes da leitura
    finally:
        os.close(fd)
