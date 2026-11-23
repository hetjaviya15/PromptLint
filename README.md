<div align="center">

# ✦ PromptLint AI

### Analyze. Score. Improve.

**Catch weak instructions before they become weak AI responses.**

A beautifully presented, developer-friendly toolkit for **linting, evaluating, and improving LLM prompts** — right from your terminal or JavaScript application.

[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq%20AI-F55036?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-0D9488?style=for-the-badge)](LICENSE)

[![GitHub stars](https://img.shields.io/github/stars/hetjaviya15/PromptLint?style=social)](https://github.com/hetjaviya15/PromptLint/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/hetjaviya15/PromptLint)](https://github.com/hetjaviya15/PromptLint/issues)

[Features](#-features) · [Quick Start](#-quick-start) · [CLI](#-command-line-interface) · [JavaScript API](#-javascript-api) · [AI Setup](#-groq-ai-setup) · [Contributing](#-contributing)

</div>

---

## ✨ Why PromptLint AI?

**“Write good code.”** What language? For which application? What should the output include?

LLMs can respond to vague instructions, but unclear prompts often lead to extra back-and-forth. **PromptLint AI helps you review the prompt first.** It surfaces potential issues, explains them in plain language, and offers targeted suggestions. With optional Groq AI evaluation, it can also propose a more precise version of your prompt.

> [!NOTE]
> Prompt scores are **guidance, not guarantees**. Offline scoring is rule-based; AI scoring is a subjective model evaluation. A short, clear prompt can be perfectly good.

## 🚀 Features

| | Feature | What it does |
|---|---|---|
| 🔎 | **Offline prompt linting** | Checks prompts locally using eight configurable rules — no key needed. |
| 📊 | **Quality scoring** | Shows a transparent 0–100 heuristic score and issue deductions. |
| 🧠 | **Groq-powered evaluation** | Reviews prompts across five dimensions using an LLM. |
| ✍️ | **Prompt improvement** | Suggests a revised prompt and explains proposed changes. |
| 💻 | **Polished terminal UI** | Styled panels, progress bars, warnings, and loading states. |
| 🎛️ | **Interactive CLI** | Analyze text, inspect files, or improve prompts from a menu. |
| 🧩 | **JavaScript API** | Import the analyzer into your Node.js applications. |
| 📄 | **Flexible output** | Structured JSON, readable reports, file export, and optional clipboard copying. |
| 🛟 | **Explicit fallback** | When AI fails, receives clearly labeled offline feedback instead of a fake AI result. |

## 🖥️ Terminal preview

An example of the **offline** report for `Write good code`, with terminal colors omitted:

```text
╭──────────────────────────────────────────╮
│              PROMPTLINT AI               │
│          Analyze. Score. Improve.        │
╰──────────────────────────────────────────╯

  MODE  Offline · Heuristic analysis

  PROMPT QUALITY
  70 / 100    Needs improvement
  ██████████████░░░░░░ 70%

  ⚠ vague-language
    Potentially vague wording: good.

  ⚠ missing-context
    The programming request does not specify
    a language or framework.

  SCORE DEDUCTIONS
    vague-language  -15
    missing-context -15
```

*Illustrative layout based on the project's reported offline findings; rendering depends on terminal width and color support.*

For AI mode, PromptLint additionally shows a dimension breakdown, issues, suggestions, and an improved prompt when the model returns a valid result.

## 📦 Installation

**Requirements:** Node.js **24 or newer** and npm.

### Try the project from source

```bash
git clone https://github.com/hetjaviya15/PromptLint.git
cd PromptLint
npm ci
npm start
```

### Install the package

Once `promptlint-ai` is published to npm, install it globally:

```bash
npm install -g promptlint-ai
```

Or install it in a Node.js project:

```bash
npm install promptlint-ai
```

**Before publication**, you can build and install the local package instead:

```bash
npm pack
npm install -g ./promptlint-ai-1.0.0.tgz
```

> [!IMPORTANT]
> The npm registry commands above require the package to be published. This repository's npm metadata uses `promptlint-ai`; check the registry before releasing, as a configured name does not mean publication is complete.

## ⚡ Quick Start

### Interactive mode

```bash
promptlint-ai
```

Choose **Offline** for instant local checks, or **Online** for AI-powered evaluation and improvement. Online mode uses a configured shared service or your own Groq key, depending on setup.

From the source repository, use `npm start` instead.

### Analyze a prompt offline

```bash
promptlint-ai analyze "Write good code" --offline
```

### Analyze using Groq AI

```bash
promptlint-ai analyze "Write good code" --ai
```

### Improve a prompt

```bash
promptlint-ai improve "Write good code for a website"
```

### Analyze a prompt file

```bash
promptlint-ai analyze --file prompt.txt --offline
promptlint-ai analyze --file prompt.txt --ai --json
```

## 🧰 Command-line interface

| Command | Action |
|---|---|
| `promptlint-ai` | Open the interactive menu in a terminal. |
| `promptlint-ai analyze "..."` | Analyze a prompt offline (default). |
| `promptlint-ai analyze "..." --ai` | Run an explicit AI evaluation. |
| `promptlint-ai improve "..."` | Evaluate and suggest a rewritten prompt. |
| `promptlint-ai rules` | Show the available offline rules. |
| `promptlint-ai analyze --file prompt.txt` | Read a UTF-8 prompt file. |
| `promptlint-ai analyze "..." --json` | Return machine-readable JSON. |
| `promptlint-ai improve --file prompt.txt --output improved.txt` | Save the improved prompt to a new file. |
| `promptlint-ai improve "..." --copy` | Copy an improved prompt, where clipboard support is available. |
| `promptlint-ai --help` | Show CLI help. |
| `promptlint-ai --version` | Show package version. |

Other supported options include `--model`, `--timeout`, `--no-color`, and `--ascii`. Use `--ascii` for terminals without reliable Unicode support. CLI JSON output excludes decorative formatting.

## 🧩 JavaScript API

PromptLint can also be used inside a Node.js application.

### Offline analysis

```js
import { analyzePrompt, formatReport } from 'promptlint-ai';

const report = analyzePrompt('Write good code');

console.log(report.score); // 70 with default rules
console.log(report.grade); // Needs improvement
console.log(report.issues);
console.log(formatReport(report));
```

### Groq-powered analysis

```js
import { analyzePromptAI } from 'promptlint-ai';

const report = await analyzePromptAI(
  'Write a JavaScript function that sorts an array',
  { provider: 'groq' }
);

console.log(report.mode); // 'ai', or 'offline' if fallback was used
console.log(report.score);
console.log(report.suggestions);
```

### Improve a prompt with AI

```js
import { improvePrompt } from 'promptlint-ai';

const result = await improvePrompt(
  'Make a nice website',
  { provider: 'groq' }
);

if (result.mode === 'ai') {
  console.log(result.improvedPrompt);
  console.log(result.explanation);
  console.log(result.clarificationQuestions);
} else {
  console.log(result.warnings);
}
```

### Customize linting rules

```js
import { analyzePrompt, getAvailableRules } from 'promptlint-ai';

console.log(getAvailableRules());

const report = analyzePrompt('Write good code', {
  rules: {
    'vague-language': true,
    contradictions: false
  },
  maxLength: 3000,
  weights: { info: 5, warning: 15, error: 30 }
});

console.log(report);
```

**Available exports:** `analyzePrompt`, `analyzePromptAI`, `improvePrompt`, `formatReport`, and `getAvailableRules`.

## 🔍 Eight offline rules

| Rule | Purpose |
|---|---|
| `empty-prompt` | Flags empty or whitespace-only prompts. |
| `vague-language` | Detects some subjective or imprecise wording. |
| `missing-context` | Spots missing task context when the rule considers it relevant. |
| `output-format` | Suggests format details for certain structured-output tasks. |
| `contradictions` | Identifies selected directly conflicting instructions. |
| `duplicate-instructions` | Detects repeated instructions after normalization. |
| `prompt-length` | Checks configurable character and word limits. |
| `repeated-text` | Flags excessive consecutive word repetition. |

The checks are deliberately lightweight and do not claim full semantic understanding. For example, `Translate hello into French` should not be penalized merely because it's short.

## 🧠 Groq AI setup

PromptLint supports two AI connection approaches.

| Mode | Groq key required from each user? | How it works |
|---|---|---|
| **Shared service** | No | A deployed PromptLint service forwards evaluation requests using its server-side key. |
| **Direct Groq** | Yes | Your trusted Node.js process calls Groq using a key you configure. |

**A deployed and available shared service is required for keyless online access.** The package is configured with `https://promptlint-api.onrender.com`, but availability and usage limits depend on the deployment.

To use a personal Groq key in a trusted local/server environment:

1. Create a key in the [Groq Console](https://console.groq.com/keys).
2. Set the `GROQ_API_KEY` environment variable securely (never commit your key).
3. Choose direct mode by explicitly supplying `apiKey` through the JavaScript API, or disable the packaged service URL for CLI testing.

For example, in a local shell where `GROQ_API_KEY` is already configured:

```bash
PROMPTLINT_SERVICE_URL='' promptlint-ai analyze "Explain recursion" --ai
```

A local private `.env` can also be loaded by the CLI. **Never place a Groq key in browser-side code or the repository.** Groq requests may be subject to provider limits and charges.

### AI scoring dimensions

| Dimension | Weight |
|---|---:|
| Clarity | 25% |
| Context | 25% |
| Specificity | 20% |
| Output requirements | 15% |
| Consistency | 15% |

The application calculates the final score from the model's dimension ratings. **Offline and AI scores remain separate**: they aren't blended or presented as equivalent benchmarks.

## 🌐 Optional shared backend

The repository includes a lightweight Node.js backend and `render.yaml` for deploying a shared AI evaluation service.

```text
                       ┌───────────────────┐
                       │    PromptLint     │
                       │    CLI / API      │
                       └─────────┬─────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
       Offline rule engine               Online evaluation
                │                                 │
       Local heuristic report        Shared backend or direct Groq
                                                  │
                                            Groq model
                                                  │
                                  AI report + improved prompt
```

**Maintainer deployment:** Connect this repository to Render using its Blueprint configuration, set `GROQ_API_KEY` as a server-side secret, and confirm the `/health` endpoint works. Set the final shared URL in the package before publishing:

```bash
npm run configure:server -- https://YOUR-SERVICE.onrender.com
npm test
npm run pack:check
```

The demo service uses global in-memory limits (10 attempts/minute, 100 attempts/24 hours, and 2 concurrent evaluations by default). These are **not reliable billing safeguards**: they reset after restarts and can be exhausted by unauthenticated users. For a public rollout, add stronger usage protection and enforce provider-side spending limits.

## 🏗️ Project structure

```text
PromptLint/
├── bin/                 # Executable CLI
├── src/
│   ├── ai/              # Groq integration and shared-service client
│   ├── cli/             # Commands, terminal UI, progress, clipboard
│   ├── rules/           # Offline lint rules
│   ├── analyzer.js      # Offline analysis engine
│   ├── scoring.js       # Heuristic scoring
│   ├── formatter.js     # Human-readable report formatting
│   └── index.js         # Public JavaScript API
├── server/              # Optional shared AI backend
├── examples/            # CLI and API usage examples
├── tests/               # Automated unit and integration tests
├── scripts/             # Package verification / server configuration
├── render.yaml          # Optional Render deployment config
├── package.json
├── README.md
└── LICENSE
```

## 🧪 Testing and development

```bash
# Install exactly the locked dependencies
npm ci

# Run automated tests (mocked AI; no real key required)
npm test

# Validate package and source configuration
npm run check

# Inspect published file contents
npm run pack:check

# Build a local npm archive
npm pack
```

The test suite covers lint rules, score calculations, formatting, CLI commands, simulated AI responses, fallback handling, error behavior, and shared-service functionality. Local tests do **not** need a real Groq key.

## 🔐 Privacy and limitations

- **Offline prompts remain local.** Choosing AI mode sends the submitted prompt to the configured shared backend/Groq or directly to Groq.
- **No prompt-history storage by default.** Avoid including credentials or personal secrets in prompts.
- **Heuristic checks have limitations.** Regex-based rules can miss subtle issues or produce false positives.
- **AI-generated rewrites should be reviewed.** A validated response format doesn't guarantee factual correctness or perfect intent preservation.
- **Service availability is not guaranteed.** AI evaluation may be delayed, rate-limited, unavailable, or subject to usage costs.
- **Node.js 24+ is required.** Prompt length statistics are not exact model token counts.

## 🤝 Contributing

Suggestions, bug reports, and focused pull requests are welcome!

1. [Open an issue](https://github.com/hetjaviya15/PromptLint/issues) to describe a bug or feature request.
2. Fork the repository and create a feature branch.
3. Make your changes and add tests for new behavior.
4. Run `npm test` and `npm run check`.
5. Open a pull request with a concise explanation.

Please keep test suites independent from live Groq API calls and **never commit real API keys**.

## 📄 License

Licensed under the [MIT License](LICENSE). © 2026 **Het Javiya**.

## 👨‍💻 Author

**Het Javiya** — Full-stack development and AI tooling enthusiast.

[![GitHub](https://img.shields.io/badge/GitHub-hetjaviya15-181717?style=flat-square&logo=github)](https://github.com/hetjaviya15)

---

<div align="center">

### ✦ Better prompts start with better feedback.

**If PromptLint AI is useful, consider giving the repository a ⭐!**

[⬆ Back to top](#-promptlint-ai)

</div>
