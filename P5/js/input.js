/*
 * input.js
 */

// ============================================================
//  WEB SERIAL
// ============================================================

let port;
let connectBtn;
let baudrate = 9600;

function setupSerial() {
    port = createSerial();
    connectBtn = createButton('Connect Controller');
    connectBtn.position(10, height + 10);
    connectBtn.style('font-size', '14px');
    connectBtn.style('padding', '6px 14px');
    connectBtn.style('cursor', 'pointer');
    connectBtn.mousePressed(connectToSerial);
}

function connectToSerial() {
    if (!port.opened()) port.open(baudrate);
}

function readSerialData() {
    let line = port.readUntil('\n');
    if (line.length > 0) parseSerial(trim(line));
}

function parseSerial(line) {
    let parts = line.split(',');
    if (parts.length < 11) return;
    sensorState.joyX   = int(parts[0]);
    sensorState.joyY   = int(parts[1]);
    sensorState.joyBtn = int(parts[2]);
    sensorState.prox   = int(parts[3]);
    sensorState.pot    = int(parts[4]);
    sensorState.water  = int(parts[5]);
    for (let i = 0; i < 5; i++) sensorState.dig[i] = int(parts[6 + i]);
    // Rising edge detection — only set waterPoured on the transition from dry to wet
    if (sensorState.water > 530 && !waterSensorWasWet) {
        waterPoured = true;
        waterSensorWasWet = true;
    }
    if (sensorState.water <= 530) waterSensorWasWet = false;
}


// ============================================================
//  VIRTUAL CURSOR
// ============================================================

function updateVirtualCursor() {
    let jx = sensorState.joyX;
    let jy = sensorState.joyY;
    if (jx < 300) joyVirtualX -= JOY_CURSOR_SPEED;
    if (jx > 700) joyVirtualX += JOY_CURSOR_SPEED;
    if (jy < 300) joyVirtualY -= JOY_CURSOR_SPEED;
    if (jy > 700) joyVirtualY += JOY_CURSOR_SPEED;
    joyVirtualX = constrain(joyVirtualX, 0, width);
    joyVirtualY = constrain(joyVirtualY, 0, height);
}


// ============================================================
//  JOYSTICK READING
// ============================================================

