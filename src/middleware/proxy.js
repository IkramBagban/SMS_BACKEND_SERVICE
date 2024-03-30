import httpProxy from "http-proxy-middleware";
import axios from "axios";

// Function to proxy the request to the selected server
export function proxyRequest(req, res) {
  // console.log(req);
  const selectedServer = req.selectedServer;
  // const selectedPort = selectedServer.port;
  const originalUrl = req.originalUrl; // Store original URL
  axios
    // .get(`http://localhost:${selectedPort}${originalUrl}`)
    .get(`${selectedServer.server}${originalUrl}`)
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
export const selectedServerProxy = httpProxy.createProxyMiddleware({
  target: "<http://localhost>", // Set the target to the base URL of your servers
  changeOrigin: true,
});
