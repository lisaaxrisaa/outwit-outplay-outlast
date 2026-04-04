export async function runCastawayGeneration(ctx) {
  const {
    event,
    playerNameInput,
    playerOccupationInput,
    castawayCount,
    callClaude,
    parseClaudeJson,
    apiKey,
    campZones,
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
    clearSavedGame
  } = ctx;

  event.preventDefault();
  setError('');
  if (typeof clearSavedGame === 'function') clearSavedGame();
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
    const DEBUG_GENERATION = import.meta.env.DEV || String(import.meta.env.VITE_DEBUG_GENERATION || '').toLowerCase() === 'true';
    const debug = (...args) => {
      if (!DEBUG_GENERATION) return;
      // eslint-disable-next-line no-console
      console.log('[generation]', ...args);
    };
    const system = 'You create reality-show cast profiles. Return strict JSON only, with no markdown or commentary.';

    // --- Step 1: Generate core cast profiles ---
    let baseCast = null;
    let attempts = 0;
    let lastError = null;

    while (!baseCast && attempts < 3) {
      attempts += 1;
      const attemptStartedAt = Date.now();
      setGeneratingCastawaysLabel(`Your tribe is hitting the beach... (${attempts}/3)`);
      debug(`attempt ${attempts} started`, { player: cleanedName, occupation: cleanedOccupation });
      const prompt = `Create exactly ${castawayCount} AI castaways for a Survivor-style social deduction game.
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
- All ${castawayCount} castaway names must be unique.
- All survivorArchetype values must be distinct across the full cast of ${castawayCount}.
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
        apiKey,
        system,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2000,
        temperature: 0.95
      });
      debug(`attempt ${attempts} model response`, {
        ms: Date.now() - attemptStartedAt,
        textLength: String(raw || '').length
      });

      let parsed = null;
      try {
        parsed = parseClaudeJson(raw);
      } catch (err) {
        lastError = err;
        setGeneratingCastawaysLabel(`Still gathering your tribe... (retry ${attempts}/3)`);
        debug(`attempt ${attempts} parse failed`, err?.message || 'unknown parse error');
        continue;
      }
      if (!Array.isArray(parsed) || parsed.length !== castawayCount) {
        lastError = new Error(`Expected array length ${castawayCount}, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
        setGeneratingCastawaysLabel(`Still gathering your tribe... (retry ${attempts}/3)`);
        debug(`attempt ${attempts} shape failed`, lastError.message);
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
      if (hasPlayerName || uniqueCount !== castawayCount || uniqueArchetypeCount !== castawayCount || !completeLayers) {
        const reasons = [];
        if (hasPlayerName) reasons.push('player name collision');
        if (uniqueCount !== castawayCount) reasons.push(`duplicate names (${uniqueCount}/${castawayCount})`);
        if (uniqueArchetypeCount !== castawayCount) reasons.push(`duplicate archetypes (${uniqueArchetypeCount}/${castawayCount})`);
        if (!completeLayers) reasons.push('missing required fields');
        lastError = new Error(`Generated cast did not pass validation: ${reasons.join(', ')}`);
        setGeneratingCastawaysLabel(`Still gathering your tribe... (retry ${attempts}/3)`);
        debug(`attempt ${attempts} validation failed`, {
          reasons,
          uniqueCount,
          uniqueArchetypeCount
        });
        continue;
      }

      setGeneratingCastawaysLabel('Eyes are locking in around camp...');
      debug(`attempt ${attempts} succeeded`, {
        ms: Date.now() - attemptStartedAt,
        castCount: candidate.length
      });
      baseCast = candidate;
    }

    if (!baseCast) {
      debug('all attempts exhausted', lastError?.message || 'unknown');
      throw new Error(lastError?.message || 'Castaway generation failed validation.');
    }

    // --- Step 2: Enrich with lying/deception layer + camp arrival (parallel) ---
    setGeneratingCastawaysLabel('Reading the room for tells and deception...');
    debug('enrichment started');
    const enrichStartedAt = Date.now();
    const castSummary = baseCast.map((c) => ({
      name: c.name,
      personality: c.personality,
      survivorArchetype: c.survivorArchetype,
      hiddenAgenda: c.hiddenAgenda,
      presentation: c.presentation,
      reality: c.reality
    }));
    const enrichPrompt = `Given these ${castawayCount} Survivor castaways, generate their lying and deception profiles.

Cast:
${JSON.stringify(castSummary, null, 1)}

Return ONLY a JSON array (same order as input) with this shape:
[
  {
    "name": "",
    "lt": "",
    "ltd": "",
    "pl": [{ "t": "", "f": "", "tr": "", "ph": "arrival" }],
    "tells": []
  }
]

Rules:
- lt (lyingTendency) must be one of: "frequent", "situational", "reluctant". Choose based on each castaway's personality and archetype.
- ltd (lyingTendencyDetail) should describe exactly how they lie under pressure in 1 sentence, consistent with their personality.
- pl (premeditatedLies): each castaway must have at least 1 specific lie (occupation/background lie, alliance lie, vote lie, idol/clue lie, or social relationship lie). The lie should fit their hiddenAgenda and the gap between their presentation and reality.
- tells (lyingTells): 1-2 subtle behavioral tells that appear when this castaway is lying, grounded in their personality.
- Output valid JSON only.`;

    const enrichPromise = callClaude({
      apiKey,
      system,
      messages: [{ role: 'user', content: enrichPrompt }],
      maxTokens: 2000,
      temperature: 0.9
    }).then((enrichRaw) => {
      const parsed = parseClaudeJson(enrichRaw);
      debug('enrichment response', { ms: Date.now() - enrichStartedAt, count: parsed?.length });
      return parsed;
    }).catch((err) => {
      debug('enrichment failed, using defaults', err?.message);
      return null;
    });

    const enriched = await enrichPromise;

    const enrichByName = {};
    if (Array.isArray(enriched)) {
      for (const e of enriched) {
        const name = String(e?.name || '').trim();
        if (name) enrichByName[name] = e;
      }
    }

    const normalized = baseCast.map((c) => {
      const e = enrichByName[c.name] || {};
      return {
        ...c,
        lyingTendency: ['frequent', 'situational', 'reluctant'].includes(String(e?.lt || '').trim().toLowerCase())
          ? String(e.lt).trim().toLowerCase()
          : 'situational',
        lyingTendencyDetail: String(e?.ltd || '').trim() || 'Adapts their story depending on who is listening.',
        premeditatedLies: Array.isArray(e?.pl)
          ? e.pl
              .map((l) => ({
                topic: String(l?.t || l?.topic || '').trim(),
                falseStory: String(l?.f || l?.falseStory || '').trim(),
                truth: String(l?.tr || l?.truth || '').trim(),
                phaseEstablished: String(l?.ph || l?.phaseEstablished || 'arrival').trim()
              }))
              .filter((l) => l.topic && l.falseStory && l.truth)
          : [{ topic: 'background', falseStory: 'Claims a different reason for being here.', truth: c.personalReason, phaseEstablished: 'arrival' }],
        lyingTells: Array.isArray(e?.tells)
          ? e.tells.map((t) => String(t).trim()).filter(Boolean).slice(0, 2)
          : ['Avoids eye contact when pressed.']
      };
    });
    debug('enrichment merged', { ms: Date.now() - enrichStartedAt });

    const histories = normalized.reduce((acc, c) => {
      acc[c.id] = [];
      return acc;
    }, {});
    const notes = normalized.reduce((acc, c) => {
      acc[c.id] = '';
      return acc;
    }, {});

    const idolZone = pickRandom(campZones) || campZones[0];
    const clueZone = pickRandom(campZones.filter((z) => z.id !== idolZone.id)) || campZones[1];
    const fakeZone = pickRandom(campZones.filter((z) => z.id !== idolZone.id && z.id !== clueZone.id)) || campZones[2];
    const clueHolder = normalized[Math.floor(Math.random() * normalized.length)];
    const fakePlanted = Math.random() < 0.2;
    const fakePlanter = fakePlanted ? pickRandom(normalized.filter((c) => c.id !== clueHolder.id).map((c) => c.name)) || normalized[0].name : '';
    const likelySearchers = normalized.filter((c) => /(competitive|challenge|athlet|physical|strateg|calculating|ruthless|observant)/i.test(c.personality));
    const searchPool = likelySearchers.length ? likelySearchers : normalized;
    const plannedClueFinder = Math.random() < 0.35 ? pickRandom(searchPool.map((c) => c.name).filter((name) => name !== clueHolder.name)) || '' : '';
    const plannedIdolFinder = Math.random() < 0.22 ? pickRandom(searchPool.map((c) => c.name).filter((name) => name !== plannedClueFinder)) || '' : '';

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
    setVotePromiseLog([]);
    setLieEventLog([]);
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
