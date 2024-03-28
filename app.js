const express = require("express");
const LoadBalancer = require("./models/loadbalancer");
const { readQueue } = require("./utils/queue");
require("dotenv").config();
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
    this.isDown = false;
    this.count = 0;
    this.messageTimestamps = [];
  }

  canSend() {
    const now = Date.now();
    this.messageTimestamps = this.messageTimestamps.filter(
      (timestamp) => now - timestamp < 60000
    );
    return this.messageTimestamps.length < this.throughput;
  }

  async sendSMS(phoneNumber, text) {
    if (this.canSend()) {
      try {
        const response = await this.sendMessage(phoneNumber, text);
        this.count++;
        this.messageTimestamps.push(Date.now());
        // console.log(`Message sent via ${this.name}`);
        return response;
      } catch (e) {
        console.error(`${this.name} error:`, e);
        throw e; 
      }
    } else {
      console.warn(`${this.name} has reached its throughput limit.`);
      return null;
    }
  }

  async sendMessage(phoneNumber, text) {
    console.log(phoneNumber, text);
    
  }
}
class AirtelProvider extends SMSProvider {
  async sendMessage(phoneNumber, text) {
    try {
      console.log(phoneNumber, text);

      const response = await twilioClient.messages.create({ body: text, to: phoneNumber, from: process.env.TWILIO_PHONE_NUMBER });
      return response;
    } catch (e) {
      console.log(e);
    }
  }
}

class JIOProvider extends SMSProvider {
    async sendMessage(phoneNumber, text) {
        try {
          console.log(phoneNumber, text);
    
          const response = await twilioClient.messages.create({ body: text, to: phoneNumber, from: process.env.TWILIO_PHONE_NUMBER });
          return response;
        } catch (e) {
          console.log(e);
        }
      }
}

class VIProvider extends SMSProvider {
    async sendMessage(phoneNumber, text) {
        try {
          console.log(phoneNumber, text);
    
          const response = await twilioClient.messages.create({ body: text, to: phoneNumber, from: process.env.TWILIO_PHONE_NUMBER });
          return response;
        } catch (e) {
          console.log(e);
        }
      }
}

const SMS_PROVIDERS = [
  new AirtelProvider("airtel", 10),
  new JIOProvider("Jio", 10),
  new VIProvider("VI", 10),
];

// SMS_PROVIDERS[0].isDown = true
// SMS_PROVIDERS.forEach((p, i) => {
// if(i===0) return;
//     p.count = 0;
//     p.isDown = true;
// //   });
const resetAllProviders = () =>
  SMS_PROVIDERS.forEach((p) => {
    p.count = 0;
    p.isDown = false;
  });
  const loadBalancer = new LoadBalancer(SMS_PROVIDERS);


app.post("/send-sms", async (req, res) => {
  const { messages } = req.body;
  console.log("Round-robin distribution", messages.length);

  await loadBalancer.assignTask(messages); 

  const providerCounts = loadBalancer.getProviderCounts();
  console.log("Provider Counts:", providerCounts);

  res.send({ message: "Messages processing completed", providerCounts });

  resetAllProviders();
});

const PORT = process.env.PORT || 3032;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
