import React from 'react';

export default function ConversationPhase(props) {
  const {
    castaways,
    selectedCastawayId,
    setSelectedCastawayId,
    chatMode,
    setChatMode,
    campfireInvites,
    toggleCampfireInvite,
    playerName,
    playerOccupation,
    selectedCastaway,
    invitedCastawayNames,
    chatScrollRef,
    selectedHistory,
    campfireHistory,
    conversationInput,
    setConversationInput,
    chatInFlight,
    sendConversation,
    sendCampfireConversation,
    canSendConversation,
    badgeColor,
    openTribalPhase,
    playerHasImmunity,
    immuneCastawayName,
    searchCamp,
    canSearchCamp,
    searchCount,
    maxCampSearches,
    searchSuspicionScore,
    campSearchOpen,
    campSearchTurnsLeft,
    campSearchEnergy,
    campSearchSuspicion,
    campSearchZoneId,
    campSearchLog,
    idolSearchProgress,
    idolSearchClues,
    campZones,
    canThoroughSearch,
    selectCampSearchZone,
    runCampSearchAction,
    closeCampSearch,
    idolRevealMoment,
    dismissIdolReveal,
    showPhaseTwoOnboarding,
    dismissPhaseTwoOnboarding,
    socialAmbientNotices,
    castawayCurrentlySearching,
    relationshipIntelByName,
    currentRound
  } = props;

  function HelpTip({ text }) {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          className="group inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 text-[10px] font-bold text-zinc-300 hover:border-amber-300 hover:text-amber-200"
        >
          ?
          <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-lg border border-amber-300/30 bg-zinc-950/95 px-2 py-1 text-[11px] font-medium text-zinc-100 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {text}
          </span>
        </button>
      </span>
    );
  }

  if (showPhaseTwoOnboarding) {
    return (
      <section className="relative min-h-[60vh] animate-fadeIn">
        <div className="absolute inset-0 rounded-3xl border border-amber-300/25 bg-black/85 p-6 sm:p-10">
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-300/35 bg-black/70 p-6 text-center sm:mt-16">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Jeff</div>
            <h3 className="mt-2 font-display text-4xl tracking-wide text-amber-100">Phase 2</h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-100">
              Talk one-on-one or gather people at the campfire and watch what shifts when everyone is listening. You can slip away to search camp for a hidden idol, but if you disappear, people will notice. When you think you have the numbers, head to Tribal Council. Trust your instincts. Everyone out here is lying to at least one person.
            </p>
            <button
              onClick={dismissPhaseTwoOnboarding}
              className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-zinc-950"
            >
              I'm ready
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 animate-fadeIn">
      {campSearchOpen && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-5 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300/35 bg-black/65 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Search Camp</div>
                <div className="text-sm text-zinc-200">Pick a zone, take risks, and build enough evidence to unlock a thorough dig.</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Turns</div>
                  <div className="text-2xl font-bold text-amber-200">{campSearchTurnsLeft}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Energy</div>
                  <div className="text-2xl font-bold text-emerald-200">{campSearchEnergy}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Suspicion</div>
                  <div className="text-2xl font-bold text-rose-200">{campSearchSuspicion}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-700 bg-black/55 p-3 sm:grid-cols-3">
              {campZones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => selectCampSearchZone(zone.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    campSearchZoneId === zone.id
                      ? 'border-amber-300/80 bg-amber-800/25 text-amber-100'
                      : 'border-zinc-600 bg-black/35 text-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-black/55 p-3">
              <button
                onClick={() => runCampSearchAction('quick')}
                disabled={!campSearchZoneId || campSearchTurnsLeft <= 0 || campSearchEnergy <= 0}
                className="rounded-lg border border-emerald-400/55 bg-emerald-900/25 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Quick Search
              </button>
              <button
                onClick={() => runCampSearchAction('thorough')}
                disabled={!campSearchZoneId || !canThoroughSearch || campSearchTurnsLeft <= 0 || campSearchEnergy <= 0}
                className="rounded-lg border border-amber-400/60 bg-amber-900/20 px-3 py-2 text-sm font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Thorough Search
              </button>
              <div className="text-xs text-zinc-300">
                Thorough unlock: reach 45 progress or bank 1 strong clue. Current progress {idolSearchProgress}/100, clues {idolSearchClues}.
              </div>
            </div>

            <div className="mt-3 min-h-[220px] overflow-y-auto rounded-xl border border-zinc-700 bg-black/55 px-4 py-3">
              {campSearchLog.length === 0 ? (
                <div className="text-sm text-zinc-400">No search actions yet.</div>
              ) : (
                <div className="space-y-2 text-sm text-zinc-200">
                  {campSearchLog.map((line, idx) => (
                    <div key={`${line}-${idx}`} className="rounded-lg border border-zinc-700/80 bg-black/35 px-3 py-2">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-700 bg-black/55 px-4 py-2">
              <div className="text-xs text-zinc-300">Each action increases attention. Leave now if the risk is getting too high.</div>
              <button
                onClick={closeCampSearch}
                className="rounded-lg border border-zinc-600 bg-black/45 px-3 py-1.5 text-xs font-semibold text-zinc-200"
              >
                Return to Camp
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-4xl tracking-wide text-emerald-200">Round {currentRound}: Tribe Conversations</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={searchCamp}
            disabled={!canSearchCamp}
            className="rounded-full border border-zinc-700 bg-black/35 px-3 py-1.5 text-xs uppercase tracking-widest text-zinc-300 transition hover:border-amber-300/70 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Search Camp
          </button>
          <span className="rounded-full border border-zinc-700 bg-black/45 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-400">
            Searches: {searchCount}/{maxCampSearches}
          </span>
          <span className="rounded-full border border-rose-500/35 bg-rose-900/20 px-2 py-1 text-[11px] uppercase tracking-wide text-rose-200">
            Suspicion: {searchSuspicionScore}/100
          </span>
          <HelpTip text="Each search trip can expose you. Higher suspicion means more castaways notice your absences and may distrust you." />
        </div>
      </div>
      {idolRevealMoment && (
        <div className="rounded-2xl border border-yellow-300/35 dossier p-4">
          <div className="text-xs uppercase tracking-widest text-yellow-200">Secret Dossier</div>
          <div className="mt-2 text-sm text-zinc-100">{idolRevealMoment}</div>
          <button
            onClick={dismissIdolReveal}
            className="mt-3 rounded-lg border border-zinc-600 bg-black/35 px-3 py-1.5 text-xs font-semibold text-zinc-200"
          >
            Keep Quiet
          </button>
        </div>
      )}

      {socialAmbientNotices?.length > 0 && (
        <div className="space-y-2">
          {socialAmbientNotices.slice(-3).map((notice) => (
            <div key={notice.id} className="rounded-xl border border-zinc-700/70 bg-zinc-950/55 px-3 py-2 text-xs text-zinc-300">
              {notice.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setChatMode('oneOnOne')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            chatMode === 'oneOnOne' ? 'bg-orange-500 text-zinc-950' : 'border border-zinc-700 bg-black/40 text-zinc-300 hover:border-zinc-500'
          }`}
        >
          1-on-1
        </button>
        <button
          onClick={() => setChatMode('campfire')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            chatMode === 'campfire' ? 'bg-orange-500 text-zinc-950' : 'border border-zinc-700 bg-black/40 text-zinc-300 hover:border-zinc-500'
          }`}
        >
          Campfire 🔥
        </button>
        <HelpTip text="Gather multiple castaways around the fire at once. What people say in a group reveals more than what they say alone." />
      </div>

      <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/55 px-3 py-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-200">
          <span className="font-semibold uppercase tracking-[0.12em] text-zinc-300">Relationship Radar</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Confirmed ally
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
            Uncertain
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            Known threat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
            Unknown
          </span>
          <HelpTip text="Dots update based only on what you have learned in conversations and tribal. Hover a card to see the latest relationship note." />
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-300/60 bg-emerald-900/20 p-4 text-left shadow-lg shadow-emerald-700/15">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-zinc-100">{playerName || 'You'}</h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">You</span>
              {playerHasImmunity && (
                <span className="rounded-full border border-yellow-300/60 bg-yellow-700/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-100">
                  Immunity
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-300">{playerOccupation || 'Player'}</p>
          </div>
        </div>
        <span className="mt-3 inline-block rounded-full bg-emerald-700/50 px-3 py-1 text-xs font-medium text-emerald-100">Human wildcard</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {castaways.map((c) => (
          (() => {
            const intel = relationshipIntelByName?.[c.name] || { status: 'unknown', summary: 'Relationship unknown.' };
            const intelDotClass =
              intel.status === 'ally'
                ? 'bg-emerald-400'
                : intel.status === 'threat'
                ? 'bg-red-400'
                : intel.status === 'uncertain'
                ? 'bg-yellow-300'
                : 'bg-zinc-500';
            const searching = castawayCurrentlySearching?.includes(c.name);
            return (
          <div
            key={c.id}
            onClick={() => setSelectedCastawayId(c.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedCastawayId(c.id);
              }
            }}
            role="button"
            tabIndex={0}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedCastawayId === c.id
                ? 'border-orange-300/60 bg-orange-700/20 shadow-lg shadow-orange-500/20'
                : 'border-zinc-700/70 bg-black/40 hover:border-emerald-300/50 hover:bg-emerald-800/10'
            } ${chatMode === 'campfire' && campfireInvites.includes(c.id) ? 'ring-2 ring-emerald-300/70' : ''} ${
              immuneCastawayName === c.name ? 'ring-2 ring-yellow-300/80 border-yellow-300/70' : ''
            } ${searching ? 'opacity-70' : ''}`}
            title={intel.summary}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-zinc-100">{c.name}</h3>
                  {intel.status !== 'unknown' && <span className={`h-2.5 w-2.5 rounded-full ${intelDotClass}`} />}
                  {immuneCastawayName === c.name && (
                    <span className="rounded-full border border-yellow-300/60 bg-yellow-700/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-100">
                      Immunity
                    </span>
                  )}
                  {searching && (
                    <span className="rounded-full border border-zinc-600 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-200">
                      Away
                    </span>
                  )}
                  {chatMode === 'campfire' && campfireInvites.includes(c.id) && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">Invited</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-300">{c.occupation}</p>
              </div>
              <span className="text-sm text-zinc-300">{c.age}</span>
            </div>
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${badgeColor(c.personality)}`}>{c.personality}</span>
            {chatMode === 'campfire' && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCampfireInvite(c.id);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      campfireInvites.includes(c.id)
                        ? 'bg-emerald-500/30 text-emerald-100'
                        : 'border border-zinc-600 bg-black/30 text-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {campfireInvites.includes(c.id) ? 'Invited ✓' : 'Invite'}
                  </button>
                  <HelpTip text="Pull this person into the campfire conversation." />
                </div>
              </div>
            )}
          </div>
            );
          })()
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-700/60 bg-black/45 p-4">
          <h3 className="mb-3 text-lg font-semibold text-orange-200">
            {chatMode === 'campfire' ? 'Campfire' : selectedCastaway ? `1-on-1 with ${selectedCastaway.name}` : 'Select a castaway'}
          </h3>
          {chatMode === 'campfire' && (
            <div className="mb-3 rounded-xl border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
              {invitedCastawayNames.length > 0 ? `Invited: ${invitedCastawayNames.join(', ')}` : 'Open Campfire'}
            </div>
          )}

          <div ref={chatScrollRef} className="h-80 space-y-3 overflow-y-auto rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-3">
            {chatMode !== 'campfire' && selectedCastaway && selectedHistory.length === 0 && (
              <p className="text-sm text-zinc-500">Start talking. Read between the lines; everyone is playing a game.</p>
            )}
            {chatMode === 'campfire' && campfireHistory.length === 0 && (
              <p className="text-sm text-zinc-500">Bring people in or keep it open. Every response lands in front of everyone.</p>
            )}

            {(chatMode === 'campfire' ? campfireHistory : selectedHistory).map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-emerald-700/45 text-emerald-50' : 'bg-orange-700/35 text-orange-50'}`}>
                <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-300/90">{m.role === 'user' ? playerName : m.speaker || selectedCastaway?.name}</div>
                {m.typing && !m.text ? (
                  <div className="flex items-center gap-1 py-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:240ms]" />
                  </div>
                ) : (
                  <div className={m.typing ? 'font-medium' : ''}>{m.text}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={conversationInput}
              onChange={(e) => setConversationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (chatMode === 'campfire') {
                    sendCampfireConversation();
                  } else {
                    sendConversation();
                  }
                }
              }}
              disabled={(chatMode !== 'campfire' && !selectedCastaway) || chatInFlight}
              placeholder={chatMode === 'campfire' ? 'Address the campfire...' : selectedCastaway ? `Ask ${selectedCastaway.name} something...` : 'Pick a castaway first...'}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm outline-none ring-orange-300/0 transition focus:border-orange-300/70 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              onClick={chatMode === 'campfire' ? sendCampfireConversation : sendConversation}
              disabled={!canSendConversation}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-700/60 bg-black/45 p-4">
          <h3 className="text-lg font-semibold text-emerald-200">Briefing</h3>
          {playerHasImmunity && (
            <div className="mt-2 rounded-xl border border-yellow-300/45 bg-yellow-700/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-yellow-100">
              You won immunity. You cannot be voted out tonight.
            </div>
          )}
          {!playerHasImmunity && immuneCastawayName && (
            <div className="mt-2 rounded-xl border border-yellow-300/45 bg-yellow-700/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-yellow-100">
              {immuneCastawayName} won immunity and is safe tonight.
            </div>
          )}
          <p className="mt-2 text-sm text-zinc-300">Speak to whoever you want, for as long as you need. Everyone's hiding something. When you think you've figured it out - head to Tribal Council.</p>
          <button onClick={openTribalPhase} className="mt-5 w-full rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-sm font-bold text-zinc-100 animate-pulseGlow">
            Head to Tribal Council 🔥
          </button>
          <div className="mt-2 flex justify-end">
            <HelpTip text="Once you leave for tribal, there's no coming back. Make sure you know your vote." />
          </div>
        </div>
      </div>
    </section>
  );
}