function readJoystick() {
    // Block all joystick input when inventory is open
    let jx = sensorState.joyX;
    let jy = sensorState.joyY;
    let left  = jx < 300;
    let right = jx > 700;
    let up    = jy < 300;
    let down  = jy > 700;
    let idle  = !left && !right && !up && !down;

    if (idle) { joyMoved = false; return; }
    if (joyMoved) return;
    joyMoved = true;

    // Block all navigation while inventory is open
    if (isInventoryOpen) return;

    // ── Main menu ──
    if (gameState === 'START') {
        if (up)   mainMenuFocusIndex = 0;
        if (down) mainMenuFocusIndex = 1;
        return;
    }

    // ── Instructions hub ──
    // Down cycles 0→5 and stops at 5 (back button) — no wrap
    // Up cycles 5→0 and stops at 0 — no wrap
    if (gameState === 'INSTRUCTIONS') {
        let total = 6; // 0-4 = categories, 5 = back
        if (down) instructionFocusIndex = min(instructionFocusIndex + 1, total - 1);
        if (up)   instructionFocusIndex = max(instructionFocusIndex - 1, 0);
        let cats = ["GENERAL", "FOREST", "RIVER", "STUDIO", "GREENHOUSE"];
        if (instructionFocusIndex < 5) instructionType = cats[instructionFocusIndex];
        return;
    }

    // ── Pause menu ──
    // Joystick nav only — do NOT affect scene focusIndex
    if (gameState === 'POPUP') {
        if (up)   pauseMenuIndex = max(pauseMenuIndex - 1, 0);
        if (down) pauseMenuIndex = min(pauseMenuIndex + 1, 2);
        return;
    }

    if (gameState !== 'PLAY') return;

    // ── River: virtual cursor moves freely ──
    if (currentLayer === 'RIVER' && focusZone === 'MAIN') {
        updateVirtualCursor();
        // Still allow up/down to enter HUD zones
        if (up) { focusZone = 'UPPER_HUD'; focusIndex = 0; return; }
        if (down) { focusZone = 'LOWER_HUD'; focusIndex = 0; return; }
        return;
    }

    // ── Studio carrying pot: virtual cursor ──
    if (currentLayer === 'STUDIO' && potCarrying) {
        updateVirtualCursor();
        return;
    }

    // ── Greenhouse grid — intercept before HUD checks ──
    if (currentLayer === 'GREENHOUSE' && focusZone === 'MAIN') {
        // At top row, up enters upper HUD
        if (up && greenhouseFocusRow === 0) {
            lastFocusZone = 'MAIN';
            focusZone = 'UPPER_HUD';
            focusIndex = 0;
            return;
        }
        // At bottom row, down enters lower HUD
        if (down && greenhouseFocusRow === GREENHOUSE_ROWS - 1) {
            lastFocusZone = 'MAIN';
            focusZone = 'LOWER_HUD';
            focusIndex = 0;
            return;
        }
        handleSceneNav(up, down, left, right);
        return;
    }

    // ── Upper HUD entry ──
    if (up && focusZone === 'MAIN') {
        lastFocusZone = 'MAIN';
        focusZone = 'UPPER_HUD';
        focusIndex = (currentLayer === 'MAP') ? 1 : 0;
        return;
    }

    // ── Lower HUD entry ──
    if (down && focusZone === 'MAIN') {
        if (currentLayer === 'STUDIO' && potCarrying) return;
        lastFocusZone = 'MAIN';
        focusZone = 'LOWER_HUD';
        focusIndex = 0;
        return;
    }

    // ── Exit lower HUD upward ──
    if (up && focusZone === 'LOWER_HUD') {
        focusZone = 'MAIN';
        focusIndex = 0;
        return;
    }

    // ── Exit upper HUD downward ──
    if (down && focusZone === 'UPPER_HUD') {
        focusZone = 'MAIN';
        focusIndex = 0;
        return;
    }

    // ── Left/right within UPPER_HUD ──
    if (focusZone === 'UPPER_HUD') {
        if (left)  focusIndex = 0; // Return to Map
        if (right) focusIndex = 1; // Menu
        return;
    }

    // ── MAIN zone ──
    if (focusZone === 'MAIN') handleSceneNav(up, down, left, right);
}

function handleSceneNav(up, down, left, right) {
    if (currentLayer === 'MAP') {
        if (right) focusIndex = (focusIndex + 1) % MAP_LOCATIONS.length;
        if (left)  focusIndex = (focusIndex + MAP_LOCATIONS.length - 1) % MAP_LOCATIONS.length;
    } else if (currentLayer === 'STUDIO') {
        if (left)  focusIndex = 1; // furnace
        if (right) focusIndex = 0; // wheel
    } else if (currentLayer === 'GREENHOUSE') {
        if (right) greenhouseFocusCol = (greenhouseFocusCol + 1) % GREENHOUSE_COLS;
        if (left)  greenhouseFocusCol = (greenhouseFocusCol + GREENHOUSE_COLS - 1) % GREENHOUSE_COLS;
        if (down)  greenhouseFocusRow = min(greenhouseFocusRow + 1, GREENHOUSE_ROWS - 1);
        if (up)    greenhouseFocusRow = max(greenhouseFocusRow - 1, 0);
    }
}


// ============================================================
//  BUTTON READING
// ============================================================

