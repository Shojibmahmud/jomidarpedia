#!/usr/bin/env node
// `npm run lighthouse`: Lighthouse on the static export (roadmap task 13.1; spec 13 FR-1, FR-5, D1, D11, A-1).
// Serves out/ with the same headers as Vercel (serve.json), runs Lighthouse's default mobile settings 3 times on
// each URL with Playwright's Chromium, and takes the median run by performance score. It fails when the median
// run's Accessibility score is under 0.95 or its SEO score under 0.9; the Performance score is printed but never
// fails the run (CI machines vary too much). Size budgets are checked without a browser by check-budgets.mjs.
// Run on an indexable build: a local or preview build is noindex, which Lighthouse rightly marks down for SEO.
// Reports are written to .lighthouse/ (one JSON per run, and summary.json).

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const PORT = 4174;
export const URLS = ['/', '/explore/', '/site/JB-DHK-064/baliati-palace/'];
export const RUNS = 3;
export const MIN = { accessibility: 0.95, seo: 0.9 };
const OUT = '.lighthouse';

/** The run with the median performance score (Lighthouse CI's "median-run"). */
export function medianRun(runs) {
  const sorted = [...runs].sort((a, b) => (a.categories.performance.score ?? 0) - (b.categories.performance.score ?? 0));
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Failures for one URL's median run, naming the failing audits so the log says what to fix. */
export function assertRun(url, lhr) {
  const problems = [];
  for (const [cat, min] of Object.entries(MIN)) {
    const score = lhr.categories[cat].score ?? 0;
    if (score >= min) continue;
    const failing = lhr.categories[cat].auditRefs
      .map(r => lhr.audits[r.id])
      .filter(a => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
      .map(a => a.id);
    problems.push(`${url}: ${cat} ${score.toFixed(2)} < ${min} (failing: ${failing.join(', ') || 'none listed'})`);
  }
  return problems;
}

function startServer() {
  const server = spawn('npx', ['serve', 'out', '--config', '../serve.json', '--listen', String(PORT), '--no-clipboard', '--no-port-switching'], { stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve did not start within 30 s')), 30_000);
    server.stdout.on('data', d => { if (/Accepting connections|Local:/.test(String(d))) { clearTimeout(timer); resolve(server); } });
    server.on('exit', code => reject(new Error(`serve exited with ${code}`)));
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });
  const problems = [];
  const summary = [];
  try {
    for (const path of URLS) {
      const url = `http://localhost:${PORT}${path}`;
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error' });
        runs.push(result.lhr);
        writeFileSync(`${OUT}/${path.replace(/\W+/g, '_') || 'home'}-${i + 1}.json`, result.report);
      }
      const lhr = medianRun(runs);
      const scores = Object.fromEntries(['performance', 'accessibility', 'best-practices', 'seo'].map(c => [c, lhr.categories[c]?.score ?? null]));
      summary.push({ url: path, scores });
      console.log(`${path}: ${Object.entries(scores).map(([c, s]) => `${c} ${s === null ? '–' : s.toFixed(2)}`).join(', ')}`);
      problems.push(...assertRun(path, lhr));
    }
  } finally {
    await chrome.kill();
    server.kill();
  }
  writeFileSync(`${OUT}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  for (const p of problems) console.log(`FAIL ${p}`);
  if (problems.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
