import path from "path";
import { IncomingMessage } from "http";
import { Container } from "dockerode";
import Dockerode from "dockerode";
import tar from "tar-stream";
import fs from "fs-extra";
import { Streams } from "../common/streams";

export interface IPushFileFromFsOptions {
  /**
   * The dockerode container object to send the files to OR a docker container ID that will be used to look up an
   * existing container (it is expected that it is already running).
   */
  containerOrId: Container | string;
  srcFileName?: string;
  srcFileDir?: string;
  srcFileAsString?: string;
  dstFileName: string;
  dstFileDir: string;
}

export class Containers {
  /**
   * Uploads a file from the local (host) file system to a container's file-system.
   *
   * @param container
   * @param srcPath File system path on the host's FS, pointing to the file that will be uploaded to the container.
   * @param dstPath The path on the container's own file system where `srcPath` file will be placed.
   */
  static async putFile(opts: IPushFileFromFsOptions): Promise<IncomingMessage> {
    if (!opts) {
      throw new TypeError("Containers#putFileFromFs() opts was falsy.");
    }
    let container: Container;
    if (typeof opts.containerOrId === "string") {
      const docker = new Dockerode();
      container = docker.getContainer(opts.containerOrId);
    } else {
      container = opts.containerOrId;
    }

    const fileAsTarStream = await new Promise<tar.Pack>((resolve, reject) => {
      let fileAsString;
      if (opts.srcFileAsString) {
        fileAsString = opts.srcFileAsString;
      } else if (opts.srcFileDir && opts.srcFileName) {
        const srcFilePath = path.join(opts.srcFileDir, opts.srcFileName);
        fileAsString = fs.readFileSync(srcFilePath);
      } else {
        const msg = "Containers#putFileFromFs: need file as string or dir+name";
        reject(new Error(msg));
        return;
      }

      const pack = tar.pack({ autoDestroy: true });

      pack.entry({ name: opts.dstFileName }, fileAsString, (err: any) => {
        if (err) {
          reject(err);
        } else {
          pack.finalize();
          resolve(pack);
        }
      });
    });

    return new Promise((resolve, reject) => {
      const handler = (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };

      container.putArchive(
        fileAsTarStream,
        {
          path: opts.dstFileDir,
        },
        handler
      );
    });
  }

  /**
   * Reads the contents of a file from a container's file system and returns a promise of that string.
   *
   * @param container The dockerode container to use when pulling the file.
   * @param filePath The path on the container's own file system where the file you want pulled is located.
   */
  static async pullFile(
    container: Container,
    filePath: string
  ): Promise<string> {
    const response: any = await container.getArchive({ path: filePath });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents: string = "";
      extract.on("entry", async (header: any, stream, next) => {
        stream.on("error", (err: Error) => {
          reject(err);
        });
        const chunks: string[] = await Streams.aggregate<string>(stream);
        fileContents += chunks.join("");
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        resolve(fileContents);
      });

      response.pipe(extract);
    });
  }
}
