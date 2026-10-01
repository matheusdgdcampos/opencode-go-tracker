<p align="center">
  <a href="README.md">🇺🇸 Read in English</a> • <strong>🇧🇷 Português</strong>
</p>

<p align="center">
  <img src="resources/app_icon.png" width="128" height="128" alt="OpenCode Go Tracker Logo" />
</p>

<h1 align="center">OpenCode Go Tracker</h1>

<p align="center">
  <strong>Utilitário de menu bar e system tray multiplataforma para acompanhamento contínuo e em tempo real das cotas de uso do OpenCode Go.</strong>
</p>

<p align="center">
  <a href="#-testes-e-cobertura"><img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions" alt="Build Status" /></a>
  <a href="#-testes-e-cobertura"><img src="https://img.shields.io/badge/tests-92%20passed-brightgreen?style=flat-square&logo=vitest" alt="Tests" /></a>
  <a href="#-testes-e-cobertura"><img src="https://img.shields.io/badge/coverage-%3E90%25-brightgreen?style=flat-square" alt="Coverage" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/electron-v34-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/typescript-v5.7-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/react-v19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-modelo-de-privacidade-e-segurança">Privacidade</a> •
  <a href="#-tabela-de-estados-da-interface">Estados da UI</a> •
  <a href="#-arquitetura">Arquitetura</a> •
  <a href="#-guia-do-desenvolvedor">Desenvolvimento</a> •
  <a href="#-testes-e-cobertura">Testes & Cobertura</a> •
  <a href="#-resolução-de-credenciais-e-troubleshooting">Credenciais</a>
</p>

---

## 📖 Sobre o Projeto

O **OpenCode Go Tracker** é uma aplicação leve e elegante que reside exclusivamente na barra de menus / bandeja do sistema operacional (macOS Menu Bar, Windows System Tray e Linux StatusNotifierItem). 

