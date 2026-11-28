# Inventario: crates-voice

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `crates/voice/BUILD.bazel` | codigo | omp-novo | sem equivalente | 31L; Alvos Bazel (`rust_library` e `rust_test`) para a crate `omp_voice` isolando o grafo de dependências WebRTC/Opus da camada N-API. |
| `crates/voice/Cargo.toml` | config_ou_dado | omp-novo | sem equivalente | 27L; Manifesto Cargo da crate `omp-voice` com dependências `opus`, `webrtc`, `tokio`, `flume`, `parking_lot`, `libc` (Linux) e `wind... |
| `crates/voice/LICENSE` | codigo | omp-novo | sem equivalente | 22L; Licença MIT da crate `omp-voice`. |
| `crates/voice/src/audio.rs` | codigo | omp-novo | sem equivalente | 759L; Engine de captura de microfone e reprodução de áudio mono `f32`, com `Renderer` gerenciando buffer de jitter, rampas fade-in/fa... |
| `crates/voice/src/device/coreaudio.rs` | codigo | omp-novo | sem equivalente | 409L; Backend de áudio macOS usando `AudioToolbox` (`AudioQueueNewOutput`/`AudioQueueNewInput`) com 3 buffers PCM `f32` mono e teardo... |
| `crates/voice/src/device/linux.rs` | codigo | omp-novo | sem equivalente | 1046L; Backend de áudio Linux carregando `libpulse-simple.so.0`/`libpulse.so.0` e fallback `libasound.so.2` via `dlopen`/`dlsym`, cálc... |
| `crates/voice/src/device/mod.rs` | codigo | omp-novo | sem equivalente | 123L; Interface unificada e contrato dos backends de áudio por plataforma (`PlaybackDevice`, `CaptureDevice`, `DeviceConfig` e `playb... |
| `crates/voice/src/device/unsupported.rs` | codigo | omp-novo | sem equivalente | 22L; Stub de dispositivo de áudio para plataformas não suportadas retornando erro explícito. |
| `crates/voice/src/device/wasapi.rs` | codigo | omp-novo | sem equivalente | 886L; Backend de áudio Windows usando WASAPI em modo compartilhado com vtables COM manuais, conversão automática de PCM (`AUTOCONVERT... |
| `crates/voice/src/lib.rs` | codigo | omp-novo | sem equivalente | 27L; Ponto de entrada da crate `omp-voice` expondo `audio`, `device` (interno) e `live`, além do alias `VoiceResult<T>`. |
| `crates/voice/src/live.rs` | codigo | omp-novo | sem equivalente | 811L; Peer WebRTC nativo (`LivePeerCore`) para sessões ao vivo com data channel `oai-events`, codificação Opus VoIP de entrada 16 kHz... |
