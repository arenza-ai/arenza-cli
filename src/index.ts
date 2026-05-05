/**
* @arenza/cli — programmatic entry point.
 *
 * If you need to embed an Arenza scan inside your own Node program (e.g.
 * a CI step, a dashboard build job, or a Slack bot) without spawning a
 * subprocess, import the helpers below. Otherwise use the `arenza` bin
 * from the command line: `npx arenza scan <domain>`.
 *
 * For the underlying typed MCP client see `arenza-mcp-client`.
 */

export { runScan } from './scan.js';
export { renderMarkdownReport } from './report.js';
export type { ScanOptions, ScanResult } from './scan.js';
