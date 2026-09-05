/** Queue name shared by the API producer and the runner consumer. */
export const SUBMISSION_QUEUE = "submissions";

/** How long a finished job's result stays readable by the status endpoint. */
export const RESULT_TTL_SECONDS = 60 * 15;
