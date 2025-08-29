// Simple in-memory rate limiter for OpenAI API calls
// For small-scale usage - in production you'd want Redis or similar

class RateLimiter {
  constructor() {
    // Store: userId -> { count: number, resetTime: timestamp }
    this.limits = new Map()
    // Default limits per hour
    this.defaultLimits = {
      newsletters: 20,     // Newsletter processing requests per hour
      embeddings: 100,     // Embedding generation requests per hour
      extraction: 50       // Text extraction requests per hour
    }
  }

  isAllowed(userId, operation = 'default', limit = 10) {
    const now = Date.now()
    const key = `${userId}:${operation}`
    const hourInMs = 60 * 60 * 1000
    
    // Use operation-specific limit if available
    const operationLimit = this.defaultLimits[operation] || limit
    
    const userLimit = this.limits.get(key)
    
    // If no record or reset time has passed, create new window
    if (!userLimit || now > userLimit.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + hourInMs
      })
      return true
    }
    
    // Check if within limit
    if (userLimit.count < operationLimit) {
      userLimit.count++
      return true
    }
    
    return false
  }
  
  getRemainingAttempts(userId, operation = 'default', limit = 10) {
    const now = Date.now()
    const key = `${userId}:${operation}`
    const operationLimit = this.defaultLimits[operation] || limit
    
    const userLimit = this.limits.get(key)
    
    if (!userLimit || now > userLimit.resetTime) {
      return operationLimit
    }
    
    return Math.max(0, operationLimit - userLimit.count)
  }
  
  getResetTime(userId, operation = 'default') {
    const key = `${userId}:${operation}`
    const userLimit = this.limits.get(key)
    
    if (!userLimit) {
      return new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    }
    
    return new Date(userLimit.resetTime)
  }

  // Clean up old entries periodically to prevent memory leaks
  cleanup() {
    const now = Date.now()
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key)
      }
    }
  }
}

// Global instance - in production you'd want proper singleton pattern
const rateLimiter = new RateLimiter()

// Cleanup every hour
setInterval(() => {
  rateLimiter.cleanup()
}, 60 * 60 * 1000)

module.exports = { rateLimiter }