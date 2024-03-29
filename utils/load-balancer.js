class WeightedRoundRobinBalancer {
  constructor(servers) {
    this.servers = [...servers];
    this.totalWeight = this.calculateTotalWeight(servers);
    this.cumulativeWeights = this.calculateCumulativeWeights(servers);
    this.currentIndex = 0;
    this.random = new Random();
  }

  calculateTotalWeight(servers) {
    let totalWeight = 0;
    for (let server of servers) {
      totalWeight += server.weight;
    }
    return totalWeight;
  }

  calculateCumulativeWeights(servers) {
    let cumulativeWeights = new Array(servers.length);
    cumulativeWeights[0] = servers[0].weight;
    for (let i = 1; i < servers.length; i++) {
      cumulativeWeights[i] = cumulativeWeights[i - 1] + servers[i].weight;
    }
    return cumulativeWeights;
  }

  getNextServer() {
    let randomValue = this.random.nextInt(this.totalWeight);
    for (let i = 0; i < this.cumulativeWeights.length; i++) {
      if (randomValue < this.cumulativeWeights[i]) {
        this.currentIndex = i;
        break;
      }
    }
    return this.servers[this.currentIndex];
  }
}

class Server {
  constructor(name, weight) {
    this.name = name;
    this.weight = weight;
  }
}

// Sample list of servers with weights
let serverList = [
  new Server("Server1", 3),
  new Server("Server2", 2),
  new Server("Server3", 1),
];

// Create a weighted round-robin load balancer with the server list
let balancer = new WeightedRoundRobinBalancer(serverList);

// Simulate requests to the load balancer
for (let i = 0; i < 10; i++) {
  let nextServer = balancer.getNextServer();
  console.log(`Request ${i + 1}: Routed to ${nextServer.name}`);
}
