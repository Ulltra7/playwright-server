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
            args: urls_1.BROWSER_CONFIG.ARGS,
        });
        this.page = await this.browser.newPage();
    }
    async navigateToUrl(url) {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        console.log(`🌐 Navigating to ${url}`);
        await this.page.goto(url, {
            waitUntil: "networkidle",
            timeout: urls_1.BROWSER_CONFIG.TIMEOUT,
        });
        // Wait for page to load
        await this.page.waitForTimeout(urls_1.BROWSER_CONFIG.WAIT_FOR_LOAD);
    }
    async getPageInfo() {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        const title = await this.page.title();
        const url = this.page.url();
        return { title, url };
    }
    // Add debugging methods
    async takeScreenshot(filename = "debug-screenshot.png") {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        await this.page.screenshot({ path: filename, fullPage: true });
        console.log(`📸 Screenshot saved as ${filename}`);
    }
    async getPageSource() {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        return await this.page.content();
    }
    async analyzePageStructure(customSelectors = []) {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        // Get basic page info
        const title = await this.page.title();
        const url = this.page.url();
        // Default selectors for common content patterns
        const defaultSelectors = [
            "article",
            ".card",
            ".item",
            ".content",
            ".entry",
            '[class*="listing"]',
            '[class*="card"]',
            '[class*="item"]',
            '[class*="content"]',
        ];
        // Combine default selectors with any custom ones provided
        const selectors = [...defaultSelectors, ...customSelectors];
        const foundElements = {};
        for (const selector of selectors) {
            try {
                const elements = await this.page.$$(selector);
                if (elements.length > 0) {
                    const firstElementText = await elements[0].textContent();
                    foundElements[selector] = {
                        count: elements.length,
                        firstElementText: firstElementText?.substring(0, 200) + "...",
                    };
                }
            }
            catch (error) {
                // Selector might be invalid, continue
            }
        }
        // Get all links to analyze navigation structure
        const links = await this.page.$$eval("a", (anchors) => anchors
            .map((anchor) => ({
            href: anchor.href,
            text: anchor.textContent?.trim(),
            className: anchor.className,
        }))
            .filter((link) => link.text && link.text.length > 0));
        return {
            title,
            url,
            foundElements,
            totalLinks: links.length,
            allLinks: links.slice(0, 20), // First 20 links for analysis
            bodyText: (await this.page.textContent("body"))?.substring(0, 500) + "...",
        };
    }
    // Method to analyze semantic attributes and structured data
    async analyzeSemanticStructure(customAttributes = []) {
        if (!this.page) {
            throw new Error("Browser not initialized. Call initBrowser() first.");
        }
        // Look for semantic attributes and structured data
        const semanticData = await this.page.evaluate((customAttrs) => {
            const results = {
                labelAttributes: [],
                dataAttributes: [],
                schemaOrgData: [],
                microdata: [],
                jsonLd: [],
            };
            // Find elements with label attributes
            const labelElements = document.querySelectorAll("[label]");
            labelElements.forEach((el, index) => {
                if (index < 10) {
                    // Limit to first 10 for performance
                    results.labelAttributes.push({
                        label: el.getAttribute("label"),
                        tagName: el.tagName,
                        textContent: el.textContent?.trim().substring(0, 100),
                        className: el.className,
                    });
                }
            });
            // Find elements with data-* attributes - use custom attributes if provided
            const defaultDataAttrs = [
                "data-id",
                "data-name",
                "data-type",
                "data-content",
            ];
            const dataAttrsToSearch = customAttrs.length > 0 ? customAttrs : defaultDataAttrs;
            const dataSelector = dataAttrsToSearch
                .map((attr) => `[${attr}]`)
                .join(", ");
            if (dataSelector) {
                const dataElements = document.querySelectorAll(dataSelector);
                dataElements.forEach((el, index) => {
                    if (index < 10) {
                        const attrs = {};
                        for (const attr of el.attributes) {
                            if (attr.name.startsWith("data-")) {
                                attrs[attr.name] = attr.value;
                            }
                        }
                        results.dataAttributes.push({
                            attributes: attrs,
                            tagName: el.tagName,
                            textContent: el.textContent?.trim().substring(0, 100),
                            className: el.className,
                        });
                    }
                });
            }
            // Look for Schema.org structured data
            const schemaElements = document.querySelectorAll('[itemtype*="schema.org"]');
            schemaElements.forEach((el, index) => {
                if (index < 10) {
                    results.schemaOrgData.push({
                        itemtype: el.getAttribute("itemtype"),
                        itemscope: el.getAttribute("itemscope"),
                        tagName: el.tagName,
                        textContent: el.textContent?.trim().substring(0, 100),
                        className: el.className,
                    });
                }
            });
            // Look for microdata properties
            const microdataElements = document.querySelectorAll("[itemprop]");
            microdataElements.forEach((el, index) => {
                if (index < 20) {
                    const itemprop = el.getAttribute("itemprop");
                    if (itemprop) {
                        results.microdata.push({
                            itemprop: itemprop,
                            tagName: el.tagName,
                            textContent: el.textContent?.trim().substring(0, 100),
                            className: el.className,
                        });
                    }
                }
            });
            // Look for JSON-LD structured data
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach((script, index) => {
                if (index < 5) {
                    try {
                        const jsonData = JSON.parse(script.textContent || "");
                        results.jsonLd.push(jsonData);
                    }
                    catch (e) {
                        // Invalid JSON, skip
                    }
                }
            });
            return results;
        }, customAttributes);
        return semanticData;
    }
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
    // Debugging method to analyze job card structure
    async debugJobCard(element, index) {
        if (!this.page)
            return;
        try {
            // Highlight the job card and take a screenshot
            await element.evaluate((el) => {
                el.style.border = "3px solid red";
                el.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
            });
            // Get all text content from the element for debugging
            const allText = await element.textContent();
            console.log(`🔍 Job card ${index} content:`, allText?.substring(0, 300) + "...");
            // Get HTML structure
            const innerHTML = await element.innerHTML();
            console.log(`🔍 Job card ${index} HTML structure:`, innerHTML.substring(0, 500) + "...");
        }
        catch (error) {
            console.log(`⚠️ Error debugging job card ${index}:`, error);
        }
    }
}
exports.BaseScraper = BaseScraper;
