import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from './components/layout/Header';
import MeetPhase from './components/phases/MeetPhase';
import ImmunityIntroPhase from './components/phases/ImmunityIntroPhase';
import ImmunityPepPhase from './components/phases/ImmunityPepPhase';
import ImmunityPuzzlePhase from './components/phases/ImmunityPuzzlePhase';
import ImmunityResultPhase from './components/phases/ImmunityResultPhase';
import ArrivalIntroPhase from './components/phases/ArrivalIntroPhase';
import ConversationPhase from './components/phases/ConversationPhase';
import TribalPhase from './components/phases/TribalPhase';
import RevealPhase from './components/phases/RevealPhase';
import BetweenRoundsPhase from './components/phases/BetweenRoundsPhase';
import GameSummaryPhase from './components/phases/GameSummaryPhase';
import FinalPhase from './components/phases/FinalPhase';
import CastawayNotesModal from './components/common/CastawayNotesModal';
import {
  CHALLENGE_META,
  SEQUENCE_SYMBOLS,
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
const CASTAWAY_COUNT = 8;
const TOTAL_ROUNDS = 2;
const JIGSAW_IMAGE_POOL = [
  'https://picsum.photos/seed/outwit-jigsaw-01/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-02/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-03/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-04/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-05/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-06/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-07/600/600',
  'https://picsum.photos/seed/outwit-jigsaw-08/600/600'
];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_WAITLIST_TABLE = import.meta.env.VITE_SUPABASE_WAITLIST_TABLE || 'waitlist_signups';
const CLAUDE_CLIENT_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const GAME_SAVE_KEY = 'outwit:game-save:v1';
const GAME_SAVE_VERSION = 1;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function pickRandomJigsawImage(excludeUrl = '') {
  const filtered = JIGSAW_IMAGE_POOL.filter((url) => url !== excludeUrl);
  const pool = filtered.length ? filtered : JIGSAW_IMAGE_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  const [jigsawImageUrl, setJigsawImageUrl] = useState(() => pickRandomJigsawImage());
  const [ropeChallenge, setRopeChallenge] = useState(createRopeUntangleChallenge());
  const [sequenceChallenge, setSequenceChallenge] = useState(createSequenceChallenge());
  const [waterChallenge, setWaterChallenge] = useState(createWaterPouringChallenge());
  const [torchChallenge, setTorchChallenge] = useState(createTorchLightingChallenge());

  const [castaways, setCastaways] = useState([]);
  const [castawayNotesById, setCastawayNotesById] = useState({});
  const [activeNotesCastawayId, setActiveNotesCastawayId] = useState(null);
  const [selectedCastawayId, setSelectedCastawayId] = useState(null);
  const [conversationHistories, setConversationHistories] = useState({});
  const [campfireHistory, setCampfireHistory] = useState([]);
  const [campArrivalIntroMessages, setCampArrivalIntroMessages] = useState([]);
  const [campArrivalLoading, setCampArrivalLoading] = useState(false);
  const [arrivalDistinctContacts, setArrivalDistinctContacts] = useState([]);
  const [arrivalNudgeThreshold, setArrivalNudgeThreshold] = useState(3);
  const [arrivalNudgeDone, setArrivalNudgeDone] = useState(false);
  const [debriefIntroMessages, setDebriefIntroMessages] = useState([]);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefDistinctContacts, setDebriefDistinctContacts] = useState([]);
  const [debriefNudgeThreshold, setDebriefNudgeThreshold] = useState(3);
  const [debriefNudgeDone, setDebriefNudgeDone] = useState(false);
  const [conversationInput, setConversationInput] = useState('');
  const [chatMode, setChatMode] = useState('oneOnOne');
  const [campfireInvites, setCampfireInvites] = useState([]);
  const [phaseTwoOnboardingDismissed, setPhaseTwoOnboardingDismissed] = useState(false);
  const [campfireRecentlyInvited, setCampfireRecentlyInvited] = useState([]);
  const [campfireRecentlyUninvited, setCampfireRecentlyUninvited] = useState([]);
  const [castawayApproachesById, setCastawayApproachesById] = useState({});
  const [approachCountByPhase, setApproachCountByPhase] = useState({});
  const [approachIgnoredByName, setApproachIgnoredByName] = useState({});
  const [campSocialActivityScore, setCampSocialActivityScore] = useState(0);
  const [approachDramaBoost, setApproachDramaBoost] = useState(0);
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
  const [idolGiveTarget, setIdolGiveTarget] = useState('');
  const [idolGivenPublicByPlayer, setIdolGivenPublicByPlayer] = useState(false);
  const [idolGivenPublicByCastaway, setIdolGivenPublicByCastaway] = useState('');
  const [pendingCastawayIdolOffer, setPendingCastawayIdolOffer] = useState(null);
  const [idolPlantPlan, setIdolPlantPlan] = useState(null);
  const [idolPlantRecipientName, setIdolPlantRecipientName] = useState('');
  const [idolTransferLog, setIdolTransferLog] = useState([]);
  const [fakeIdolPlanted, setFakeIdolPlanted] = useState(false);
  const [fakeIdolPlanterName, setFakeIdolPlanterName] = useState('');
  const [idolRevealMoment, setIdolRevealMoment] = useState('');

  const [generatingCastaways, setGeneratingCastaways] = useState(false);
  const [generatingCastawaysLabel, setGeneratingCastawaysLabel] = useState('The tribe is arriving...');
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
  const [revealContinueLoading, setRevealContinueLoading] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundChallengeTypes, setRoundChallengeTypes] = useState({});
  const [roundRecap, setRoundRecap] = useState([]);
  const [roundHistoryArchive, setRoundHistoryArchive] = useState([]);
  const [betweenRoundBriefLoading, setBetweenRoundBriefLoading] = useState(false);
  const [betweenRoundSummary, setBetweenRoundSummary] = useState('');
  const [betweenRoundLinks, setBetweenRoundLinks] = useState([]);
  const [finalGameSummary, setFinalGameSummary] = useState('');
  const [socialObservations, setSocialObservations] = useState([]);
  const [socialAmbientNotices, setSocialAmbientNotices] = useState([]);
  const [lastObservedOneOnOneKey, setLastObservedOneOnOneKey] = useState('');
  const [relationshipIntelByName, setRelationshipIntelByName] = useState({});

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
  const saveHydratedRef = useRef(false);

  const selectedCastaway = useMemo(() => castaways.find((c) => c.id === selectedCastawayId) || null, [castaways, selectedCastawayId]);
  const activeNotesCastaway = useMemo(() => castaways.find((c) => c.id === activeNotesCastawayId) || null, [castaways, activeNotesCastawayId]);
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

  function buildPersistedGameState() {
    return {
      phase,
      playerNameInput,
      playerOccupationInput,
      playerName,
      playerOccupation,
      playerHasImmunity,
      immunityType,
      immunityCountdown,
      immunityTimer,
      immunityResult,
      immunityGivenUp,
      immunityPepTalk,
      immuneCastawayName,
      castawayRaceProgress,
      castawayRaceWinner,
      castawayRaceTick,
      slidingBoard,
      memoryDeck,
      memoryFlipped,
      cipherData,
      cipherGuess,
      mazeGrid,
      mazePos,
      jigsawPieces,
      jigsawSelected,
      jigsawImageUrl,
      ropeChallenge,
      sequenceChallenge,
      waterChallenge,
      torchChallenge,
      castaways,
      castawayNotesById,
      selectedCastawayId,
      conversationHistories,
      campfireHistory,
      campArrivalIntroMessages,
      arrivalDistinctContacts,
      arrivalNudgeThreshold,
      arrivalNudgeDone,
      debriefIntroMessages,
      debriefDistinctContacts,
      debriefNudgeThreshold,
      debriefNudgeDone,
      conversationInput,
      chatMode,
      campfireInvites,
      phaseTwoOnboardingDismissed,
      campfireRecentlyInvited,
      campfireRecentlyUninvited,
      castawayApproachesById,
      approachCountByPhase,
      approachIgnoredByName,
      campSocialActivityScore,
      approachDramaBoost,
      playerSearchedCamp,
      playerSearchNoticedBy,
      searchCount,
      searchSuspicionScore,
      campSearchOpen,
      campSearchTurnsLeft,
      campSearchEnergy,
      campSearchSuspicion,
      campSearchZoneId,
      campSearchLog,
      idolSearchProgress,
      idolSearchClues,
      idolZoneId,
      clueZoneId,
      fakeIdolZoneId,
      playerFoundClueScroll,
      castawayClueFinderName,
      castawayIdolFinderName,
      castawayCurrentlySearching,
      idolLocation,
      idolClueHolderId,
      playerHeardIdolClue,
      playerHasIdol,
      playerHasFakeIdol,
      castawayHasIdolName,
      idolGiveTarget,
      idolGivenPublicByPlayer,
      idolGivenPublicByCastaway,
      pendingCastawayIdolOffer,
      idolPlantPlan,
      idolPlantRecipientName,
      idolTransferLog,
      fakeIdolPlanted,
      fakeIdolPlanterName,
      idolRevealMoment,
      tribalSelection,
      votes,
      revealedVotesCount,
      tribalStarted,
      eliminatedName,
      tribalHostOpening,
      tribalPublicHistory,
      tribalChatInput,
      tribalPlayerMessages,
      tribalVoteCalled,
      tribalHostLinesUsed,
      tribalVoteConfirming,
      tribalAwaitingPlayer,
      tribalCastawayExchangesSincePlayer,
      tribalPlayerCheckInThreshold,
      revealData,
      currentRound,
      roundChallengeTypes,
      roundRecap,
      roundHistoryArchive,
      betweenRoundSummary,
      betweenRoundLinks,
      finalGameSummary,
      socialObservations,
      socialAmbientNotices,
      lastObservedOneOnOneKey,
      relationshipIntelByName,
      notifyEmail,
      notifyMessage,
      idolPlayTarget,
      idolPlayedByPlayer,
      idolPlayedFakeByPlayer,
      idolPlayedByCastaway,
      idolProtectedName,
      idolAnnouncement,
      idolOutcome
    };
  }

  function restorePersistedGameState(data) {
    if (!data || typeof data !== 'object') return;
    const has = (key) => Object.prototype.hasOwnProperty.call(data, key);

    if (has('phase')) setPhase(data.phase);
    if (has('playerNameInput')) setPlayerNameInput(data.playerNameInput);
    if (has('playerOccupationInput')) setPlayerOccupationInput(data.playerOccupationInput);
    if (has('playerName')) setPlayerName(data.playerName);
    if (has('playerOccupation')) setPlayerOccupation(data.playerOccupation);
    if (has('playerHasImmunity')) setPlayerHasImmunity(Boolean(data.playerHasImmunity));
    if (has('immunityType')) setImmunityType(data.immunityType);
    if (has('immunityCountdown')) setImmunityCountdown(Number(data.immunityCountdown) || 0);
    if (has('immunityTimer')) setImmunityTimer(Number(data.immunityTimer) || 0);
    if (has('immunityResult')) setImmunityResult(data.immunityResult);
    if (has('immunityGivenUp')) setImmunityGivenUp(Boolean(data.immunityGivenUp));
    if (has('immunityPepTalk')) setImmunityPepTalk(data.immunityPepTalk);
    if (has('immuneCastawayName')) setImmuneCastawayName(data.immuneCastawayName);
    if (has('castawayRaceProgress')) setCastawayRaceProgress(data.castawayRaceProgress || {});
    if (has('castawayRaceWinner')) setCastawayRaceWinner(data.castawayRaceWinner || '');
    if (has('castawayRaceTick')) setCastawayRaceTick(Number(data.castawayRaceTick) || 0);

    if (has('slidingBoard')) setSlidingBoard(Array.isArray(data.slidingBoard) ? data.slidingBoard : createSlidingBoard());
    if (has('memoryDeck')) setMemoryDeck(Array.isArray(data.memoryDeck) ? data.memoryDeck : createMemoryDeck());
    if (has('memoryFlipped')) setMemoryFlipped(Array.isArray(data.memoryFlipped) ? data.memoryFlipped : []);
    if (has('cipherData')) setCipherData(data.cipherData || createCipherChallenge());
    if (has('cipherGuess')) setCipherGuess(data.cipherGuess || '');
    if (has('mazeGrid')) setMazeGrid(Array.isArray(data.mazeGrid) ? data.mazeGrid : createMaze(8));
    if (has('mazePos')) setMazePos(data.mazePos || { x: 0, y: 0 });
    if (has('jigsawPieces')) setJigsawPieces(Array.isArray(data.jigsawPieces) ? data.jigsawPieces : createJigsawPieces());
    if (has('jigsawSelected')) setJigsawSelected(data.jigsawSelected ?? null);
    if (has('jigsawImageUrl')) setJigsawImageUrl(data.jigsawImageUrl || pickRandomJigsawImage());
    if (has('ropeChallenge')) setRopeChallenge(data.ropeChallenge || createRopeUntangleChallenge());
    if (has('sequenceChallenge')) setSequenceChallenge(data.sequenceChallenge || createSequenceChallenge());
    if (has('waterChallenge')) setWaterChallenge(data.waterChallenge || createWaterPouringChallenge());
    if (has('torchChallenge')) setTorchChallenge(data.torchChallenge || createTorchLightingChallenge());

    if (has('castaways')) setCastaways(Array.isArray(data.castaways) ? data.castaways : []);
    if (has('castawayNotesById')) setCastawayNotesById(data.castawayNotesById || {});
    if (has('selectedCastawayId')) setSelectedCastawayId(data.selectedCastawayId ?? null);
    if (has('conversationHistories')) setConversationHistories(data.conversationHistories || {});
    if (has('campfireHistory')) setCampfireHistory(Array.isArray(data.campfireHistory) ? data.campfireHistory : []);
    if (has('campArrivalIntroMessages')) setCampArrivalIntroMessages(Array.isArray(data.campArrivalIntroMessages) ? data.campArrivalIntroMessages : []);
    if (has('arrivalDistinctContacts')) setArrivalDistinctContacts(Array.isArray(data.arrivalDistinctContacts) ? data.arrivalDistinctContacts : []);
    if (has('arrivalNudgeThreshold')) setArrivalNudgeThreshold(Number(data.arrivalNudgeThreshold) || 3);
    if (has('arrivalNudgeDone')) setArrivalNudgeDone(Boolean(data.arrivalNudgeDone));
    if (has('debriefIntroMessages')) setDebriefIntroMessages(Array.isArray(data.debriefIntroMessages) ? data.debriefIntroMessages : []);
    if (has('debriefDistinctContacts')) setDebriefDistinctContacts(Array.isArray(data.debriefDistinctContacts) ? data.debriefDistinctContacts : []);
    if (has('debriefNudgeThreshold')) setDebriefNudgeThreshold(Number(data.debriefNudgeThreshold) || 3);
    if (has('debriefNudgeDone')) setDebriefNudgeDone(Boolean(data.debriefNudgeDone));
    if (has('conversationInput')) setConversationInput(data.conversationInput || '');
    if (has('chatMode')) setChatMode(data.chatMode || 'oneOnOne');
    if (has('campfireInvites')) setCampfireInvites(Array.isArray(data.campfireInvites) ? data.campfireInvites : []);
    if (has('phaseTwoOnboardingDismissed')) setPhaseTwoOnboardingDismissed(Boolean(data.phaseTwoOnboardingDismissed));
    if (has('campfireRecentlyInvited')) setCampfireRecentlyInvited(Array.isArray(data.campfireRecentlyInvited) ? data.campfireRecentlyInvited : []);
    if (has('campfireRecentlyUninvited')) setCampfireRecentlyUninvited(Array.isArray(data.campfireRecentlyUninvited) ? data.campfireRecentlyUninvited : []);
    if (has('castawayApproachesById')) setCastawayApproachesById(data.castawayApproachesById || {});
    if (has('approachCountByPhase')) setApproachCountByPhase(data.approachCountByPhase || {});
    if (has('approachIgnoredByName')) setApproachIgnoredByName(data.approachIgnoredByName || {});
    if (has('campSocialActivityScore')) setCampSocialActivityScore(Number(data.campSocialActivityScore) || 0);
    if (has('approachDramaBoost')) setApproachDramaBoost(Number(data.approachDramaBoost) || 0);
    if (has('playerSearchedCamp')) setPlayerSearchedCamp(Boolean(data.playerSearchedCamp));
    if (has('playerSearchNoticedBy')) setPlayerSearchNoticedBy(Array.isArray(data.playerSearchNoticedBy) ? data.playerSearchNoticedBy : []);
    if (has('searchCount')) setSearchCount(Number(data.searchCount) || 0);
    if (has('searchSuspicionScore')) setSearchSuspicionScore(Number(data.searchSuspicionScore) || 0);
    if (has('campSearchOpen')) setCampSearchOpen(Boolean(data.campSearchOpen));
    if (has('campSearchTurnsLeft')) setCampSearchTurnsLeft(Number(data.campSearchTurnsLeft) || 0);
    if (has('campSearchEnergy')) setCampSearchEnergy(Number(data.campSearchEnergy) || 0);
    if (has('campSearchSuspicion')) setCampSearchSuspicion(Number(data.campSearchSuspicion) || 0);
    if (has('campSearchZoneId')) setCampSearchZoneId(data.campSearchZoneId || '');
    if (has('campSearchLog')) setCampSearchLog(Array.isArray(data.campSearchLog) ? data.campSearchLog : []);
    if (has('idolSearchProgress')) setIdolSearchProgress(Number(data.idolSearchProgress) || 0);
    if (has('idolSearchClues')) setIdolSearchClues(Number(data.idolSearchClues) || 0);
    if (has('idolZoneId')) setIdolZoneId(data.idolZoneId || 'firepit');
    if (has('clueZoneId')) setClueZoneId(data.clueZoneId || 'rocks');
    if (has('fakeIdolZoneId')) setFakeIdolZoneId(data.fakeIdolZoneId || 'shoreline');
    if (has('playerFoundClueScroll')) setPlayerFoundClueScroll(Boolean(data.playerFoundClueScroll));
    if (has('castawayClueFinderName')) setCastawayClueFinderName(data.castawayClueFinderName || '');
    if (has('castawayIdolFinderName')) setCastawayIdolFinderName(data.castawayIdolFinderName || '');
    if (has('castawayCurrentlySearching')) setCastawayCurrentlySearching(Array.isArray(data.castawayCurrentlySearching) ? data.castawayCurrentlySearching : []);

    if (has('idolLocation')) setIdolLocation(data.idolLocation || '');
    if (has('idolClueHolderId')) setIdolClueHolderId(data.idolClueHolderId || '');
    if (has('playerHeardIdolClue')) setPlayerHeardIdolClue(Boolean(data.playerHeardIdolClue));
    if (has('playerHasIdol')) setPlayerHasIdol(Boolean(data.playerHasIdol));
    if (has('playerHasFakeIdol')) setPlayerHasFakeIdol(Boolean(data.playerHasFakeIdol));
    if (has('castawayHasIdolName')) setCastawayHasIdolName(data.castawayHasIdolName || '');
    if (has('idolGiveTarget')) setIdolGiveTarget(data.idolGiveTarget || '');
    if (has('idolGivenPublicByPlayer')) setIdolGivenPublicByPlayer(Boolean(data.idolGivenPublicByPlayer));
    if (has('idolGivenPublicByCastaway')) setIdolGivenPublicByCastaway(data.idolGivenPublicByCastaway || '');
    if (has('pendingCastawayIdolOffer')) setPendingCastawayIdolOffer(data.pendingCastawayIdolOffer || null);
    if (has('idolPlantPlan')) setIdolPlantPlan(data.idolPlantPlan || null);
    if (has('idolPlantRecipientName')) setIdolPlantRecipientName(data.idolPlantRecipientName || '');
    if (has('idolTransferLog')) setIdolTransferLog(Array.isArray(data.idolTransferLog) ? data.idolTransferLog : []);
    if (has('fakeIdolPlanted')) setFakeIdolPlanted(Boolean(data.fakeIdolPlanted));
    if (has('fakeIdolPlanterName')) setFakeIdolPlanterName(data.fakeIdolPlanterName || '');
    if (has('idolRevealMoment')) setIdolRevealMoment(data.idolRevealMoment || '');

    if (has('tribalSelection')) setTribalSelection(data.tribalSelection || '');
    if (has('votes')) setVotes(Array.isArray(data.votes) ? data.votes : []);
    if (has('revealedVotesCount')) setRevealedVotesCount(Number(data.revealedVotesCount) || 0);
    if (has('tribalStarted')) setTribalStarted(Boolean(data.tribalStarted));
    if (has('eliminatedName')) setEliminatedName(data.eliminatedName || '');
    if (has('tribalHostOpening')) setTribalHostOpening(data.tribalHostOpening || '');
    if (has('tribalPublicHistory')) setTribalPublicHistory(Array.isArray(data.tribalPublicHistory) ? data.tribalPublicHistory : []);
    if (has('tribalChatInput')) setTribalChatInput(data.tribalChatInput || '');
    if (has('tribalPlayerMessages')) setTribalPlayerMessages(Number(data.tribalPlayerMessages) || 0);
    if (has('tribalVoteCalled')) setTribalVoteCalled(Boolean(data.tribalVoteCalled));
    if (has('tribalHostLinesUsed')) setTribalHostLinesUsed(Array.isArray(data.tribalHostLinesUsed) ? data.tribalHostLinesUsed : []);
    if (has('tribalVoteConfirming')) setTribalVoteConfirming(Boolean(data.tribalVoteConfirming));
    if (has('tribalAwaitingPlayer')) setTribalAwaitingPlayer(Boolean(data.tribalAwaitingPlayer));
    if (has('tribalCastawayExchangesSincePlayer')) setTribalCastawayExchangesSincePlayer(Number(data.tribalCastawayExchangesSincePlayer) || 0);
    if (has('tribalPlayerCheckInThreshold')) setTribalPlayerCheckInThreshold(Number(data.tribalPlayerCheckInThreshold) || 2);

    if (has('revealData')) setRevealData(data.revealData || null);
    if (has('currentRound')) setCurrentRound(Number(data.currentRound) || 1);
    if (has('roundChallengeTypes')) setRoundChallengeTypes(data.roundChallengeTypes || {});
    if (has('roundRecap')) setRoundRecap(Array.isArray(data.roundRecap) ? data.roundRecap : []);
    if (has('roundHistoryArchive')) setRoundHistoryArchive(Array.isArray(data.roundHistoryArchive) ? data.roundHistoryArchive : []);
    if (has('betweenRoundSummary')) setBetweenRoundSummary(data.betweenRoundSummary || '');
    if (has('betweenRoundLinks')) setBetweenRoundLinks(Array.isArray(data.betweenRoundLinks) ? data.betweenRoundLinks : []);
    if (has('finalGameSummary')) setFinalGameSummary(data.finalGameSummary || '');
    if (has('socialObservations')) setSocialObservations(Array.isArray(data.socialObservations) ? data.socialObservations : []);
    if (has('socialAmbientNotices')) setSocialAmbientNotices(Array.isArray(data.socialAmbientNotices) ? data.socialAmbientNotices : []);
    if (has('lastObservedOneOnOneKey')) setLastObservedOneOnOneKey(data.lastObservedOneOnOneKey || '');
    if (has('relationshipIntelByName')) setRelationshipIntelByName(data.relationshipIntelByName || {});

    if (has('notifyEmail')) setNotifyEmail(data.notifyEmail || '');
    if (has('notifyMessage')) setNotifyMessage(data.notifyMessage || '');

    if (has('idolPlayTarget')) setIdolPlayTarget(data.idolPlayTarget || '');
    if (has('idolPlayedByPlayer')) setIdolPlayedByPlayer(Boolean(data.idolPlayedByPlayer));
    if (has('idolPlayedFakeByPlayer')) setIdolPlayedFakeByPlayer(Boolean(data.idolPlayedFakeByPlayer));
    if (has('idolPlayedByCastaway')) setIdolPlayedByCastaway(data.idolPlayedByCastaway || '');
    if (has('idolProtectedName')) setIdolProtectedName(data.idolProtectedName || '');
    if (has('idolAnnouncement')) setIdolAnnouncement(data.idolAnnouncement || '');
    if (has('idolOutcome')) setIdolOutcome(data.idolOutcome || null);

    setImmunityPepLoading(false);
    setCampArrivalLoading(false);
    setDebriefLoading(false);
    setGeneratingCastaways(false);
    setChatInFlight(false);
    setTribalHostLoading(false);
    setRevealLoading(false);
    setRevealContinueLoading(false);
    setBetweenRoundBriefLoading(false);
    setNotifySubmitting(false);
    setError('');
  }

  useEffect(() => {
    return () => {
      Object.values(waitingIntervalsRef.current).forEach((id) => clearInterval(id));
      Object.values(typingIntervalsRef.current).forEach((id) => clearInterval(id));
      if (voteTimerRef.current) clearInterval(voteTimerRef.current);
      if (tribalAutoAdvanceTimerRef.current) clearTimeout(tribalAutoAdvanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GAME_SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number(parsed?.version) !== GAME_SAVE_VERSION || !parsed?.data || typeof parsed.data !== 'object') {
        localStorage.removeItem(GAME_SAVE_KEY);
        return;
      }
      restorePersistedGameState(parsed.data);
    } catch {
      localStorage.removeItem(GAME_SAVE_KEY);
    } finally {
      saveHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!saveHydratedRef.current) return undefined;
    const timer = setTimeout(() => {
      const snapshot = {
        version: GAME_SAVE_VERSION,
        savedAt: Date.now(),
        data: buildPersistedGameState()
      };
      try {
        localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore quota/storage errors; gameplay should continue.
      }
    }, 150);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMode, selectedCastawayId, activeHistory.length, activeHistory[activeHistory.length - 1]?.text]);

  useEffect(() => {
    const inCamp = phase === 'arrival' || phase === 'convo' || phase === 'debrief';
    if (!inCamp) {
      setCastawayApproachesById({});
      return;
    }
    const id = setInterval(() => {
      maybeQueueCastawayApproach('ambient');
    }, 12000);
    return () => clearInterval(id);
  }, [phase, castaways, chatInFlight, campSearchOpen, castawayApproachesById, approachCountByPhase, campSocialActivityScore, approachDramaBoost, selectedCastawayId, searchSuspicionScore, castawayCurrentlySearching]);

  useEffect(() => {
    if (approachDramaBoost <= 0) return undefined;
    const id = setTimeout(() => setApproachDramaBoost((prev) => Math.max(0, prev - 1)), 18000);
    return () => clearTimeout(id);
  }, [approachDramaBoost]);

  useEffect(() => {
    if (!activeNotesCastawayId) return;
    if (!castaways.some((c) => c.id === activeNotesCastawayId)) {
      setActiveNotesCastawayId(null);
    }
  }, [castaways, activeNotesCastawayId]);

  useEffect(() => {
    if (!pendingCastawayIdolOffer) return;
    if (pendingCastawayIdolOffer.castawayId !== selectedCastawayId || chatMode !== 'oneOnOne') {
      setPendingCastawayIdolOffer(null);
    }
  }, [pendingCastawayIdolOffer, selectedCastawayId, chatMode]);

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
      setSequenceChallenge((prev) => ({
        ...prev,
        phase: 'input',
        flashStep: 0,
        feedback: '',
        lastPressedKey: '',
        lastPressedCorrect: null
      }));
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
    if (sequenceChallenge.phase !== 'feedback_wrong' && sequenceChallenge.phase !== 'feedback_success') return;
    const id = setTimeout(() => {
      setSequenceChallenge((prev) => ({
        ...prev,
        currentLength: prev.pendingLength || prev.currentLength,
        inputIndex: 0,
        flashStep: 0,
        phase: 'show',
        selectedKeys: [],
        feedback: '',
        pendingLength: null,
        lastPressedKey: '',
        lastPressedCorrect: null
      }));
    }, sequenceChallenge.phase === 'feedback_wrong' ? 950 : 700);
    return () => clearTimeout(id);
  }, [phase, immunityType, sequenceChallenge.phase, sequenceChallenge.pendingLength]);

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

  useEffect(() => {
    if (phase !== 'convo' || castaways.length < 3) return;
    const id = setInterval(() => {
      if (Math.random() > 0.42) return;
      const pair = pickRandomMany(castaways, 2);
      if (pair.length < 2) return;
      const [a, b] = pair;
      const text = `${a.name} and ${b.name} were seen talking privately near the shelter.`;
      pushSocialObservation({
        type: 'ambient_pair',
        actors: [a.name, b.name],
        text
      });
      upsertRelationshipIntel(a.name, 'uncertain', `Spotted in a private talk with ${b.name}.`);
      upsertRelationshipIntel(b.name, 'uncertain', `Spotted in a private talk with ${a.name}.`);
    }, 14000);
    return () => clearInterval(id);
  }, [phase, castaways, currentRound]);

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

  function normalizeArchetype(text) {
    const cleaned = String(text || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';
    return cleaned.split(' ').slice(0, 2).join(' ');
  }

  function zoneById(zoneId) {
    return CAMP_ZONES.find((z) => z.id === zoneId) || CAMP_ZONES[0];
  }

  function pushSocialObservation(observation) {
    const item = {
      id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      round: currentRound,
      ...observation
    };
    setSocialObservations((prev) => [...prev, item]);
    setSocialAmbientNotices((prev) => [...prev.slice(-3), item]);
  }

  function buildPriorRoundsContext() {
    if (currentRound <= 1 || !roundHistoryArchive.length) return '';
    return `Prior round continuity:
${JSON.stringify(roundHistoryArchive, null, 2)}
Current social observations:
${JSON.stringify(socialObservations.filter((o) => o.round <= currentRound), null, 2)}`;
  }

  function buildSocialObservationContext() {
    const visible = socialObservations.filter((o) => o.round <= currentRound);
    if (!visible.length) return 'Social observations this game: none yet.';
    return `Social observations this game:
${visible.map((o) => `- Round ${o.round}: ${o.text}`).join('\n')}`;
  }

  function logIdolTransfer(event) {
    const entry = {
      id: `idol-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      round: currentRound,
      phase,
      timestamp: Date.now(),
      ...event
    };
    setIdolTransferLog((prev) => [...prev, entry]);
  }

  function buildIdolTransferContext() {
    if (!idolTransferLog.length) return 'Idol transfer log: none yet.';
    return `Idol transfer log:
${idolTransferLog
  .map((e) => {
    const from = e.from || 'unknown';
    const to = e.to || 'unknown';
    const visibility = e.visibility || 'private';
    const type = e.type || 'transfer';
    const summary = e.summary ? ` (${e.summary})` : '';
    return `- Round ${e.round} ${e.phase}: ${type} ${from} -> ${to} [${visibility}]${summary}`;
  })
  .join('\n')}`;
  }

  function buildPersistentConversationContext() {
    const oneOnOne = castaways.map((c) => ({
      name: c.name,
      history: (conversationHistories[c.id] || []).map((m) => ({
        role: m.role,
        speaker: m.speaker || (m.role === 'user' ? playerName : c.name),
        text: m.text
      }))
    }));
    const campfire = campfireHistory.map((m) => ({
      role: m.role,
      speaker: m.speaker || (m.role === 'user' ? playerName : 'Castaway'),
      text: m.text
    }));
    const tribal = tribalPublicHistory.map((m) => ({
      role: m.role,
      speaker: m.speaker || (m.role === 'player' ? playerName : ''),
      text: m.text
    }));
    const archive = roundHistoryArchive.map((r) => ({
      round: r.round,
      eliminatedName: r.eliminatedName,
      campfireHistory: r.campfireHistory || [],
      tribalHistory: r.tribalHistory || [],
      conversations: r.conversations || []
    }));
    return `Full persistent conversation memory across this entire game:
- Current round one-on-one histories:
${JSON.stringify(oneOnOne, null, 2)}

- Current round campfire history:
${JSON.stringify(campfire, null, 2)}

- Current round tribal history:
${JSON.stringify(tribal, null, 2)}

- Prior rounds archive (must remain active memory):
${JSON.stringify(archive, null, 2)}

- Idol transfer timeline:
${JSON.stringify(idolTransferLog, null, 2)}

Nothing above is forgotten.`;
  }

  function upsertRelationshipIntel(name, status, summary) {
    if (!name) return;
    setRelationshipIntelByName((prev) => {
      const existing = prev[name] || { status: 'unknown', summary: 'Relationship unknown.' };
      const rank = { unknown: 0, uncertain: 1, ally: 2, threat: 3 };
      const chosenStatus = rank[status] >= rank[existing.status] ? status : existing.status;
      const chosenSummary = String(summary || '').trim() || existing.summary || 'Relationship unknown.';
      return {
        ...prev,
        [name]: {
          status: chosenStatus,
          summary: chosenSummary
        }
      };
    });
  }

  function getCampPhaseKey() {
    return `${phase}-r${currentRound}`;
  }

  function buildApproachLine(castaway, reason = 'ambient') {
    const personality = String(castaway?.personality || '').toLowerCase();
    const ignored = Number(approachIgnoredByName[castaway.name] || 0);

    if (personality.includes('paranoid') || personality.includes('suspicious')) {
      return ignored > 0
        ? 'I tried to pull you earlier. Need your read now before this gets worse.'
        : 'Hey... got a second? I need to sanity-check something before people start talking.';
    }
    if (personality.includes('loyal') || personality.includes('warm') || personality.includes('dependable')) {
      return ignored > 0
        ? 'Still want that talk. I would rather clear the air than guess.'
        : 'Can we talk for a minute? I want us aligned before this drifts.';
    }
    if (personality.includes('strateg') || personality.includes('calculating') || personality.includes('mastermind')) {
      return ignored > 0
        ? 'Quick check-in. We left things hanging and that can cost us.'
        : 'You got a minute? Nothing dramatic, just want to compare notes quietly.';
    }
    if (reason === 'debrief') {
      return ignored > 0
        ? 'Last night changed the board. I still need a straight read from you.'
        : 'That vote shifted everything. Walk with me for a minute?';
    }
    return ignored > 0
      ? 'Still hoping to talk. I do not like where this is heading.'
      : 'Hey, you got a second? Away from everyone else?';
  }

  function maybeQueueCastawayApproach(trigger = 'ambient') {
    const inCamp = phase === 'arrival' || phase === 'convo' || phase === 'debrief';
    if (!inCamp || chatInFlight || campSearchOpen) return;
    if (Object.keys(castawayApproachesById).length > 0) return;
    if (!castaways.length) return;

    const phaseKey = getCampPhaseKey();
    const countThisPhase = Number(approachCountByPhase[phaseKey] || 0);
    const maxThisPhase = 1 + (phase === 'debrief' || campSocialActivityScore >= 3 || approachDramaBoost > 0 ? 1 : 0);
    if (countThisPhase >= maxThisPhase) return;

    const candidates = castaways.filter((c) => !castawayCurrentlySearching.includes(c.name));
    if (!candidates.length) return;

    let best = null;
    let bestScore = -Infinity;
    candidates.forEach((c) => {
      const p = String(c.personality || '').toLowerCase();
      const ignored = Number(approachIgnoredByName[c.name] || 0);
      let score = Math.random() * 0.75;
      if (phase === 'debrief') score += 1.5;
      if (trigger === 'campfire' || trigger === 'search' || trigger === 'debrief') score += 0.9;
      if (ignored > 0) score += 0.6;
      if (selectedCastawayId === c.id) score -= 0.3;
      if (searchSuspicionScore >= 45 && (p.includes('paranoid') || p.includes('suspicious'))) score += 0.8;
      if (p.includes('strateg') || p.includes('calculating') || p.includes('mastermind')) score += 0.35;
      if (p.includes('loyal') || p.includes('warm')) score += 0.15;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    });

    if (!best) return;
    const line = buildApproachLine(best, phase === 'debrief' ? 'debrief' : trigger);
    const approach = {
      id: `approach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      castawayId: best.id,
      castawayName: best.name,
      line,
      createdAt: Date.now()
    };
    setCastawayApproachesById({ [best.id]: approach });
    setApproachCountByPhase((prev) => ({ ...prev, [phaseKey]: countThisPhase + 1 }));
  }

  function acceptCastawayApproach(castawayId) {
    const approach = castawayApproachesById[castawayId];
    if (!approach) return;
    const castaway = castaways.find((c) => c.id === castawayId);
    if (!castaway) return;
    setCastawayApproachesById({});
    setSelectedCastawayId(castawayId);
    setChatMode('oneOnOne');
    setCampSocialActivityScore((prev) => prev + 1);
    setConversationHistories((prev) => {
      const list = prev[castawayId] || [];
      const nextMessage = {
        id: `approach-msg-${Date.now()}`,
        role: 'assistant',
        speaker: castaway.name,
        text: approach.line,
        typing: false,
        initiatedByCastaway: true
      };
      return { ...prev, [castawayId]: [...list, nextMessage] };
    });
    if (phase === 'arrival') {
      registerArrivalContact([castaway.name]);
    } else if (phase === 'debrief') {
      registerDebriefContact([castaway.name]);
    }
  }

  function dismissCastawayApproach(castawayId) {
    const approach = castawayApproachesById[castawayId];
    if (!approach) return;
    setCastawayApproachesById({});
    setApproachIgnoredByName((prev) => ({
      ...prev,
      [approach.castawayName]: Number(prev[approach.castawayName] || 0) + 1
    }));
    pushSocialObservation({
      type: 'castaway_approach_ignored',
      actors: [approach.castawayName, playerName],
      text: `${approach.castawayName} tried to pull you aside, but you brushed it off.`
    });
    upsertRelationshipIntel(approach.castawayName, 'uncertain', `${approach.castawayName} noticed you ignored a private check-in.`);
  }

  function chooseChallengeForRound(roundNumber) {
    if (roundNumber <= 1) return pickChallengeType();
    const used = new Set(Object.values(roundChallengeTypes).filter(Boolean));
    const options = CHALLENGE_META ? Object.keys(CHALLENGE_META).filter((key) => !used.has(key)) : [];
    const pool = options.length ? options : Object.keys(CHALLENGE_META);
    return pool[Math.floor(Math.random() * pool.length)];
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
${buildIdolTransferContext()}

Strategic rules:
- Never suggest voting for any immune target.
- Talking to an immune castaway is rational and valuable because their vote still counts.
- Immune players can still be swing votes and power brokers.
- If someone asks to target an immune person, correct and redirect immediately.
- If player absences happened because of camp searching, that suspicion can be referenced naturally.
${buildSocialObservationContext()}`;
  }

  function clearTribalAutoAdvanceTimer() {
    if (tribalAutoAdvanceTimerRef.current) {
      clearTimeout(tribalAutoAdvanceTimerRef.current);
      tribalAutoAdvanceTimerRef.current = null;
    }
  }

  function setCastawayNote(castawayId, note) {
    if (!castawayId) return;
    setCastawayNotesById((prev) => ({ ...prev, [castawayId]: note }));
  }

  function openCastawayNotes(castawayId) {
    if (!castawayId) return;
    setActiveNotesCastawayId(castawayId);
  }

  function closeCastawayNotes() {
    setActiveNotesCastawayId(null);
  }

  function resetGame() {
    const confirmed = window.confirm('Reset the game and clear all saved progress?');
    if (!confirmed) return;
    localStorage.removeItem(GAME_SAVE_KEY);
    window.location.reload();
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
    setJigsawImageUrl((prev) => pickRandomJigsawImage(prev));
    setRopeChallenge(createRopeUntangleChallenge());
    setSequenceChallenge(createSequenceChallenge());
    setWaterChallenge(createWaterPouringChallenge());
    setTorchChallenge(createTorchLightingChallenge());
    setPhase('immunity_pep');
  }

  function startImmunityFromArrival() {
    setCastawayApproachesById({});
    const nextType = roundChallengeTypes[currentRound] || chooseChallengeForRound(currentRound);
    setRoundChallengeTypes((prev) => ({ ...prev, [currentRound]: nextType }));
    setupImmunityChallenge(nextType, castaways);
  }

  function joinArrivalConversation() {
    setPhase('arrival');
  }

  async function loadCampArrivalOpening(castList = castaways, player = playerName, occupation = playerOccupation) {
    setCampArrivalLoading(true);
    try {
      const castawayContext = castList.map((c) => ({
        name: c.name,
        occupation: c.occupation,
        personality: c.personality,
        survivorArchetype: c.survivorArchetype || ''
      }));
      const system = `You are Jeff Probst introducing a Survivor-style camp arrival.

Return strict JSON only in this format:
{
  "jeffOpening": "",
  "reactions": [{ "name": "", "response": "" }]
}

Rules:
- jeffOpening must be 3-4 sentences max.
- Jeff sets atmosphere only: island, first meeting, only one winner.
- Jeff does not explain rules or strategy.
- reactions must include 2-3 castaways reacting naturally to first arrival energy.
- reactions should feel organic and personality-driven, not label-heavy.
- no markdown.`;
      const prompt = `Player: ${player}
Player occupation: ${occupation}
Castaways:
${JSON.stringify(castawayContext, null, 2)}

Write the arrival opening now.`;
      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1200,
        temperature: 0.95
      });
      const parsed = parseClaudeJson(raw);
      const jeffOpening =
        String(parsed?.jeffOpening || '').trim() ||
        'The tide is loud, the air is heavy, and this beach just became your entire world. You are meeting each other for the first time, and every first impression starts now. One of you will outlast everyone else. The game begins the moment you start talking.';
      const validNames = new Set(castList.map((c) => c.name));
      const reactions = Array.isArray(parsed?.reactions)
        ? parsed.reactions
            .map((r) => ({ name: String(r?.name || '').trim(), response: String(r?.response || '').trim() }))
            .filter((r) => r.name && r.response && validNames.has(r.name))
            .slice(0, 3)
        : [];
      const usedReactionNames = new Set(reactions.map((r) => r.name));
      const fillerPool = castList.filter((c) => !usedReactionNames.has(c.name));
      const fillerLines = [
        'This beach feels electric already.',
        'Everyone is smiling, but nobody is relaxed.',
        'First impressions matter out here. I am watching everything.',
        'You can feel the game start the second people lock eyes.'
      ];
      while (reactions.length < 2 && fillerPool.length) {
        const next = fillerPool.shift();
        reactions.push({
          name: next.name,
          response: fillerLines[reactions.length % fillerLines.length]
        });
      }
      const introMessages = [
        {
          id: `arrival-jeff-${Date.now()}`,
          role: 'assistant',
          speaker: 'Jeff',
          text: jeffOpening,
          typing: false
        },
        ...reactions.map((r, idx) => ({
          id: `arrival-cast-${Date.now()}-${idx}`,
          role: 'assistant',
          speaker: r.name,
          text: r.response,
          typing: false
        }))
      ];
      setCampArrivalIntroMessages(introMessages);
    } catch (err) {
      const fallback = [
        {
          id: `arrival-jeff-fallback-${Date.now()}`,
          role: 'assistant',
          speaker: 'Jeff',
          text: 'New beach, new tribe, first impressions. You are all strangers right now, but only one of you will win this game. The island is watching what you do first.',
          typing: false
        },
        {
          id: `arrival-cast-fallback-${Date.now()}-1`,
          role: 'assistant',
          speaker: castList[0]?.name || 'Castaway',
          text: 'Alright, deep breath. Let us see who is actually built for this.',
          typing: false
        },
        {
          id: `arrival-cast-fallback-${Date.now()}-2`,
          role: 'assistant',
          speaker: castList[1]?.name || castList[0]?.name || 'Castaway',
          text: 'No hiding now. First impressions start immediately.',
          typing: false
        }
      ];
      setCampArrivalIntroMessages(fallback);
      setError(err.message || 'Failed to load camp arrival opening.');
    } finally {
      setCampArrivalLoading(false);
    }
  }

  function maybeTriggerArrivalNudge(nextContacts) {
    if (phase !== 'arrival') return;
    if (arrivalNudgeDone) return;
    if (nextContacts.length < arrivalNudgeThreshold) return;
    const first = castaways.find((c) => !nextContacts.includes(c.name)) || castaways[0];
    const second = castaways.find((c) => c.name !== first?.name) || null;
    const nudgeMessages = [
      {
        id: `arrival-nudge-${Date.now()}-1`,
        role: 'assistant',
        speaker: first?.name || 'Castaway',
        text: 'Feels like we should start heading toward the first challenge soon.',
        typing: false
      }
    ];
    if (second) {
      nudgeMessages.push({
        id: `arrival-nudge-${Date.now()}-2`,
        role: 'assistant',
        speaker: second.name,
        text: 'Yeah, same. First impressions are one thing, but the game is about to get real.',
        typing: false
      });
    }
    setArrivalNudgeDone(true);
    setCampfireHistory((prev) => [...prev, ...nudgeMessages]);
  }

  function registerArrivalContact(names = []) {
    if (phase !== 'arrival') return;
    if (!names.length) return;
    setArrivalDistinctContacts((prev) => {
      const next = Array.from(new Set([...prev, ...names]));
      maybeTriggerArrivalNudge(next);
      return next;
    });
  }

  function maybeTriggerDebriefNudge(nextContacts) {
    if (phase !== 'debrief') return;
    if (debriefNudgeDone) return;
    if (nextContacts.length < debriefNudgeThreshold) return;
    const first = castaways.find((c) => !nextContacts.includes(c.name)) || castaways[0];
    const second = castaways.find((c) => c.name !== first?.name) || null;
    const nudgeMessages = [
      {
        id: `debrief-nudge-${Date.now()}-1`,
        role: 'assistant',
        speaker: first?.name || 'Castaway',
        text: 'Sky is starting to lighten. Challenge is not far off.',
        typing: false
      }
    ];
    if (second) {
      nudgeMessages.push({
        id: `debrief-nudge-${Date.now()}-2`,
        role: 'assistant',
        speaker: second.name,
        text: 'Whatever happened tonight, we carry it into the next challenge.',
        typing: false
      });
    }
    setDebriefNudgeDone(true);
    setCampfireHistory((prev) => [...prev, ...nudgeMessages]);
  }

  function registerDebriefContact(names = []) {
    if (phase !== 'debrief') return;
    if (!names.length) return;
    setDebriefDistinctContacts((prev) => {
      const next = Array.from(new Set([...prev, ...names]));
      maybeTriggerDebriefNudge(next);
      return next;
    });
  }

  async function loadPostTribalDebriefOpening(survivors = castaways) {
    setDebriefLoading(true);
    try {
      const survivorContext = survivors.map((c) => ({
        name: c.name,
        personality: c.personality,
        hiddenAgenda: c.hiddenAgenda
      }));
      const system = `Write immediate post-tribal camp aftermath in a Survivor-style game.

Return strict JSON only:
{
  "atmosphere": "",
  "reactions": [{ "name": "", "response": "" }]
}

Rules:
- atmosphere is 1-2 short dramatic sentences at night camp.
- reactions must include 1-2 castaways from the provided names.
- reactions should reflect emotional aftermath: relief, fear, recalculation, guilt, or performative calm.
- no markdown.`;
      const prompt = `Eliminated tonight: ${eliminatedName}
Player name: ${playerName}
Votes:
${JSON.stringify(votes, null, 2)}

Tribal transcript:
${JSON.stringify(tribalPublicHistory.map((m) => ({ role: m.role, speaker: m.speaker, text: m.text })), null, 2)}

Survivors:
${JSON.stringify(survivorContext, null, 2)}
${buildPersistentConversationContext()}

Write the debrief opening now.`;
      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 900,
        temperature: 0.9
      });
      const parsed = parseClaudeJson(raw);
      const validNames = new Set(survivors.map((c) => c.name));
      const reactions = Array.isArray(parsed?.reactions)
        ? parsed.reactions
            .map((r) => ({ name: String(r?.name || '').trim(), response: String(r?.response || '').trim() }))
            .filter((r) => r.name && r.response && validNames.has(r.name))
            .slice(0, 2)
        : [];
      if (reactions.length === 0 && survivors[0]?.name) {
        reactions.push({
          name: survivors[0].name,
          response: 'Nobody is sleeping easy tonight. That vote changed everything.'
        });
      }
      const atmosphere = String(parsed?.atmosphere || '').trim() || 'The fire burns low. One torch is gone, and nobody is pretending tonight meant nothing.';
      const lines = [
        {
          id: `debrief-atmo-${Date.now()}`,
          role: 'assistant',
          speaker: 'Camp',
          text: atmosphere,
          typing: false
        },
        ...reactions.map((r, idx) => ({
          id: `debrief-react-${Date.now()}-${idx}`,
          role: 'assistant',
          speaker: r.name,
          text: r.response,
          typing: false
        }))
      ];
      setDebriefIntroMessages(lines);
      setCampfireHistory((prev) => [...prev, ...lines]);
      setApproachDramaBoost((prev) => prev + 2);
    } catch (err) {
      const fallback = [
        {
          id: `debrief-fallback-atmo-${Date.now()}`,
          role: 'assistant',
          speaker: 'Camp',
          text: 'The fire pops in the dark while everyone quietly counts who is left.',
          typing: false
        },
        {
          id: `debrief-fallback-react-${Date.now()}`,
          role: 'assistant',
          speaker: survivors[0]?.name || 'Castaway',
          text: 'Tonight drew a line. Nobody gets to pretend it did not.',
          typing: false
        }
      ];
      setDebriefIntroMessages(fallback);
      setCampfireHistory((prev) => [...prev, ...fallback]);
      setApproachDramaBoost((prev) => prev + 2);
      setError(err.message || 'Failed to load post-tribal debrief opening.');
    } finally {
      setDebriefLoading(false);
    }
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

  function refreshJigsawImage() {
    setJigsawImageUrl((prev) => pickRandomJigsawImage(prev));
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
          phase: 'feedback_wrong',
          pendingLength: nextLength,
          feedback: 'wrong',
          lastPressedKey: symbolKey,
          lastPressedCorrect: false
        };
      }

      const nextSelected = [...prev.selectedKeys, symbolKey];
      const nextIndex = prev.inputIndex + 1;
      if (nextIndex >= prev.currentLength) {
        if (prev.currentLength >= 7) {
          return {
            ...prev,
            selectedKeys: nextSelected,
            inputIndex: nextIndex,
            feedback: 'success',
            phase: 'done',
            lastPressedKey: symbolKey,
            lastPressedCorrect: true,
            pendingLength: null
          };
        }
        return {
          ...prev,
          selectedKeys: nextSelected,
          inputIndex: nextIndex,
          phase: 'feedback_success',
          pendingLength: prev.currentLength + 1,
          feedback: 'round_clear',
          lastPressedKey: symbolKey,
          lastPressedCorrect: true
        };
      }

      return {
        ...prev,
        inputIndex: nextIndex,
        selectedKeys: nextSelected,
        feedback: 'correct',
        lastPressedKey: symbolKey,
        lastPressedCorrect: true
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
    localStorage.removeItem(GAME_SAVE_KEY);
    setGeneratingCastawaysLabel('Your tribe is hitting the beach...');

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
        const prompt = `Create exactly ${CASTAWAY_COUNT} AI castaways for a Survivor-style social deduction game.
Player name: ${cleanedName}
Player occupation: ${cleanedOccupation}

Return ONLY a JSON array with this exact shape:
[
  {
    "name": "",
    "age": 0,
    "occupation": "",
    "personality": "",
    "survivorArchetype": "",
    "personalReason": "",
    "vulnerability": "",
    "presentation": "",
    "reality": "",
    "hiddenAgenda": "",
    "secretAlliances": []
  }
]

Rules:
- Each castaway must feel like a fully realized person, not a trope label.
- Do not use the player's name "${cleanedName}" for any castaway.
- All ${CASTAWAY_COUNT} castaway names must be unique.
- All survivorArchetype values must be distinct across the full cast of ${CASTAWAY_COUNT}.
- personality is the surface vibe this person presents publicly (2-5 words).
- personalReason must be specific and emotionally grounded; never generic.
- vulnerability must be human and specific, not "fear of being voted out."
- presentation and reality must form a meaningful contradiction.
- hiddenAgenda should be strategic and specific.
- secretAlliances should list castaway names from the same generated group.
- Cast balance across the 8 must include:
  - at least one immediately rootable warm person
  - at least one immediately distrusted person with hidden complexity
  - at least one overlooked but highly dangerous person
  - at least one messy but sympathetic vulnerable person
  - at least one castaway whose presentation-vs-reality reveal radically changes interpretation
- Tone: grounded modern Survivor mixed with a few larger personalities, never cartoonish.
- Output valid JSON only.`;

        const raw = await callClaude({
          apiKey: CLAUDE_CLIENT_API_KEY,
          system,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2000,
          temperature: 0.95
        });

        const parsed = parseClaudeJson(raw);
        if (!Array.isArray(parsed) || parsed.length !== CASTAWAY_COUNT) {
          continue;
        }

        const candidate = parsed.map((c, idx) => ({
          id: `castaway-${Date.now()}-${idx}`,
          name: String(c?.name || `Castaway ${idx + 1}`).trim(),
          age: Number.isFinite(Number(c?.age)) ? Number(c.age) : 30,
          occupation: String(c?.occupation || 'Unknown').trim(),
          personality: String(c?.personality || 'Unreadable').trim(),
          survivorArchetype: String(c?.survivorArchetype || '').trim(),
          personalReason: String(c?.personalReason || '').trim(),
          vulnerability: String(c?.vulnerability || '').trim(),
          presentation: String(c?.presentation || '').trim(),
          reality: String(c?.reality || '').trim(),
          hiddenAgenda: String(c?.hiddenAgenda || 'Stay under the radar.').trim(),
          secretAlliances: Array.isArray(c?.secretAlliances) ? c.secretAlliances.map((a) => String(a).trim()).filter(Boolean) : []
        }));

        const lowerPlayer = cleanedName.toLowerCase();
        const lowerNames = candidate.map((c) => c.name.toLowerCase());
        const archetypes = candidate.map((c) => normalizeArchetype(c.survivorArchetype || c.personality));
        const hasPlayerName = lowerNames.includes(lowerPlayer);
        const uniqueCount = new Set(lowerNames).size;
        const uniqueArchetypeCount = new Set(archetypes).size;
        const completeLayers = candidate.every(
          (c) => c.survivorArchetype && c.personalReason && c.vulnerability && c.presentation && c.reality
        );
        if (hasPlayerName || uniqueCount !== CASTAWAY_COUNT || uniqueArchetypeCount !== CASTAWAY_COUNT || !completeLayers) {
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
      const notes = normalized.reduce((acc, c) => {
        acc[c.id] = '';
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
      setIdolGiveTarget('');
      setIdolGivenPublicByPlayer(false);
      setIdolGivenPublicByCastaway('');
      setPendingCastawayIdolOffer(null);
      setIdolPlantPlan(null);
      setIdolPlantRecipientName('');
      setIdolTransferLog([]);
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
      setCastawayNotesById(notes);
      setCampfireHistory([]);
      setCampArrivalIntroMessages([]);
      setCampArrivalLoading(false);
      setArrivalDistinctContacts([]);
      setArrivalNudgeThreshold(Math.random() < 0.5 ? 3 : 4);
      setArrivalNudgeDone(false);
      setDebriefIntroMessages([]);
      setDebriefLoading(false);
      setDebriefDistinctContacts([]);
      setDebriefNudgeThreshold(Math.random() < 0.5 ? 3 : 4);
      setDebriefNudgeDone(false);
      setCampfireInvites([]);
      setCampfireRecentlyInvited([]);
      setCampfireRecentlyUninvited([]);
      setCastawayApproachesById({});
      setApproachCountByPhase({});
      setApproachIgnoredByName({});
      setCampSocialActivityScore(0);
      setApproachDramaBoost(0);
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
      setCurrentRound(1);
      setRoundRecap([]);
      setRoundHistoryArchive([]);
      setBetweenRoundBriefLoading(false);
      setBetweenRoundSummary('');
      setBetweenRoundLinks([]);
      setFinalGameSummary('');
      setSocialObservations([]);
      setSocialAmbientNotices([]);
      setLastObservedOneOnOneKey('');
      setRelationshipIntelByName(
        normalized.reduce((acc, c) => {
          acc[c.name] = { status: 'unknown', summary: 'Relationship unknown.' };
          return acc;
        }, {})
      );
      const round1Challenge = chooseChallengeForRound(1);
      setRoundChallengeTypes({ 1: round1Challenge });
      setPhase('arrival_intro');
      setChatMode('oneOnOne');
      setGeneratingCastawaysLabel('Eyes are locking in around camp...');
      loadCampArrivalOpening(normalized, cleanedName, cleanedOccupation);
    } catch (err) {
      setError(err.message || 'Unable to generate castaways.');
    } finally {
      setGeneratingCastaways(false);
      setGeneratingCastawaysLabel('Your tribe is hitting the beach...');
    }
  }

  async function sendConversation() {
    if (!selectedCastaway || chatInFlight) return;
    if (!conversationInput.trim()) return;

    setError('');
    setChatInFlight(true);

    const castawayId = selectedCastaway.id;
    const userText = conversationInput.trim();
    const inArrival = phase === 'arrival';
    const inDebrief = phase === 'debrief';
    setConversationInput('');
    const userAskedIdol = /\bidol|clue|search|well|palm|fire pit|rocks|camp\b/i.test(userText);
    const oneOnOneKey = `r${currentRound}:${castawayId}`;
    if (oneOnOneKey !== lastObservedOneOnOneKey) {
      setLastObservedOneOnOneKey(oneOnOneKey);
      const observers = pickRandomMany(
        castaways.filter((c) => c.id !== castawayId),
        1 + Math.floor(Math.random() * 2)
      );
      if (observers.length) {
        const observerNames = observers.map((o) => o.name);
        const note = `${observerNames.join(' and ')} noticed you pulled ${selectedCastaway.name} aside for a private chat.`;
        pushSocialObservation({
          type: 'player_one_on_one',
          actors: [playerName, selectedCastaway.name],
          observers: observerNames,
          text: note
        });
        upsertRelationshipIntel(selectedCastaway.name, 'uncertain', `You were seen meeting privately with ${selectedCastaway.name}.`);
      }
    }

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
- Surface personality (what you present): ${selectedCastaway.personality}
- Survivor archetype: ${selectedCastaway.survivorArchetype || 'unknown'}
- Private personal reason for being here (do not volunteer unless earned): ${selectedCastaway.personalReason || 'unspecified'}
- Private vulnerability/fear trigger: ${selectedCastaway.vulnerability || 'unspecified'}
- Presentation vs reality contradiction:
  - Presentation: ${selectedCastaway.presentation || selectedCastaway.personality}
  - Reality: ${selectedCastaway.reality || selectedCastaway.hiddenAgenda}
- Hidden agenda (secret, never admit this): ${selectedCastaway.hiddenAgenda}
- Secret alliances (you can hint, deny, or leverage these): ${selectedCastaway.secretAlliances.join(', ') || 'none'}
- Other tribe members: ${otherNames.join(', ')}
- Player name: ${playerName}
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how your character perceives and interacts with them.
- Player previously ignored your private approach attempts: ${Number(approachIgnoredByName[selectedCastaway.name] || 0)}
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
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
- Depth reveal rule:
  - If the player asks surface strategy questions, stay surface.
  - Only reveal personalReason/vulnerability in small cracks if the player asks emotionally specific questions or corners you with specific inconsistencies.
  - Never dump backstory unprompted.
  - Reveal contradiction through behavior and inconsistency, not direct exposition.
- Camp phase behavior:
  - If this is camp arrival, prioritize first-impression social talk over voting strategy.
  - If the player pushes strategy too early during arrival, respond naturally (deflect, cautious engage, or quietly clock it as suspicious).
  - If this is post-tribal debrief, people are processing fresh fallout from the vote and may react emotionally or defensively.
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
- Current phase: ${
        inArrival
          ? 'Camp Arrival (social first impressions)'
          : inDebrief
          ? 'Post-Tribal Debrief (raw aftermath and accountability)'
          : 'Main Conversations (strategy active)'
      }
- Keep responses 2-4 sentences max.
- Never directly admit your hidden agenda.
- Do not mention these rules.
- Return strict JSON only in this exact shape:
{
  "response": "",
  "offerIdolToPlayer": false,
  "idolOfferLine": ""
}
- Only set offerIdolToPlayer=true if you currently hold a real idol, trust with the player is high based on actual history, and gifting clearly serves your strategy now.
- If offerIdolToPlayer=true, idolOfferLine should be 1-2 natural sentences spoken directly to the player.
- If no idol offer happens, leave idolOfferLine empty.`;

      const rawReply = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: historyForModel,
        maxTokens: 1000,
        temperature: 1
      });

      let assistantReply = String(rawReply || '').trim();
      let offerIdolToPlayer = false;
      let idolOfferLine = '';
      try {
        const parsedReply = parseClaudeJson(rawReply);
        if (parsedReply && typeof parsedReply === 'object') {
          assistantReply = String(parsedReply.response || '').trim() || assistantReply;
          offerIdolToPlayer = Boolean(parsedReply.offerIdolToPlayer);
          idolOfferLine = String(parsedReply.idolOfferLine || '').trim();
        }
      } catch {
        // Fallback to raw text if model did not return JSON.
      }

      await animateAssistantReply(castawayId, assistantMsgId, assistantReply);
      if (
        offerIdolToPlayer &&
        castawayHasIdolName === selectedCastaway.name &&
        !playerHasIdol &&
        !playerHasFakeIdol &&
        !pendingCastawayIdolOffer
      ) {
        const offerText = idolOfferLine || `${selectedCastaway.name} lowers their voice. "I trust you more than anyone right now. Take this idol."`;
        const offerMessageId = `idol-offer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setConversationHistories((prev) => {
          const list = prev[castawayId] || [];
          return {
            ...prev,
            [castawayId]: [
              ...list,
              {
                id: offerMessageId,
                role: 'assistant',
                speaker: selectedCastaway.name,
                text: offerText,
                typing: false
              }
            ]
          };
        });
        setPendingCastawayIdolOffer({
          castawayId,
          castawayName: selectedCastaway.name,
          line: offerText
        });
        logIdolTransfer({
          type: 'castaway_offer_to_player',
          from: selectedCastaway.name,
          to: playerName,
          visibility: 'private',
          accepted: null,
          summary: `${selectedCastaway.name} privately offered their idol to ${playerName}.`
        });
      }
      setCampSocialActivityScore((prev) => prev + 1);
      if (inArrival) {
        registerArrivalContact([selectedCastaway.name]);
      } else if (inDebrief) {
        registerDebriefContact([selectedCastaway.name]);
      }
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

  async function offerIdolToCastawayPrivately() {
    if (chatInFlight || !selectedCastaway || chatMode !== 'oneOnOne') return;
    if (phase !== 'convo') return;
    if (!playerHasIdol || castawayHasIdolName) return;
    setError('');
    setChatInFlight(true);
    const castawayId = selectedCastaway.id;
    const castawayName = selectedCastaway.name;
    const offerText = `I want you to have my idol tonight. I am handing it to you.`;
    const userMsg = {
      id: `idol-offer-user-${Date.now()}`,
      role: 'user',
      text: offerText,
      typing: false
    };
    const assistantMsgId = `idol-offer-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placeholderAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      speaker: castawayName,
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
      const historyForModel = nextHistory
        .filter((m) => m.id !== assistantMsgId)
        .map((m) => ({ role: m.role, content: m.text }));
      const system = `You are ${castawayName}. The player has privately offered you their hidden immunity idol.

Decide in character whether to accept. Your choice must be grounded in your personality, your hidden agenda, and your relationship history with the player.

Return strict JSON only:
{
  "response": "",
  "accepts": true,
  "leaksOffer": false,
  "leakSummary": ""
}

Rules:
- response is 1-3 natural sentences to the player.
- accepts can be true or false.
- leaksOffer only applies when accepts=false.
- If leaksOffer=true, leakSummary is one sentence about how the offer gets out.
- If leaksOffer=false, leakSummary should be empty.
- No markdown.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}`;

      const rawReply = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: historyForModel,
        maxTokens: 900,
        temperature: 0.95
      });
      const parsed = parseClaudeJson(rawReply) || {};
      const response = String(parsed.response || '').trim() || `${castawayName} studies you carefully and does not answer right away.`;
      const accepts = Boolean(parsed.accepts);
      const leaksOffer = accepts ? false : Boolean(parsed.leaksOffer);
      const leakSummary = leaksOffer ? String(parsed.leakSummary || '').trim() : '';

      await animateAssistantReply(castawayId, assistantMsgId, response);

      if (accepts) {
        setPlayerHasIdol(false);
        setCastawayHasIdolName(castawayName);
        setIdolRevealMoment(`${castawayName} accepted your private idol offer. You are now vulnerable.`);
        logIdolTransfer({
          type: 'private_gift_player_to_castaway',
          from: playerName,
          to: castawayName,
          visibility: 'private',
          accepted: true,
          summary: `${playerName} privately gave a real idol to ${castawayName}.`
        });
        upsertRelationshipIntel(castawayName, 'ally', `${castawayName} accepted your private idol handoff.`);
      } else {
        setIdolRevealMoment(`${castawayName} declined your idol offer.`);
        logIdolTransfer({
          type: 'private_gift_player_to_castaway',
          from: playerName,
          to: castawayName,
          visibility: 'private',
          accepted: false,
          summary: `${castawayName} declined a private idol offer from ${playerName}.`
        });
        if (leaksOffer) {
          const rumor = leakSummary || `${castawayName} quietly let others know you tried to hand them an idol.`;
          pushSocialObservation({
            type: 'idol_offer_leaked',
            actors: [castawayName, playerName],
            text: rumor
          });
          setIdolRevealMoment(rumor);
          logIdolTransfer({
            type: 'private_offer_leaked',
            from: castawayName,
            to: 'camp',
            visibility: 'public',
            accepted: false,
            summary: rumor
          });
          upsertRelationshipIntel(castawayName, 'threat', `${castawayName} leaked your idol offer.`);
        }
      }
    } catch (err) {
      setHistoryMessage(castawayId, assistantMsgId, `I need a second... (${err.message || 'request failed'})`, true);
      setError(err.message || 'Idol offer failed.');
    } finally {
      setChatInFlight(false);
    }
  }

  function acceptCastawayIdolOffer() {
    const pending = pendingCastawayIdolOffer;
    if (!pending) return;
    if (castawayHasIdolName !== pending.castawayName) {
      setPendingCastawayIdolOffer(null);
      return;
    }
    setPlayerHasIdol(true);
    setCastawayHasIdolName('');
    setPendingCastawayIdolOffer(null);
    setIdolRevealMoment(`${pending.castawayName} quietly passed you their idol. You now hold the idol.`);
    logIdolTransfer({
      type: 'private_gift_castaway_to_player',
      from: pending.castawayName,
      to: playerName,
      visibility: 'private',
      accepted: true,
      summary: `${pending.castawayName} privately gave their idol to ${playerName}.`
    });
    setConversationHistories((prev) => {
      const list = prev[pending.castawayId] || [];
      return {
        ...prev,
        [pending.castawayId]: [
          ...list,
          {
            id: `idol-offer-accept-${Date.now()}`,
            role: 'user',
            text: 'I accept. Thank you.',
            typing: false
          }
        ]
      };
    });
  }

  function declineCastawayIdolOffer() {
    const pending = pendingCastawayIdolOffer;
    if (!pending) return;
    setPendingCastawayIdolOffer(null);
    logIdolTransfer({
      type: 'private_gift_castaway_to_player',
      from: pending.castawayName,
      to: playerName,
      visibility: 'private',
      accepted: false,
      summary: `${playerName} declined a private idol offer from ${pending.castawayName}.`
    });
    setConversationHistories((prev) => {
      const list = prev[pending.castawayId] || [];
      return {
        ...prev,
        [pending.castawayId]: [
          ...list,
          {
            id: `idol-offer-decline-${Date.now()}`,
            role: 'user',
            text: 'I cannot take it. Keep it.',
            typing: false
          }
        ]
      };
    });
  }

  async function sendCampfireConversation() {
    if (chatInFlight) return;
    if (!conversationInput.trim()) return;

    setError('');
    setChatInFlight(true);

    const userText = conversationInput.trim();
    const inArrival = phase === 'arrival';
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
      const excludedNames = castaways.filter((c) => !campfireInvites.includes(c.id)).map((c) => c.name);
      if (invitedNames.length > 0 && excludedNames.length > 0) {
        const limitedExcluded = excludedNames.slice(0, 3);
        pushSocialObservation({
          type: 'campfire_exclusion',
          actors: invitedNames,
          excluded: limitedExcluded,
          text: `${limitedExcluded.join(', ')} noticed they were excluded while you gathered ${invitedNames.join(', ')} at the campfire.`
        });
        limitedExcluded.forEach((name) => {
          upsertRelationshipIntel(name, 'uncertain', `Was excluded from your campfire with ${invitedNames.join(', ')}.`);
        });
      }
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
        survivorArchetype: c.survivorArchetype || '',
        personalReason: c.personalReason || '',
        vulnerability: c.vulnerability || '',
        presentation: c.presentation || '',
        reality: c.reality || '',
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0),
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
- Characters are layered people:
  - keep backstory private unless the player creates emotional space or pressure
  - surface answers for surface questions
  - vulnerability appears in brief cracks under pressure, accusation, or betrayal moments
  - contradiction (presentation vs reality) should appear through inconsistency, not direct confession
