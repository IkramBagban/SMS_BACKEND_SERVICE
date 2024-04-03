import axios from "axios";
import express from "express";
import rateLimit from "express-rate-limit";

export function createServer(provider) {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("X-Server-ID", provider.name);
    next();
  });

  const limiter = rateLimit({
    windowMs: 10 * 1000, // 1 minute
    // limit: provider.throughput, // Limit each server to #throughput requests per `window` (here, per 15 minutes).
    limit: 2,
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: `You have exceeded your ${provider.throughput} requests per minute limit.}`,
    handler: (req, res, next, options) => {
      console.log("Queueing request");
      provider.queue.push({ req, res, timestamp: Date.now() });
      console.log(`${provider.name} Queue: `, provider.queue);
      next();
    },
  });

  app.use(limiter);
  app.use(express.json());

  // Function to retry queued requests when rate limit window resets
  function retryQueuedRequests() {
    const currentTime = Date.now();
    for (let i = requestQueue.length - 1; i >= 0; i--) {
      const queuedRequest = provider.queue[i];
      if (queuedRequest.timestamp + limiter.windowMs <= currentTime) {
        // Retry the request
        makeRequest(queuedRequest.req, queuedRequest.res);
        // Remove the request from the queue
        requestQueue.splice(i, 1);
      }
    }
  }

  // Function to make the actual request
  async function makeRequest(req, res) {
    try {
      const response = await axios(req.originalUrl, {
        method: req.method,
        headers: req.headers,
        data: req.body,
      });
      res.status(response.status).send(response.data);
    } catch (error) {
      res.status(500).send("Error occurred during request.");
    }
  }

  // Start a timer to periodically check for rate limit window reset
  setInterval(retryQueuedRequests, 1000); // Check every second

  // Middleware to store request timestamps
  // app.use((req, res, next) => {
  //   // Store the timestamp of the current request
  //   const currentTime = Date.now();
  //   provider.requestTimestamps.push(currentTime);

  //   // Remove timestamps older than the window period
  //   provider.requestTimestamps = provider.requestTimestamps.filter(
  //     (timestamp) => currentTime - timestamp < 60 * 1000
  //   );

  //   next(); // Continue processing the request
  // });

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
  // app.use

  app.listen(provider.port, () => {
    console.log(`Server listening on port ${provider.port}`);
    console.log(`Process PID: ${process.pid}`);
  });
}
