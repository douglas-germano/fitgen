# In-gym workout logging UX (Strong, Hevy, Fitbod, Alpha Progression, Liftosaur) — notes for FitGen

Context: FitGen set inputs currently start EMPTY (no weight, nothing from the previous session). Every leading app below fills or shows last-session data in some form.

## 1. Prefilling weight/reps: "previous" column, suggested progression, RPE/RIR

### Takeaway
The standard pattern is a per-set row showing what you did last time ("PREVIOUS" in Hevy) next to editable weight/reps fields and a checkmark. AI/algorithm apps (Fitbod, Alpha Progression, Liftosaur) go further and prefill a *target* for the next session from history, optionally driven by RIR. An empty first set with no history is the worst case these apps try to avoid; Fitbod even seeds first-time weights from similar users.

### Cited Findings
- Hevy shows a PREVIOUS column with your set-by-set performance from the last time you logged that exercise. It appears only during a live workout. The number of rows matches how many sets you did before; extra sets you add later show up in future sessions — [Hevy: Previous Workout Values](https://www.hevyapp.com/features/track-exercises/)
- Hevy lets the user choose how "previous values" behave (Profile > gear > Workouts > Previous Workout Values) — [Hevy: Log & Track Workouts](https://www.hevyapp.com/features/track-workouts/); [Hevy: Workout Settings](https://www.hevyapp.com/features/workout-settings/)
- Basic Hevy flow: "log your weights and reps, and tap the checkmark next to each set to mark it as complete and trigger the rest timer" — [Hevy tutorial](https://www.hevyapp.com/hevy-tutorial/)
- A user review on Hevy's site praises that "it holds the last rep and weight from the previous time I did the exercise" — [Hevy reviews on the Supersets page](https://www.hevyapp.com/features/what-are-supersets/)
- Fitbod's engine has two parts: an Exercise Selector (what to do) and a Capability Recommender (sets, reps, weight). Weight comes from an estimated 1RM (Epley-type formulas), which is updated every session — [Fitbod: How Fitbod Generates Your Personalized Workouts](https://fitbod.me/blog/fitbod-algorithm/)
- For exercises with no history, Fitbod seeds the starting weight "from aggregate data across millions of similar users"; it also uses AMRAP final sets as a calibration signal and offers optional per-set RIR logging — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/)
- Fitbod's rep ranges by goal: strength 1–6 reps at ~85–100% 1RM with 3–5 min rest; hypertrophy mostly 6–12 reps and 10–20 sets per muscle per week — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/)
- Fitbod raises weight or reps when 1RM and volume trend up and the muscle has recovered. It lowers volume or intensity, or shifts work to fresher muscles, when recovery is poor — [Fitbod: when to lift heavier](https://fitbod.me/blog/how-fitbods-ai-knows-exactly-when-you-should-lift-heavier-and-when-to-recover/)
- Alpha Progression gives each working set a weight and rep target. The first time you do an exercise there is no recommendation, because the app has no history yet. If you set an RIR target, the recommendation always aims for it; once RIR tracking is on, you must enter RIR on every set. Without RIR tracking the app infers RIR from your performance. Recommendations are a Pro feature — [Alpha Progression blog](https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations)
- In Alpha Progression, the "reference workout" defaults to the same plan day. If that day has no data, it uses the most recent session that included the exercise (Settings > Training > Reference workout) — [Alpha Progression blog](https://alphaprogression.com/en/blog/alpha-progression-progression-recommendations)
- Liftosaur ships three built-in progression rules: linear (`lp`, add a fixed amount or % after N successes), double progression (`dp(weight increase, min reps, max reps)`: add reps within the range, then add weight and reset reps), and reps-sum (`sum`). Example: `Bench Press / 3x8 / progress: lp(5lb)` — [Liftosaur: Liftoscript docs](https://www.liftosaur.com/doc/liftoscript); [Liftosaur: Progressions](https://www.liftosaur.com/features/progressions)
- Hevy supports optional per-set RPE tracking, toggled in workout settings — [Hevy help: Workout Settings](https://help.hevyapp.com/hc/en-us/articles/33882110558743-Workout-Settings-Preferences-Timer-Warm-up-calculator-Plate-Calculator-Smart-Superset-Scrolling)

### Inferences
- The minimum for FitGen is to show last session's weight×reps per set and prefill the inputs with it, so one tap on the check confirms the set. The next step up is to prefill a *progressed* target (double progression is the simplest and easiest to explain), with "last time" shown as a secondary label.
- When there is no history, use the weight from the AI plan, or a population or bodyweight-based seed (Fitbod's approach), instead of an empty field.
- If RIR is collected, keep it optional. Alpha Progression's "mandatory once enabled" rule adds friction.

### Gaps
- No primary source confirmed whether Strong prefills the inputs or only shows the previous column as placeholder text. That needs a hands-on check.
- Jefit's prefill behavior was not researched.

## 2. Rest timer, Live Activities / Dynamic Island, watch

### Takeaway
Every leading app starts the rest timer automatically when a set is checked, with a default duration per exercise. Hevy puts the timer on the Lock Screen and Dynamic Island through a Live Activity. Apple's HIG explicitly names workouts as a good case for Live Activities and gives clear rules for building them.

### Cited Findings
- Strong: the default rest is 2:00 and starts as soon as a set is completed. It shows in the top-left of the workout screen; tapping it opens full screen, where you can change the time or Skip. You can set a default per exercise, with separate durations for warm-up and working sets, and choose the sound. (The help article was last updated in 2021.) — [Strong help: About Rest Timer](https://help.strongapp.io/article/231-rest-timer)
- Hevy: checking a set starts the rest timer, which also appears in the Live Activity. The Live Activity shows workout duration, rest timer, current exercise and set, and **the previous performance for that set** — [Hevy: Live Activity](https://www.hevyapp.com/features/live-activity/)
- Hevy: the timer appears near the top of each exercise, and tapping it adjusts the rest for that exercise — [Hevy: Rest Timer](https://www.hevyapp.com/features/workout-rest-timer/)
- Hevy has an "Inline Timer" setting and a "Keep Awake During Workout" setting — [Hevy: Workout Settings](https://www.hevyapp.com/features/workout-settings/)
- StrongLifts (Apple Watch): logging a set starts rest automatically; a checkmark closes the timer and shows the next set — [StrongLifts support](https://support.stronglifts.com/article/197-apple-watch-rest-timer)
- A Hevy user review says the user can "input the weight and reps on my watch or phone" — [Hevy reviews](https://www.hevyapp.com/features/warm-up-set-calculator/)
- Apple HIG on Live Activities:
  - They are for tasks with a clear start and end that last up to 8 hours. The HIG gives "real-time fitness metrics and interactive controls to pause or cancel a workout" as an example.
  - Interactivity should be minimal, ideally one control, for things like workouts.
  - Alert only for essential updates (alerts light the screen and play a sound), and don't send a push notification for the same update.
  - Update only when content changes, and end the activity as soon as the task ends. A 15–30 minute dismissal is usually enough for a summary.
  - The compact view should show live data. Apple's own Timer shows the remaining time in the minimal view instead of a logo.
  - Tapping should open the matching screen in the app.
  - Live Activities show automatically on Apple Watch at the top of the Smart Stack, built from the compact view.
  - Sources: [Apple HIG: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities); [ActivityKit docs (8-hour limit)](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- A Reddit thread reports Strong's automatic rest timer failing on Apple Watch until the user re-logged in — [r/strongapp](https://www.reddit.com/r/strongapp/comments/1jx9yzd/automatic_rest_timer_does_not_work/)

### Inferences
- For FitGen in Expo, the priorities are: auto-start rest on check, a per-exercise default taken from the AI plan, ±15s/Skip controls, a local notification plus haptic when rest ends (so it works in the background), and keep-awake. An iOS Live Activity (rest countdown plus next set "80kg × 8, last time 77.5×8") would bring FitGen level with Hevy. This needs a native widget extension. On Android, the equivalent is an ongoing notification with a chronometer.
- A Live Activity works on the watch for free through the Smart Stack, which is a cheap stand-in until there is a native watch app.

### Gaps
- No source confirmed ±15s buttons specifically. Strong and Hevy document "modify duration" and "adjust", not the exact increments.
- Wear OS logging support in these apps was not verified.

## 3. Taps per set, input, plate/warm-up calculators, supersets, swaps, editing, finish/PRs

### Takeaway
The core interaction is "values prefilled → tap ✓". The extras are bolted onto that row: set types, warm-up calculator, plate calculator, smart superset scrolling, and live PR banners.

### Cited Findings
- Hevy set types: normal, warm-up, drop, failure. You change one by tapping the set number. Supersets are added from the ⋯ menu with "+ Add To Superset", can hold 2+ exercises (a circuit), and each superset gets its own color — [Hevy: Set Types](https://www.hevyapp.com/features/workout-set-types/); [Hevy: Supersets](https://www.hevyapp.com/features/what-are-supersets/)
- Hevy "Smart Superset Scrolling": checking a set auto-scrolls to the next exercise in the superset and loops back. Each exercise keeps its own rest period — [Hevy: Supersets](https://www.hevyapp.com/features/what-are-supersets/). A Reddit report says the feature misbehaves with warm-up sets — [r/Hevy](https://www.reddit.com/r/Hevy/comments/1lk6aug/please_fix_smart_superset_for_warmup_sets/)
- Hevy warm-up calculator (Pro): ⋯ > Add Warm Up Sets, enter the target weight, and it inserts percentage-based sets. The formula and plate/dumbbell rounding can be configured. A setting controls whether warm-ups count toward volume and PRs — [Hevy: Warm-up calculator](https://www.hevyapp.com/features/warm-up-set-calculator/); [Hevy help](https://help.hevyapp.com/hc/en-us/articles/33882110558743-Workout-Settings-Preferences-Timer-Warm-up-calculator-Plate-Calculator-Smart-Superset-Scrolling)
- Hevy plate calculator: tap the KG/LBS field, then "Calculator" at the bottom left. You pick the available plates and bar weight. It works for barbells and EZ/short bars only, not dumbbells — [Hevy: Workout Settings](https://www.hevyapp.com/features/workout-settings/)
- Strong: separate rest durations for warm-up and working sets; set tags for warm-up, drop and failure sets — [Strong help](https://help.strongapp.io/article/231-rest-timer)
- Hevy Live PR: when you check a set that beats a record, a banner appears right away, with an optional sound and adjustable volume. PR types: heaviest weight for reps, estimated 1RM, best set volume, most reps, best duration. There is no PR the first time you log an exercise, because there is nothing to compare against — [Hevy: Live PR](https://www.hevyapp.com/features/live-pr/)

### Inferences
- FitGen should prefill the set row so the common case is one tap per set. Editing values should be a numeric keypad, ideally with ± steppers matched to the plate increment. Live PR banners need a history store, so they come after prefill.

### Gaps
- No published tap-count benchmarks per set were found for any app.
- Exercise swap mid-workout and the finish summary screens were not documented in the pages I fetched. That needs a hands-on check or more help-center reading.

## 4. How AI plans explain and adapt, and how users perceive them

### Takeaway
Fitbod explains its model in long blog posts (recovery %, estimated 1RM, rep ranges by goal) and tells users to override it. Users report miscalibrated weights, especially on new exercises. Alpha Progression's RIR-targeted recommendations confuse some users.

### Cited Findings
- Fitbod's own guidance: "Adjust weights, reps, and sets at first… Don't just accept the default." It also says "the algorithm learns from deviations" — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/); [Fitbod heavier/recover blog](https://fitbod.me/blog/how-fitbods-ai-knows-exactly-when-you-should-lift-heavier-and-when-to-recover/)
- Reddit, one-year Fitbod review: weights and reps go up "too much too quickly" on some exercises, while bodyweight exercises fail to progress — [r/fitbod](https://www.reddit.com/r/fitbod/comments/1joklkd/review_of_fitbod_after_one_year_of_use/)
- Reddit: "Absurd starting weight recommendations on new exercises." The reply explains the seed comes from the prescribed strength of other exercises for the same muscle — [r/fitbod](https://www.reddit.com/r/fitbod/comments/1onhyeg/absurd_starting_weight_recommendations_on_new/)
- Reddit: "Weight recommendations are nonsensical"; workouts too short — [r/fitbod](https://www.reddit.com/r/fitbod/comments/1mzozsw/app_has_become_a_complete_mess/)
- Reddit: Fitbod "upping reps rather than weight" — [r/fitbod](https://www.reddit.com/r/fitbod/comments/14pnugz/fitbod_upping_reps_rather_than_weight/)
- Alpha Progression users ask whether to correct RIR when the recommended reps felt easier — [r/alphaprogression](https://www.reddit.com/r/alphaprogression/comments/1hz0u11/question_about_rir_and_rep_recommendations/); [r/alphaprogression](https://www.reddit.com/r/alphaprogression/comments/14ycqge/how_to_train_with_rir/). A wishlist thread asks to see "what it wants me to do differently in the next session" — [r/alphaprogression](https://www.reddit.com/r/alphaprogression/comments/1w9kquq/alpha_progression_feature_wishlist/)
- Users comparing trackers say Hevy and Strong are very similar, with Hevy having a better free tier and more active development — [r/naturalbodybuilding](https://www.reddit.com/r/naturalbodybuilding/comments/1ifx8f9/best_gymworkout_tracker_app_volume_sets_reps_etc/); [r/Hevy](https://www.reddit.com/r/Hevy/comments/1m6c6in/hevy_vs_strong/)

### Inferences
- FitGen's AI plan should show *why* each target was chosen, in one line on the exercise (e.g. "+2,5 kg: você fez 3×10 na última"). Overriding should take one tap and feed the next recommendation. Be conservative on first exposure to an exercise and calibrate it with a first set or an AMRAP. Users forgive suggestions that are too light more easily than nonsensical jumps.

### Gaps
- No quantitative perception data (ratings broken down by recommendation quality) was found.

## 5. Data on logging speed and retention

### Takeaway
I found no reliable public data linking logging speed, or prefilled values, to retention for these apps.

### Cited Findings
- Fitbod says it is built on "400 million+ logged workouts" (a marketing claim) — [Fitbod algorithm blog](https://fitbod.me/blog/fitbod-algorithm/)
- Hevy markets itself as "Rated 4.9" on the App Store — [Hevy features](https://www.hevyapp.com/features/warm-up-set-calculator/)

### Inferences
- FitGen should measure this itself in PostHog: time per set (check timestamp minus previous check/rest end), the share of sets confirmed without editing (prefill acceptance), and week-4 retention, comparing before and after shipping prefill.

### Gaps
- No studies or company-published numbers on taps per set, logging time, or retention lift from prefill or rest timers. Not found in 13 searches and fetches.
