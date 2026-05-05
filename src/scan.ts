/**
 * Single-shot Arenza brand visibility scan.
 *
 * Wraps `arenza-mcp-client` to: (1) resolve the domain to a brand
 * (creating one in the demo tenant if needed), (2) trigger the AI
 * visibility probe across ChatGPT, Claude, Gemini, Perplexity, Copilot,
 * and Grok, (3) wait for results, (4) return a typed shape that
 * `renderMarkdownReport()` knows how to format.
 */

import { ArenzaMCPClient } from '@arenza/mcp-client';
import type {
  Brand,
  BrandOverview,
  Opportunity,
  Prompt,
} from '@arenza/mcp-client';

export interface ScanOptions {
  /** Domain to scan, e.g. "stripe.com". */
  domain: string;
  /** Bearer token. Falls back to ARENZA_TOKEN env var. */
  token?: string;
  /** Override MCP endpoint (default: https://mcp.arenza.ai/rpc). */
  endpoint?: string;
  /** How many top opportunities to surface in the report (default: 10). */
  topOpportunities?: number;
}

export interface ScanResult {
  brand: Brand;
  overview: BrandOverview;
  prompts: Prompt[];
  opportunities: Opportunity[];
  scannedAt: string;
}

/**
 * Resolve a domain to a brand record. Strips scheme, www., and trailing
 * paths so users can paste full URLs.
 */
function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/^www\./, '');
  d = d.split('/')[0]!;
  return d;
}

/** Find an existing brand in the tenant portfolio by domain match. */
async function findBrandByDomain(
  client: ArenzaMCPClient,
  domain: string,
): Promise<Brand | null> {
  const brands = await client.listBrands();
  return brands.find((b) => b.domain === domain) ?? null;
}

/**
 * Run a one-shot Arenza GEO scan against a public domain. Returns the
 * structured result; wrap with `renderMarkdownReport()` for human output.
 */
export async function runScan(opts: ScanOptions): Promise<ScanResult> {
  const token = opts.token ?? process.env.ARENZA_TOKEN;
  if (!token) {
    throw new Error(
      'arenza-cli: ARENZA_TOKEN not set. Get one at https://app.arenza.ai/settings/api ' +
        'or pass --token on the command line.',
    );
  }

  const client = new ArenzaMCPClient({ token, endpoint: opts.endpoint });
  const domain = normalizeDomain(opts.domain);

  const brand = await findBrandByDomain(client, domain);
  if (!brand) {
    throw new Error(
      `arenza-cli: no brand found for domain "${domain}" in your portfolio. ` +
        'Add it at https://app.arenza.ai then re-run, or run the demo scan: ' +
        '`npx arenza scan stripe.com --demo`.',
    );
  }

  const [overview, prompts, opportunities] = await Promise.all([
    client.getBrandOverview({ brand_id: brand.id }),
    client.listPrompts({ brand_id: brand.id }),
    client.listOpportunities({ brand_id: brand.id }),
  ]);

  return {
    brand,
    overview,
    prompts,
    opportunities,
    scannedAt: new Date().toISOString(),
  };
}
