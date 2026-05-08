/*
 * audio.js
 * ──────────────────────────────────────────────────────────────
 * Background music management.
 * Determines the correct BGM track for each game state / layer and handles smooth transitions between tracks.
 * ──────────────────────────────────────────────────────────────
 */


/**
 * Determines the correct BGM track for the current game state and layer.
 * Smoothly transitions between tracks by stopping the old one before starting the new one. 
 * Called once per frame from draw().
 */
function manageBGM() {
    let targetBGM;

    // Select target track based on where the player currently is
    if (gameState === "START") {
        targetBGM = bgmSupernatural;
    } else if (gameState === "INSTRUCTIONS") {
        targetBGM = bgmAsap;
    } else if (gameState === "POPUP") {
        targetBGM = bgmMidnight;
    } else if (gameState === "PLAY") {
        if      (currentLayer === "MAP")        targetBGM = bgmTheChase;
        else if (currentLayer === "RIVER")      targetBGM = bgmButterflies;
        else if (currentLayer === "STUDIO")     targetBGM = bgmRightNow;
        else if (currentLayer === "FOREST")     targetBGM = bgmDitto;
        else if (currentLayer === "GREENHOUSE") targetBGM = bgmOmg;
    }

    // Only swap tracks if the target has changed
    if (currentBGM !== targetBGM) {
        if (currentBGM) currentBGM.stop();
        currentBGM = targetBGM;
        if (currentBGM) {
            currentBGM.loop();
            currentBGM.setVolume(0.2);
        }
    }
}

// Advances the growth timer of every active plant each frame.
function updateGlobalPlants() {
    for (let p of activePlants) {
        p.update();
    }
}