function handleButtonPress() {
    let pressed = sensorState.joyBtn === 0;
    if (!pressed) { btnPressed = false; return; }
    if (btnPressed) return;
    btnPressed = true;

    // ── Main menu ──
    if (gameState === 'START') {
        if (mainMenuFocusIndex === 0) changeState('PLAY');
        else { instructionFocusIndex = 0; changeState('INSTRUCTIONS'); }
        return;
    }

    // ── Instructions ──
    if (gameState === 'INSTRUCTIONS') {
        if (instructionFocusIndex === 5) {
            // Back button — if we came from in-game go to POPUP, else START
            changeState(cameFromGame ? 'POPUP' : 'START');
        }
        return;
    }

    // ── Pause menu ──
    if (gameState === 'POPUP') {
        let options = [
            () => { changeState('PLAY'); focusZone = 'MAIN'; },
            () => { cameFromGame = true; instructionFocusIndex = 0; changeState('INSTRUCTIONS'); },
            () => { resetGame(); changeState('START'); }
        ];
        options[constrain(pauseMenuIndex, 0, 2)]();
        return;
    }

    if (gameState !== 'PLAY') return;

    // When inventory is open, only lower HUD button can close it
    if (isInventoryOpen) {
        if (focusZone === 'LOWER_HUD') {
            isInventoryOpen = false;
            sfxButton.play();
            focusZone = 'MAIN';
        }
        return;
    }

    // ── Upper HUD ──
    if (focusZone === 'UPPER_HUD') {
        if (focusIndex === 0 && currentLayer !== 'MAP') {
            currentLayer = 'MAP';
            focusZone = 'MAIN';
            focusIndex = 0;
            potCarrying = false;
        } else if (focusIndex === 1) {
            changeState('POPUP');
            focusZone = 'MAIN';
            focusIndex = 0;
        }
        return;
    }

    // ── Lower HUD ──
    if (focusZone === 'LOWER_HUD') {
        isInventoryOpen = !isInventoryOpen;
        sfxButton.play();
        if (!isInventoryOpen) focusZone = 'MAIN';
        return;
    }

    // ── River ──
    if (currentLayer === 'RIVER' && focusZone === 'MAIN') {
        handleRiverButton();
        return;
    }

    // ── Studio ──
    if (currentLayer === 'STUDIO' && focusZone === 'MAIN') {
        handleStudioButton();
        return;
    }

    // ── Forest — button instantly collects held resource ──
    if (currentLayer === 'FOREST' && focusZone === 'MAIN' && heldResource !== null) {
        if (heldResource === 'clay') inventory.clay++;
        else inventory.soil++;
        heldResource = null;
        activeDigPlotIndex = -1;
        sfxButton.play();
        return;
    }

    // ── Map ──
    if (currentLayer === 'MAP' && focusZone === 'MAIN') {
        currentLayer = MAP_LOCATIONS[focusIndex % MAP_LOCATIONS.length];
        focusIndex = 0;
        joyVirtualX = width / 2;
        joyVirtualY = height / 2;
        if (currentLayer === 'GREENHOUSE') greenhouseEnterTime = millis();
        return;
    }

    // ── Greenhouse ──
    if (currentLayer === 'GREENHOUSE' && focusZone === 'MAIN') {
        handleGreenhouseButton();
        return;
    }
}

function handleRiverButton() {
    if (!hasWaterInBucket && joyVirtualY > 280 && joyVirtualY < 520) {
        hasWaterInBucket = true;
        sfxBucketFill.play();
    }
}

function handleStudioButton() {
    if (potCarrying) {
        if (dist(joyVirtualX, joyVirtualY, FURNACE_X, FURNACE_Y) < 80 && furnaceState === 'EMPTY') {
            potCarrying = false;
            wheelState = 'EMPTY';
            // Place pot in furnace — starts in PLACED state waiting for fire
            furnaceState = 'PLACED';
            furnacePotFrame = 3; // reset to raw clay frame
            sfxPlacePot.play();
        }
        return;
    }

    if (focusIndex === 0) {
        // Wheel
        if (wheelState === 'EMPTY') {
            if (inventory.clay > 0 && inventory.water > 0) {
                inventory.clay--;
                inventory.water--;
                wheelState = 'SHAPING';
                shapingFrame = 0;
                shapingTimer = millis();
                sfxClay.play();
            }
        } else if (wheelState === 'READY_TO_DRAG') {
            potCarrying = true;
            joyVirtualX = WHEEL_X;
            joyVirtualY = WHEEL_Y;
        }
    } else if (focusIndex === 1) {
        // Furnace — only allow pickup when fire is OFF and pot is cooked
        let furnaceOn = sensorState.pot > 600;
        if (furnaceState === 'READY_TO_COLLECT' && !furnaceOn) {
            inventory.pots++;
            sfxPickUp.play();
            furnaceState = 'EMPTY';
            sfxFurnace.stop();
        } else if (furnaceState === 'BURNT' && !furnaceOn) {
            furnaceState = 'EMPTY';
            sfxBreak.play();
            sfxFurnace.stop();
        } else if (furnaceState === 'ASH') {
            furnaceState = 'EMPTY';
            sfxAsh.play();
            sfxFurnace.stop();
        }
    }
}

