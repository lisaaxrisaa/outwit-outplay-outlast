export function buildPriorRoundsContext({ currentRound, roundHistoryArchive, socialObservations }) {
  if (currentRound <= 1 || !roundHistoryArchive.length) return '';
  return `Prior round continuity:\n${JSON.stringify(roundHistoryArchive, null, 2)}\nCurrent social observations:\n${JSON.stringify(
    socialObservations.filter((o) => o.round <= currentRound),
    null,
    2
  )}`;
}

export function buildSocialObservationContext({ currentRound, socialObservations }) {
  const visible = socialObservations.filter((o) => o.round <= currentRound);
  if (!visible.length) return 'Social observations this game: none yet.';
  return `Social observations this game:\n${visible.map((o) => `- Round ${o.round}: ${o.text}`).join('\n')}`;
}

export function buildLyingContext({ castaways, votePromiseLog, lieEventLog }) {
  const castawayLyingProfiles = castaways.map((c) => ({
    name: c.name,
    lyingTendency: c.lyingTendency || '',
    lyingTendencyDetail: c.lyingTendencyDetail || '',
    lies: Array.isArray(c.premeditatedLies) ? c.premeditatedLies : [],
    tells: Array.isArray(c.lyingTells) ? c.lyingTells : []
  }));
  return `Hidden deception system:\n- Castaway lying DNA:\n${JSON.stringify(castawayLyingProfiles, null, 2)}\n\n- Voting promise log (must stay consistent across phases/rounds):\n${JSON.stringify(
    votePromiseLog,
    null,
    2
  )}\n\n- Lie event log (deployments, cracks, exposures, inconsistencies):\n${JSON.stringify(lieEventLog, null, 2)}\n\nRules:\n- Premeditated lies must remain consistent unless explicitly exposed or intentionally revised as damage control.\n- Lying tells should appear when lying and should not appear in straightforward honest moments.\n- Contradictions across conversations are meaningful social signals, not random mistakes.`;
}

export function buildIdolTransferContext({ idolTransferLog }) {
  if (!idolTransferLog.length) return 'Idol transfer log: none yet.';
  return `Idol transfer log:\n${idolTransferLog
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

export function buildPersistentConversationContext({
  castaways,
  conversationHistories,
  campfireHistory,
  tribalPublicHistory,
  roundHistoryArchive,
  playerName,
  idolTransferLog,
  votePromiseLog,
  lieEventLog
}) {
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
  return `Full persistent conversation memory across this entire game:\n- Current round one-on-one histories:\n${JSON.stringify(oneOnOne, null, 2)}\n\n- Current round campfire history:\n${JSON.stringify(campfire, null, 2)}\n\n- Current round tribal history:\n${JSON.stringify(tribal, null, 2)}\n\n- Prior rounds archive (must remain active memory):\n${JSON.stringify(archive, null, 2)}\n\n- Idol transfer timeline:\n${JSON.stringify(idolTransferLog, null, 2)}\n\n- Vote promise timeline:\n${JSON.stringify(votePromiseLog, null, 2)}\n\n- Lie event timeline:\n${JSON.stringify(lieEventLog, null, 2)}\n\nNothing above is forgotten.`;
}
