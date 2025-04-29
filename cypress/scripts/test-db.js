// test-db.js
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');

const DB_DIR = config.db.dir;
const TEST_DATA_FILE = path.join(DB_DIR, 'test-history.json');
const RUN_DATA_FILE = path.join(DB_DIR, 'run-metadata.json');

/**
 * Initialize database directory and files.
 */
async function initializeDB() {
    try {
        await fs.mkdir(DB_DIR, { recursive: true });
        if (!await fs.access(TEST_DATA_FILE).then(() => true).catch(() => false)) {
            await fs.writeFile(TEST_DATA_FILE, JSON.stringify({}));
        }
        if (!await fs.access(RUN_DATA_FILE).then(() => true).catch(() => false)) {
            await fs.writeFile(RUN_DATA_FILE, JSON.stringify([]));
        }
    } catch (error) {
        logger.error('Error initializing DB:', { error: error.message });
    }
}

/**
 * Load test history from file.
 * @returns {Promise<Object>} Test history object
 */
async function loadTestHistory() {
    try {
        await initializeDB();
        const data = await fs.readFile(TEST_DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (typeof parsed !== 'object' || parsed === null) {
            logger.error('Invalid test history format, returning empty object');
            return {};
        }
        return parsed;
    } catch (error) {
        logger.error('Error loading test history:', { error: error.message });
        return {};
    }
}

/**
 * Save test history to file.
 * @param {Object} history - Test history object
 */
async function saveTestHistory(history) {
    try {
        await initializeDB();
        await fs.writeFile(TEST_DATA_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        logger.error('Error saving test history:', { error: error.message });
    }
}

/**
 * Record a test run with metadata.
 * @param {string} runId - Unique run identifier
 * @param {Object} metadata - Run metadata
 */
async function recordTestRun(runId, metadata) {
    try {
        await initializeDB();
        const runData = JSON.parse(await fs.readFile(RUN_DATA_FILE, 'utf8'));
        runData.push({
            runId,
            timestamp: new Date().toISOString(),
            ...metadata
        });

        // Keep only the last configured number of runs
        if (runData.length > config.db.historyLimit) {
            runData.splice(0, runData.length - config.db.historyLimit);
        }

        await fs.writeFile(RUN_DATA_FILE, JSON.stringify(runData, null, 2));
    } catch (error) {
        logger.error('Error recording test run:', { error: error.message });
    }
}

/**
 * Get run metadata by ID.
 * @param {string} runId - Run identifier
 * @returns {Promise<Object|null>} Run metadata or null
 */
async function getRunMetadata(runId) {
    try {
        await initializeDB();
        const runData = JSON.parse(await fs.readFile(RUN_DATA_FILE, 'utf8'));
        return runData.find(run => run.runId === runId) || null;
    } catch (error) {
        logger.error('Error getting run metadata:', { error: error.message });
        return null;
    }
}

/**
 * Get all run metadata.
 * @returns {Promise<Array>} Array of run metadata
 */
async function getAllRunMetadata() {
    try {
        await initializeDB();
        return JSON.parse(await fs.readFile(RUN_DATA_FILE, 'utf8'));
    } catch (error) {
        logger.error('Error getting all run metadata:', { error: error.message });
        return [];
    }
}

module.exports = {
    loadTestHistory,
    saveTestHistory,
    recordTestRun,
    getRunMetadata,
    getAllRunMetadata
};