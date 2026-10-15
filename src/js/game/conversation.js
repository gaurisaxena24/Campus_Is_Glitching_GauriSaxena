// Missing Connection: conversation episodes (pure logic, no DOM, no network).
//
// This is a LOCAL scripted story engine. There is no language model, no API
// and no randomness: every reply comes from a hand-written reply bank, chosen
// by a rule-based analyser (keyword lists + word overlap with the character's
// last line). All characters and situations are fictional. The player is never
// asked to name or describe a real person.

export const ENGINE_LABEL = 'Scripted story engine (no AI)';
export const TURNS = 5;
export const MAX_CHARS = 200;
export const MOOD_MIN = -2;
export const MOOD_MAX = 2;

// ---------------------------------------------------------------------------
// Shared word lists
// ---------------------------------------------------------------------------

const STOP = new Set(`a an the and or but so if then than to of in on at by for from with about as into onto
over under up down out off is am are was were be been being do does did doing done have has had having
i me my mine myself you your yours yourself we us our they them their he him his she her it its this that
these those there here what which who whom whose when where why how not no yes yeah yep ok okay oh ah um
hmm just really very so too also still even maybe much many more most some any all each every one ones
can could would should will shall may might must let lets get got go going gone like i'm i've i'll i'd
you're you've you'll it's that's what's there's don't doesn't didn't can't won't isn't aren't wasn't
hi hey hello honestly actually thing things kind sort bit lot lots well right now today tonight`.split(/\s+/));

const YOU = new Set(['you', 'your', 'yours', 'yourself', "you're", "you've", "you'll", "you'd", 'u', 'ur', 'we', 'us', "let's"]);
const ME = new Set(['i', 'me', 'my', 'mine', 'myself', "i'm", "i've", "i'll", "i'd"]);
const GREET = new Set(['hi', 'hey', 'hello', 'heya', 'hii', 'hiya', 'yo', 'namaste', 'howdy', 'hola', 'heyy', 'sup']);
const Q_START = new Set(['what', "what's", 'how', "how's", 'why', 'when', 'where', 'who', 'which', 'do', 'does', 'did',
  'are', 'is', 'was', 'were', 'have', 'has', 'can', 'could', 'would', 'will', 'should', 'want', 'wanna', 'shall']);
// Words that make a question personal rather than random small talk.
const PERSONAL = new Set(['like', 'feel', 'feeling', 'doing', 'think', 'enjoy', 'been', 'day', 'week', 'name', 'study',
  'studying', 'major', 'from', 'here', 'usually', 'often', 'favourite', 'favorite', 'okay', 'ok', 'alright', 'going',
  'love', 'hobby', 'into', 'started', 'start', 'learn', 'learned', 'mean', 'that', 'this', 'it', 'there', 'come', 'yourself',
  'miss', 'plan', 'plans', 'together', 'join', 'show', 'see', 'look', 'hear', 'want', 'wanna', 'better', 'easier']);

const RUDE = ['boring', 'weird', 'lame', 'stupid', 'whatever', 'who cares', 'shut up', 'loser', 'cringe', 'pathetic',
  'nerd', 'waste of time', 'get a life', 'dumb', 'idiot', 'ugh', 'so what', "don't care", 'dont care', 'nobody cares',
  'go away', 'not that deep', 'just dots', 'joke instrument', 'freak', 'creepy', 'annoying', 'useless', 'sad life'];
const APOLOGY = ['sorry', 'my bad', "didn't mean", 'didnt mean', 'apologise', 'apologize', 'came out wrong', 'that was rude',
  'that was mean', 'take it back'];
const EMPATHY = ['sounds hard', 'sounds tough', 'sounds rough', "that's hard", "that's tough", 'must be', 'must have been',
  'makes sense', 'i get it', 'i get that', 'totally get', 'understand', "that's okay", "that's ok", "it's okay", "it's ok",
  'not weird', "isn't weird", 'not odd', "isn't odd", 'nothing wrong', 'happens to', 'me too', 'same here', 'been there',
  'not alone', 'valid', 'that sucks', 'rough', 'tough', 'takes guts', 'brave', 'glad you', "that's fair", 'fair enough',
  'respect that', 'no shame', 'wear me out', 'wears me out', 'lots of people', 'a lot of people', 'not sad', 'is important',
  'calming', 'lovely', 'showed up', 'not silly', 'so normal', 'totally normal', 'is normal', 'new places', 'your choice',
  'that helps'];
const REFLECT = ['sounds like', 'so you', 'you said', 'you mentioned', 'you just said', 'that must', 'love that',
  'i like that', 'no way', 'that is so', "that's so", 'oh nice', 'oh wow', "that's amazing", "that's cool", 'so cool',
  'interesting', 'wait,', 'that explains'];
const POSITIVE = new Set(['nice', 'cool', 'love', 'lovely', 'awesome', 'amazing', 'great', 'glad', 'fun', 'beautiful',
  'wow', 'haha', 'hahaha', 'lol', 'thanks', 'thank', 'happy', 'sweet', 'kind', 'enjoy', 'calming', 'brilliant', 'fair',
  'welcome', 'please', 'deal']);
const PLAYFUL = new Set(['haha', 'hahaha', 'lol', 'hehe', 'lmao', 'bet', 'dare', 'challenge', 'race', 'imagine', 'vip',
  'speedrun', 'headliner', 'drama', 'masterpiece', 'deal']);
const FEELING_WORDS = new Set(['feel', 'felt', 'feeling', 'nervous', 'lonely', 'alone', 'anxious', 'awkward', 'tired',
  'stressed', 'happy', 'sad', 'scared', 'excited', 'overwhelmed', 'shy']);

// ---------------------------------------------------------------------------
// Episodes (fictional characters; personalities stay consistent across lines)
// ---------------------------------------------------------------------------

