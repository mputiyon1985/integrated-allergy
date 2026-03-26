// Type declarations for modules that lack bundled types
// These are provided at runtime but @types/* are devDependencies

declare module 'speakeasy' {
  interface GenerateSecretOptions {
    name?: string;
    issuer?: string;
    length?: number;
  }

  interface Secret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  interface TOTPVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
    time?: number;
    step?: number;
  }

  interface TOTPOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    step?: number;
    time?: number;
  }

  const totp: {
    verify(options: TOTPVerifyOptions): boolean;
    generate(options: TOTPOptions): string;
  };

  function generateSecret(options?: GenerateSecretOptions): Secret;
}

declare module 'qrcode' {
  function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
  function toString(text: string, options?: Record<string, unknown>): Promise<string>;
}
