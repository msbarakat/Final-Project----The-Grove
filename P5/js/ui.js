/*
 * ui.js
 * ──────────────────────────────────────────────────────────────
 * All HUD and UI drawing helpers:
 *   • drawBackButton()       — "Return to Map" button
 *   • drawMenuButton()       — generic styled button
 *   • drawBackpackIcon()     — inventory icon in corner
 *   • drawPotFrame()         — pot sprite-sheet helper
 *   • drawInventoryOverlay() — full inventory panel
 *   • drawCustomCursor()     — layer-specific cursor sprite
 * Also contains state helpers:
 *   • changeState()          — transitions gameState with debounce
 *   • resetGame()            — full game reset to initial values
 *   • getInstructionText()   — returns text for instruction hub
 *   • rectClick()            — simple AABB hit test
 * ──────────────────────────────────────────────────────────────
 */


// ============================================================
//  BUTTON & BACK NAVIGATION
// ============================================================

/*
 * Draws the "RETURN TO MAP" back button.
 * Positioned on the left for Forest/River (to avoid overlapping scenery) and on the right for all other layers.
 */
function drawBackButton() {
    let btnW = 180;
    let bx = (currentLayer === "FOREST" || currentLayer === "RIVER")
        ? 20
        : width - (btnW + 20);

    drawMenuButton(bx, 20, btnW, 40, "RETURN TO MAP", () => { currentLayer = "MAP"; }, color(140, 110, 80));
}

/*
 * Draws a styled, hover-responsive button.
 * Calls 'action' immediately when clicked (with a debounce guard).
 * x           Left edge
 * y           Top edge
 * w           Width
 * h           Height
 * lbl         Button label
 * action      Callback executed on click
 * [customCol] Optional override colour (defaults to green)
 */
function drawMenuButton(x, y, w, h, lbl, action, customCol) {
    let hover = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
    let baseCol = customCol ? customCol : color(60, 130, 80);

    push();
    if (hover) {
        // Lighten the button slightly on hover
        let r = red(baseCol) + 30;
        let g = green(baseCol) + 20;
        let b = blue(baseCol) + 20;
        fill(r, g, b);
    } else {
        fill(baseCol);
    }
    stroke(255);
    strokeWeight(1);
    rect(x, y, w, h, 8);
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(lbl, x + w / 2, y + h / 2);
    pop();

    // Fire the action on click, preventing double-firing with a debounce timestamp
    if (hover && mouseIsPressed) {
        sfxButton.play();
        lastMenuClickTime = millis();
        mouseIsPressed = false; // Consume the press so nothing else reacts to it
        action();
    }
}


// ============================================================
//  HUD DRAWING HELPERS
// ============================================================

/** Draws the backpack icon in the bottom-right corner of the screen. */
function drawBackpackIcon() {
    imageMode(CORNER);
    image(backpackIcon, width - 110, height - 110, 100, 100);
}

/*
 * Draws one frame of the pot sprite sheet at the given position and size.
 * The sprite sheet has 7 equally-wide frames arranged horizontally.
 *
 * x  Centre X (when imageMode is CENTER)
 * y  Centre Y
 * fi Frame index (0–6)
 * w  Display width
 * h  Display height
 */
function drawPotFrame(x, y, fi, w, h) {
    let fw = potSprite.width / 7; // Width of one frame in the sprite sheet
    image(potSprite, x, y, w, h, fi * fw, 0, fw, potSprite.height);
}

// Draws the semi-transparent inventory overlay with current resource counts.
function drawInventoryOverlay() {
    // Darken background
    fill(0, 200);
    rect(0, 0, width, height);

    // Inventory panel background
    fill(255);
    rect(width / 2 - 200, height / 2 - 150, 400, 300, 10);

    // Header
    fill(0);
    textAlign(CENTER);
    textSize(24);
    text("INVENTORY", width / 2, height / 2 - 110);

    // Resource counts
    textAlign(LEFT);
    text(`Seeds: ${inventory.seeds}`, width / 2 - 150, height / 2 - 70);
    text(`Pots:  ${inventory.pots}`,  width / 2 - 150, height / 2 - 40);
    text(`Soil:  ${inventory.soil}`,  width / 2 - 150, height / 2 - 10);
    text(`Clay:  ${inventory.clay}`,  width / 2 - 150, height / 2 + 20);
    text(`Water: ${inventory.water}`, width / 2 - 150, height / 2 + 50);
}

