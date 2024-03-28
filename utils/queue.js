const fs = require('fs');
const path = require('path');
const queueFilePath = path.resolve('database', 'queue.json');

async function readQueue() {
    try {
        const data = await fs.promises.readFile(queueFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading queue file:", err);
        return []; 
    }
}

async function writeQueue(queue) {
    try {
        const data = JSON.stringify(queue, null, 2);
        await fs.promises.writeFile(queueFilePath, data, 'utf8');
    } catch (err) {
        console.error("Error writing to queue file:", err);
    }
}

module.exports = {readQueue, writeQueue}