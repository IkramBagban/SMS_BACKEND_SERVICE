const express = require("express");
const LoadBalancer = require("./models/loadbalancer");
require('dotenv').config();
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN

);

const app = express();
app.use(express.json());


class SMSProvider {
  constructor(name, throughput) {
    this.name = name;
    this.throughput = throughput;
    this.isDown = false; // Assume all providers are up initially
    this.count = 0;
  }
}

class AirtelProvider extends SMSProvider {
  async sendSMS(phoneNumber, text) {
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
  async sendSMS(phoneNumber, text) {
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
  async sendSMS(phoneNumber, text) {
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



const SMS_PROVIDERS = [
  new AirtelProvider("airtel", 20),
  new JIOProvider("Jio", 20),
  new VIProvider("VI", 20),
];

SMS_PROVIDERS.forEach((p) => {
    p.count = 0;
    p.isDown = true;
  });
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

  // const interval = setInterval(async () => {
  //     if (queue.length <= 0) clearInterval(interval);
  //     await loadBalancer.retryFailed();
  // }, 60 * 1000);

  // Retrieve provider counts after sending messages
  const providerCounts = loadBalancer.getProviderCounts();
  console.log("Provider Counts:", providerCounts);

  // Provide a response or further processing as needed
  res.send({ message: "Messages processing completed", providerCounts });

  resetAllProviders(); 
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
