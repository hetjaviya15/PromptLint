# PromptLint

**Analyze AI prompts before sending them to an LLM.**

PromptLint is a lightweight JavaScript library and CLI that checks prompts using deterministic rules. It helps identify unclear requests before you send them to ChatGPT, Claude, Gemini, Groq, or another model. It works completely offline, has zero runtime dependencies, requires no AI API key, and never sends prompts to a service.

The npm name **`promptlint-lite` is provisional**. Registry availability could not be verified during development because registry DNS access failed. This repository does not claim npm publication. Confirm the name before publishing or using registry installation commands.

## Features

- Eight independently configurable rules with contextual checks.
- Vague language, missing context, structured output, and explicit contradiction checks.
- Duplicate instructions, empty input, configurable length limits, and repeated words.
- Actionable suggestions, deterministic scores, and transparent deductions.
- Native ES modules, file and stdin support, human-readable and JSON CLI reports.
- No minimum prompt length, mandatory persona, AI model, or network calls.

## Installation

Requires Node.js 24 or newer (Node.js 24 LTS is the baseline) and npm. From a local checkout:

```bash
npm ci
npm test
npm pack
# Run this in the project where you want to use the library:
npm install /absolute/path/to/PromptLint/promptlint-lite-1.0.0.tgz
```

After the name has been confirmed and the package manually published, registry installation would be `npm install promptlint-lite`. To install the local CLI globally, use `npm install -g ./promptlint-lite-1.0.0.tgz`.

## Quick start

```js
import { analyzePrompt, formatReport } from 'promptlint-lite';

const result = analyzePrompt('Write good code for a website');
console.log(result.score); // 70
console.log(formatReport(result));
```

Run the checked-in examples with `node examples/basic.js` and `node examples/customRules.js`.

## Sample analysis results

For `Write good code`, these fields are returned (the full result also includes the prompt, summary, suggestions, deductions, totalDeduction, and stats):

```json
{
  "score": 70,
  "grade": "Needs improvement",
  "issues": [
    {
      "ruleId": "vague-language",
      "severity": "warning",
      "message": "Potentially vague wording: good.",
      "suggestion": "Replace subjective wording with concrete requirements or measurable acceptance criteria."
    },
    {
      "ruleId": "missing-context",
      "severity": "warning",
      "message": "The programming request does not specify a language or framework.",
      "suggestion": "Specify a language or framework, or explicitly allow any language."
    }
  ],
  "rulesChecked": 8,
  "issuesFound": 2
}
```

`Translate hello into French` and `Explain recursion` both score 100 under the defaults. A score of 100 means the enabled rules found no issues; it does not guarantee a useful model response.

## CLI usage

After local installation, use `npx --no-install promptlint-lite`; after global installation, use `promptlint-lite` directly:

```bash
promptlint-lite "Write good code"
promptlint-lite --file prompt.txt
promptlint-lite --file prompt.txt --json
printf 'Explain recursion' | promptlint-lite --json
promptlint-lite --help
promptlint-lite --version
promptlint-lite -- "--a prompt starting with dashes"
```

Inside this repository, `node bin/cli.js "Write good code"` requires no installation. Quote the entire positional prompt. Use one positional argument or one file; when neither is supplied, the CLI reads non-interactive stdin. An explicitly empty string or empty stream is analyzed as an empty prompt. Interactive invocation without input gives a usage error.

Exit code **0** means analysis succeeded, including when findings exist. Exit code **1** means a usage or input error. Errors go to stderr; successful `--json` output contains only valid JSON. Files are read as UTF-8. Library configuration options are not exposed as CLI flags.

## Available rules

| ID | Default severity | Check |
| --- | --- | --- |
| `empty-prompt` | error | Empty or whitespace-only prompt |
| `vague-language` | warning | Subjective wording in requests without recognized explicit criteria |
| `missing-context` | warning | Missing technology, website requirements, or content subject when relevant |
| `output-format` | info | Extraction or structured-data requests without a recognized format |
| `contradictions` | error | Conflicting exclusive formats/languages, exact word counts, or code requirements |
| `duplicate-instructions` | info | Repeated instructions after case, punctuation, and whitespace normalization |
| `prompt-length` | info | More than the configured character or word limit |
| `repeated-text` | warning | A word repeated at least eight times consecutively |

`getAvailableRules()` returns fresh metadata objects containing `id`, `name`, `description`, and `severity` (the default severity). To add an internal rule, export an object with those fields and a `check(text, context)` function, then register it in `src/rules/index.js`. Checks return arrays of `{ message, suggestion }` findings. Context supplies the original prompt, statistics, and validated options. There is no public plugin API.

## Configuration options

```js
import { analyzePrompt } from 'promptlint-lite';

const result = analyzePrompt('Extract names and dates', {
  rules: { 'vague-language': true, 'contradictions': false },
  maxLength: 3000,
  maxWords: 600,
  weights: { info: 5, warning: 15, error: 30 }
});
```

| Option | Default | Accepted values |
| --- | --- | --- |
| `rules` | All enabled | Object mapping documented IDs to booleans |
| `maxLength` | 10000 | Positive safe integer; Unicode code points |
| `maxWords` | 2000 | Positive safe integer; whitespace-delimited words |
| `weights` | info 5, warning 15, error 30 | Object with integer severity weights from 0 to 100 |

