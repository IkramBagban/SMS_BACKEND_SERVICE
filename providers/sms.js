export class SMSProvider {
  constructor(name, throughput) {
    this.name = name;
    this.throughput = throughput;
    this.status = "idle";
    this.count = 0;
    this.queue = [];
    this.messageTimestamps = [];
    this.tokenBucket = new TokenBucket(this.throughput, this.throughput / 60);
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const isSuccess = Math.random() < 0.8; // Simulate 80% success rate
      if (isSuccess) {
        if (tokenBucket.consume(1)) {
          // Consume 1 token for each successful message
          resolve({
            message: `Message ${message.id} sent successfully`,
            senderName: this.name,
          }); // Resolve with receipt
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
  }

  async sendMessages() {
    try {
      while (true) {
        const queue = await readQueue(); // Fetch the queue data dynamically
        if (queue.length === 0) {
          console.log("Queue is empty. Exiting.");
          this.status = "idle";
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
