"""Estado privado do transporte nycode-session: registro, ownership, limites, birth-time e limpeza (contract.json v1).

Metadados somente: nunca prompts, argv ou ambiente. Nada aqui executa dados lidos."""
import errno
import fcntl
import json
import os
import re
import socket
import stat
import tempfile
import time

HERE = os.path.dirname(os.path.realpath(__file__))
with open(os.path.join(HERE, "contract.json"), encoding="utf-8") as _f:
    C = json.load(_f)

ID_RE = re.compile(C["idPattern"])
FIELDS = tuple(C["recordFields"])
KNOWN_FILES = (C["recordName"], C["socketName"], C["attachLockName"])
ROOT_LOCK = ".alloc.lock"  # lock privado da raiz (não é entrada de transporte: ID_RE não casa)


class TransportError(Exception):
    pass


def valid_id(tid):
    """hex32 completo: fullmatch + tamanho (o `$` do regex aceitaria \n final com match)."""
    return isinstance(tid, str) and len(tid) == 32 and ID_RE.fullmatch(tid) is not None


def new_id():
    return os.urandom(16).hex()


def agent_dir(env=None):
    env = os.environ if env is None else env
    raw = env.get("NYCODE_CODING_AGENT_DIR") or os.path.join(env.get("HOME", ""), ".nycode", "agent")
    if not raw or not os.path.isabs(raw):
        raise TransportError("agentDir inválido")
    path = os.path.realpath(raw)
    st = os.stat(path) if os.path.isdir(path) else None
    if st is None or st.st_uid != os.getuid():
        raise TransportError("agentDir ausente ou de outro dono")
    return path


def _private_dir(path, create):
    try:
        st = os.lstat(path)
    except FileNotFoundError:
        if not create:
            raise TransportError("diretório de transporte ausente")
        os.mkdir(path, 0o700)
        st = os.lstat(path)
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != os.getuid() or stat.S_IMODE(st.st_mode) != 0o700:
        raise TransportError("diretório de transporte inseguro (dono, modo 0700 ou link)")
    return path


def root_dir(agent, create=True):
    return _private_dir(os.path.join(agent, C["directoryName"]), create)


def run_dir(root, tid, create=False):
    if not valid_id(tid):
        raise TransportError("ID inválido")
    return _private_dir(os.path.join(root, tid), create)


def socket_path(rdir):
    path = os.path.join(rdir, C["socketName"])
    if len(path.encode()) > 100:  # sun_path ~108
        raise TransportError("caminho do socket longo demais")
    return path


def proc_birth(pid):
    """Campo 22 de /proc/<pid>/stat (starttime); só metadados. None se o processo não existe/ilegível."""
    try:
        with open(f"/proc/{int(pid)}/stat", "rb") as f:
            data = f.read(4096).decode("ascii", "replace")
        return int(data[data.rindex(")") + 2:].split()[19])
    except (OSError, ValueError, IndexError):
        return None


def _num(v, minimum=0):
    return type(v) is int and v >= minimum


def _str(v, limit):
    return v is None or (isinstance(v, str) and len(v) <= limit and "\x00" not in v)


def validate(rec, tid, rdir):
    if not isinstance(rec, dict) or set(rec) != set(FIELDS):
        return False
    return (type(rec["v"]) is int and rec["v"] == C["version"] and rec["id"] == tid
            and type(rec["owner"]) is int and rec["owner"] == os.getuid()
            and rec["tmuxSocket"] == os.path.join(rdir, C["socketName"])
            and isinstance(rec["paneId"], str) and re.fullmatch(r"%[0-9]{1,9}", rec["paneId"]) is not None
            and _num(rec["panePid"], 1) and _num(rec["paneStart"], 1)
            and rec["state"] in C["states"]
            and (rec["rootPid"] is None or _num(rec["rootPid"], 1))
            and (rec["rootStart"] is None or _num(rec["rootStart"], 1))
            and _str(rec["sessionId"], 256) and _str(rec["sessionFile"], 4096)
            and (rec["sessionFile"] is None or os.path.isabs(rec["sessionFile"]))
            and (rec["exitCode"] is None or (_num(rec["exitCode"]) and rec["exitCode"] <= 255))
            and (rec["state"] == "ended") == (rec["exitCode"] is not None))


def read_record(rdir, tid):
    """Registro validado ou None (ausente, symlink, dono/modo, tamanho, JSON, schema)."""
    path = os.path.join(rdir, C["recordName"])
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        return None
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid() or stat.S_IMODE(st.st_mode) != 0o600 \
                or st.st_size > C["recordMaxBytes"]:
            return None
        raw = os.read(fd, C["recordMaxBytes"] + 1)
    finally:
        os.close(fd)
    if len(raw) > C["recordMaxBytes"]:
        return None
    try:
        rec = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    return rec if validate(rec, tid, rdir) else None