- Camp phase behavior:
  - If this is camp arrival, keep the tone social and first-impression focused.
  - Strategy should feel premature during arrival; if pushed too early, castaways can deflect, laugh it off, cautiously engage, or flag it as suspicious.
  - If this is post-tribal debrief, tone is raw and immediate; castaways should reference tribal fallout and recalculate alliances.
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how castaways perceive and interact with them.
- Every observation must be grounded in specific moments from this game history (campfire and 1-on-1), not generic suspicion lines.
- Do not repeat the same phrase, accusation pattern, or behavioral read once it has already been used; advance the conversation.
- Let each castaway notice different things based on personality (strategic inconsistency reads, emotional reads, or interaction-pattern reads).
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
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

- Current phase: ${
        inArrival
          ? 'Camp Arrival (social first impressions)'
          : inDebrief
          ? 'Post-Tribal Debrief (raw aftermath and accountability)'
          : 'Main Conversations (strategy active)'
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
      if (inArrival) {
        registerArrivalContact(normalized.map((r) => r.name));
      } else if (inDebrief) {
        registerDebriefContact(normalized.map((r) => r.name));
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
      setCampSocialActivityScore((prev) => prev + 1);
      if (!inArrival) setApproachDramaBoost((prev) => prev + 1);
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
    if (active.length) {
      const obscured = active.length > 1 ? 'A couple of castaways' : 'A castaway';
      pushSocialObservation({
        type: 'castaway_idol_search_absence',
        actors: active,
        text: `${obscured} disappeared from camp for a while.`
      });
    }
    setCastawayCurrentlySearching(active);
    if (idolPlantPlan?.recipientName && active.includes(idolPlantPlan.recipientName) && !castawayHasIdolName) {
      const recipientName = idolPlantPlan.recipientName;
      setCastawayHasIdolName(recipientName);
      setIdolPlantPlan(null);
      if (idolPlantPlan.plantedByType === 'player') {
        logIdolTransfer({
          type: 'planted_idol_found',
          from: 'camp',
          to: recipientName,
          visibility: 'hidden',
          accepted: true,
          summary: `${recipientName} found an idol that was planted for them and believes it was self-found.`
        });
      } else {
        logIdolTransfer({
          type: 'castaway_planted_idol_found',
          from: 'camp',
          to: recipientName,
          visibility: 'hidden',
          accepted: true,
          summary: `${recipientName} found an idol that another castaway planted for them.`
        });
      }
    }
    if (!idolPlantPlan && castawayHasIdolName && Math.random() < 0.1) {
      const holder = castaways.find((c) => c.name === castawayHasIdolName);
      const allies = castaways
        .filter((c) => c.name !== castawayHasIdolName && (holder?.secretAlliances || []).includes(c.name))
        .map((c) => c.name);
      const recipientName = allies[Math.floor(Math.random() * allies.length)];
      if (recipientName) {
        const zone = CAMP_ZONES[Math.floor(Math.random() * CAMP_ZONES.length)];
        setCastawayHasIdolName('');
        setIdolPlantPlan({
          zoneId: zone.id,
          recipientName,
          plantedByName: castawayHasIdolName,
          plantedByType: 'castaway',
          round: currentRound
        });
        logIdolTransfer({
          type: 'castaway_planted_idol',
          from: castawayHasIdolName,
          to: recipientName,
          visibility: 'hidden',
          accepted: true,
          summary: `${castawayHasIdolName} secretly planted an idol for ${recipientName}.`
        });
      }
    }
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
      setApproachDramaBoost((prev) => prev + 2);
      maybeQueueCastawayApproach('search');
    } else if (!foundSomething) {
      setIdolRevealMoment('You searched hard but came back empty-handed. People may notice you were gone.');
      setApproachDramaBoost((prev) => prev + 1);
    }
  }

  function searchCamp() {
    if (phase !== 'convo') return;
    if (campSearchOpen) return;
    if (playerHasIdol) {
      setCampSearchTurnsLeft(0);
      setCampSearchEnergy(0);
      setCampSearchSuspicion(0);
      setCampSearchZoneId('');
      setCampSearchLog(['Choose a zone and a castaway. Leave your idol quietly and walk away before anyone clocks it.']);
      setCampSearchOpen(true);
      setIdolPlantRecipientName(castaways[0]?.name || '');
      return;
    }
    const nextSearchCount = searchCount + 1;
    const watchers = pickRandomMany(castaways, 1 + Math.floor(Math.random() * 2)).map((c) => c.name);
    setSearchCount(nextSearchCount);
    setPlayerSearchedCamp(true);
    setPlayerSearchNoticedBy((prev) => Array.from(new Set([...prev, ...watchers])));
    if (watchers.length) {
      pushSocialObservation({
        type: 'player_search_absence',
        actors: [playerName],
        observers: watchers,
        text: `${watchers.join(' and ')} noticed you disappeared from camp for a while.`
      });
    }
    setCampSearchTurnsLeft(4);
    setCampSearchEnergy(100);
    setCampSearchSuspicion(0);
    setCampSearchZoneId('');
    setCampSearchLog(['Pick a zone, then run a quick or thorough search. Thorough search unlocks after you build strong evidence.']);
    setCampSearchOpen(true);
  }

  function leaveIdolAtCampZone() {
    if (!campSearchOpen || !playerHasIdol) return;
    if (!campSearchZoneId || !idolPlantRecipientName) return;
    const recipientName = idolPlantRecipientName;
    const zone = zoneById(campSearchZoneId);
    setPlayerHasIdol(false);
    setIdolPlantPlan({
      zoneId: campSearchZoneId,
      recipientName,
      plantedByName: playerName,
      plantedByType: 'player',
      round: currentRound
    });
    setCampSearchOpen(false);
    setCampSearchTurnsLeft(0);
    setCampSearchEnergy(0);
    setCampSearchSuspicion(0);
    setCampSearchZoneId('');
    setCampSearchLog([]);
    setIdolRevealMoment(`You left your idol at ${zone.label} where ${recipientName} is likely to search. If they find it, they will think it was theirs.`);
    logIdolTransfer({
      type: 'player_planted_idol',
      from: playerName,
      to: recipientName,
      visibility: 'hidden',
      accepted: true,
      summary: `${playerName} planted an idol for ${recipientName} at ${zone.label}.`
    });
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
        survivorArchetype: c.survivorArchetype || '',
        personalReason: c.personalReason || '',
        vulnerability: c.vulnerability || '',
        presentation: c.presentation || '',
        reality: c.reality || '',
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0),
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

