import httpProxy from "http-proxy-middleware";
import axios from "axios";

// Function to proxy the request to the selected server
export function proxyRequest(req, res) {
  console.log(req.body, req.method);
  const selectedServer = req.selectedServer;
  const selectedPort = selectedServer.port;
  const originalUrl = req.originalUrl; // Store original URL
  axios({
    url: `http://localhost:${selectedPort}${originalUrl}`,
    method: req.method,
    body: req.body || {},
    headers: req.headers || {},
  })
    .then((serverResponse) => {
      const responseData = serverResponse.data; // Get response data from server
      // Send response data to client
      res.send(responseData);
    })
    .catch((error) => {
      console.error(`Error forwarding request to server: ${error}`);
      res.status(500).send("Internal Server Error");
    });
}

// Proxy middleware for the selected server
export const selectedServerProxy = (req, res, next) =>
  httpProxy.createProxyMiddleware({
    // target: "<http://localhost>", // Set the target to the base URL of your servers
    target: req.selectedServer.server, // Set the target to the base URL of your servers
    changeOrigin: true,
  });

// Proxy middleware configuration
// app.use('/', (req, res) => {
//   const { url } = getNextServer();
//   createProxyMiddleware({
//     target: url,
//     changeOrigin: true,
//   })(req, res);
// });
