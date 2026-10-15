// Tiny static file server for local play. No dependencies.
// Usage: npm start   (or: node scripts/serve.mjs [port])
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 5173);
// Load local secrets for development without exposing them to browser code.
try {
  let envFile;
  try { envFile = await readFile(join(root, '.env'), 'utf8'); }
  catch { envFile = await readFile(join(root, 'env'), 'utf8'); }
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* .env is optional; production can use environment variables */ }
const inviteWindows = new Map();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/invite') {
      const json = (status, value) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(value));
      };
      if (req.method !== 'POST') return json(405, { error: 'Use POST to send team invitations.' });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(403, { error: 'Cross-site invite requests are not allowed.' });
      const user = (process.env.GMAIL_USER || '').trim();
      const password = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
      if (!user || !password) return json(503, { error: 'Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env, then restart the server.' });
      if (password.length !== 16) return json(503, { error: 'GMAIL_APP_PASSWORD must be the complete 16-character Gmail App Password. Spaces are ignored; update the env file and restart the server.' });

      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16_384) return json(413, { error: 'Invite request is too large.' });
      }
      let data;
      try { data = JSON.parse(raw); } catch { return json(400, { error: 'Invalid invite request.' }); }
      const teamName = typeof data.teamName === 'string' ? data.teamName.replace(/[\r\n]+/g, ' ').trim().slice(0, 40) : '';
      const emails = [...new Set((Array.isArray(data.emails) ? data.emails : []).map((email) => String(email).trim().toLowerCase()))];
      if (!teamName || !emails.length || emails.length > 10 || emails.some((email) => !/^[^\s@]+@[^\s@]+$/.test(email))) {
        return json(400, { error: 'Add a team name and up to 10 email addresses. Addresses may use any domain.' });
      }
      const client = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const window = inviteWindows.get(client);
      if (window && now - window.start < 60 * 60 * 1000 && window.count >= 5) return json(429, { error: 'Invite limit reached. Try again in an hour.' });
      if (!window || now - window.start >= 60 * 60 * 1000) inviteWindows.set(client, { start: now, count: 1 });
      else window.count += 1;
      const appUrl = process.env.APP_URL || `${url.protocol}//${req.headers.host}`;
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: password } });
      const text = `You’re invited to join ${teamName}!\n\nLet’s meet up and complete campus tasks together. Open the app and find Team Tasks in the Squad tab:\n${appUrl}\n\nThis prototype does not sync team membership or task progress between devices yet.`;
      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || user,
          to: user,
          bcc: emails,
          subject: `${teamName} team invitation`,
          text,
        });
      } catch (error) {
        console.error('Team invitation email failed:', error.message);
        return json(502, { error: 'Gmail could not send the invitation. Check the App Password and server logs.' });
      }
      return json(200, { sent: emails.length });
    }
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root + sep) && path !== root) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => {
  console.log(`The Campus Is Glitching is running at http://localhost:${port}`);
});
