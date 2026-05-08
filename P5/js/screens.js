/*
 * screens.js
 */

// ============================================================
//  SHARED HELPERS
// ============================================================

function drawFocusOrb(x, y) {
    let pulse = 18 + 7 * sin(millis() / 400);
    let alpha = 130 + 80 * sin(millis() / 400);
    noStroke();
    fill(255, 255, 180, alpha);
    ellipse(x, y, pulse, pulse);
}

// Upper HUD — styled to match original midterm buttons (brown/green palette)
function drawUpperHUD() {
    // Subtle dark tint across the top
    fill(0, 100);
    noStroke();
    rect(0, 0, width, 55);

    if (currentLayer !== 'MAP') {
        let backActive = focusIndex === 0;
        fill(backActive ? color(100, 160, 90) : color(60, 110, 60));
        stroke(255); strokeWeight(1);
        rect(width - 240, 8, 140, 38, 8);
        noStroke();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        text('RETURN TO MAP', width - 170, 27);
        if (backActive) {
            noStroke(); fill(255, 255, 255, 40);
            rect(width - 240, 8, 140, 38, 8);
        }
    }

    let menuActive = (currentLayer === 'MAP') ? true : focusIndex === 1;
    fill(menuActive ? color(100, 160, 90) : color(60, 110, 60));
    stroke(255); strokeWeight(1);
    rect(width - 90, 8, 80, 38, 8);
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('MENU', width - 50, 27);
    if (menuActive) {
        noStroke(); fill(255, 255, 255, 40);
        rect(width - 90, 8, 80, 38, 8);
    }
}

// Lower HUD — highlight on the backpack icon
function drawLowerHUD() {
    let pulse = 25 + 12 * sin(millis() / 400);
    let alpha = 70 + 50 * sin(millis() / 400);
    noStroke();
    for (let r = pulse * 2.5; r > 0; r -= 6) {
        fill(255, 220, 150, alpha * (r / (pulse * 2.5)) * 0.5);
        ellipse(width - 60, height - 60, r * 2, r * 2);
    }
}

// Highlight overlay for focused menu buttons
function drawButtonHighlight(x, y, w, h) {
    noFill();
    stroke(255, 180);
    strokeWeight(7);
    rect(x, y, w, h, 8);
    noStroke();
}

// ============================================================
//  MENU SCREENS
// ============================================================

function displayMainMenu() {
    noCursor();
    image(mmImage, 0, 0, width, height);

    // Highlight focused button with a visible white overlay
    if (mainMenuFocusIndex === 0) drawButtonHighlight(width / 2 - 110, height / 2 + 10, 220, 50);
    if (mainMenuFocusIndex === 1) drawButtonHighlight(width / 2 - 110, height / 2 + 80, 220, 50);

    drawMenuButton(width / 2 - 110, height / 2 + 10, 220, 50, "PLAY",        () => { changeState("PLAY"); },         color('#543421'));
    drawMenuButton(width / 2 - 110, height / 2 + 80, 220, 50, "HOW TO PLAY", () => { instructionFocusIndex = 0; changeState("INSTRUCTIONS"); }, color('#543421'));
}

function displayInstructionHub() {
    noCursor();
    image(bgImage, 0, 0, width, height);
    fill(0, 220);
    rect(0, 0, width, height);

    fill(255);
    textAlign(CENTER);
    textSize(32);
    text("HOW TO PLAY", width / 2, 60);

    let categories = ["GENERAL", "FOREST", "RIVER", "STUDIO", "GREENHOUSE"];

    for (let i = 0; i < categories.length; i++) {
        if (instructionFocusIndex === i) drawButtonHighlight(60, 130 + (i * 65), 180, 45);
        drawMenuButton(60, 130 + (i * 65), 180, 45, categories[i], () => { instructionType = categories[i]; });
    }

    // Back button
    if (instructionFocusIndex === 5) drawButtonHighlight(width / 2 - 100, 490, 200, 50);
    drawMenuButton(width / 2 - 100, 490, 200, 50, "BACK", () => {
        changeState(cameFromGame ? 'POPUP' : 'START');
    });

    // Text panel
    fill(255, 30);
    stroke(255);
    rect(280, 130, 680, 310, 10);
    noStroke();
    fill(255);
    textAlign(LEFT, TOP);
    textSize(14);
    text(getInstructionText(instructionType), 310, 160, 620, 260);
}

