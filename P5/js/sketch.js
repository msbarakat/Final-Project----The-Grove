/*
 * sketch.js
 */

function preload() {
    mmImage         = loadImage('images/mainMenu.png');
    bgImage         = loadImage('images/background.png');
    riverImage      = loadImage('images/river.png');
    forestImage     = loadImage('images/forest.png');
    greenhouseImage = loadImage('images/greenhouse.png');
    studioImage     = loadImage('images/studio.png');

    unfilledBucket    = loadImage('images/unfilledBucket.png');
    filledBucket      = loadImage('images/filledBucket.png');
    shovel            = loadImage('images/shovel.png');
    shovelClay        = loadImage('images/shovelClay.png');
    shovelSoil        = loadImage('images/shovelSoil.png');

    clay              = loadImage('images/clay.png');
    soil              = loadImage('images/soil.png');
    plantSprite       = loadImage('images/plantSprite.png');
    backpackIcon      = loadImage('images/backpack.png');
    potSprite         = loadImage('images/potSprite.png');
    wateringCanSprite = loadImage('images/wateringCanSprite.png');

    sfxWheel      = loadSound('audios/wheel.mp3');
    sfxFurnace    = loadSound('audios/furnace.mp3');
    sfxBreak      = loadSound('audios/break.mp3');
    sfxAsh        = loadSound('audios/ash.mp3');
    sfxClay       = loadSound('audios/clay.mp3');
    sfxPlacePot   = loadSound('audios/placePot.mp3');
    sfxPickUp     = loadSound('audios/pickUp.mp3');
    sfxWatering   = loadSound('audios/watering.mp3');
    sfxGrowing    = loadSound('audios/growing.mp3');
    sfxHarvested  = loadSound('audios/harvested.mp3');
    sfxBucketFill = loadSound('audios/bucketFill.ogg');
    sfxShovel     = loadSound('audios/shovel.mp3');
    sfxButton     = loadSound('audios/button.mp3');

    bgmButterflies  = loadSound('audios/butterflies_h2h.mp3');
    bgmTheChase     = loadSound('audios/theChase_h2h.mp3');
    bgmRightNow     = loadSound('audios/rightNow_njz.mp3');
    bgmAsap         = loadSound('audios/asap_njz.mp3');
    bgmSupernatural = loadSound('audios/supernatural_njz.mp3');
    bgmMidnight     = loadSound('audios/midnightFiction_illit.mp3');
    bgmDitto        = loadSound('audios/ditto_njz.mp3');
    bgmOmg          = loadSound('audios/omg_njz.mp3');
}

function setup() {
    createCanvas(1024, 576);
    textFont('Courier');
    userStartAudio(); // unlocks audio context on first interaction
    resetGame();
    setupSerial();
}

function draw() {
    manageBGM();
    updateGlobalPlants();
    readSerialData();
    readJoystick();
    handleButtonPress();

    switch (gameState) {
        case "START":        displayMainMenu();                   break;
        case "INSTRUCTIONS": displayInstructionHub();            break;
        case "PLAY":         runGameLoop();                       break;
        case "POPUP":        runGameLoop(); displayMidGameMenu(); break;
    }
}