Session-shaping requirement:
- Every tribal must feel unique to this exact game history, not like a reusable script.
- Before writing anything, secretly make 3 decisions and let them shape the whole session:
  1) Dominant camp emotion tonight (pick one): paranoia, overconfidence, desperation, betrayal, relief, suspicion, solidarity cracking under pressure.
  2) Unexpected voice: choose one castaway who has been quieter/agreeable and make them say something surprising at tribal.
  3) Unspoken subtext: choose one underlying truth everyone senses but avoids naming directly until pressure cracks it open.

Core rules:
- Host voice is sharp, observational, and adaptive (sometimes surgical, sometimes provocative, sometimes hands-off).
- Host never reveals hidden agendas directly.
- Keep opening to 2-3 sentences.
- Host should reference whether the player won or lost immunity and how it shifts pressure.
- Immediately after the Host opening, include 1-2 castaway reactions.
- Castaways react naturally to each other and to tension in the room.
- Ground every line in specific moments from this game history (quotes, contradictions, absences, alliance behavior, hesitations).
- If there is no specific grounded reference for a castaway line, keep that castaway quiet.
- Castaways should react through personality differences and not sound interchangeable.
- Castaways are layered humans, not one-note archetypes:
  - do not force backstory dumps
  - let vulnerability slip in short pressured moments only when context earns it
  - reveal presentation-vs-reality gaps through specific inconsistency, not exposition

