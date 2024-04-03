import Queue from "bull";

export class SMSProvider {
  constructor(name, throughput, port) {
    this.port = port;
    this.name = name;
    this.throughput = throughput;
    this.status = "idle";
    this.count = 0;
    this.queue = new Queue("requestQueue");
    this.requestTimestamps = [];
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const isSuccess = Math.random() < 0.8; // Simulate 80% success rate
      if (isSuccess) {
        resolve({
          code: 200,
          result: {
            message: `Message ${message.id} sent successfully`,
            senderName: this.name,
          },
        }); // Resolve with receipt
      } else {
        // console.log("Message sending failed:", message);
        reject({
          code: 500,
          reason: {
            senderName: this.name,
            message: `Failed to send message ${message.id}`,
          },
        }); // Reject with error message
      }
    });
  }
}
