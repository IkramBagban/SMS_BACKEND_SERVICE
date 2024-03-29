export function distributeMessages(providers, totalMessages) {
  let totalThroughput = providers.reduce(
    (sum, provider) =>
      sum + (provider.status === "up" ? provider.throughput : 0),
    0
  );

  if (totalThroughput === 0) {
    console.log("No active providers available.");
    return;
  }

  let distributedMessages = [];

  providers.forEach((provider) => {
    let targetMessages =
      provider.status === "up"
        ? Math.floor((provider.throughput / totalThroughput) * totalMessages)
        : 0;
    distributedMessages.push({
      provider: provider.name,
      messages: targetMessages,
    });
  });

  // Adjust for rounding errors or remainders
  let remainingMessages =
    totalMessages -
    distributedMessages.reduce((sum, message) => sum + message.messages, 0);
  while (remainingMessages > 0) {
    let maxIndex = distributedMessages.reduce(
      (maxIndex, message, currentIndex) =>
        message.messages > distributedMessages[maxIndex].messages
          ? currentIndex
          : maxIndex,
      0
    );
    distributedMessages[maxIndex].messages++;
    remainingMessages--;
  }

  // Send messages to each provider
  distributedMessages.forEach((message) => {
    console.log(`Sending ${message.messages} messages to ${message.provider}`);
  });
}

// Example usage
let providers = [
  { name: "A", throughput: 100, status: "up" },
  { name: "B", throughput: 100, status: "up" },
  { name: "C", throughput: 100, status: "up" },
];

distributeMessages(providers, 300);
