import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
const evidenceDir = path.join(rootDir, 'docs', 'test-evidence');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
      const filePath = path.normalize(path.join(publicDir, requestedPath));
      if (!filePath.startsWith(publicDir)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (error, buffer) => {
        if (error) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        response.writeHead(200, { 'Content-Type': contentType(filePath) });
        response.end(buffer);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function checkCssStructure() {
  const css = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
  assert(css.includes('min-height: 48px'), 'buttons and inputs should keep at least 48px touch height');
  assert(css.includes('@media (min-width: 768px)'), 'desktop media query is missing');
  assert(css.includes('.quick-actions'), 'quick actions styles are missing');
  assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'desktop two-column quick actions are missing');
  assert(css.includes('@media (max-width: 420px)'), 'small-phone media query is missing');
  console.log('OK RWD CSS structure');
}

function screenshot(baseUrl, name, viewport) {
  const outputPath = path.join(evidenceDir, `public-${name}.png`);
  return new Promise((resolve, reject) => {
    const args = [
      'playwright',
      'screenshot',
      '--viewport-size',
      viewport,
      '--wait-for-selector',
      '#resultArea',
      '--timeout',
      '30000',
      '--full-page',
      baseUrl,
      outputPath
    ];
    const child = process.platform === 'win32'
      ? spawn(`npx ${args.map((arg) => `"${arg}"`).join(' ')}`, { cwd: rootDir, shell: true, stdio: 'inherit' })
      : spawn('npx', args, { cwd: rootDir, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`screenshot command failed: ${name}, exit status ${code}`));
        return;
      }
      try {
        assert(fs.existsSync(outputPath), `missing screenshot: ${outputPath}`);
        console.log(`OK screenshot ${name}: ${outputPath}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  checkCssStructure();
  const { server, url } = await startStaticServer();
  try {
    await screenshot(url, 'mobile', '390,844');
    await screenshot(url, 'desktop', '1280,900');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('All RWD checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
