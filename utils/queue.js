const fs = require('fs');
const path = require('path');
const queueFilePath = path.resolve('database', 'queue.json');

// Function to read queue from file
async function readQueue() {
    try {
        const data = await fs.promises.readFile(queueFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading queue file:", err);
        return []; // Return an empty queue if there's an error (e.g., file doesn't exist)
    }
}

// Function to write queue to file
async function writeQueue(queue) {
    try {
        const data = JSON.stringify(queue, null, 2);
        await fs.promises.writeFile(queueFilePath, data, 'utf8');
    } catch (err) {
        console.error("Error writing to queue file:", err);
    }
}

module.exports = {readQueue, writeQueue}