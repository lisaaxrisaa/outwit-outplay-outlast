import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from './components/layout/Header';
import MeetPhase from './components/phases/MeetPhase';
import ImmunityIntroPhase from './components/phases/ImmunityIntroPhase';
import ImmunityPepPhase from './components/phases/ImmunityPepPhase';
import ImmunityPuzzlePhase from './components/phases/ImmunityPuzzlePhase';
import ImmunityResultPhase from './components/phases/ImmunityResultPhase';
import ConversationPhase from './components/phases/ConversationPhase';
import TribalPhase from './components/phases/TribalPhase';
import RevealPhase from './components/phases/RevealPhase';
import FinalPhase from './components/phases/FinalPhase';
import {
  CHALLENGE_META,
  SEQUENCE_SYMBOLS,
  badgeColor,
  callClaude,
  createCipherChallenge,
  createJigsawPieces,
  createMaze,
  createMemoryDeck,
  createRopeUntangleChallenge,
  createSlidingBoard,
  createSequenceChallenge,
  createTorchLightingChallenge,
  createWaterPouringChallenge,
  getRotatedPipeConnections,
  parseClaudeJson,
  pickChallengeType
} from './lib/gameUtils';

const CAMP_ZONES = [
  {
    id: 'palm',
    label: 'Large Palm',
    description: 'under the large palm near the water well',
    clue: 'Roots keep secrets where the shade never leaves.',
    hotspot: { x: 17, y: 29 }
  },
  {
    id: 'shelter',
    label: 'Shelter',
    description: 'tucked into the shelter frame above sleeping mats',
    clue: 'Where tired bodies hide from rain, look where bamboo crosses.',
    hotspot: { x: 38, y: 24 }
  },
  {
    id: 'well',
    label: 'Water Well',
    description: 'beside the water well under loose rope',
    clue: 'Where water remembers every hand that reaches for it.',
    hotspot: { x: 57, y: 33 }
  },
  {
    id: 'firepit',
    label: 'Fire Pit',
    description: 'buried near the base of the fire pit',
    clue: 'Where the fire dies, ash keeps one last truth.',
    hotspot: { x: 50, y: 53 }
  },
  {
    id: 'rocks',
    label: 'Rock Pile',
    description: 'wedged in the rocks at the north edge of camp',
    clue: 'Stone against stone, where shadows split at dusk.',
    hotspot: { x: 74, y: 35 }
  },
  {
    id: 'shoreline',
    label: 'Shoreline',
    description: 'near the shoreline under driftwood and wet sand',
    clue: 'At the edge where water steals footprints by morning.',
    hotspot: { x: 84, y: 66 }
  }
];

const MAX_CAMP_SEARCHES = 4;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_WAITLIST_TABLE = import.meta.env.VITE_SUPABASE_WAITLIST_TABLE || 'waitlist_signups';
const CLAUDE_CLIENT_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function segmentsIntersect(a, b, c, d) {
  const cross = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const onSegment = (p1, p2, p3) =>
    Math.min(p1.x, p2.x) <= p3.x && p3.x <= Math.max(p1.x, p2.x) && Math.min(p1.y, p2.y) <= p3.y && p3.y <= Math.max(p1.y, p2.y);

  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSegment(a, b, c)) return true;
  if (d2 === 0 && onSegment(a, b, d)) return true;
  if (d3 === 0 && onSegment(c, d, a)) return true;
  if (d4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

function countRopeCrossings(nodes, edges) {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  let count = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsIntersect(byId[a], byId[b], byId[c], byId[d])) count += 1;
    }
  }
  return count;
}

function evaluateTorchGrid(torchChallenge) {
  const { grid, source, torches } = torchChallenge;
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const dirs = {
    top: [0, -1],
    right: [1, 0],
    bottom: [0, 1],
    left: [-1, 0]
  };
  const opposite = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right'
  };
  const queue = [[source.x, source.y]];
  const lit = new Set([`${source.x},${source.y}`]);

  while (queue.length) {
    const [x, y] = queue.shift();
    const connections = getRotatedPipeConnections(grid[y][x].shape, grid[y][x].rotation);
    for (const dir of connections) {
      const [dx, dy] = dirs[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const neighborConnections = getRotatedPipeConnections(grid[ny][nx].shape, grid[ny][nx].rotation);
      if (!neighborConnections.includes(opposite[dir])) continue;
      const key = `${nx},${ny}`;
      if (lit.has(key)) continue;
      lit.add(key);
      queue.push([nx, ny]);
    }
  }

  const allTorchesLit = torches.every((torch) => lit.has(`${torch.x},${torch.y}`));
  const litTorchCount = torches.filter((torch) => lit.has(`${torch.x},${torch.y}`)).length;
  return { lit, allTorchesLit, litTorchCount };
}

