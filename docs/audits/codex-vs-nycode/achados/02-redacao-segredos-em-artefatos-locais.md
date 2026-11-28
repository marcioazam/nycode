# Achado 02 — Redação Regex de Segredos em Artefatos Locais (`crash-log.ts` e `bug-report.ts`)

- **Classificação**: **Classe A** (0 tokens extras, zero mudança no comportamento do modelo/prompt/tool/loop, sem dependência nativa).
- **Prioridade no backlog**: #2 (Classe A).

## 1. Como o Codex faz

O crate `codex-secrets` expõe um sanitizador central `redact_secrets(input: String) -> String` em `codex-rs/secrets/src/sanitizer.rs:4-22` que aplica regex compiladas uma única vez (`LazyLock<Regex>`) sobre texto arbitrário (logs, erros, diagnósticos) antes de gravar ou exibir:

```rust
// codex-rs/secrets/src/sanitizer.rs:4-22
static OPENAI_KEY_REGEX: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"sk-[A-Za-z0-9]{20,}"));
static AWS_ACCESS_KEY_ID_REGEX: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"\bAKIA[0-9A-Z]{16}\b"));
static BEARER_TOKEN_REGEX: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i:\bBearer)[ \t]+[A-Za-z0-9._~+/-]{16,}=*"));
static SECRET_ASSIGNMENT_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(r#"(?i)\b(api[_-]?key|token|secret|password)\b(\s*[:=]\s*)(["']?)[^\s"']{8,}"#)
});

/// Remove secret and keys from a String. This is done on best effort basis following some
/// well-known REGEX.
pub fn redact_secrets(input: String) -> String {
    let redacted = BEARER_TOKEN_REGEX.replace_all(&input, "Bearer [REDACTED_SECRET]");
    let redacted = OPENAI_KEY_REGEX.replace_all(&redacted, "[REDACTED_SECRET]");
    let redacted = AWS_ACCESS_KEY_ID_REGEX.replace_all(&redacted, "[REDACTED_SECRET]");
    let redacted = SECRET_ASSIGNMENT_REGEX.replace_all(&redacted, "$1$2$3[REDACTED_SECRET]");

    redacted.to_string()
}
```

## 2. Como o `nycode` faz

Em `packages/coding-agent/src/core/bug-report.ts:19-60`, `redactUrl` e `redactJsonValue` removem credenciais em URLs (user/pass/query) e valores sob chaves JSON cujo nome case com `SENSITIVE_KEY`:

```ts
// packages/coding-agent/src/core/bug-report.ts:19-24 e 51-59
const REDACTED = "<redacted>";
const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;

function isSensitiveKey(key: string): boolean {
   return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}
...
export function redactJsonValue(value: unknown): unknown {
   if (value === undefined) return undefined;
   return JSON.parse(
      JSON.stringify(value, (key, child: unknown) => {
         if (child !== null && child !== undefined && isSensitiveKey(key)) return REDACTED;
         return typeof child === "string" ? redactUrl(child) : child;
      }),
   );
}
```

Entretanto:
1. Em `bug-report.ts:56`, strings arbitrárias fora de chaves sensíveis (`hint`, `extensionErrors[i].error`, mensagens de erro do modelo/HTTP no diagnóstico) só passam por `redactUrl(child)`, que **não redige tokens inline** (cabeçalhos Authorization em texto livre, chaves de provedor ou atribuições `token=...` em mensagens de stack/erro).
2. Em `packages/coding-agent/src/core/crash-log.ts:42-45`, `writeCrashLog` grava `records` (`message`, `stack`, `cwd`) direto no disco sem nenhuma sanitização de segredos nem de URLs.

## 3. Diferença Concreta

Enquanto o `nycode` redige por estrutura (nome de chave JSON e esquema de URL), o Codex aplica camada adicional de `redact_secrets` em texto livre. Qualquer stack trace ou mensagem de erro de SDK HTTP contendo header `Authorization`, token de provedor (`sk-...`) ou chave AWS embutida em texto acaba persistida em `~/.nycode/agent/crashes.json` ou incluída em pacotes `/bug`.

## 4. Benefício e Custo

- **Benefício**: elimina exposição acidental de credenciais em `crashes.json` e em strings livres de relatórios `/bug` (inclusive para passar sem falso positivo em scanners locais como `gitleaks`/`trufflehog` quando relatórios são compartilhados).
- **Custo em tokens**: `0` tokens por turno (executa apenas em erro/crash ou comando `/bug`).
- **Custo em latência**: `< 1 ms` em caminhos excepcionais.
- **Custo de manutenção**: muito baixo (~45 linhas com função pura compartilhada `redactSecretsText`).

## 5. Riscos e Licença

- **Riscos**: falsa redação de hashes hexadecimais ou IDs muito longos caso regex seja ampla demais; mitigável mantendo prefixos explícitos (chaves de API reconhecidas, tokens Bearer, atribuições `key=valor`) já validados em `sanitizer.rs`.
- **Licença**: Codex é `Apache-2.0` (`LICENSE:1-201`). Reimplementação limpa de expressões regulares padrão em TypeScript não exige cópia de código Rust.

## 6. Proposta Técnica e Critérios

- **Arquivos a tocar no `nycode`**:
  - `packages/coding-agent/src/core/bug-report.ts`: extrair helper `redactText(text: string): string` (combinando `redactUrl` em substrings HTTP/HTTPS e padrões equivalentes a `Bearer`, chaves OpenAI/Anthropic `sk-ant-...`/`sk-...`, tokens AWS/GitHub e atribuições `token/secret/api_key/password[:=]...`), aplicando em `typeof child === "string"` dentro de `redactJsonValue`, em `hint` e `extensionErrors`.
  - `packages/coding-agent/src/core/crash-log.ts`: aplicar `redactText` em `record.message` e `record.stack` antes de chamar `writeCrashLog`.
- **Testes unitários**:
  - Casos sintéticos em `packages/coding-agent/test/bug-report.test.ts` cobrindo textos livres em stack trace e crash record (construídos dinamicamente no teste para não disparar scanners de segredos estáticos no repositório) validando redação idempotente.
- **Plano de eval**: não aplicável (Classe A; não altera modelo nem loop).
- **Critério de aceite**: `npm run check` limpo + testes específicos + `scripts/check-leaks.sh --tree` verde.
- **Rollback**: remover chamada de `redactText` nos dois pontos de persistência.
