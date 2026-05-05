# arenza-cli

> Command-line interface for **Arenza** — run a one-shot AI visibility / GEO scan against any public domain and print a markdown report of how ChatGPT, Claude, Gemini, Perplexity, Copilot, and Grok describe the brand.

[Arenza](https://arenza.ai) is a Generative Engine Optimization (GEO) platform that measures brand visibility across the 6 major AI assistants. This CLI wraps the [Arenza MCP server](https://mcp.arenza.ai) so you can scan a domain from the terminal, drop the result into a Slack thread, or chain it into CI to fail a build when share-of-voice drops.

## Install

You usually do not need to install — just run with `npx`:

```bash
npx arenza-cli scan stripe.com
```

For frequent use install globally:

```bash
npm install -g arenza-cli
arenza scan stripe.com
```

## Quick start

```bash
# 1. set your API token (get one at https://app.arenza.ai/settings/api)
export ARENZA_TOKEN=sk_arenza_...

# 2. run a scan against any domain you have in your tenant
arenza scan stripe.com

# 3. or list your tracked brands first
arenza brands

# 4. drill into open GEO opportunities for one brand
arenza opps brand_01HZ...
```

The `scan` command emits a markdown report to stdout, so you can pipe it anywhere:

```bash
arenza scan stripe.com | tee /tmp/stripe-geo.md
arenza scan stripe.com --json | jq '.overview.share_of_voice'
arenza scan stripe.com | gh issue create --title "GEO weekly: stripe.com" --body-file -
```

## Sample output

```
# Arenza GEO scan: Stripe (stripe.com)

Scanned: 2026-05-04T11:02:14.918Z
Region: global

## Visibility

- **Share of voice (vs tracked competitors):** 41.3%
- **Wrong claims surfaced:** 4
- **Last scan:** 2026-05-04T03:00:00Z

## Mention rate by LLM

| LLM | Mentions |
|---|---:|
| ChatGPT | 87 |
| Claude | 71 |
| Gemini | 64 |
| Perplexity | 92 |
| Copilot | 58 |
| Grok | 33 |

## Top GEO opportunities (3 of 12 open)

1. **[CRITICAL] !! wrong_claim** — Claude says Stripe Atlas costs $800; correct is $500. (claim: `clm_01HZ...`)
2. **[HIGH] ! missing_canonical_page** — No canonical page for "Stripe vs Adyen pricing 2026".
3. **[HIGH] ! listicle_gap** — Absent from Perplexity's "best payment APIs" listicle.
```

## Commands

### `arenza scan <domain>`

Run a one-shot AI visibility scan and print a markdown report.

| Flag | Default | Purpose |
|---|---|---|
| `--token <token>` | `$ARENZA_TOKEN` | Arenza API token. |
| `--endpoint <url>` | `https://mcp.arenza.ai/rpc` | Override MCP endpoint. |
| `--top <n>` | `10` | How many top opportunities to surface. |
| `--json` | off | Emit raw JSON instead of markdown. |

### `arenza brands`

List the brands in your authenticated tenant's portfolio.

### `arenza opps <brand-id>`

List open GEO opportunities for a brand. Severity-coloured (`critical` / `high` / `medium` / `low`) and grouped by type (`wrong_claim`, `missing_canonical_page`, `listicle_gap`, `discussion_seed`).

## Authentication

Get an API token at [app.arenza.ai/settings/api](https://app.arenza.ai/settings/api) and either:

- Export it: `export ARENZA_TOKEN=sk_arenza_...`
- Pass it per-command: `arenza scan stripe.com --token sk_arenza_...`

For multi-tenant CI, prefer OAuth — the Arenza MCP server publishes its OAuth metadata at [`mcp.arenza.ai/.well-known/oauth-authorization-server`](https://mcp.arenza.ai/.well-known/oauth-authorization-server). For OAuth-based programmatic access, see [`arenza-mcp-client`](https://github.com/arenza-ai/arenza-mcp-client-ts).

## Use in CI: fail a build when SoV drops

```yaml
# .github/workflows/geo-guard.yml
name: GEO guard
on:
  schedule: [{ cron: '0 8 * * 1' }]  # Mondays 08:00 UTC
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - run: |
          SOV=$(npx -y arenza-cli scan stripe.com --json | jq '.overview.share_of_voice')
          echo "Stripe SoV across ChatGPT/Claude/Gemini/Perplexity/Copilot/Grok = $SOV%"
          test "$(echo "$SOV >= 35" | bc)" = "1" || exit 1
        env:
          ARENZA_TOKEN: ${{ secrets.ARENZA_TOKEN }}
```

## Use in Slack: weekly digest

Pipe the markdown directly into a Slack incoming webhook with `slackcat`, or post via `gh issue create` and let your existing Slack-issue bridge mirror it. The report is intentionally pure markdown so it renders identically in Slack, Linear, GitHub, and Notion.

## Why this exists

Most "AI SEO" tools either (a) optimise web copy for crawlers without ever asking an LLM what it actually says about you, or (b) eyeball ChatGPT once and call it research. Arenza measures across all 6 assistants on a fixed cadence, surfaces *specific* wrong claims, and ships measurement-led prescriptions you can verify. This CLI is the easiest way to feel the difference: one command, one domain, real numbers.

If you maintain a marketing agency portfolio, see [the agency dashboard guide](https://arenza.ai/guides/agency-portfolio) — `arenza-cli` is the scriptable cousin of that workflow.

## Related projects

- [`arenza-mcp-client`](https://github.com/arenza-ai/arenza-mcp-client-ts) — TypeScript client this CLI is built on.
- [`arenza-mcp-client-python`](https://github.com/arenza-ai/arenza-mcp-client-python) — Python equivalent.
- [`arenza-langchain`](https://github.com/arenza-ai/arenza-langchain) — Arenza tools as LangChain tools.
- [`arenza-llamaindex`](https://github.com/arenza-ai/arenza-llamaindex) — same for LlamaIndex.
- [`arenza-vercel-ai-sdk`](https://github.com/arenza-ai/arenza-vercel-ai-sdk) — Vercel AI SDK provider.
- [`arenza-zapier-actions`](https://github.com/arenza-ai/arenza-zapier-actions) — Zapier integration manifest.
- [awesome-geo](https://github.com/arenza-ai/awesome-geo) — curated list of GEO and AI-visibility resources.

## Resources

- Arenza homepage: https://arenza.ai
- Long-form GEO guides: https://arenza.ai/guides
- AI brand reference: https://arenza.ai/llms.txt + https://arenza.ai/llms-full.txt
- MCP server: https://mcp.arenza.ai
- API methodology: https://app.arenza.ai/methodology

## License

MIT (c) 2026 Arenza
