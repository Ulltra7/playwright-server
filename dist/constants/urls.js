"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROWSER_CONFIG = exports.JOB_SITES = void 0;
exports.JOB_SITES = {
    SWISS_DEV_JOBS: {
        BASE_URL: "https://swissdevjobs.ch",
        ALL_JOBS: "https://swissdevjobs.ch/",
        NAME: "Swiss Dev Jobs",
    },
    ARBEITNOW: {
        BASE_URL: "https://www.arbeitnow.com",
        API_URL: "https://www.arbeitnow.com/api/job-board-api",
        NAME: "Arbeitnow",
    },
};
exports.BROWSER_CONFIG = {
    HEADLESS: true,
    ARGS: ["--no-sandbox", "--disable-setuid-sandbox"],
    TIMEOUT: 30000,
    WAIT_FOR_LOAD: 2000,
};
