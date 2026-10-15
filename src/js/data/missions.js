// The five glitches (docs/02 section 6, revised by the owner's 10 Oct 2026
// direction): every glitch pairs a physical-world challenge with an
// interactive digital minigame. Names are fixed and used everywhere.
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
      title: 'Walk it off',
      line: 'Walk a comfortable loop for 2 minutes. Notice one small detail.',
      squad: 'Walk a loop together for 2 minutes. Each spot one detail.',
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
    id: 'low-battery',
    name: 'Low Battery',
    theme: 'Endless scrolling',
    glitch: 'Screen-time glitch',
    destinationId: 'library',
    unlockAt: 1,
    art: 'phone',
    line: 'Your feed has taken over the library. Its lights are dimming.',
    physical: {
      kind: 'timer',
      seconds: 120,
      title: 'Screen break',
      line: 'Put your phone face down for 2 minutes. Stretch, breathe, look around.',
      squad: 'Everyone puts their phone face down for 2 minutes.',
      alt: 'Any comfortable stretch or simply slow breathing counts. Stop if anything feels uncomfortable.',
    },
    reflect: [
      'What did you notice while your phone was face down?',
      'What could you do instead of scrolling next time?',
    ],
    digital: {
      game: 'focus',
      title: 'Recharge the signal',
      line: 'Tap the battery cells. Ignore the notifications.',
      squad: 'Pass the phone halfway through to share the recharge.',
    },
  },
  {
    id: 'missing-connection',
    name: 'Missing Connection',
    theme: 'Disconnection',
    glitch: 'Social glitch',
    destinationId: 'eating-place',
    unlockAt: 2,
    art: 'bubbles',
    line: 'Conversations at the Mess keep cutting out mid-sentence.',
    physical: {
      kind: 'consent',
      title: 'Say hello',
      line: 'Have a short, friendly chat with someone who is happy to talk.',
      squad: 'Together, say hello to someone new who is happy to chat.',
      alt: 'Not comfortable right now? Skip this glitch. No penalty, ever.',
      consent: 'They were happy to chat',
    },
    reflect: [
      'What is one thing you learned from the chat? (No names or private details.)',
      'How did it feel to start the conversation?',
    ],
    digital: {
      game: 'episode',
      title: 'Conversation episode',
      line: 'Five messages with a fictional student. Find your way into a real chat.',
      squad: 'Decide each message together.',
    },
  },
  {
    id: 'lost-colour',
    name: 'Lost Colour',
    theme: 'Constant rushing',
    glitch: 'Rushing glitch',
    destinationId: 'apj',
    unlockAt: 3,
    art: 'palette',
    line: 'Everyone rushed past APJ so fast its colours drained away.',
    physical: {
      // 'camera': photograph `count` different objects of this session's
      // target colour. Each photo is analysed on the device (game/colour.js).
      kind: 'camera',
      count: 5,
      targets: ['blue', 'red', 'yellow', 'green', 'purple'],
      title: 'Colour hunt',
      line: 'Slow down and photograph 5 different things in today\'s colour.',
      squad: 'Take turns finding and photographing each object.',
      alt: 'Any five objects count, even from where you are. Photos are checked on this phone and never saved.',
    },
    reflect: [
      'Which colour surprised you, and where was it?',
      'What changed when you slowed down?',
    ],
    digital: {
      game: 'pattern',
      title: 'Pattern restore',
      line: 'Two rounds: work out the colour rule and fill the gaps.',
      squad: 'Talk the rule through before you submit.',
    },
  },
  {
    id: 'time-loop',
    name: 'Time Loop',
    theme: 'Autopilot routines',
    glitch: 'Loop glitch',
    destinationId: 'housing',
    unlockAt: 4,
    art: 'loop',
    line: 'The walk home is stuck on repeat. Nobody notices it any more.',
    physical: {
      kind: 'timer',
      seconds: 60,
      title: 'Look again',
      line: 'Stop at a place you pass every day. Look at it for 1 minute.',
      squad: 'Stop together somewhere familiar. Each name one new thing.',
      alt: 'Exactly where you are counts. Look at it as if for the first time.',
    },
    reflect: [
      'What did you notice for the first time?',
      'Where else might you be on autopilot?',
    ],
    digital: {
      game: 'spot',
      title: 'Break the loop',
      line: 'Find the 3 things that changed in the looping scene.',
      squad: 'Race to call out each change before tapping it.',
    },
  },
];

// Bonus team challenge (local squad mode only). Not one of the five glitches:
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
  rhythm: (r) => r.hits >= 8,
  thaw: (r) => Number.isFinite(r.melted) && r.melted >= 100,
  focus: (r) => r.hits >= 12,
  social: (r) => r.connected === true && Number.isInteger(r.path) && r.path >= 0,
  sequence: (r) => r.correct === true,
  spot: (r) => r.found >= 3,
};

export function validateMinigameResult(missionId, result) {
  const mission = getMission(missionId);
  if (!mission || !result || typeof result !== 'object') return { ok: false, value: null };
  const check = PASS[mission.digital.game];
  if (!check || !check(result)) return { ok: false, value: null };
  const perfect = result.perfect === true;
  return { ok: true, value: { game: mission.digital.game, perfect } };
}

export function cleanNote(v) {
  return typeof v === 'string' ? v.trim().slice(0, MAX_NOTE) : '';
}
