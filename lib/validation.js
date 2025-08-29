// Basic input validation utilities for API endpoints
// Simple validation for small-scale application

const validation = {
  // Validate UUID format (Supabase user IDs)
  isValidUuid(str) {
    if (!str || typeof str !== 'string') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  },

  // Validate email format
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  // Validate access token format (basic check)
  isValidAccessToken(token) {
    if (!token || typeof token !== 'string') return false
    // Basic token validation - should be reasonable length
    return token.length > 10 && token.length < 2000
  },

  // Sanitize string input (prevent basic injection)
  sanitizeString(str, maxLength = 1000) {
    if (!str || typeof str !== 'string') return ''
    return str.trim().slice(0, maxLength)
  },

  // Validate positive integer
  isPositiveInteger(num) {
    return Number.isInteger(Number(num)) && Number(num) > 0
  },

  // Validate date string
  isValidDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false
    const date = new Date(dateStr)
    return date instanceof Date && !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}/)
  },

  // Validate request body has required fields
  validateRequired(obj, fields) {
    const missing = []
    for (const field of fields) {
      if (!obj || !obj.hasOwnProperty(field) || obj[field] === null || obj[field] === undefined || obj[field] === '') {
        missing.push(field)
      }
    }
    return missing
  }
}

module.exports = { validation }