function displayMidGameMenu() {
    fill(0, 200);
    rect(0, 0, width, height);

    fill(255);
    textAlign(CENTER);
    textSize(40);
    text("PAUSED", width / 2, height / 2 - 120);

    let options = [
        { label: "RESUME",       action: () => { changeState("PLAY"); focusZone = 'MAIN'; } },
        { label: "HOW TO PLAY",  action: () => { cameFromGame = true; instructionFocusIndex = 0; changeState("INSTRUCTIONS"); } },
        { label: "QUIT TO MENU", action: () => { resetGame(); changeState("START"); } }
    ];

    let idx = constrain(pauseMenuIndex, 0, options.length - 1);

    for (let i = 0; i < options.length; i++) {
        if (i === idx) drawButtonHighlight(width / 2 - 125, height / 2 - 50 + (i * 70), 250, 50);
        drawMenuButton(width / 2 - 125, height / 2 - 50 + (i * 70), 250, 50, options[i].label, options[i].action);
    }

    if (sensorState.joyBtn === 0 && !btnPressed) {
        btnPressed = true;
        options[idx].action();
    }
    if (sensorState.joyBtn !== 0) btnPressed = false;
}


// ============================================================
//  GAMEPLAY LOOP
// ============================================================

function runGameLoop() {
    background(220);

    if (currentLayer !== "STUDIO")     { sfxWheel.stop(); sfxFurnace.stop(); }
    if (currentLayer !== "GREENHOUSE") { sfxWatering.stop(); }

    if      (currentLayer === "MAP")        displayMap();
    else if (currentLayer === "GREENHOUSE") displayGreenhouse();
    else if (currentLayer === "RIVER")      displayRiver();
    else if (currentLayer === "FOREST")     displayForest();
    else if (currentLayer === "STUDIO")     displayStudio();

    // Only draw backpack icon — no old back/menu buttons

    if (focusZone === 'UPPER_HUD') drawUpperHUD();
    if (focusZone === 'LOWER_HUD') drawLowerHUD();
    drawBackpackIcon();
    if (isInventoryOpen) drawInventoryOverlay();
    drawCustomCursor();
}


// ============================================================
//  SCENE RENDERERS
// ============================================================

function displayMap() {
    image(bgImage, 0, 0, width, height);

    // Only draw orb when in MAIN focus (not during POPUP nav)
    if (gameState !== 'PLAY' || focusZone !== 'MAIN') return;

    let loc = MAP_LOCATIONS[focusIndex % MAP_LOCATIONS.length];
    let [ex, ey] = MAP_ENTRANCES[loc];

    let pulse = 22 + 8 * sin(millis() / 400);
    let alpha = 140 + 80 * sin(millis() / 400);
    noStroke();
    fill(255, 255, 180, alpha);
    ellipse(ex, ey, pulse, pulse);

    fill(255, 255, 220, 180 + 60 * sin(millis() / 400));
    textAlign(CENTER, BOTTOM);
    textSize(15);
    text(loc, ex, ey - 18);
}

