// Simple secure token storage for client-side OAuth tokens
// For small-scale applications with basic security improvements

interface StoredToken {
  value: string
  expires?: number
}

class TokenStorage {
  private readonly keyPrefix = 'newsletter_app_'
  
  // Store token with expiration
  setToken(key: string, token: string, expiresInHours: number = 24): void {
    try {
      const expires = Date.now() + (expiresInHours * 60 * 60 * 1000)
      const tokenData: StoredToken = { value: token, expires }
      
      // For a friend group app, we'll use sessionStorage instead of localStorage
      // This provides better security as tokens are cleared when browser closes
      sessionStorage.setItem(this.keyPrefix + key, JSON.stringify(tokenData))
    } catch (error) {
      console.warn('Failed to store token:', error)
    }
  }
  
  // Get token and check if it's expired
  getToken(key: string): string | null {
    try {
      const stored = sessionStorage.getItem(this.keyPrefix + key)
      if (!stored) return null
      
      const tokenData: StoredToken = JSON.parse(stored)
      
      // Check if token is expired
      if (tokenData.expires && Date.now() > tokenData.expires) {
        this.removeToken(key)
        return null
      }
      
      return tokenData.value
    } catch (error) {
      console.warn('Failed to retrieve token:', error)
      return null
    }
  }
  
  // Remove token
  removeToken(key: string): void {
    try {
      sessionStorage.removeItem(this.keyPrefix + key)
    } catch (error) {
      console.warn('Failed to remove token:', error)
    }
  }
  
  // Clear all tokens
  clearAllTokens(): void {
    try {
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith(this.keyPrefix)) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear tokens:', error)
    }
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage()

// Legacy localStorage migration helper
export const migrateLegacyTokens = (): void => {
  try {
    // Migrate from localStorage to sessionStorage with improved security
    const accessToken = localStorage.getItem('gmail_access_token')
    const refreshToken = localStorage.getItem('gmail_refresh_token')
    
    if (accessToken) {
      tokenStorage.setToken('gmail_access', accessToken, 1) // 1 hour for access token
      localStorage.removeItem('gmail_access_token')
    }
    
    if (refreshToken) {
      tokenStorage.setToken('gmail_refresh', refreshToken, 24 * 7) // 1 week for refresh token
      localStorage.removeItem('gmail_refresh_token')
    }
  } catch (error) {
    console.warn('Failed to migrate legacy tokens:', error)
  }
}