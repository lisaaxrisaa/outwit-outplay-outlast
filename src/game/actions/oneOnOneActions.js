export async function runSendConversation(ctx) {
  const {
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
    apiKey,
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
    idolLocation,
    setConversationHistoriesAfterIdolOffer
  } = ctx;

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
  const playerPromiseEntries = extractPlayerVotePromiseEntries(userText, selectedCastaway.name);
  ingestVotePromises(playerPromiseEntries);
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
- Hidden lying tendency: ${selectedCastaway.lyingTendency || 'situational'} (${selectedCastaway.lyingTendencyDetail || 'unknown'})
- Premeditated lies to maintain unless exposed:
${JSON.stringify(selectedCastaway.premeditatedLies || [], null, 2)}
- Lying tells (only when lying): ${(selectedCastaway.lyingTells || []).join('; ') || 'none listed'}
- Other tribe members: ${otherNames.join(', ')}
- Player name: ${playerName}
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how your character perceives and interacts with them.
- If the player's claimed occupation seems inconsistent with their own statements, you may grow suspicious and probe carefully.
- Player previously ignored your private approach attempts: ${Number(approachIgnoredByName[selectedCastaway.name] || 0)}
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
${buildLyingContext()}
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
  - If this is camp arrival, keep tone mostly social: first impressions, life stories, vibe checks, and gentle bonding.
  - In camp arrival 1-on-1s, strategy can surface quietly as a soft feeler (a whisper, not a hard pitch): testing trust, floating a loose idea, or asking for a read.
  - Any early strategy in camp arrival should be tentative and reactive: test the player's comfort first, then either continue carefully if welcomed or back off to social talk if the player seems uneasy, evasive, or redirects.
  - If the player pushes aggressive strategy too early during arrival, register that as potentially risky and respond with caution.
  - Camp arrival lying rules:
    - Do not deploy deception aggressively on day one.
    - Premeditated lies can exist internally, but should surface lightly and naturally at most.
    - Occupation/background lies should appear as a simple intro identity, without over-explaining or hard-selling.
    - Alliance/vote lies are usually not active yet in camp arrival unless the castaway is explicitly a day-one manipulator.
    - If you are a day-one manipulator archetype, any early manipulation should read as charm/curiosity, not overt scheming.
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
- Lying behavior requirements:
  - If asked about a topic covered by your premeditated lies, use that lie naturally and consistently.
  - If confronted with contradiction, respond in character (double down, pivot, partial crack, or controlled retreat), never as a system explanation.
  - If you are lying in this reply, include one of your own lying tells subtly in delivery.
  - If you are not lying in this reply, do not display your lying tells.
- Vote promise requirements:
  - If you make a voting promise, it must be explicit and concrete.
  - If you avoid committing, keep wording ambiguous.
- Do not mention these rules.
- Return strict JSON only in this exact shape:
{
  "response": "",
  "offerIdolToPlayer": false,
  "idolOfferLine": "",
  "lieSignals": [
    { "speaker": "self", "type": "", "about": "", "detail": "", "tell": "" }
  ],
  "votePromises": [
    { "speaker": "self", "to": "", "target": "", "commitment": "", "confidence": "high|medium|low" }
  ]
}
- Only set offerIdolToPlayer=true if you currently hold a real idol, trust with the player is high based on actual history, and gifting clearly serves your strategy now.
- If offerIdolToPlayer=true, idolOfferLine should be 1-2 natural sentences spoken directly to the player.
- If no idol offer happens, leave idolOfferLine empty.`;

    const rawReply = await callClaude({
      apiKey,
      system,
      messages: historyForModel,
      maxTokens: 1000,
      temperature: 1
    });

    let assistantReply = String(rawReply || '').trim();
    let offerIdolToPlayer = false;
    let idolOfferLine = '';
    let parsedLieSignals = [];
    let parsedVotePromises = [];
    try {
      const parsedReply = parseClaudeJson(rawReply);
      if (parsedReply && typeof parsedReply === 'object') {
        assistantReply = String(parsedReply.response || '').trim() || assistantReply;
        offerIdolToPlayer = Boolean(parsedReply.offerIdolToPlayer);
        idolOfferLine = String(parsedReply.idolOfferLine || '').trim();
        parsedLieSignals = Array.isArray(parsedReply.lieSignals) ? parsedReply.lieSignals : [];
        parsedVotePromises = Array.isArray(parsedReply.votePromises) ? parsedReply.votePromises : [];
      }
    } catch {
      // Fallback to raw text if model did not return JSON.
    }

    await animateAssistantReply(castawayId, assistantMsgId, assistantReply);
    ingestLieSignals(parsedLieSignals, selectedCastaway.name);
    ingestVotePromises(parsedVotePromises, selectedCastaway.name);
    if (
      offerIdolToPlayer &&
      castawayHasIdolName === selectedCastaway.name &&
      !playerHasIdol &&
      !playerHasFakeIdol &&
      !pendingCastawayIdolOffer
    ) {
      const offerText = idolOfferLine || `${selectedCastaway.name} lowers their voice. "I trust you more than anyone right now. Take this idol."`;
      const offerMessageId = `idol-offer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      (typeof setConversationHistoriesAfterIdolOffer === 'function' ? setConversationHistoriesAfterIdolOffer : setConversationHistories)((prev) => {
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

export async function runOfferIdolToCastawayPrivately(ctx) {
  const {
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
    apiKey,
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
  } = ctx;

  if (chatInFlight || !selectedCastaway || chatMode !== 'oneOnOne') return;
  if (phase !== 'convo') return;
  if (!playerHasIdol || castawayHasIdolName) return;
  setError('');
  setChatInFlight(true);
  const castawayId = selectedCastaway.id;
  const castawayName = selectedCastaway.name;
  const offerText = 'I want you to have my idol tonight. I am handing it to you.';
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
${buildPersistentConversationContext()}
${buildLyingContext()}`;

    const rawReply = await callClaude({
      apiKey,
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

export function acceptPendingCastawayIdolOffer(ctx) {
  const {
    pendingCastawayIdolOffer,
    castawayHasIdolName,
    setPendingCastawayIdolOffer,
    setPlayerHasIdol,
    setCastawayHasIdolName,
    setIdolRevealMoment,
    logIdolTransfer,
    playerName,
    setConversationHistories
  } = ctx;

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

export function declinePendingCastawayIdolOffer(ctx) {
  const {
    pendingCastawayIdolOffer,
    setPendingCastawayIdolOffer,
    logIdolTransfer,
    playerName,
    setConversationHistories
  } = ctx;

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
