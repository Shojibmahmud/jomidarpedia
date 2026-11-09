#!/usr/bin/env node
// `npm run data`: runs both data builders, then the static maps, the thumbnail and home photo checks, the About text check and the data download (release only),
// and writes one combined report (data/reports/release-problems.md). The mode comes from scripts/data-mode.mjs.

import { runCli } from './lib/cli.mjs';
import { buildIndex } from './build-index.mjs';
import { buildData } from './build-data.mjs';
import { buildMaps } from './build-maps.mjs';
import { checkThumbs } from './lib/thumbs-check.mjs';
import { checkAbout } from './lib/about.mjs';
import { checkHome } from './lib/home-check.mjs';
import { buildExport } from './build-export.mjs';

runCli([() => buildIndex(), () => buildData(), () => buildMaps(), () => checkThumbs(), () => checkHome(), () => checkAbout(), mode => buildExport(mode)]);
