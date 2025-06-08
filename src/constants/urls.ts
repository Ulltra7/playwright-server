export const JOB_SITES = {
  SWISS_DEV_JOBS: {
    BASE_URL: "https://swissdevjobs.ch",
    ALL_JOBS: "https://swissdevjobs.ch/",
    NAME: "Swiss Dev Jobs",
  },
} as const;

export const BROWSER_CONFIG = {
  HEADLESS: true,
  ARGS: ["--no-sandbox", "--disable-setuid-sandbox"] as string[],
  TIMEOUT: 30000,
  WAIT_FOR_LOAD: 2000,
};
