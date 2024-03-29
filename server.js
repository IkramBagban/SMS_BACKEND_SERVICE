const express = require("express");
const LoadBalancer = require("./models/loadbalancer");
const { readQueue, writeQueue } = require("./utils/queue");
const { TokenBucket } = require("./utils/rate-limiter");
const { SMSProvider } = require("./providers/sms");

const app = express();
app.use(express.json());

const SMS_PROVIDERS = [
  new SMSProvider("Airtel", 10),
  new SMSProvider("Jio", 10),
  new SMSProvider("VI", 10),
];

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
