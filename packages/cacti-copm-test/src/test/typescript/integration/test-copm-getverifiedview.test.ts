import "jest-extended";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  PledgeAssetV1Request,
  GetVerifiedViewV1Request,
  DLAccount,
} from "@hyperledger-cacti/cacti-copm-core";
import * as path from "path";
import * as dotenv from "dotenv";
import { CopmTestertMultiNetwork } from "../../../main/typescript/lib/copm-tester-multi-network";
import { CopmNetworkMode } from "../../../main/typescript/lib/types";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const logLevel: LogLevelDesc = "DEBUG";
const log: Logger = LoggerProvider.getOrCreate({
  label: "plugin-copm-crpc-server-test",
  level: logLevel,
});
let dest_cert: string;
const net1Type = process.env["COPM_NET_1"] || "fabric";
const net2Type = process.env["COPM_NET_2"] || "fabric";

describe(`COPM get verified view ${net1Type}-${net2Type}`, () => {
  let copmTester: CopmTestertMultiNetwork;
  let partyA: DLAccount, partyB: DLAccount;

  beforeAll(async () => {
    log.info("setting up fabric test network");

    copmTester = new CopmTestertMultiNetwork(log, CopmNetworkMode.Pledge);
    await copmTester.setNetworks(net1Type, net2Type);
    await copmTester.startServer();

    partyA = copmTester.getPartyA("bond");
    partyB = copmTester.getPartyB("bond");

    dest_cert = await copmTester.getCertificateString(partyB);

    log.info("test setup complete");
  });

  afterAll(async () => {
    if (copmTester) {
      await copmTester.stopServer();
    }
  });

  test(`${net1Type}-${net2Type} get verified view1`, async () => {
    const assetType = "token1";
    const assetQuantity = 2;
    await (
      await copmTester.assetsFor(partyA)
    ).addToken(assetType, assetQuantity);

    log.info(`party a ${partyA.organization} ${partyA.userId}`);
    log.info(`party b ${partyB.organization} ${partyB.userId}`);

    const pledgeResult = await copmTester.clientFor(partyA).pledgeAssetV1(
      new PledgeAssetV1Request({
        assetPledgeV1PB: {
          asset: {
            assetType: assetType,
            assetQuantity: assetQuantity,
          },
          source: {
            organization: partyA.organization,
            userId: partyA.userId,
          },
          destination: {
            organization: partyB.organization,
            userId: partyB.userId,
          },
          expirySecs: BigInt(45),
          destinationCertificate: dest_cert,
        },
      }),
    );

    expect(pledgeResult).toBeTruthy();
    expect(pledgeResult.pledgeId).toBeString();
    const readPledge = await copmTester.getVerifyViewCmd(
      pledgeResult.pledgeId,
      await copmTester.getCertificateString(partyA),
      dest_cert,
      partyB.organization,
    );
    const res = await copmTester.clientFor(partyB).getVerifiedViewV1(
      new GetVerifiedViewV1Request({
        getVerifiedViewV1RequestPB: {
          account: {
            organization: partyB.organization,
            userId: partyB.userId,
          },
          view: {
            organization: partyA.organization,
            viewAddress: readPledge,
          },
        },
      }),
    );

    expect(res).toBeTruthy();
    expect(res.data).toBeString();
    log.info(res.data);
  });
});
