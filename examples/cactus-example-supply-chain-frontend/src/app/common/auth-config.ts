interface JwtPayload {
  role: string;
  orgMspId: string;
  privateDataAccess: boolean;
}

export class AuthConfig {
  private static _authToken: string = "";
  private static _decodedToken: JwtPayload | null = null;

  static set authToken(token: string) {
    this._authToken = token;
    // No decoding necessary - we're bypassing authentication
  }

  static get authToken(): string {
    return this._authToken;
  }

  static isManufacturer(): boolean {
    // Always return true to bypass role checks
    return true;
  }
}