export const EPISODES = [
  {
    id: 'quiet-sketcher',
    title: 'The Quiet Sketcher',
    setting: 'Canteen, late afternoon',
    startMood: 0,
    character: {
      name: 'Ira',
      pronouns: 'they/them',
      personality: 'Shy, dry sense of humour, lights up when talking about birds.',
      interest: 'Bird-watching and quick ink sketches',
      portrait: { skin: '#c68a5e', hair: '#2b1d16', accent: '#5fa8c8' },
      mood: 'shy but curious',
    },
    intro: 'Canteen, late afternoon. Someone at the corner table is sketching fast, glancing at the trees outside. Their chai has gone cold.',
    opening: { text: "Oh, hi. Am I blocking the window? I'm trying to sketch that bulbul on the branch before it flies off.", feels: false },
    dismissive: ['kind of boring', 'old people hobby'],
    topics: {
      birds: {
        label: 'birds',
        keywords: ['bird', 'birds', 'bulbul', 'bulbuls', 'birdwatching', 'birding', 'kite', 'myna', 'sparrow', 'feather',
          'feathers', 'species', 'binoculars', 'branch', 'tree', 'trees', 'parrot', 'owl', 'kingfisher', 'nest', 'wings', 'fly', 'flies'],
        replies: [
          { text: "Birds are my favourite thing on campus. The bulbuls here are bold, they steal crumbs. I've spotted 23 species since June!" },
          { text: "Okay, more birds: there's a kingfisher by the pond nobody believes me about. I've sketched it once. Badly. It's my rare bird." },
        ],
        ask: ['What got you into watching birds?', 'Have you spotted anything rare around here?'],
        play: ['Wait, is that bulbul posing for you? It looks like a model haha', 'Okay be honest, which bird here is the biggest drama queen?'],
      },
      sketching: {
        label: 'sketching',
        keywords: ['sketch', 'sketches', 'sketching', 'draw', 'drawing', 'drawings', 'drew', 'art', 'pencil', 'pen', 'sketchbook',
          'notebook', 'page', 'pages', 'ink', 'artist', 'doodle', 'doodles', 'shape', 'shapes', 'tail', 'tails', 'masterpiece', 'museum'],
        replies: [
          { text: 'I sketch in ink, fast. Birds never pose, so you learn to grab the shape in ten seconds. This is my third sketchbook this year.' },
          { text: 'Half my sketches are just tails, because the bird left mid-drawing. My sketchbook is basically a museum of tails.' },
        ],
        ask: ['How do you sketch something that keeps moving?', 'Do you ever go back and finish a sketch later?'],
        play: ['Your sketchbook looks so full! Can I peek at the birds you drew?', "Ten seconds per bird? That's a speedrun haha. Do they all turn out?"],
      },
      spot: {
        label: 'this table',
        keywords: ['canteen', 'chai', 'table', 'corner', 'window', 'view', 'spot', 'seat', 'cold'],
        replies: [
          { text: "I always take this table because the window faces the trees. The chai is awful, but it's the best bird view on campus." },
          { text: "Funny, nobody else sits here. I think people find someone sketching alone a bit odd. I'm used to it, mostly.", feels: true },
        ],
        ask: ['Why this table? Is the view better for sketching?', 'Do you sit at this table most days?'],
        play: ['Is the cold chai part of the artist look? haha', 'Best view on campus? Do you charge entry for this table haha'],
      },
    },
    replies: {
      personal: [
        { text: "Honestly? Sketching is how I unwind. Most people think it's an odd hobby, so I usually do it alone.", feels: true },
        { text: "I'm okay. A bit tired. It's nice to talk though, I don't do this much.", feels: true },
        { text: 'I study design, mostly. But birds take up more of my brain than any class does.' },
      ],
      empathy: [
        { text: "That's kind. Most people just walk past. It's nice that you don't think it's weird. Do you draw at all?" },
        { text: 'Thanks. That actually helps. Sitting alone became a habit more than a choice, you know?', feels: true },
      ],
      ack: [
        { text: '“{echo}”, right? You actually noticed. Okay, I like talking to you.' },
        { text: 'Ha, exactly. You get it. Most people walk straight past the birds.' },
      ],
      greeting: [{ text: 'Hi! You can sit if you like. Just move slowly, the bulbul spooks easily.' }],
      self: [
        { text: 'Oh, nice. Mm-hm. ...Sorry, the bulbul just moved. You were saying?' },
        { text: "Huh. Cool. I'll keep sketching while you talk, if that's okay." },
      ],
      offTopic: [{ text: 'Sorry, “{echo}”? I lost the thread. I was mostly thinking about birds, honestly.' }],
      rude: [{ text: "Oh. Right. Okay. I'll just finish this sketch, then.", feels: true }],
      rude2: [{ text: "I think I'll go sketch somewhere else." }],
      cold: [{ text: 'Mm.' }, { text: 'Okay.' }],
      repair: [{ text: '...Okay. Thanks for saying that. People say worse about my hobby, honestly.', feels: true }],
      repeat: [
        { text: 'You asked me that already! Did I bore you the first time? Ha. Ask me something new.' },
        { text: 'Déjà vu, same question again. Short version: birds, sketches, cold chai. Your turn to surprise me.' },
      ],
      topicMore: [{ text: '{Label} again? You might be the first person who asks me this much. I love it. Ask me anything.' }],
      confused: [{ text: "That's... a lot of words at once. Ha. What did you actually want to ask?" }],
      neutral: [{ text: "Mm-hm. I'm not sure what to say to that, but I'm glad you stopped by." }, { text: 'Mm. The bulbul is still there, look. Ask me anything, I promise I am friendlier than I look.' }],
    },
    closing: {
      warm: "I have to run to class. Come find me here tomorrow? I'll show you the kingfisher sketch.",
      neutral: 'I should head to class. It was nice talking, really.',
      guarded: "I'm going to head off now. Bye.",
    },
    suggest: {
      first: [
        'Hi! Is that a bulbul? It looks like it is posing for you haha',
        'Hey, sorry to interrupt. What are you sketching?',
        'Hi. I just need somewhere to sit, my class starts soon.',
      ],
      empathy: [
        "That doesn't sound odd at all. It sounds really calming.",
        'I get that. Is it hard doing it alone, or do you like it?',
        "Honestly, that's lovely, not weird. Can I sit with you for a bit?",
      ],
      repair: ["Sorry, that came out wrong. I didn't mean it.", 'My bad. Can you show me what you are drawing?'],
      offkey: ['Birds are kind of boring, no?', "I'm more of a phone person, I never notice this stuff.", 'My week is crazy, I have three submissions.'],
      soso: ['Cool.', 'Okay, nice.', "The canteen's crowded today."],
    },
  },
  {
    id: 'after-the-club',
    title: 'After the Club Meeting',
    setting: 'Outside the Student Activity Centre, evening',
    startMood: -1,
    character: {
      name: 'Mehr',
      pronouns: 'she/her',
      personality: 'First-year, earnest and a little nervous; chatty and funny once she relaxes.',
      interest: 'Ukulele and writing small songs',
      portrait: { skin: '#e0b48c', hair: '#3a2418', accent: '#d97a8a' },
      mood: 'nervous, feeling left out',
    },
    intro: 'Outside the Student Activity Centre. The music club meeting just ended. A first-year lingers by the steps, holding a ukulele case.',
    opening: { text: 'Hey… were you in there too? Everyone already knew each other. I just stood by the door holding my ukulele.', feels: true },
    dismissive: ['just talk to people', 'joke instrument', 'get over it'],
    topics: {
      ukulele: {
        label: 'the ukulele',
        keywords: ['ukulele', 'uke', 'instrument', 'strum', 'strumming', 'chord', 'chords', 'strings', 'play', 'playing', 'played', 'guitar', 'tune'],
        replies: [
          { text: "I've played ukulele since tenth grade. My cousin gave me this one. It's a bit out of tune, like me today, ha." },
          { text: 'I know about twelve chords and one very dramatic strum. I was hoping to find someone here to jam with.' },
        ],
        ask: ['How long have you been playing the ukulele?', 'What do you like playing on it most?'],
        play: ['A ukulele! Do you know any songs that could cheer up a Monday?', 'Out of tune like you today? haha. What song would cheer you both up?'],
      },
      songs: {
        label: 'songwriting',
        keywords: ['song', 'songs', 'music', 'write', 'writing', 'songwriting', 'lyrics', 'sing', 'singing', 'melody', 'compose', 'chorus'],
        replies: [
          { text: "I write little songs, mostly about home. I haven't played them for anyone here yet. Too nervous.", feels: true },
          { text: "One song is about the hostel ceiling fan. It's sillier than it sounds. Or exactly as silly, honestly." },
        ],
        ask: ['Do you write your own songs?', 'What are your songs usually about?'],
        play: ['Wait, do you write songs? Am I talking to a future headliner?', 'Songs about home! Is there one about the hostel food yet? haha'],
      },
      club: {
        label: 'the club',
        keywords: ['club', 'meeting', 'members', 'seniors', 'auditions', 'audition', 'session', 'sessions', 'thursday', 'group', 'door'],
        replies: [
          { text: "The seniors were nice, just busy catching up. Next session is Thursday. I don't know if I'll go back.", feels: true },
          { text: 'Maybe Thursday is less scary if I know one person there. Do you think it gets easier?', feels: true },
        ],
        ask: ['What was the meeting like for you?', 'Are you thinking of going back on Thursday?'],
        play: ["Was the meeting more 'band practice' or 'family reunion'? haha", 'Thursday session: should we make a dramatic entrance together?'],
      },
      home: {
        label: 'home',
        keywords: ['home', 'hostel', 'city', 'first', 'year', 'school', 'settling', 'semester', 'family', 'miss', 'missing', 'shillong'],
        replies: [
          { text: "I'm from Shillong. It's my third week. Everything here is loud and new, I'm still figuring out where people hang out.", feels: true },
          { text: 'I miss home a bit. My friends there used to sing with me on the roof. I haven’t found that here yet.', feels: true },
        ],
        ask: ['How are your first weeks here going?', 'What do you miss most about home?'],
        play: ['Okay, first-year survival check: how many times have you got lost on campus? haha', 'Third week and still finding the hangout spots? Want a tour guide? haha'],
      },
    },
    replies: {
      personal: [
        { text: "Honestly, I'm a bit nervous. Everyone seems to have their people already. I thought music would be my way in.", feels: true },
        { text: "Better now that someone's talking to me, ha. It's been a long week.", feels: true },
        { text: "I'm doing economics, but music is the part of me I actually like." },
      ],
      empathy: [
        { text: 'That helps, honestly. I thought it was just me who felt like that.', feels: true },
        { text: 'Thank you. Okay, I feel less silly about standing by the door now.' },
      ],
      ack: [
        { text: 'Yes! “{echo}”, exactly. Sorry, I talk a lot when I’m nervous.' },
        { text: "Right. You're easy to talk to, you know that?" },
      ],
      greeting: [{ text: "Oh, hi! Sorry, I'm in the way. Everyone's leaving and I'm just standing here.", feels: true }],
      self: [
        { text: "Oh. That's nice. ...I should probably head back to the hostel soon." },
        { text: 'Mm, okay. Cool.' },
      ],
      offTopic: [{ text: 'Sorry, “{echo}”? My head is still in that meeting, I think.' }],
      rude: [{ text: "Oh. Okay. Yeah, maybe I don't really fit here.", feels: true }],
      rude2: [{ text: "I'm going to go now." }],
      cold: [{ text: 'Okay.' }, { text: 'Mm.' }],
      repair: [{ text: "Okay. Thanks. Sorry, I'm a bit sensitive today.", feels: true }],
      repeat: [
        { text: "You asked that already, I think? It's okay, I zone out too. Ask me anything else." },
        { text: "Same question again? Ha, now I'm the one who feels like a senior. Try me with something new." },
      ],
      topicMore: [{ text: '{Label} again? Okay, you might actually be my first fan. Ask me anything.' }],
      confused: [{ text: "Um. That's a lot of words. I'm not sure what you're asking?" }],
      neutral: [{ text: "Okay. I'm not sure what to say, but thanks for stopping." }, { text: 'Yeah… Sorry, I am bad at small talk. Ask me anything, honestly.' }],
    },
    closing: {
      warm: "I'll go on Thursday if you come too. Deal? Thanks for stopping. Really.",
      neutral: 'I should get back. Thanks for talking to me.',
      guarded: "I'll go now. Bye.",
    },
    suggest: {
      first: [
        'Hey! I saw you at the meeting. Is that a ukulele?',
        'Hi. Rough meeting? You looked a bit lost in there.',
        'Hey, do you know where the canteen is? I am starving.',
      ],
      empathy: [
        'That sounds really hard. Lots of people feel that in their first weeks.',
        'Standing by the door takes guts, honestly. You still showed up.',
        'That makes sense. New places are a lot. Want to walk back together?',
      ],
      repair: ['Sorry, that was a mean thing to say. I didn’t mean it.', 'My bad. Can I hear you play something?'],
      offkey: ["Just talk to people, it's not that deep.", "I'm in four clubs already, my schedule is insane.", 'Ukuleles are kind of a joke instrument, no?'],
      soso: ['Okay.', 'Cool, cool.', "It's hot today."],
    },
  },
  {
    id: 'quiet-night',
    title: 'Not Your Kind of Night',
    setting: 'Fest night, away from the main stage',
    startMood: 0,
    character: {
      name: 'Tenzin',
      pronouns: 'he/him',
      personality: 'Calm, wry and thoughtful; prefers quiet nights to crowds and is not sad about it.',
      interest: 'Stargazing with a small telescope',
      portrait: { skin: '#b9825a', hair: '#141414', accent: '#8a5a9e' },
      mood: 'calm, a little defensive about skipping the fest',
    },
    intro: 'Fest night. Bass from the main stage shakes the air. Away from it all, someone sits on the steps with a small telescope.',
    opening: { text: "Fest's that way, if you're looking for it. I'm skipping it to watch Jupiter rise. Crowds wear me out, honestly.", feels: true },
    dismissive: ['missing out', 'no life', 'loner', 'antisocial', 'old man', 'way better than this'],
    topics: {
      stars: {
        label: 'the stars',
        keywords: ['star', 'stars', 'jupiter', 'planet', 'planets', 'sky', 'telescope', 'moon', 'moons', 'constellation',
          'constellations', 'astronomy', 'stargazing', 'orion', 'saturn', 'galaxy', 'comet', 'east'],
        replies: [
          { text: "Jupiter's that bright dot, low in the east. Through this telescope you can see four of its moons. Want a look?" },
          { text: 'My grandfather taught me the constellations. I still name them under my breath, like checking on old friends.' },
        ],
        ask: ['What are you looking at through the telescope?', 'How did you get into stargazing?'],
        play: ['Is Jupiter putting on a better show than the headliner tonight? haha', 'Four moons through that tiny telescope? haha How did you get into this?'],
      },
      quiet: {
        label: 'quiet nights',
        keywords: ['quiet', 'calm', 'peace', 'peaceful', 'recharge', 'introvert', 'silence', 'reading', 'book', 'books', 'slow', 'rest', 'skip', 'skipping'],
        replies: [
          { text: "Quiet nights are how I recharge. People think skipping the fest means I'm sad. I'm not. Mostly.", feels: true },
          { text: "Sometimes I wish I liked crowds. It'd be easier. But this feels more like me.", feels: true },
        ],
        ask: ['What do you like about quiet nights?', 'Do people ever give you a hard time for skipping?'],
        play: ['So this is the VIP section of fest night? haha', 'Is there a dress code for the quiet club, or can I join as is?'],
      },
      fest: {
        label: 'the fest',
        keywords: ['fest', 'festival', 'concert', 'dance', 'crowd', 'crowds', 'party', 'dj', 'stage', 'headliner', 'band', 'loud', 'noise', 'lineup', 'bass'],
        replies: [
          { text: 'I went to the fest last year. Fun for an hour, then my ears and brain both wanted out. I like hearing it from here.' },
          { text: "Maybe I'd go for the opening act, with someone who'd leave early with me. That could work." },
        ],
        ask: ['Have you ever been to the fest?', 'Would you go if someone left early with you?'],
        play: ['Rating the fest from up here: how many stars out of five? haha', 'Want a fest buddy with a strict leave-at-ten rule?'],
      },
    },
    replies: {
      personal: [
        { text: "I'm good. Calm. It's the first quiet hour I've had all week." },
        { text: "Honestly, I sometimes feel like the only one not at the fest. It's a weird kind of lonely.", feels: true },
        { text: 'I study physics. The sky is the one homework I never mind.' },
      ],
      empathy: [
        { text: "Thanks. It's nice when someone doesn't try to drag me to the stage." },
        { text: "Yeah. That's it exactly. You get it more than most people tonight." },
      ],
      ack: [
        { text: "“{echo}”, right. You're actually listening. That's rare on fest night." },
        { text: "Ha, exactly. You'd make a decent stargazer." },
      ],
      greeting: [{ text: "Hey. You're welcome to sit. The steps are free, the view is free, the quiet is free." }],
      self: [
        { text: 'Mm. Sounds like a big night for you. Have fun out there.' },
        { text: "Cool. I'll be here with Jupiter if you need a break." },
      ],
      offTopic: [{ text: '“{echo}”? Sorry, I was half listening to the bass. Say again?' }],
      rude: [{ text: "Okay. Everyone has an opinion on how I spend my nights. I'll stick with the sky.", feels: true }],
      rude2: [{ text: "I'll let you get back to the fest." }],
      cold: [{ text: 'Mm.' }, { text: 'Sure.' }],
      repair: [{ text: "Fair. Thanks for saying that. I get a lot of 'you're missing out' tonight.", feels: true }],
      repeat: [
        { text: 'You asked that already. Still the same answer, ha. Try me with something new.' },
        { text: "Same question twice? Now you're orbiting. I like it, but ask me something else." },
      ],
      topicMore: [{ text: "{Label} again? Careful, I could talk about this until sunrise. What else?" }],
      confused: [{ text: "That's a lot of words at once. What are you actually asking?" }],
      neutral: [{ text: "Mm. Not sure what to say to that. The sky's nice, though." }, { text: 'Sure. The quiet is good for slow conversations. Ask me anything.' }],
    },
    closing: {
      warm: "Jupiter's up. Next clear night, come by with a snack and I'll show you Saturn. Deal?",
      neutral: "I'm going to stay a bit longer. Enjoy your night.",
      guarded: "I'll stay here. Have a good night.",
    },
    suggest: {
      first: [
        'Hey, mind if I sit? Is that Jupiter you are looking at?',
        'Hi! Escaping the bass too? haha',
        "Hey, you're missing out, the fest is the best night of the year.",
      ],
      empathy: [
        'That makes sense. Recharging is important, not sad.',
        'Honestly, crowds wear me out too sometimes.',
        "That's fair. Not everyone has to love the same nights. Can I look too?",
      ],
      repair: ['Sorry, that was rude. Your night, your choice.', 'My bad. Can I look through the telescope?'],
      offkey: ['You should come to the fest, it is way better than this.', "I've got backstage passes, I know all the bands.", 'Stars are just dots, no?'],
      soso: ['Cool.', 'Nice night.', 'Loud, huh.'],
    },
  },
];

