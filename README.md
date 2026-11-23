# PromptLint AI

**Analyze. Score. Improve.**

PromptLint helps developers review prompts before sending them to an LLM. It combines a deterministic offline linter with optional Groq-powered evaluation and prompt improvement. Use the CLI for quick feedback or import the JavaScript API into a Node.js application.

It exists to make vague requests, missing context, conflicting instructions, and unclear output requirements easier to spot. A lint score is a review aid, not a promise of better model performance.

**Package:** `promptlint-ai` · **Version:** `1.0.0` · **Author:** Het Javiya · **License:** MIT

The npm registry returned **404** for this name on November 23, 2026. It appeared unregistered at that check; availability is not reserved and must be checked again before publication. This repository does not claim that the package has been published.

## Features

- Eight configurable offline rules with transparent deductions and actionable suggestions.
- Optional Groq analysis with five scored dimensions and a locally calculated weighted total.
- AI-improved prompts, explanations, changes, and clarification questions.
- Explicitly labeled offline fallback when AI is unavailable; no fabricated AI score or rewrite.
- Cyan branding, score bars, issue panels, improved-prompt panels, and a loading spinner.
- Interactive numbered menu with Enter-to-submit input; no full-screen terminal app.
- UTF-8 files, stdin, clean JSON, optional clipboard copying, and safe file export.
- Native JavaScript ES modules with the official Groq SDK, Chalk, Ora, and Boxen.

## Terminal example

This is an excerpt from actual offline CLI output for `Write good code`, with ANSI colors omitted:

```text
PROMPTLINT
Analyze. Score. Improve.

Mode: Offline | heuristic analysis

PROMPT QUALITY
70/100 (heuristic)
Grade: Needs improvement
##############------ 70%

[WARNING] vague-language
Potentially vague wording: good.

[WARNING] missing-context
The programming request does not specify a language or framework.

Score deductions: vague-language -15, missing-context -15
```

Normal Unicode terminals show titled rounded panels, compact findings, and Unicode score bars. Reports avoid repeating suggestions already shown with findings. Small terminals switch to compact output; `--ascii` provides a plain character fallback. Colors are disabled for redirected output, `NO_COLOR`, or `--no-color`. AI spinners run only on a suitable TTY and never in JSON mode.

## Shared Online access on Render (owner setup)

Regular users can use Online mode without a Groq key once the owner deploys this backend and embeds its public URL in the npm package. The key stays in Render's server environment. No Docker, database, or changes to SIFRA are required.

**Shared service:** `https://promptlint-api.onrender.com` is configured as the package default. Online mode works without a personal API key. The `/health` endpoint reports availability; the base URL has no homepage. Service availability and shared usage limits apply.

1. Commit and push this repository when ready. In Render, choose **New → Blueprint** and connect `hetjaviya15/PromptLint`. The included `render.yaml` selects a native Node.js Free web service.
2. Enter **your new Groq key** as the server's `GROQ_API_KEY` secret when Render asks. Never commit a real key or place it in the public URL. Rotate any key previously shared in chat before public deployment.
3. Alternatively, create a **Web Service** manually with runtime **Node**, build command `npm ci --omit=dev`, start command `node server/index.js`, Free instance type, `NODE_VERSION=24`, and health-check path `/health`. Add the same server-side key.
4. Wait for deployment and open `https://YOUR-SERVICE.onrender.com/health`. A running server returns `{"status":"ok"}`. This verifies server availability, not Groq authentication.
5. Configure the real public URL in your checkout:

```bash
npm run configure:server -- https://YOUR-SERVICE.onrender.com
npm test
npm pack
```

Commit the resulting `src/ai/serviceConfig.js` change and publish the rebuilt package manually. The configured URL is public; it contains no credential. Normal users then just run `promptlint-ai`, choose **Online**, and enter a prompt. They do not need `.env` or their own key.

Render's [Free service documentation](https://render.com/docs/free) says services sleep after 15 idle minutes and can take about a minute to wake; free instance hours are shared across your workspace. Two free services do not each receive an independent workspace allowance. Groq usage remains subject to your provider account's limits and charges.

For local owner testing, start `npm run server` in one terminal. In another, run:

```bash
PROMPTLINT_SERVICE_URL=http://127.0.0.1:3000 npm start
```

This uses your server's key. Public deployments require HTTPS; plain HTTP is allowed only for loopback development. The server exposes `POST /v1/evaluate` with `{ "prompt": "..." }` and `GET /health`. It never serves local files.

### Shared-service limits