/*
 * Renders a custom cursor image in place of the system cursor.
 *
 * - River layer:  bucket (filled or empty depending on hasWaterInBucket)
 * - Forest layer: shovel (with clay, soil, or empty depending on heldResource)
 * - Elsewhere:    default arrow cursor
 *
 * UI buttons (Menu, Return to Map) always revert to the arrow cursor so they remain clearly interactive regardless of the current layer.
 */
function drawCustomCursor() {
    noCursor();
}


// ============================================================
//  STATE & UTILITY HELPERS
// ============================================================

// Transitions to a new game state and records the time to suppress stale clicks.
function changeState(newState) {
    gameState = newState;
    lastMenuClickTime = millis();
}

/*
 * Resets all game data to initial values and reinitialises scene layouts.
 * Called at game start and when quitting to the main menu.
 */
function resetGame() {
    inventory = { water: 0, soil: 0, clay: 0, pots: 0, seeds: 5 };
    activePlants = [];
    activeWateringEvents = [];
    currentLayer = "MAP";
    heldResource = null;
    hasWaterInBucket = false;
    isInventoryOpen = false;
    wheelState = 'EMPTY';
    furnaceState = 'EMPTY';
    potCarrying = false;
    focusZone = 'MAIN';
    focusIndex = 0;
    mainMenuFocusIndex = 0;
    joyVirtualX = 512;
    joyVirtualY = 288;
    pendingWaterPlot = null;
    waterDebounced = false;
    waterPoured = false;
    activeDigPlotIndex = -1;
    instructionFocusIndex = 0;
    pauseMenuIndex = 0;
    cameFromGame = false;

    greenhouseFocusRow = 0;
    greenhouseFocusCol = 0;

    initializeForestPlots();
    initializeGreenhouseGrid();
}

/*
 * Returns the instruction text string for the given category.
 * type - One of: GENERAL, FOREST, RIVER, STUDIO, GREENHOUSE
 */
function getInstructionText(type) {
    switch (type) {
        case "GENERAL":
            return "Welcome to The Grove!\n\nUse the joystick to navigate. Move left/right on the Map to cycle locations, then press the button to enter.\n\nMove up to access the upper HUD (Return to Map / Menu). Move down to access the lower HUD (Inventory).\n\nIf you are ever lost or forget how to do something, open the Menu and select How to Play.";
        case "FOREST":
            return "Use the physical shovel to dig resource plots on the table.\n\nEach plot is either Clay or Soil — check the screen to see which before you dig.\n\nPress the joystick button after digging to place the resource in your inventory.\n\nPlots respawn after 30 seconds with a randomly assigned type.";
        case "RIVER":
            return "Move the joystick to guide the bucket around the scene.\n\nHover over the water area and press the joystick button to fill the bucket.\n\nMove down on the joystick to open your inventory and store the water.";
        case "STUDIO":
            return "Requires 1 Clay and 1 Water.\n\nPress the button on the Pottery Wheel to place your clay. Cup your hands over the pottery wheel to shape the pot — the closer your hands, the faster it shapes.\n\nPress the button to pick up the shaped pot, then carry it to the Furnace and press the button to place it. Turn the dial up to fire the kiln. Turn it down when the pot is ready to stop firing.\n\nPress the button on the Furnace to collect the finished pot. The fire must be off before you can pick it up.";
        case "GREENHOUSE":
            return "Requires 1 Pot + 1 Soil + 1 Seed.\n\nMove the joystick to navigate the planting grid. Press the button to plant in the selected slot.\n\nPour water into the pot to water the plant and start its growth.\n\nOnce the plant is fully grown, select it and press the button to harvest it. Harvesting gives 2 Seeds.";
        default:
            return "Select a category.";
    }
}

// Returns true if the mouse is inside the rectangle defined by two corners.
function rectClick(x1, y1, x2, y2) {
    return mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2;
}