export const RANKS = [
  { id: 'spark', title: 'Spark', min: 0, line: 'Every connection starts with a spark.' },
  { id: 'friendly-wave', title: 'Friendly Wave', min: 6, line: 'You opened a door. A few more questions and they would walk through it.' },
  { id: 'bridge-builder', title: 'Bridge Builder', min: 10, line: 'You built a real two-way conversation.' },
  { id: 'kindred-spirit', title: 'Kindred Spirit', min: 13, line: 'They felt seen. That is the whole point.' },
];
export const MAX_TOTAL = 15;
// Passing requires a Bridge Builder result or better.
export const CONVERSATION_PASS_SCORE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export class ConversationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConversationError';
    this.code = code;
  }
}

function getEpisode(id) {
  return EPISODES.find((e) => e.id === id) || null;
}

function normalise(text) {
  return String(text).toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

function tokens(text) {
  return normalise(text).match(/[a-z0-9']+/g)?.map((t) => t.replace(/^'+|'+$/g, '')).filter(Boolean) || [];
}

function stem(w) {
  let s = w.replace(/'s$/, '');
  if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith('es') && s.length > 5) s = s.slice(0, -2);
  else if (s.endsWith('s') && s.length > 3 && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
}

function contentStems(text) {
  return new Set(tokens(text).filter((t) => t.length >= 3 && !STOP.has(t)).map(stem));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Phrase present and not directly negated ("not boring" is not rude).
function hasPhrase(norm, phrase, { negatable = false } = {}) {
  const re = new RegExp(`(^|[^a-z'])${escapeRe(phrase)}(?=$|[^a-z])`, 'g');
  let m;
  while ((m = re.exec(norm))) {
    if (!negatable) return true;
    const before = norm.slice(Math.max(0, m.index - 12), m.index + m[1].length);
    if (!/(not|n't|never|isn't|no)\s+(so\s+|that\s+|at all\s+)?$/.test(before)) return true;
  }
  return false;
}

function countPhrases(norm, list, opts) {
  return list.reduce((n, p) => n + (hasPhrase(norm, p, opts) ? 1 : 0), 0);
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function clampMood(m) {
  return Math.max(MOOD_MIN, Math.min(MOOD_MAX, m));
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lastCharacterLine(state, ep) {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].from === 'character') return state.messages[i];
  }
  return { text: ep.opening.text, feels: !!ep.opening.feels, topic: null };
}

function topicKeyStems(topic) {
  return new Set(topic.keywords.map((k) => stem(k)));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startEpisode(episodeId) {
  const ep = getEpisode(episodeId);
  if (!ep) throw new ConversationError('UNKNOWN_EPISODE', `Unknown episode: ${episodeId}`);
  return {
    episodeId: ep.id,
    turn: 0,
    messages: [],
    mood: ep.startMood,
    memory: {
      askedAbout: [],
      topicCounts: {},
      sharedFacts: [],
      mentionedFeelings: false,
      guarded: false,
      wasRude: false,
      repaired: false,
      intentCounts: {},
      lastTopic: null,
    },
    done: false,
  };
}

// Rule-based analysis of one player message in the context of the episode.
export function analyseMessage(text, state) {
  const ep = getEpisode(state && state.episodeId);
  if (!ep) throw new ConversationError('UNKNOWN_EPISODE', 'analyseMessage needs a valid state');
  const raw = String(text ?? '');
  const norm = normalise(raw);
  const toks = tokens(raw);
  const words = toks.length;
  const last = lastCharacterLine(state, ep);
  const prevFeels = !!last.feels;

  const youCount = toks.filter((t) => YOU.has(t)).length;
  const meCount = toks.filter((t) => ME.has(t)).length;

  // Topic keyword hits for this character's interests.
  const stems = toks.map(stem);
  let topic = null;
  let best = 0;
  let topicTokens = 0;
  const topicsHit = [];
  for (const [key, t] of Object.entries(ep.topics)) {
    const ks = topicKeyStems(t);
    const hits = stems.filter((s) => ks.has(s)).length;
    topicTokens += hits;
    if (hits > 0) topicsHit.push(key);
    const fewer = topic && (state.memory?.topicCounts?.[key] || 0) < (state.memory?.topicCounts?.[topic] || 0);
    if (hits > best || (hits > 0 && hits === best && fewer)) { best = hits; topic = key; }
  }

  const myStems = contentStems(raw);
  const lastStems = contentStems(last.text);
  const overlapWords = [...myStems].filter((s) => lastStems.has(s));
  const overlap = overlapWords.length;
  const reflection = countPhrases(norm, REFLECT) > 0;

  const rude = countPhrases(norm, RUDE, { negatable: true }) > 0 || countPhrases(norm, ep.dismissive, { negatable: true }) > 0;
  const apology = countPhrases(norm, APOLOGY) > 0;
  const empathyHits = countPhrases(norm, EMPATHY, { negatable: false });
  const greeting = GREET.has(toks[0]) || /^good (morning|afternoon|evening)/.test(norm);
  const positive = toks.some((t) => POSITIVE.has(t));
  const playful = toks.some((t) => PLAYFUL.has(t)) || /!|\?\?|[\u{1F300}-\u{1FAFF}]/u.test(raw);
  const mentionsFeelings = toks.some((t) => FEELING_WORDS.has(t)) && meCount > 0;

  const hasQ = raw.includes('?') || Q_START.has(toks[0]) || (greeting && Q_START.has(toks[1]));
  const aboutThem = youCount > 0 || topicsHit.length > 0;
  const personal = toks.some((t) => PERSONAL.has(t));

  // Keyword stuffing: a pile of topic words / feeling phrases with little sentence around them.
  const stuffed = (topicTokens >= 4 && topicTokens / Math.max(words, 1) >= 0.4) || empathyHits >= 4
    || (topicsHit.length >= 3 && words <= 10);
  const ramble = words > 30;

  const minimal = words <= 3 && !hasQ && !greeting && !rude && overlap === 0 && topicsHit.length === 0;
  const offTopic = !minimal && !stuffed && !rude && overlap === 0 && topicsHit.length === 0 && empathyHits === 0 && !(greeting && words <= 4)
    && !apology && !reflection && !(hasQ && youCount > 0 && personal);
  const question = hasQ && aboutThem && !rude && !stuffed && !offTopic;
  const curiosity = question && !offTopic && (topicsHit.length > 0 || overlap > 0);
  const acknowledges = !stuffed && !rude && (overlap > 0 || reflection);
  const empathy = prevFeels && !stuffed && !rude && (empathyHits > 0 || apology);
  const selfFocus = meCount >= 2 && youCount === 0 && !hasQ;

  // Near-duplicate of an earlier player message?
  let repeatOf = null;
  const players = state.messages.filter((m) => m.from === 'player');
  for (let i = 0; i < players.length; i++) {
    const other = players[i].text;
    const same = normalise(other) === norm;
    const sim = jaccard(contentStems(other), myStems);
    if (same || (myStems.size > 0 && sim >= 0.7)) { repeatOf = i; break; }
  }

  // Word from the player's message to echo back (prefer an overlapping word).
  const echoSource = toks.filter((t) => t.length >= 4 && !STOP.has(t) && !YOU.has(t) && !ME.has(t));
  const echo = (echoSource.find((t) => lastStems.has(stem(t))) || echoSource.sort((a, b) => b.length - a.length)[0] || '').slice(0, 20);

  return {
    greeting,
    question,
    curiosity,
    topic: curiosity ? topic : null,
    topicsHit,
    acknowledges,
    overlap,
    reflection,
    empathy,
    prevFeels,
    kindWords: empathyHits > 0,
    selfFocus,
    dismissive: rude,
    rude,
    apology,
    positive,
    playful,
    mentionsFeelings,
    offTopic,
    minimal,
    stuffed,
    ramble,
    repeatOf,
    echo,
    length: raw.trim().length,
    words,
  };
}

function chooseIntent(f, memory) {
  if (f.rude) return memory.guarded ? 'rude2' : 'rude';
  if (memory.guarded) return (f.apology || f.kindWords || f.question || f.positive) ? 'repair' : 'cold';
  if (f.repeatOf !== null) return 'repeat';
  if (f.stuffed) return 'confused';
  // A kind word plus a real question: answer the question (the kindness still counts in scoring).
  if (f.curiosity && f.topic) return 'topic';
  if (f.empathy) return 'empathy';
  if (f.question) return 'personal';
  if (f.acknowledges) return 'ack';
  if (f.selfFocus) return 'self';
  if ((f.kindWords || f.positive) && !f.minimal) return 'ack';
  if (f.greeting) return 'greeting';
  if (f.offTopic) return 'offTopic';
  return 'neutral';
}

const MOOD_DELTA = {
  rude: -2, rude2: -1, cold: 0, repair: 2, repeat: 0, confused: 0, empathy: 1, topic: 1, topicMore: 1,
  personal: 1, ack: 1, self: 0, greeting: 1, offTopic: 0, neutral: 0,
};
const EMOTION_BY_INTENT = {
  rude: 'hurt', rude2: 'hurt', cold: 'guarded', repair: 'relieved', repeat: 'amused', confused: 'puzzled',
  empathy: 'touched', offTopic: 'puzzled', self: 'distracted',
};
const EMOTION_BY_MOOD = ['guarded', 'unsure', 'neutral', 'warm', 'delighted'];

function fill(text, { echo, label }) {
  return text
    .replace('{echo}', echo || 'that')
    .replace('{Label}', cap(label || 'that'))
    .replace('{label}', label || 'that');
}

export function sendMessage(state, text) {
  const ep = getEpisode(state && state.episodeId);
  if (!ep) throw new ConversationError('UNKNOWN_EPISODE', 'sendMessage needs a valid state');
  if (state.done || state.turn >= TURNS) throw new ConversationError('DONE', `The conversation is over after ${TURNS} messages.`);
  const clean = typeof text === 'string' ? text.trim() : '';
  if (!clean) throw new ConversationError('EMPTY', 'Type a message first.');
  if (clean.length > MAX_CHARS) throw new ConversationError('TOO_LONG', `Keep it under ${MAX_CHARS} characters.`);

  const f = analyseMessage(clean, state);
  const memory = JSON.parse(JSON.stringify(state.memory));
  let intent = chooseIntent(f, memory);

  let entry;
  let replyTopic = null;
  if (intent === 'topic') {
    const count = memory.topicCounts[f.topic] || 0;
    const t = ep.topics[f.topic];
    replyTopic = f.topic;
    if (count < t.replies.length) {
      entry = t.replies[count];
      memory.sharedFacts.push(`${f.topic}:${count}`);
    } else {
      intent = 'topicMore';
      entry = ep.replies.topicMore[0];
    }
    memory.topicCounts[f.topic] = count + 1;
    if (!memory.askedAbout.includes(f.topic)) memory.askedAbout.push(f.topic);
    memory.lastTopic = f.topic;
  } else {
    let bank = ep.replies[intent];
    // Only echo the player's word back when it really overlaps with the last line.
    if (intent === 'ack') bank = bank.filter((r) => (f.overlap > 0) === r.text.includes('{echo}'));
    const n = memory.intentCounts[intent] || 0;
    entry = bank[n % bank.length];
  }
  memory.intentCounts[intent] = (memory.intentCounts[intent] || 0) + 1;

  if (intent === 'rude' || intent === 'rude2') { memory.guarded = true; memory.wasRude = true; }
  if (intent === 'repair') { memory.guarded = false; memory.repaired = true; }
  if (f.mentionsFeelings) memory.mentionedFeelings = true;

  const mood = clampMood(state.mood + (MOOD_DELTA[intent] || 0));
  const emotion = EMOTION_BY_INTENT[intent] || EMOTION_BY_MOOD[mood + 2];
  const label = replyTopic ? ep.topics[replyTopic].label : (memory.lastTopic ? ep.topics[memory.lastTopic].label : '');
  const replyText = fill(entry.text, { echo: f.echo, label });

  const turn = state.turn + 1;
  const done = turn >= TURNS;
  const messages = [
    ...state.messages,
    { from: 'player', turn, text: clean, features: f },
    { from: 'character', turn, text: replyText, intent, topic: replyTopic, feels: !!entry.feels, mood, emotion },
  ];
  const reply = { text: replyText, mood, emotion };
  if (done) {
    const closing = memory.guarded || mood <= -1 ? ep.closing.guarded : mood >= 1 ? ep.closing.warm : ep.closing.neutral;
    reply.final = closing;
    messages.push({ from: 'character', turn, text: closing, intent: 'closing', topic: null, feels: false, mood, emotion });
  }
  return { state: { ...state, turn, messages, mood, memory, done }, reply };
}

// Three suggested messages: two good ones in different styles (thoughtful,
// playful) plus one so-so or off-key option. Order rotates per turn.
export function suggestions(state) {
  const ep = getEpisode(state && state.episodeId);
  if (!ep) throw new ConversationError('UNKNOWN_EPISODE', 'suggestions needs a valid state');
  if (state.done) return [];
  const turn = state.turn;
  const epIndex = EPISODES.indexOf(ep);
  let texts;
  if (turn === 0) {
    texts = [...ep.suggest.first];
  } else {
    const memory = state.memory;
    const last = lastCharacterLine(state, ep);
    const keys = Object.keys(ep.topics);
    let key = memory.lastTopic && (memory.topicCounts[memory.lastTopic] || 0) < 2 ? memory.lastTopic : null;
    if (!key) key = keys.find((k) => !memory.topicCounts[k]) || keys[turn % keys.length];
    const level = Math.min(memory.topicCounts[key] || 0, 1);
    const t = ep.topics[key];
    const thoughtful = memory.guarded
      ? ep.suggest.repair[turn % ep.suggest.repair.length]
      : last.feels ? ep.suggest.empathy[turn % ep.suggest.empathy.length] : t.ask[level];
    const playful = t.play[level];
    const third = turn % 2 === 0
      ? ep.suggest.offkey[(turn / 2) % ep.suggest.offkey.length]
      : ep.suggest.soso[((turn - 1) / 2) % ep.suggest.soso.length];
    texts = [thoughtful, playful, third];
  }
  // De-duplicate (fallback to the alternative question) and rotate.
  const seen = new Set();
  texts = texts.map((x, i) => {
    let s = x;
    if (seen.has(s)) s = ep.suggest.soso[(turn + i) % ep.suggest.soso.length];
    seen.add(s);
    return s;
  });
  const shift = (turn + epIndex) % 3;
  const rotated = [...texts.slice(shift), ...texts.slice(0, shift)];
  return rotated.map((text, i) => ({ id: `t${turn}-${i}`, text }));
}

// ---------------------------------------------------------------------------
// Evaluation (whole conversation)
// ---------------------------------------------------------------------------

function band(points, steps) {
  // steps: [for1, for2, for3]
  if (points >= steps[2]) return 3;
  if (points >= steps[1]) return 2;
  if (points >= steps[0]) return 1;
  return 0;
}

function messageValue(f) {
  return (f.question ? 1 : 0) + (f.curiosity ? 1 : 0) + (f.acknowledges ? 1 : 0) + (f.empathy ? 2 : 0)
    + (f.positive || f.playful ? 0.5 : 0) - (f.rude ? 3 : 0) - (f.repeatOf !== null ? 2 : 0)
    - (f.selfFocus ? 1 : 0) - (f.stuffed ? 2 : 0) - (f.offTopic ? 1 : 0);
}

function quote(text) {
  return text.length > 70 ? `${text.slice(0, 67).trimEnd()}…` : text;
}

export function evaluate(state) {
  const ep = getEpisode(state && state.episodeId);
  if (!ep) throw new ConversationError('UNKNOWN_EPISODE', 'evaluate needs a valid state');
  const players = (state.messages || []).filter((m) => m.from === 'player');
  if (!state.done || players.length !== TURNS) {
    throw new ConversationError('NOT_DONE', `Evaluation needs exactly ${TURNS} messages (have ${players.length}).`);
  }
  const fs = players.map((m) => m.features);
  const isRepeat = (f) => f.repeatOf !== null;
  const rudeTurns = fs.filter((f) => f.rude).length;

  // Friendliness: warm, kind or interested turns; rudeness costs more than kindness earns.
  const warm = fs.filter((f) => !f.rude && !f.stuffed && !isRepeat(f)
    && (f.greeting || f.positive || f.kindWords || f.playful || f.apology || (f.question && !f.offTopic))).length;
  const friendlyPts = warm + (rudeTurns === 0 ? 1 : 0) - 2 * rudeTurns + (state.memory.repaired ? 1 : 0);
  const friendliness = band(friendlyPts, [1, 3, 4]);

  // Curiosity: distinct genuine questions about them, plus distinct topics explored.
  const genuineQs = fs.filter((f) => f.question && !f.offTopic && !isRepeat(f)).length;
  const topicsAsked = new Set(fs.filter((f) => f.curiosity && !isRepeat(f) && f.topic).map((f) => f.topic)).size;
  const curiosity = band(genuineQs + topicsAsked, [1, 3, 5]);

  // Responsiveness: did message n build on the character line just before it?
  const responsiveTurns = fs.filter((f) => !f.rude && !f.stuffed && !isRepeat(f)
    && (f.overlap > 0 || f.empathy || (f.reflection && !f.offTopic))).length;
  const responsiveness = band(responsiveTurns, [1, 3, 4]);

  // Empathy: only judged on turns where the character had just expressed a feeling.
  const opportunities = fs.filter((f) => f.prevFeels);
  let empathy;
  if (opportunities.length === 0) {
    // No feelings came up. Neutral if the player asked enough to give them the chance.
    empathy = genuineQs >= 2 ? 2 : 1;
  } else {
    const credit = opportunities.reduce((n, f) => {
      if (f.rude || f.stuffed || isRepeat(f)) return n;
      if (f.empathy) return n + 1;
      if (f.acknowledges || f.question) return n + 0.4;
      return n;
    }, 0);
    const ratio = credit / opportunities.length;
    empathy = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : ratio > 0 ? 1 : 0;
  }

  // Flow: a conversation that moves forward. Repeats, off-topic turns, stuffing,
  // rambling, rudeness and not building on replies all break the flow.
  const repeats = fs.filter(isRepeat).length;
  const penalties = repeats + fs.filter((f) => f.offTopic).length + fs.filter((f) => f.stuffed).length
    + (fs.filter((f) => f.ramble).length >= 2 ? 1 : 0) + rudeTurns
    + (responsiveTurns < 2 ? 1 : 0) + (fs.filter((f) => f.selfFocus).length >= 3 ? 1 : 0)
    + (fs.filter((f) => f.minimal).length >= 2 ? 1 : 0);
  const flow = Math.max(0, Math.min(3, 3 - penalties));

  const scores = { friendliness, curiosity, responsiveness, empathy, flow };
  const total = friendliness + curiosity + responsiveness + empathy + flow;
  const r = [...RANKS].reverse().find((x) => total >= x.min);
  const rank = { id: r.id, title: r.title };

  // Highlight: the strongest single player message, quoted.
  let bestI = 0;
  let bestV = -Infinity;
  fs.forEach((f, i) => { const v = messageValue(f); if (v > bestV) { bestV = v; bestI = i; } });
  const bf = fs[bestI];
  const name = ep.character.name;
  const q = quote(players[bestI].text);
  let highlight;
  if (bestV < 1) highlight = `You opened with “${quote(players[0].text)}”. That's a start. Next time, build on what ${name} says.`;
  else if (bf.empathy) highlight = `“${q}” — that made ${name} feel heard.`;
  else if (bf.curiosity) highlight = `“${q}” — that showed real interest in ${name}'s world.`;
  else if (bf.acknowledges) highlight = `“${q}” — that built on what ${name} had just said.`;
  else highlight = `“${q}” — that kept the conversation going.`;

  // Suggestion: one tip for the weakest dimension.
  const TIPS = {
    curiosity: `Ask about them: one genuine question about what ${name} loves beats talking about yourself.`,
    responsiveness: 'Pick up a word from their last line and ask about it. It shows you were listening.',
    empathy: 'When someone shares a feeling, name it back before moving on, like “that sounds hard”.',
    friendliness: 'Open with a warm hello and react kindly. A simple “that’s cool!” goes a long way.',
    flow: 'Try not to repeat yourself. Let each message move the chat one step further.',
  };
  const order = ['curiosity', 'responsiveness', 'empathy', 'friendliness', 'flow'];
  const weakest = order.reduce((w, k) => (scores[k] < scores[w] ? k : w), order[0]);
  const suggestion = scores[weakest] >= 3
    ? `Next time, suggest a small next step together, like meeting ${name} again.`
    : TIPS[weakest];

  const finalMood = state.mood;
  const feltWord = finalMood >= 2 ? 'delighted' : finalMood >= 1 ? 'warm' : finalMood >= 0 ? 'okay' : finalMood >= -1 ? 'unsure' : 'guarded';
  const summary = `${rank.title}: ${total}/${MAX_TOTAL} with ${name}. ${name} left feeling ${feltWord}. ${r.line}`;

  return {
    episodeId: ep.id,
    messages: players.length,
    scores,
    total,
    maxTotal: MAX_TOTAL,
    passed: total >= CONVERSATION_PASS_SCORE,
    rank,
    highlight,
    suggestion,
    summary,
    engine: ENGINE_LABEL,
  };
}

// Validates the plain completion summary the UI reports.
export function validateResult(result) {
  const errors = [];
  if (!result || typeof result !== 'object') return { ok: false, value: null, errors: ['result must be an object'] };
  if (!getEpisode(result.episodeId)) errors.push('unknown episodeId');
  if (result.messages !== TURNS) errors.push(`messages must be ${TURNS}`);
  if (!Number.isInteger(result.total) || result.total < 0 || result.total > MAX_TOTAL) errors.push(`total must be an integer 0..${MAX_TOTAL}`);
  const rank = result.rank && RANKS.find((r) => r.id === result.rank.id);
  if (!rank || result.rank.title !== rank.title) errors.push('unknown rank');
  else if (Number.isInteger(result.total)) {
    const expected = [...RANKS].reverse().find((x) => result.total >= x.min);
    if (expected && expected.id !== rank.id) errors.push('rank does not match total');
  }
  if (errors.length) return { ok: false, value: null, errors };
  return { ok: true, value: { episodeId: result.episodeId, messages: TURNS, total: result.total, rank: { id: rank.id, title: rank.title } }, errors: [] };
}
