"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROWSER_CONFIG = exports.JOB_SITES = void 0;
exports.JOB_SITES = {
    SWISS_DEV_JOBS: {
        BASE_URL: 'https://swissdevjobs.ch',
        ALL_JOBS: 'https://swissdevjobs.ch/de/jobs/all',
        NAME: 'Swiss Dev Jobs'
    }
};
exports.BROWSER_CONFIG = {
    HEADLESS: true,
    ARGS: ['--no-sandbox', '--disable-setuid-sandbox'],
    TIMEOUT: 30000,
    WAIT_FOR_LOAD: 2000
};
