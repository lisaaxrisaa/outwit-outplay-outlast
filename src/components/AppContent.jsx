import React from 'react';
import Header from './layout/Header';
import MeetPhase from './phases/MeetPhase';
import ImmunityIntroPhase from './phases/ImmunityIntroPhase';
import ImmunityPepPhase from './phases/ImmunityPepPhase';
import ImmunityPuzzlePhase from './phases/ImmunityPuzzlePhase';
import ImmunityResultPhase from './phases/ImmunityResultPhase';
import ArrivalIntroPhase from './phases/ArrivalIntroPhase';
import ConversationPhase from './phases/ConversationPhase';
import TribalPhase from './phases/TribalPhase';
import RevealPhase from './phases/RevealPhase';
import BetweenRoundsPhase from './phases/BetweenRoundsPhase';
import GameSummaryPhase from './phases/GameSummaryPhase';
import FinalPhase from './phases/FinalPhase';
import CastawayNotesModal from './common/CastawayNotesModal';

export default function AppContent(props) {
  const {
    phase,
    playerName,
    playerOccupation,
    resetGame,
    error,
    playerNameInput,
    setPlayerNameInput,
    playerOccupationInput,
    setPlayerOccupationInput,
    generateCastaways,
    generatingCastaways,
    generatingCastawaysLabel,
    campArrivalLoading,
    campArrivalIntroMessages,
    joinArrivalConversation,
    immunityType,
    startImmunityChallenge,
    immunityPepLoading,
    immunityPepTalk,
    setPhase,
    immunityTimer,
    slidingBoard,
    handleSlidingClick,
    memoryDeck,
    handleMemoryClick,
    cipherData,
    cipherGuess,
    setCipherGuess,
    submitCipherGuess,
    mazeGrid,
    mazePos,
    moveMaze,
    jigsawPieces,
    jigsawSelected,
    handleJigsawClick,
    jigsawImageUrl,
    refreshJigsawImage,
    ropeChallenge,
    ropeCrossings,
    setRopeNodePosition,
    sequenceChallenge,
    sequenceSymbols,
    handleSequenceClick,
    waterChallenge,
    handleWaterContainerClick,
    torchChallenge,
    torchStatus,
    rotateTorchCell,
    castaways,
    castawayRaceProgress,
    castawayRaceWinner,
    castawayRaceTick,
    giveUpImmunityChallenge,
    castawayNotesById,
    openCastawayNotes,
    immunityResult,
    selectedCastawayId,
    setSelectedCastawayId,
    chatMode,
    setChatMode,
    campfireInvites,
    toggleCampfireInvite,
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
    openTribalPhase,
    startImmunityFromArrival,
    startNextImmunityChallengeFromDebrief,
    debriefLoading,
    debriefIntroMessages,
    playerHasImmunity,
    immuneCastawayName,
    searchCamp,
    canSearchCamp,
    idolRevealMoment,
    setIdolRevealMoment,
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
    playerHasIdol,
    idolPlantRecipientName,
    setIdolPlantRecipientName,
    leaveIdolAtCampZone,
    closeCampSearch,
    phaseTwoOnboardingDismissed,
    setPhaseTwoOnboardingDismissed,
    socialAmbientNotices,
    castawayCurrentlySearching,
    relationshipIntelByName,
    currentRound,
    castawayApproachesById,
    acceptCastawayApproach,
    dismissCastawayApproach,
    offerIdolToCastawayPrivately,
    pendingCastawayIdolOffer,
    acceptCastawayIdolOffer,
    declineCastawayIdolOffer,
    tribalScrollRef,
    tribalHostLoading,
    tribalPublicHistory,
    tribalVoteCalled,
    tribalStarted,
    tribalChatInput,
    setTribalChatInput,
    sendTribalMessage,
    tribalSelection,
    setTribalSelection,
    tribalVoteConfirming,
    setTribalVoteConfirming,
    runTribalCouncil,
    playerHasFakeIdol,
    idolPlayTarget,
    setIdolPlayTarget,
    idolGiveTarget,
    setIdolGiveTarget,
    playPlayerIdol,
    givePlayerIdolAtTribal,
    idolPlayedByPlayer,
    idolPlayedFakeByPlayer,
    idolProtectedName,
    idolAnnouncement,
    shownVotes,
    revealedVotesCount,
    votes,
    eliminatedName,
    revealLoading,
    revealData,
    revealContinueLoading,
    handleRevealContinue,
    totalRounds,
    betweenRoundBriefLoading,
    betweenRoundSummary,
    betweenRoundLinks,
    beginRound2,
    roundRecap,
    finalGameSummary,
    notifyEmail,
    setNotifyEmail,
    submitNotify,
    notifyMessage,
    notifySubmitting,
    activeNotesCastaway,
    setCastawayNote,
    closeCastawayNotes
  } = props;

  return (
    <div className="relative min-h-full overflow-x-hidden text-zinc-100">
      <div className="absolute inset-0 torch-overlay pointer-events-none" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {phase !== 'arrival_intro' && <Header phase={phase} playerName={playerName} playerOccupation={playerOccupation} onResetGame={resetGame} />}

        {error && <div className="mb-4 rounded-xl border border-red-400/40 bg-red-900/30 px-4 py-3 text-sm text-red-100 animate-fadeIn">{error}</div>}

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

        {phase === 'arrival_intro' && <ArrivalIntroPhase loading={campArrivalLoading} introMessages={campArrivalIntroMessages} onJoin={joinArrivalConversation} />}
        {phase === 'immunity_intro' && <ImmunityIntroPhase immunityType={immunityType} startImmunityChallenge={startImmunityChallenge} />}

        {phase === 'immunity_pep' && <ImmunityPepPhase immunityPepLoading={immunityPepLoading} immunityPepTalk={immunityPepTalk} setPhase={setPhase} />}

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
            sequenceSymbols={sequenceSymbols}
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

        {phase === 'immunity_result' && immunityResult && <ImmunityResultPhase immunityResult={immunityResult} immunityType={immunityType} setPhase={setPhase} />}

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
            canSearchCamp={canSearchCamp}
            idolRevealMoment={idolRevealMoment}
            dismissIdolReveal={() => setIdolRevealMoment('')}
            searchCount={searchCount}
            maxCampSearches={maxCampSearches}
            searchSuspicionScore={searchSuspicionScore}
            campSearchOpen={campSearchOpen}
            campSearchTurnsLeft={campSearchTurnsLeft}
            campSearchEnergy={campSearchEnergy}
            campSearchSuspicion={campSearchSuspicion}
            campSearchZoneId={campSearchZoneId}
            campSearchLog={campSearchLog}
            idolSearchProgress={idolSearchProgress}
            idolSearchClues={idolSearchClues}
            campZones={campZones}
            canThoroughSearch={canThoroughSearch}
            selectCampSearchZone={selectCampSearchZone}
            runCampSearchAction={runCampSearchAction}
            playerHasIdol={playerHasIdol}
            idolPlantRecipientName={idolPlantRecipientName}
            setIdolPlantRecipientName={setIdolPlantRecipientName}
            leaveIdolAtCampZone={leaveIdolAtCampZone}
            closeCampSearch={closeCampSearch}
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
            continueLoadingLabel={currentRound < totalRounds ? 'Preparing Round 2 Briefing...' : 'Building Final Season Summary...'}
            castawayNotesById={castawayNotesById}
            openCastawayNotes={openCastawayNotes}
            onContinue={handleRevealContinue}
            continueLabel={currentRound < totalRounds ? 'View Round 2 Briefing' : 'View Final Season Summary'}
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

        {phase === 'game_end' && <GameSummaryPhase roundRecap={roundRecap} finalSummary={finalGameSummary} continueToEmail={() => setPhase('final')} />}

        {phase === 'final' && (
          <FinalPhase
            notifyEmail={notifyEmail}
            setNotifyEmail={setNotifyEmail}
            submitNotify={submitNotify}
            notifyMessage={notifyMessage}
            notifySubmitting={notifySubmitting}
          />
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
