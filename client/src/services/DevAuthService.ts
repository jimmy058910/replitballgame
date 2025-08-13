// Development Authentication Service for local testing
// This service communicates with the development auth endpoints

export class DevAuthService {
  private static user: any = null;

  static async checkAuthStatus(): Promise<any | null> {
    try {
      console.log('🔧 DEV: Checking authentication status...');
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          this.user = data.user;
          console.log('🔧 DEV: User is authenticated:', data.user.email);
          return data.user;
        }
      }

      console.log('🔧 DEV: User is not authenticated');
      return null;
    } catch (error) {
      console.error('🔧 DEV: Auth status check failed:', error);
      return null;
    }
  }

  static async loginDevelopmentUser(): Promise<any | null> {
    try {
      console.log('🔧 DEV: Attempting development login...');
      const response = await fetch('/api/auth/dev-login', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.user = data.user;
          console.log('🔧 DEV: Login successful:', data.user.email);
          return data.user;
        }
      }

      const errorText = await response.text();
      console.error('🔧 DEV: Login failed:', errorText);
      return null;
    } catch (error) {
      console.error('🔧 DEV: Login request failed:', error);
      return null;
    }
  }

  static logout(): void {
    console.log('🔧 DEV: Logging out development user');
    this.user = null;
  }

  static getCurrentUser(): any | null {
    return this.user;
  }
}

export default DevAuthService;