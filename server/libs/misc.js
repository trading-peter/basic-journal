module.exports = {
  asyncRemoveTokens(count, rateLimiter) {
    return new Promise((resolve, reject) => {
      rateLimiter.removeTokens(count, (error, remainingRequests) => {
        if (error) return reject(error)
        resolve(remainingRequests)
      });
    });
  },
};
