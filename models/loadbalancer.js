const fs = require('fs');
const path = require('path');
const { readQueue, writeQueue } = require('../utils/queue');
const queueFilePath = path.join(__dirname, 'database', 'queue.json');

class LoadBalancer {
    constructor(providers) {
      this.providers = providers;
      this.providerCounts = {};
      providers.forEach((provider) => {
        this.providerCounts[provider.name] = 0;
      });
    }
  
    getTotalThroughput() {
      return this.providers.reduce((totalThroughput, provider) => {
        return totalThroughput + provider.throughput;
      }, 0);
    }
  
    async assignTask(requests) {
        const queue = await readQueue();
      let totalRequestsHandled = 0;
      const totalThroughput = this.getTotalThroughput();
      let activeProviders = this.providers.filter((provider) => !provider.isDown);
  
    if (activeProviders.length === 0) {
        console.log("All providers are down. Queuing the requests");
        const updatedQueue = [...queue, ...requests]; // Add new requests to the queue
        await writeQueue(updatedQueue); // Write the updated queue back to the file
        return;
    }
  
      for (const provider of activeProviders) {
        const weight = provider.throughput / totalThroughput;
        const numRequests = Math.floor(weight * requests.length);
        let requestsForThisProvider = requests.slice(
          totalRequestsHandled,
          totalRequestsHandled + numRequests
        );
  
        for (const request of requestsForThisProvider) {
          await provider.sendSMS(request.phoneNumber, request.text);
          this.providerCounts[provider.name]++;
        }
  
        totalRequestsHandled += numRequests;
      }
  
      // Handle any leftover requests if rounding left some out
      if (totalRequestsHandled < requests.length) {
        let leftoverRequests = requests.slice(totalRequestsHandled);
        for (const request of leftoverRequests) {
          let provider = activeProviders[0]; // Default to the first provider, but could be enhanced to spread out leftover requests
          await provider.sendSMS(request.phoneNumber, request.text);
          this.providerCounts[provider.name]++;
        }
      }
    }
  
    // assignTask(requests) {
    //     let totalRequestsHandled = 0;
    //     const totalThroughput = this.getTotalThroughput();
    //     let activeProviders = this.providers.filter((provider) => !provider.isDown);
  
    //     if (activeProviders.length === 0) {
    //     console.log("all providers are down. queuing the requests", requests);
    //     queue.push(...requests);
    //     return;
    //     }
  
    //     activeProviders.forEach((provider) => {
    //     const weight = provider.throughput / totalThroughput;
    //     const numRequests = Math.floor(weight * requests.length);
    //     let requestsForThisProvider = requests.slice(
    //         totalRequestsHandled,
    //         totalRequestsHandled + numRequests
    //     );
    //     requestsForThisProvider.forEach(async (request) => {
    //         const response = await provider.sendSMS(
    //         request.phoneNumber,
    //         request.text
    //         );
    //         this.providerCounts[provider.name]++;
    //     });
    //     totalRequestsHandled += numRequests;
    //     });
  
    //     // Handle any leftover requests if rounding left some out
    //     if (totalRequestsHandled < requests.length) {
    //     let leftoverRequests = requests.slice(totalRequestsHandled);
    //     leftoverRequests.forEach(async (request) => {
    //         let provider = activeProviders[0]; // Default to the first provider, but could be enhanced to spread out leftover requests
    //         await provider.sendSMS(request.phoneNumber, request.text);
    //         this.providerCounts[provider.name]++;
    //     });
    //     }
    // }
  
    async retryFailed() {
      // Logic to retry sending queued messages
      while (queue.length > 0) {
        const requests = queue.splice(0, queue.length); // Get all queued messages
        await this.assignTask(requests); // Attempt to reassign
      }
    }
  
    getProviderCounts() {
      return this.providerCounts;
    }
  }

  module.exports = LoadBalancer