/**
 * Perf + visual harness for the 3D scene.
 *
 * Measures the backend poll rate (the metric Phase 1 targets) and captures
 * screenshots of each camera preset for visual regression across later phases.
 *
 * Requires the dev servers to be running:
 *   backend  http://localhost:8000
 *   frontend http://localhost:5173
 *
 * Usage: node scripts/capture3d.mjs [outDir]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const FRONTEND = process.env.FRONTEND ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '../../docs/3d-rebuild/captures';
const SAMPLE_MS = 10_000;

async function measurePollRate(page, label, url) {
  let stateHits = 0;
  let eventHits = 0;
  const onRequest = (req) => {
    const u = req.url();
    if (u.includes(':8000/state')) stateHits += 1;
    else if (u.includes(':8000/events')) eventHits += 1;
  };

  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => page.goto(url));
  // Settle first: the initial burst of /recipes, /scenarios etc. is not the poll loop.
  await page.waitForTimeout(1500);

  page.on('request', onRequest);
  await page.waitForTimeout(SAMPLE_MS);
  page.off('request', onRequest);

  const secs = SAMPLE_MS / 1000;
  const perSec = stateHits / secs;
  // The hook polls every 500 ms, so one loop == 2 req/s.
  console.log(
    `${label.padEnd(12)} /state ${String(stateHits).padStart(3)} in ${secs}s ` +
      `= ${perSec.toFixed(1)} req/s  (~${Math.round(perSec / 2)} poll loop(s)), /events ${eventHits}`
  );
  return perSec;
}

async function readSceneStats(page, label) {
  await page.goto(`${FRONTEND}/3dsim?perf=1`);
  // Let the lazy chunk load, the scene settle, and the 1 Hz probe publish twice.
  await page.waitForTimeout(6000);
  const stats = await page.evaluate(() => window.__sceneStats ?? null);
  if (!stats) {
    console.log(`${label.padEnd(12)} no stats (is SceneStats mounted behind ?perf=1 ?)`);
    return null;
  }
  console.log(
    `${label.padEnd(12)} calls ${String(stats.calls).padStart(4)}  ` +
      `programs ${String(stats.programs).padStart(3)}  ` +
      `geometries ${String(stats.geometries).padStart(4)}  ` +
      `textures ${String(stats.textures).padStart(3)}  ` +
      `tris ${String(stats.triangles).padStart(6)}  ` +
      `fps ${String(stats.fps).padStart(3)}`
  );
  return stats;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  console.log('--- backend poll rate ---');
  await measurePollRate(page, 'overview', `${FRONTEND}/`);
  await measurePollRate(page, '3dsim', `${FRONTEND}/3dsim`);

  console.log('\n--- renderer counters (/3dsim?perf=1) ---');
  await readSceneStats(page, '3dsim');

  console.log('\n--- captures ---');
  await page.goto(`${FRONTEND}/3dsim`);
  await page.waitForTimeout(4000); // let the lazy 3D chunk load and the scene settle
  const file = path.join(OUT, '3dsim-idle.png');
  await page.screenshot({ path: file });
  console.log('wrote', file);

  // IDLE hides every animated part (slug, formed carton, flat blank), so a
  // running capture is the only one that actually exercises them.
  await page.evaluate(async () => {
    await fetch('http://localhost:8000/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
  });
  for (let i = 0; i < 40; i += 1) {
    await page.evaluate(async () => {
      await fetch('http://localhost:8000/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dt: 0.25 }),
      });
    });
  }
  await page.waitForTimeout(2500);
  const running = path.join(OUT, '3dsim-running.png');
  await page.screenshot({ path: running });

  // Per-station close-ups. Phase 6 checks each station against its OEM figure,
  // and the overview camera is far too wide to judge geometry at that level.
  for (const preset of ['Grouping', 'Transfer', 'Tray Infeed', 'Main Transport', 'Discharge']) {
    const button = page.getByRole('button', { name: preset, exact: true });
    if ((await button.count()) === 0) continue;
    await button.first().click();
    await page.waitForTimeout(1400);
    const slug = preset.toLowerCase().replace(/\s+/g, '-');
    await page.screenshot({ path: path.join(OUT, `preset-${slug}.png`) });
    console.log('wrote', path.join(OUT, `preset-${slug}.png`));
  }
  const phase = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8000/state');
    const s = await r.json();
    return `${s.sts?.machine_state} / ${s.sts?.cycle_phase}`;
  });
  console.log('wrote', running, `(state: ${phase})`);

  await page.goto(`${FRONTEND}/`);
  await page.waitForTimeout(4000);
  const file2 = path.join(OUT, 'overview.png');
  await page.screenshot({ path: file2 });
  console.log('wrote', file2);

  if (errors.length) {
    console.log('\n--- page errors ---');
    for (const e of [...new Set(errors)].slice(0, 15)) console.log(' *', e);
  } else {
    console.log('\nno page errors');
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
