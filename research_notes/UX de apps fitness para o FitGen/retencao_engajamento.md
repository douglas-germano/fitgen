# Retention mechanics for fitness/habit apps (streaks, notifications, gamification, social, comeback)

Context: FitGen has plans with rest days, a DAILY workout streak counter, achievements, community (clubs/challenges/feed), and no local reminders. Research was cut short by a search rate limit, so about 15 tool calls were used. Gaps are flagged.

## 1. Daily vs weekly streaks for training; what happens when a streak breaks

### Takeaway
Streaks clearly motivate while they are intact. Highlighting a broken streak lowers persistence, and the effect is worse when users blame themselves. The industry is moving toward forgiving streaks: Hevy counts weeks, Apple added Pause Rings in watchOS 11, and Duolingo uses Streak Freeze. A daily streak that a planned rest day breaks fits poorly with FitGen's plans that include rest days.

### Cited Findings
- Hevy's streak is counted in weeks, not days. Days without a workout show on the calendar as rest days, and a week with a logged session extends the streak — [Hevy feature page](https://www.hevyapp.com/features/gym-consistency/); [Hevy help center](https://help.hevyapp.com/hc/en-us/articles/35380117933207-Track-Your-Workout-Consistency-with-the-Calendar-and-Streak-Features)
- Weekly streaks still cause loss aversion. A Hevy user complained about losing a 56-week streak while sick and mentioned logging a fake workout to keep it — [Reddit r/Hevy](https://www.reddit.com/r/Hevy/comments/1aovk8v/not_breaking_streak_when_im_sick/). This is anecdotal.
- watchOS 11 (2024) lets users pause rings for a day, week, month or a custom range, up to 90 days, without affecting award streaks. Apple frames it as being for "a rest day during their training, an injury, or a day off." watchOS 11 also allows different goals for each weekday — [iMore](https://www.imore.com/health-fitness/apple-watch/how-to-pause-activity-streaks-in-watchos-11); [9to5Mac](https://9to5mac.com/2024/07/16/close-your-ringsbut-in-watchos-11-its-okay-if-you-dont/); [MacRumors](https://www.macrumors.com/2024/06/18/watchos-11-custom-activity-goals-different-days)
- Duolingo experiments:
  - Streak-extension animations, including milestone animations, raised day-7 retention of new learners by 1.7%.
  - Allowing two equipped Streak Freezes instead of one raised daily active learners by 0.38% relative, and did not lead learners to take more days off.
  - Learners who reach a 7-day streak are 3.6x more likely to complete their course. This is a correlation.
  — [Duolingo Blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- Duolingo has run more than 600 streak experiments:
  - Tying the streak to an XP goal confused users. Simplifying it to one lesson per day worked better (reported as a 3.3% lift in D14 retention, a secondhand figure via Reddit).
  - The first 7 days are the most fragile period.
  - Letting users choose a streak goal ("commitment") increased retention.
  — [Lenny's Newsletter interview with Jackson Shuttleworth](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks); D14 figure from [Reddit summary](https://www.reddit.com/r/gamification/comments/1xije2m/duolingos_blog_shares_how_their_streak/), not verified against the primary source
- A second Streak Freeze helped measurably, and a third barely moved the metric. This is a practitioner claim — [LinkedIn, Paul Levchuk](https://www.linkedin.com/posts/paullevchuk_duolingo-streak-activity-7467504496194220033-P4qm). It is not a primary source.
- Silverman & Barasch, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions," *Journal of Consumer Research* 2023 — [OUP](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414); summarized in [INSEAD Knowledge](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive):
  - Seven experiments with more than 4,000 participants.
  - In a strength-exercise study, 66.23% of people with an intact streak chose another strength exercise, against 57.86% of people with a broken streak, even though their actual behavior was identical.
  - Highlighting a broken streak reduced persistence compared with not highlighting it.
  - The negative effect was stronger when the break was self-attributed, and weaker when users could repair the streak.
  - Almost half of participants were willing to watch an ad to keep or repair a streak.
  - The authors recommend:
    - Don't alert users to broken streaks.
    - Define streaks broadly, for example letting several activities count.
    - Consider weekly rather than daily streaks, but not so loose that they stop being a challenge.
    - Share responsibility for breaks and offer ways to repair them.
- A related paper found that a recent streak raises the predicted likelihood of persisting. Nine preregistered studies support this — [Silverman 2023, OBHDP](https://ideas.repec.org/a/eee/jobhdp/v179y2023ics0749597823000572.html)
- The "what-the-hell effect" (Polivy & Herman, 1985) describes how a single lapse can trigger abandoning the whole goal under all-or-nothing framing — [Woolley 2026, Consumer Psychology Review](https://myscp.onlinelibrary.wiley.com/doi/pdfdirect/10.1002/arcp.70004) cites the original. The streak framing comes from popular summaries such as [Plannr](https://plannr.do/resources/blog/why-habit-streaks-backfire-the-abstinence-violation-effect), which is a low-quality source.
- Strava reports that consistent users (a streak of at least one activity per week) are 4x as likely to have recorded 3 or more sport types as users whose current streak is under a month. This implies Strava's streak is also weekly — [Strava Year in Sport 2025 PDF](https://contentful-assets.strava.com/Strava-Year-In-Sport-Trend-Report-2025-UK.pdf)

### Inferences
- FitGen should make a planned rest day count as maintaining the streak. Options:
  - "Plan adherence": done when a scheduled workout is done or a scheduled rest day passes.
  - A weekly streak: hit N workouts per week, as in Hevy and Strava.
- FitGen should also add:
  - A limited freeze or repair, for example earned by consistency, covering sickness or travel.
  - A pause mode, like Apple's.
- When a streak breaks, don't show a dramatic loss screen. Show "best streak" and "workouts this month", which make progress visible, and frame the break as non-blaming.
- Streak-extension celebrations, especially in week one, are cheap and backed by evidence.

### Gaps
- I found no RCT that directly compares daily and weekly streaks for exercise adherence.
- I found no public retention data from Hevy on its weekly streak.

## 2. Push notification best practices

### Takeaway
Health & fitness apps get roughly 33–58% opt-in depending on the benchmark. Android 13 now requires opt-in, so Android rates are falling toward iOS levels. Median health apps send only about 2.5 pushes per user per month. Surveys show that frequency and irrelevance drive users to disable notifications or uninstall. FitGen sends no reminders today, which leaves the biggest lever unused. The first notifications should be plan-driven reminders on training days.

### Cited Findings
- Opt-in for Health & Fitness apps:
  - OneSignal 2024: Android 43.2%, iOS 33.5% — [OneSignal benchmarks 2024](https://onesignal.com/mobile-app-benchmarks-2024)
  - Airship 2025 medians for Medical, Health & Fitness: iOS 50% (high 70, low 24); Android 52% (high 72, low 20) — [Airship 2025 benchmarks PDF](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0)
  - Another Airship cut puts the medians at iOS 54.98% and Android 58.48% — [MobiLoud](https://www.mobiloud.com/blog/push-notification-opt-in-rate/)
  - The benchmarks disagree, which reflects differences in method and customer base.
- Android opt-in is falling after Android 13:
  - Airship's Android median fell from 71.3% in 2023 to 59.5% in 2024 — [Airship PDF](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0)
  - Batch measured Android at 85% → 67% and iOS at 58% → 56% — [Batch 2025](https://batch.com/ressources/etudes/benchmark-notifications-push-crm-mobile)
  - Batch also found that push re-opt-in prompts get about 11% click-through on Android and 9% on iOS, so asking again later is worthwhile — [Batch 2025](https://batch.com/ressources/etudes/benchmark-notifications-push-crm-mobile)
- Volume: Medical, Health & Fitness apps send a median of 2.5 pushes per user per month on both iOS and Android. High senders send 9.3 (iOS) and 12.6 (Android) — [Airship PDF](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0)
- The median Health & Fitness push open rate is about 7.6%, with the top quartile at 14.2% — [Benchmarketing](https://www.benchmarketing.org/benchmarks/metrics/push-notification-open-rate). This is an aggregator with unclear methods.
- Health & Fitness app retention: D1 28%, D7 18.13%, D30 8.48% — [OneSignal 2024](https://onesignal.com/mobile-app-benchmarks-2024)
- Fatigue surveys (older data):
  - YouGov 2021: when notifications are too frequent, 42% change settings, 39% turn notifications off entirely, and 8% delete the app — [YouGov](https://yougov.com/en-us/articles/36287-how-consumers-feel-about-push-notifications-2021)
  - Localytics 2017 (cited secondhand): 2–5 messages a week would lead 46% to disable push, and 6–10 a week would lead 32% to stop using the app — [Braze](https://www.braze.com/resources/articles/opt-out-of-push-notifications-why-users-do-it); [Business of Apps](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/)
- Just-in-time adaptive interventions (HeartSteps and others) send prompts when the user is receptive. HeartSteps pilot data show the effect wearing off for some users over time — [Personalized HeartSteps, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8439432/); [Liu 2023, AJPH](https://ajph.aphapublications.org/doi/full/10.2105/AJPH.2022.307150); [Vos 2025, AJPM JITAI trial](https://www.ajpmonline.org/article/S0749-3797(24)00315-5/fulltext)
- STEP UP sent participants a daily notification about their own progress, as part of the effective gamification arms — [JAMA Intern Med](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2749761)

### Inferences
- **Build local reminders first:**
  - On scheduled workout days only, at a time the user picks, defaulting to their usual workout time.
  - On rest days, send at most a recovery or rest note, or nothing.
  - Cap the total at about 3–5 a week, combining routine and social notifications.
- **"Save" notifications:** at most one evening nudge on a training day when the workout isn't logged. Never shame-based.
- **Opt-in priming:** ask for permission right after the user creates their plan ("Want us to remind you on Mon/Wed/Fri at 7pm?"), not at first launch. If they decline, re-prompt later, for example after their first streak milestone.

### Gaps
- I found no recent (2022+) peer-reviewed data that quantifies the optimal frequency for fitness pushes.
- I found no Brazil-specific opt-in data.
- I didn't find primary data on Duolingo's notification bandit system.

## 3. Gamification evidence in health apps

### Takeaway
Meta-analyses of RCTs find a small-to-medium effect of gamification on physical activity, and the effect fades once the intervention ends. Competition within small groups held up best after the intervention stopped. Evidence in children is weaker.

### Cited Findings
- Mazeas et al., *JMIR* 2022, systematic review and meta-analysis of RCTs:
  - 16 studies, about 2,407 participants.
  - Small-to-medium effect on physical activity: g = 0.42 (95% CI 0.14–0.69).
  - The long-term effect was described as smaller and less stable.
  — [JMIR](https://www.jmir.org/2022/1/e26779/); commentary in [JMIR 2022 e36396](https://www.jmir.org/2022/5/e36396/). The figures come from search snippets, because the full text failed to load. Verify before quoting.
- In children and adolescents (Wang et al., *JMIR Serious Games* 2025), there was no significant effect on moderate physical activity (SMD 0.16, 95% CI −0.2 to 0.53) — [PMC12445784](https://pmc.ncbi.nlm.nih.gov/articles/PMC12445784/)
- STEP UP RCT (*JAMA Internal Medicine* 2019, n=602 adults with overweight or obesity):
  - All arms combined points and levels with social incentives.
  - Extra daily steps compared with control during the 24 weeks: competition +920, support +689, collaboration +637.
  - In the 12-week follow-up after the intervention stopped, only the competition arm stayed significantly above control (+569).
  - Groups had only 3 people.
  - Points were "loss-framed": 70 points granted each Monday, then lost for missed goals.
  — [JAMA](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2749761); [Penn CHTI](https://chti.upenn.edu/step-up)

### Inferences
- Badges alone are weak. Gamification works best when it is "behaviorally designed":
  - Goals that users choose themselves.
  - Loss-framed weekly points.
  - Small groups.
  - Levels that recover after a bad stretch (STEP UP re-engaged participants in low levels at weeks 8 and 16).
- Expect the effect to decay. Rotate challenges and seasons.
- Risks:
  - Gaming the system, such as fake logs to save a streak.
  - Leaderboards that demotivate users at the bottom. Mitigate with small or peer-matched groups.

### Gaps
- I found no strong quantitative evidence on badges or achievements by themselves.
- I didn't retrieve the 2024 *JAMA Network Open* gamification meta-analysis (cited by Mazeas).

## 4. Social features and retention

### Takeaway
RCT evidence supports small-group social incentives: competition, collaboration, and a support partner. Platform data show that community activity is growing (Strava clubs), but public causal evidence that a feed itself increases retention is thin. Personal tracking should stay primary, with social as a layer on top.

### Cited Findings
- STEP UP's social arms all beat control. The support arm, where a nominated friend or relative got a weekly email report, gave +689 steps a day — [JAMA](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2749761)
- Strava 2025:
  - The number of clubs nearly quadrupled to 1 million.
  - Club-organized events grew 1.5x year over year.
  - 14 billion kudos were given.
  - Subscribers spend 1 hour being active for every 2 minutes in the app.
  — [Strava press](https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025); [Strava YIS PDF](https://contentful-assets.strava.com/Strava-Year-In-Sport-Trend-Report-2025-UK.pdf)

### Inferences
- For FitGen:
  - Offer an "accountability buddy" or small-club challenges of about 3–10 people over a large public feed.
  - Make the social layer react to workouts, so a logged workout gets kudos from the club, instead of being a destination to browse.
  - Keep "my plan today" first on Home, and put social below it or in its own tab.

### Gaps
- I couldn't find published Strava or Hevy retention numbers that compare users with and without followers or clubs. The search was rate-limited.

## 5. Re-engagement and comeback flows

### Takeaway
There is little rigorous evidence. Practitioner guidance suggests:
- Detect dormancy at 7–14 days.
- Use value reminders and deep links rather than discounts.
- Take advantage of cyclical motivation (January).
The streak research suggests the comeback should not highlight the broken streak, and should frame the restart without blame.

### Cited Findings
- Fitness re-engagement peaks around New Year resolutions — [RevenueCat](https://www.revenuecat.com/blog/growth/when-is-the-best-time-to-send-a-win-back-offer)
- Users reactivate "when the problem comes back," and this is cyclical in fitness — [RevenueCat](https://www.revenuecat.com/blog/growth/20-of-your-churned-users-will-come-back-but-are-you-ready)
- Users count as at risk at 7–14 days inactive and dormant at 30 or more days. Deep-link returning users to a specific screen — [AppsFlyer](https://www.appsflyer.com/glossary/dormant-users/)
- In an Airship survey, 30% of lapsed users said a discount would bring them back and 24% said exclusive content would. This is vendor data — [Airship](https://www.airship.com/solutions/win-back/)
- Streak repair weakens the demotivating effect of a broken streak — [INSEAD / Silverman & Barasch](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive)

### Inferences
- **Comeback flow:**
  - After 3–7 missed planned workouts, send one reminder that is about the plan.
  - On return, offer a "Recomeço" screen with a lighter re-entry workout, and optionally let the AI coach adjust the plan.
  - Grant a streak repair or bonus if they complete it within 48 hours.
  - Don't show the loss.
- Don't send repeated win-back pushes. One or two, then stop.

### Gaps
- I found no controlled studies of comeback flows in fitness apps.
