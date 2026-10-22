#!/usr/bin/env node
// `npm run data`: runs both data builders and writes one combined report
// (data/reports/release-problems.md). The mode comes from scripts/data-mode.mjs.

import { runCli } from './lib/cli.mjs';
import { buildIndex } from './build-index.mjs';
import { buildData } from './build-data.mjs';

runCli([() => buildIndex(), () => buildData()]);