Anti-repetition requirements:
- Avoid repeating rhetorical moves within this tribal session and avoid stale recurring tribal patterns.
- "You've been quiet" observation: at most once per session.
- "We all know why we're really here" implication: at most once per session.
- Loyalty self-defense: after two castaways do this, further attempts should be challenged as rehearsed.
- Calling the player a strategic/smart threat is allowed only when grounded in a specific player action from this game.
- Ban generic catchphrases from castaways (for example: "I'm here to play the game", "trust is everything out here", "expect the unexpected").

Power-dynamic requirement:
- Secretly weight one dynamic and commit to it for this session:
  1) player is clearly on the bottom
  2) player has more power than they realize
  3) real target is not the public target
  4) alliance crack goes public unexpectedly

Immunity constraints:
- Immunity only means that person cannot receive votes tonight.
- The immune person still votes, still influences outcomes, and can be courted as a key vote.
- Nobody pushes voting for the immune person.
- If an immune name comes up, someone should correct and redirect.
- If the player is immune, castaways should not repeatedly attack or antagonize the player.
- An immune player should be treated as a power vote to court for tonight and maintain trust with for tomorrow.
- At most one brief acknowledgement of the player's immunity, then move to vulnerable targets and real at-risk drama between castaways.

Output constraints:
- Return strict JSON only, no markdown.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
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
        survivorArchetype: c.survivorArchetype || '',
        personalReason: c.personalReason || '',
        vulnerability: c.vulnerability || '',
        presentation: c.presentation || '',
        reality: c.reality || '',
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0),
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

