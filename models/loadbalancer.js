const fs = require("fs");
const path = require("path");
const { readQueue, writeQueue } = require("../utils/queue");
const queueFilePath = path.join(__dirname, "database", "queue.json");

class LoadBalancer {
  constructor(providers) {
    this.providers = providers;
    this.initializePeriodicCheck();
    this.providerCounts = {};
    providers.forEach((provider) => {
      this.providerCounts[provider.name] = 0;
    });
    this.providerIndexes = providers.map(() => 0); // Track current index for each provider for round-robin
  }

  getTotalThroughput() {
    return this.providers.reduce(
      (total, provider) => total + provider.throughput,
      0
    );
  }

  async assignTask(incomingRequests) {
    const queue = await readQueue(); // Existing messages in the queue
    const allRequests = [...queue, ...incomingRequests]; // Combine queued and incoming requests
    let totalRequestsHandled = 0;

    // Calculate total number of messages to be sent based on provider throughputs and queued requests
    const messagesToSend = Math.min(
      allRequests.length,
      this.getTotalThroughput()
    );

    // Distribute messages to providers based on their weight
    while (totalRequestsHandled < messagesToSend && allRequests.length > 0) {
      for (let i = 0; i < this.providers.length; i++) {
        const provider = this.providers[i];
        // Continue with the next provider if the current one is down or has reached its limit
        if (provider.isDown || !provider.canSend()) continue;

        // Calculate proportional number of requests for this provider
        const weight = provider.throughput / this.getTotalThroughput();
        const numRequests = Math.min(
          Math.floor(weight * messagesToSend),
          allRequests.length
        );

        // Send the calculated number of messages for this provider, if available
        let providerHandled = 0;
        while (
          providerHandled < numRequests &&
          provider.canSend() &&
          allRequests.length > 0
        ) {
          const request = allRequests.shift();
          try {
            await provider.sendSMS(request.phoneNumber, request.text + provider.name);
            this.providerCounts[provider.name]++;
            totalRequestsHandled++;
            providerHandled++;
          } catch (e) {
            console.log(`${provider.name} failed to send SMS:`, e);
            // Optionally re-queue the request or handle the failure differently
          }
        }
      }
    }

    // If there are leftover requests after going through all providers, add them back to the queue
    if (allRequests.length > 0) {
      await writeQueue(allRequests);
    } else {
      await writeQueue([]); // Clear the queue if all messages have been handled
    }
  }

  initializePeriodicCheck() {
    setInterval(async () => {
      const queue = await readQueue();
      if (queue.length > 0) {
        console.log("Processing queued requests...");
        // await this.assignTask([]);
        await this.assignTask(queue); // This will process the queued requests
      }
    }, 6000); // Check every minute
  }

  getProviderCounts() {
    return this.providerCounts;
  }
}

// class LoadBalancer {
//   constructor(providers) {
//     this.providers = providers;
//     this.providerCounts = {};
//     providers.forEach((provider) => {
//       this.providerCounts[provider.name] = 0;
//     });
//   }

//   getTotalThroughput() {
//     return this.providers.reduce((totalThroughput, provider) => {
//       return totalThroughput + provider.throughput;
//     }, 0);
//   }
//   async assignTask(requests) {
//     let totalRequestsHandled = 0;
//     const totalThroughput = this.getTotalThroughput();
//     let activeProviders = this.providers.filter((provider) => !provider.isDown);

//     if (activeProviders.length === 0) {
//         const queue = await readQueue();
//         const updatedQueue = [...queue, ...requests];
//       console.log("All providers are down. Queuing the requests");
//       await writeQueue(updatedQueue);
//       return;
//     }

//     for (const provider of activeProviders) {
//       const weight = provider.throughput / totalThroughput;
//     // const numRequests = Math.floor(weight * requests.length);
//       const numRequests = Math.floor(weight * requests.length);
//       let requestsForThisProvider = requests.slice(
//         totalRequestsHandled,
//         totalRequestsHandled + numRequests
//       );

//       for (const request of requestsForThisProvider) {
//         try{

//             await provider.sendSMS(request.phoneNumber, request.text);
//             this.providerCounts[provider.name]++;
//         }catch(e){
//             console.log(e)
//         }
//       }

//       totalRequestsHandled += numRequests;
//     }

//     if (totalRequestsHandled < requests.length) {
//       let leftoverRequests = requests.slice(totalRequestsHandled);
//       const queue = await readQueue();
//       console.log("All providers are down. Queuing the requests");
//       const updatedQueue = [...queue, ...leftoverRequests];
//       await writeQueue(updatedQueue);
//       return;
//     }
//   }

//   async retryFailed() {
//     // const queue = await readQueue()
//     const queueLen  = queue.length
//     while (queueLen > 0) {
//         console.log('proceeding queued requests',queueLen)
//       const requests = queue.splice(0, queueLen);
//       await this.assignTask(requests);
//     }
//   }

//   getProviderCounts() {
//     return this.providerCounts;
//   }
// }

module.exports = LoadBalancer;
