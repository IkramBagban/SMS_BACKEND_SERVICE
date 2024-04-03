import { faker } from "@faker-js/faker";
import loadTest from "loadtest";

// Function to generate random data using faker.js
function generateRandomData() {
  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence,
  };
}

// Options for load testing
const options = {
  url: "http://localhost:8000/send-sms",
  method: "POST",
  contentType: "application/json",
  body: generateRandomData(), // Generate random data for the request body
  maxRequests: 1000, // Number of requests to send
  concurrency: 10,
  requestsPerSecond: 100,
};

// Perform the load test
loadTest.loadTest(options, function (error, result) {
  if (error) {
    console.error("Load Test Error:", error);
  } else {
    console.log("Load Test Result: ", result);
  }
});
