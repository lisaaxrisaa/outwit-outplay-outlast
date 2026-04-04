export function rollCastawaySearchActivityAction(ctx) {
  const {
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
    campZones,
    currentRound
  } = ctx;

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
      const zone = campZones[Math.floor(Math.random() * campZones.length)];
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

export function finishCampSearchAction(ctx, foundSomething, revealText) {
  const {
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
  } = ctx;

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

export function searchCampAction(ctx) {
  const {
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
  } = ctx;

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

export function leaveIdolAtCampZoneAction(ctx) {
  const {
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
  } = ctx;

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

export function selectCampSearchZoneAction(ctx, zoneId) {
  const { campSearchOpen, setCampSearchZoneId } = ctx;
  if (!campSearchOpen) return;
  setCampSearchZoneId(zoneId);
}

export function runCampSearchAction(ctx, intensity) {
  const {
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
  } = ctx;

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
        finishCampSearch(false, `You search ${zone.label} thoroughly and realize someone got there first. The hide is empty and disturbed.`);
        return;
      }
      setPlayerHasIdol(true);
      finishCampSearch(true, `You find a hidden immunity idol at ${idolLocation}. Keep it secret. You can play it at tribal for yourself or someone else.`);
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
