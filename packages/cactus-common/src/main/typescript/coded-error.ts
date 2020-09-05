/**
 * Utility class for better exception handling by way of having a code property
 * which is designated to uniquely identify the type of exception that was
 * thrown, essentially acting as a discriminator property.
 */
export class CodedError extends Error {
  constructor(public readonly message: string, public readonly code: string) {
    super(message);
  }

  sameCode(codedError: CodedError): boolean {
    return this.code === codedError?.code;
  }
}
