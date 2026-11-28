# Inventario: dot-github

Cada linha cobre 1 arquivo rastreado em `~/source/oh-my-pi-ref` (`git ls-files`), com categoria, origem em relação ao Pi `v0.9.4`, dono equivalente no `nycode` (ou `sem equivalente`) e nota resumida verificada nos shards. Regras e totais em [../inventario.md](../inventario.md).

| Arquivo | Categoria | Origem | Dono no nycode | Nota |
|---|---|---|---|---|
| `.github/ISSUE_TEMPLATE/bug_report.yml` | config_ou_dado | omp-novo | sem equivalente | 109L; Formulário de GitHub Issue para relatos de bug com campos obrigatórios de descrição, passos, comportamento esperado, plataforma... |
| `.github/ISSUE_TEMPLATE/config.yml` | config_ou_dado | omp-novo | `.github/ISSUE_TEMPLATE/config.yml` | mesmo caminho; 11L; Configuração de templates de issue do GitHub habilitando issues em branco e links de contato para documentação de modelos, exte... |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | config_ou_dado | omp-novo | `.github/ISSUE_TEMPLATE/feature_request.yml` | mesmo caminho; 48L; Formulário de GitHub Issue para solicitação de novas funcionalidades com área, caso de uso, solução proposta e alternativas. |
| `.github/ISSUE_TEMPLATE/question.yml` | config_ou_dado | omp-novo | sem equivalente | 38L; Formulário de GitHub Issue para dúvidas de uso ou configuração, com seleção de tópico e plataforma. |
| `.github/PULL_REQUEST_TEMPLATE.md` | doc | omp-novo | `.github/PULL_REQUEST_TEMPLATE.md` | mesmo caminho; 17L; Template de Pull Request exigindo resumo What/Why/Testing em palavras próprias, `bun check`, teste local e atualização de CHANG... |
| `.github/SECURITY.md` | doc | omp-novo | sem equivalente | 18L; Política de segurança do repositório indicando suporte apenas à última release e canais privados para relato de vulnerabilidades. |
| `.github/actionlint.yaml` | config_ou_dado | omp-novo | sem equivalente | 6L; Registra o label de runner self-hosted `vmon-large/from=omp-ci` para validação limpa do actionlint. |
| `.github/actions/bazel-cache/action.yml` | config_ou_dado | omp-novo | sem equivalente | 54L; Composite action que gera um fragmento bazelrc conectando runners vmon ao cache de repositório/xwin local e ao cache remoto HTT... |
| `.github/actions/bun-install/action.yml` | config_ou_dado | omp-novo | sem equivalente | 122L; Composite action que verifica/instala a versão pinada do Bun, reutiliza o store baked nos runners vmon ou restaura do cache do ... |
| `.github/actions/native-artifacts/action.yml` | config_ou_dado | omp-novo | sem equivalente | 72L; Composite action que baixa os artefatos nativos `.node` pré-compilados (`natives-linux-x64` ou `native-addons`) e os instala vi... |
| `.github/workflows/bun-cache-warm.yml` | config_ou_dado | omp-novo | sem equivalente | 34L; Workflow no GitHub Actions que aquece o cache do store Bun na `main` para que jobs de PR (somente leitura no cache) possam rest... |
| `.github/workflows/ci.yml` | config_ou_dado | omp-novo | `.github/workflows/ci.yml` | mesmo caminho; 1254L; Primeira metade do workflow principal de CI: resolve metadados de release na `main`, roda cargo-deny/typecheck/collab-web, chec... |
| `.github/workflows/nix.yml` | config_ou_dado | omp-novo | sem equivalente | 53L; Workflow de CI para Nix que avalia o flake em todos os sistemas suportados e verifica a geração das dependências Bun (`bun-lock`). |
| `.github/workflows/stale.yml` | config_ou_dado | omp-novo | sem equivalente | 62L; Workflow horário que marca issues e PRs sem atividade por 45 dias (exceto labels protegidas) e fecha após 14 dias, limitado a 4... |
