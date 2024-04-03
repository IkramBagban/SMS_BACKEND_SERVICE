import express from "express";
import { airtelProvider } from "./servers/airtel.js";
import { jioProvider } from "./servers/jio.js";
import { viProvider } from "./servers/vi.js";
import { logger } from "./middleware/logger.js";
import Peers from "weighted-round-robin";
import { createProxyMiddleware } from "http-proxy-middleware";

const servers = [
  airtelProvider,
  // jioProvider, viProvider
];
const throughputs = servers.map((server) => server.throughput);

const calculateWeight = (throughput) =>
  Math.floor(throughput / Math.min(...throughputs));

const serverConfigurations = servers.map((server) => ({
  port: server.port,
  weight: calculateWeight(server.throughput),
}));

const app = express();
const port = 8000;
const peers = new Peers();

serverConfigurations.forEach(({ port, weight }) =>
  peers.add({
    server: `http://localhost:${port}`,
    weight,
  })
);

// Middleware to select a server using Weighted Round Robin algorithm
app.use((req, res, next) => {
  const selectedServer = peers.get();
  req.selectedServer = selectedServer;

  // Log the request information to CSV
  logger(req, selectedServer);

  next();
});

// Proxy middleware configuration
app.use("/", (req, res, next) => {
  createProxyMiddleware({
    target: req.selectedServer.server,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      // Propagate selected server to proxied request
      proxyReq.setHeader(
        "X-Selected-Server",
        JSON.stringify(req.selectedServer)
      );
    },
  })(req, res, next);
});

app.listen(port, () => {
  console.log(`Load Balancer listening at <http://localhost>:${port}`);
});