Session-level uniqueness mandate:
- This tribal must feel like a unique episode shaped by this specific game history.
- Maintain consistency with 3 secret session decisions:
  1) dominant emotion in camp tonight (paranoia / overconfidence / desperation / betrayal / relief / suspicion / solidarity cracking under pressure)
  2) unexpected voice (a quieter or agreeable castaway says something surprising)
  3) unspoken subtext everyone is circling before it is finally exposed

Core behavior:
- Every castaway at tribal council is fighting for their own survival tonight.
- Castaways are active strategic players, not passive commentators.
- The player is one person in a volatile room; pressure should move naturally.
- Every line must be grounded in specific moments from this game (actual statements, contradictions, absences, alliance behavior, hesitations).
- If a castaway cannot produce a specific grounded reference, that castaway should stay quiet.
- Castaway perspective should reflect personality differences: strategic players track inconsistency, social players track emotional shifts, quiet observers track interaction patterns.
- Layered-character behavior:
  - Keep personal backstory private unless the moment earns it.
  - Surface answers for surface questions; deeper cracks only under pressure or emotional specificity.
  - Let presentation-vs-reality contradiction emerge through action and inconsistency.

Anti-repetition constraints:
- Never recycle the same rhetorical move repeatedly within this session.
- "You've been quiet" observation: maximum once per session.
- "We all know why we're really here" implication: maximum once per session.
- Loyalty self-defense can happen at most twice; additional attempts should be challenged as sounding rehearsed.
- Calling the player a smart/strategic threat is allowed only when tied to a specific player action from this game.
- Ban generic catchphrase dialogue from castaways (for example: "I'm here to play the game", "trust is everything out here", "expect the unexpected").

