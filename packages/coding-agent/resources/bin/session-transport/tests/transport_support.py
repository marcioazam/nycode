"""Fixtures dos testes: HOME/agentDir temporários, env em whitelist, launcher fixture (o próprio nycode, que se supervisiona)."""

import importlib.util
import os
import shutil
import sys
import tempfile
import unittest
from typing import Any

# The private tmux socket path must fit sun_path (about 108 bytes): a runner's TMPDIR is often longer than that allows.
SHORT_TMP = "/tmp" if os.path.isdir("/tmp") else None
HERE = os.path.dirname(os.path.realpath(__file__))
CODE = os.path.dirname(HERE)
sys.path.insert(0, CODE)


def load(name: str, filename: str) -> Any:
    """A session-transport module loaded by path under a unique name (no clash with other tests' modules)."""
    spec = importlib.util.spec_from_file_location(name, os.path.join(CODE, filename))
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


st: Any = load("transport_state", "transport_state.py")
tx: Any = load("transport_tmux", "transport_tmux.py")
cli: Any = load("session_transport_cli", "cli.py")

__all__ = ["CODE", "DEAD", "Env", "cli", "load", "st", "tx", "write_exec"]

NATIVE = r"""#!/bin/sh
# CLI nativo fictício e absoluto: --exit N | --wait FILE (dorme até o arquivo existir, sai com 5) | --report FILE
rep=""
while [ $# -gt 0 ]; do
  case "$1" in
    --report) rep=$2; shift 2 ;;
    --exit) exit "$2" ;;
    --wait) printf '%s %s' "$$" "$NYCODE_SESSION_TRANSPORT_ID" > "$rep"
            i=0; while [ ! -e "$2" ] && [ $i -lt 300 ]; do sleep 0.1; i=$((i+1)); done; exit 5 ;;
    *) shift ;;
  esac
done
exit 0
"""


DEAD = {"panePid": 4194303, "paneStart": 1}  # PID inexistente: pane morto


def write_exec(path: Any, text: Any) -> None:
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, 0o755)


class Env(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.mkdtemp(prefix="pst-", dir=SHORT_TMP)
        os.chmod(self.tmp, 0o700)
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.home = os.path.join(self.tmp, "h")
        self.agent = os.path.join(self.home, ".nycode", "agent")
        os.makedirs(self.agent)
        self.native = os.path.join(self.tmp, "native-nycode")
        write_exec(self.native, NATIVE)
        self.launcher = self.native
        self.env = {
            "PATH": "/usr/bin:/bin",
            "HOME": self.home,
            "NYCODE_CODING_AGENT_DIR": self.agent,
            "NYCODE_SESSION_LAUNCHER": self.launcher,
            "TERM": "xterm",
            "LANG": "C.UTF-8",
            "TMPDIR": self.tmp,
        }
        # medição de cobertura (pycov) atravessa os subprocessos Python; ausente fora dela
        self.env.update(
            {
                k: os.environ[k]
                for k in ("PYCOV_DIR", "PYCOV_ROOTS", "PYTHONPATH")
                if k in os.environ
            }
        )

    def root(self) -> Any:
        return st.root_dir(self.agent)

    def make_run(
        self,
        tid: Any = None,
        state: Any = "running",
        exit_code: Any = None,
        **over: Any,
    ) -> Any:
        tid = tid or st.new_id()
        rdir = st.run_dir(self.root(), tid, create=True)
        rec = st.base_record(tid, rdir, "%0", os.getpid(), st.proc_birth(os.getpid()))
        rec.update(state=state, exitCode=exit_code, **over)
        st.write_record(rdir, tid, rec)
        return tid, rdir, rec
