# Achado 04 — `WriterLockCoordinator` e Compressão Zstd Transparente em Rollouts

- **Classificação**: **Classe A** (0 tokens extras, zero mudança no modelo/prompt/tool/loop, zero dependência nativa externa — Node 24 já traz `node:zlib` com `zstdCompressSync`/`zstdDecompressSync`).
- **Prioridade no backlog**: #4 (Classe A).

## 1. Como o Codex faz

O Codex combina duas proteções no ciclo de vida dos arquivos de rollout JSONL:

- **Lock coordenado multi-processo (`codex-rs/rollout/src/writer_lock.rs:24-99`)**: `WriterLockCoordinator` cria locks por thread (`<thread_id>.lock`) protegidos por um `.coordination.lock` para impedir dois escritores ativos gravando no mesmo histórico simultaneamente (`WouldBlock`) e impedir que compressão/publicação atropele escritores vivos:

```rust
// codex-rs/rollout/src/writer_lock.rs:46-98
    /// Acquires exclusive writer ownership, returning `WouldBlock` for an active writer.
    pub fn acquire(self: &Arc<Self>, thread_id: ThreadId) -> io::Result<WriterLockGuard> {
        let file = self.open_coordination()?;
        ...
        let path = self.directory.join(format!("{thread_id}.lock"));
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&path)
            ...?;
        match file.try_lock() {
            Ok(()) => {}
            Err(std::fs::TryLockError::WouldBlock) => {
                return Err(io::Error::new(
                    io::ErrorKind::WouldBlock,
                    format!("thread {thread_id} already has an active writer"),
                ));
            }
            ...
        }
        Ok(WriterLockGuard { coordinator: Arc::clone(self), path, file: Some(file) })
    }
```

- **Compressão fria para `.jsonl.zst` com leitura transparente (`codex-rs/rollout/src/compression.rs:51-91`)**: um worker em background comprime rollouts ociosos antigos usando `zstd`, e `open_rollout_line_reader` lê tanto `.jsonl` quanto `.jsonl.zst` de forma transparente (com materialização automática caso um resume volte a escrever nele).

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/session-manager.ts:1135-1200`, toda gravação é feita com `openSync(..., "wx")` seguido de `appendFileSync(this.sessionFile, ...)` ou `_rewriteFile()` sem lock consultivo entre processos nem suporte a arquivos `.jsonl.zst`:

```ts
// packages/coding-agent/src/core/session-manager.ts:1183-1200
   _persist(entry: SessionEntry): void {
      if (!this.persist || !this.sessionFile) return;

      if (!this.flushed) {
         if (!this._hasConversation()) return;
         const fd = openSync(this.sessionFile, "wx");
         try {
            for (const e of this.fileEntries) {
               writeFileSync(fd, `${JSON.stringify(e)}\n`);
            }
         } finally {
            closeSync(fd);
         }
         this.flushed = true;
      } else {
         appendFileSync(this.sessionFile, `${JSON.stringify(entry)}\n`);
      }
   }
```

Se duas instâncias do `nycode` fizerem `--resume <mesmo-arquivo>` ou manipularem sessões simultaneamente, ambas escrevem em paralelo no mesmo JSONL sem aviso, e sessões antigas acumulam em JSONL puro indefinidamente.

## 3. Diferença Concreta

O Codex isola escritores concorrentes no sistema de arquivos e reduz drasticamente a pegada em disco de históricos antigos via `.jsonl.zst`, mantendo o formato canônico JSONL para o usuário e ferramentas de debug sem precisar de SQLite como fonte primária.

## 4. Benefício e Custo

- **Benefício**: elimina condição de corrida silenciosa ao retomar a mesma sessão em múltiplos terminais/agentes e reduz ~5–10x o consumo de disco de histórico antigo em `~/.nycode/agent/sessions/`.
- **Custo em tokens**: `0` tokens por turno.
- **Custo em latência**: `0 ms` no turno ativo (lock na abertura da sessão + compressão opcional em idle/startup de arquivos frios com >7 dias em `node:zlib`).
- **Custo de manutenção**: baixo (~140 linhas, usando `node:zlib` nativo disponível no runtime Node 24+, sem npm novo nem Rust).

## 5. Riscos e Licença

- **Riscos**: lock órfão após `SIGKILL` — mitigado guardando PID/mtime no lockfile ou usando `flock` se disponível, verificando `process.kill(pid, 0)` antes de recusar; e na descompressão para retomada (`--resume`), sempre gravar em arquivo temporário + `renameSync` antes de remover `.jsonl.zst` para preservar atomicidade em crash.
- **Licença**: Codex é `Apache-2.0` (`LICENSE:1-201`). Implementação própria em Node (`node:fs` + `node:zlib`).

## 6. Proposta Técnica e Critérios

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/core/session-manager.ts`:
    1. Leitura transparente de `.jsonl` e `.jsonl.zst` (`zstdDecompressSync` de `node:zlib`) no carregador de sessão e picker (`listSessions`), materializando para `.jsonl` ao retomar para append.
    2. Lock cooperativo por sessão (`<session>.lock` com PID + verificação de processo vivo; falha explícita ou modo `--fork` sugerido quando outro processo vivo escreve no arquivo).
    3. Pass opcional em background (não bloqueante após abertura) comprimindo sessões fechadas antigas (sem lock ativo e mtime > N dias) para `.jsonl.zst`.
- **Testes unitários**:
  - Round-trip `jsonl` -> `jsonl.zst` -> resume com novas entradas -> validação integral da árvore de sessão.
  - Detecção de escritor concorrente ativo e recuperação de lock obsoleto de PID morto.
- **Plano de eval**: não aplicável (Classe A; infraestrutura de persistência sem impacto no modelo).
- **Critério de aceite**: `npm run check` limpo + testes em `packages/coding-agent/test/session-manager*.test.ts` verdes.
- **Rollback**: desabilitar escrita `.zst` e manter apenas leitor retrocompatível ou reverter lockfile.
