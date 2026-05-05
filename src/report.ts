/**
 * Markdown rendering for Arenza scan results.
 *
 * The output is designed to be both: (a) readable in a terminal piped to
 * `less`, (b) pasteable into a Slack/Linear/Notion update or a GitHub
 * comment. Uses no ANSI codes — colour is added separately by the bin
 * entry. Numbers always carry units; percentages are 1-decimal.
 */

import type { Opportunity, Prompt } from 'arenza-mcp-client';
import type { ScanResult } from './scan.js';

const LLM_NAMES = [
  'chatgpt',
  'claude',
  'gemini',
  'perplexity',
  'copilot',
  'grok',
] as const;

type LLM = (typeof LLM_NAMES)[number];

const LLM_LABEL: Record<LLM, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  grok: 'Grok',
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function rawPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function severityIcon(s: Opportunity['severity']): string {
  switch (s) {
    case 'critical':
      return '!!';
    case 'high':
      return '!';
    case 'medium':
      return '~';
    case 'low':
      return '.';
  }
}

function topPromptsByMentionRate(prompts: Prompt[], k: number): Prompt[] {
  const ranked = [...prompts].sort((a, b) => {
    const am = Object.values(a.mention_rate_by_llm);
    const bm = Object.values(b.mention_rate_by_llm);
    const aMax = am.length ? Math.max(...am) : 0;
    const bMax = bm.length ? Math.max(...bm) : 0;
    return bMax - aMax;
  });
  return ranked.slice(0, k);
}

/** Render a scan result as a markdown report. */
export function renderMarkdownReport(
  res: ScanResult,
  opts: { topOpportunities?: number } = {},
): string {
  const top = opts.topOpportunities ?? 10;
  const lines: string[] = [];

  lines.push(`# Arenza GEO scan: ${res.brand.name} (${res.brand.domain})`);
  lines.push('');
  lines.push(`Scanned: ${res.scannedAt}`);
  lines.push(`Region: ${res.brand.region}`);
  lines.push('');

  // ── overview ─────────────────────────────────────────────────────────
  lines.push('## Visibility');
  lines.push('');
  lines.push(`- **Share of voice (vs tracked competitors):** ${rawPct(res.overview.share_of_voice)}`);
  lines.push(`- **Wrong claims surfaced:** ${res.overview.wrong_claims}`);
  lines.push(`- **Last scan:** ${res.overview.last_scan_at}`);
  lines.push('');

  // ── per-LLM table ────────────────────────────────────────────────────
  lines.push('## Mention rate by LLM');
  lines.push('');
  lines.push('| LLM | Mentions |');
  lines.push('|---|---:|');
  for (const llm of LLM_NAMES) {
    const v = res.overview.mentions_per_llm[llm] ?? 0;
    lines.push(`| ${LLM_LABEL[llm]} | ${v} |`);
  }
  lines.push('');

  // ── top prompts ──────────────────────────────────────────────────────
  if (res.prompts.length) {
    lines.push('## Top probed prompts');
    lines.push('');
    lines.push('| Prompt | Intent | Branded | Best LLM | Best rate |');
    lines.push('|---|---|---|---|---:|');
    for (const p of topPromptsByMentionRate(res.prompts, 8)) {
      const entries = Object.entries(p.mention_rate_by_llm);
      let bestLlm = '—';
      let bestRate = 0;
      for (const [k, v] of entries) {
        if (v > bestRate) {
          bestLlm = k;
          bestRate = v;
        }
      }
      const safeText = p.text.replace(/\|/g, '\\|').slice(0, 80);
      lines.push(
        `| ${safeText} | ${p.intent} | ${p.branded ? 'yes' : 'no'} | ${bestLlm} | ${pct(bestRate)} |`,
      );
    }
    lines.push('');
  }

  // ── opportunities ────────────────────────────────────────────────────
  const open = res.opportunities.filter((o) => !o.done);
  if (open.length) {
    lines.push(`## Top GEO opportunities (${Math.min(top, open.length)} of ${open.length} open)`);
    lines.push('');
    open
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, top)
      .forEach((o, i) => {
        lines.push(
          `${i + 1}. **[${o.severity.toUpperCase()}] ${severityIcon(o.severity)} ${o.type}** — ${o.description}` +
            (o.linked_claim_id ? ` (claim: \`${o.linked_claim_id}\`)` : ''),
        );
      });
    lines.push('');
  }

  lines.push('---');
  lines.push('Powered by [Arenza](https://arenza.ai) — measure brand visibility across ChatGPT, Claude, Gemini, Perplexity, Copilot, and Grok.');
  return lines.join('\n');
}

function severityRank(s: Opportunity['severity']): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s];
}
