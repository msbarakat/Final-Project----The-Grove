/*
 * globals.js
 */

let gameState = "START";
let currentLayer = "MAP";
let inventory;
let activePlants = [];
let instructionType = "GENERAL";
let lastMenuClickTime = 0;

let mmImage, bgImage, riverImage, forestImage, greenhouseImage, studioImage;
let unfilledBucket, filledBucket, shovel, shovelClay, shovelSoil;
let clay, soil, plantSprite, backpackIcon, potSprite, wateringCanSprite;

let sfxWheel, sfxFurnace, sfxBreak, sfxAsh, sfxClay, sfxPlacePot, sfxPickUp;
let sfxWatering, sfxGrowing, sfxHarvested, sfxBucketFill, sfxShovel, sfxButton;

let bgmButterflies, bgmTheChase, bgmRightNow, bgmAsap;
let bgmSupernatural, bgmMidnight, bgmDitto, bgmOmg;
let currentBGM = null;

let heldResource = null;
let hasWaterInBucket = false;
let isInventoryOpen = false;

let wheelState = 'EMPTY';
let shapingFrame = 0;
let shapingTimer = 0;

let furnaceState = 'EMPTY';
let furnaceStartTime = 0;
let furnacePotFrame = 3;

let isDraggingFromWheel = false;
let isDraggingFromFurnace = false;
let potCarrying = false;

let forestPlots = [];
let plotLocations = [];
let activeWateringEvents = [];

// Virtual joystick cursor — used in River and Studio where joystick acts as mouse
let joyVirtualX = 512;
let joyVirtualY = 288;
const JOY_CURSOR_SPEED = 6;

let sensorState = {
    joyX:   512,
    joyY:   512,
    joyBtn: 1,
    prox:   0,
    pot:    0,
    water:  0,
    dig:    [0, 0, 0, 0, 0]
};

let focusZone  = 'MAIN';
let focusIndex = 0;
let lastFocusZone = 'MAIN';
let joyMoved   = false;
let btnPressed = false;
let mainMenuFocusIndex = 0;

// Greenhouse grid focus
let greenhouseFocusRow = 0;
let greenhouseFocusCol = 0;
const GREENHOUSE_ROWS = 4;
const GREENHOUSE_COLS = 8;
let greenhouseEnterTime = 0; // timestamp when greenhouse was last entered

const MAP_LOCATIONS = ['STUDIO', 'GREENHOUSE', 'FOREST', 'RIVER'];
const MAP_ENTRANCES = {
    STUDIO:      [180, 370],
    GREENHOUSE:  [470, 320],
    FOREST:      [660, 260],
    RIVER:       [820, 380]
};

const WHEEL_X   = 565;
const WHEEL_Y   = 425;
const FURNACE_X = 205;
const FURNACE_Y = 237;

// Forest plot positions — moved up and right, matching physical dig board
const FOREST_PLOT_POSITIONS = [
    [380, 270],
    [620, 270],
    [380, 390],
    [620, 390],
    [500, 330]
];

let pendingWaterPlot = null;
let waterDebounced = false;
let waterPoured = false; // only true when physical sensor fires
let waterSensorWasWet = false; // tracks previous sensor state for rising edge detection

// River HUD thresholds — when virtual cursor crosses these Y values
const RIVER_UPPER_HUD_THRESHOLD = 60;
const RIVER_LOWER_HUD_THRESHOLD = 500;

// ─────────────────────────────────────────────
//  INSTRUCTIONS HUB FOCUS
//  0-4 = category, 5 = back button
// ─────────────────────────────────────────────
let instructionFocusIndex = 0;

// ─────────────────────────────────────────────
//  FOREST — ACTIVE DIG PLOT
//  Index of the plot currently being dug (-1 = none)
//  Used to position the shovel icon over the correct plot.
// ─────────────────────────────────────────────
let activeDigPlotIndex = -1;

// Pause menu separate index — avoids affecting scene focusIndex during POPUP
let pauseMenuIndex = 0;

// Tracks whether instructions were opened from in-game (POPUP) or main menu (START)
let cameFromGame = false;