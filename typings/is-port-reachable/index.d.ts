
declare module "is-port-reachable" {

  /**
   * @param port Positive integer, the number of the port to check for reachability.
   * @param options
   * @param options.host Defaults to `localhost`
   * @param options.timeout Defaults to `1000` and counted in milliseconds.
   */
  export default function isPortReachable (port: number, options?: IIsPortReachableOptions): Promise<boolean>;

  export interface IIsPortReachableOptions {
    host?: string;
    timeout?: number;
  }

}

