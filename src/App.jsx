import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AppContent from './components/AppContent';
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
  parseClaudeJson,
  pickChallengeType
} from './lib/gameUtils';
import { pickRandom, pickRandomMany, normalizeArchetype, zoneById as zoneByIdFromList, extractPlayerVotePromises } from './game/utils/gameDataUtils';
import { CAMP_ZONES, MAX_CAMP_SEARCHES, CASTAWAY_COUNT, TOTAL_ROUNDS, JIGSAW_IMAGE_POOL } from './game/constants/gameConstants';
import { pickRandomJigsawImage, countRopeCrossings, evaluateTorchGrid } from './game/utils/challengeHelpers';
import { runCastawayGeneration } from './game/actions/castawayGeneration';
import {
  runSendConversation,
  runOfferIdolToCastawayPrivately,
  acceptPendingCastawayIdolOffer,
  declinePendingCastawayIdolOffer
} from './game/actions/oneOnOneActions';
import { runSendCampfireConversation } from './game/actions/campfireActions';
import {
  rollCastawaySearchActivityAction,
  finishCampSearchAction,
  searchCampAction,
  leaveIdolAtCampZoneAction,
  selectCampSearchZoneAction,
  runCampSearchAction as runCampSearchActionFromModule
} from './game/actions/campSearchActions';
import { runLoadTribalHostOpening } from './game/actions/tribalOpeningActions';
import {
  buildIdolTransferContext as buildIdolTransferContextFromState,
  buildLyingContext as buildLyingContextFromState,
  buildPersistentConversationContext as buildPersistentConversationContextFromState,
  buildPriorRoundsContext as buildPriorRoundsContextFromState,
  buildSocialObservationContext as buildSocialObservationContextFromState
} from './game/context/contextBuilders';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_WAITLIST_TABLE = import.meta.env.VITE_SUPABASE_WAITLIST_TABLE || 'waitlist_signups';
const CLAUDE_CLIENT_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const GAME_SAVE_KEY = 'outwit:game-save:v1';
const GAME_SAVE_VERSION = 1;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
  const [jigsawImageUrl, setJigsawImageUrl] = useState(() => pickRandomJigsawImage(JIGSAW_IMAGE_POOL));
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
  const [votePromiseLog, setVotePromiseLog] = useState([]);
  const [lieEventLog, setLieEventLog] = useState([]);

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
      votePromiseLog,
      lieEventLog,
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
    if (has('jigsawImageUrl')) setJigsawImageUrl(data.jigsawImageUrl || pickRandomJigsawImage(JIGSAW_IMAGE_POOL));
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
    if (has('votePromiseLog')) setVotePromiseLog(Array.isArray(data.votePromiseLog) ? data.votePromiseLog : []);
    if (has('lieEventLog')) setLieEventLog(Array.isArray(data.lieEventLog) ? data.lieEventLog : []);

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
      setCastawayApproachesById((prev) => (Object.keys(prev || {}).length ? {} : prev));
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

  function pushSocialObservation(observation) {
    const item = {
      id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      round: currentRound,
      ...observation
    };
    setSocialObservations((prev) => [...prev, item]);
    setSocialAmbientNotices((prev) => [...prev.slice(-3), item]);
  }

  function zoneById(zoneId) {
    return zoneByIdFromList(CAMP_ZONES, zoneId);
  }

  function buildPriorRoundsContext() {
    return buildPriorRoundsContextFromState({
      currentRound,
      roundHistoryArchive,
      socialObservations
    });
  }

  function buildSocialObservationContext() {
    return buildSocialObservationContextFromState({
      currentRound,
      socialObservations
    });
  }

  function logVotePromise(entry) {
    const item = {
      id: `vote-promise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      round: currentRound,
      phase,
      timestamp: Date.now(),
      ...entry
    };
    setVotePromiseLog((prev) => [...prev, item]);
  }

  function logLieEvent(entry) {
    const item = {
      id: `lie-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      round: currentRound,
      phase,
      timestamp: Date.now(),
      ...entry
    };
    setLieEventLog((prev) => [...prev, item]);
  }

  function buildLyingContext() {
    return buildLyingContextFromState({
      castaways,
      votePromiseLog,
      lieEventLog
    });
  }

  function ingestVotePromises(rawPromises, fallbackSpeaker = '') {
    if (!Array.isArray(rawPromises)) return;
    rawPromises.forEach((p) => {
      const speakerRaw = String(p?.speaker || fallbackSpeaker).trim();
      const to = String(p?.to || '').trim();
      const target = String(p?.target || '').trim();
      const commitment = String(p?.commitment || '').trim();
      const confidence = String(p?.confidence || 'medium').trim().toLowerCase();
      if (!speakerRaw || !to || !target || !commitment) return;
      const speaker = speakerRaw === 'self' && fallbackSpeaker ? fallbackSpeaker : speakerRaw;
      logVotePromise({
        speaker,
        to,
        target,
        commitment,
        confidence: ['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium'
      });
    });
  }

  function ingestLieSignals(rawSignals, fallbackSpeaker = '') {
    if (!Array.isArray(rawSignals)) return;
    rawSignals.forEach((s) => {
      const type = String(s?.type || '').trim();
      const about = String(s?.about || '').trim();
      const detail = String(s?.detail || '').trim();
      const tell = String(s?.tell || '').trim();
      if (!type || !detail) return;
      const speakerRaw = String(s?.speaker || fallbackSpeaker).trim();
      const speaker = speakerRaw === 'self' && fallbackSpeaker ? fallbackSpeaker : speakerRaw;
      logLieEvent({
        type,
        speaker,
        about,
        detail,
        tell
      });
      if (type === 'lie_exposed' || type === 'inconsistency_exposed') {
        const subject = about || speaker || 'A castaway';
        pushSocialObservation({
          type: 'lie_exposed',
          actors: speaker ? [speaker] : [],
          text: `${subject} had a story challenged: ${detail}`
        });
      }
    });
  }

  function extractPlayerVotePromiseEntries(text, toName = '') {
    return extractPlayerVotePromises({
      text,
      toName,
      playerName,
      castaways
    });
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
    return buildIdolTransferContextFromState({ idolTransferLog });
  }

  function buildPersistentConversationContext() {
    return buildPersistentConversationContextFromState({
      castaways,
      conversationHistories,
      campfireHistory,
      tribalPublicHistory,
      roundHistoryArchive,
      playerName,
      idolTransferLog,
      votePromiseLog,
      lieEventLog
    });
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
    setJigsawImageUrl((prev) => pickRandomJigsawImage(JIGSAW_IMAGE_POOL, prev));
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
${buildLyingContext()}

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
    setJigsawImageUrl((prev) => pickRandomJigsawImage(JIGSAW_IMAGE_POOL, prev));
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
    await runCastawayGeneration({
      event: e,
      playerNameInput,
      playerOccupationInput,
      castawayCount: CASTAWAY_COUNT,
      callClaude,
      parseClaudeJson,
      apiKey: CLAUDE_CLIENT_API_KEY,
      campZones: CAMP_ZONES,
      pickRandom,
      normalizeArchetype,
      chooseChallengeForRound,
      loadCampArrivalOpening,
      setError,
      setGeneratingCastaways,
      setGeneratingCastawaysLabel,
      setPlayerName,
      setPlayerOccupation,
      setPlayerHasImmunity,
      setCastaways,
      setIdolLocation,
      setIdolZoneId,
      setClueZoneId,
      setFakeIdolZoneId,
      setIdolClueHolderId,
      setPlayerHeardIdolClue,
      setPlayerFoundClueScroll,
      setPlayerHasIdol,
      setPlayerHasFakeIdol,
      setCastawayClueFinderName,
      setCastawayIdolFinderName,
      setCastawayHasIdolName,
      setIdolGiveTarget,
      setIdolGivenPublicByPlayer,
      setIdolGivenPublicByCastaway,
      setPendingCastawayIdolOffer,
      setIdolPlantPlan,
      setIdolPlantRecipientName,
      setIdolTransferLog,
      setFakeIdolPlanted,
      setFakeIdolPlanterName,
      setIdolRevealMoment,
      setPlayerSearchedCamp,
      setPlayerSearchNoticedBy,
      setSearchCount,
      setSearchSuspicionScore,
      setCampSearchOpen,
      setCampSearchTurnsLeft,
      setCampSearchEnergy,
      setCampSearchSuspicion,
      setCampSearchZoneId,
      setCampSearchLog,
      setIdolSearchProgress,
      setIdolSearchClues,
      setCastawayCurrentlySearching,
      setIdolPlayTarget,
      setIdolPlayedByPlayer,
      setIdolPlayedFakeByPlayer,
      setIdolPlayedByCastaway,
      setIdolProtectedName,
      setIdolAnnouncement,
      setIdolOutcome,
      setConversationHistories,
      setCastawayNotesById,
      setCampfireHistory,
      setCampArrivalIntroMessages,
      setCampArrivalLoading,
      setArrivalDistinctContacts,
      setArrivalNudgeThreshold,
      setArrivalNudgeDone,
      setDebriefIntroMessages,
      setDebriefLoading,
      setDebriefDistinctContacts,
      setDebriefNudgeThreshold,
      setDebriefNudgeDone,
      setCampfireInvites,
      setCampfireRecentlyInvited,
      setCampfireRecentlyUninvited,
      setCastawayApproachesById,
      setApproachCountByPhase,
      setApproachIgnoredByName,
      setCampSocialActivityScore,
      setApproachDramaBoost,
      setChatMode,
      setPhaseTwoOnboardingDismissed,
      setTribalHostOpening,
      setTribalHostLoading,
      setTribalPublicHistory,
      setTribalChatInput,
      setTribalPlayerMessages,
      setTribalVoteCalled,
      setTribalHostLinesUsed,
      setTribalAwaitingPlayer,
      setTribalCastawayExchangesSincePlayer,
      setTribalPlayerCheckInThreshold,
      setSelectedCastawayId,
      setCurrentRound,
      setRoundRecap,
      setRoundHistoryArchive,
      setBetweenRoundBriefLoading,
      setBetweenRoundSummary,
      setBetweenRoundLinks,
      setFinalGameSummary,
      setSocialObservations,
      setSocialAmbientNotices,
      setLastObservedOneOnOneKey,
      setVotePromiseLog,
      setLieEventLog,
      setRelationshipIntelByName,
      setRoundChallengeTypes,
      setPhase,
      clearSavedGame: () => localStorage.removeItem(GAME_SAVE_KEY)
    });
  }

  async function sendConversation() {
    await runSendConversation({
      selectedCastaway,
      chatInFlight,
      conversationInput,
      setError,
      setChatInFlight,
      phase,
      setConversationInput,
      extractPlayerVotePromiseEntries,
      ingestVotePromises,
      currentRound,
      lastObservedOneOnOneKey,
      setLastObservedOneOnOneKey,
      pickRandomMany,
      castaways,
      pushSocialObservation,
      playerName,
      upsertRelationshipIntel,
      conversationHistories,
      setConversationHistories,
      idolClueHolderId,
      castawayCurrentlySearching,
      playerOccupation,
      approachIgnoredByName,
      playerHasImmunity,
      immuneCastawayName,
      buildIdolContext,
      buildPriorRoundsContext,
      buildPersistentConversationContext,
      buildLyingContext,
      castawayHasIdolName,
      fakeIdolPlanted,
      fakeIdolPlanterName,
      callClaude,
      apiKey: CLAUDE_CLIENT_API_KEY,
      parseClaudeJson,
      animateAssistantReply,
      ingestLieSignals,
      pendingCastawayIdolOffer,
      playerHasIdol,
      playerHasFakeIdol,
      setPendingCastawayIdolOffer,
      logIdolTransfer,
      setCampSocialActivityScore,
      registerArrivalContact,
      registerDebriefContact,
      setPlayerHeardIdolClue,
      setHistoryMessage,
      rollCastawaySearchActivity,
      idolLocation
    });
  }

  async function offerIdolToCastawayPrivately() {
    await runOfferIdolToCastawayPrivately({
      chatInFlight,
      selectedCastaway,
      chatMode,
      phase,
      playerHasIdol,
      castawayHasIdolName,
      setError,
      setChatInFlight,
      conversationHistories,
      setConversationHistories,
      buildIdolContext,
      buildPriorRoundsContext,
      buildPersistentConversationContext,
      buildLyingContext,
      callClaude,
      apiKey: CLAUDE_CLIENT_API_KEY,
      parseClaudeJson,
      animateAssistantReply,
      setPlayerHasIdol,
      setCastawayHasIdolName,
      setIdolRevealMoment,
      logIdolTransfer,
      playerName,
      upsertRelationshipIntel,
      pushSocialObservation,
      setHistoryMessage
    });
  }

  function acceptCastawayIdolOffer() {
    acceptPendingCastawayIdolOffer({
      pendingCastawayIdolOffer,
      castawayHasIdolName,
      setPendingCastawayIdolOffer,
      setPlayerHasIdol,
      setCastawayHasIdolName,
      setIdolRevealMoment,
      logIdolTransfer,
      playerName,
      setConversationHistories
    });
  }

  function declineCastawayIdolOffer() {
    declinePendingCastawayIdolOffer({
      pendingCastawayIdolOffer,
      setPendingCastawayIdolOffer,
      logIdolTransfer,
      playerName,
      setConversationHistories
    });
  }

  async function sendCampfireConversation() {
    await runSendCampfireConversation({
      chatInFlight,
      conversationInput,
      setError,
      setChatInFlight,
      phase,
      setConversationInput,
      extractPlayerVotePromiseEntries,
      ingestVotePromises,
      playerName,
      campfireHistory,
      setCampfireHistory,
      castaways,
      campfireInvites,
      pushSocialObservation,
      upsertRelationshipIntel,
      campfireRecentlyInvited,
      campfireRecentlyUninvited,
      approachIgnoredByName,
      idolClueHolderId,
      castawayHasIdolName,
      fakeIdolPlanted,
      fakeIdolPlanterName,
      castawayCurrentlySearching,
      playerOccupation,
      playerHasImmunity,
      immuneCastawayName,
      buildIdolContext,
      buildPriorRoundsContext,
      buildPersistentConversationContext,
      buildLyingContext,
      callClaude,
      apiKey: CLAUDE_CLIENT_API_KEY,
      parseClaudeJson,
      setPlayerHeardIdolClue,
      registerArrivalContact,
      registerDebriefContact,
      ingestLieSignals,
      animateCampfireReply,
      setCampSocialActivityScore,
      setApproachDramaBoost,
      setCampfireRecentlyInvited,
      setCampfireRecentlyUninvited,
      setCampfireMessage,
      rollCastawaySearchActivity
    });
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
    rollCastawaySearchActivityAction({
      phase,
      castaways,
      pickRandomMany,
      castawayClueFinderName,
      pushSocialObservation,
      setCastawayCurrentlySearching,
      idolPlantPlan,
      castawayHasIdolName,
      setCastawayHasIdolName,
      setIdolPlantPlan,
      logIdolTransfer,
      campZones: CAMP_ZONES,
      currentRound
    });
  }

  function finishCampSearch(foundSomething, revealText) {
    finishCampSearchAction(
      {
        campSearchActionLockRef,
        setCampSearchOpen,
        setCampSearchTurnsLeft,
        setCampSearchEnergy,
        setCampSearchSuspicion,
        setCampSearchZoneId,
        setCampSearchLog,
        setIdolRevealMoment,
        setApproachDramaBoost,
        maybeQueueCastawayApproach
      },
      foundSomething,
      revealText
    );
  }

  function searchCamp() {
    searchCampAction({
      phase,
      campSearchOpen,
      playerHasIdol,
      setCampSearchTurnsLeft,
      setCampSearchEnergy,
      setCampSearchSuspicion,
      setCampSearchZoneId,
      setCampSearchLog,
      setCampSearchOpen,
      setIdolPlantRecipientName,
      castaways,
      searchCount,
      pickRandomMany,
      setSearchCount,
      setPlayerSearchedCamp,
      setPlayerSearchNoticedBy,
      pushSocialObservation,
      playerName
    });
  }

  function leaveIdolAtCampZone() {
    leaveIdolAtCampZoneAction({
      campSearchOpen,
      playerHasIdol,
      campSearchZoneId,
      idolPlantRecipientName,
      zoneById,
      setPlayerHasIdol,
      setIdolPlantPlan,
      playerName,
      currentRound,
      setCampSearchOpen,
      setCampSearchTurnsLeft,
      setCampSearchEnergy,
      setCampSearchSuspicion,
      setCampSearchZoneId,
      setCampSearchLog,
      setIdolRevealMoment,
      logIdolTransfer
    });
  }

  function selectCampSearchZone(zoneId) {
    selectCampSearchZoneAction(
      {
        campSearchOpen,
        setCampSearchZoneId
      },
      zoneId
    );
  }

  function runCampSearchAction(intensity) {
    runCampSearchActionFromModule(
      {
        campSearchOpen,
        campSearchZoneId,
        campSearchActionLockRef,
        campSearchTurnsLeft,
        campSearchEnergy,
        finishCampSearch,
        zoneById,
        idolZoneId,
        fakeIdolPlanted,
        fakeIdolZoneId,
        idolSearchProgress,
        idolSearchClues,
        playerFoundClueScroll,
        playerHeardIdolClue,
        campSearchSuspicion,
        searchSuspicionScore,
        castaways,
        castawayIdolFinderName,
        pickRandomMany,
        setCampSearchTurnsLeft,
        setCampSearchEnergy,
        setCampSearchSuspicion,
        setSearchSuspicionScore,
        setIdolSearchProgress,
        setIdolSearchClues,
        setPlayerSearchNoticedBy,
        setCampSearchLog,
        clueZoneId,
        setPlayerFoundClueScroll,
        setPlayerHeardIdolClue,
        castawayHasIdolName,
        setPlayerHasIdol,
        idolLocation,
        playerHasFakeIdol,
        setPlayerHasFakeIdol
      },
      intensity
    );
  }

  async function loadTribalHostOpening() {
    await runLoadTribalHostOpening({
      setTribalHostLoading,
      setTribalPublicHistory,
      castaways,
      approachIgnoredByName,
      idolClueHolderId,
      castawayHasIdolName,
      fakeIdolPlanted,
      fakeIdolPlanterName,
      castawayCurrentlySearching,
      conversationHistories,
      campfireHistory,
      playerName,
      playerOccupation,
      playerHasImmunity,
      immuneCastawayName,
      buildIdolContext,
      buildPriorRoundsContext,
      buildPersistentConversationContext,
      buildLyingContext,
      tribalHostLinesUsed,
      callClaude,
      apiKey: CLAUDE_CLIENT_API_KEY,
      parseClaudeJson,
      setTribalHostOpening,
      animateTribalReply,
      rememberHostLine,
      ingestLieSignals,
      ingestVotePromises,
      setError
    });
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
        lyingTendency: c.lyingTendency || '',
        lyingTendencyDetail: c.lyingTendencyDetail || '',
        premeditatedLies: c.premeditatedLies || [],
        lyingTells: c.lyingTells || [],
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
- If a castaway lies in this turn, include one subtle lying tell from their profile.
- If a castaway is being direct/honest in this turn, avoid those lying tells.
- Let contradiction pressure and lie callouts emerge naturally when it serves strategy.
- Keep each line concise: Host 1-2 sentences, castaways 1-3 sentences.
- Return strict JSON only, no markdown.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
${buildLyingContext()}
- Host lines already used in this tribal session must never be repeated or closely paraphrased.

Output format:
{
  "responses": [{ "speaker": "Host or CastawayName", "text": "" }],
  "lieSignals": [{ "speaker": "CastawayName", "type": "", "about": "", "detail": "", "tell": "" }],
  "votePromises": [{ "speaker": "CastawayName", "to": "", "target": "", "commitment": "", "confidence": "high|medium|low" }],
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
      const parsedLieSignals = Array.isArray(parsed?.lieSignals) ? parsed.lieSignals : [];
      const parsedVotePromises = Array.isArray(parsed?.votePromises) ? parsed.votePromises : [];
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
      ingestLieSignals(parsedLieSignals);
      ingestVotePromises(parsedVotePromises);
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
    ingestVotePromises(extractPlayerVotePromiseEntries(playerText, 'tribal_group'));
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
${buildPersistentConversationContext()}
${buildLyingContext()}`;
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
        lyingTendency: c.lyingTendency || '',
        lyingTendencyDetail: c.lyingTendencyDetail || '',
        premeditatedLies: c.premeditatedLies || [],
        lyingTells: c.lyingTells || [],
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
- Voting promises and lie events are persistent game facts. A castaway breaking a promise should map to prior lie behavior or clear strategic necessity.
- If a castaway lied about a vote plan, align that with their lying tendency and prior tells.

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
${buildLyingContext()}
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
Vote promise log:
${JSON.stringify(votePromiseLog, null, 2)}
Lie event log:
${JSON.stringify(lieEventLog, null, 2)}

Castaway data:
${JSON.stringify(castawayData, null, 2)}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
${buildLyingContext()}

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
            lyingTendency: c.lyingTendency || '',
            premeditatedLies: c.premeditatedLies || [],
            lyingTells: c.lyingTells || [],
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
          votePromiseLog,
          lieEventLog,
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
${buildLyingContext()}
Return strict JSON only, no markdown.`;
        const prompt = `Generate a post-tribal truth reveal from this game state:
${JSON.stringify(payload, null, 2)}

Return ONLY JSON with this shape:
{
  "narrative": "",
  "thoughts": [{ "name": "", "thought": "" }],
  "alliancesExposed": [""],
  "flippedCallouts": [{ "name": "", "toldPlayer": "", "did": "", "why": "" }],
  "lieCallouts": [{ "name": "", "lie": "", "truth": "", "tell": "", "opportunityToCatch": "" }],
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
- lieCallouts must expose concrete lies across the game (occupation/background, alliance, vote, clue/idol, emotional performance when relevant), with the castaway's tell and where the player could have noticed it.
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
          lieCallouts: Array.isArray(parsed.lieCallouts)
            ? parsed.lieCallouts
                .map((l) => ({
                  name: String(l?.name || '').trim(),
                  lie: String(l?.lie || '').trim(),
                  truth: String(l?.truth || '').trim(),
                  tell: String(l?.tell || '').trim(),
                  opportunityToCatch: String(l?.opportunityToCatch || '').trim()
                }))
                .filter((l) => l.name && l.lie)
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
          lieCallouts: castaways
            .filter((c) => Array.isArray(c.premeditatedLies) && c.premeditatedLies.length)
            .slice(0, 4)
            .map((c) => ({
              name: c.name,
              lie: c.premeditatedLies[0]?.falseStory || 'They kept parts of their strategy hidden.',
              truth: c.premeditatedLies[0]?.truth || 'Their real intent stayed concealed.',
              tell: (c.lyingTells || [])[0] || 'Subtle behavioral shift under pressure.',
              opportunityToCatch: 'Conflicting accounts surfaced across private and group conversations.'
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
          lyingTendency: c.lyingTendency || '',
          premeditatedLies: c.premeditatedLies || [],
          lyingTells: c.lyingTells || [],
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
        idolTransferLog,
        votePromiseLog,
        lieEventLog
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
${buildLyingContext()}

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
          idolTransferLog,
          votePromiseLog,
          lieEventLog
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
${buildLyingContext()}

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
      idolTransferLog,
      votePromiseLog,
      lieEventLog
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
    <AppContent
      phase={phase}
      playerName={playerName}
      playerOccupation={playerOccupation}
      resetGame={resetGame}
      error={error}
      playerNameInput={playerNameInput}
      setPlayerNameInput={setPlayerNameInput}
      playerOccupationInput={playerOccupationInput}
      setPlayerOccupationInput={setPlayerOccupationInput}
      generateCastaways={generateCastaways}
      generatingCastaways={generatingCastaways}
      generatingCastawaysLabel={generatingCastawaysLabel}
      campArrivalLoading={campArrivalLoading}
      campArrivalIntroMessages={campArrivalIntroMessages}
      joinArrivalConversation={joinArrivalConversation}
      immunityType={immunityType}
      startImmunityChallenge={startImmunityChallenge}
      immunityPepLoading={immunityPepLoading}
      immunityPepTalk={immunityPepTalk}
      setPhase={setPhase}
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
      immunityResult={immunityResult}
      selectedCastawayId={selectedCastawayId}
      setSelectedCastawayId={setSelectedCastawayId}
      chatMode={chatMode}
      setChatMode={setChatMode}
      campfireInvites={campfireInvites}
      toggleCampfireInvite={toggleCampfireInvite}
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
      startImmunityFromArrival={startImmunityFromArrival}
      startNextImmunityChallengeFromDebrief={startNextImmunityChallengeFromDebrief}
      debriefLoading={debriefLoading}
      debriefIntroMessages={debriefIntroMessages}
      playerHasImmunity={playerHasImmunity}
      immuneCastawayName={immuneCastawayName}
      searchCamp={searchCamp}
      canSearchCamp={phase === 'convo' && !chatInFlight && !campSearchOpen && (playerHasIdol || searchCount < MAX_CAMP_SEARCHES)}
      idolRevealMoment={idolRevealMoment}
      setIdolRevealMoment={setIdolRevealMoment}
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
      phaseTwoOnboardingDismissed={phaseTwoOnboardingDismissed}
      setPhaseTwoOnboardingDismissed={setPhaseTwoOnboardingDismissed}
      socialAmbientNotices={socialAmbientNotices}
      castawayCurrentlySearching={castawayCurrentlySearching}
      relationshipIntelByName={relationshipIntelByName}
      currentRound={currentRound}
      castawayApproachesById={castawayApproachesById}
      acceptCastawayApproach={acceptCastawayApproach}
      dismissCastawayApproach={dismissCastawayApproach}
      offerIdolToCastawayPrivately={offerIdolToCastawayPrivately}
      pendingCastawayIdolOffer={pendingCastawayIdolOffer}
      acceptCastawayIdolOffer={acceptCastawayIdolOffer}
      declineCastawayIdolOffer={declineCastawayIdolOffer}
      tribalScrollRef={tribalScrollRef}
      tribalHostLoading={tribalHostLoading}
      tribalPublicHistory={tribalPublicHistory}
      tribalVoteCalled={tribalVoteCalled}
      tribalStarted={tribalStarted}
      tribalChatInput={tribalChatInput}
      setTribalChatInput={setTribalChatInput}
      sendTribalMessage={sendTribalMessage}
      tribalSelection={tribalSelection}
      setTribalSelection={setTribalSelection}
      tribalVoteConfirming={tribalVoteConfirming}
      setTribalVoteConfirming={setTribalVoteConfirming}
      runTribalCouncil={runTribalCouncil}
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
      revealLoading={revealLoading}
      revealData={revealData}
      revealContinueLoading={revealContinueLoading}
      handleRevealContinue={handleRevealContinue}
      totalRounds={TOTAL_ROUNDS}
      betweenRoundBriefLoading={betweenRoundBriefLoading}
      betweenRoundSummary={betweenRoundSummary}
      betweenRoundLinks={betweenRoundLinks}
      beginRound2={beginRound2}
      roundRecap={roundRecap}
      finalGameSummary={finalGameSummary}
      notifyEmail={notifyEmail}
      setNotifyEmail={setNotifyEmail}
      submitNotify={submitNotify}
      notifyMessage={notifyMessage}
      notifySubmitting={notifySubmitting}
      activeNotesCastaway={activeNotesCastaway}
      setCastawayNote={setCastawayNote}
      closeCastawayNotes={closeCastawayNotes}
    />
  );
}
