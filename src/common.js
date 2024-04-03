import axios from "axios";
import express from "express";
import rateLimit from "express-rate-limit";
import { stringify } from "flatted";

export function createServer(provider) {
  const app = express();
  let processingQueuedRequests = false;

  app.use((req, res, next) => {
    req.selectedServer = JSON.parse(req.header("X-Selected-Server"));
    res.setHeader("X-Server-ID", provider.name);
    next();
  });

  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: provider.throughput, // Limit each server to #throughput requests per `window` (here, per 1 minute).
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: `You have exceeded your ${provider.throughput} requests per minute limit.}`,
    handler: (req, res, next, options) => {
      console.log("Queueing request");
      // provider.queue.push({ req, res, timestamp: Date.now() });
      provider.queue.add({
        stringifiedReq: stringify(req),
        stringifiedRes: stringify(res),
        timestamp: Date.now(),
      });
      console.log(`${provider.name} Queue: `, provider.queue);
      next();
    },
  });

  app.use(limiter);
  app.use(express.json());

  // Middleware to store request timestamps
  app.use((req, res, next) => {
    // Store the timestamp of the current request
    const currentTime = Date.now();
    provider.requestTimestamps.push(currentTime);

    // Remove timestamps older than the window period
    provider.requestTimestamps = provider.requestTimestamps.filter(
      (timestamp) => currentTime - timestamp < 60 * 1000
    );

    next(); // Continue processing the request
  });

  async function retryQueuedRequests() {
    const currentTime = Date.now();
    // Remove expired timestamps from the array
    provider.requestTimestamps = provider.requestTimestamps.filter(
      (timestamp) => currentTime - timestamp < 60 * 1000
    );
    console.log("Timestamps: " + provider.requestTimestamps);

    console.log("Checking queue size");
    let queueLength = await provider.queue._eventsCount;

    if (provider.requestTimestamps.length < provider.throughput) {
      if (queueLength > 0 && !processingQueuedRequests) {
        processingQueuedRequests = true;
        provider.queue.process(async (job, done) => {
          console.log("Processing queued request");
          const queuedReq = parse(job.data.stringifiedReq);
          const queuedRes = parse(job.data.stringifiedRes);
          try {
            const response = await axios(
              `${queuedReq.selectedServer.server}${queuedReq.originalUrl}`,
              {
                method: queuedReq.method,
                headers: queuedReq.headers,
                data: queuedReq.body,
              }
            );
            console.log("retry response", response);
            queuedRes.status(response.status).send(response.data);
          } catch (error) {
            console.log("retry error", error);
            queuedRes.status(500).send("Error occurred during request.");
          }

          await job.remove();
          done();
        });

        processingQueuedRequests = false;

        // // Record the timestamp of the processed request
        // provider.requestTimestamps.push(currentTime);
      } else {
        console.log("Queue empty");
      }
    } else {
      console.log("Rate limit reached");
    }
  }

  // Start a timer to periodically check for rate limit window reset
  // Process queued requests if rate limit allows
  setInterval(retryQueuedRequests, 1000); // Check every second

  app.get("/", (req, res) => {
    res.json({
      server: `[Load Balancer] Server listening on port ${provider.port}`,
      message:
        "Welcome to the Load Balancer! Please use the /send-sms endpoint to access the data.",
    });
  });

  app.post("/send-sms", async (req, res) => {
    try {
      const message = req.body;
      const { code, result } = await provider.sendMessage(message);
      res.status(code).json(result);
    } catch (err) {
      console.log(err);
      res.status(err.code ?? 500).json(err);
    }
  });

  // Process queued requests if rate limit allows
  // app.use((req, res, next) => {
  //   const currentTime = Date.now();
  //   // Remove expired timestamps from the array
  //   provider.requestTimestamps = provider.requestTimestamps.filter(
  //     (timestamp) => currentTime - timestamp < 60 * 1000
  //   );
  //   // If rate limit allows, process the queued request
  //   if (
  //     provider.requestTimestamps.length < provider.throughput &&
  //     provider.queue.length > 0
  //   ) {
  //     const { req: queuedReq, res: queuedRes } = provider.queue.shift(); // Dequeue the request
  //     // Handle the request
  //     console.log("Processing queued request");
  //     makeRequest(queuedReq, queuedRes);
  //     queuedRes.send("Queued request processed successfully.");
  //     // Record the timestamp of the processed request
  //     provider.requestTimestamps.push(currentTime);
  //   }
  // });

  app.listen(provider.port, () => {
    console.log(`Server listening on port ${provider.port}`);
    console.log(`Process PID: ${process.pid}`);
  });
}
