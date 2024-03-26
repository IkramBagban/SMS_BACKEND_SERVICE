const express = require("express");
require('dotenv').config();
// Remember to replace with your actual Twilio Account SID and Auth Token
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN

);

const app = express();
app.use(express.json());

const queue = [];

class SMSProvider {
  constructor(name, throughput) {
    this.name = name;
    this.throughput = throughput;
    this.isDown = false; // Assume all providers are up initially
    this.count = 0;
  }
}

class AirtelProvider extends SMSProvider {
  // Additional functionality specific to AirtelProvider if needed
  async sendSMS(phoneNumber, text) {
    // Implementation of sending SMS should be here
    try {
      //   const response = await twilioClient.messages.create({
      //     body: text,
      //     to: phoneNumber,
      //     from: process.env.TWILIO_PHONE_NUMBER,
      //   });
      console.log("sending msg via Airtel VIProvider");

      this.count++;
      //   return response;
    } catch (e) {
      console.log(e);
    }
  }
}

class JIOProvider extends SMSProvider {
  // Additional functionality specific to JIOProvider if needed
  async sendSMS(phoneNumber, text) {
    // Implementation of sending SMS should be here
    try {
      //   const response = await twilioClient.messages.create({
      //     body: text,
      //     to: phoneNumber,
      //     from: process.env.TWILIO_PHONE_NUMBER,
      //   });
      console.log("sending msg via JIO Provider");

      this.count++;
      //   return response;
    } catch (e) {
      console.log(e);
    }
  }
}

class VIProvider extends SMSProvider {
  // Additional functionality specific to VIProvider if needed
  async sendSMS(phoneNumber, text) {
    // Implementation of sending SMS should be here
    try {
      //   const response = await twilioClient.messages.create({
      //     body: text,
      //     to: phoneNumber,
      //     from: process.env.TWILIO_PHONE_NUMBER,
      //   });
      console.log("sending msg via VIProvider");
      this.count++;
      //   return response;
    } catch (e) {
      console.log(e);
    }
  }
}

class LoadBalancer {
  constructor(providers) {
    this.providers = providers;
    this.providerCounts = {};
    providers.forEach((provider) => {
      this.providerCounts[provider.name] = 0;
    });
  }

  getTotalThroughput() {
    return this.providers.reduce((totalThroughput, provider) => {
      return totalThroughput + provider.throughput;
    }, 0);
  }

  async assignTask(requests) {
    let totalRequestsHandled = 0;
    const totalThroughput = this.getTotalThroughput();
    let activeProviders = this.providers.filter((provider) => !provider.isDown);

    if (activeProviders.length === 0) {
      console.log("All providers are down. Queuing the requests", requests);
      queue.push(...requests);
      return;
    }

    for (const provider of activeProviders) {
      const weight = provider.throughput / totalThroughput;
      const numRequests = Math.floor(weight * requests.length);
      let requestsForThisProvider = requests.slice(
        totalRequestsHandled,
        totalRequestsHandled + numRequests
      );

      for (const request of requestsForThisProvider) {
        await provider.sendSMS(request.phoneNumber, request.text);
        this.providerCounts[provider.name]++;
      }

      totalRequestsHandled += numRequests;
    }

    // Handle any leftover requests if rounding left some out
    if (totalRequestsHandled < requests.length) {
      let leftoverRequests = requests.slice(totalRequestsHandled);
      for (const request of leftoverRequests) {
        let provider = activeProviders[0]; // Default to the first provider, but could be enhanced to spread out leftover requests
        await provider.sendSMS(request.phoneNumber, request.text);
        this.providerCounts[provider.name]++;
      }
    }
  }

  // assignTask(requests) {
  //     let totalRequestsHandled = 0;
  //     const totalThroughput = this.getTotalThroughput();
  //     let activeProviders = this.providers.filter((provider) => !provider.isDown);

  //     if (activeProviders.length === 0) {
  //     console.log("all providers are down. queuing the requests", requests);
  //     queue.push(...requests);
  //     return;
  //     }

  //     activeProviders.forEach((provider) => {
  //     const weight = provider.throughput / totalThroughput;
  //     const numRequests = Math.floor(weight * requests.length);
  //     let requestsForThisProvider = requests.slice(
  //         totalRequestsHandled,
  //         totalRequestsHandled + numRequests
  //     );
  //     requestsForThisProvider.forEach(async (request) => {
  //         const response = await provider.sendSMS(
  //         request.phoneNumber,
  //         request.text
  //         );
  //         this.providerCounts[provider.name]++;
  //     });
  //     totalRequestsHandled += numRequests;
  //     });

  //     // Handle any leftover requests if rounding left some out
  //     if (totalRequestsHandled < requests.length) {
  //     let leftoverRequests = requests.slice(totalRequestsHandled);
  //     leftoverRequests.forEach(async (request) => {
  //         let provider = activeProviders[0]; // Default to the first provider, but could be enhanced to spread out leftover requests
  //         await provider.sendSMS(request.phoneNumber, request.text);
  //         this.providerCounts[provider.name]++;
  //     });
  //     }
  // }

  async retryFailed() {
    // Logic to retry sending queued messages
    while (queue.length > 0) {
      const requests = queue.splice(0, queue.length); // Get all queued messages
      await this.assignTask(requests); // Attempt to reassign
    }
  }

  getProviderCounts() {
    return this.providerCounts;
  }
}

const SMS_PROVIDERS = [
  new AirtelProvider("airtel", 20),
  new JIOProvider("Jio", 20),
  new VIProvider("VI", 10),
];

const resetAllProviders = () =>
  SMS_PROVIDERS.forEach((p) => {
    p.count = 0;
    p.isDown = false;
  });

app.post("/send-sms", async (req, res) => {
  const { messages } = req.body;
  console.log("Round-robin distribution", messages.length);

  const loadBalancer = new LoadBalancer(SMS_PROVIDERS);
  await loadBalancer.assignTask(messages); // Ensure await is used here

  // Note: Consider where and how you use retryFailed; might not want to mix with immediate response
  // const interval = setInterval(async () => {
  //     if (queue.length <= 0) clearInterval(interval);
  //     await loadBalancer.retryFailed();
  // }, 60 * 1000);

  // Retrieve provider counts after sending messages
  const providerCounts = loadBalancer.getProviderCounts();
  console.log("Provider Counts:", providerCounts);

  // Provide a response or further processing as needed
  res.send({ message: "Messages processing completed", providerCounts });

  resetAllProviders(); // Consider the implications of resetting here if messages are still sending
});

// app.post("/send-sms", async (req, res) => {
// const { messages } = req.body;
// console.log("Round-robin distribution", messages.length);

// const loadBalancer = new LoadBalancer(SMS_PROVIDERS);
// loadBalancer.assignTask(messages);

// const interval = setInterval(async () => {
//     if (queue.length <= 0) clearInterval(interval);
//     await loadBalancer.retryFailed();
// }, 60 * 1000);

// // Retrieve provider counts after sending messages
// const providerCounts = loadBalancer.getProviderCounts();
// console.log("Provider Counts:", providerCounts);

// // Provide a response or further processing as needed
// res.send("Messages sent successfully");

// resetAllProviders();
// });

const PORT = process.env.PORT || 3032;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
