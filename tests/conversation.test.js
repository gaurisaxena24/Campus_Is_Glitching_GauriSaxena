import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINE_LABEL, EPISODES, RANKS, TURNS, MAX_CHARS,
  startEpisode, suggestions, analyseMessage, sendMessage, evaluate, validateResult,
} from '../src/js/game/conversation.js';

const HIGH = new Set(['bridge-builder', 'kindred-spirit']);

function play(episodeId, msgs) {
  let state = startEpisode(episodeId);
  const replies = [];
  for (const m of msgs) {
    const r = sendMessage(state, m);
    state = r.state;
    replies.push(r.reply);
  }
  return { state, replies };
}

// Two different good styles with the same character (Ira).
const THOUGHTFUL = [
  'Hey, sorry to interrupt. What are you sketching?',
  'Ten seconds per bird? How do you catch the shape that fast?',
  '23 species is a lot! Why this table, is the view better here?',
  'The best view and nobody else sits here? What is it like sketching alone?',
  "That doesn't sound odd at all. It sounds really calming, and I get it.",
];
const PLAYFUL = [
  'Hi! Is that a bulbul? It looks like it is posing for you haha',
  'Bold bulbuls stealing crumbs haha! Which bird here is the biggest drama queen?',
  'A secret kingfisher! Can I see the bad sketch? I promise not to laugh haha',
  'Ten seconds per bird haha, that is a speedrun! Is your sketchbook full of tails then?',
  'A museum of tails, I love that! Which tail is your masterpiece?',
];

test('engine is honestly labelled as scripted, no AI', () => {
  assert.equal(ENGINE_LABEL, 'Scripted story engine (no AI)');
});

test('at least three complete episodes with short, phone-sized lines', () => {
  assert.ok(EPISODES.length >= 3);
  assert.equal(new Set(EPISODES.map((e) => e.id)).size, EPISODES.length);
  for (const ep of EPISODES) {
    const c = ep.character;
    assert.ok(ep.title && ep.setting && ep.intro && ep.opening.text, ep.id);
    assert.ok(c.name && c.pronouns && c.personality && c.interest && c.mood, ep.id);
    assert.ok(c.portrait.skin && c.portrait.hair && c.portrait.accent, ep.id);
    assert.ok(Object.keys(ep.topics).length >= 3, ep.id);
    const lines = [ep.opening.text, ...Object.values(ep.closing)];
    for (const t of Object.values(ep.topics)) lines.push(...t.replies.map((r) => r.text));
    for (const bank of Object.values(ep.replies)) lines.push(...bank.map((r) => r.text.replace('{echo}', 'x'.repeat(20)).replace('{Label}', 'Songwriting')));
    for (const l of lines) assert.ok(l.length <= 160, `${ep.id}: "${l}" is ${l.length} chars`);
    const sugg = [...ep.suggest.first, ...ep.suggest.empathy, ...ep.suggest.repair, ...ep.suggest.offkey, ...ep.suggest.soso];
    for (const t of Object.values(ep.topics)) sugg.push(...t.ask, ...t.play);
    for (const s of sugg) assert.ok(s.length <= MAX_CHARS, s);
  }
});

test('each episode starts with a clean plain-JSON state', () => {
  for (const ep of EPISODES) {
    const s = startEpisode(ep.id);
    assert.equal(s.episodeId, ep.id);
    assert.equal(s.turn, 0);
    assert.deepEqual(s.messages, []);
    assert.equal(s.done, false);
    assert.equal(s.mood, ep.startMood);
    assert.ok(s.mood >= -2 && s.mood <= 2);
    assert.deepEqual(s.memory.askedAbout, []);
    assert.deepEqual(s.memory.sharedFacts, []);
    assert.equal(s.memory.mentionedFeelings, false);
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  }
  assert.throws(() => startEpisode('nope'), { code: 'UNKNOWN_EPISODE' });
});

test('exactly five messages, then done with a final line; a sixth is rejected', () => {
  let s = startEpisode('quiet-night');
  for (let i = 0; i < TURNS; i++) {
    assert.equal(s.done, false);
    const r = sendMessage(s, `Message number ${i + 1}, what do you see up there?`);
    s = r.state;
    assert.equal(s.turn, i + 1);
    if (i < TURNS - 1) assert.equal(r.reply.final, undefined);
    else assert.ok(r.reply.final && r.reply.final.length > 0);
  }
  assert.equal(s.done, true);
  assert.equal(s.messages.filter((m) => m.from === 'player').length, 5);
  assert.throws(() => sendMessage(s, 'One more?'), { code: 'DONE' });
});

