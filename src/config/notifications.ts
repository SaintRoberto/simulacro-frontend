const configuredSeconds = Number(process.env.REACT_APP_NOTIFICATIONS_POLL_INTERVAL_SECONDS);

export const NOTIFICATIONS_POLL_INTERVAL_MS =
  Number.isFinite(configuredSeconds) && configuredSeconds > 0
    ? configuredSeconds * 1000
    : 5000;