function handleGreenhouseButton() {
    let plot = plotLocations[greenhouseFocusRow * GREENHOUSE_COLS + greenhouseFocusCol];
    if (!plot) return;
    let cx = plot.x + plot.w / 2;
    let cy = plot.y + plot.h / 2;
    let plantHere = activePlants.find(p => dist(p.x, p.y, cx, cy) < 10);

    if (plantHere) {
        if (plantHere.stage === 2) {
            activePlants.splice(activePlants.indexOf(plantHere), 1);
            inventory.seeds += 2;
            sfxHarvested.play();
        } else {
            sfxButton.play();
        }
    } else {
        if (inventory.pots > 0 && inventory.seeds > 0 && inventory.soil > 0) {
            inventory.pots--;
            inventory.seeds--;
            inventory.soil--;
            let newPlant = new Plant(cx, cy);
            newPlant.waiting = true;
            activePlants.push(newPlant);
            pendingWaterPlot = { x: cx, y: cy };
            sfxButton.play();
        } else {
            sfxButton.play();
        }
    }
}


// ============================================================
//  SCENE INITIALISATION
// ============================================================

function initializeForestPlots() {
    forestPlots = [];
    for (let i = 0; i < FOREST_PLOT_POSITIONS.length; i++) {
        let [x, y] = FOREST_PLOT_POSITIONS[i];
        forestPlots.push(new ResourcePlot(x, y, random(['clay', 'soil'])));
    }
}

function initializeGreenhouseGrid() {
    plotLocations = [];
    let sx = 210, sy = 117;
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
            plotLocations.push({ x: sx + (c * 79), y: sy + (r * 110), w: 50, h: 75 });
        }
    }
}


// ============================================================
//  ORIGINAL MOUSE/KEYBOARD CALLBACKS
// ============================================================

function checkMapClick() {
    if (rectClick(0, 190, 260, 470) || rectClick(240, 330, 380, 430))        currentLayer = "STUDIO";
    else if (rectClick(240, 200, 500, 260) || rectClick(300, 260, 510, 360)) currentLayer = "GREENHOUSE";
    else if (rectClick(260, 110, 780, 200) || rectClick(520, 200, 780, 290)) currentLayer = "FOREST";
    else if (rectClick(525, 365, 840, 450) || rectClick(790, 215, 1025, 450))currentLayer = "RIVER";
}

function checkPlanting() {
    for (let i = activePlants.length - 1; i >= 0; i--) {
        if (dist(mouseX, mouseY, activePlants[i].x, activePlants[i].y) < 30 && activePlants[i].stage === 2) {
            inventory.seeds += 2;
            sfxHarvested.play();
            activePlants.splice(i, 1);
            return;
        }
    }
    for (let plot of plotLocations) {
        if (mouseX > plot.x && mouseX < plot.x + plot.w && mouseY > plot.y && mouseY < plot.y + plot.h) {
            let cx = plot.x + plot.w / 2;
            let cy = plot.y + plot.h / 2;
            let slotOccupied = activePlants.some(p => dist(p.x, p.y, cx, cy) < 10);
            if (!slotOccupied && inventory.pots > 0 && inventory.seeds > 0 && inventory.soil > 0 && inventory.water > 0) {
                inventory.pots--;
                inventory.seeds--;
                inventory.soil--;
                let newPlant = new Plant(cx, cy);
                newPlant.waiting = true;
                activePlants.push(newPlant);
                pendingWaterPlot = { x: cx, y: cy };
            }
            break;
        }
    }
}

