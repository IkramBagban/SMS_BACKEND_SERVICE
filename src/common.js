import express from "express";
import rateLimit from "express-rate-limit";

export function createServer(provider) {
  const app = express();

  const limiter = rateLimit({
    windowMs: 10 * 1000, // 1 minute
    // limit: provider.throughput, // Limit each server to #throughput requests per `window` (here, per 15 minutes).
    limit: 2,
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: `You have exceeded your ${provider.throughput} requests per minute limit.}`,
    handler: (req, res, next, options) => {
      console.log("Queueing request");
      provider.queue.push({ req, res });
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
  app.use((req, res, next) => {
    const currentTime = Date.now();
    // Remove expired timestamps from the array
    provider.requestTimestamps = provider.requestTimestamps.filter(
      (timestamp) => currentTime - timestamp < 60 * 1000
    );
    // If rate limit allows, process the queued request
    if (provider.requestTimestamps.length < provider.throughput) {
      const { req: queuedReq, res: queuedRes } = provider.queue.shift(); // Dequeue the request
      // Handle the request
      console.log("Processing queued request");
      queuedRes.send("Queued request processed successfully.");
      // Record the timestamp of the processed request
      provider.requestTimestamps.push(currentTime);
    }
  });

  app.listen(provider.port, () => {
    console.log(`Server listening on port ${provider.port}`);
    console.log(`Process PID: ${process.pid}`);
  });
}