function displayRiver() {
    image(riverImage, 0, 0, width, height);

    // Update virtual cursor
    if (gameState === 'PLAY') updateVirtualCursor();

    // Upper HUD entry when bucket reaches the top
    let overUpperHUD = joyVirtualY < RIVER_UPPER_HUD_THRESHOLD;
    // Lower HUD entry when bucket is directly over the backpack icon
    let overBackpack = joyVirtualX > width - 110 && joyVirtualY > height - 110;

    if (overUpperHUD && focusZone === 'MAIN') {
        focusZone = 'UPPER_HUD';
        focusIndex = 0;
    }
    if (overBackpack && focusZone === 'MAIN' && hasWaterInBucket) {
        // Deposit water directly when dragged over backpack
        inventory.water++;
        hasWaterInBucket = false;
        sfxBucketFill.play();
    }
    // Return to MAIN when bucket moves away from upper HUD
    if (!overUpperHUD && focusZone === 'UPPER_HUD') {
        focusZone = 'MAIN';
    }

    // Only hide bucket in upper HUD
    if (focusZone !== 'UPPER_HUD') {
        imageMode(CENTER);
        image(hasWaterInBucket ? filledBucket : unfilledBucket, joyVirtualX, joyVirtualY, 80, 80);
        imageMode(CORNER);
    }
}

function displayForest() {
    image(forestImage, 0, 0, width, height);

    for (let plot of forestPlots) {
        plot.update();
        plot.display();
    }

    // Shovel sensor triggers harvest
    for (let i = 0; i < forestPlots.length; i++) {
        if (sensorState.dig[i] === 1 && forestPlots[i].ready && heldResource === null) {
            heldResource = forestPlots[i].type;
            forestPlots[i].harvest();
            activeDigPlotIndex = i;
            sfxShovel.play();
        }
    }

    // Draw shovel:
    // — Over the active plot while digging
    // — Stationary above backpack when idle
    let shovelImg = (heldResource === 'clay') ? shovelClay
                  : (heldResource === 'soil') ? shovelSoil
                  : shovel;

    imageMode(CENTER);
    if (activeDigPlotIndex >= 0 && activeDigPlotIndex < forestPlots.length) {
        let px = forestPlots[activeDigPlotIndex].x;
        let py = forestPlots[activeDigPlotIndex].y;
        image(shovelImg, px, py - 20, 80, 80);
    } else {
        image(shovelImg, width - 60, height - 140, 80, 80);
    }
    imageMode(CORNER);
}

function displayGreenhouse() {
    image(greenhouseImage, 0, 0, width, height);

    // Highlight focused plot slot
    if (focusZone === 'MAIN' && plotLocations.length > 0) {
        let fp = plotLocations[greenhouseFocusRow * GREENHOUSE_COLS + greenhouseFocusCol];
        if (fp) {
            noFill();
            stroke(255, 180);
            strokeWeight(3);
            rect(fp.x, fp.y, fp.w, fp.h, 4);
            noStroke();
        }
    }

    for (let p of activePlants) p.display();

    for (let i = activeWateringEvents.length - 1; i >= 0; i--) {
        activeWateringEvents[i].update();
        activeWateringEvents[i].display();
        if (activeWateringEvents[i].isFinished) activeWateringEvents.splice(i, 1);
    }

    // Discard pour if no plant is waiting — prevents carry-over to next plant
    if (waterPoured && pendingWaterPlot === null) waterPoured = false;

    // Water sensor only — starts growth and shows animation
    if (pendingWaterPlot !== null && waterPoured && !waterDebounced) {
        waterPoured = false;
        activeWateringEvents.push(new WateringEvent(pendingWaterPlot.x, pendingWaterPlot.y));
        let wp = activePlants.find(p => dist(p.x, p.y, pendingWaterPlot.x, pendingWaterPlot.y) < 10);
        if (wp) { wp.waiting = false; wp.birthTime = millis(); }
        pendingWaterPlot = null;
        waterDebounced = true;
        setTimeout(() => { waterDebounced = false; }, 4000);
    }
}

