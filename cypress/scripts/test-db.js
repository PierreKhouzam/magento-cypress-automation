const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const dbPath = path.join(__dirname, '../db/test-history.json');

async function ensureDbDirectory() {
    const dbDir = path.dirname(dbPath);
    try {
        await fs.mkdir(dbDir, { recursive: true });
        logger.info(`Ensured DB directory exists: ${dbDir}`);
    } catch (error) {
        logger.error(`Failed to create DB directory ${dbDir}:`, { error: error.message });
        throw error;
    }
}

async function saveTestHistory(testHistory) {
    try {
        await ensureDbDirectory();
        await fs.writeFile(dbPath, JSON.stringify(testHistory, null, 2));
        logger.info(`Test history saved to ${dbPath}`, { testCount: Object.keys(testHistory).length });
    } catch (error) {
        logger.error('Error saving test history:', { error: error.message });
        throw error;
    }
}

async function loadTestHistory() {
    try {
        await ensureDbDirectory();
        const data = await fs.readFile(dbPath, 'utf8');
        const history = JSON.parse(data);
        logger.info(`Test history loaded from ${dbPath}`, { testCount: Object.keys(history).length });
        return history;
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.info(`No test history file found at ${dbPath}, starting fresh.`);
            return {};
        }
        logger.error('Error loading test history:', { error: error.message });
        throw error;
    }
}

module.exports = { saveTestHistory, loadTestHistory };