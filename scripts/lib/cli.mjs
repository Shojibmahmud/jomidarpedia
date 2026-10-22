// Shared command-line wrapper: resolve the mode, run the builders, write the report, set the exit code.

import { resolveMode } from '../data-mode.mjs';
import { combine, discardOutputs, writeReport, printSummary, REPORT_PATH } from './report.mjs';

/** @param {Array<(mode: string) => object>} builders @param {Record<string, string | undefined>} [env] */
export function runCli(builders, env = process.env) {
  const { mode, notice } = resolveMode(env);
  if (notice) console.log(`notice: ${notice}`);
  console.log(`data mode: ${mode}`);
  const results = builders.map(build => build(mode));
  results.forEach(r => r.info?.forEach(line => console.log(line)));
  const c = combine(results, mode);
  if (c.structural.length) discardOutputs(results);
  writeReport(c, REPORT_PATH);
  printSummary(c, REPORT_PATH);
  if (c.fatal) process.exitCode = 1;
  return c;
}