Partial objects merge with defaults. Unknown options, unknown rule IDs, invalid weights, and invalid option types throw `TypeError`. Input and configuration objects are never mutated. Zero weights are allowed; findings remain visible even when their penalty is zero. Explicit `null` is invalid.

## Public API reference

### `analyzePrompt(prompt, options?)`

Accepts a primitive string and an optional plain object; returns a new synchronous result:

| Field | Meaning |
| --- | --- |
| `prompt` | Unmodified original input |
| `score`, `grade` | Heuristic score and its grade |
| `issues` | Findings with ruleId, severity, message, suggestion |
| `suggestions` | Unique suggestions in finding order |
| `summary` | Human-readable finding summary |
| `rulesChecked` | Number of enabled rules considered, including those inapplicable to this input |
| `issuesFound` | Number of distinct rules reporting findings, not the length of `issues` |
| `deductions` | One `{ ruleId, severity, points }` per triggered rule |
| `totalDeduction` | Sum of deductions before clamping |
| `stats` | `{ characters, words }` for the original input |

Non-string input throws `TypeError`. Empty input returns a finding. On whitespace-only input, contextual checks are skipped. Normalization and quote masking affect analysis only; character and word counts include quoted material.

### `formatReport(result)`

Converts an `analyzePrompt` result to a readable string including grades, findings, suggestions, and deductions. It does not write to the console. Pass an intact analysis result; this is not a general-purpose arbitrary JSON validator.

### `getAvailableRules()`

Returns metadata for the eight built-in rules. Changing returned metadata does not change the analyzer.

## Scoring methodology

Start at 100 and deduct the configured severity weight **once per triggered rule**, even if the rule emits several findings. Clamp the result to 0–100:

```text
score = max(0, min(100, 100 - totalDeduction))
```

| Score | Grade |
| --- | --- |
| 90–100 | Excellent |
| 75–89 | Good |
| 50–74 | Needs improvement |
| 0–49 | Poor |

Disabled and inapplicable rules deduct nothing. An empty prompt triggers a single error and therefore scores 70 at default weights; inspect the finding as well as the grade. Grades describe this fixed penalty scale, not whether a prompt is usable. Set `weights.error` to 100 if any error should zero the score. Short prompts incur no penalty solely for being short.

This is a **heuristic lint score, not an objective measure of AI performance**. Actual AI evaluation involves model responses and task-specific criteria. Identical input and options produce identical results.

## Limitations

- English keyword and regex checks cannot understand intent, verify facts, assess safety, or predict response quality.
- Quoted strings, inline backticks, and fenced code are masked where practical. Quoting actual instructions can hide relevant requirements; nested or malformed quoting may be misread.
- Context checks use common technology and purpose signals, not a complete vocabulary. A language or format mention elsewhere can satisfy a check even when it is unrelated.
- Contradictions recognize only the documented directive patterns. Prompts containing conditional/alternative markers or explicit first/second-part scopes skip contradiction detection to reduce false positives. Other scoped instructions can still be misread.
- Duplicate checks handle normalized exact repeats, not semantic paraphrases. Repetition checks detect consecutive repeated words, not arbitrary repeated passages. Both can flag genuinely distinct repetition problems.
- Length limits are configurable review hints. Counts are Unicode code points and whitespace-delimited words, **not model-specific tokens**.
- The CLI reads input into memory; choose sensible input sizes. There is no streaming analysis.
- The package name remains provisional and nothing has been published automatically.

## Project structure

```text
bin/cli.js
src/
  index.js
  analyzer.js
  scoring.js
  suggestions.js
  formatter.js
  text.js
  rules/
    index.js
    vagueLanguage.js
    missingContext.js
    outputFormat.js
    contradictions.js
    duplicateInstructions.js
    promptLength.js       # empty, long, and repeated-text checks
scripts/check.js
tests/
  analyzer.test.js
  scoring.test.js
  rules.test.js
  formatter.test.js
  cli.test.js
examples/
  basic.js
  customRules.js
  cli-example.txt
package.json
package-lock.json
README.md
LICENSE
.gitignore
```

## Testing

```bash
npm ci
npm test
npm run check
npm run pack:check
npm pack
node examples/basic.js
node bin/cli.js --file examples/cli-example.txt --json
```

Tests use only `node:test` and built-in assertions. They cover input validation, deterministic scoring, boundaries, quoted text, contextual false positives, rule configuration, reports, file input, stdin, JSON output, and CLI errors. The package has no runtime or development dependencies.

## Contributing

Open an issue or propose a focused pull request at [hetjaviya15/PromptLint](https://github.com/hetjaviya15/PromptLint). Keep checks understandable, document heuristic limitations, and add realistic positive and false-positive tests. Run tests, syntax checks, and the package dry run before submitting.

## Manual publication

Check availability with `npm view promptlint-lite name version`. A genuine registry 404 can indicate an unregistered name; network errors cannot. Availability does not reserve a name or guarantee publishing permission. If taken, choose another name and update package metadata, the lockfile, bin name, examples, tests, and documentation consistently.

After confirming an appropriate name and reviewing the tarball:

```bash
npm test
npm run check
npm run pack:check
npm pack
npm login
npm publish ./promptlint-lite-1.0.0.tgz --access public
```

No credentials are stored by this project. Publishing and GitHub pushes are manual actions.

## License

[MIT](LICENSE) — Copyright 2026 Het Javiya.

## Author

[Het Javiya](https://github.com/hetjaviya15)