test('empty and over-long messages are rejected without changing state', () => {
  const s = startEpisode('quiet-sketcher');
  const before = JSON.stringify(s);
  assert.throws(() => sendMessage(s, ''), { code: 'EMPTY' });
  assert.throws(() => sendMessage(s, '    '), { code: 'EMPTY' });
  assert.throws(() => sendMessage(s, null), { code: 'EMPTY' });
  assert.throws(() => sendMessage(s, 'a'.repeat(MAX_CHARS + 1)), { code: 'TOO_LONG' });
  assert.doesNotThrow(() => sendMessage(s, 'a'.repeat(MAX_CHARS)));
  assert.equal(JSON.stringify(s), before);
});

test('sendMessage is pure: the input state is not mutated', () => {
  const s = startEpisode('after-the-club');
  const snap = JSON.parse(JSON.stringify(s));
  const r = sendMessage(s, 'How long have you been playing the ukulele?');
  assert.deepEqual(s, snap);
  assert.notEqual(r.state, s);
});

test('asking about their interest gets a reply about that interest', () => {
  for (const ep of EPISODES) {
    for (const [key, topic] of Object.entries(ep.topics)) {
      const { state, replies } = play(ep.id, [topic.ask[0]]);
      const words = topic.keywords.map((k) => k.toLowerCase());
      const replyText = replies[0].text.toLowerCase();
      assert.ok(words.some((w) => replyText.includes(w)), `${ep.id}/${key}: "${replies[0].text}"`);
      assert.deepEqual(state.memory.askedAbout, [key]);
    }
  }
});

test('a rude message makes the character guarded; a real apology repairs it', () => {
  const start = startEpisode('quiet-sketcher');
  const r1 = sendMessage(start, 'Birds are kind of boring, no?');
  assert.ok(r1.reply.mood < start.mood);
  assert.equal(r1.reply.emotion, 'hurt');
  assert.equal(r1.state.memory.guarded, true);
  assert.doesNotMatch(r1.reply.text, /bird/i);
  const r2 = sendMessage(r1.state, "Sorry, that came out wrong. I didn't mean it.");
  assert.ok(r2.reply.mood > r1.reply.mood);
  assert.equal(r2.state.memory.guarded, false);
  assert.equal(r2.state.memory.repaired, true);
  assert.equal(r2.reply.emotion, 'relieved');
});

test('negated insults are not rude', () => {
  const s = startEpisode('quiet-sketcher');
  assert.equal(analyseMessage("That's not boring at all!", s).rude, false);
  assert.equal(analyseMessage('Birds are boring.', s).rude, true);
});

test('memory: the same question twice gets a different reply that notices the repeat', () => {
  const q = 'What got you into watching birds?';
  const { state, replies } = play('quiet-sketcher', [q, q]);
  assert.notEqual(replies[1].text, replies[0].text);
  assert.match(replies[1].text, /already|again/i);
  assert.equal(state.memory.askedAbout.filter((t) => t === 'birds').length, 1);
});

test('memory: a new question on the same topic builds on what was already shared', () => {
  const { state, replies } = play('quiet-sketcher', ['What got you into watching birds?', 'Have you spotted anything rare around here, like a rare bird?']);
  assert.notEqual(replies[1].text, replies[0].text);
  assert.doesNotMatch(replies[1].text, /already/i);
  assert.deepEqual(state.memory.sharedFacts, ['birds:0', 'birds:1']);
});

test('empathy only counts when the character has expressed a feeling', () => {
  const calm = startEpisode('quiet-sketcher'); // opening has no feelings
  assert.equal(analyseMessage('That sounds hard.', calm).empathy, false);
  const nervous = startEpisode('after-the-club'); // opening expresses feeling left out
  assert.equal(analyseMessage('That sounds hard. Lots of people feel that.', nervous).empathy, true);
});