The default single-instance limits are **10 attempts per minute**, **100 attempts per 24-hour window**, **2 concurrent evaluations**, **8000 prompt characters**, and **32 KiB request bodies**. Every Groq attempt, including failures, counts. Response generation is capped at 4096 completion tokens and a 30-second provider deadline. Server environment variables `REQUESTS_PER_MINUTE`, `REQUESTS_PER_DAY`, and `MAX_CONCURRENT` adjust the request limits. Clients cannot change the model, output cap, provider URL, or key.

Limits apply globally to all users, deliberately avoiding trust in spoofable forwarded IP headers. There are no accounts or authentication: someone can exhaust the shared allowance. Counters live in memory and reset on restarts, redeployments, and free-instance sleep. They are demo safeguards, **not a durable billing cap**; use provider-side account limits and monitor usage before wider distribution. Do not scale multiple instances without a shared quota store. Server application code does not log prompts, keys, or raw provider errors; the hosting provider may retain access metadata.

## Installation

Requires **Node.js 24 or newer** and npm. From the repository:

```bash
npm ci
npm test
npm pack
# Install globally from the generated local archive:
npm install -g ./promptlint-ai-1.0.0.tgz
```

For a consuming project, use `npm install /absolute/path/to/promptlint-ai-1.0.0.tgz`. After manual publication, registry installation would be `npm install promptlint-ai` (library) or `npm install -g promptlint-ai` (CLI).

## Quick start

Start everything with one command from this repository:

```bash
npm start
```

Choose **Offline** to enter a prompt immediately. Choose **Online** for five actions: analyze a prompt, improve a prompt, analyze a file, improve a file, or API setup/help. Use **0** to go back or exit. After global installation, `promptlint-ai` opens the same menu.

The CLI automatically loads `.env` from your current directory. Existing shell variables take precedence; run `unset GROQ_API_KEY` if an old shell key overrides your local file. Offline works without either.


Without installing globally:

```bash
node bin/cli.js analyze "Write good code" --offline
node bin/cli.js analyze "Translate hello into French" --json
node examples/offline.js
```

```js
import { analyzePrompt, formatReport } from 'promptlint-ai';

const report = analyzePrompt('Write good code');
console.log(report.score); // 70
console.log(report.mode);  // offline
console.log(formatReport(report));
```

## Offline analysis

Offline is always the default, even if `GROQ_API_KEY` exists. It requires no key or network connection and never constructs a Groq request.

```bash
promptlint-ai analyze "Write good code"
promptlint-ai analyze --file examples/cli-example.txt --offline
printf 'Explain recursion' | promptlint-ai analyze --json
```

| Rule ID | Severity | Check |
| --- | --- | --- |
| `empty-prompt` | error | Empty or whitespace-only input |
| `vague-language` | warning | Subjective wording without recognized concrete criteria |
| `missing-context` | warning | Missing task subject, website requirements, or relevant technology |
| `output-format` | info | Structured-data requests without a recognized format |
| `contradictions` | error | Some exclusive formats/languages, word counts, or code instructions conflict |
| `duplicate-instructions` | info | Repeated instructions after text normalization |
| `prompt-length` | info | Configurable character or word limits exceeded |
| `repeated-text` | warning | A word repeats at least eight consecutive times |

Unclear requirements and missing technical details are covered by the contextual and vague-language checks. A short prompt such as `Translate hello into French` or `Explain recursion` scores 100 under defaults; neither requires a role, an output format, or unrelated technical details.

## Groq AI analysis

Explicitly selecting AI sends the prompt through the configured shared service to Groq, or directly to Groq when using your own key:

```bash
promptlint-ai analyze "Write good code" --ai
promptlint-ai analyze --file examples/cli-example.txt --ai --json
promptlint-ai analyze "Explain recursion" --ai --model openai/gpt-oss-120b --timeout 45000
```

The default model is **`openai/gpt-oss-20b`**, listed in Groq's [supported models](https://console.groq.com/docs/models). It supports [strict structured output](https://console.groq.com/docs/structured-outputs), verified during implementation on November 23, 2026. The SDK uses Chat Completions with a JSON schema. Every response is validated locally, including types, required fields, array limits, score bounds, and nonempty rewrite text.

With `responseFormat: 'auto'`, the built-in known strict models (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `meta-models/muse-spark-open`) use JSON schema output. Other configured models use JSON object mode plus the same local validation. Model support can change; consult Groq's documentation before overriding it. You can explicitly select `json_schema` or `json_object` through the API.

## API key setup (server owner or optional direct mode)

Users of a configured shared service do not need a key. These instructions apply to the service owner or users who deliberately choose direct mode.

