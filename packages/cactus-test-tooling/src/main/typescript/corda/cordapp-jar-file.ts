import { Base64File } from "../common/base64-file.js";

export interface ICordappJarFile extends Base64File {
  hasDbMigrations: boolean;
}