Power dynamic and host variety:
- Commit to one dynamic for this session and let it drive interactions:
  1) player clearly on the bottom
  2) player has more power than they realize
  3) real target differs from public target
  4) alliance crack goes public unexpectedly
- Vary host interrogation style naturally (surgical and precise, provocative and chaotic, or mostly hands-off until key moment).

Immunity is non-negotiable:
- Immunity only blocks votes against that person tonight.
- The immune person still votes and can be a deciding vote.
- Strategizing with an immune person is rational.
- Nobody suggests voting out the immune person.
- If an immune name is raised, castaways/host correct and redirect.
- Conversation should focus on viable targets given who is safe.
- If the player is immune, castaways must not repeatedly target or antagonize the player.
- If addressing an immune player, castaways should court their vote, align socially, or use their read against other vulnerable castaways.
- After one brief immunity acknowledgement, shift pressure to vulnerable castaways who can actually go home tonight.

Conversation rules:
- This is a flowing group chat around the fire.
- Castaways react to each other and to the player.
- Host speaks when natural: pressing tension, redirecting, or exposing cracks.
- If Host directly addresses a castaway by name, that castaway answers in this same turn.
- After that answer, 1-2 other castaways may react briefly.
- Player is expected to answer only when addressed by name.
- Castaways may lie, deflect, perform loyalty, or crack.
- Never reveal hidden agendas directly.
- Keep each line concise: Host 1-2 sentences, castaways 1-3 sentences.
- Return strict JSON only, no markdown.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
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

  useEffect(() => {
    if (phase !== 'tribal' || !tribalVoteCalled || tribalStarted) return;
    maybeCastawayGiftIdolAtTribal();
  }, [phase, tribalVoteCalled, tribalStarted]);

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

  function givePlayerIdolAtTribal() {
    if (tribalStarted || idolPlayedByPlayer) return;
    if (!playerHasIdol || playerHasFakeIdol) return;
    const target = idolGiveTarget || castaways[0]?.name;
    if (!target) return;
    setPlayerHasIdol(false);
    setCastawayHasIdolName('');
    setIdolPlayedByPlayer(true);
    setIdolPlayedFakeByPlayer(false);
    setIdolProtectedName(target);
    setIdolGivenPublicByPlayer(true);
    setIdolAnnouncement(`${playerName} hands their immunity idol to ${target}. ${target} is now protected from tonight's vote.`);
    setTribalPublicHistory((prev) => [
      ...prev,
      {
        id: `tribal-public-gift-${Date.now()}`,
        role: 'host',
        speaker: 'Host',
        text: `${playerName} just made it public. Idol transferred to ${target}, and ${target} is safe tonight.`,
        typing: false
      }
    ]);
    pushSocialObservation({
      type: 'tribal_public_idol_gift',
      actors: [playerName, target],
      text: `${playerName} publicly handed an idol to ${target} at tribal, exposing that bond to everyone.`
    });
    logIdolTransfer({
      type: 'tribal_public_gift_player_to_castaway',
      from: playerName,
      to: target,
      visibility: 'public',
      accepted: true,
      summary: `${playerName} publicly gifted their idol to ${target} at tribal.`
    });
  }

  async function maybeCastawayGiftIdolAtTribal() {
    if (!tribalVoteCalled || tribalStarted || idolPlayedByPlayer) return;
    if (!castawayHasIdolName) return;
    if (castawayHasIdolName === eliminatedName) return;
    const holder = castaways.find((c) => c.name === castawayHasIdolName);
    if (!holder) return;
    try {
      const history = conversationHistories[holder.id] || [];
      const system = `Decide if ${holder.name} publicly gives their idol to ${playerName} at tribal council before votes.
Return strict JSON only:
{
  "giveIdol": false,
  "line": ""
}
Rules:
- giveIdol should be true only if trust/strategy from actual game history strongly supports protecting the player right now.
- line is what ${holder.name} says publicly if they give it (1 sentence).
- if giveIdol=false, line should be empty.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}`;
      const prompt = `Holder profile:
${JSON.stringify(holder, null, 2)}
One-on-one history with player:
${JSON.stringify(history, null, 2)}
Current tribal history:
${JSON.stringify(tribalPublicHistory, null, 2)}
Social intel:
${JSON.stringify(relationshipIntelByName[holder.name] || {}, null, 2)}`;
      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.85
      });
      const parsed = parseClaudeJson(raw) || {};
      if (!parsed.giveIdol) return;
      const line =
        String(parsed.line || '').trim() ||
        `${holder.name} steps forward. "I'm not letting ${playerName} go tonight. This is for them."`;
      setCastawayHasIdolName('');
      setIdolPlayedByPlayer(true);
      setIdolProtectedName(playerName);
      setIdolGivenPublicByCastaway(holder.name);
      setIdolAnnouncement(`${holder.name} hands their immunity idol to ${playerName}. ${playerName} is now protected from tonight's vote.`);
      setTribalPublicHistory((prev) => [
        ...prev,
        {
          id: `tribal-castaway-gift-${Date.now()}`,
          role: 'castaway',
          speaker: holder.name,
          text: line,
          typing: false
        }
      ]);
      pushSocialObservation({
        type: 'tribal_public_idol_gift',
        actors: [holder.name, playerName],
        text: `${holder.name} publicly handed an idol to ${playerName} at tribal.`
      });
      logIdolTransfer({
        type: 'tribal_public_gift_castaway_to_player',
        from: holder.name,
        to: playerName,
        visibility: 'public',
        accepted: true,
        summary: `${holder.name} publicly gifted their idol to ${playerName} at tribal.`
      });
    } catch {
      // No-op: this is optional drama, tribal should continue.
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
        survivorArchetype: c.survivorArchetype || '',
        personalReason: c.personalReason || '',
        vulnerability: c.vulnerability || '',
        presentation: c.presentation || '',
        reality: c.reality || '',
        hiddenAgenda: c.hiddenAgenda,
        secretAlliances: c.secretAlliances,
        ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0),
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

      const votingCastawayCount = castaways.length;
      const system = `You simulate strategic Survivor-style voting behavior.

Core principle:
- Player words and actions must have direct, measurable impact on castaway votes when they were specific and credible.
- Each castaway starts with a default vote based on hidden agenda/alliances, then that default may move only when player interactions justify movement.
- Vague small talk does not move votes.

Mandatory per-castaway evaluation before deciding each vote:
- Review this castaway's full player interaction across 1-on-1, campfire, and tribal.
- Determine whether the player made a specific deal or voting promise with this castaway, and whether this castaway should honor or break it.
- Determine whether the player exposed this castaway in contradiction, and whether that makes the player respected, feared, or targeted.
- Determine whether the player planted doubt about a rival, and whether that doubt was credible given prior suspicion.
- Determine whether the player overexposed strategy/alliance/target and became a threat.
- Determine whether the player was vague/disengaged and therefore earned no influence.
- Determine whether the player's persuasion matched this castaway's psychology and personality.

Persuasion thresholds by personality:
- Loyal/straightforward: tends to honor explicit deals unless there is overwhelming counter-pressure.
- Calculating/strategic: honors deals only while it serves their game; flips when the math changes.
- Social/charmer: moved by authenticity and emotional trust; repelled by rehearsed/fake tone.
- Paranoid/suspicious: hard to fully win, but highly responsive to credible fear about others.

Deal handling:
- Treat explicit player-castaway voting agreements as binding data points.
- A deal can be honored or betrayed, but betrayal must be grounded in specific game evidence.
- Public tribal contradictions can override private trust and should materially shift votes.

Tribal weighting:
- Public tribal statements carry extra influence because all castaways witness them.
- Strong tribal positioning can shift multiple castaways.
- Weak or contradictory tribal performance can lose votes quickly.

Immunity rule:
- Immunity only means that person cannot receive votes tonight.
- The immune person still votes and can be a decisive swing vote.
- Never produce a vote for an immune person.

${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
Return strict JSON only. No markdown.`;
      const totalPotentialVotesTonight = castaways.length + (playerHasImmunity ? 0 : 1);
      const majorityVotesNeeded = Math.floor(totalPotentialVotesTonight / 2) + 1;
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
Majority threshold tonight: ${majorityVotesNeeded}

