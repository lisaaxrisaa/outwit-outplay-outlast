export async function runLoadTribalHostOpening(ctx) {
  const {
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
    apiKey,
    parseClaudeJson,
    setTribalHostOpening,
    animateTribalReply,
    rememberHostLine,
    ingestLieSignals,
    ingestVotePromises,
    setError
  } = ctx;

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
- Deception constraints:
  - Castaways should maintain premeditated lies unless strategically exposed or cracked under pressure.
  - If a castaway lies in this beat, include one subtle lying tell in delivery.
  - If a castaway is not lying, do not include lying tells.
  - Natural contradiction pressure is encouraged when stories do not align.

Output constraints:
- Return strict JSON only, no markdown.
${buildIdolContext()}
${buildPriorRoundsContext()}
${buildPersistentConversationContext()}
${buildLyingContext()}
- Host lines already used this session must never be repeated or closely paraphrased.

Format:
{
  "opening": "",
  "reactions": [{ "name": "", "response": "" }],
  "lieSignals": [{ "speaker": "CastawayName", "type": "", "about": "", "detail": "", "tell": "" }],
  "votePromises": [{ "speaker": "CastawayName", "to": "", "target": "", "commitment": "", "confidence": "high|medium|low" }]
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
      apiKey,
      system,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1000,
      temperature: 0.9
    });

    const parsed = parseClaudeJson(raw);
    const opening = String(parsed?.opening || '').trim();
    const parsedLieSignals = Array.isArray(parsed?.lieSignals) ? parsed.lieSignals : [];
    const parsedVotePromises = Array.isArray(parsed?.votePromises) ? parsed.votePromises : [];
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
    ingestLieSignals(parsedLieSignals);
    ingestVotePromises(parsedVotePromises);
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
