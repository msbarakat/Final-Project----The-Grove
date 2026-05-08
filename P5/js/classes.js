/*
 * classes.js
 * ──────────────────────────────────────────────────────────────
 * Class definitions for all game entities:
 *   • Plant          — grows in greenhouse plots over time
 *   • WateringEvent  — short watering animation above a plot
 *   • ResourcePlot   — harvestable clay/soil deposit in the forest
 *   • ResourcePlot.update() — re-randomises type on each respawn
 *     so the same physical dig spot can yield clay or soil each cycle.
 * ──────────────────────────────────────────────────────────────
 */


/*
 * Represents a plant growing in a greenhouse plot.
 * Automatically advances through 3 stages (seedling → growing → harvestable) over 'growthDuration' milliseconds per stage.
 */
class Plant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.stage = 0;                         // Growth stage: 0, 1, or 2
        this.birthTime = millis();              // When this stage began
        this.growthDuration = 8000;             // Milliseconds per growth stage
        this.sw = plantSprite.width / 3;        // Width of one sprite frame
        this.hasPlayedGrowthSfx = false;        // Prevents the grow SFX from replaying
        this.waiting = false;                   // Growth paused until watered
    }

    // Called every frame; promotes the stage when enough time has passed.
    update() {
        if (this.waiting) return;
        let age = millis() - this.birthTime;
        if (age > this.growthDuration && this.stage < 2) {
            this.stage++;
            this.birthTime = millis();          // Reset timer for the next stage

            // Play the "fully grown" sound once
            if (this.stage === 2 && !this.hasPlayedGrowthSfx) {
                sfxGrowing.play();
                this.hasPlayedGrowthSfx = true;
            }
        }
    }

    // Draws the plant sprite and a "HARVEST" label when fully grown.
    display() {
        if (currentLayer !== "GREENHOUSE") return; // Only render in the greenhouse

        push();
        imageMode(CENTER);
        image(
            plantSprite, this.x, this.y, 50, 70,
            this.stage * this.sw, 0, this.sw, plantSprite.height
        );

        // Show harvest prompt above the plant when ready
        if (this.stage === 2) {
            fill(255);
            textSize(10);
            textAlign(CENTER);
            text("HARVEST", this.x, this.y - 35);
        }
        pop();
    }
}


/*
 * A short watering animation that plays above a plot when a plant is watered.
 * Automatically marks itself finished after 'duration' milliseconds.
 */
class WateringEvent {
    constructor(x, y) {
        this.x = x;
        this.y = y - 45;           // Offset upward to sit above the pot
        this.startTime = millis();
        this.duration = 1000;      // Total animation length in ms
        this.isFinished = false;

        this.frameW = wateringCanSprite.width / 6; // Width of one animation frame
        this.displayW = 50;
        this.displayH = this.displayW * (wateringCanSprite.height / this.frameW);

        sfxWatering.play();
    }

    // Marks the event as finished when the animation duration has elapsed.
    update() {
        if (millis() - this.startTime > this.duration) this.isFinished = true;
    }

    // Draws the correct animation frame based on elapsed time.
    display() {
        if (this.isFinished || currentLayer !== "GREENHOUSE") return;

        let progress = constrain((millis() - this.startTime) / this.duration, 0, 0.99);
        let frame = floor(progress * 6);

        push();
        imageMode(CENTER);
        image(
            wateringCanSprite, this.x, this.y, this.displayW, this.displayH,
            frame * this.frameW, 0, this.frameW, wateringCanSprite.height
        );
        pop();
    }
}


/*
 * A harvestable resource deposit in the forest (clay or soil).
 * Becomes unavailable after being harvested and respawns after 30 seconds.
 *
 * update() now re-randomises this.type on each respawn, so the same physical dig spot can yield a different resource each cycle.
 * The player must check the screen before digging to see what's there.
 */
class ResourcePlot {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;      // 'clay' or 'soil' — re-randomised on each respawn
        this.ready = true;     // Whether the resource can currently be harvested
        this.harvestTime = 0;  // Timestamp of last harvest (used for respawn timer)
    }

    // Returns true if the plot is ready and the mouse is close enough to click it.
    // Still used as fallback when mouse input is active during testing.
    isClicked(mx, my) {
        return this.ready && dist(mx, my, this.x, this.y) < 40;
    }

    // Marks the plot as harvested and records the time.
    harvest() {
        this.ready = false;
        this.harvestTime = millis();
    }

    // Checks whether 30 seconds have passed since harvest.
    // On respawn, assigns a new random type — could be the same or different.
    update() {
        if (!this.ready && millis() - this.harvestTime > 30000) {
            this.ready = true;
            this.type = random(['clay', 'soil']); // Re-randomise on respawn
        }
    }

    // Draws the resource sprite if the plot is available.
    display() {
        if (this.ready) {
            imageMode(CENTER);
            image(this.type === 'clay' ? clay : soil, this.x, this.y, 100, 50);
        }
    }
}