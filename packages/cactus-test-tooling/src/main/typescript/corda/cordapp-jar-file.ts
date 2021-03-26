import { Base64File } from "../common/base64-file";

export interface ICordappJarFile extends Base64File {
  hasDbMigrations: boolean;
}
