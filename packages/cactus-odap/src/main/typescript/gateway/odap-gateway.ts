import {
  InitializationRequestMessage,
  InitialMessageAck,
} from "../generated/openapi/typescript-axios";
export class OdapGateway {
  name: string;
  public constructor(name: string) {
    this.name = name;
  }
  public async InitiateTransfer(
    req: InitializationRequestMessage,
  ): Promise<InitialMessageAck> {
    const validInitializationRequest = await this.CheckValidInitializationRequest(
      req,
    );
    if (!validInitializationRequest) {
      throw new Error(`InitiateTransfer error, InitializationRequest Invalid`);
    }
    return { SessionID: "would filled out this later" };
  }
  public async CheckValidInitializationRequest(
    req: InitializationRequestMessage,
  ): Promise<boolean> {
    return req.Version == "0.0.0";
    /*return new Promise(function (resolve, reject) {
      resolve(true);
    });*/
  }
}
