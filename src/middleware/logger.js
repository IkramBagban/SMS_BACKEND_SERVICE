import { createObjectCsvWriter } from "csv-writer";

// Create a CSV writer to log requests
const csvWriter = createObjectCsvWriter({
  path: "request_logs.csv",
  header: [
    { id: "timestamp", title: "Timestamp" },
    { id: "ip", title: "IP Address" },
    { id: "serverPort", title: "Server Port" },
    { id: "originalUrl", title: "Original URL" },
  ],
});

// Log the request information to CSV
export const logger = (req, selectedServer) => {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    serverPort: selectedServer ? selectedServer.port : "N/A",
    originalUrl: req.originalUrl,
  };
  csvWriter.writeRecords([logData]);
};
