// The three core glitches each pair a physical-world challenge with a digital minigame.
//
// `destinationId` is where the glitch appears on the map. The physical part
// can always be done anywhere safe and comfortable.
// `unlockAt` is the number of repaired glitches needed before it opens.

export const MAX_NOTE = 500;
export const MAX_REFLECTION = 500;

export const MISSIONS = [
  {
    id: 'frozen-character',
    name: 'Frozen Character',
    theme: 'Inactivity',
    glitch: 'Movement glitch',
    destinationId: 'arjuna',
    unlockAt: 0,
    art: 'frozen',
    line: 'A runner froze mid-stride at Arjuna. Get the campus moving.',
    physical: {
      // 'walk': optional GPS tracking (game/tracking.js WALK rule), or the
      // self-reported 2-minute timer when GPS is off, refused or unreliable.
      kind: 'walk',
      seconds: 120,
      stepTarget: 150, // estimated steps needed in the 2 tracked minutes (about 75 a minute: an easy stroll)
      title: 'Walk and Thaw',
      line: 'Take a comfortable two-minute campus stroll.',
      squad: 'Take a comfortable two-minute campus stroll together.',
      alt: 'Any pace, any distance, seated or rolling. Stop whenever you like; it still counts.',
    },
    reflect: [
      'What small detail did you notice on your walk?',
      'How does your body feel now compared with before?',
    ],
    digital: {
      game: 'thaw',
      title: 'THAW',
      line: 'Drag the ice. Watch it melt.',
      squad: 'Take turns guiding the ice character.',
    },
  },
  {
    id: 'lost-colour',
    name: 'Lost Colour',
    theme: 'Constant rushing',
    glitch: 'Rushing glitch',
    destinationId: 'apj',
    unlockAt: 1,
    art: 'palette',
    line: 'Everyone rushed past APJ so fast its colours drained away.',
    physical: {
      // 'camera': photograph `count` different objects of this session's
      // target colour. Each photo is analysed on the device (game/colour.js).
      kind: 'camera',
      count: 5,
      targets: ['blue', 'red', 'yellow', 'green', 'purple'],
      title: 'Colour hunt',
      line: 'Find five different things matching today’s colour.',
      squad: 'Take turns spotting five things matching today’s colour.',
      alt: 'Camera checks are optional; honestly confirm your hunt if camera access is unavailable.',
    },
    reflect: [
      'Which colour surprised you, and where was it?',
      'What changed when you slowed down?',
    ],
    digital: {
      game: 'sequence',
      title: 'Colour Click + Pattern',
      line: 'Pick colours, then follow the pattern through two rounds.',
      squad: 'Pick colours and solve the pattern together.',
    },
  },
  {
    id: 'missing-connection',
    name: 'Lost Connection',
    theme: 'Disconnection',
    glitch: 'Social glitch',
    destinationId: 'eating-place',
    unlockAt: 2,
    art: 'bubbles',
    line: 'Conversations on campus keep cutting out mid-sentence.',
    physical: {
      kind: 'consent',
      title: 'Real talk',
      line: 'Have a short chat with someone who is happy to talk.',
      squad: 'Have a short, friendly campus chat together.',
      alt: 'Ask first; recording is optional and only with clear consent.',
      consent: 'We had a real conversation, and they were happy to talk',
    },
    reflect: ['What is one thing you learned? (No names or private details.)', 'How did the conversation feel?'],
    digital: {
      game: 'episode',
      title: 'Missing-Word Conversation',
      line: 'Choose the missing words and see where the conversation goes.',
      squad: 'Choose each reply together.',
    },
  },
];

// Bonus team challenge (local squad mode only). It is not a main quest:
// it gives squad XP and a badge, and never affects repairs or tokens.
export const SQUAD_RALLY = {
  id: 'squad-rally',
  name: 'Squad Rally',
  destinationId: 'shantiniketan',
  line: 'The auditorium needs a team chorus. Repeat your teammates’ notes.',
  unlockAt: 1,
};

// Daily challenges: a predefined rotation chosen by the calendar date.
export const DAILY = [
  { id: 'look-up', destinationId: 'main-gate', title: 'Look up', line: 'Find the tallest tree you can see from the Main Gate path.' },
  { id: 'stairs', destinationId: 'common-areas', title: 'Take the stairs', line: 'Choose stairs over waiting once today.' },
  { id: 'sit-still', destinationId: 'plaza', title: 'Plaza pause', line: 'Sit for 60 seconds at the Plaza and just listen.' },
  { id: 'thank-you', destinationId: 'chandragupta', title: 'Say thanks', line: 'Thank someone who keeps campus running.' },
  { id: 'new-route', destinationId: 'main-gate', title: 'New route', line: 'Walk a route you have never taken on campus.' },
  { id: 'water', destinationId: 'common-areas', title: 'Refill', line: 'Refill your water bottle and drink it slowly.' },
  { id: 'sky', destinationId: 'plaza', title: 'Cloud check', line: 'Spot one cloud shape from the Plaza.' },
];

export const MISSION_IDS = MISSIONS.map((m) => m.id);
export const FIRST_MISSION_ID = 'frozen-character';

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

export function missionAtDestination(destinationId) {
  return MISSIONS.find((m) => m.destinationId === destinationId) || null;
}

// What counts as a completed minigame. Results come from the UI; the reducer
// re-checks them so a repair can never be claimed without playing.
const PASS = {
  thaw: (r) => Number.isFinite(r.melted) && r.melted >= 100,
  sequence: (r) => r.correct === true,
};

export function validateMinigameResult(missionId, result) {
  const mission = getMission(missionId);
  if (!mission || !result || typeof result !== 'object') return { ok: false, value: null };
  const check = PASS[mission.digital.game];
  if (!check || !check(result)) return { ok: false, value: null };
  const perfect = result.perfect === true;
  const value = { game: mission.digital.game, perfect };
  if (mission.digital.game === 'thaw' && Number.isInteger(result.restarts) && result.restarts >= 0 && result.restarts <= 100 && result.score === Math.max(0, 1000 - result.restarts * 100) && perfect === (result.restarts === 0)) {
    value.score = result.score;
  }
  if (mission.digital.game === 'sequence' && result.rounds === 3 && Number.isInteger(result.mistakes) && result.mistakes >= 0 && Number.isInteger(result.rushes) && result.rushes >= 0) {
    const score = Math.max(0, 300 - result.mistakes * 15 - result.rushes * 10);
    if (result.score === score && perfect === (result.mistakes === 0 && result.rushes === 0)) value.score = score;
  }
  return { ok: true, value };
}

export function cleanNote(v) {
  return typeof v === 'string' ? v.trim().slice(0, MAX_NOTE) : '';
}