test('two different good styles (thoughtful and playful) both reach a high rank', () => {
  const a = evaluate(play('quiet-sketcher', THOUGHTFUL).state);
  const b = evaluate(play('quiet-sketcher', PLAYFUL).state);
  assert.ok(HIGH.has(a.rank.id), `thoughtful got ${a.rank.id} ${a.total}`);
  assert.ok(HIGH.has(b.rank.id), `playful got ${b.rank.id} ${b.total}`);
  assert.ok(THOUGHTFUL.every((m) => !/haha/.test(m)) && PLAYFUL.filter((m) => /haha/.test(m)).length >= 3);
  // Good conversations with the other characters also score well.
  const club = evaluate(play('after-the-club', [
    'Hi. Rough meeting? You looked a bit lost in there.',
    'That sounds really hard. Lots of people feel that in their first weeks.',
    'Do you write your own songs?',
    'Home songs sound lovely. What do you miss most about home?',
    'Standing by the door still takes guts. Want to go on Thursday together?',
  ]).state);
  const night = evaluate(play('quiet-night', [
    'Hey, mind if I sit? Is that Jupiter you are looking at?',
    'Four moons? That is so cool. How did you get into stargazing?',
    'Checking on old friends, I love that. Do people give you a hard time for skipping the fest?',
    'That makes sense. Recharging is important, not sad.',
    'Would you go to the fest if someone left early with you?',
  ]).state);
  assert.ok(HIGH.has(club.rank.id), `club got ${club.total}`);
  assert.ok(HIGH.has(night.rank.id), `night got ${night.total}`);
  assert.ok(night.scores.empathy >= 2 && club.scores.empathy === 3);
});

test('five identical questions score low on flow', () => {
  const r = evaluate(play('quiet-sketcher', Array(5).fill('What got you into watching birds?')).state);
  assert.equal(r.scores.flow, 0);
  assert.ok(r.scores.curiosity <= 1);
  assert.ok(!HIGH.has(r.rank.id));
});

test('an all-about-me conversation scores low on curiosity', () => {
  const r = evaluate(play('quiet-sketcher', [
    'I had such a long day today, my classes were exhausting.',
    'I think I need a nap, my hostel room is so far.',
    'My phone battery is dying and I forgot my charger.',
    'I am planning to go home this weekend, my mom is cooking.',
    'I really want to finish my project, I am behind on it.',
  ]).state);
  assert.equal(r.scores.curiosity, 0);
  assert.equal(r.rank.id, 'spark');
});

test('keyword stuffing does not max the score', () => {
  const s = startEpisode('quiet-sketcher');
  const f = analyseMessage('birds sketch bulbul ink drawing sketchbook trees?', s);
  assert.equal(f.stuffed, true);
  assert.equal(f.curiosity, false);
  const r = evaluate(play('quiet-sketcher', [
    'birds sketch bulbul ink drawing sketchbook trees?',
    'bird birds kingfisher feathers species sketch?',
    'chai table window view sketching birds?',
    'sounds hard makes sense me too not alone valid sorry',
    'ink pen pencil sketchbook drawing doodle?',
  ]).state);
  assert.equal(r.scores.curiosity, 0);
  assert.ok(r.total < 10, `stuffed total ${r.total}`);
  assert.ok(r.total < r.maxTotal);
});

test('a long rambling message is not rewarded for its length', () => {
  const ramble = 'So I was walking here from the library and saw lots of people and then remembered my assignment and my friend called me and the weather is nice and also the food was okay today';
  assert.ok(ramble.length <= MAX_CHARS);
  const s = startEpisode('quiet-sketcher');
  const long = analyseMessage(ramble, s);
  const short = analyseMessage('What are you sketching?', s);
  assert.equal(long.ramble, true);
  assert.equal(long.curiosity, false);
  assert.equal(short.curiosity, true);
  const longRun = evaluate(play('quiet-sketcher', [ramble, ramble.replace('library', 'hostel'), ramble.replace('nice', 'hot'), ramble.replace('food', 'chai'), ramble.replace('friend', 'cousin')]).state);
  const shortRun = evaluate(play('quiet-sketcher', THOUGHTFUL).state);
  assert.ok(longRun.total < shortRun.total);
  assert.equal(longRun.rank.id, 'spark');
});

test('suggestions: three distinct options, deterministic, context dependent', () => {
  for (const ep of EPISODES) {
    let s = startEpisode(ep.id);
    const seen = [];
    for (let i = 0; i < TURNS; i++) {
      const a = suggestions(s);
      const b = suggestions(JSON.parse(JSON.stringify(s)));
      assert.deepEqual(a, b);
      assert.equal(a.length, 3);
      assert.equal(new Set(a.map((x) => x.text)).size, 3);
      assert.equal(new Set(a.map((x) => x.id)).size, 3);
      // Mixed quality: at least one genuine question and at least one weaker option.
      const fs = a.map((x) => analyseMessage(x.text, s));
      assert.ok(fs.some((f) => f.question || f.empathy), `${ep.id} turn ${i}: no good option`);
      assert.ok(fs.some((f) => !(f.question || f.empathy)), `${ep.id} turn ${i}: all options look good`);
      seen.push(a.map((x) => x.text).join('|'));
      s = sendMessage(s, a[0].text).state;
    }
    assert.ok(new Set(seen).size > 1, `${ep.id} suggestions never change`);
    assert.deepEqual(suggestions(s), []);
  }
});

