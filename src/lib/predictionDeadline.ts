export const PREDICTIONS_DEADLINE_ISO = "2026-06-11T17:00:00Z";
export const PREDICTIONS_DEADLINE_DISPLAY = "11 de junio a las 19:00";

export const getPredictionsDeadlineTime = () => new Date(PREDICTIONS_DEADLINE_ISO).getTime();

export const arePredictionsPastDeadline = () => Date.now() >= getPredictionsDeadlineTime();
