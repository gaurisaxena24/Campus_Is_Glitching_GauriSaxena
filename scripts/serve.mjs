// Tiny static file server for local play. No dependencies.
// Usage: npm start   (or: node scripts/serve.mjs [port])
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { handleMultiplayer } from './multiplayer.mjs';

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
const reflectionWindows = new Map();
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
    if (await handleMultiplayer(req, res, url)) return;
    if (url.pathname === '/api/reflection/evaluate') {
      const json = (status, value) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(value));
      };
      if (req.method !== 'POST') return json(405, { error: 'Use POST to evaluate a reflection.' });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(403, { error: 'Cross-site reflection requests are not allowed.' });
      const apiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!apiKey) return json(503, { error: 'AI reflection is unavailable until GEMINI_API_KEY is set on the server. Your reflection stays saved; try again later.' });

      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { error: 'Reflection is too long. Keep it under 500 characters.' });
      }
      let data;
      try { data = JSON.parse(raw); } catch { return json(400, { error: 'Invalid reflection request.' }); }
      const reflection = typeof data.reflection === 'string' ? data.reflection.trim().slice(0, 500) : '';
      if (reflection.length < 12) return json(400, { error: 'Add a little more about what was said or what you learned.' });
      if (!Number.isFinite(data.reflectionSeconds) || data.reflectionSeconds < 30) return json(400, { error: 'Finish the 30-second reflection first.' });

      const client = req.socket.remoteAddress || 'unknown';
      const timestamp = Date.now();
      const window = reflectionWindows.get(client);
      if (window && timestamp - window.start < 15 * 60 * 1000 && window.count >= 8) return json(429, { error: 'Reflection retries are taking a breather. Try again in a few minutes; your writing is saved.' });
      if (!window || timestamp - window.start >= 15 * 60 * 1000) reflectionWindows.set(client, { start: timestamp, count: 1 });
      else window.count += 1;

      const schema = {
        type: 'OBJECT',
        properties: {
          plausible: { type: 'BOOLEAN' },
          engaged: { type: 'BOOLEAN' },
          curiosityOrListening: { type: 'BOOLEAN' },
          learnedSomething: { type: 'BOOLEAN' },
          score: { type: 'INTEGER' },
          feedback: { type: 'STRING' },
          suggestion: { type: 'STRING' },
        },
        required: ['plausible', 'engaged', 'curiosityOrListening', 'learnedSomething', 'score', 'feedback', 'suggestion'],
      };
      let evaluation;
      const primaryModel = process.env.GEMINI_REFLECTION_MODEL || 'gemini-3.8-flash';
      const models = [...new Set([primaryModel, 'gemini-3.6-flash', 'gemini-3.5-flash-lite'])];
      let providerStatus = 0;
      let networkError = false;
      const validEvaluation = (value) => value && typeof value.plausible === 'boolean' && typeof value.engaged === 'boolean' && typeof value.curiosityOrListening === 'boolean' && typeof value.learnedSomething === 'boolean' && Number.isInteger(value.score) && value.score >= 1 && value.score <= 5 && typeof value.feedback === 'string' && typeof value.suggestion === 'string';

      // If the primary model is busy or returns malformed structured output,
      // make one quick attempt with Google's stable Flash fallback.
      for (const model of models) {
        let upstream;
        try {
          upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST',
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(14_000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: 'Evaluate only the player’s written reflection, never claim you verified that a real conversation happened. Be generous to short, culturally varied, and non-native English reflections. A plausible reflection includes some detail about the exchange or topic. Engagement, curiosity/listening, a follow-up question, or learning something count as positive evidence. Return a low score and one gentle actionable suggestion if the reflection is only a bare claim or does not describe an exchange. Feedback and suggestion must each be under 120 characters, friendly, non-judgmental, and must not repeat personal names or sensitive details from the reflection.' }] },
              contents: [{ role: 'user', parts: [{ text: `Evaluate this campus conversation reflection. Reflection time: at least 30 seconds.\n\n${reflection}` }] }],
              generationConfig: { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 1024, temperature: 0.2, thinkingConfig: { thinkingLevel: 'low' } },
            }),
          });
        } catch (error) {
          networkError = true;
          console.error('Gemini reflection request failed:', error.name || 'network error');
          continue;
        }
        if (!upstream.ok) {
          providerStatus = upstream.status;
          console.error('Gemini reflection provider returned:', upstream.status);
          if (upstream.status >= 500 && models.indexOf(model) < models.length - 1) continue;
          break;
        }
        let response;
        try { response = await upstream.json(); } catch { continue; }
        const outputText = response.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
        try {
          const parsed = JSON.parse(outputText);
          if (validEvaluation(parsed)) { evaluation = parsed; break; }
          console.error('Gemini reflection JSON field types:', JSON.stringify(Object.fromEntries(Object.entries(parsed || {}).map(([key, value]) => [key, typeof value]))));
        } catch {
          console.error('Gemini reflection returned no parseable JSON:', response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason || 'empty response');
        }
      }
      if (!evaluation) {
        if (providerStatus === 429) return json(503, { error: 'Gemini is rate-limited right now. Your reflection is saved; try again shortly.' });
        if (providerStatus >= 500) return json(503, { error: 'Gemini is temporarily busy. Your reflection is saved; try again shortly.' });
        if ([400, 401, 403, 404].includes(providerStatus)) return json(503, { error: 'Gemini rejected the request. Check the server key, API access, and GEMINI_REFLECTION_MODEL; your reflection is saved.' });
        if (networkError) return json(503, { error: 'Gemini could not connect in time. Your reflection is saved; try again.' });
        return json(502, { error: 'Gemini could not format a complete evaluation. Your reflection is saved; try again.' });
      }
      const evidence = [evaluation.engaged, evaluation.curiosityOrListening, evaluation.learnedSomething].filter(Boolean).length;
      const passed = evaluation.plausible && evidence >= 1 && evaluation.score >= 3;
      return json(200, {
        passed, score: evaluation.score,
        feedback: evaluation.feedback.trim().slice(0, 160),
        suggestion: evaluation.suggestion.trim().slice(0, 160),
        verified: false,
      });
    }
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
      const roomCode = typeof data.roomCode === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(data.roomCode.trim().toUpperCase()) ? data.roomCode.trim().toUpperCase() : '';
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
      const roomInvite = roomCode ? `Join the live two-player room in Squad with code ${roomCode}.` : 'Open Squad in the app to create or join a live room with a code.';
      const text = `You’re invited to join ${teamName}!\n\n${roomInvite}\n${appUrl}\n\nYour personal quest progress stays on your own device; room contributions and game scores sync while the room server is available.`;
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
