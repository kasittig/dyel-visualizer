# DYEL Visualizer — User Guide

## What Is This?

DYEL Visualizer is a training analytics tool for **powerlifters using the conjugate method**. You paste in the URL of a Google Sheet where you track your training, and the app turns that data into charts and diagnostics to help you:

- See how your squat, bench, and deadlift are trending over time
- Identify weaknesses and imbalances across exercise variations
- Set realistic session targets on Max Effort days
- Track your projected competition total

If you don't yet follow conjugate training, there's an explanation at the "What is the conjugate method?" link on the main page.

---

## Setting Up Your Spreadsheet

The app reads a **published Google Sheet** as CSV. Your sheet must be published to the web (`File → Share → Publish to web`, select "Comma-separated values"). Only published sheets work — sharing a sheet as "anyone with link can view" is not sufficient.

### Required Column Headers

Your sheet needs a header row that contains at minimum:

| Column     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exercise` | Name of the exercise (see naming rules below)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `date`     | Any standard date format (e.g. `2024-11-15` or `11/15/2024`)                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `weight`   | The weight lifted. Rename to `weight (lbs)` or `weight (kg)` to set the unit. If you don't annotate the unit, the app assumes lbs.                                                                                                                                                                                                                                                                                                                                                                          |
| `reps`     | Number of reps performed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `sets`     | _(optional)_ Number of sets — defaults to 1 if omitted                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `rpe`      | _(optional)_ Rate of Perceived Exertion on a **1–10 scale**. Without RPE, a single-set entry is still treated as a rep max, but a multi-set entry is treated as speed/volume work and mostly excluded from e1RM estimates. Adding RPE always counts the set as a real effort attempt regardless of set count — e.g. a 5-rep set at RPE 7 (3 RIR) is adjusted to an equivalent 8-rep max before the Epley formula is applied. Stay within 1–10: out-of-range values are not currently validated or rejected. |

The header row must be the very first row of the sheet — the CSV parser treats row 1 as the header unconditionally. Any title/notes rows above it will be misread as data (or as the header itself), so don't add them.

### Naming Exercises

Exercise names are the most important thing to get right. The app parses names automatically to determine the lift type and variation; how you name things determines what shows up in the charts.

**Lift type** is detected from keywords in the name:

| Lift      | Keywords that trigger it                                                         |
| --------- | -------------------------------------------------------------------------------- |
| Squat     | `squat`, `ssb`, `safety`                                                         |
| Bench     | `bench`, `floor` (as in floor press), `incline`, `decline`, `board`, `slingshot` |
| Deadlift  | `deadlift`, `rack` (as in rack pull)                                             |
| Accessory | Everything else (dumbbells, rows, etc.)                                          |

**Variations** are detected from additional keywords anywhere in the name:

_Bar type:_ `ssb` / `safety`, `trap`, `cambered`, `zercher`, `duffalo`, `swiss`, `american`, `bamboo`, `belt`, `goblet`, `dumbbell` / `db`

_Stance/grip:_ `sumo`, `conventional`, `close grip` / `cg`, `wide grip`, `narrow`, `medium`, `front`, `romanian`, `slingshot`, `builder`, `low bar`

_Equipment:_ `incline`, `decline`, `box`, `board`, `blocks`, `deficit`, `pause` / `command`, `floor`, `rack`

_Additional resistance:_ `chain` → chains; `band` → bands; `reverse band` / `rev. band` → reverse bands

You can put modifiers in parentheses if you prefer:

```
Squat (sumo, chains)
Bench Press (close grip, boards)
Deadlift (deficit, conventional)
```

**A plain competition lift should contain no extra keywords** — `Squat`, `Bench Press`, and `Deadlift` (or `Bench w/Commands` for a paused bench to judge commands) are parsed as your anchor movements. Everything else is treated as a variation.

### Example Rows

```
date,       exercise,                   weight (lbs), reps, sets, rpe
2024-11-04, Squat,                      405,          2,    1,    9
2024-11-04, SSB Squat,                  335,          3,    1,    8
2024-11-06, Bench w/Commands,           245,          2,    1,    9.5
2024-11-06, Floor Press,                205,          3,    1
2024-11-08, Deadlift,                   455,          2,    1,    9
2024-11-08, Deadlift (deficit),         385,          3,    1
```

---

## Checking Your Spreadsheet

Before pasting your URL into the visualizer, use the **[Sheet Validator](/?page=validator)** to confirm your spreadsheet is formatted correctly. Paste the URL and click **Check Sheet** — the validator will tell you:

- Which required columns are present (and flag any that are missing)
- How many rows parsed successfully
- Specific row-level errors (invalid date, non-numeric weight, etc.)
- Warnings like a missing weight unit

If everything looks good, there's a **View in Visualizer** button that takes you straight to your data.

## Loading Your Data

1. In the app, paste your published Google Sheet URL into the "Your Google Sheet" field.
2. The URL is saved in the browser address bar, so you can bookmark it or share it.

If the sheet loads but you see no data, use the Sheet Validator (linked below the URL input) to diagnose formatting issues.

---

## The Interface

Once your data loads, you'll see tabs across the top: **Σ**, **Squat**, **Bench**, **Deadlift**, and **Calculator** (Accessory appears if you have accessory data).

---

## Σ (Sigma) Tab — Your Total at a Glance

This tab gives you the big picture across all three lifts.

### Total Chart

A line chart with four lines: Squat (orange), Bench (blue), Deadlift (green), and Est. Total (purple). Each point represents your best estimated one-rep max (e1RM) on a given training day, normalized to your competition lift so that a heavy SSB squat session and a competition squat session land on the same scale.

**How to use it:** Look at the overall slope. If your total has been flat for weeks, something in your program isn't working. If one lift's line is dipping while the others climb, that's a signal your recovery budget is tilted — or you have an underlying weakness to address.

### Radar Chart

A spider chart showing your most recent e1RM on each of the three lifts, with all three axes scaled to the same maximum. Useful for seeing at a glance whether your lifts are balanced or whether one is lagging.

**How to use it:** In powerlifting, a lopsided total — e.g. a big squat but a small bench — is a sign that you'd gain more total weight by investing training time in the weak lift rather than piling more into the strong one. The radar makes this imbalance immediately visible.

---

## Squat / Bench / Deadlift Tabs

Each lift tab has the same three sections.

### Line Chart (Variation Trends)

One line per exercise variation you've done, plotted over time. Hover a point to see the actual set (e.g. 1×3 @ 365 lbs) and the calculated e1RM. Click a line to highlight it; the corresponding spoke in the radar chart below will also highlight.

**Normalized e1RM line:** A dashed line showing every variation's e1RM re-expressed on your competition lift's scale. The app automatically picks the competition-lift baseline for each lift type (squat/bench/deadlift) from your logged data — preferring an explicitly-named "Competition X" entry, then your preferred deadlift stance, then a paused/"commands" bench, then any plain competition-tagged entry — there's no exercise picker to choose a different baseline manually. This line is often smoother than any single raw variation's e1RM because it synthesizes information across all your variations.

**How to use it:** Look for stalls. If a variation that used to trend upward has flatlined, you've probably adapted to it and should rotate to something different. If the normalized dashed line is climbing while the raw competition lift line isn't, your special exercises are getting stronger faster than your competition lift — a sign you may need more specificity.

### Variation Radar Chart

A spider chart with one spoke per exercise variation, showing each variation's **most recent e1RM, normalized to your competition lift** (same normalization as the line chart's dashed line, in the same weight unit — not a percentage). A dashed reference ring marks your competition lift's own current normalized value, so spokes outside the ring are running stronger than your competition lift and spokes inside it are relatively weaker.

**How to use it:** Unlike the line chart (which shows history), this shows where the app estimates each variation stands right now, from its most recent logged session. Clicking a spoke highlights that variation in the line chart above so you can see its history. Hover a spoke to see the last date/sets/reps/weight/RPE logged for it.

### Diagnostics Panel

A table that appears below the radar chart. For each variation (excluding accessories and exercises that can't be classified), it shows:

| Column             | What it means                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Variation**      | Exercise name                                                                                                                |
| **Category**       | What physical quality it trains (e.g. lockout, bottom range, quad dominant, posterior chain)                                 |
| **Avg Index**      | Your average e1RM on this exercise as a % of your competition-lift e1RM                                                      |
| **Baseline Range** | The expected % range for this modifier (e.g. a board press is typically 105–115% of competition bench)                       |
| **Diagnostic**     | **Optimal** (in range), **Weakness** (below range), **Overtrained** (above range), or **Stale** (no recent data — see below) |

**How to use it:** This is the most actionable view in the app for programming decisions.

- **Weakness** means you're lifting less on this variation relative to your competition lift than you should be, given what the exercise is. For example, if your lockout work (board press, rack pulls) is below the expected range, your lockout is the limiting factor in your competition lifts — add more lockout-focused work.
- **Overtrained** means you're doing that variation so often or so heavy that you're overspecialized there relative to your competition lift — consider reducing frequency and rotating to a different quality.
- **Optimal** means your training is producing the expected transfer to the competition lift from that exercise.
- **Stale** means the variation's most recent logged session is old enough (past a 90-day threshold) that its diagnostic can't be trusted — it isn't counted as a weakness or overtrained finding until you log it again.

Deadlift variation classification is now automatic based on your logged data — no manual stance preference setting is needed.

---

## Calculator Tab

A rep calculator that translates between weight and reps using your actual e1RM.

1. Select the lift and exercise.
2. Set a **data window** (default: last 28 days). The app finds the best e1RM estimate within that window — it will use your competition lift directly if you've done it recently, or cross-estimate from a variation if not (the source is shown below the inputs).
3. Enter either a **weight** or a **rep count** — the other field fills in automatically.

**How to use it:** On a Max Effort day, use this before training to figure out what hitting a new PR would require. For example: if your last competition squat was 405 × 2, enter "1 rep" to see what your projected single is and plan your warmup around that target.

---

## Tips for Getting the Most Out of the App

- **Log every Max Effort set as a separate row**, even warmup singles. The app takes the best e1RM per session per exercise, so extra rows don't hurt and give the trend lines more data.
- **Be consistent with exercise names.** The parser matches on keywords, so "SSB Squat" and "Safety Bar Squat" are treated as the same bar type — but "SSB" and "Squats with the SSB" will produce two different variation entries. Pick one name and stick to it.
- **Log an RPE whenever you can, especially on multi-set days.** Without RPE, a multi-set entry (e.g. 8 × 3 Dynamic Effort) is treated as speed/volume work and mostly excluded from e1RM estimates rather than counted as a near-max attempt; an explicit RPE always overrides that and gets used regardless of set count.
- **Check the diagnostics after every training block**, not just at the end of a cycle. Early identification of a lockout weakness or a posterior chain deficit gives you time to address it before a meet.
