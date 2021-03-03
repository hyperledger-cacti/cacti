/**
 * Represents a file on the file-system, but encoded in
 * base64 (its contents).
 */
export interface Base64File {
  /**
   * The name of the file as represented on a file system.
   * @type {string}
   * @memberof Base64File
   */
  filename: string;

  /**
   * The contents of the file, encoded as Base64.
   * @type {string}
   * @memberof Base64File
   */
  contentBase64: string;
}