function mouseClicked() {
    if (millis() - lastMenuClickTime < 250) return;

    if (isInventoryOpen) return;

    if (gameState !== "PLAY") return;

    if (mouseX > width - 110 && mouseY > height - 110) {
        if (isDraggingFromFurnace) return;
        if (currentLayer === "RIVER" && hasWaterInBucket) {
            inventory.water++;
            hasWaterInBucket = false;
            lastMenuClickTime = millis();
            return;
        }
        if (currentLayer === "FOREST" && heldResource !== null) {
            if (heldResource === 'clay') inventory.clay++;
            else inventory.soil++;
            heldResource = null;
            activeDigPlotIndex = -1;
            lastMenuClickTime = millis();
            return;
        }
        isInventoryOpen = !isInventoryOpen;
        sfxButton.play();
        lastMenuClickTime = millis();
        return;
    }

    if (currentLayer === "MAP") {
        checkMapClick();
        lastMenuClickTime = millis();
    } else if (currentLayer === "RIVER" && mouseY > 280 && mouseY < 520 && !hasWaterInBucket) {
        hasWaterInBucket = true;
        sfxBucketFill.play();
    } else if (currentLayer === "FOREST" && mouseY > 100 && heldResource === null) {
        for (let i = 0; i < forestPlots.length; i++) {
            if (forestPlots[i].isClicked(mouseX, mouseY)) {
                heldResource = forestPlots[i].type;
                forestPlots[i].harvest();
                activeDigPlotIndex = i;
                sfxShovel.play();
                break;
            }
        }
    } else if (currentLayer === "GREENHOUSE") {
        checkPlanting();
    }
}

function mousePressed() {
    userStartAudio();
    if (gameState !== "PLAY" || isInventoryOpen || currentLayer !== "STUDIO" || (millis() - lastMenuClickTime < 250)) return;

    if (wheelState === 'EMPTY' && dist(mouseX, mouseY, WHEEL_X, WHEEL_Y) < 70) {
        if (inventory.clay > 0 && inventory.water > 0) {
            inventory.clay--;
            inventory.water--;
            wheelState = 'SHAPING';
            shapingFrame = 0;
            shapingTimer = millis();
            sfxClay.play();
        }
    }
    if ((wheelState === 'READY_TO_DRAG' || wheelState === 'CARRYING') && dist(mouseX, mouseY, WHEEL_X, WHEEL_Y) < 70) {
        isDraggingFromWheel = true;
    }
    if (dist(mouseX, mouseY, FURNACE_X, FURNACE_Y) < 50) {
        let furnaceOn = sensorState.pot > 600;
        if (furnaceState === 'READY_TO_COLLECT' && !furnaceOn) {
            isDraggingFromFurnace = true;
        } else if (furnaceState === 'BURNT' && !furnaceOn) {
            isDraggingFromFurnace = true;
            setTimeout(() => {
                isDraggingFromFurnace = false;
                furnaceState = 'EMPTY';
                sfxBreak.play();
                sfxFurnace.stop();
            }, 1000);
        } else if (furnaceState === 'ASH') {
            furnaceState = 'EMPTY';
            sfxAsh.play();
            sfxFurnace.stop();
        }
    }
}

function mouseReleased() {
    if (isDraggingFromWheel) {
        isDraggingFromWheel = false;
        if (dist(mouseX, mouseY, FURNACE_X, FURNACE_Y) < 80 && furnaceState === 'EMPTY') {
            wheelState = 'EMPTY';
            furnaceState = 'PLACED';
            furnacePotFrame = 3;
            sfxPlacePot.play();
        }
    }
    if (isDraggingFromFurnace) {
        isDraggingFromFurnace = false;
        sfxFurnace.stop();
        if (mouseX > width - 110 && mouseY > height - 110) {
            if (furnaceState === 'READY_TO_COLLECT') {
                inventory.pots++;
                sfxPickUp.play();
            }
            furnaceState = 'EMPTY';
        }
    }
}

function keyPressed() {
    if (keyCode === 82) { resetGame(); changeState("START"); }
}