/**
 * Verify the three video tools against a real, browser-recorded WebM clip.
 * The general harness cannot synthesise video, so these get their own pass.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required']
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

/** Record a short animated canvas (with an audio track) as WebM. */
const MAKE_VIDEO = `
(async () => {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  const x = c.getContext('2d');

  const stream = c.captureStream(25);

  // Add a real audio track so "extract audio" has something to find.
  const ac = new AudioContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  gain.gain.value = 0.25;
  osc.frequency.value = 440;
  const dest = ac.createMediaStreamDestination();
  osc.connect(gain); gain.connect(dest);
  osc.start();
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));

  const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const done = new Promise(r => { rec.onstop = r; });
  rec.start();

  const start = performance.now();
  await new Promise(resolve => {
    function frame() {
      const t = (performance.now() - start) / 1000;
      x.fillStyle = '#0b0d11'; x.fillRect(0, 0, 320, 240);
      x.fillStyle = \`hsl(\${(t * 90) % 360},80%,55%)\`;
      x.beginPath();
      x.arc(160 + Math.sin(t * 3) * 80, 120 + Math.cos(t * 3) * 50, 34, 0, 7);
      x.fill();
      x.fillStyle = '#fff';
      x.font = 'bold 22px sans-serif';
      x.fillText(t.toFixed(2) + 's', 12, 30);
      if (t < 2.2) requestAnimationFrame(frame); else resolve();
    }
    frame();
  });

  rec.stop();
  await done;
  osc.stop(); ac.close();

  const blob = new Blob(chunks, { type: 'video/webm' });
  window.__VID = new File([blob], 'clip.webm', { type: 'video/webm' });
  return { size: blob.size, type: blob.type };
})()
`;

const TOOLS = ['extract-audio-from-video', 'video-frame-extractor', 'video-to-gif', 'media-info'];
let failures = 0;

for (const id of TOOLS) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e.message || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  try {
    await page.goto(`${BASE}/tool.html?id=${id}`, { waitUntil: 'networkidle', timeout: 25000 });

    const info = await page.evaluate(MAKE_VIDEO);

    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(window.__VID);
      const input = document.querySelector('#zt-file-input');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);

    // Keep the GIF job small so the run stays inside the timeout.
    if (id === 'video-to-gif') {
      await page.evaluate(() => {
        const dur = document.querySelector('#zt-opt-duration');
        if (dur) { dur.value = '1'; dur.dispatchEvent(new Event('change', { bubbles: true })); }
        const w = document.querySelector('#zt-opt-width');
        if (w) { w.value = '200'; w.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(150);
    }

    await page.click('#zt-run');
    await page.waitForFunction(() => {
      const r = document.querySelector('#zt-results');
      const e = document.querySelector('#zt-error');
      return (r && r.children.length) || (e && e.children.length);
    }, null, { timeout: 120000 });

    const err = (await page.textContent('#zt-error').catch(() => '')).trim();
    const n = await page.locator('#zt-results > *').count();
    const notes = await page.locator('.zt-download__meta, .zt-data__value').allTextContents();

    const real = errors.filter(e => !/favicon|sw\.js|manifest/i.test(e));
    const ok = !err && n > 0 && !real.length;
    if (!ok) failures++;

    console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(26)} video=${(info.size / 1024).toFixed(0)}KB results=${n} ${err || real.slice(0, 1).join('') || notes.slice(0, 2).join(' · ').slice(0, 90)}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${id.padEnd(26)} exception: ${String(e.message || e).slice(0, 160)}`);
  }
  await page.close();
}

await ctx.close();
await browser.close();
console.log(`\n=== video pass: ${TOOLS.length - failures} ok, ${failures} failed ===`);

process.exit(failures ? 1 : 0);