test('the two good suggestion styles differ (playful vs thoughtful)', () => {
  const s = play('quiet-sketcher', ['Hey, sorry to interrupt. What are you sketching?']).state;
  const texts = suggestions(s).map((x) => x.text);
  assert.ok(texts.some((t) => /haha|!/.test(t)));
  assert.ok(texts.some((t) => t.endsWith('?') && !/haha|!/.test(t)));
});

test('evaluate refuses before five messages', () => {
  const { state } = play('quiet-night', ['Hi!', 'What are you looking at right now?']);
  assert.throws(() => evaluate(state), { code: 'NOT_DONE' });
  assert.throws(() => evaluate(startEpisode('quiet-night')), { code: 'NOT_DONE' });
});

test('evaluation has 0..3 scores, a rank, a highlight quoting the player and a tip', () => {
  for (const msgs of [THOUGHTFUL, PLAYFUL, Array(5).fill('ok')]) {
    const r = evaluate(play('quiet-sketcher', msgs).state);
    for (const v of Object.values(r.scores)) assert.ok(Number.isInteger(v) && v >= 0 && v <= 3);
    assert.deepEqual(Object.keys(r.scores).sort(), ['curiosity', 'empathy', 'flow', 'friendliness', 'responsiveness']);
    assert.equal(r.total, Object.values(r.scores).reduce((a, b) => a + b, 0));
    assert.ok(RANKS.some((x) => x.id === r.rank.id && x.title === r.rank.title));
    assert.ok(msgs.some((m) => r.highlight.includes(m.slice(0, Math.min(m.length, 30)))), r.highlight);
    assert.ok(r.suggestion.length > 10 && r.summary.includes(r.rank.title));
    assert.equal(r.engine, ENGINE_LABEL);
  }
});

test('the tip targets the weakest dimension', () => {
  const r = evaluate(play('quiet-sketcher', Array(5).fill('What got you into watching birds?')).state);
  assert.match(r.suggestion, /repeat|word from their last line/i);
  const me = evaluate(play('quiet-sketcher', ['I am tired today, my class ran late.', 'My hostel is far, I walked a lot.', 'I forgot my lunch, my bag is heavy.', 'I need sleep, my week is long.', 'I have a quiz, my notes are messy.']).state);
  assert.match(me.suggestion, /Ask about them/);
});

test('state survives a JSON round trip mid-conversation', () => {
  const first = play('after-the-club', ['Hey! I saw you at the meeting. Is that a ukulele?', 'How long have you been playing the ukulele?']).state;
  const copy = JSON.parse(JSON.stringify(first));
  assert.deepEqual(copy, first);
  const rest = ['Do you write your own songs?', 'That sounds really hard, honestly.', 'Want to go on Thursday together?'];
  let a = first;
  let b = copy;
  for (const m of rest) {
    const ra = sendMessage(a, m);
    const rb = sendMessage(b, m);
    assert.deepEqual(ra, rb);
    a = ra.state;
    b = JSON.parse(JSON.stringify(rb.state));
  }
  assert.deepEqual(evaluate(a), evaluate(b));
});

test('validateResult accepts a real summary and rejects bad ones', () => {
  const r = evaluate(play('quiet-sketcher', THOUGHTFUL).state);
  const ok = validateResult({ episodeId: r.episodeId, messages: r.messages, total: r.total, rank: r.rank });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, { episodeId: 'quiet-sketcher', messages: 5, total: r.total, rank: r.rank });
  assert.equal(validateResult(r).ok, true);
  assert.equal(validateResult(null).ok, false);
  assert.equal(validateResult({ ...r, messages: 4 }).ok, false);
  assert.equal(validateResult({ ...r, episodeId: 'made-up' }).ok, false);
  assert.equal(validateResult({ ...r, total: 99 }).ok, false);
  assert.equal(validateResult({ ...r, total: 2.5 }).ok, false);
  assert.equal(validateResult({ ...r, rank: { id: 'kindred-spirit', title: 'Kindred Spirit' }, total: 1 }).ok, false);
  assert.equal(validateResult({ ...r, rank: { id: 'legend', title: 'Legend' } }).ok, false);
});
