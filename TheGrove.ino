/*
 * TheGrove.ino
 * ──────────────────────────────────────────────────────────────
 * Sensor hub for The Grove table installation.
 * Reads all physical inputs and sends one CSV line per loop to P5.js via Serial.
 *
 * Serial output format (11 fields, newline terminated):
 *   joyX, joyY, joyBtn, proximity, potValue, waterValue, dig0, dig1, dig2, dig3, dig4
 *
 * Pin assignments:
 *   A0        — Joystick X axis
 *   A1        — Joystick Y axis
 *   A2        — Potentiometer (furnace dial)
 *   A3        — Water sensor
 *   D2–D6     — Dig contact points (INPUT_PULLUP), dig0–dig4
 *   D7        — Joystick button (INPUT_PULLUP)
 *   D8        — HC-SR04 TRIG
 *   D9        — HC-SR04 ECHO
 * ──────────────────────────────────────────────────────────────
 */

// ── PIN DEFINITIONS ──
#define JOY_X     A0
#define JOY_Y     A1
#define POT       A2
#define WATER     A3

#define JOY_BTN   7
#define TRIG_PIN  8
#define ECHO_PIN  9

const int DIG_PINS[5] = {2, 3, 4, 5, 6};

// ── PROXIMITY — ROLLING AVERAGE ──
// One reading is taken per loop iteration and stored in a circular buffer.
// The average of the last 5 readings is used, smoothing out hand tremor without blocking the loop for multiple pulseIn calls.
int proxHistory[5] = {0, 0, 0, 0, 0};
int proxIndex      = 0;

// ── DIG DEBOUNCE ──
unsigned long digHoldStart[5] = {0, 0, 0, 0, 0};
bool          digActive[5]    = {false, false, false, false, false};

// ── WATER SENSOR SUPPRESSION ──
unsigned long waterBlockUntil = 0;


void setup() {
    Serial.begin(9600);

    // Proximity sensor
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    // Joystick button
    pinMode(JOY_BTN, INPUT_PULLUP);

    // Dig contact points — pulled HIGH, go LOW when shovel touches
    for (int i = 0; i < 5; i++) {
        pinMode(DIG_PINS[i], INPUT_PULLUP);
    }
}


// ── PROXIMITY SENSOR ──
// Takes one HC-SR04 reading, stores it in the rolling buffer, and returns the inverted average (closer = higher value, 0–1023).
int readProximity() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
    long cm = duration / 58;

    // Store in rolling buffer
    proxHistory[proxIndex] = (int) constrain(cm, 0, 20);
    proxIndex = (proxIndex + 1) % 5;

    // Average the buffer
    long total = 0;
    for (int i = 0; i < 5; i++) total += proxHistory[i];
    long avg = total / 5;

    // Invert: 0cm → 1023, 20cm+ → 0
    return (int) map(avg, 0, 20, 1023, 0);
}


void loop() {
    unsigned long now = millis();

    // ── JOYSTICK ──
    int joyX   = analogRead(JOY_X);
    int joyY   = analogRead(JOY_Y);
    int joyBtn = digitalRead(JOY_BTN); // 1 = not pressed, 0 = pressed

    // ── PROXIMITY ──
    // One reading per loop, averaged internally over last 5 calls
    int prox = readProximity();

    // ── POTENTIOMETER ──
    int potVal = analogRead(POT);

    // ── WATER SENSOR ──
    // Suppressed for 4 seconds after a valid pour (>700) to allow the cup to drain before re-reading.
    int waterVal = 0;
    if (now > waterBlockUntil) {
        waterVal = analogRead(WATER);
        if (waterVal > 700) {
            waterBlockUntil = now + 4000;
        }
    }

    // ── DIG CONTACT POINTS ──
    // Each pin must read LOW continuously for 200ms before registering as 1.
    // Prevents false triggers from brief accidental grazes.
    int digOut[5];
    for (int i = 0; i < 5; i++) {
        int reading = digitalRead(DIG_PINS[i]);
        if (reading == LOW) {
            if (!digActive[i]) {
                digActive[i]    = true;
                digHoldStart[i] = now;
            }
            digOut[i] = (now - digHoldStart[i] >= 200) ? 1 : 0;
        } else {
            digActive[i] = false;
            digOut[i]    = 0;
        }
    }

    // ── SEND SERIAL LINE ──
    Serial.print(joyX);     Serial.print(',');
    Serial.print(joyY);     Serial.print(',');
    Serial.print(joyBtn);   Serial.print(',');
    Serial.print(prox);     Serial.print(',');
    Serial.print(potVal);   Serial.print(',');
    Serial.print(waterVal); Serial.print(',');
    for (int i = 0; i < 5; i++) {
        Serial.print(digOut[i]);
        if (i < 4) Serial.print(',');
    }
    Serial.println(); // newline terminates the line for p5 readUntil('\n')

    delay(50); // ~20 updates per second
}
