import path from "path";
import { Stream } from "stream";
import { IncomingMessage } from "http";
import { Container, ContainerInfo } from "dockerode";
import Dockerode from "dockerode";
import tar from "tar-stream";
import fs from "fs-extra";
import { Streams } from "../common/streams";
import { Checks, Strings } from "@hyperledger/cactus-common";

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
    Checks.truthy(container, "Containers#pullFile() container");
    Checks.truthy(filePath, "Containers#pullFile() filePath");

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

  /**
   *
   * @param container The docker container to execute the `ls` command in.
   * @param dir The directory path to pass in to the `ls` binary for listing.
   */
  public static async ls(container: Container, dir: string): Promise<string[]> {
    const fnTag = "Containers#ls()";
    Checks.truthy(container, `${fnTag} container`);
    Checks.truthy(dir, `${fnTag} path`);
    Checks.truthy(typeof dir === "string", `${fnTag} path typeof string`);
    Checks.truthy(dir.length > 0, `${fnTag} path non blank`);

    const cmdArgs = ["ls", "-A", "-1", "-q", dir];
    const output = await Containers.exec(container, cmdArgs);
    return output
      .split(`\n`)
      .map((str) => Strings.dropNonPrintable(str)) // drop SOH, NUL, etc. ...
      .filter((str) => str); // drop empty strings
  }

  /**
   *
   * Note about `Tty: true` this is necessary because otherwise docker injects
   * 8 bytes of custom data to the beginning of each line. See details:
   * @link https://github.com/moby/moby/issues/7375#issuecomment-51462963
   *
   * @param container The container to execute `cmd` in.
   * @param cmd The list of strings that make up the command itself.
   *
   */
  public static async exec(
    container: Container,
    cmd: string[]
  ): Promise<string> {
    const fnTag = "Containers#exec()";
    Checks.truthy(container, `${fnTag} container`);
    Checks.truthy(cmd, `${fnTag} cmd`);
    Checks.truthy(Array.isArray(cmd), `${fnTag} isArray(cmd)`);
    Checks.truthy(cmd.length > 0, `${fnTag} path non empty array`);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    return new Promise((resolve, reject) => {
      exec.start({ Tty: true }, (err: any, stream: Stream) => {
        if (err) {
          return reject(err);
        }
        let output: string = "";
        stream.on("data", (data: Buffer) => {
          output += data.toString("utf-8");
        });
        stream.on("end", () => resolve(output));
      });
    });
  }

  public static async getPublicPort(
    privatePort: number,
    aContainerInfo: ContainerInfo
  ): Promise<number> {
    const fnTag = `Containers#getPublicPort(privatePort=${privatePort})`;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === privatePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${privatePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${privatePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${privatePort}`);
    }
  }

  public static async getContainerInternalIp(
    containerInfo: ContainerInfo
  ): Promise<string> {
    const fnTag = "Containers#getContainerInternalIp()";
    Checks.truthy(containerInfo, `${fnTag} arg #1 containerInfo`);

    const { NetworkSettings } = containerInfo;
    const networkNames: string[] = Object.keys(NetworkSettings.Networks);

    if (networkNames.length < 1) {
      throw new Error(`${fnTag} container not connected to any networks`);
    } else {
      // return IP address of container on the first network that we found it connected to. Make this configurable?
      return NetworkSettings.Networks[networkNames[0]].IPAddress;
    }
  }

  public static pullImage(
    containerNameAndTag: string,
    pullOptions: any = {}
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const docker = new Dockerode();
      docker.pull(
        containerNameAndTag,
        pullOptions,
        (pullError: any, stream: any) => {
          if (pullError) {
            reject(pullError);
          } else {
            docker.modem.followProgress(
              stream,
              (progressError: any, output: any[]) => {
                if (progressError) {
                  reject(progressError);
                } else {
                  resolve(output);
                }
              },
              // ignore the spammy docker download log, we get
              // it in the output variable anyway if needed
              (event: any) => null
            );
          }
        }
      );
    });
  }

  public static stop(container: Container): Promise<any> {
    const fnTag = "Containers#stop()";
    return new Promise((resolve, reject) => {
      if (container) {
        container.stop({}, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        return reject(new Error(`${fnTag} Container was not running.`));
      }
    });
  }
}
