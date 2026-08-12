/**
 * Run the whole test suite against a locally served copy of the site.
 *
 *     npm test
 *
 * Starts a static server, runs each suite in turn, and reports a summary.
 * Set CHROME_PATH if Chrome is not at the default Windows location.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = process.env.PORT || 8899;
const BASE = `http://127.0.0.1:${PORT}`;

/** Serve the repo with whichever of python or npx serve is available. */
function startServer() {
    const candidates = [
        ['python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1']],
        ['python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1']],
        ['npx', ['--yes', 'serve', '-l', String(PORT), '.']]
    ];

    for (const [cmd, args] of candidates) {
        try {
            const child = spawn(cmd, args, { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' });
            if (child.pid) return child;
        } catch (e) { /* try the next one */ }
    }
    return null;
}

async function waitForServer(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE}/index.html`);
            if (res.ok) return true;
        } catch (e) { /* not up yet */ }
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
}

function run(script) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(HERE, script)], {
            cwd: ROOT,
            stdio: 'inherit',
            env: { ...process.env, BASE_URL: BASE }
        });
        child.on('exit', code => resolve(code === 0));
    });
}

/* Reuse an already-running server if there is one. */
let server = null;
if (!(await waitForServer(1200))) {
    server = startServer();
    if (!server) {
        console.error('Could not start a static server. Install Python, or run `npx serve -l 8899 .` in another terminal.');
        process.exit(1);
    }
    if (!(await waitForServer())) {
        console.error(`Server did not come up on ${BASE}.`);
        server.kill();
        process.exit(1);
    }
    console.log(`Serving ${ROOT} on ${BASE}\n`);
} else {
    console.log(`Using the server already running on ${BASE}\n`);
}

const SUITES = [
    ['smoke.mjs', 'Every tool loads, renders its options and produces output'],
    ['correctness.mjs', 'Known inputs produce known outputs'],
    ['video.mjs', 'Video tools against a recorded clip']
];

const results = [];
for (const [script, description] of SUITES) {
    console.log(`\n${'='.repeat(64)}\n${script}  —  ${description}\n${'='.repeat(64)}`);
    results.push([script, await run(script)]);
}

if (server) server.kill();

console.log(`\n${'='.repeat(64)}`);
results.forEach(([script, ok]) => console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${script}`));
const failed = results.filter(([, ok]) => !ok).length;
console.log(`${'='.repeat(64)}`);

process.exit(failed ? 1 : 0);
