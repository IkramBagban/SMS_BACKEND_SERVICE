export class WeightedRoundRobinBalancer {
  constructor(serverConfigurations) {
    this.serverConfigurations = serverConfigurations;
    this.currentIndex = -1;
    this.currentWeight = 0;
    this.maxWeight = 0;
    this.gcd = 0;

    this.init();
  }

  init() {
    // Find the greatest common divisor
    this.serverConfigurations.forEach((config) => {
      this.maxWeight = Math.max(this.maxWeight, config.weight);
    });
    for (let i = 0; i < this.serverConfigurations.length; i++) {
      if (this.gcd === 0) {
        this.gcd = this.serverConfigurations[i].weight;
      } else {
        this.gcd = this.gcd_func(this.gcd, this.serverConfigurations[i].weight);
      }
    }
  }

  gcd_func(a, b) {
    if (!b) {
      return a;
    }
    return this.gcd_func(b, a % b);
  }

  nextServer() {
    while (true) {
      this.currentIndex =
        (this.currentIndex + 1) % this.serverConfigurations.length;
      if (this.currentIndex === 0) {
        this.currentWeight = this.currentWeight - this.gcd;
        if (this.currentWeight <= 0) {
          this.currentWeight = this.maxWeight;
          if (this.currentWeight === 0) {
            return null; // no server available
          }
        }
      }
      if (
        this.serverConfigurations[this.currentIndex].weight >=
        this.currentWeight
      ) {
        return this.serverConfigurations[this.currentIndex];
      }
    }
  }

  // Function to select a server using Weighted Round Robin
  selectServer() {
    const server = this.nextServer();
    return server;
  }
}

// Usage
// const balancer = new WeightedRoundRobinBalancer(serverConfigurations);
// const selectedServer = balancer.selectServer();
