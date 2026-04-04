export async function runSendCampfireConversation(ctx) {
  const {
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
    apiKey,
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
  } = ctx;

  if (chatInFlight) return;
  if (!conversationInput.trim()) return;

  setError('');
  setChatInFlight(true);

  const userText = conversationInput.trim();
  const inArrival = phase === 'arrival';
  const inDebrief = phase === 'debrief';
  setConversationInput('');
  const userAskedIdol = /\bidol|clue|search|well|palm|fire pit|rocks|camp\b/i.test(userText);
  const groupPromises = extractPlayerVotePromiseEntries(userText, 'group');
  ingestVotePromises(groupPromises);

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

    const system = `You are simulating a Survivor-style campfire group conversation.

Tone and behavior rules:
- Campfire feels messier and more social than 1-on-1.
- Castaways may perform loyalty publicly while hiding agendas privately.
- They may subtly discredit rivals in front of the group.
- Never break character.
- Speak casually and naturally.
- Keep each castaway response to 2-4 sentences.
- Never directly admit hidden agendas.
- Lying mechanics:
  - Castaways should deploy their own premeditated lies naturally when relevant topics arise.
  - Lying tells should appear subtly only while that castaway is actively lying.
  - Honest moments should not include those tells.
  - Contradictions between castaways should surface naturally when accounts conflict.
  - Castaways may strategically expose another castaway's lie when useful.
- Characters are layered people:
  - keep backstory private unless the player creates emotional space or pressure
  - surface answers for surface questions
  - vulnerability appears in brief cracks under pressure, accusation, or betrayal moments
  - contradiction (presentation vs reality) should appear through inconsistency, not direct confession
- Camp phase behavior:
  - If this is camp arrival, keep group tone social and first-impression focused: stories, personalities, and surface warmth.
  - During camp arrival group/campfire talk, overt strategy or alliance pitching should read as a red flag and draw visible social reactions (side-eye, discomfort, deflection, quiet suspicion).
  - Camp arrival should feel friendly on the surface with quiet calculation underneath; the game is coming, but not openly declared in group talk yet.
  - Camp arrival lying rules:
    - Do not push active deception aggressively in group talk on day one.
    - Premeditated lies can exist, but should remain low-intensity and mostly background.
    - Occupation/background lies, if present, should read as simple self-introduction rather than a campaign.
    - Alliance/vote deception is generally premature in camp arrival group settings and should be rare.
    - A day-one manipulator may seed subtle influence early, but it should still feel social and human, not hard strategy theater.
  - If this is post-tribal debrief, tone is raw and immediate; castaways should reference tribal fallout and recalculate alliances.
- The player's name is ${playerName} and they are a ${playerOccupation}. Factor this into how castaways perceive and interact with them.
- If the player's claimed occupation appears inconsistent with their behavior or statements, castaways can quietly question it.
- Every observation must be grounded in specific moments from this game history (campfire and 1-on-1), not generic suspicion lines.
- Do not repeat the same phrase, accusation pattern, or behavioral read once it has already been used; advance the conversation.
- Let each castaway notice different things based on personality (strategic inconsistency reads, emotional reads, or interaction-pattern reads).
- Immunity status tonight: ${playerHasImmunity ? `${playerName} has immunity.` : immuneCastawayName ? `${immuneCastawayName} has immunity.` : 'No immunity has been won yet.'}
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
${buildLyingContext()}
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
Return JSON in this exact shape:
{
  "responses": [
    { "name": "Marcus", "response": "..." }
  ],
  "lieSignals": [
    { "speaker": "CastawayName", "type": "", "about": "", "detail": "", "tell": "" }
  ],
  "votePromises": [
    { "speaker": "CastawayName", "to": "Player or CastawayName", "target": "", "commitment": "", "confidence": "high|medium|low" }
  ]
}

Rules:
- ${organicMode ? 'Include exactly 2 or 3 responders, chosen strategically.' : 'Only use invited castaway names in the output.'}
- Names must come from the castaway list.
- Responses should react to the player's latest message and to what others in this same group turn are saying.
- Output valid JSON only.`;

    const rawReply = await callClaude({
      apiKey,
      system,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      temperature: 1
    });

    const parsed = parseClaudeJson(rawReply);
    const responseArray = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.responses) ? parsed.responses : [];
    const parsedLieSignals = Array.isArray(parsed?.lieSignals) ? parsed.lieSignals : [];
    const parsedVotePromises = Array.isArray(parsed?.votePromises) ? parsed.votePromises : [];
    if (!Array.isArray(responseArray) || responseArray.length === 0) {
      throw new Error('Campfire response was not a valid response array.');
    }

    const validNames = new Set(castaways.map((c) => c.name));
    const invitedNameSet = new Set(invitedNames);
    const normalized = responseArray
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
    ingestLieSignals(parsedLieSignals);
    ingestVotePromises(parsedVotePromises);

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
