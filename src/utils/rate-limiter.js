export class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity; // Maximum number of tokens the bucket can hold
        this.tokens = capacity;  // Current number of tokens in the bucket
        this.refillRate = refillRate; // Rate at which tokens are added to the bucket per second
        this.lastRefillTime = Date.now(); // Timestamp of the last token refill
    }

    consume(tokens) {
        if (tokens <= this.tokens) { // Check if there are enough tokens to consume
            this.tokens -= tokens; // Consume tokens
            return true; // Return true indicating successful consumption
        } else {
            return false; // Return false indicating not enough tokens available
        }
    }

    refill() {
        const currentTime = Date.now();
        const timeElapsed = (currentTime - this.lastRefillTime) / 1000; // Calculate time elapsed in seconds
        const tokensToAdd = timeElapsed * this.refillRate; // Calculate number of tokens to add based on refill rate
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd); // Add tokens while ensuring bucket does not exceed capacity
        this.lastRefillTime = currentTime; // Update last refill time
    }
}