def write_record(rdir, tid, rec):
    """Escrita atômica 0600 (tmp no mesmo diretório + rename); valida antes de gravar."""
    if not validate(rec, tid, rdir):
        raise TransportError("registro inválido")
    data = json.dumps(rec, separators=(",", ":")).encode()
    if len(data) > C["recordMaxBytes"]:
        raise TransportError("registro acima do limite")
    fd, tmp = tempfile.mkstemp(prefix=".state-", dir=rdir)
    try:
        try:
            os.fchmod(fd, 0o600)
            view = memoryview(data)
            while view:
                view = view[os.write(fd, view):]
        finally:
            os.close(fd)
        os.replace(tmp, os.path.join(rdir, C["recordName"]))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def base_record(tid, rdir, pane_id, pane_pid, pane_start):
    return {"v": C["version"], "id": tid, "owner": os.getuid(), "tmuxSocket": os.path.join(rdir, C["socketName"]),
            "paneId": pane_id, "panePid": pane_pid, "paneStart": pane_start, "state": "starting",
            "rootPid": None, "rootStart": None, "sessionId": None, "sessionFile": None, "exitCode": None}


def entries(root):
    """IDs hex32 do diretório raiz em streaming (scandir); excesso falha explicitamente sem varrer tudo."""
    ids = []
    with os.scandir(root) as it:
        for e in it:
            if valid_id(e.name):
                ids.append(e.name)
                if len(ids) > C["runLimit"]:
                    raise TransportError(f"mais de {C['runLimit']} registros de transporte")
    return sorted(ids)


def remove_own(rdir):
    """Remove só artefatos conhecidos (regulares ou socket, sem symlink) e o diretório vazio; recusa conteúdo estranho."""
    names = os.listdir(rdir)
    for n in names:
        if n not in KNOWN_FILES and not (n.startswith(".state-") and not os.path.islink(os.path.join(rdir, n))):
            raise TransportError("conteúdo desconhecido; nada removido")
    for n in names:
        st = os.lstat(os.path.join(rdir, n))
        if stat.S_ISLNK(st.st_mode) or stat.S_ISDIR(st.st_mode) or st.st_uid != os.getuid():
            raise TransportError("artefato inseguro; nada removido")
    for n in names:
        os.unlink(os.path.join(rdir, n))
    os.rmdir(rdir)


def _socket_live(path):
    """True se algo aceita conexão no socket; ausente/recusado = morto. Nunca segue symlink."""
    try:
        if not stat.S_ISSOCK(os.lstat(path).st_mode):
            return True  # artefato estranho: não é prova de morte
    except FileNotFoundError:
        return False
    except OSError:
        return True
    c = socket.socket(socket.AF_UNIX)
    try:
        c.settimeout(0.5)
        c.connect(path)
        return True
    except (ConnectionRefusedError, FileNotFoundError):
        return False
    except OSError:
        return True
    finally:
        c.close()


def _open_lock(path, create):
    """Lock privado: regular, dono, 0600, sem symlink, sem bloquear em FIFO."""
    flags = os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK | (os.O_CREAT if create else 0)
    fd = os.open(path, flags, 0o600)
    try:
        s = os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_uid != os.getuid() or stat.S_IMODE(s.st_mode) != 0o600:
            raise TransportError("lock inseguro")
    except BaseException:
        os.close(fd)
        raise
    return fd


def _flock(fd, wait=0.0):
    deadline = time.monotonic() + wait
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except OSError as e:
            if e.errno not in (errno.EAGAIN, errno.EACCES):
                raise
            if time.monotonic() >= deadline:
                return False
            time.sleep(0.01)


def _removable(rdir, rec):
    """Encerrado de verdade: pane morto (PID/birth), socket sem ouvinte."""
    birth = proc_birth(rec["panePid"])
    if birth is not None and birth == rec["paneStart"]:
        return False
    return not _socket_live(os.path.join(rdir, C["socketName"]))


def cleanup_ended(root):
    """Remove transportes ENCERRADOS e mortos, sob o attach.lock próprio (não bloqueante); o resto fica intacto."""
    removed = 0
    for tid in entries(root):
        lock = None
        try:
            rdir = run_dir(root, tid)
            rec = read_record(rdir, tid)
            if not (rec and rec["state"] == "ended" and _removable(rdir, rec)):
                continue
            lock = _open_lock(os.path.join(rdir, C["attachLockName"]), create=True)
            if not _flock(lock):
                continue
            rec = read_record(rdir, tid)  # reconfere sob o lock
            if rec and rec["state"] == "ended" and _removable(rdir, rec):
                remove_own(rdir)
                removed += 1
        except (TransportError, OSError):
            continue
        finally:
            if lock is not None:
                os.close(lock)
    return removed


def allocate(root):
    """Vaga + criação atômicas sob o flock da raiz: (id, runDir). Limpa encerrados antes de falhar."""
    try:
        lock = _open_lock(os.path.join(root, ROOT_LOCK), create=True)
    except OSError:
        raise TransportError("lock da raiz inseguro ou inacessível")
    try:
        if not _flock(lock, wait=C["controlTimeoutSeconds"]):
            raise TransportError("raiz de transportes ocupada")
        if len(entries(root)) >= C["runLimit"]:
            cleanup_ended(root)
            if len(entries(root)) >= C["runLimit"]:
                raise TransportError(f"limite de {C['runLimit']} transportes atingido")
        tid = new_id()
        return tid, run_dir(root, tid, create=True)
    finally:
        os.close(lock)
