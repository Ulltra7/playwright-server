"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseScraper = void 0;
const playwright_1 = require("playwright");
const urls_1 = require("../constants/urls");
class BaseScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }
    async initBrowser() {
        this.browser = await playwright_1.chromium.launch({
            headless: urls_1.BROWSER_CONFIG.HEADLESS,
            args: urls_1.BROWSER_CONFIG.ARGS
        });
        this.page = await this.browser.newPage();
    }
    async navigateToUrl(url) {
        if (!this.page) {
            throw new Error('Browser not initialized. Call initBrowser() first.');
        }
        console.log(`🌐 Navigating to ${url}`);
        await this.page.goto(url, {
            waitUntil: 'networkidle',
            timeout: urls_1.BROWSER_CONFIG.TIMEOUT
        });
        // Wait for page to load
        await this.page.waitForTimeout(urls_1.BROWSER_CONFIG.WAIT_FOR_LOAD);
    }
    async getPageInfo() {
        if (!this.page) {
            throw new Error('Browser not initialized. Call initBrowser() first.');
        }
        const title = await this.page.title();
        const url = this.page.url();
        return { title, url };
    }
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
exports.BaseScraper = BaseScraper;
