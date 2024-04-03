import axios from "axios";
import express from "express";
import rateLimit from "express-rate-limit";

export function createServer(provider) {
  const app = express();

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
      provider.queue.add({ req, res, timestamp: Date.now() });
      console.log(`${provider.name} Queue: `, provider.queue.length);
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

  // Function to make the actual request
  // async function makeRequest(req, res) {
  //   try {
  //     const response = await axios(
  //       `${req.selectedServer.server}${req.originalUrl}`,
  //       {
  //         method: req.method,
  //         headers: req.headers,
  //         data: req.body,
  //       }
  //     );
  //     console.log("retry response", response);
  //     res.status(response.status).send(response.data);
  //   } catch (error) {
  //     console.log("retry error", error);
  //     res.status(500).send("Error occurred during request.");
  //   }
  // }

  async function retryQueuedRequests() {
    const currentTime = Date.now();
    // Remove expired timestamps from the array
    provider.requestTimestamps = provider.requestTimestamps.filter(
      (timestamp) => currentTime - timestamp < 60 * 1000
    );
    console.log("Timestamps: " + provider.requestTimestamps);

    // If rate limit allows, process the queued request
    // Improved version of the code snippet
    async function processQueue(provider) {
      if (provider.requestTimestamps.length < provider.throughput) {
        if (provider.queue.length > 0) {
          const job = await queue.getJob(provider.queue.shift()); // Dequeue the request using a queue library
          // Handle the request
          console.log("Processing queued request");
          try {
            const response = await axios(
              `${job.data.req.selectedServer.server}${job.data.req.originalUrl}`,
              {
                method: job.data.req.method,
                headers: job.data.req.headers,
                data: job.data.req.body,
              }
            );
            console.log("retry response", response);
            job.data.res.status(response.status).send(response.data);
          } catch (error) {
            console.log("retry error", error);
            job.data.res.status(500).send("Error occurred during request.");
          }
          // Record the timestamp of the processed request
          provider.requestTimestamps.push(currentTime);
        } else {
          console.log("Queue empty");
        }
      } else {
        console.log("Rate limit reached");
      }
    }

    // Call the function or method with the provider object
    processQueue(provider);
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