function displayStudio() {
    image(studioImage, 0, 0, width, height);

    let handsClose = sensorState.prox > 400;
    let furnaceOn  = sensorState.pot > 600;

    // ── Pottery Wheel ──
    if (wheelState !== 'EMPTY') {
        if (wheelState === 'SHAPING') {
            if (handsClose) {
                if (!sfxWheel.isPlaying()) sfxWheel.loop();
                let speedMultiplier = map(sensorState.prox, 400, 1023, 1, 4);
                if (millis() - shapingTimer > 5000 / speedMultiplier) {
                    shapingFrame = min(shapingFrame + 1, 3);
                    shapingTimer = millis();
                }
            } else {
                sfxWheel.stop();
            }
            if (shapingFrame === 3) { wheelState = 'READY_TO_DRAG'; sfxWheel.stop(); }
        }

        if (!potCarrying && !isDraggingFromWheel) {
            push();
            imageMode(CENTER);
            translate(WHEEL_X, WHEEL_Y);
            if (wheelState === 'SHAPING' && handsClose && frameCount % 20 < 10) scale(-1, 1);
            drawPotFrame(0, 0, shapingFrame, 200, 200);
            pop();
        }
    }

    // ── Pot carried by virtual cursor ──
    if (potCarrying) {
        if (gameState === 'PLAY') updateVirtualCursor();
        push();
        imageMode(CENTER);
        drawPotFrame(joyVirtualX, joyVirtualY, 3, 100, 100);
        pop();
    }

    // ── Mouse drag fallback ──
    push();
    imageMode(CENTER);
    if (isDraggingFromWheel)   drawPotFrame(mouseX, mouseY, 3, 100, 100);
    if (isDraggingFromFurnace) drawPotFrame(mouseX, mouseY, furnacePotFrame, 70, 70);
    pop();

    // ── Furnace ──
    // State machine:
    //   EMPTY              — nothing in furnace
    //   PLACED             — pot inside, fire OFF, waiting for player to turn dial up
    //   FIRING             — fire ON, pot cooking, timer running
    //   READY_TO_COLLECT   — cooked (fire must be OFF to pick up)
    //   BURNT              — overcooked
    //   ASH                — destroyed

    if (furnaceState !== 'EMPTY' && !isDraggingFromFurnace) {

        if (furnaceState === 'PLACED') {
            // Waiting for fire — show raw clay frame, no sound
            furnacePotFrame = 3;
            if (furnaceOn) {
                // Fire turned on — begin cooking
                furnaceState = 'FIRING';
                furnaceStartTime = millis();
                sfxFurnace.loop();
            }
        }

        if (furnaceState === 'FIRING') {
            if (furnaceOn) {
                // Keep fire audio looping
                if (!sfxFurnace.isPlaying()) sfxFurnace.loop();
                let elapsed = (millis() - furnaceStartTime) / 1000;
                if      (elapsed < 10)  furnacePotFrame = 3;
                else if (elapsed < 15) { furnacePotFrame = 4; furnaceState = 'READY_TO_COLLECT'; }
                else if (elapsed < 20) { furnacePotFrame = 5; furnaceState = 'BURNT'; }
                else                   { furnacePotFrame = 6; furnaceState = 'ASH'; sfxFurnace.stop(); }
            } else {
                // Fire turned off mid-cook — pause cooking, stop sound
                sfxFurnace.stop();
                // Freeze state — stay as FIRING but timer is paused
                // (player must turn fire back on to continue)
            }
        }

        if (furnaceState === 'READY_TO_COLLECT') {
            if (furnaceOn) {
                // Fire still on after cooking — keep burning toward BURNT
                if (!sfxFurnace.isPlaying()) sfxFurnace.loop();
                let elapsed = (millis() - furnaceStartTime) / 1000;
                if (elapsed >= 20) { furnacePotFrame = 5; furnaceState = 'BURNT'; }
                if (elapsed >= 25) { furnacePotFrame = 6; furnaceState = 'ASH'; sfxFurnace.stop(); }
            }
            // Fire off — pot is safe to collect, no sound
        }

        imageMode(CENTER);
        drawPotFrame(FURNACE_X, FURNACE_Y, furnacePotFrame, 70, 70);
    }

    // ── Focus orbs ──
    if (focusZone === 'MAIN' && !potCarrying) {
        if (focusIndex === 0) drawFocusOrb(WHEEL_X, WHEEL_Y);
        if (focusIndex === 1) drawFocusOrb(FURNACE_X, FURNACE_Y);
    }
}