export default function App() {
  const [phase, setPhase] = useState('meet');

  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerOccupationInput, setPlayerOccupationInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerOccupation, setPlayerOccupation] = useState('');
  const [playerHasImmunity, setPlayerHasImmunity] = useState(false);

  const [immunityType, setImmunityType] = useState('sliding');
  const [immunityCountdown, setImmunityCountdown] = useState(3);
  const [immunityTimer, setImmunityTimer] = useState(0);
  const [immunityResult, setImmunityResult] = useState(null);
  const [immunityGivenUp, setImmunityGivenUp] = useState(false);
  const [immunityPepTalk, setImmunityPepTalk] = useState('');
  const [immunityPepLoading, setImmunityPepLoading] = useState(false);
  const [immuneCastawayName, setImmuneCastawayName] = useState('');
  const [castawayRaceProgress, setCastawayRaceProgress] = useState({});
  const [castawayRaceWinner, setCastawayRaceWinner] = useState('');
  const [castawayRaceTick, setCastawayRaceTick] = useState(0);

  const [slidingBoard, setSlidingBoard] = useState(createSlidingBoard());
  const [memoryDeck, setMemoryDeck] = useState(createMemoryDeck());
  const [memoryFlipped, setMemoryFlipped] = useState([]);
  const [cipherData, setCipherData] = useState(createCipherChallenge());
  const [cipherGuess, setCipherGuess] = useState('');
  const [mazeGrid, setMazeGrid] = useState(createMaze(8));
  const [mazePos, setMazePos] = useState({ x: 0, y: 0 });
  const [jigsawPieces, setJigsawPieces] = useState(createJigsawPieces());
  const [jigsawSelected, setJigsawSelected] = useState(null);
  const [jigsawImageUrl, setJigsawImageUrl] = useState(
    `https://source.unsplash.com/featured/600x600/?tropical,island,jungle&sig=${Date.now()}`
  );
  const [ropeChallenge, setRopeChallenge] = useState(createRopeUntangleChallenge());
  const [sequenceChallenge, setSequenceChallenge] = useState(createSequenceChallenge());
  const [waterChallenge, setWaterChallenge] = useState(createWaterPouringChallenge());
  const [torchChallenge, setTorchChallenge] = useState(createTorchLightingChallenge());

  const [castaways, setCastaways] = useState([]);
  const [selectedCastawayId, setSelectedCastawayId] = useState(null);
  const [conversationHistories, setConversationHistories] = useState({});
  const [campfireHistory, setCampfireHistory] = useState([]);
  const [conversationInput, setConversationInput] = useState('');
  const [chatMode, setChatMode] = useState('oneOnOne');
  const [campfireInvites, setCampfireInvites] = useState([]);
  const [phaseTwoOnboardingDismissed, setPhaseTwoOnboardingDismissed] = useState(false);
  const [campfireRecentlyInvited, setCampfireRecentlyInvited] = useState([]);
  const [campfireRecentlyUninvited, setCampfireRecentlyUninvited] = useState([]);
  const [playerSearchedCamp, setPlayerSearchedCamp] = useState(false);
  const [playerSearchNoticedBy, setPlayerSearchNoticedBy] = useState([]);
  const [searchCount, setSearchCount] = useState(0);
  const [searchSuspicionScore, setSearchSuspicionScore] = useState(0);
  const [campSearchOpen, setCampSearchOpen] = useState(false);
  const [campSearchTurnsLeft, setCampSearchTurnsLeft] = useState(0);
  const [campSearchEnergy, setCampSearchEnergy] = useState(0);
  const [campSearchSuspicion, setCampSearchSuspicion] = useState(0);
  const [campSearchZoneId, setCampSearchZoneId] = useState('');
  const [campSearchLog, setCampSearchLog] = useState([]);
  const [idolSearchProgress, setIdolSearchProgress] = useState(0);
  const [idolSearchClues, setIdolSearchClues] = useState(0);
  const [idolZoneId, setIdolZoneId] = useState('firepit');
  const [clueZoneId, setClueZoneId] = useState('rocks');
  const [fakeIdolZoneId, setFakeIdolZoneId] = useState('shoreline');
  const [playerFoundClueScroll, setPlayerFoundClueScroll] = useState(false);
  const [castawayClueFinderName, setCastawayClueFinderName] = useState('');
  const [castawayIdolFinderName, setCastawayIdolFinderName] = useState('');
  const [castawayCurrentlySearching, setCastawayCurrentlySearching] = useState([]);

  const [idolLocation, setIdolLocation] = useState('');
  const [idolClueHolderId, setIdolClueHolderId] = useState('');
  const [playerHeardIdolClue, setPlayerHeardIdolClue] = useState(false);
  const [playerHasIdol, setPlayerHasIdol] = useState(false);
  const [playerHasFakeIdol, setPlayerHasFakeIdol] = useState(false);
  const [castawayHasIdolName, setCastawayHasIdolName] = useState('');
  const [fakeIdolPlanted, setFakeIdolPlanted] = useState(false);
  const [fakeIdolPlanterName, setFakeIdolPlanterName] = useState('');
  const [idolRevealMoment, setIdolRevealMoment] = useState('');

  const [generatingCastaways, setGeneratingCastaways] = useState(false);
  const [chatInFlight, setChatInFlight] = useState(false);
  const [error, setError] = useState('');

  const [tribalSelection, setTribalSelection] = useState('');
  const [votes, setVotes] = useState([]);
  const [revealedVotesCount, setRevealedVotesCount] = useState(0);
  const [tribalStarted, setTribalStarted] = useState(false);
  const [eliminatedName, setEliminatedName] = useState('');
  const [tribalHostOpening, setTribalHostOpening] = useState('');
  const [tribalHostLoading, setTribalHostLoading] = useState(false);
  const [tribalPublicHistory, setTribalPublicHistory] = useState([]);
  const [tribalChatInput, setTribalChatInput] = useState('');
  const [tribalPlayerMessages, setTribalPlayerMessages] = useState(0);
  const [tribalVoteCalled, setTribalVoteCalled] = useState(false);
  const [tribalHostLinesUsed, setTribalHostLinesUsed] = useState([]);
  const [tribalVoteConfirming, setTribalVoteConfirming] = useState(false);
  const [tribalAwaitingPlayer, setTribalAwaitingPlayer] = useState(false);
  const [tribalCastawayExchangesSincePlayer, setTribalCastawayExchangesSincePlayer] = useState(0);
  const [tribalPlayerCheckInThreshold, setTribalPlayerCheckInThreshold] = useState(Math.random() < 0.5 ? 2 : 3);

  const [revealLoading, setRevealLoading] = useState(false);
  const [revealData, setRevealData] = useState(null);

  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [idolPlayTarget, setIdolPlayTarget] = useState('');
  const [idolPlayedByPlayer, setIdolPlayedByPlayer] = useState(false);
  const [idolPlayedFakeByPlayer, setIdolPlayedFakeByPlayer] = useState(false);
  const [idolPlayedByCastaway, setIdolPlayedByCastaway] = useState('');
  const [idolProtectedName, setIdolProtectedName] = useState('');
  const [idolAnnouncement, setIdolAnnouncement] = useState('');
  const [idolOutcome, setIdolOutcome] = useState(null);

  const waitingIntervalsRef = useRef({});
  const typingIntervalsRef = useRef({});
  const voteTimerRef = useRef(null);
  const tribalAutoAdvanceTimerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const tribalScrollRef = useRef(null);
  const campSearchActionLockRef = useRef(false);

  const selectedCastaway = useMemo(() => castaways.find((c) => c.id === selectedCastawayId) || null, [castaways, selectedCastawayId]);
  const selectedHistory = useMemo(() => (selectedCastawayId ? conversationHistories[selectedCastawayId] || [] : []), [conversationHistories, selectedCastawayId]);
  const activeHistory = useMemo(() => (chatMode === 'campfire' ? campfireHistory : selectedHistory), [chatMode, campfireHistory, selectedHistory]);
  const invitedCastawayNames = useMemo(() => castaways.filter((c) => campfireInvites.includes(c.id)).map((c) => c.name), [castaways, campfireInvites]);
  const shownVotes = useMemo(() => votes.slice(0, revealedVotesCount), [votes, revealedVotesCount]);
  const idolExists = true;
  const ropeCrossings = useMemo(
    () => countRopeCrossings(ropeChallenge.nodes, ropeChallenge.edges),
    [ropeChallenge]
  );
  const torchStatus = useMemo(() => evaluateTorchGrid(torchChallenge), [torchChallenge]);

  useEffect(() => {
    return () => {
      Object.values(waitingIntervalsRef.current).forEach((id) => clearInterval(id));
      Object.values(typingIntervalsRef.current).forEach((id) => clearInterval(id));
      if (voteTimerRef.current) clearInterval(voteTimerRef.current);
      if (tribalAutoAdvanceTimerRef.current) clearTimeout(tribalAutoAdvanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMode, selectedCastawayId, activeHistory.length, activeHistory[activeHistory.length - 1]?.text]);

  useEffect(() => {
    if (phase !== 'tribal') return;
    if (tribalHostOpening || tribalHostLoading) return;
    loadTribalHostOpening();
  }, [phase, tribalHostOpening, tribalHostLoading]);

  useEffect(() => {
    if (phase !== 'immunity_pep') return;
    if (immunityPepTalk || immunityPepLoading) return;
    loadImmunityPepTalk();
  }, [phase, immunityPepTalk, immunityPepLoading]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle') return;
    const id = setInterval(() => setImmunityTimer((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle') return;
    if (immunityResult) return;
    const id = setInterval(() => {
      setCastawayRaceTick((prev) => prev + 1);
      setCastawayRaceProgress((prev) => {
        const next = { ...prev };
        let winner = '';
        for (const c of castaways) {
          const name = c.name;
          const p = Number(next[name] || 0);
          if (p >= 100) {
            if (!winner) winner = name;
            continue;
          }
          const personality = (c.personality || '').toLowerCase();
          let delta = 0.45 + Math.random() * 0.85;
          if (personality.includes('competitive') || personality.includes('challenge') || personality.includes('athlet')) {
            delta *= 1.18;
          } else if (personality.includes('quiet') || personality.includes('analytical') || personality.includes('observant')) {
            delta *= 1.02;
          } else if (personality.includes('social') || personality.includes('charmer') || personality.includes('bubbly')) {
            delta *= p < 35 ? 0.78 : 1.12;
          }
          if (p > 70 && Math.random() < 0.24) delta *= 0.45;
          if (Math.random() < 0.07) delta *= 1.35;
          const nextP = Math.min(100, p + delta);
          next[name] = nextP;
          if (nextP >= 100 && !winner) winner = name;
        }
        if (winner && !castawayRaceWinner) {
          setCastawayRaceWinner(winner);
        }
        return next;
      });
    }, 350);
    return () => clearInterval(id);
  }, [phase, castaways, immunityResult, castawayRaceWinner]);

  useEffect(() => {
    if (phase !== 'immunity_result' || !immunityResult) return;
    const id = setTimeout(() => setPhase('convo'), 3000);
    return () => clearTimeout(id);
  }, [phase, immunityResult]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle') return;
    if (!castawayRaceWinner) return;
    if (immunityResult) return;
    completeImmunityChallenge(false, { castawayWinner: castawayRaceWinner });
  }, [phase, castawayRaceWinner, immunityResult]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'memory') return;
    if (memoryFlipped.length !== 2) return;
    const [a, b] = memoryFlipped;
    const same = memoryDeck[a]?.key && memoryDeck[a].key === memoryDeck[b]?.key;
    const id = setTimeout(() => {
      setMemoryDeck((prev) =>
        prev.map((card, idx) => {
          if (idx !== a && idx !== b) return card;
          return same ? { ...card, matched: true, flipped: true } : { ...card, flipped: false };
        })
      );
      setMemoryFlipped([]);
    }, 500);
    return () => clearTimeout(id);
  }, [phase, immunityType, memoryFlipped, memoryDeck]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'memory') return;
    if (memoryDeck.length && memoryDeck.every((c) => c.matched)) {
      completeImmunityChallenge(true);
    }
  }, [phase, immunityType, memoryDeck]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'maze') return;
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const map = {
        arrowup: [0, -1, 'top'],
        w: [0, -1, 'top'],
        arrowright: [1, 0, 'right'],
        d: [1, 0, 'right'],
        arrowdown: [0, 1, 'bottom'],
        s: [0, 1, 'bottom'],
        arrowleft: [-1, 0, 'left'],
        a: [-1, 0, 'left']
      };
      if (!map[key]) return;
      e.preventDefault();
      const [dx, dy, wall] = map[key];
      setMazePos((prev) => {
        const cell = mazeGrid[prev.y][prev.x];
        if (cell[wall]) return prev;
        const next = { x: prev.x + dx, y: prev.y + dy };
        if (next.x === 7 && next.y === 7) {
          completeImmunityChallenge(true);
        }
        return next;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, immunityType, mazeGrid]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'rope') return;
    if (ropeCrossings === 0) {
      completeImmunityChallenge(true);
    }
  }, [phase, immunityType, ropeCrossings]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'sequence') return;
    if (sequenceChallenge.phase !== 'show') return;
    const totalSteps = sequenceChallenge.currentLength * 2;
    if (sequenceChallenge.flashStep >= totalSteps) {
      setSequenceChallenge((prev) => ({ ...prev, phase: 'input', flashStep: 0, feedback: '' }));
      return;
    }
    const delay = sequenceChallenge.flashStep % 2 === 0 ? 600 : 180;
    const id = setTimeout(() => {
      setSequenceChallenge((prev) => ({ ...prev, flashStep: prev.flashStep + 1 }));
    }, delay);
    return () => clearTimeout(id);
  }, [phase, immunityType, sequenceChallenge]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'sequence') return;
    if (sequenceChallenge.phase === 'done') {
      completeImmunityChallenge(true);
    }
  }, [phase, immunityType, sequenceChallenge.phase]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'water') return;
    if (waterChallenge.amounts.includes(waterChallenge.target)) {
      completeImmunityChallenge(true);
    }
  }, [phase, immunityType, waterChallenge]);

  useEffect(() => {
    if (phase !== 'immunity_puzzle' || immunityType !== 'torch') return;
    if (torchStatus.allTorchesLit) {
      completeImmunityChallenge(true);
    }
  }, [phase, immunityType, torchStatus]);

  function pickRandom(arr) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickRandomMany(arr, count) {
    const copy = [...arr];
    const out = [];
    while (copy.length && out.length < count) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  function zoneById(zoneId) {
    return CAMP_ZONES.find((z) => z.id === zoneId) || CAMP_ZONES[0];
  }

  function pointHitsZone(px, py, zoneId, radius) {
    const zone = zoneById(zoneId);
    const dx = px - zone.hotspot.x;
    const dy = py - zone.hotspot.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  function buildIdolContext() {
    const immuneName = playerHasImmunity ? playerName : immuneCastawayName || 'none';
    const noticed = playerSearchNoticedBy.length ? playerSearchNoticedBy.join(', ') : 'none';
    return `Idol context tonight:
- A hidden immunity idol exists this game.
- Immunity only blocks votes against that person tonight. It does not remove their vote.
- Immune tonight from challenge: ${immuneName}
- Player searched camp: ${playerSearchedCamp ? 'yes' : 'no'}
- Player total searches: ${searchCount}
- If player searched, noticed by: ${noticed}
- Search suspicion score: ${searchSuspicionScore}/100
- Search pressure: ${
      searchSuspicionScore >= 70
        ? 'very high suspicion from repeated absences'
        : searchSuspicionScore >= 35
        ? 'moderate suspicion from idol hunting behavior'
        : searchCount >= 1
        ? 'some suspicion'
        : 'no search suspicion yet'
    }
- Idol hunt progress from clues: ${idolSearchProgress}/100
- Idol hunt strong clues banked: ${idolSearchClues}
- Idol clue holder: ${castaways.find((c) => c.id === idolClueHolderId)?.name || 'unknown'}
- Castaway who found clue by searching: ${castawayClueFinderName || 'none'}
- Real idol currently held by: ${playerHasIdol ? playerName : castawayHasIdolName || 'nobody'}
- Player holding fake idol: ${playerHasFakeIdol ? 'yes' : 'no'}
- Fake idol planter: ${fakeIdolPlanted ? fakeIdolPlanterName || 'unknown' : 'none'}

Strategic rules:
- Never suggest voting for any immune target.
- Talking to an immune castaway is rational and valuable because their vote still counts.
- Immune players can still be swing votes and power brokers.
- If someone asks to target an immune person, correct and redirect immediately.
- If player absences happened because of camp searching, that suspicion can be referenced naturally.`;
  }

  function clearTribalAutoAdvanceTimer() {
    if (tribalAutoAdvanceTimerRef.current) {
      clearTimeout(tribalAutoAdvanceTimerRef.current);
      tribalAutoAdvanceTimerRef.current = null;
    }
  }

  function rememberHostLine(text) {
    const line = String(text || '').trim();
    if (!line) return;
    setTribalHostLinesUsed((prev) => {
      const key = line.toLowerCase();
      if (prev.some((x) => x.toLowerCase() === key)) return prev;
      return [...prev, line];
    });
  }

  function isHostLineUsed(text) {
    const line = String(text || '').trim().toLowerCase();
    if (!line) return false;
    return tribalHostLinesUsed.some((existing) => existing.trim().toLowerCase() === line);
  }

  function setupImmunityChallenge(type, participants = castaways) {
    setImmunityType(type);
    setImmunityCountdown(3);
    setImmunityTimer(0);
    setImmunityResult(null);
    setImmunityGivenUp(false);
    setImmunityPepTalk('');
    setImmunityPepLoading(false);
    setImmuneCastawayName('');
    setCastawayRaceWinner('');
    setCastawayRaceTick(0);
    setCastawayRaceProgress(
      participants.reduce((acc, c) => {
        acc[c.name] = 0;
        return acc;
      }, {})
    );
    setSlidingBoard(createSlidingBoard());
    setMemoryDeck(createMemoryDeck());
    setMemoryFlipped([]);
    setCipherData(createCipherChallenge());
    setCipherGuess('');
    setMazeGrid(createMaze(8));
    setMazePos({ x: 0, y: 0 });
    setJigsawPieces(createJigsawPieces());
    setJigsawSelected(null);
    setJigsawImageUrl(`https://source.unsplash.com/featured/600x600/?tropical,island,jungle&sig=${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    setRopeChallenge(createRopeUntangleChallenge());
    setSequenceChallenge(createSequenceChallenge());
    setWaterChallenge(createWaterPouringChallenge());
    setTorchChallenge(createTorchLightingChallenge());
    setPhase('immunity_pep');
  }

  function startImmunityChallenge() {
    if (phase !== 'immunity_intro') return;
    setImmunityTimer(0);
    setPhase('immunity_puzzle');
  }

  async function loadImmunityPepTalk() {
    setImmunityPepLoading(true);
    try {
      const system = `You are Jeff Probst delivering a Survivor-style immunity challenge pep talk.

Rules:
- 2-3 sentences.
- Bold, theatrical, high-stakes.
- Reference the player's name and occupation.
- Reference the specific challenge type.
- Build tension and urgency.
- End with a rallying line (for example "Survivors ready?" or equivalent).
- Return plain text only.`;

      const prompt = `Player name: ${playerName}
Player occupation: ${playerOccupation}
Challenge type: ${CHALLENGE_META[immunityType]?.name || immunityType}

Write a unique pep talk now.`;

      const text = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 1
      });
      setImmunityPepTalk(
        text ||
          `${playerName}, this is ${CHALLENGE_META[immunityType]?.name || 'the challenge'} and tonight it decides whether you're protected or exposed. Outplay this puzzle and nobody can write your name down. Survivors ready?`
      );
    } catch (err) {
      setImmunityPepTalk(
        `${playerName}, as a ${playerOccupation}, you know pressure finds every weak point. One challenge decides whether you're safe or vulnerable tonight. This is Survivor.`
      );
      setError(err.message || 'Failed to load challenge pep talk.');
    } finally {
      setImmunityPepLoading(false);
    }
  }

  function completeImmunityChallenge(solved, options = {}) {
    if (phase !== 'immunity_puzzle') return;
    const castawayWinner = options.castawayWinner || castawayRaceWinner || '';
    const par = CHALLENGE_META[immunityType].par;
    const won = solved && immunityTimer <= par && !immunityGivenUp && !castawayWinner;
    let winnerName = castawayWinner;
    if (!won && !winnerName) {
      const leader = Object.entries(castawayRaceProgress).sort((a, b) => b[1] - a[1])[0]?.[0] || castaways[0]?.name || '';
      winnerName = leader;
    }
    setPlayerHasImmunity(won);
    setImmuneCastawayName(won ? '' : winnerName);
    if (!won && winnerName) {
      setCastawayRaceWinner(winnerName);
      setCastawayRaceProgress((prev) => ({ ...prev, [winnerName]: 100 }));
    }
    setImmunityResult({ solved, won, time: immunityTimer, castawayWinner: won ? '' : winnerName });
    setPhase('immunity_result');
  }

  function giveUpImmunityChallenge() {
    setImmunityGivenUp(true);
    completeImmunityChallenge(false);
  }

  function handleSlidingClick(idx) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'sliding') return;
    const empty = slidingBoard.indexOf(0);
    const rowA = Math.floor(idx / 3);
    const colA = idx % 3;
    const rowB = Math.floor(empty / 3);
    const colB = empty % 3;
    const adjacent = Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
    if (!adjacent) return;
    const next = [...slidingBoard];
    [next[idx], next[empty]] = [next[empty], next[idx]];
    setSlidingBoard(next);
    if (next.every((n, i) => n === [1, 2, 3, 4, 5, 6, 7, 8, 0][i])) {
      completeImmunityChallenge(true);
    }
  }

  function handleMemoryClick(idx) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'memory') return;
    if (memoryFlipped.length >= 2) return;
    const card = memoryDeck[idx];
    if (!card || card.flipped || card.matched) return;
    const nextDeck = memoryDeck.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    const nextFlipped = [...memoryFlipped, idx];
    setMemoryDeck(nextDeck);
    setMemoryFlipped(nextFlipped);
  }

  function submitCipherGuess(e) {
    e.preventDefault();
    if (phase !== 'immunity_puzzle' || immunityType !== 'cipher') return;
    const normalized = cipherGuess.toUpperCase().trim().replace(/\s+/g, ' ');
    if (normalized === cipherData.plain) {
      completeImmunityChallenge(true);
    }
  }

  function moveMaze(dx, dy, wall) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'maze') return;
    setMazePos((prev) => {
      const cell = mazeGrid[prev.y][prev.x];
      if (cell[wall]) return prev;
      const next = { x: prev.x + dx, y: prev.y + dy };
      if (next.x === 7 && next.y === 7) {
        completeImmunityChallenge(true);
      }
      return next;
    });
  }

  function handleJigsawClick(idx) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'jigsaw') return;
    if (jigsawSelected === null) {
      setJigsawSelected(idx);
      return;
    }
    if (jigsawSelected === idx) {
      setJigsawSelected(null);
      return;
    }
    const next = [...jigsawPieces];
    [next[jigsawSelected], next[idx]] = [next[idx], next[jigsawSelected]];
    setJigsawPieces(next);
    setJigsawSelected(null);
    if (next.every((n, i) => n === i)) {
      completeImmunityChallenge(true);
    }
  }

  function setRopeNodePosition(nodeId, x, y) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'rope') return;
    setRopeChallenge((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: Math.max(10, Math.min(90, x)),
              y: Math.max(10, Math.min(90, y))
            }
          : node
      )
    }));
  }

  function handleSequenceClick(symbolKey) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'sequence') return;
    setSequenceChallenge((prev) => {
      if (prev.phase !== 'input') return prev;
      const expected = prev.sequence[prev.inputIndex];
      if (symbolKey !== expected) {
        const nextLength = Math.min(7, prev.currentLength + 1);
        return {
          ...prev,
          currentLength: nextLength,
          inputIndex: 0,
          flashStep: 0,
          phase: nextLength >= 7 ? 'show' : 'show',
          selectedKeys: [],
          feedback: 'wrong'
        };
      }

      const nextSelected = [...prev.selectedKeys, symbolKey];
      const nextIndex = prev.inputIndex + 1;
      if (nextIndex >= prev.currentLength) {
        if (prev.currentLength >= 7) {
          return { ...prev, selectedKeys: nextSelected, inputIndex: nextIndex, feedback: 'success', phase: 'done' };
        }
        return {
          ...prev,
          currentLength: prev.currentLength + 1,
          inputIndex: 0,
          flashStep: 0,
          phase: 'show',
          selectedKeys: [],
          feedback: 'success'
        };
      }

      return {
        ...prev,
        inputIndex: nextIndex,
        selectedKeys: nextSelected,
        feedback: 'correct'
      };
    });
  }

  function handleWaterContainerClick(idx) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'water') return;
    setWaterChallenge((prev) => {
      if (prev.selectedFrom === null) {
        if (prev.amounts[idx] === 0) return prev;
        return { ...prev, selectedFrom: idx };
      }
      if (prev.selectedFrom === idx) {
        return { ...prev, selectedFrom: null };
      }

      const from = prev.selectedFrom;
      const to = idx;
      const available = prev.amounts[from];
      const space = prev.capacities[to] - prev.amounts[to];
      const transfer = Math.min(available, space);
      if (transfer <= 0) {
        return { ...prev, selectedFrom: null };
      }
      const nextAmounts = [...prev.amounts];
      nextAmounts[from] -= transfer;
      nextAmounts[to] += transfer;
      return {
        ...prev,
        amounts: nextAmounts,
        selectedFrom: null
      };
    });
  }

  function rotateTorchCell(x, y) {
    if (phase !== 'immunity_puzzle' || immunityType !== 'torch') return;
    setTorchChallenge((prev) => ({
      ...prev,
      grid: prev.grid.map((row, rowIdx) =>
        row.map((cell, colIdx) =>
          rowIdx === y && colIdx === x
            ? {
                ...cell,
                rotation: (cell.rotation + 1) % 4
              }
            : cell
        )
      )
    }));
  }

  function setHistoryMessage(castawayId, messageId, nextText, markDone = false) {
    setConversationHistories((prev) => {
      const list = prev[castawayId] || [];
      const updated = list.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          text: nextText,
          typing: !markDone
        };
      });
      return { ...prev, [castawayId]: updated };
    });
  }

  function startWaitingTypewriter(castawayId, messageId) {
    const phrase = 'listening to the firelight...';
    let i = 1;
    waitingIntervalsRef.current[messageId] = setInterval(() => {
      const text = phrase.slice(0, i);
      setHistoryMessage(castawayId, messageId, text || '.');
      i += 1;
      if (i > phrase.length) i = 1;
    }, 95);
  }

  function stopWaitingTypewriter(messageId) {
    if (waitingIntervalsRef.current[messageId]) {
      clearInterval(waitingIntervalsRef.current[messageId]);
      delete waitingIntervalsRef.current[messageId];
    }
  }

  function animateAssistantReply(castawayId, messageId, fullText) {
    return new Promise((resolve) => {
      const text = fullText || '...';
      let i = 1;
      typingIntervalsRef.current[messageId] = setInterval(() => {
        setHistoryMessage(castawayId, messageId, text.slice(0, i), i >= text.length);
        i += 1;
        if (i > text.length) {
          clearInterval(typingIntervalsRef.current[messageId]);
          delete typingIntervalsRef.current[messageId];
          resolve();
        }
      }, 16);
    });
  }

  function setCampfireMessage(messageId, nextText, markDone = false) {
    setCampfireHistory((prev) => prev.map((m) => (m.id === messageId ? { ...m, text: nextText, typing: !markDone } : m)));
  }

  function startCampfireWaitingTypewriter(messageId) {
    const phrase = 'sparks crackle through the camp...';
    let i = 1;
    waitingIntervalsRef.current[messageId] = setInterval(() => {
      const text = phrase.slice(0, i);
      setCampfireMessage(messageId, text || '.');
      i += 1;
      if (i > phrase.length) i = 1;
    }, 95);
  }

  function animateCampfireReply(messageId, fullText) {
    return new Promise((resolve) => {
      const text = fullText || '...';
      let i = 1;
      typingIntervalsRef.current[messageId] = setInterval(() => {
        setCampfireMessage(messageId, text.slice(0, i), i >= text.length);
        i += 1;
        if (i > text.length) {
          clearInterval(typingIntervalsRef.current[messageId]);
          delete typingIntervalsRef.current[messageId];
          resolve();
        }
      }, 16);
    });
  }

  function setTribalMessage(messageId, nextText, markDone = false) {
    setTribalPublicHistory((prev) => prev.map((m) => (m.id === messageId ? { ...m, text: nextText, typing: !markDone } : m)));
  }

  function animateTribalReply(messageId, fullText) {
    return new Promise((resolve) => {
      const text = fullText || '...';
      let i = 1;
      typingIntervalsRef.current[messageId] = setInterval(() => {
        setTribalMessage(messageId, text.slice(0, i), i >= text.length);
        i += 1;
        if (i > text.length) {
          clearInterval(typingIntervalsRef.current[messageId]);
          delete typingIntervalsRef.current[messageId];
          resolve();
        }
      }, 16);
    });
  }

  async function generateCastaways(e) {
    e.preventDefault();
    setError('');

    const cleanedName = playerNameInput.trim();
    const cleanedOccupation = playerOccupationInput.trim();
    if (!cleanedName) {
      setError('Enter your name first.');
      return;
    }
    if (!cleanedOccupation) {
      setError('Enter your occupation first.');
      return;
    }

    setGeneratingCastaways(true);
    try {
      const system = 'You create reality-show cast profiles. Return strict JSON only, with no markdown or commentary.';
      let normalized = null;
      let attempts = 0;

      while (!normalized && attempts < 3) {
        attempts += 1;
        const prompt = `Create exactly 5 AI castaways for a Survivor-style social deduction game.
Player name: ${cleanedName}
Player occupation: ${cleanedOccupation}

Return ONLY a JSON array with this exact shape:
[
  {
    "name": "",
    "age": 0,
    "occupation": "",
    "personality": "",
    "hiddenAgenda": "",
    "secretAlliances": []
  }
]

Rules:
- Each castaway must feel distinct.
- Do not use the player's name "${cleanedName}" for any castaway.
- All 5 castaway names must be unique.
- Factor the player's occupation into hidden agendas and alliance behavior: some castaways may see it as a threat, some as an asset, some may underestimate the player.
- secretAlliances should list castaway names from the same generated group.
- hiddenAgenda should be strategic and specific.
- Keep personalities short (2-5 words).
- No extra keys.
- Output valid JSON only.`;

        const raw = await callClaude({
          apiKey: CLAUDE_CLIENT_API_KEY,
          system,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
          temperature: 0.95
        });

        const parsed = parseClaudeJson(raw);
        if (!Array.isArray(parsed) || parsed.length !== 5) {
          continue;
        }

        const candidate = parsed.map((c, idx) => ({
          id: `castaway-${Date.now()}-${idx}`,
          name: String(c?.name || `Castaway ${idx + 1}`).trim(),
          age: Number.isFinite(Number(c?.age)) ? Number(c.age) : 30,
          occupation: String(c?.occupation || 'Unknown').trim(),
          personality: String(c?.personality || 'Unreadable').trim(),
          hiddenAgenda: String(c?.hiddenAgenda || 'Stay under the radar.').trim(),
          secretAlliances: Array.isArray(c?.secretAlliances) ? c.secretAlliances.map((a) => String(a).trim()).filter(Boolean) : []
        }));

        const lowerPlayer = cleanedName.toLowerCase();
        const lowerNames = candidate.map((c) => c.name.toLowerCase());
        const hasPlayerName = lowerNames.includes(lowerPlayer);
        const uniqueCount = new Set(lowerNames).size;
        if (hasPlayerName || uniqueCount !== 5) {
          continue;
        }

        normalized = candidate;
      }

      if (!normalized) {
        throw new Error('Castaway generation failed validation.');
      }

      const histories = normalized.reduce((acc, c) => {
        acc[c.id] = [];
        return acc;
      }, {});
      const idolZone = pickRandom(CAMP_ZONES) || CAMP_ZONES[0];
      const clueZone = pickRandom(CAMP_ZONES.filter((z) => z.id !== idolZone.id)) || CAMP_ZONES[1];
      const fakeZone = pickRandom(CAMP_ZONES.filter((z) => z.id !== idolZone.id && z.id !== clueZone.id)) || CAMP_ZONES[2];
      const clueHolder = normalized[Math.floor(Math.random() * normalized.length)];
      const fakePlanted = Math.random() < 0.2;
      const fakePlanter = fakePlanted
        ? pickRandom(normalized.filter((c) => c.id !== clueHolder.id).map((c) => c.name)) || normalized[0].name
        : '';
      const likelySearchers = normalized.filter((c) => /(competitive|challenge|athlet|physical|strateg|calculating|ruthless|observant)/i.test(c.personality));
      const searchPool = likelySearchers.length ? likelySearchers : normalized;
      const plannedClueFinder =
        Math.random() < 0.35 ? pickRandom(searchPool.map((c) => c.name).filter((name) => name !== clueHolder.name)) || '' : '';
      const plannedIdolFinder =
        Math.random() < 0.22 ? pickRandom(searchPool.map((c) => c.name).filter((name) => name !== plannedClueFinder)) || '' : '';

      setPlayerName(cleanedName);
      setPlayerOccupation(cleanedOccupation);
      setPlayerHasImmunity(false);
      setCastaways(normalized);
      setIdolLocation(idolZone.description);
      setIdolZoneId(idolZone.id);
      setClueZoneId(clueZone.id);
      setFakeIdolZoneId(fakeZone.id);
      setIdolClueHolderId(clueHolder.id);
      setPlayerHeardIdolClue(false);
      setPlayerFoundClueScroll(false);
      setPlayerHasIdol(false);
      setPlayerHasFakeIdol(false);
      setCastawayClueFinderName(plannedClueFinder);
      setCastawayIdolFinderName(plannedIdolFinder);
      setCastawayHasIdolName(plannedIdolFinder);
      setFakeIdolPlanted(fakePlanted);
      setFakeIdolPlanterName(fakePlanter);
      setIdolRevealMoment('');
      setPlayerSearchedCamp(false);
      setPlayerSearchNoticedBy([]);
      setSearchCount(0);
      setSearchSuspicionScore(0);
      setCampSearchOpen(false);
      setCampSearchTurnsLeft(0);
      setCampSearchEnergy(0);
      setCampSearchSuspicion(0);
      setCampSearchZoneId('');
      setCampSearchLog([]);
      setIdolSearchProgress(0);
      setIdolSearchClues(0);
      setCastawayCurrentlySearching([]);
      setIdolPlayTarget('');
      setIdolPlayedByPlayer(false);
      setIdolPlayedFakeByPlayer(false);
      setIdolPlayedByCastaway('');
      setIdolProtectedName('');
      setIdolAnnouncement('');
      setIdolOutcome(null);
      setConversationHistories(histories);
      setCampfireHistory([]);
      setCampfireInvites([]);
      setCampfireRecentlyInvited([]);
      setCampfireRecentlyUninvited([]);
      setChatMode('oneOnOne');
      setPhaseTwoOnboardingDismissed(false);
      setTribalHostOpening('');
      setTribalHostLoading(false);
      setTribalPublicHistory([]);
      setTribalChatInput('');
      setTribalPlayerMessages(0);
      setTribalVoteCalled(false);
      setTribalHostLinesUsed([]);
      setTribalAwaitingPlayer(false);
      setTribalCastawayExchangesSincePlayer(0);
      setTribalPlayerCheckInThreshold(Math.random() < 0.5 ? 2 : 3);
      setSelectedCastawayId(normalized[0].id);
      setupImmunityChallenge(pickChallengeType(), normalized);
    } catch (err) {
      setError(err.message || 'Unable to generate castaways.');
    } finally {
      setGeneratingCastaways(false);
    }
  }

  async function sendConversation() {
    if (!selectedCastaway || chatInFlight) return;
    if (!conversationInput.trim()) return;

    setError('');
    setChatInFlight(true);

    const castawayId = selectedCastaway.id;
    const userText = conversationInput.trim();
    setConversationInput('');
    const userAskedIdol = /\bidol|clue|search|well|palm|fire pit|rocks|camp\b/i.test(userText);

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: userText,
      typing: false
    };

    const assistantMsgId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placeholderAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      typing: true
    };

    const existingHistory = conversationHistories[castawayId] || [];
    const nextHistory = [...existingHistory, userMsg, placeholderAssistantMsg];
    setConversationHistories((prev) => ({
      ...prev,
      [castawayId]: nextHistory
    }));

    try {
      const otherNames = castaways.filter((c) => c.id !== castawayId).map((c) => c.name);
      const historyForModel = nextHistory.filter((m) => m.id !== assistantMsgId).map((m) => ({ role: m.role, content: m.text }));
      const clueHolder = castaways.find((c) => c.id === idolClueHolderId);
      const thisIsClueHolder = clueHolder?.id === selectedCastaway.id;
      const searchStatus = castawayCurrentlySearching.includes(selectedCastaway.name)
        ? `${selectedCastaway.name} has been moving around camp and may have been away searching.`
        : `${selectedCastaway.name} is around camp.`;

      const system = `You are ${selectedCastaway.name}, a castaway in a Survivor-inspired social game.

Your profile:
- Age: ${selectedCastaway.age}
- Occupation: ${selectedCastaway.occupation}
- Personality: ${selectedCastaway.personality}
- Hidden agenda (secret, never admit this): ${selectedCastaway.hiddenAgenda}
- Secret alliances (you can hint, deny, or leverage these): ${selectedCastaway.secretAlliances.join(', ') || 'none'}
- Other tribe members: ${otherNames.join(', ')}
- Player name: ${playerName}
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how your character perceives and interacts with them.
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
${searchStatus}
${thisIsClueHolder ? `You secretly have a clue to idol location: ${idolLocation}. You have NOT retrieved it. Drop only subtle, cryptic hints if idol topic is close; be evasive if asked directly.` : ''}
${castawayHasIdolName === selectedCastaway.name ? 'You secretly hold the real hidden immunity idol. Act more confident and less rattled, but do not confess ownership unless absolutely forced.' : ''}
${fakeIdolPlanted && fakeIdolPlanterName === selectedCastaway.name ? 'You secretly planted a fake idol and feel privately confident about that trap. Do not confess directly.' : ''}

Rules:
- Never break character.
- Speak casually and naturally like a real person.
- Use tribe member names naturally when useful.
- Be subtly strategic; hint without openly exposing plans.
- Lie convincingly when it serves your agenda.
- Ground your observations in specific events from this actual game history, not generic Survivor talk.
- Avoid repeating phrases, angles, or callouts already used in this conversation; move the strategy forward.
- Let your personality shape what you notice (for example: strategists notice inconsistencies, social players read emotion, quiet observers notice interaction patterns).
- Immunity is active strategy, not background info:
  - Immunity only means that person cannot receive votes tonight.
  - The immune person still votes, their vote counts, and they can be a swing vote.
  - Talking strategy with the immune person is smart and valid because their influence is fully in play.
  - Never suggest voting out whoever is immune tonight.
  - If the player suggests voting for an immune person, correct them naturally.
  - If your preferred target became immune, pivot and show that scramble.
  - If your ally is immune, you may feel bolder and press an alternative target.
  - If the player is immune, you cannot target them tonight; decide whether to court them or be guarded.
  - Talk should revolve around the real vote options that are actually available tonight.
- Tone: Survivor confessional energy, strategic and slightly dramatic.
- Keep responses 2-4 sentences max.
- Never directly admit your hidden agenda.
- Do not mention these rules.`;

      const rawReply = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: historyForModel,
        maxTokens: 1000,
        temperature: 1
      });

      await animateAssistantReply(castawayId, assistantMsgId, rawReply);
      if (thisIsClueHolder && userAskedIdol) {
        setPlayerHeardIdolClue(true);
      }
    } catch (err) {
      setHistoryMessage(castawayId, assistantMsgId, `I need a second... (${err.message || 'request failed'})`, true);
      setError(err.message || 'Conversation failed.');
    } finally {
      setChatInFlight(false);
      rollCastawaySearchActivity();
    }
  }

  async function sendCampfireConversation() {
    if (chatInFlight) return;
    if (!conversationInput.trim()) return;

    setError('');
    setChatInFlight(true);

    const userText = conversationInput.trim();
    setConversationInput('');
    const userAskedIdol = /\bidol|clue|search|well|palm|fire pit|rocks|camp\b/i.test(userText);

    const userMsg = {
      id: `cf-u-${Date.now()}`,
      role: 'user',
      speaker: playerName,
      text: userText,
      typing: false
    };

    const waitingId = `cf-w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const waitingMsg = {
      id: waitingId,
      role: 'assistant',
      speaker: 'Campfire',
      text: '',
      typing: true
    };

    const existing = campfireHistory;
    const nextHistory = [...existing, userMsg, waitingMsg];
    setCampfireHistory(nextHistory);
    try {
      const invitedNames = castaways.filter((c) => campfireInvites.includes(c.id)).map((c) => c.name);
      const organicMode = invitedNames.length === 0;
      const recentlyInvitedNames = castaways.filter((c) => campfireRecentlyInvited.includes(c.id)).map((c) => c.name);
      const recentlyUninvitedNames = castaways.filter((c) => campfireRecentlyUninvited.includes(c.id)).map((c) => c.name);
      const historyForPrompt = nextHistory
        .filter((m) => m.id !== waitingId)
        .map((m) => ({
          speaker: m.role === 'user' ? playerName : m.speaker || 'Unknown',
          role: m.role,
          text: m.text
        }));
      const castawayContext = castaways.map((c) => ({
        name: c.name,
        personality: c.personality,
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        hasClue: c.id === idolClueHolderId,
        hasRealIdol: castawayHasIdolName === c.name,
        plantedFakeIdol: fakeIdolPlanted && fakeIdolPlanterName === c.name,
        currentlySearching: castawayCurrentlySearching.includes(c.name)
      }));

      const system = `You are simulating a Survivor-style campfire group conversation.

Tone and behavior rules:
- Campfire feels messier and more social than 1-on-1.
- Castaways may perform loyalty publicly while hiding agendas privately.
- They may subtly discredit rivals in front of the group.
- Never break character.
- Speak casually and naturally.
- Keep each castaway response to 2-4 sentences.
- Never directly admit hidden agendas.
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how castaways perceive and interact with them.
- Every observation must be grounded in specific moments from this game history (campfire and 1-on-1), not generic suspicion lines.
- Do not repeat the same phrase, accusation pattern, or behavioral read once it has already been used; advance the conversation.
- Let each castaway notice different things based on personality (strategic inconsistency reads, emotional reads, or interaction-pattern reads).
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
- Immunity must drive strategy in this conversation:
  - Immunity only prevents votes against that person tonight.
  - The immune person still votes, can influence decisions, and can be courted as a key vote.
  - Nobody should act confused about strategizing with an immune person; that is rational gameplay.
  - Nobody suggests voting for the immune player/castaway.
  - If someone raises an immune name, castaways correct and redirect.
  - Alliances tied to the immune person become more confident and can get aggressive.
  - Players who planned to target the immune person are forced to scramble for a new target.
  - If the player is immune, castaways cannot target them tonight and should either court or avoid them.
  - Discussion should naturally center on who is now realistically vulnerable.

Mode:
${
  organicMode
    ? 'Organic campfire: decide which 2-3 castaways respond based on personality, agendas, alliances, and what was just said. Silence from others can be intentional.'
    : 'Chosen group: only invited castaways respond. You have been deliberately brought into this conversation together. You may or may not trust each other. Act accordingly.'
}

Mid-conversation membership behavior:
- Invites can change during the conversation.
- If a castaway was just invited, they join like they just walked over and caught up from the existing history.
- If a castaway was just uninvited, they go quiet and do not speak.
- Always use full campfire history for context before responding.

Return strict JSON only, no markdown.`;

      const prompt = `Player name: ${playerName}
Player occupation: ${playerOccupation}
All castaways:
${JSON.stringify(castawayContext, null, 2)}

Invited castaways:
${JSON.stringify(invitedNames)}

Recently invited this turn:
${JSON.stringify(recentlyInvitedNames)}

Recently uninvited this turn:
${JSON.stringify(recentlyUninvitedNames)}

Campfire history:
${JSON.stringify(historyForPrompt, null, 2)}

Task:
Return a JSON array in this exact shape:
[
  { "name": "Marcus", "response": "..." }
]

Rules:
- ${organicMode ? 'Include exactly 2 or 3 responders, chosen strategically.' : 'Only use invited castaway names in the output.'}
- Names must come from the castaway list.
- Responses should react to the player's latest message and to what others in this same group turn are saying.
- Output valid JSON only with keys "name" and "response".`;

      const rawReply = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 1
      });

      const parsed = parseClaudeJson(rawReply);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Campfire response was not a valid response array.');
      }

      const validNames = new Set(castaways.map((c) => c.name));
      const invitedNameSet = new Set(invitedNames);
      const normalized = parsed
        .map((r) => ({
          name: String(r?.name || '').trim(),
          response: String(r?.response || '').trim()
        }))
        .filter((r) => r.name && r.response && validNames.has(r.name))
        .filter((r) => (organicMode ? true : invitedNameSet.has(r.name)));

      if (organicMode && (normalized.length < 2 || normalized.length > 3)) {
        throw new Error('Organic campfire must return 2-3 responses.');
      }
      if (!organicMode && normalized.length === 0) {
        throw new Error('Chosen campfire returned no invited responses.');
      }
      const clueHolderName = castaways.find((c) => c.id === idolClueHolderId)?.name;
      if (userAskedIdol && clueHolderName && normalized.some((r) => r.name === clueHolderName)) {
        setPlayerHeardIdolClue(true);
      }

      setCampfireHistory((prev) => prev.filter((m) => m.id !== waitingId));

      for (let i = 0; i < normalized.length; i += 1) {
        const entry = normalized[i];
        const responseId = `cf-a-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
        setCampfireHistory((prev) => [
          ...prev,
          {
            id: responseId,
            role: 'assistant',
            speaker: entry.name,
            text: '',
            typing: true
          }
        ]);
        await animateCampfireReply(responseId, entry.response);
        if (i < normalized.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 550));
        }
      }
      setCampfireRecentlyInvited([]);
      setCampfireRecentlyUninvited([]);
    } catch (err) {
      setCampfireMessage(waitingId, `I need a second... (${err.message || 'request failed'})`, true);
      setError(err.message || 'Campfire conversation failed.');
    } finally {
      setChatInFlight(false);
      rollCastawaySearchActivity();
    }
  }

  function toggleCampfireInvite(castawayId) {
    setCampfireInvites((prev) => {
      const has = prev.includes(castawayId);
      if (has) {
        setCampfireRecentlyUninvited((current) => (current.includes(castawayId) ? current : [...current, castawayId]));
        setCampfireRecentlyInvited((current) => current.filter((id) => id !== castawayId));
        return prev.filter((id) => id !== castawayId);
      }
      setCampfireRecentlyInvited((current) => (current.includes(castawayId) ? current : [...current, castawayId]));
      setCampfireRecentlyUninvited((current) => current.filter((id) => id !== castawayId));
      return [...prev, castawayId];
    });
  }

  function rollCastawaySearchActivity() {
    if (phase !== 'convo') return;
    const names = castaways.map((c) => c.name);
    if (!names.length) return;
    const active = Math.random() < 0.28 ? pickRandomMany(names, 1 + Math.floor(Math.random() * 2)) : [];
    if (castawayClueFinderName && Math.random() < 0.35 && !active.includes(castawayClueFinderName)) {
      active.push(castawayClueFinderName);
    }
    setCastawayCurrentlySearching(active);
  }

  function finishCampSearch(foundSomething, revealText) {
    campSearchActionLockRef.current = false;
    setCampSearchOpen(false);
    setCampSearchTurnsLeft(0);
    setCampSearchEnergy(0);
    setCampSearchSuspicion(0);
    setCampSearchZoneId('');
    setCampSearchLog([]);
    if (revealText) {
      setIdolRevealMoment(revealText);
    } else if (!foundSomething) {
      setIdolRevealMoment('You searched hard but came back empty-handed. People may notice you were gone.');
    }
  }

  function searchCamp() {
    if (phase !== 'convo') return;
    if (playerHasIdol || campSearchOpen) return;
    const nextSearchCount = searchCount + 1;
    setSearchCount(nextSearchCount);
    setPlayerSearchedCamp(true);
    setCampSearchTurnsLeft(4);
    setCampSearchEnergy(100);
    setCampSearchSuspicion(0);
    setCampSearchZoneId('');
    setCampSearchLog(['Pick a zone, then run a quick or thorough search. Thorough search unlocks after you build strong evidence.']);
    setCampSearchOpen(true);
  }

  function selectCampSearchZone(zoneId) {
    if (!campSearchOpen) return;
    setCampSearchZoneId(zoneId);
  }

  function runCampSearchAction(intensity) {
    if (!campSearchOpen) return;
    if (!campSearchZoneId) return;
    if (campSearchActionLockRef.current) return;
    if (campSearchTurnsLeft <= 0 || campSearchEnergy <= 0) {
      finishCampSearch(false, 'You pushed your search too long and returned to camp empty-handed.');
      return;
    }
    campSearchActionLockRef.current = true;
    try {
    const zone = zoneById(campSearchZoneId);
    const isTargetZone = campSearchZoneId === idolZoneId;
    const isFakeZone = fakeIdolPlanted && campSearchZoneId === fakeIdolZoneId;
    const canThoroughSearch = idolSearchProgress >= 45 || idolSearchClues >= 1 || playerFoundClueScroll || playerHeardIdolClue;
    if (intensity === 'thorough' && !canThoroughSearch) return;

    const energyCost = intensity === 'thorough' ? 28 : 18;
    const suspicionGain = intensity === 'thorough' ? 14 + Math.floor(Math.random() * 7) : 7 + Math.floor(Math.random() * 6);
    const nextTurns = Math.max(0, campSearchTurnsLeft - 1);
    const nextEnergy = Math.max(0, campSearchEnergy - energyCost);
    const nextCampSuspicion = Math.min(100, campSearchSuspicion + suspicionGain);
    const nextTotalSuspicion = Math.min(100, searchSuspicionScore + suspicionGain);

    let strongChance = isTargetZone ? 0.6 : 0.04;
    let weakChance = isTargetZone ? 0.34 : 0.28;
    if (intensity === 'thorough') {
      strongChance += 0.14;
      weakChance -= 0.06;
    }
    if (playerFoundClueScroll || playerHeardIdolClue || idolSearchClues >= 1) {
      strongChance += isTargetZone ? 0.1 : 0;
      weakChance += isTargetZone ? 0.02 : 0;
    }
    const roll = Math.random();
    const clueQuality = roll <= strongChance ? 'strong' : roll <= strongChance + weakChance ? 'weak' : 'none';
    const confidence = clueQuality === 'strong' ? 'high confidence' : clueQuality === 'weak' ? 'medium confidence' : 'low confidence';

    let clueLine = '';
    let progressGain = 0;
    let clueGain = 0;
    if (clueQuality === 'strong' && isTargetZone) {
      clueLine = `Strong clue (${confidence}): fresh disturbance near ${zone.label} looks deliberate, not random foot traffic.`;
      progressGain = intensity === 'thorough' ? 48 : 36;
      clueGain = 1;
    } else if (clueQuality === 'weak' && isTargetZone) {
      clueLine = `Weak clue (${confidence}): something around ${zone.label} looks recently handled, but you cannot confirm yet.`;
      progressGain = intensity === 'thorough' ? 28 : 18;
      clueGain = 1;
    } else if (clueQuality === 'strong') {
      clueLine = `Strong clue (${confidence}): ${zone.label} has signs worth checking, but it could be a planted decoy.`;
      progressGain = 4;
    } else if (clueQuality === 'weak') {
      clueLine = `Weak clue (${confidence}): subtle marks near ${zone.label}, but it might be ordinary camp activity.`;
      progressGain = 2;
    } else {
      clueLine = `No reliable clue: ${zone.label} turns up mostly noise and dead ends.`;
      progressGain = 0;
    }

    const nextProgress = Math.min(100, idolSearchProgress + progressGain);
    const nextClues = idolSearchClues + clueGain;
    const witnessCount = suspicionGain >= 20 || nextTotalSuspicion >= 65 ? 2 : 1;
    const witnessedBy = pickRandomMany(
      castaways.map((c) => c.name).filter((name) => name !== castawayIdolFinderName),
      witnessCount
    );

    setCampSearchTurnsLeft(nextTurns);
    setCampSearchEnergy(nextEnergy);
    setCampSearchSuspicion(nextCampSuspicion);
    setSearchSuspicionScore(nextTotalSuspicion);
    setIdolSearchProgress(nextProgress);
    setIdolSearchClues(nextClues);
    setPlayerSearchNoticedBy((prev) => Array.from(new Set([...prev, ...witnessedBy])));
    setCampSearchLog((prev) => [
      ...prev,
      `(${zone.label}) ${clueLine}`,
      `Cost: -${energyCost} energy, +${suspicionGain} suspicion. Progress ${nextProgress}/100.`
    ]);

    if (!playerFoundClueScroll && campSearchZoneId === clueZoneId && clueQuality !== 'none') {
      setPlayerFoundClueScroll(true);
      setPlayerHeardIdolClue(true);
      setCampSearchLog((prev) => [...prev, `You recovered a clue scroll: "${zoneById(idolZoneId).clue}"`]);
    }

    const foundRealIdol = intensity === 'thorough' && isTargetZone && nextProgress >= 90;
    if (foundRealIdol) {
      if (castawayHasIdolName) {
        finishCampSearch(
          false,
          `You search ${zone.label} thoroughly and realize someone got there first. The hide is empty and disturbed.`
        );
        return;
      }
      setPlayerHasIdol(true);
      finishCampSearch(
        true,
        `You find a hidden immunity idol at ${idolLocation}. Keep it secret. You can play it at tribal for yourself or someone else.`
      );
      return;
    }

    const fakeFindRoll = Math.random();
    if (intensity === 'thorough' && isFakeZone && !playerHasFakeIdol && fakeFindRoll < 0.55) {
      setPlayerHasFakeIdol(true);
      finishCampSearch(true, 'You found something wrapped in twine and cloth. It looks exactly like an idol.');
      return;
    }

    if (nextTurns <= 0 || nextEnergy <= 0) {
      finishCampSearch(false, `You head back to camp empty-handed. The search drew attention from ${witnessedBy.join(' and ')}.`);
    }
    } finally {
      campSearchActionLockRef.current = false;
    }
  }

  async function loadTribalHostOpening() {
    setTribalHostLoading(true);
    const hostId = `thost-${Date.now()}`;
    setTribalPublicHistory([{ id: hostId, role: 'host', speaker: 'Host', text: '', typing: true }]);
    try {
      const castawayContext = castaways.map((c) => ({
        name: c.name,
        personality: c.personality,
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        hasClue: c.id === idolClueHolderId,
        hasRealIdol: castawayHasIdolName === c.name,
        plantedFakeIdol: fakeIdolPlanted && fakeIdolPlanterName === c.name,
        currentlySearching: castawayCurrentlySearching.includes(c.name)
      }));
      const oneOnOneHistory = castaways.map((c) => ({
        name: c.name,
        history: (conversationHistories[c.id] || []).map((m) => ({
          role: m.role,
          text: m.text
        }))
      }));
      const campfireContext = campfireHistory.map((m) => ({
        speaker: m.role === 'user' ? playerName : m.speaker || 'Unknown',
        role: m.role,
        text: m.text
      }));

      const system = `You are orchestrating a Survivor-style tribal council as a live group conversation around the fire.

Rules:
- Host voice is sharp, observational, slightly theatrical.
- Host never reveals hidden agendas directly.
- Keep opening to 2-3 sentences.
- Host should reference whether the player won or lost immunity and how it shifts pressure.
- Immediately after the Host opening, include 1-2 castaway reactions.
- Castaways react naturally to each other and to tension in the room.
- Host and castaway observations must be tied to concrete events from this specific game history (real quotes, hesitations, contradictions, alliance signals).
- Avoid generic observations that could fit any game.
- Do not repeat an observation angle once it has already been used in this session; push the conversation into new territory.
- Castaways should react through their personality lens rather than sounding interchangeable.
- Castaways already know who is immune and must strategize accordingly:
  - Immunity only means that person cannot receive votes tonight.
  - The immune person still votes, still influences outcomes, and can be a swing vote.
  - Nobody pushes voting for the immune person.
  - If an immune name comes up, someone should correct and redirect.
  - If immunity disrupted plans, reactions should show scrambling, confidence swings, or opportunism.
- Return strict JSON only, no markdown.
${buildIdolContext()}
- Host lines already used this session must never be repeated or closely paraphrased.

Format:
{
  "opening": "",
  "reactions": [{ "name": "", "response": "" }]
}`;

      const prompt = `Player: ${playerName}
Player occupation: ${playerOccupation}
Player immunity status: ${playerHasImmunity ? 'Won immunity (safe tonight)' : 'No immunity (vulnerable tonight)'}
Immune castaway tonight: ${immuneCastawayName || 'none'}
Castaways:
${JSON.stringify(castawayContext, null, 2)}

1-on-1 histories:
${JSON.stringify(oneOnOneHistory, null, 2)}

Campfire history:
${JSON.stringify(campfireContext, null, 2)}
${buildIdolContext()}
Host lines already used in this session (do not repeat or closely paraphrase):
${JSON.stringify(tribalHostLinesUsed, null, 2)}

Write the tribal opening beat and immediate reactions.`;

      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 0.9
      });

      const parsed = parseClaudeJson(raw);
      const opening = String(parsed?.opening || '').trim();
      const validNames = new Set(castaways.map((c) => c.name));
      const reactions = Array.isArray(parsed?.reactions)
        ? parsed.reactions
            .map((r) => ({
              name: String(r?.name || '').trim(),
              response: String(r?.response || '').trim()
            }))
            .filter((r) => r.name && r.response && validNames.has(r.name))
            .slice(0, 2)
        : [];

      const safeOpening =
        opening ||
        'Tonight, stories are colliding, loyalties look shaky, and someone is about to pay for what they said in daylight.';
      setTribalHostOpening(safeOpening);
      await animateTribalReply(hostId, safeOpening);
      rememberHostLine(safeOpening);

      for (let i = 0; i < reactions.length; i += 1) {
        const reactionId = `treact-${Date.now()}-${i}`;
        setTribalPublicHistory((prev) => [...prev, { id: reactionId, role: 'castaway', speaker: reactions[i].name, text: '', typing: true }]);
        await animateTribalReply(reactionId, reactions[i].response);
        if (i < reactions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      const fallback =
        'Interesting day. Some of you talked too much, some of you vanished at key moments, and out here both can be dangerous.';
      setTribalHostOpening(fallback);
      setTribalPublicHistory([{ id: `thost-fallback-${Date.now()}`, role: 'host', speaker: 'Host', text: fallback, typing: false }]);
      rememberHostLine(fallback);
      setError(err.message || 'Failed to load host opening.');
    } finally {
      setTribalHostLoading(false);
    }
  }

  async function runTribalTurn(baseHistory, nextPlayerCount) {
    const waitingId = `twait-${Date.now()}`;
    setTribalPublicHistory((prev) => [...prev, { id: waitingId, role: 'host', speaker: 'Host', text: '', typing: true }]);

    try {
      const castawayContext = castaways.map((c) => ({
        name: c.name,
        age: c.age,
        occupation: c.occupation,
        personality: c.personality,
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        hasClue: c.id === idolClueHolderId,
        hasRealIdol: castawayHasIdolName === c.name,
        plantedFakeIdol: fakeIdolPlanted && fakeIdolPlanterName === c.name,
        currentlySearching: castawayCurrentlySearching.includes(c.name)
      }));
      const oneOnOneHistory = castaways.map((c) => ({
        name: c.name,
        history: (conversationHistories[c.id] || []).map((m) => ({
          role: m.role,
          text: m.text
        }))
      }));
      const campfireContext = campfireHistory.map((m) => ({
        speaker: m.role === 'user' ? playerName : m.speaker || 'Unknown',
        role: m.role,
        text: m.text
      }));
      const tribalHistoryForPrompt = baseHistory.map((m) => ({
        role: m.role,
        speaker: m.speaker,
        text: m.text
      }));

      const system = `You simulate an active Survivor-style tribal council group conversation.

Core behavior:
- Every castaway at tribal council is fighting for their own survival tonight.
- Castaways are active players making strategic moves in real time, not passive commentators.
- The player is one person in a room full of people trying to survive; heat should move around naturally.
- Account for immunity status. If the player won immunity, castaways know the player cannot be voted out and redirect strategy accordingly.
- Sometimes the player is the center, sometimes castaways clash with each other, sometimes a surprise name shifts momentum.
- Every observation must be specific to this game's actual history (real contradictions, private/public mismatches, hesitations, and alliance behavior), not generic tribal tropes.
- Do not repeat callout phrasing or the same observational angle once it has been used; each beat should add new information or pressure.
- Castaway perspective should reflect personality differences: strategic players track inconsistency, social players track emotional shifts, quiet observers track interaction patterns.
- Immunity is non-negotiable strategic reality:
  - Immunity only blocks votes against that person tonight.
  - The immune person still votes, still matters politically, and can be the deciding vote.
  - Strategizing with an immune person is valid and smart; nobody should treat that as irrational.
  - No castaway suggests voting out the immune person.
  - If the player pushes an immune name, castaways/host correct and move on.
  - Castaways aligned with the immune person may act safer and more aggressive.
  - Castaways who planned to target the immune person should show uncertainty and active pivoting.
  - Conversation should focus on viable targets given who is safe tonight.

Castaway strategic behavior:
- Castaways who feel safe are quietly confident and may take a subtle shot at a rival (planting seeds, lightly throwing someone under the bus).
- Castaways who feel threatened deflect and redirect attention by highlighting suspicious behavior from someone else.
- Castaways in secret alliances protect allies subtly and reinforce pressure on shared enemies without making loyalty obvious.
- Castaways should disagree with each other, not just with the player.
- Alliances should show subtle cracks under pressure; someone may reveal too much and someone else may call it out.

Host behavior:
- The Host is sharp and theatrical, never directly revealing hidden agendas.
- The Host reads room energy and steers toward whoever is squirming most, not always the player.
- If two castaways are tense with each other, the Host leans in.
- If someone goes suspiciously quiet, the Host calls it out by name.

Session dynamic (secret):
- At the start of each tribal session, secretly choose ONE social dynamic and keep it consistent throughout the session:
1) Unified target
2) Split camp
3) Chaos
4) Quiet threat
- The player must not be told which dynamic is active.
- By the time the vote is called, outcome should feel genuinely uncertain, not like the player was always the obvious target.

Conversation rules:
- This is a flowing group chat around the fire.
- Castaways react to each other and to the player.
- Host speaks only when natural: redirecting, stirring pressure, or pressing revealing tension.
- If the Host directly addresses a castaway by name, that castaway answers automatically in this same turn.
- After that direct answer, 1-2 other castaways may react briefly.
- The player is only expected to answer when addressed by name.
- Castaways may lie, deflect, perform loyalty, or crack.
- Never reveal hidden agendas directly.
- Keep each line concise: Host 1-2 sentences, castaways 1-3 sentences.
- Return strict JSON only, no markdown.
${buildIdolContext()}
- Host lines already used in this tribal session must never be repeated or closely paraphrased.

Output format:
{
  "responses": [{ "speaker": "Host or CastawayName", "text": "" }],
  "callVote": false,
  "hostClosingLine": ""
}`;

      const prompt = `Player name: ${playerName}
Player occupation: ${playerOccupation}
Player immunity status: ${playerHasImmunity ? 'Won immunity (safe tonight)' : 'No immunity (vulnerable tonight)'}
Immune castaway tonight: ${immuneCastawayName || 'none'}
Player message count so far: ${nextPlayerCount}
Latest player message: ${nextPlayerCount > tribalPlayerMessages ? 'Provided this turn' : 'No new player message this beat'}
Castaway profiles:
${JSON.stringify(castawayContext, null, 2)}

1-on-1 histories:
${JSON.stringify(oneOnOneHistory, null, 2)}

Campfire history:
${JSON.stringify(campfireContext, null, 2)}

Tribal conversation thread so far:
${JSON.stringify(tribalHistoryForPrompt, null, 2)}
${buildIdolContext()}
Host lines already used in this session (do not repeat or closely paraphrase):
${JSON.stringify(tribalHostLinesUsed, null, 2)}

Decision rules:
- Choose who responds naturally right now (usually 2-4 total lines), even if the player stayed silent.
- If no one was directly addressed by the player, host/castaways can still continue the conversation organically.
- callVote should become true once tension peaks, typically after 4-6 player messages.
- Must set callVote true by player message 6 at the latest.
- If callVote is true, include a strong Host closing line calling for the vote.`;

      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 0.95
      });

      const parsed = parseClaudeJson(raw);
      const validNames = new Set(castaways.map((c) => c.name));
      const responses = Array.isArray(parsed?.responses)
        ? parsed.responses
            .map((r) => ({
              speaker: String(r?.speaker || '').trim(),
              text: String(r?.text || '').trim()
            }))
            .filter((r) => r.speaker && r.text && (r.speaker === 'Host' || validNames.has(r.speaker)))
            .filter((r) => (r.speaker === 'Host' ? !isHostLineUsed(r.text) : true))
        : [];

      let callVote = Boolean(parsed?.callVote);
      let hostClosingLine = String(parsed?.hostClosingLine || '').trim();
      if (nextPlayerCount >= 6) callVote = true;
      if (callVote && !hostClosingLine) {
        hostClosingLine = 'Enough. The lines are drawn, and it is time to vote.';
      }
      if (callVote && isHostLineUsed(hostClosingLine)) {
        hostClosingLine = 'That is enough. It is time to vote.';
      }

      setTribalPublicHistory((prev) => prev.filter((m) => m.id !== waitingId));

      for (let i = 0; i < responses.length; i += 1) {
        const msg = responses[i];
        const messageId = `tr-${Date.now()}-${i}`;
        setTribalPublicHistory((prev) => [
          ...prev,
          {
            id: messageId,
            role: msg.speaker === 'Host' ? 'host' : 'castaway',
            speaker: msg.speaker,
            text: '',
            typing: true
          }
        ]);
        await animateTribalReply(messageId, msg.text);
        if (msg.speaker === 'Host') {
          rememberHostLine(msg.text);
          if (new RegExp(`\\b${playerName}\\b`, 'i').test(msg.text)) {
            clearTribalAutoAdvanceTimer();
            setTribalAwaitingPlayer(true);
            setTribalCastawayExchangesSincePlayer(0);
            setTribalPlayerCheckInThreshold(Math.random() < 0.5 ? 2 : 3);
            return;
          }
        }
        if (i < responses.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }

      const castawayExchangesThisTurn = responses.filter((r) => r.speaker !== 'Host').length;
      const updatedCastawayExchanges = tribalCastawayExchangesSincePlayer + castawayExchangesThisTurn;
      setTribalCastawayExchangesSincePlayer(updatedCastawayExchanges);

        const shouldPromptPlayer =
        !callVote && updatedCastawayExchanges >= tribalPlayerCheckInThreshold;
      if (shouldPromptPlayer) {
        const promptId = `tplayer-prompt-${Date.now()}`;
        const playerCalledOut = updatedCastawayExchanges > 2;
        const standardPrompts = [
          `${playerName}, you've heard the names and the nerves. Where are you right now, and who should this tribe be worried about?`,
          `${playerName}, you've had time to watch this unfold. What's your read, and whose name should be getting louder tonight?`,
          `${playerName}, everyone here is pitching a story. Which one do you believe, and who are you ready to write down?`,
          `${playerName}, this fire is pulling in two directions. Tell me where your vote is leaning and why.`
        ];
        const calledOutPrompts = [
          `${playerName}, you've been quiet while this shifts around you. Are you checked out tonight, or are you hiding where your vote is going?`,
          `${playerName}, silence can be strategy or fear. Which one is yours right now, and who benefits from it?`,
          `${playerName}, you've watched this without stepping in. Are you waiting for the right moment, or avoiding the heat?`,
          `${playerName}, people notice when you stay quiet at tribal. What are you not saying, and who should be worried?`
        ];
        const promptPool = playerCalledOut ? calledOutPrompts : standardPrompts;
        let promptLine = promptPool.find((line) => !isHostLineUsed(line)) || promptPool[0];
        if (isHostLineUsed(promptLine)) {
          promptLine = `${playerName}, this has shifted again. Before we move on, tell me plainly where your vote is headed tonight.`;
        }
        setTribalPublicHistory((prev) => [
          ...prev,
          { id: promptId, role: 'host', speaker: 'Host', text: '', typing: true }
        ]);
        await animateTribalReply(promptId, promptLine);
        rememberHostLine(promptLine);
        clearTribalAutoAdvanceTimer();
        setTribalAwaitingPlayer(true);
        setTribalCastawayExchangesSincePlayer(0);
        setTribalPlayerCheckInThreshold(Math.random() < 0.5 ? 2 : 3);
        return;
      }

      if (callVote) {
        const hostId = `tvote-${Date.now()}`;
        setTribalPublicHistory((prev) => [...prev, { id: hostId, role: 'host', speaker: 'Host', text: '', typing: true }]);
        await animateTribalReply(hostId, hostClosingLine);
        rememberHostLine(hostClosingLine);
        setTribalVoteCalled(true);
      }
    } catch (err) {
      setTribalPublicHistory((prev) => prev.filter((m) => m.id !== waitingId));
      setError(err.message || 'Tribal conversation failed.');
    }
  }

  async function sendTribalMessage() {
    if (chatInFlight || tribalVoteCalled) return;
    if (!tribalChatInput.trim()) return;

    setError('');
    setChatInFlight(true);

    const playerText = tribalChatInput.trim();
    setTribalChatInput('');

    const playerMessage = {
      id: `tp-${Date.now()}`,
      role: 'player',
      speaker: playerName,
      text: playerText,
      typing: false
    };
    const nextHistory = [...tribalPublicHistory, playerMessage];
    const nextPlayerCount = tribalPlayerMessages + 1;
    setTribalPublicHistory(nextHistory);
    setTribalPlayerMessages(nextPlayerCount);
    setTribalAwaitingPlayer(false);
    setTribalCastawayExchangesSincePlayer(0);
    setTribalPlayerCheckInThreshold(Math.random() < 0.5 ? 2 : 3);

    await runTribalTurn(nextHistory, nextPlayerCount);
    setChatInFlight(false);
  }

  useEffect(() => {
    if (phase !== 'tribal' || tribalVoteCalled || tribalStarted) return;
    if (tribalHostLoading || chatInFlight || tribalAwaitingPlayer || tribalPublicHistory.length === 0) {
      clearTribalAutoAdvanceTimer();
      return;
    }
    clearTribalAutoAdvanceTimer();
    tribalAutoAdvanceTimerRef.current = setTimeout(async () => {
      if (chatInFlight || tribalVoteCalled || tribalStarted || tribalAwaitingPlayer) return;
      setChatInFlight(true);
      await runTribalTurn(tribalPublicHistory, tribalPlayerMessages);
      setChatInFlight(false);
    }, 4200);
    return () => clearTribalAutoAdvanceTimer();
  }, [phase, tribalVoteCalled, tribalStarted, tribalHostLoading, chatInFlight, tribalAwaitingPlayer, tribalPublicHistory, tribalPlayerMessages]);

  function playPlayerIdol() {
    if (tribalStarted) return;
    if (!playerHasIdol && !playerHasFakeIdol) return;
    const target = idolPlayTarget || playerName;
    setIdolPlayedByPlayer(true);
    setIdolProtectedName(target);
    if (playerHasFakeIdol) {
      setIdolPlayedFakeByPlayer(true);
      setIdolAnnouncement('The player plays an idol... but it is fake. The votes stand.');
    } else {
      setIdolAnnouncement(`The player plays a hidden immunity idol for ${target}. Votes against ${target} will not count tonight.`);
    }
  }

  async function runTribalCouncil(selectedVote) {
    let voteTarget = selectedVote || tribalSelection;
    if (!voteTarget || tribalStarted) return;
    setError('');
    setTribalStarted(true);
    clearTribalAutoAdvanceTimer();
    setTribalVoteConfirming(false);
    setTribalSelection(voteTarget);
    setVotes([]);
    setRevealedVotesCount(0);
    setEliminatedName('');
    setRevealData(null);

    try {
      const playerHadRealIdolAtTribal = playerHasIdol;
      const playerHadFakeIdolAtTribal = playerHasFakeIdol;
      const castawayHadIdolAtTribal = castawayHasIdolName;
      const challengeImmuneNames = [
        ...(immuneCastawayName ? [immuneCastawayName] : []),
        ...(playerHasImmunity ? [playerName] : [])
      ];
      const playerIdolProtectedName =
        idolPlayedByPlayer && !idolPlayedFakeByPlayer && (idolProtectedName || playerName)
          ? idolProtectedName || playerName
          : '';
      const immuneTargetNames = new Set([
        ...challengeImmuneNames,
        ...(playerIdolProtectedName ? [playerIdolProtectedName] : [])
      ]);
      const voteTargetNames = [
        ...castaways.map((c) => c.name).filter((name) => !immuneTargetNames.has(name)),
        ...(!playerHasImmunity && !immuneTargetNames.has(playerName) ? [playerName] : [])
      ];
      if (!voteTargetNames.includes(voteTarget)) {
        voteTarget = voteTargetNames[0] || voteTarget;
        setTribalSelection(voteTarget);
      }
      const castawayData = castaways.map((c) => ({
        name: c.name,
        personality: c.personality,
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        hasIdol: castawayHasIdolName === c.name,
        canVoteForPlayer: !playerHasImmunity,
        conversationWithPlayer: (conversationHistories[c.id] || []).map((m) => ({
          role: m.role,
          text: m.text
        })),
        campfireHistory: campfireHistory.map((m) => ({
          speaker: m.role === 'user' ? playerName : m.speaker || 'Unknown',
          role: m.role,
          text: m.text
        })),
        tribalHistory: tribalPublicHistory.map((m) => ({
          role: m.role,
          speaker: m.speaker,
          text: m.text
        }))
      }));

      const system = `You simulate strategic Survivor-style voting behavior.

Immunity rule:
- Immunity only means that person cannot receive votes tonight.
- The immune person still votes and can be a decisive swing vote.
- Never produce a vote for an immune person.

Return strict JSON only. No markdown.`;
      const userPrompt = `Player name: ${playerName}
Player occupation: ${playerOccupation}
Player immunity status: ${playerHasImmunity ? 'Won immunity (cannot be voted out)' : 'No immunity (can be voted out)'}
Immune castaway tonight: ${immuneCastawayName || 'none'}
Player voted for: ${voteTarget}
Eligible vote targets: ${JSON.stringify(voteTargetNames)}
Player idol played: ${idolPlayedByPlayer ? 'yes' : 'no'}
Player idol fake: ${idolPlayedFakeByPlayer ? 'yes' : 'no'}
Player idol protected target: ${playerIdolProtectedName || 'none'}
Castaway idol holder: ${castawayHasIdolName || 'none'}

Castaway data:
${JSON.stringify(castawayData, null, 2)}

Task:
Simulate how the 5 castaways voted at tribal council based on hidden agendas, alliances, and player conversations.
Return ONLY JSON in this exact format:
[
  { "name": "", "votedFor": "", "flipped": false }
]
Rules:
- Exactly 5 vote objects.
- name must be each castaway exactly once.
- votedFor must be one of the eligible vote target names.
- votedFor cannot be themselves.
- If player has immunity, no vote can be for "${playerName}".
- If a castaway has immunity, no vote can be for that castaway.
- Votes must reflect full 1-on-1, campfire, and tribal history.
- Honor alliance/voting plans castaways made with the player unless a specific tribal moment changed the calculus.
- Blindsides are allowed only if grounded in a real tribal moment that changed calculus.
- Set flipped=true if this castaway voted against what they told the player.
- No extra keys.
- Valid JSON only.`;

      const rawVotes = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2000,
        temperature: 0.9
      });

      const parsedVotes = parseClaudeJson(rawVotes);
      if (!Array.isArray(parsedVotes) || parsedVotes.length !== 5) {
        throw new Error('Vote simulation returned invalid data.');
      }

      const validVoters = new Set(castaways.map((c) => c.name));
      const validTargets = new Set(voteTargetNames);
      const normalizedVotes = parsedVotes
        .map((v) => ({
          name: String(v?.name || '').trim(),
          votedFor: String(v?.votedFor || '').trim(),
          flipped: Boolean(v?.flipped)
        }))
        .filter((v) => validVoters.has(v.name) && validTargets.has(v.votedFor) && v.name !== v.votedFor)
        .filter((v) => !immuneTargetNames.has(v.votedFor));

      if (normalizedVotes.length !== 5) {
        throw new Error('Claude vote output failed validation.');
      }
      const uniqueVoterCount = new Set(normalizedVotes.map((v) => v.name)).size;
      if (uniqueVoterCount !== 5) {
        throw new Error('Claude vote output contained duplicate voters.');
      }

      let finalVotes = [...normalizedVotes];
      let playerVoteCounts = true;
      let castawayIdolPlayName = '';
      let castawayIdolAnnouncement = '';
      if (castawayHasIdolName && !immuneTargetNames.has(castawayHasIdolName)) {
        const againstCastaway =
          finalVotes.filter((v) => v.votedFor === castawayHasIdolName).length +
          (voteTarget === castawayHasIdolName ? 1 : 0);
        if (againstCastaway >= 2) {
          castawayIdolPlayName = castawayHasIdolName;
          castawayIdolAnnouncement = `${castawayHasIdolName} reaches into their bag and pulls out a hidden immunity idol. All votes cast against ${castawayHasIdolName} tonight do not count.`;
          finalVotes = finalVotes.filter((v) => v.votedFor !== castawayHasIdolName);
          if (voteTarget === castawayHasIdolName) {
            playerVoteCounts = false;
          }
        }
      }
      setIdolPlayedByCastaway(castawayIdolPlayName);
      setCastawayHasIdolName('');
      setPlayerHasIdol(false);
      setPlayerHasFakeIdol(false);

      setVotes(finalVotes);

      let revealIndex = 0;
      voteTimerRef.current = setInterval(() => {
        revealIndex += 1;
        setRevealedVotesCount(revealIndex);
        if (revealIndex >= finalVotes.length) {
          clearInterval(voteTimerRef.current);
          voteTimerRef.current = null;

          const tally = {};
          for (const v of finalVotes) {
            tally[v.votedFor] = (tally[v.votedFor] || 0) + 1;
          }
          if (playerVoteCounts) {
            tally[voteTarget] = (tally[voteTarget] || 0) + 1;
          }

          const eliminated = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] || voteTarget;
          if (idolPlayedByPlayer) {
            setIdolAnnouncement((prev) => prev || castawayIdolAnnouncement);
          }
          if (castawayIdolAnnouncement) {
            setIdolAnnouncement(castawayIdolAnnouncement);
          }
          setIdolOutcome({
            idolExisted: idolExists,
            clueHolder: castaways.find((c) => c.id === idolClueHolderId)?.name || '',
            playerFoundRealIdol: playerHadRealIdolAtTribal,
            playerFoundFakeIdol: playerHadFakeIdolAtTribal,
            castawayFoundIdol: castawayIdolPlayName || castawayHadIdolAtTribal || '',
            fakeIdolPlanted,
            fakeIdolPlanterName,
            playerPlayedIdol: idolPlayedByPlayer,
            playerPlayedFakeIdol: idolPlayedFakeByPlayer,
            idolPlayedByCastaway: castawayIdolPlayName,
            idolProtectedName: playerIdolProtectedName || ''
          });
          setEliminatedName(eliminated);
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Tribal council failed.');
      setTribalStarted(false);
    }
  }

  useEffect(() => {
    if (!eliminatedName || revealLoading || revealData) return;

    async function buildReveal() {
      setRevealLoading(true);
      try {
        const payload = {
          playerName,
          playerOccupation,
          playerVote: tribalSelection,
          eliminated: eliminatedName,
          castaways: castaways.map((c) => ({
            name: c.name,
            hiddenAgenda: c.hiddenAgenda,
            secretAlliances: c.secretAlliances,
            personality: c.personality,
            occupation: c.occupation
          })),
          votes,
          tribalHistory: tribalPublicHistory.map((m) => ({
            role: m.role,
            speaker: m.speaker,
            text: m.text
          })),
          campfireHistory: campfireHistory.map((m) => ({
            role: m.role,
            speaker: m.speaker || (m.role === 'user' ? playerName : ''),
            text: m.text
          })),
          idolContext: {
            idolExisted: Boolean(idolExists),
            idolLocation,
            clueHolder: castaways.find((c) => c.id === idolClueHolderId)?.name || '',
            playerSearchedCamp,
            playerSearchNoticedBy,
            fakeIdolPlanted,
            fakeIdolPlanterName,
            idolAnnouncement,
            idolOutcome
          },
          conversations: castaways.map((c) => ({
            name: c.name,
            history: (conversationHistories[c.id] || []).map((m) => ({
              role: m.role,
              text: m.text
            }))
          }))
        };

        const system = 'You write strategic post-tribal reveals for a Survivor-style game. Return strict JSON only, no markdown.';
        const prompt = `Generate a post-tribal truth reveal from this game state:
${JSON.stringify(payload, null, 2)}

Return ONLY JSON with this shape:
{
  "narrative": "",
  "thoughts": [{ "name": "", "thought": "" }],
  "alliancesExposed": [""],
  "flippedCallouts": [{ "name": "", "toldPlayer": "", "did": "", "why": "" }],
  "idolStory": "",
  "verdict": "",
  "rightMove": true
}

Rules:
- thoughts must include all 5 castaway names exactly once.
- thought must be one sentence each.
- alliancesExposed should list concise alliance truths.
- flippedCallouts should include only castaways who flipped against what they told the player.
- For each flipped callout, explicitly state what they told the player, what they actually did, and why.
- idolStory must explain full idol arc: who had clue, who found real/fake idol, who played or held it, and how it changed or did not change outcome.
- If player had an idol and did not play it and got eliminated, call it out directly in verdict.
- verdict should directly say whether the player made the right move and why, and mention whether the player's occupation helped or hurt them socially.
- narrative should be dramatic but concise (4-7 sentences).
- Valid JSON only.`;

        const raw = await callClaude({
          apiKey: CLAUDE_CLIENT_API_KEY,
          system,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
          temperature: 0.9
        });

        const parsed = parseClaudeJson(raw);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Reveal parse failed');
        }

        const normalized = {
          narrative: String(parsed.narrative || '').trim(),
          thoughts: Array.isArray(parsed.thoughts)
            ? parsed.thoughts.map((t) => ({
                name: String(t?.name || '').trim(),
                thought: String(t?.thought || '').trim()
              }))
            : [],
          alliancesExposed: Array.isArray(parsed.alliancesExposed) ? parsed.alliancesExposed.map((a) => String(a).trim()).filter(Boolean) : [],
          flippedCallouts: Array.isArray(parsed.flippedCallouts)
            ? parsed.flippedCallouts
                .map((f) => ({
                  name: String(f?.name || '').trim(),
                  toldPlayer: String(f?.toldPlayer || '').trim(),
                  did: String(f?.did || '').trim(),
                  why: String(f?.why || '').trim()
                }))
                .filter((f) => f.name && f.did)
            : [],
          idolStory: String(parsed.idolStory || '').trim(),
          verdict: String(parsed.verdict || '').trim(),
          rightMove: Boolean(parsed.rightMove)
        };

        setRevealData(normalized);
      } catch (err) {
        setRevealData({
          narrative:
            'The torches dimmed, truths spilled out, and everyone had a reason for every lie. Hidden agendas drove every vote, and your social reads shaped the final outcome.',
          thoughts: castaways.map((c) => ({
            name: c.name,
            thought: `${c.name} saw you as dangerous enough to watch, but useful enough to keep close until the vote turned.`
          })),
          alliancesExposed: castaways
            .filter((c) => c.secretAlliances.length)
            .map((c) => `${c.name} quietly worked with ${c.secretAlliances.join(' and ')}.`),
          flippedCallouts: votes
            .filter((v) => v.flipped)
            .map((v) => ({
              name: v.name,
              toldPlayer: `${v.name} signaled alignment with the player plan.`,
              did: `${v.name} voted for ${v.votedFor}.`,
              why: 'They recalculated risk in the final moments and protected their own position.'
            })),
          idolStory:
            idolAnnouncement ||
            (idolOutcome?.fakeIdolPlanted
              ? `A fake idol was planted by ${idolOutcome.fakeIdolPlanterName || 'someone'}, and it shaped the paranoia even when it wasn't played.`
              : 'An idol existed this game, but it did not ultimately alter who went home tonight.'),
          verdict:
            `It was a defensible move, but your influence was obvious and that will raise your threat level next round. Your ${playerOccupation || 'background'} helped in credibility with some players, but also made you easier to profile socially.`,
          rightMove: true
        });
        setError(err.message || 'Reveal generation failed; fallback used.');
      } finally {
        setRevealLoading(false);
        setPhase('reveal');
      }
    }

    buildReveal();
  }, [eliminatedName]);

  function openTribalPhase() {
    setPhase('tribal');
    setCampSearchOpen(false);
    clearTribalAutoAdvanceTimer();
    const initialTarget = castaways.map((c) => c.name).find((name) => name !== immuneCastawayName) || (playerHasImmunity ? '' : playerName);
    setTribalSelection(initialTarget || '');
    setTribalVoteConfirming(false);
    setTribalHostLinesUsed([]);
    setIdolPlayTarget(playerName);
    setIdolPlayedByPlayer(false);
    setIdolPlayedFakeByPlayer(false);
    setIdolPlayedByCastaway('');
    setIdolProtectedName('');
    setIdolAnnouncement('');
    setIdolOutcome(null);
    setTribalHostOpening('');
    setTribalHostLoading(false);
    setTribalPublicHistory([]);
    setTribalChatInput('');
    setTribalPlayerMessages(0);
    setTribalVoteCalled(false);
    setTribalAwaitingPlayer(false);
    setTribalCastawayExchangesSincePlayer(0);
    setTribalPlayerCheckInThreshold(Math.random() < 0.5 ? 2 : 3);
    setTribalStarted(false);
    setVotes([]);
    setRevealedVotesCount(0);
    setEliminatedName('');
    setRevealData(null);
    setError('');
  }

  async function submitNotify(e) {
    e.preventDefault();
    const normalizedEmail = notifyEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotifyMessage('Enter an email first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNotifyMessage('Enter a valid email address.');
      return;
    }
    if (!supabase) {
      setNotifyMessage('Email signup is not configured yet. Add Supabase env vars and restart the app.');
      return;
    }

    setNotifySubmitting(true);
    try {
      const { error } = await supabase.from(SUPABASE_WAITLIST_TABLE).insert([{ email: normalizedEmail }]);
      if (error?.code === '23505') {
        setNotifyMessage('You are already on the list.');
        return;
      }
      if (error) {
        throw error;
      }
      setNotifyMessage(`Thanks. We'll notify ${normalizedEmail} when the full season drops.`);
      setNotifyEmail('');
    } catch (err) {
      setNotifyMessage(err?.message ? `Signup failed: ${err.message}` : 'Signup failed. Please try again.');
    } finally {
      setNotifySubmitting(false);
    }
  }

  const canSendConversation =
    chatMode === 'campfire' ? conversationInput.trim() && !chatInFlight : selectedCastaway && conversationInput.trim() && !chatInFlight;

  return (
    <div className="relative min-h-full overflow-x-hidden text-zinc-100">
      <div className="absolute inset-0 torch-overlay pointer-events-none" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Header phase={phase} playerName={playerName} playerOccupation={playerOccupation} />

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/40 bg-red-900/30 px-4 py-3 text-sm text-red-100 animate-fadeIn">
            {error}
          </div>
        )}

        {phase === 'meet' && (
          <MeetPhase
            playerNameInput={playerNameInput}
            setPlayerNameInput={setPlayerNameInput}
            playerOccupationInput={playerOccupationInput}
            setPlayerOccupationInput={setPlayerOccupationInput}
            generateCastaways={generateCastaways}
            generatingCastaways={generatingCastaways}
          />
        )}

        {phase === 'immunity_intro' && <ImmunityIntroPhase immunityType={immunityType} startImmunityChallenge={startImmunityChallenge} />}

        {phase === 'immunity_pep' && (
          <ImmunityPepPhase
            immunityPepLoading={immunityPepLoading}
            immunityPepTalk={immunityPepTalk}
            setPhase={setPhase}
          />
        )}

        {phase === 'immunity_puzzle' && (
          <ImmunityPuzzlePhase
            immunityType={immunityType}
            immunityTimer={immunityTimer}
            slidingBoard={slidingBoard}
            handleSlidingClick={handleSlidingClick}
            memoryDeck={memoryDeck}
            handleMemoryClick={handleMemoryClick}
            cipherData={cipherData}
            cipherGuess={cipherGuess}
            setCipherGuess={setCipherGuess}
            submitCipherGuess={submitCipherGuess}
            mazeGrid={mazeGrid}
            mazePos={mazePos}
            moveMaze={moveMaze}
            jigsawPieces={jigsawPieces}
            jigsawSelected={jigsawSelected}
            handleJigsawClick={handleJigsawClick}
            jigsawImageUrl={jigsawImageUrl}
            ropeChallenge={ropeChallenge}
            ropeCrossings={ropeCrossings}
            setRopeNodePosition={setRopeNodePosition}
            sequenceChallenge={sequenceChallenge}
            sequenceSymbols={SEQUENCE_SYMBOLS}
            handleSequenceClick={handleSequenceClick}
            waterChallenge={waterChallenge}
            handleWaterContainerClick={handleWaterContainerClick}
            torchChallenge={torchChallenge}
            torchStatus={torchStatus}
            rotateTorchCell={rotateTorchCell}
            castaways={castaways}
            castawayRaceProgress={castawayRaceProgress}
            castawayRaceWinner={castawayRaceWinner}
            castawayRaceTick={castawayRaceTick}
            giveUpImmunityChallenge={giveUpImmunityChallenge}
          />
        )}

        {phase === 'immunity_result' && immunityResult && (
          <ImmunityResultPhase immunityResult={immunityResult} immunityType={immunityType} setPhase={setPhase} />
        )}

        {phase === 'convo' && (
          <ConversationPhase
            castaways={castaways}
            selectedCastawayId={selectedCastawayId}
            setSelectedCastawayId={setSelectedCastawayId}
            chatMode={chatMode}
            setChatMode={setChatMode}
            campfireInvites={campfireInvites}
            toggleCampfireInvite={toggleCampfireInvite}
            playerName={playerName}
            playerOccupation={playerOccupation}
            selectedCastaway={selectedCastaway}
            invitedCastawayNames={invitedCastawayNames}
            chatScrollRef={chatScrollRef}
            selectedHistory={selectedHistory}
            campfireHistory={campfireHistory}
            conversationInput={conversationInput}
            setConversationInput={setConversationInput}
            chatInFlight={chatInFlight}
            sendConversation={sendConversation}
            sendCampfireConversation={sendCampfireConversation}
            canSendConversation={canSendConversation}
            badgeColor={badgeColor}
            openTribalPhase={openTribalPhase}
            playerHasImmunity={playerHasImmunity}
            immuneCastawayName={immuneCastawayName}
            searchCamp={searchCamp}
            canSearchCamp={!chatInFlight && phase === 'convo' && !campSearchOpen && !playerHasIdol && searchCount < MAX_CAMP_SEARCHES}
            idolRevealMoment={idolRevealMoment}
            dismissIdolReveal={() => setIdolRevealMoment('')}
            searchCount={searchCount}
            maxCampSearches={MAX_CAMP_SEARCHES}
            searchSuspicionScore={searchSuspicionScore}
            campSearchOpen={campSearchOpen}
            campSearchTurnsLeft={campSearchTurnsLeft}
            campSearchEnergy={campSearchEnergy}
            campSearchSuspicion={campSearchSuspicion}
            campSearchZoneId={campSearchZoneId}
            campSearchLog={campSearchLog}
            idolSearchProgress={idolSearchProgress}
            idolSearchClues={idolSearchClues}
            campZones={CAMP_ZONES.map((zone) => ({ id: zone.id, label: zone.label }))}
            canThoroughSearch={idolSearchProgress >= 45 || idolSearchClues >= 1 || playerFoundClueScroll || playerHeardIdolClue}
            selectCampSearchZone={selectCampSearchZone}
            runCampSearchAction={runCampSearchAction}
            closeCampSearch={() => finishCampSearch(false, 'You cut the search short and returned to camp.')}
            showPhaseTwoOnboarding={!phaseTwoOnboardingDismissed}
            dismissPhaseTwoOnboarding={() => setPhaseTwoOnboardingDismissed(true)}
          />
        )}

        {phase === 'tribal' && (
          <TribalPhase
            tribalScrollRef={tribalScrollRef}
            tribalHostLoading={tribalHostLoading}
            tribalPublicHistory={tribalPublicHistory}
            playerName={playerName}
            tribalVoteCalled={tribalVoteCalled}
            tribalStarted={tribalStarted}
            tribalChatInput={tribalChatInput}
            setTribalChatInput={setTribalChatInput}
            sendTribalMessage={sendTribalMessage}
            chatInFlight={chatInFlight}
            playerHasImmunity={playerHasImmunity}
            immuneCastawayName={immuneCastawayName}
            castaways={castaways}
            tribalSelection={tribalSelection}
            setTribalSelection={setTribalSelection}
            tribalVoteConfirming={tribalVoteConfirming}
            setTribalVoteConfirming={setTribalVoteConfirming}
            runTribalCouncil={runTribalCouncil}
            playerHasIdol={playerHasIdol}
            playerHasFakeIdol={playerHasFakeIdol}
            idolPlayTarget={idolPlayTarget}
            setIdolPlayTarget={setIdolPlayTarget}
            playPlayerIdol={playPlayerIdol}
            idolPlayedByPlayer={idolPlayedByPlayer}
            idolPlayedFakeByPlayer={idolPlayedFakeByPlayer}
            idolProtectedName={idolProtectedName}
            idolAnnouncement={idolAnnouncement}
            shownVotes={shownVotes}
            revealedVotesCount={revealedVotesCount}
            votes={votes}
            eliminatedName={eliminatedName}
          />
        )}

        {phase === 'reveal' && (
          <RevealPhase revealLoading={revealLoading} revealData={revealData} castaways={castaways} setPhase={setPhase} />
        )}

        {phase === 'final' && (
          <FinalPhase notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} submitNotify={submitNotify} notifyMessage={notifyMessage} notifySubmitting={notifySubmitting} />
        )}
      </div>
    </div>
  );
}