Castaway data:
${JSON.stringify(castawayData, null, 2)}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}

Task:
Simulate how the ${votingCastawayCount} castaways voted at tribal council based on hidden agendas, alliances, and player conversations.
Return ONLY JSON in this exact format:
[
  { "name": "", "votedFor": "", "flipped": false }
]
Rules:
- Exactly ${votingCastawayCount} vote objects.
- name must be each castaway exactly once.
- votedFor must be one of the eligible vote target names.
- votedFor cannot be themselves.
- If player has immunity, no vote can be for "${playerName}".
- If a castaway has immunity, no vote can be for that castaway.
- Votes must reflect full 1-on-1, campfire, and tribal history with explicit weighting for what the player said.
- For each castaway, internally compute:
  - default vote before player influence
  - player influence delta from concrete moments (deal, contradiction pressure, doubt planting, trust building, strategic self-exposure, tribal performance)
  - final vote after that delta
- If there was no specific player influence on a castaway, keep their default-interest vote.
- If the player made an explicit deal with a castaway, that deal must materially affect their vote decision (honor or betrayal with specific reason).
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
      const parsedArray = Array.isArray(parsedVotes) ? parsedVotes : [];
      const validVoters = new Set(castaways.map((c) => c.name));
      const validTargets = new Set(voteTargetNames);
      const byVoter = {};

      for (const rawVote of parsedArray) {
        const name = String(rawVote?.name || '').trim();
        const votedFor = String(rawVote?.votedFor || '').trim();
        const flipped = Boolean(rawVote?.flipped);
        if (!name || byVoter[name]) continue;
        if (!validVoters.has(name)) continue;
        if (!validTargets.has(votedFor)) continue;
        if (name === votedFor) continue;
        if (immuneTargetNames.has(votedFor)) continue;
        byVoter[name] = { name, votedFor, flipped };
      }

      const normalizedVotes = castaways.map((c) => {
        if (byVoter[c.name]) return byVoter[c.name];
        const fallbackTargets = voteTargetNames.filter((name) => name !== c.name && !immuneTargetNames.has(name));
        let fallbackTarget = '';
        if (fallbackTargets.includes(voteTarget) && voteTarget !== c.name) {
          fallbackTarget = voteTarget;
        } else {
          fallbackTarget = fallbackTargets[0] || castaways.find((x) => x.name !== c.name)?.name || playerName;
        }
        return {
          name: c.name,
          votedFor: fallbackTarget,
          flipped: false
        };
      });

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
            idolProtectedName: playerIdolProtectedName || '',
            idolGivenPublicByPlayer,
            idolGivenPublicByCastaway,
            idolTransfers: idolTransferLog
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
      setPhase('reveal');
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
            ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0),
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
            idolOutcome,
            idolTransferLog
          },
          conversations: castaways.map((c) => ({
            name: c.name,
            history: (conversationHistories[c.id] || []).map((m) => ({
              role: m.role,
              text: m.text
            }))
          }))
        };

        const system = `You write strategic post-tribal reveals for a Survivor-style game.

The reveal must feel like director's commentary on the player's exact game, not a generic summary.
- For each castaway, explain:
  1) what they were originally planning to do,
  2) what the player said or failed to say that moved or failed to move them,
  3) the specific moment that sealed their vote.
- Explicit voting deals between player and castaways must be surfaced as concrete truth:
  - who made the deal,
  - what was promised,
  - whether it was honored or betrayed,
  - why.
- If the player made a brilliant move, name it precisely.
- If the player made a fatal mistake, name it precisely.
- The verdict must be personal and specific, tied to exact moments in this session.

${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
Return strict JSON only, no markdown.`;
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
- thoughts must include all ${castaways.length} castaway names exactly once.
- thought must be one sentence each.
- alliancesExposed should list concise alliance truths.
- flippedCallouts should include only castaways who flipped against what they told the player.
- For each flipped callout, explicitly state what they told the player, what they actually did, and why.
- idolStory must explain full idol arc: who had clue, who found real/fake idol, every idol transfer/gift/decline/planting event, who played or held it, and how it changed or did not change outcome.
- Include all explicit player-castaway voting deals in alliancesExposed or flippedCallouts (honored or betrayed) with concrete reasons.
- If player had an idol and did not play it and got eliminated, call it out directly in verdict.
- verdict should directly say whether the player made the right move and why, mention whether the player's occupation helped or hurt socially, and cite at least one decisive quote/moment from this game.
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

  async function buildBetweenRoundBrief() {
    setBetweenRoundBriefLoading(true);
    try {
      const payload = {
        playerName,
        playerOccupation,
        eliminatedName,
        castaways: castaways.map((c) => ({
          name: c.name,
          personality: c.personality,
          hiddenAgenda: c.hiddenAgenda,
          secretAlliances: c.secretAlliances,
          ignoredByPlayerCount: Number(approachIgnoredByName[c.name] || 0)
        })),
        votes,
        conversations: castaways.map((c) => ({
          name: c.name,
          oneOnOne: (conversationHistories[c.id] || []).map((m) => ({ role: m.role, text: m.text }))
        })),
        campfireHistory: campfireHistory.map((m) => ({
          role: m.role,
          speaker: m.role === 'user' ? playerName : m.speaker || '',
          text: m.text
        })),
        tribalHistory: tribalPublicHistory.map((m) => ({ role: m.role, speaker: m.speaker, text: m.text })),
        revealData,
        idolTransferLog
      };

      const system = `You are creating a between-round social map for a Survivor-style strategy game.
Return JSON only.
Generate:
- a 3-4 sentence host briefing about fault lines heading into Round 2
- alliance links grounded in real game moments
Link types:
- confirmed (solid): known alliances/deals that clearly formed
- suspected (dotted): credible but unconfirmed alliances
- broken (red): relationships that publicly cracked
Use specific labels like "voted together", "made a deal", "publicly clashed", "secret alliance suspected".`;

      const prompt = `Use this state:
${JSON.stringify(payload, null, 2)}
${buildPersistentConversationContext()}

Return ONLY:
{
  "summary": "",
  "links": [
    { "from": "You or castaway name", "to": "castaway name", "type": "confirmed|suspected|broken", "label": "" }
  ]
}

Rules:
- from/to names must be "You" or exact castaway names from this round.
- no self links.
- include 6-16 links.
- labels are short (2-5 words).
- valid JSON only.`;
      const raw = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2000,
        temperature: 0.85
      });
      const parsed = parseClaudeJson(raw) || {};
      const validNames = new Set(['You', ...castaways.map((c) => c.name)]);
      const links = Array.isArray(parsed.links)
        ? parsed.links
            .map((l) => ({
              from: String(l?.from || '').trim(),
              to: String(l?.to || '').trim(),
              type: ['confirmed', 'suspected', 'broken'].includes(String(l?.type || '').trim()) ? String(l.type).trim() : 'suspected',
              label: String(l?.label || '').trim() || 'social tie'
            }))
            .filter((l) => l.from && l.to && l.from !== l.to && validNames.has(l.from) && validNames.has(l.to))
        : [];
      setBetweenRoundSummary(
        String(parsed.summary || '').trim() ||
          `${eliminatedName} is gone, but tonight's cracks are still open. Round 2 starts with old deals under stress and new targets emerging.`
      );
      setBetweenRoundLinks(links);

      links.forEach((link) => {
        const other = link.from === 'You' ? link.to : link.to === 'You' ? link.from : '';
        if (!other) return;
        if (link.type === 'confirmed') upsertRelationshipIntel(other, 'ally', `${link.label}.`);
        else if (link.type === 'broken') upsertRelationshipIntel(other, 'threat', `${link.label}.`);
        else upsertRelationshipIntel(other, 'uncertain', `${link.label}.`);
      });
    } catch (err) {
      setBetweenRoundSummary(
        `${eliminatedName} is out, and seven remain. The camp is split between fragile deals, hidden suspicion, and alliances that may crack at any second.`
      );
      setBetweenRoundLinks([]);
      setError(err.message || 'Failed to build between-round briefing.');
    } finally {
      setBetweenRoundBriefLoading(false);
    }
  }

  function prepareRound2StateForDebrief() {
    if (currentRound !== 1) return;
    const survivors = castaways.filter((c) => c.name !== eliminatedName);
    const survivorIds = new Set(survivors.map((c) => c.id));
    const nextHistories = Object.fromEntries(Object.entries(conversationHistories).filter(([id]) => survivorIds.has(id)));
    setCastaways(survivors);
    if (castawayHasIdolName && castawayHasIdolName === eliminatedName) {
      setCastawayHasIdolName('');
    }
    if (idolPlantPlan?.recipientName === eliminatedName) {
      setIdolPlantPlan(null);
    }
    setPendingCastawayIdolOffer(null);
    setConversationHistories(nextHistories);
    setCampfireInvites((prev) => prev.filter((id) => survivorIds.has(id)));
    setCampfireRecentlyInvited([]);
    setCampfireRecentlyUninvited([]);
    setSelectedCastawayId(survivors[0]?.id || null);
    setCurrentRound(2);
    setPlayerHasImmunity(false);
    setImmuneCastawayName('');
    const round2Challenge = chooseChallengeForRound(2);
    setRoundChallengeTypes((prev) => ({ ...prev, 2: round2Challenge }));
    setPhaseTwoOnboardingDismissed(false);
    setDebriefIntroMessages([]);
    setDebriefDistinctContacts([]);
    setDebriefNudgeThreshold(Math.random() < 0.5 ? 3 : 4);
    setDebriefNudgeDone(false);
    loadPostTribalDebriefOpening(survivors);
  }

  function startNextImmunityChallengeFromDebrief() {
    if (phase !== 'debrief') return;
    setCastawayApproachesById({});
    const nextType = roundChallengeTypes[2] || chooseChallengeForRound(2);
    setRoundChallengeTypes((prev) => ({ ...prev, 2: nextType }));
    setupImmunityChallenge(nextType, castaways);
    setPhaseTwoOnboardingDismissed(false);
  }

  function beginRound2() {
    if (currentRound !== 1) return;
    prepareRound2StateForDebrief();
    const nextType = roundChallengeTypes[2] || chooseChallengeForRound(2);
    setRoundChallengeTypes((prev) => ({ ...prev, 2: nextType }));
    setupImmunityChallenge(nextType, castaways.filter((c) => c.name !== eliminatedName));
  }

  async function buildFinalGameSummary(nextRoundRecap) {
    try {
      const payload = {
        playerName,
        playerOccupation,
        rounds: nextRoundRecap,
        roundArchive: [...roundHistoryArchive, {
          round: currentRound,
          eliminatedName,
          revealData,
          votes,
          tribalHistory: tribalPublicHistory,
          campfireHistory,
          socialObservations: socialObservations.filter((o) => o.round === currentRound),
          idolTransferLog
        }]
      };
      const system = `You write a final two-round Survivor-style season summary.
Return plain text only in 4-7 sentences.
Include:
- who was eliminated each round
- alliances formed and broken
- deals honored and betrayed
- a precise final verdict on the player's overall performance across both rounds.`;
      const prompt = `Use this state:
${JSON.stringify(payload, null, 2)}
${buildPersistentConversationContext()}

Write the final summary now.`;
      const text = await callClaude({
        apiKey: CLAUDE_CLIENT_API_KEY,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000,
        temperature: 0.9
      });
      setFinalGameSummary(
        String(text || '').trim() ||
          'Across two rounds, you shaped the vote at key moments but paid for every loose thread. Some deals held, others snapped at tribal, and your social reads decided whether pressure turned into control.'
      );
    } catch (err) {
      setFinalGameSummary(
        'Two rounds are complete. You built leverage with some castaways, lost trust with others, and every deal left a visible mark on the vote. Your final result came down to how well you managed public pressure versus private promises.'
      );
      setError(err.message || 'Failed to build final game summary.');
    }
  }

  function applyRoundVoteIntel(roundNumber, roundVotes) {
    if (!Array.isArray(roundVotes)) return;
    roundVotes.forEach((v) => {
      if (v.votedFor === playerName) {
        upsertRelationshipIntel(v.name, 'threat', `Voted against you in Round ${roundNumber}.`);
      } else if (v.flipped) {
        upsertRelationshipIntel(v.name, 'threat', `Betrayed a stated plan in Round ${roundNumber}.`);
      } else {
        upsertRelationshipIntel(v.name, 'uncertain', `Voted for ${v.votedFor} in Round ${roundNumber}.`);
      }
    });
  }

  async function handleRevealContinue() {
    if (revealContinueLoading) return;
    setRevealContinueLoading(true);
    const recapEntry = {
      round: currentRound,
      eliminatedName,
      note: revealData?.verdict || `Round ${currentRound} ended with ${eliminatedName} voted out.`
    };
    const nextRecap = [...roundRecap.filter((r) => r.round !== currentRound), recapEntry].sort((a, b) => a.round - b.round);
    setRoundRecap(nextRecap);
    applyRoundVoteIntel(currentRound, votes);

    const archiveEntry = {
      round: currentRound,
      eliminatedName,
      revealData,
      votes,
      campfireHistory: [...campfireHistory],
      tribalHistory: [...tribalPublicHistory],
      conversations: castaways.map((c) => ({
        name: c.name,
        history: conversationHistories[c.id] || []
      })),
      socialObservations: socialObservations.filter((o) => o.round === currentRound),
      idolTransferLog
    };
    setRoundHistoryArchive((prev) => [...prev.filter((r) => r.round !== currentRound), archiveEntry].sort((a, b) => a.round - b.round));

    if (currentRound < TOTAL_ROUNDS) {
      try {
        prepareRound2StateForDebrief();
        setPhase('debrief');
        return;
      } finally {
        setRevealContinueLoading(false);
      }
    }

    try {
      await buildFinalGameSummary(nextRecap);
      setPhase('game_end');
    } finally {
      setRevealContinueLoading(false);
    }
  }

  function openTribalPhase() {
    setPhase('tribal');
    setCampSearchOpen(false);
    setCastawayApproachesById({});
    setPendingCastawayIdolOffer(null);
    clearTribalAutoAdvanceTimer();
    const initialTarget = castaways.map((c) => c.name).find((name) => name !== immuneCastawayName) || (playerHasImmunity ? '' : playerName);
    setTribalSelection(initialTarget || '');
    setTribalVoteConfirming(false);
    setTribalHostLinesUsed([]);
    setIdolPlayTarget(playerName);
    setIdolGiveTarget(castaways[0]?.name || '');
    setIdolPlayedByPlayer(false);
    setIdolPlayedFakeByPlayer(false);
    setIdolPlayedByCastaway('');
    setIdolGivenPublicByPlayer(false);
    setIdolGivenPublicByCastaway('');
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
        {phase !== 'arrival_intro' && <Header phase={phase} playerName={playerName} playerOccupation={playerOccupation} onResetGame={resetGame} />}

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
            generatingCastawaysLabel={generatingCastawaysLabel}
          />
        )}

        {phase === 'arrival_intro' && (
          <ArrivalIntroPhase loading={campArrivalLoading} introMessages={campArrivalIntroMessages} onJoin={joinArrivalConversation} />
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
            refreshJigsawImage={refreshJigsawImage}
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
            castawayNotesById={castawayNotesById}
            openCastawayNotes={openCastawayNotes}
          />
        )}

        {phase === 'immunity_result' && immunityResult && (
          <ImmunityResultPhase immunityResult={immunityResult} immunityType={immunityType} setPhase={setPhase} />
        )}

        {(phase === 'arrival' || phase === 'convo' || phase === 'debrief') && (
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
            openTribalPhase={openTribalPhase}
            isArrival={phase === 'arrival'}
            isDebrief={phase === 'debrief'}
            startImmunityFromArrival={startImmunityFromArrival}
            startNextImmunityFromDebrief={startNextImmunityChallengeFromDebrief}
            debriefLoading={debriefLoading}
            debriefIntroMessages={debriefIntroMessages}
            playerHasImmunity={playerHasImmunity}
            immuneCastawayName={immuneCastawayName}
            searchCamp={searchCamp}
            canSearchCamp={phase === 'convo' && !chatInFlight && !campSearchOpen && (playerHasIdol || searchCount < MAX_CAMP_SEARCHES)}
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
            playerHasIdol={playerHasIdol}
            idolPlantRecipientName={idolPlantRecipientName}
            setIdolPlantRecipientName={setIdolPlantRecipientName}
            leaveIdolAtCampZone={leaveIdolAtCampZone}
            closeCampSearch={() => finishCampSearch(false, 'You cut the search short and returned to camp.')}
            showPhaseTwoOnboarding={phase === 'convo' && !phaseTwoOnboardingDismissed}
            dismissPhaseTwoOnboarding={() => setPhaseTwoOnboardingDismissed(true)}
            socialAmbientNotices={socialAmbientNotices}
            castawayCurrentlySearching={castawayCurrentlySearching}
            relationshipIntelByName={relationshipIntelByName}
            currentRound={currentRound}
            castawayNotesById={castawayNotesById}
            openCastawayNotes={openCastawayNotes}
            castawayApproachesById={castawayApproachesById}
            acceptCastawayApproach={acceptCastawayApproach}
            dismissCastawayApproach={dismissCastawayApproach}
            offerIdolToCastawayPrivately={offerIdolToCastawayPrivately}
            pendingCastawayIdolOffer={pendingCastawayIdolOffer}
            acceptCastawayIdolOffer={acceptCastawayIdolOffer}
            declineCastawayIdolOffer={declineCastawayIdolOffer}
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
            idolGiveTarget={idolGiveTarget}
            setIdolGiveTarget={setIdolGiveTarget}
            playPlayerIdol={playPlayerIdol}
            givePlayerIdolAtTribal={givePlayerIdolAtTribal}
            idolPlayedByPlayer={idolPlayedByPlayer}
            idolPlayedFakeByPlayer={idolPlayedFakeByPlayer}
            idolProtectedName={idolProtectedName}
            idolAnnouncement={idolAnnouncement}
            shownVotes={shownVotes}
            revealedVotesCount={revealedVotesCount}
            votes={votes}
            eliminatedName={eliminatedName}
            castawayNotesById={castawayNotesById}
            openCastawayNotes={openCastawayNotes}
          />
        )}

        {phase === 'reveal' && (
          <RevealPhase
            revealLoading={revealLoading}
            revealData={revealData}
            castaways={castaways}
            continueLoading={revealContinueLoading}
            continueLoadingLabel={currentRound < TOTAL_ROUNDS ? 'Preparing Round 2 Briefing...' : 'Building Final Season Summary...'}
            castawayNotesById={castawayNotesById}
            openCastawayNotes={openCastawayNotes}
            onContinue={handleRevealContinue}
            continueLabel={currentRound < TOTAL_ROUNDS ? 'View Round 2 Briefing' : 'View Final Season Summary'}
          />
        )}

        {phase === 'between_rounds' && (
          <BetweenRoundsPhase
            eliminatedName={eliminatedName}
            remainingCount={Math.max(0, castaways.length - 1)}
            allianceBriefLoading={betweenRoundBriefLoading}
            allianceSummary={betweenRoundSummary}
            allianceLinks={betweenRoundLinks}
            allianceNodeNames={['You', ...castaways.map((c) => c.name)]}
            beginRound2={beginRound2}
          />
        )}

        {phase === 'game_end' && (
          <GameSummaryPhase roundRecap={roundRecap} finalSummary={finalGameSummary} continueToEmail={() => setPhase('final')} />
        )}

        {phase === 'final' && (
          <FinalPhase notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} submitNotify={submitNotify} notifyMessage={notifyMessage} notifySubmitting={notifySubmitting} />
        )}
        <CastawayNotesModal
          castaway={activeNotesCastaway}
          note={activeNotesCastaway ? castawayNotesById?.[activeNotesCastaway.id] || '' : ''}
          onChange={setCastawayNote}
          onClose={closeCastawayNotes}
        />
      </div>
    </div>
  );
}
