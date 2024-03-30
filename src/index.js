import express from "express";
import { airtelProvider } from "./servers/airtel.js";
import { jioProvider } from "./servers/jio.js";
import { viProvider } from "./servers/vi.js";
import { proxyRequest, selectedServerProxy } from "./middleware/proxy.js";
import { WeightedRoundRobinBalancer } from "./utils/load-balancer.js";
import { logger } from "./middleware/logger.js";
import bodyParser from "body-parser";
import { createProxyMiddleware } from "http-proxy-middleware";

const servers = [airtelProvider, jioProvider, viProvider];
const throughputs = servers.map((server) => server.throughput);

const calculateWeight = (throughput) =>
  Math.floor(throughput / Math.min(...throughputs));

const serverConfigurations = servers.map((server) => ({
  port: server.port,
  server: `http://localhost:${server.port}`,
  weight: calculateWeight(server.throughput),
}));

const app = express();
const port = 8000;
const balancer = new WeightedRoundRobinBalancer(serverConfigurations);

app.use(bodyParser.json());

// Middleware to randomly select a server using Weighted Round Robin algorithm
app.use((req, res, next) => {
  const selectedServer = balancer.selectServer(serverConfigurations);
  req.selectedServer = selectedServer;

  // Log the request information to CSV
  logger(req, selectedServer);

  // if (selectedServer) {
  //   proxyRequest(req, res);
  // } else {
  //   res.status(503).send("Service Unavailable");
  // }

  next();
});

// Use the proxy middleware for all routes
app.use("/", selectedServerProxy);

// Proxy middleware configuration
// app.use("/", (req, res) => {
//   createProxyMiddleware({
//     target: `http://localhost:${req.selectedServer.port}`,
//     changeOrigin: true,
//   })(req, res);
// });

app.listen(port, () => {
  console.log(`Load Balancer listening at <http://localhost>:${port}`);
});