Desenvolvido para assinantes do [OpenCode Go](https://opencode.ai), seu objetivo é evitar surpresas de esgotamento de cota durante sessões de codificação com agentes de IA, fornecendo visibilidade imediata das cotas restantes e tempo para o próximo reset sem precisar abrir o navegador ou rodar comandos manuais.

Portado fielmente da versão nativa em Swift/AppKit para **Electron + React + TypeScript**, preserva 100% dos princípios de Clean Architecture, isolamento em memória e zero pegada no disco.

---

## 🚀 Funcionalidades

- **Exclusivo de Bandeja (Tray-Only):** Não ocupa espaço no Dock (macOS) nem na barra de tarefas (Windows/Linux). O popup abre de forma fluida ancorado ao ícone da bandeja e fecha automaticamente ao perder o foco (*hide-on-blur* com proteção anti-flicker).
- **Três Janelas de Cota Independentes:**
  - ⏱️ **5 horas (Rolling Window):** Janela móvel de uso imediato, refletida no rótulo da barra com o percentual consumido (`>_ 42%`).
  - 📅 **Semanal:** Acompanhamento do limite semanal acumulado.
  - 📆 **Mensal:** Cota total do ciclo de faturamento.
- **Degraus Semânticos de Cor:**
  - 🟢 **Normal (`< 50%`):** Verde (`#30D158`).
  - 🟡 **Atenção (`50% – 79%`):** Amarelo (`#FFD60A`).
  - 🔴 **Crítico (`≥ 80%`):** Vermelho (`#FF453A`).
- **Contagem Regressiva em Tempo Real:** Atualizada localmente a cada minuto pelo cliente visual (`Reseta em 3h 05min`), sem sobrecarregar a API com requisições adicionais.
- **Resiliência Visual (*Stale-While-Revalidate*):** Falhas transitórias de conexão ou instabilidades na API mantêm a última medição válida visível na tela em vez de exibir telas de erro disruptivas.
- **Internacionalização Automática (i18n):** Idioma detectado automaticamente a partir do sistema operacional (`pt-BR` ou `en-US`), com fallback gracioso.

---

## 🔒 Modelo de Privacidade e Segurança

Projetado sob o princípio de **Zero Residue / Zero Footprint**:

1. **Sem Banco de Dados ou Arquivos Locais:** A aplicação não salva configurações, histórico ou arquivos em disco.
2. **Chave Efêmera em Memória:** Se a chave da API for inserida manualmente pela interface, ela é mantida apenas na memória RAM do processo principal e descartada imediatamente ao fechar o app.
3. **Leitura Segura do `auth.json`:** Lê em modo somente-leitura o arquivo mantido pelo próprio OpenCode CLI em `~/.local/share/opencode/auth.json`. Detecta rotações de chave automaticamente a cada ciclo de polling (60s).
4. **Isolamento de Dados do Electron:** O diretório de cache/navegação `userData` é apontado dinamicamente para o `$TMPDIR` efêmero do sistema operacional antes da inicialização.
5. **Preload Protegido:** `contextIsolation: true`, `sandbox: true` e `nodeIntegration: false`. A chave de API nunca é vazada para o contexto de renderização (UI).

---

## 🖥️ Tabela de Estados da Interface

O painel exibe uma interface limpa adaptada exatamente ao estado atual da conexão:

| Estado | Ícone / Indicador | Descrição Visual | Ações Disponíveis |
| :--- | :--- | :--- | :--- |
| **Loaded** | 📊 3 Barras de Quota | Exibe as 3 barras coloridas com percentual e tempo de reset | Atualizar cota, Encerrar |
| **Loading** | ⏳ Spinner elegante | Sincronizando dados com a API (preserva dados anteriores se houver) | Encerrar |
| **No Key** | 🔑 Campo de Chave | Orienta o usuário a rodar `/connect` ou colar a chave da API em memória | Enviar chave, Encerrar |
| **Invalid Key** | ⚠️ Alerta Amarelo | Informa que a chave não é reconhecida ou a assinatura expirou | Atualizar, Encerrar |
| **Network Error** | 🌐 Sem Conexão | Sinaliza instabilidade e informa nova tentativa automática em 60s | Atualizar agora, Encerrar |
| **Unexpected Response** | 🛑 Erro Inesperado | Trata alterações de schema ou respostas anômalas da API de forma segura | Atualizar agora, Encerrar |

---

## 🏗️ Arquitetura

O projeto adota os princípios de **Clean Architecture** e **Dependency Inversion (DIP)**:

```text
opencode-go-tracker/
├── assets/                       # Ícones de bandeja vetoriais e rasterizados (16x16, 32x32@2x)
├── resources/                    # Logotipo e ícone oficial do aplicativo (app_icon.png)
└── src/
    ├── core/                     # ⚙️ Domínio e Lógica Pura (Independente de UI e Electron)
    │   ├── models.ts             # Decodificação estrita de cotas e ISO-8601
    │   ├── formatter.ts          # Cálculo de BarLevel e formatação de timeRemaining
    │   ├── fileSystem.ts         # Abstração de I/O sobre fs, os e path
    │   ├── authKeyReader.ts      # Leitor seguro do auth.json com suporte a DI
    │   ├── usageService.ts       # Máquina de estados finitos e polling periódico (60s)
    │   ├── strings.ts            # Dicionários de i18n e resolução de idioma
    │   ├── utils.ts              # Utilitários de clamp, parse seguro e asserções de tipo
    │   └── *.test.ts             # Testes unitários do domínio
    ├── main/                     # 🖥️ Processo Principal (Electron / Node.js)
    │   ├── index.ts              # Ciclo de vida, single-instance lock e orquestração
    │   ├── popupWindow.ts        # Janela popup com posicionamento dinâmico e clamp na tela
    │   ├── trayController.ts     # Controlador nativo da bandeja (título macOS / canvas Win/Linux)
    │   ├── appPaths.ts           # Configuração de userData efêmero em temp
    │   └── ipc.ts                # Handlers IPC tipados e broadcast seguro
    ├── preload/                  # 🛡️ Ponte Segura (contextBridge)
    │   ├── index.ts              # Contrato de RPC seguro via window.api
    │   └── index.d.ts            # Tipagens globais expostas ao renderer
    └── renderer/                 # ⚛️ Interface de Usuário (React + TypeScript)
        ├── App.tsx               # Painel principal com renderização de estados
        ├── QuotaBar.tsx          # Componente reutilizável de barra de progresso
        ├── trayLabel.ts          # Renderização offscreen em canvas para Win/Linux
        └── styles.css            # Estilização no tema escuro (#1F1F24)
```

---

## 🛠️ Guia do Desenvolvedor

### Pré-requisitos
- **Node.js:** Versão 20 ou superior.
- **npm:** Versão 10 ou superior.

### Instalação
```bash
npm install
```

### Modo de Desenvolvimento
Inicia a aplicação com Hot Module Replacement (HMR) e reload automático:
```bash
npm run dev
```

### Verificação de Tipos TypeScript
Valida tipagens estritas tanto no ambiente Node/Main quanto no ambiente Web/DOM:
```bash
npm run typecheck
```

### Compilação de Produção
Gera os bundles otimizados em `out/`:
```bash
npm run build
```

### Empacotamento de Executáveis
Gera os instaladores nativos para o seu sistema operacional:
```bash
# macOS (DMG arm64 + x64)
npm run dist:mac

# Windows (Instalador NSIS)
npm run dist:win

# Linux (AppImage)
npm run dist:linux
```

---

## 🧪 Testes e Cobertura

A suíte de testes automatizados é executada com [Vitest](https://vitest.dev) e [V8 Coverage](https://v8.dev):

### Executar Testes Unitários
```bash
npm test
```

### Executar com Relatório de Cobertura de Código (≥ 80%)
Gera relatório detalhado no terminal e relatórios em HTML e LCOV em `coverage/`:
```bash
npm run test:coverage
```

### Métricas Atuais de Cobertura
| Métrica | Cobertura Obtida | Meta do Projeto | Status |
| :--- | :---: | :---: | :---: |
| **Linhas (% Lines)** | **90.83%** | ≥ 80.00% | ✅ Aprovado |
| **Declarações (% Stmts)** | **90.83%** | ≥ 80.00% | ✅ Aprovado |
| **Funções (% Funcs)** | **92.30%** | ≥ 80.00% | ✅ Aprovado |
| **Ramos (% Branch)** | **86.64%** | ≥ 80.00% | ✅ Aprovado |

---

## 🔍 Resolução de Credenciais e Troubleshooting

### Onde a chave da API é armazenada?
O OpenCode salva credenciais locais no seguinte caminho por padrão:
- **macOS / Linux:** `~/.local/share/opencode/auth.json` (ou `$XDG_DATA_HOME/opencode/auth.json`)
- **Windows:** `%LOCALAPPDATA%\opencode\auth.json`

O formato do arquivo é:
```json
{
  "opencode-go": {
    "type": "api",
    "key": "sk-sua-chave-aqui"
  }
}
```

### Chave não encontrada no app?
1. **Login no terminal:** Abra o seu terminal e execute:
   ```bash
   opencode providers login --provider opencode-go
   ```
   Cole sua chave de API quando solicitado. O tracker detectará a nova chave automaticamente no próximo ciclo de sincronização (ou clique no botão de atualizar no rodapé).
2. **Inserção manual:** Se preferir, cole a chave diretamente na tela da aplicação — ela será mantida em memória volátil durante a sessão.
3. **Variável de ambiente:** O OpenCode CLI também suporta a variável `OPENCODE_API_KEY` no seu shell.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais informações.
