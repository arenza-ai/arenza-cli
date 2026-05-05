#!/usr/bin/env node
/**
 * `arenza` CLI — bin entry.
 *
 * Subcommands:
 *   arenza scan <domain>      one-shot AI visibility scan + markdown report
 *   arenza brands              list brands in your tenant
 *   arenza opps <brand-id>     list open GEO opportunities for a brand
 *
 * All commands honour ARENZA_TOKEN env var or --token flag. See
 * https://app.arenza.ai/settings/api for tokens.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ArenzaMCPClient } from '@arenza/mcp-client';
import { runScan } from './scan.js';
import { renderMarkdownReport } from './report.js';

const program = new Command();

program
  .name('arenza')
  .description(
    'Arenza CLI — measure brand visibility across ChatGPT, Claude, Gemini, Perplexity, Copilot, and Grok.',
  )
  .version('0.1.0');

program
  .command('scan')
  .description('Run a one-shot AI visibility / GEO scan against a public domain.')
  .argument('<domain>', 'domain to scan, e.g. stripe.com')
  .option('-t, --token <token>', 'Arenza API token (or set ARENZA_TOKEN)')
  .option('--endpoint <url>', 'override MCP endpoint')
  .option('--top <n>', 'how many top opportunities to surface', '10')
  .option('--json', 'emit raw JSON instead of markdown')
  .action(async (domain: string, opts: { token?: string; endpoint?: string; top: string; json?: boolean }) => {
    try {
      const result = await runScan({
        domain,
        token: opts.token,
        endpoint: opts.endpoint,
        topOpportunities: Number(opts.top),
      });
      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        const md = renderMarkdownReport(result, { topOpportunities: Number(opts.top) });
        process.stdout.write(md + '\n');
      }
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

program
  .command('brands')
  .description('List brands in your tenant portfolio.')
  .option('-t, --token <token>', 'Arenza API token (or set ARENZA_TOKEN)')
  .option('--endpoint <url>', 'override MCP endpoint')
  .action(async (opts: { token?: string; endpoint?: string }) => {
    try {
      const token = opts.token ?? process.env.ARENZA_TOKEN;
      if (!token) throw new Error('ARENZA_TOKEN not set; pass --token');
      const client = new ArenzaMCPClient({ token, endpoint: opts.endpoint });
      const brands = await client.listBrands();
      if (!brands.length) {
        console.log(chalk.yellow('No brands in this tenant. Add one at https://app.arenza.ai.'));
        return;
      }
      for (const b of brands) {
        console.log(`${chalk.bold(b.name)}  ${chalk.dim(b.domain)}  ${chalk.gray(`[${b.region}] ${b.id}`)}`);
      }
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

program
  .command('opps')
  .description('List open GEO opportunities for a brand.')
  .argument('<brand-id>', 'brand id (find via `arenza brands`)')
  .option('-t, --token <token>', 'Arenza API token (or set ARENZA_TOKEN)')
  .option('--endpoint <url>', 'override MCP endpoint')
  .action(async (brandId: string, opts: { token?: string; endpoint?: string }) => {
    try {
      const token = opts.token ?? process.env.ARENZA_TOKEN;
      if (!token) throw new Error('ARENZA_TOKEN not set; pass --token');
      const client = new ArenzaMCPClient({ token, endpoint: opts.endpoint });
      const opps = (await client.listOpportunities({ brand_id: brandId })).filter((o) => !o.done);
      if (!opps.length) {
        console.log(chalk.green('No open opportunities. Either you fixed everything or no scan has run yet.'));
        return;
      }
      for (const o of opps) {
        const sev = colorSeverity(o.severity);
        console.log(`${sev}  ${chalk.bold(o.type)}  ${o.description}`);
      }
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

function colorSeverity(sev: string): string {
  switch (sev) {
    case 'critical':
      return chalk.bgRed.white(' CRIT ');
    case 'high':
      return chalk.red(' HIGH ');
    case 'medium':
      return chalk.yellow(' MED  ');
    default:
      return chalk.gray(' LOW  ');
  }
}

function printError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(chalk.red('error:'), msg);
}

program.parseAsync(process.argv);
