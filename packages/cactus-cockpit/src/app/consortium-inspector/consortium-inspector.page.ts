import { Component, Inject } from "@angular/core";
import { CACTUS_API_URL } from "src/constants";
import {
  Logger,
  LoggerProvider,
  ILoggerOptions,
} from "@hyperledger/cactus-common";
import { Configuration, ApiClient } from "@hyperledger/cactus-sdk";
import {
  DefaultApi as PluginConsortiumManualApi,
  JWSGeneral,
} from "@hyperledger/cactus-plugin-consortium-manual";
import * as JwtDecode from "jwt-decode";

@Component({
  selector: "app-folder",
  templateUrl: "./consortium-inspector.page.html",
  styleUrls: [],
})
export class ConsortiumInspectorPage {
  private readonly log: Logger;

  public apiHost: string;
  public jws: JWSGeneral;
  public decodedJws: any;
  public decodedJwsJson: string;

  protected protected: string;

  constructor(@Inject(CACTUS_API_URL) public readonly cactusApiUrl: string) {
    const loggerOpts: ILoggerOptions = {
      label: "consortium-inspector-page",
      level: "TRACE",
    };
    this.log = LoggerProvider.getOrCreate(loggerOpts);

    this.log.debug(`constructor() applying default API host: ${cactusApiUrl}`);
    this.apiHost = cactusApiUrl;
  }

  onChangeApiHost(): void {
    this.log.debug(`onChangeApiHost() apiHost=${this.apiHost}`);
  }

  async onBtnClickInspect(): Promise<void> {
    this.log.debug(`onBtnClickInspect() apiHost=${this.apiHost}`);
    const configuration = new Configuration({ basePath: this.cactusApiUrl });
    const apiClient = new ApiClient(configuration).extendWith(
      PluginConsortiumManualApi
    );

    const resHealthCheck = await apiClient.apiV1ApiServerHealthcheckGet();
    this.log.debug(`ApiServer HealthCheck Get:`, resHealthCheck.data);

    const res = await apiClient.apiV1PluginsHyperledgerCactusPluginConsortiumManualConsortiumJwsGet();
    this.jws = res.data.jws;
    const asJsonPreDecode = JSON.stringify(this.jws, null, 4);
    this.log.debug(`ConsortiumNodeJwtGet pre-decode: \n%o`, asJsonPreDecode);

    this.decodedJws = JSON.parse(asJsonPreDecode);
    this.decodedJws.payload = JwtDecode(this.jws.payload, { header: true });
    this.decodedJws.signatures.map((signature: any) => {
      if (signature.protected) {
        signature.protected = JwtDecode(signature.protected, { header: true });
      }
    });
    this.decodedJwsJson = JSON.stringify(this.decodedJws, null, 4);
    this.log.debug(
      `ConsortiumNodeJwtGet post-decode: \n%o`,
      this.decodedJwsJson
    );
  }
}
