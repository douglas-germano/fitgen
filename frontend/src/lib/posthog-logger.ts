import posthog from "posthog-js";

const logger = posthog.logger;

export const posthogAppLogger = {
    onboardingCompleted(completedSteps: number) {
        logger.info("onboarding completed", {
            event: "onboarding.completed",
            completed_steps: completedSteps,
        });
    },

    mealLogged(inputMethod: "image" | "description", mealType: string) {
        logger.info("meal logged", {
            event: "meal.logged",
            input_method: inputMethod,
            meal_type: mealType,
        });
    },

    workoutSessionCompleted(durationMinutes: number) {
        logger.info("workout session completed", {
            event: "workout_session.completed",
            duration_minutes: durationMinutes,
        });
    },
};
