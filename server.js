const express = require("express");
const { readQueue, writeQueue } = require("./utils/queue");
const { TokenBucket } = require("./utils/rate-limiter");

const app = express();
app.use(express.json());

class SMSProvider {
  constructor(name, throughput) {
    this.name = name;
    this.throughput = throughput;
    this.isDown = false;
    this.count = 0;
    this.messageTimestamps = [];
    this.tokenBucket = new TokenBucket(this.throughput, this.throughput / 60);
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const isSuccess = Math.random() < 0.8; // Simulate 80% success rate
      if (isSuccess) {
        if (tokenBucket.consume(1)) {
          // Consume 1 token for each successful message
          resolve(`Message ${message.id} sent successfully`); // Resolve with receipt
        } else {
          console.log(`Rate limit exceeded. Delaying message #${message.id}`);
          setTimeout(() => {
            sendMessage(message).then(resolve).catch(reject); // Retry sending message after delay
          }, 1000); // 1 second delay

          // Refill tokens during the delay
          tokenBucket.refill();
        }
      } else {
        // console.log("Message sending failed:", message);
        reject(`Failed to send message ${message.id}`); // Reject with error message
      }
    });

    async function sendMessages() {
      try {
        while (true) {
          const queue = await readQueue(); // Fetch the queue data dynamically
          if (queue.length === 0) {
            console.log("Queue is empty. Exiting.");
            break;
          }
          const message = queue.shift(); // Get the first message from the queue
          try {
            const data = await this.sendMessage(message); // Send the message asynchronously
            console.log(data);
          } catch (error) {
            console.error(error);
            // If sending the message fails, write it back to the queue
            await writeQueue(message);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
}

const PORT = process.env.PORT || 3032;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