Create a key in the [Groq console](https://console.groq.com/keys), then configure `GROQ_API_KEY` locally. Never share a real key in chat, commit it, or include it in the prompt.

For Bash or Zsh, a hidden input avoids writing the key into shell history:

```bash
bash -c 'read -rsp "Groq API key: " GROQ_API_KEY; echo; export GROQ_API_KEY; node bin/cli.js analyze "Explain recursion" --ai'
```

For repeated use, set `GROQ_API_KEY` using your shell's environment configuration or a local secret manager. PowerShell users can set `$env:GROQ_API_KEY` in their session. The CLI never requests a secret interactively.

For optional local direct-mode testing, create a private `.env` containing `GROQ_API_KEY=your_key` and load it with Node:

```bash
node --env-file=.env bin/cli.js analyze "Explain recursion" --ai
```

`.env` and `.env.*` are ignored by Git. The CLI automatically loads the current directory’s `.env`; importing the library does not load environment files.

## AI prompt improvement

```bash
promptlint-ai improve "Write good code for a website"
promptlint-ai improve --file examples/cli-example.txt --output improved.txt
promptlint-ai improve "Write good code" --copy
```

```js
import { improvePrompt } from 'promptlint-ai';

const result = await improvePrompt('Write good code for a website', {
  provider: 'groq'
});
if (result.mode === 'ai') {
  console.log(result.improvedPrompt);
  console.log(result.explanation);
  console.log(result.improvements);
  console.log(result.clarificationQuestions);
} else {
  console.warn(result.warnings.join('\n'));
}
```

The system instructions require preservation of intent, concise rewriting, and placeholders for necessary missing details. They prohibit inventing a technology, audience, constraint, feature, or deliverable. This is a model instruction, not a semantic guarantee: review the rewrite before using it.

Improvement returns the full evaluation from **one** API request. On API failure, it returns offline feedback with no `improvedPrompt`; export is then unavailable. `--output` writes only the improved prompt to a new UTF-8 file with restrictive permissions where supported. Existing files are never overwritten. Clipboard copying is explicit and optional: macOS uses `pbcopy`, Windows uses `clip.exe`, and Linux tries `wl-copy`, `xclip`, or `xsel`. If unavailable, the report suggests `--output`.

## CLI reference

| Command | Behavior |
| --- | --- |
| `promptlint-ai` | Interactive menu in a TTY; otherwise analyze stdin offline |
| `promptlint-ai analyze "prompt"` | Offline analysis |
| `promptlint-ai analyze "prompt" --ai` | Explicit Groq analysis |
| `promptlint-ai improve "prompt"` | Explicit Groq evaluation and rewrite |
| `promptlint-ai rules` | List available checks |
| `promptlint-ai --help` | Full usage |
| `promptlint-ai --version` | Print version |

Options: `--file PATH`, `--offline`, `--ai`, `--model ID`, `--timeout MS`, `--json`, `--no-color`, `--ascii`, `--copy`, and `--output PATH`. Model, timeout, copy, and output require AI mode. `--ai` conflicts with `--offline`. A single quoted positional argument is also accepted as shorthand for `analyze`.

In the menu, first choose Offline or Online. Offline opens prompt input directly; Online offers five actions and a Back option. Enter `:file PATH` as the first prompt line to use a file, or select a file action from the Online menu. **Press Enter to submit your prompt immediately.** Use a text file for multiline prompts. Empty input asks you to enter a prompt again. The menu labels which choices transmit data.

Successful `--json` output is exclusively JSON, including fallback warnings and export status. Usage and setup errors have empty stdout and a safe message on stderr. Exit codes:

- **0:** successful analysis (findings do not count as CLI errors).
- **1:** invalid input, invalid options, unreadable input, or missing AI key.
- **2:** AI fell back to offline analysis, or a requested copy/save could not complete.

## JavaScript API

```js
import {
  analyzePrompt, analyzePromptAI, improvePrompt,
  formatReport, getAvailableRules
} from 'promptlint-ai';
```

### `analyzePrompt(prompt, options?)`

Synchronous offline analysis. Accepts a primitive string, including empty input. Returns `mode: 'offline'`, `scoreSource: 'heuristic'`, original `prompt`, `score`, `grade`, `issues`, `suggestions`, `summary`, `rulesChecked`, `issuesFound`, `deductions`, `totalDeduction`, and `stats`.

Offline `issuesFound` counts distinct triggered rules, while `issues.length` counts individual findings. `rulesChecked` counts enabled rules considered, including inapplicable ones. Issues contain `ruleId`, `severity`, `message`, and `suggestion`. Each deduction contains `ruleId`, `severity`, and `points`. Stats count Unicode code points and whitespace-delimited words, **not tokens**.

### `analyzePromptAI(prompt, options?)` / `improvePrompt(prompt, options?)`

Async AI calls requiring a nonempty string and either a shared service URL or a direct Groq key. Successful reports identify `transport` as `shared` or `direct` and have `mode: 'ai'`, `scoreSource: 'ai-subjective'`, `provider`, `model`, `prompt`, `originalPrompt`, `score`, `grade`, `dimensions`, `issues`, `issuesFound`, `suggestions`, `summary`, `improvedPrompt`, `explanation`, `improvements`, and `clarificationQuestions`. AI findings use `ruleId: 'ai-evaluation'`; `issuesFound` counts findings. AI reports do not fabricate offline rule counts or deductions.

Default fallback returns the normal offline result with `requestedMode: 'ai'`, `fallbackReason`, and `warnings`. It has no AI dimensions, provider score, or rewrite. With `fallback: false`, failures reject with a sanitized `AIError` containing a stable `code`. Missing keys always reject with setup instructions.

### `formatReport(report, options?)`

Returns a styled string; does not print. Options: `color` (boolean), `unicode` (boolean), and `width` (terminal columns, default terminal width or 80, capped at 88). Pass an intact analysis result. `NO_COLOR` takes precedence over color requests. Very narrow widths use compact output. Human-facing prompt/model text has terminal control sequences removed; JSON and file exports preserve actual content.

### `getAvailableRules()`

Returns fresh metadata objects containing `id`, `name`, `description`, and default `severity`.

## Configuration

Offline options:

```js
analyzePrompt('Write good code', {
  rules: { 'vague-language': true, 'contradictions': false },
  maxLength: 3000,
  maxWords: 600,
  weights: { info: 5, warning: 15, error: 30 }
});
```

Defaults: all rules enabled, `maxLength: 10000`, `maxWords: 2000`, weights of 5/15/30. Length limits must be positive safe integers; severity weights are integers from 0 to 100. Partial maps merge with defaults. Unknown options and invalid types throw `TypeError`; input/options are never mutated.

AI options:

| Option | Default | Purpose |
| --- | --- | --- |
| `provider` | `groq` | Only supported provider |
| `apiKey` | `process.env.GROQ_API_KEY` in direct mode | Explicit key selects trusted server-side direct access |
| `serviceUrl` | `PROMPTLINT_SERVICE_URL`, then packaged URL | Shared HTTPS origin; no personal key needed |
| `model` | `openai/gpt-oss-20b` | Configurable Groq model ID |
| `timeoutMs` | `30000` direct / `120000` shared | Integer request deadline, 1–300000 ms |
| `fallback` | `true` | Return labeled offline feedback on API failure |
| `offlineOptions` | Offline defaults | Configuration used for fallback analysis |
| `responseFormat` | `auto` | `auto`, `json_schema`, or `json_object` |

A configured shared service takes precedence over an environment Groq key. An explicitly supplied `apiKey` selects direct mode. Set `serviceUrl: ''` or an empty `PROMPTLINT_SERVICE_URL` to disable the packaged URL for direct-mode testing. Explicit `serviceUrl` and `apiKey` cannot be combined. Shared mode rejects client model/response-format overrides; the server controls them.

SDK retries are disabled to keep request count and deadlines predictable. No network request is triggered by merely importing the package or setting an API key.

## Scoring methodology

Offline scoring starts at 100 and deducts the configured severity weight **once per triggered rule**, then clamps to 0–100. Disabled and inapplicable rules cost nothing. `totalDeduction` is the sum before clamping. Empty input triggers one error, so its default score is 70; always inspect findings rather than treating a grade as a usability verdict. You can set `weights.error: 100` to zero the score on an error.

AI scoring is a separate subjective estimate:

| Dimension | Weight |
| --- | --- |
| Clarity | 25% |
| Context | 25% |
| Specificity | 20% |
| Output requirements (`outputFormat`) | 15% |
| Consistency | 15% |

Each dimension must be a finite number from 0–100. The application calculates and rounds the weighted average; it does not accept a model-supplied overall score. For example, dimensions 90/75/80/85/80 yield 82. Offline and AI scores are never blended.

Both modes use: 90–100 Excellent; 75–89 Good; 50–74 Needs improvement; 0–49 Poor. Neither score objectively measures AI performance or guarantees useful output. Offline scores are deterministic; AI responses can vary.

## Privacy and API usage

Offline analysis never transmits prompts. Shared AI sends your prompt to the configured server, which adds fixed evaluation instructions/schema and forwards it to Groq. Direct AI sends the prompt and these instructions to Groq directly. Keys are used for authentication, not inserted into model messages. Only the selected file's prompt content is read for analysis; unrelated local files and environment configuration are not sent. No prompt history is saved.

The SDK endpoint is fixed to Groq and debug logging is disabled. Errors use fixed messages instead of raw provider exceptions. Prompts are treated as untrusted data in system instructions; the package executes no model-generated code. Clipboard export never uses a shell. Review prompts before choosing AI mode, and do not put secrets into prompt text.

Both Online transports need internet access. Rate limits and charges may apply depending on your account; see [Groq rate limits](https://console.groq.com/docs/rate-limits) and your account settings. API keys belong in trusted Node.js environments, never browser bundles.

## Error handling

Safe AI codes include `MISSING_KEY`, `AUTH`, `RATE_LIMIT`, `TIMEOUT`, `REQUEST`, `UNAVAILABLE`, and `INVALID_RESPONSE`. Authentication failures suggest checking key/account permissions; request failures suggest checking the model, format, or input size. Malformed, incomplete, or schema-invalid responses are discarded. No raw provider message, stack, response content, or credentials are returned in fallback warnings.

```js
try {
  const report = await analyzePromptAI('Explain recursion', { fallback: false });
  console.log(report.score);
} catch (error) {
  console.error(error.code ?? 'INPUT', error.message);
}
```

## Project structure

```text
bin/cli.js
server/app.js, server/index.js
render.yaml
src/
  index.js, analyzer.js, scoring.js, suggestions.js, formatter.js, text.js
  ai/
    groqClient.js, aiAnalyzer.js, promptImprover.js, schemas.js, aiInstructions.js
    sharedClient.js, serviceConfig.js
  rules/
    index.js, vagueLanguage.js, missingContext.js, outputFormat.js
    contradictions.js, duplicateInstructions.js, promptLength.js
  cli/
    commands.js, ui.js, prompts.js, progress.js, clipboard.js
tests/
  analyzer.test.js, scoring.test.js, rules.test.js, formatter.test.js
  aiAnalyzer.test.js, promptImprover.test.js, cli.test.js, commands.test.js
  sharedService.test.js
  fixtures/evaluation.js
examples/
  offline.js, groq.js, customRules.js, cli-example.txt
scripts/check.js, scripts/configure-server.js
package.json, package-lock.json, .gitignore, README.md, LICENSE
```

## Testing

```bash
npm ci
npm test
npm run check
npm run pack:check
npm pack
```

Automated tests require no real key and make no live AI calls. They mock the Groq client or its fetch transport; shared-service tests use a temporary loopback HTTP server, and cover scoring, false positives, invalid responses, credential-safe errors, authentication, rate limits, network failures, deadlines, fallback, menu input, exports, formatting, and CLI behavior.

For a manual live check after configuring your own key: `node examples/groq.js`. This deliberately sends its example prompt to Groq and may incur usage. Automated tests use mocked responses and do not require a real key.

## Limitations

English regex rules do not understand arbitrary semantics. Quoted text and code fences are masked where practical; malformed or nested quotes can be misread. Context checks recognize common wording, not every technology or task. Contradiction detection deliberately skips conditional/alternative markers and some separately scoped instructions. Duplicate detection compares normalized text, not paraphrases.

AI schema validation ensures structure, not truth or intent preservation. Rewrites can still require correction. Future model changes may require updating strict-output support. Long input is read into memory; character and word counts are not model-specific token counts. Clipboard tools depend on the operating system/session, and exact Unicode widths vary by terminal. Installation requires npm access or cached dependencies even though offline analysis itself does not.

## Contributing and manual publication

Open an issue or focused pull request at [hetjaviya15/PromptLint](https://github.com/hetjaviya15/PromptLint). Keep rules understandable, document limitations, and add realistic regression tests. Never add real keys or require live AI calls in the normal test suite.

Commit and push only when ready:

```bash
git add .
git commit -m "Implement PromptLint AI with Groq integration and interactive CLI"
git push -u origin HEAD
```

Before publishing, run `npm view promptlint-ai name version`. A genuine registry 404 can indicate an unregistered name; network errors cannot. If taken, rename metadata, lockfile, executable, examples, tests, and docs consistently. After confirming an appropriate name:

```bash
npm test
npm run check
npm run pack:check
npm pack
npm login
npm publish ./promptlint-ai-1.0.0.tgz --access public
```

No commit, push, or publication is performed automatically.

## License and author

[MIT](LICENSE), copyright 2026 [Het Javiya](https://github.com/hetjaviya15).
