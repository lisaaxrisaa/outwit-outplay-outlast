import React from 'react';

export default function TribalPhase(props) {
  const {
    tribalScrollRef,
    tribalHostLoading,
    tribalPublicHistory,
    playerName,
    tribalVoteCalled,
    tribalStarted,
    tribalChatInput,
    setTribalChatInput,
    sendTribalMessage,
    chatInFlight,
    playerHasImmunity,
    immuneCastawayName,
    castaways,
    tribalSelection,
    setTribalSelection,
    tribalVoteConfirming,
    setTribalVoteConfirming,
    runTribalCouncil,
    playerHasIdol,
    playerHasFakeIdol,
    idolPlayTarget,
    setIdolPlayTarget,
    playPlayerIdol,
    idolPlayedByPlayer,
    idolPlayedFakeByPlayer,
    idolProtectedName,
    idolAnnouncement,
    shownVotes,
    revealedVotesCount,
    votes,
    eliminatedName
  } = props;

  return (
    <section className="min-h-[62vh] animate-fadeIn">
      <div className="mx-auto max-w-4xl rounded-3xl border border-orange-300/30 bg-black/75 p-6 backdrop-blur-md sm:p-8">
        <h2 className="text-center font-display text-5xl tracking-wider text-orange-200">Tribal Council</h2>
        <p className="mt-2 text-center text-sm text-zinc-300">The torches are lit. Pick one castaway to vote out.</p>

        <div
          ref={tribalScrollRef}
          className="mt-6 max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-zinc-700/70 bg-zinc-950/50 p-4"
        >
          {tribalHostLoading && tribalPublicHistory.length === 0 && (
            <div className="text-center italic text-amber-200 animate-flicker">The fire pops as the host studies every face...</div>
          )}
          {tribalPublicHistory.map((m) => (
            <div key={m.id}>
              {m.role === 'host' ? (
                <div className="mx-auto max-w-[88%] text-center italic text-amber-200">
                  {m.typing && !m.text ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-200 [animation-delay:240ms]" />
                    </span>
                  ) : (
                    m.text
                  )}
                </div>
              ) : m.role === 'player' ? (
                <div className="ml-auto max-w-[85%] rounded-xl bg-emerald-700/45 px-3 py-2 text-sm text-emerald-50">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-300/90">{playerName}</div>
                  <div>{m.text}</div>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-xl bg-orange-700/35 px-3 py-2 text-sm text-orange-50">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-300/90">{m.speaker}</div>
                  {m.typing && !m.text ? (
                    <div className="flex items-center gap-1 py-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-200 [animation-delay:240ms]" />
                    </div>
                  ) : (
                    <div>{m.text}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!tribalVoteCalled && !tribalStarted && (
          <div className="mt-4">
            <div className="mb-2 text-xs text-zinc-400">
              Speak into the group. Anyone can jump in, and the host will call the vote when the moment is right.
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tribalChatInput}
                onChange={(e) => setTribalChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendTribalMessage();
                  }
                }}
                disabled={chatInFlight || tribalHostLoading}
                placeholder="What do you say at tribal?"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 outline-none ring-orange-300/0 transition focus:border-orange-300/70 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                onClick={sendTribalMessage}
                disabled={!tribalChatInput.trim() || chatInFlight || tribalHostLoading}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {tribalVoteCalled && !tribalStarted && (
          <div className="mt-6 rounded-2xl border border-orange-300/30 bg-black/40 p-4 animate-fadeIn">
            <div className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-orange-200">Cast Your Vote</div>
            {(playerHasIdol || playerHasFakeIdol) && (
              <div className="mb-4 rounded-xl border border-yellow-300/45 bg-yellow-700/15 p-3">
                <div className="mb-2 text-xs uppercase tracking-widest text-yellow-100">Hidden Idol</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={idolPlayTarget}
                    onChange={(e) => setIdolPlayTarget(e.target.value)}
                    className="rounded-lg border border-zinc-600 bg-zinc-900/70 px-2 py-1 text-xs text-zinc-100"
                  >
                    {[...castaways.map((c) => c.name), playerName].map((name) => (
                      <option key={name} value={name}>
                        Protect {name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={playPlayerIdol}
                    disabled={idolPlayedByPlayer}
                    className="rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 disabled:opacity-55"
                  >
                    Play Idol 🔥
                  </button>
                </div>
              </div>
            )}
            {idolAnnouncement && (
              <div className="mb-3 rounded-xl border border-yellow-300/45 bg-yellow-700/20 px-3 py-2 text-center text-xs text-yellow-100">
                {idolAnnouncement}
              </div>
            )}
            {playerHasImmunity && (
              <div className="mb-3 text-center text-xs text-amber-200">You hold immunity tonight and cannot be voted out.</div>
            )}
            {immuneCastawayName && (
              <div className="mb-3 text-center text-xs text-amber-200">{immuneCastawayName} won immunity and cannot be voted out.</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ...castaways.map((c) => c.name).filter((name) => name !== immuneCastawayName),
                ...(playerHasImmunity ? [] : [playerName])
              ]
                .filter((name) => !(idolPlayedByPlayer && !idolPlayedFakeByPlayer && idolProtectedName === name))
                .map((name) => (
                <label
                  key={name}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    tribalSelection === name
                      ? 'border-orange-300 bg-orange-600/20 text-orange-100'
                      : 'border-zinc-700 bg-zinc-900/55 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  <span>{name}</span>
                  <input
                    type="radio"
                    name="tribalVote"
                    checked={tribalSelection === name}
                    onChange={() => setTribalSelection(name)}
                  />
                </label>
                ))}
            </div>
            {!tribalVoteConfirming ? (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setTribalVoteConfirming(true)}
                  disabled={!tribalSelection}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Lock this vote
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-red-300/45 bg-red-900/20 p-4 animate-fadeIn">
                <div className="text-center text-xs uppercase tracking-[0.22em] text-red-200">Final Confirmation</div>
                <div className="mt-2 text-center text-sm text-zinc-300">You are writing down:</div>
                <div className="mt-1 text-center font-display text-4xl tracking-wide text-red-100">{tribalSelection}</div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => runTribalCouncil(tribalSelection)}
                    className="rounded-xl bg-gradient-to-r from-red-500 to-red-400 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Write the name down ✍️
                  </button>
                  <button
                    onClick={() => setTribalVoteConfirming(false)}
                    className="rounded-xl border border-zinc-600 bg-zinc-900/70 px-5 py-2.5 text-sm font-semibold text-zinc-200"
                  >
                    Go back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tribalStarted && (
          <div className="mt-8 space-y-3">
            {idolAnnouncement && (
              <div className="mx-auto max-w-xl rounded-xl border border-yellow-300/45 bg-yellow-700/20 px-3 py-2 text-center text-xs text-yellow-100 animate-fadeIn">
                {idolAnnouncement}
              </div>
            )}
            <h3 className="text-center text-lg font-semibold text-orange-100">Votes are being read...</h3>
            <div className="mx-auto max-w-xl space-y-2">
              {shownVotes.map((v, idx) => (
                <div
                  key={`${v.name}-${idx}`}
                  className="rounded-xl border border-orange-300/25 bg-zinc-950/70 px-4 py-3 text-center text-sm animate-fadeIn"
                >
                  <span className="text-zinc-300">{v.name} voted for </span>
                  <span className="font-semibold text-orange-200">{v.votedFor}</span>
                </div>
              ))}
            </div>

            {revealedVotesCount >= votes.length && eliminatedName && (
              <div className="mt-6 rounded-2xl border border-red-300/40 bg-red-900/25 p-5 text-center animate-fadeIn">
                <div className="text-sm uppercase tracking-widest text-red-200">Eliminated</div>
                <div className="mt-2 font-display text-5xl tracking-wide text-red-100">{eliminatedName}</div>
                <p className="mt-2 text-sm text-zinc-300">Your vote: {tribalSelection}</p>
                <p className="mt-3 text-xs text-zinc-400">Compiling the truth reveal dossier from every alliance and confession...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
