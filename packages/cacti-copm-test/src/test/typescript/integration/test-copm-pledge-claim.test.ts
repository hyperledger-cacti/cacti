import "jest-extended";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ClaimPledgedAssetV1Request,
  PledgeAssetV1Request,
} from "@hyperledger-cacti/cacti-copm-core";
import { CopmNetworkMode } from "../../../main/typescript/lib/types";
import { CopmTestertMultiNetwork } from "../../../main/typescript/lib/copm-tester-multi-network";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const logLevel: LogLevelDesc = "DEBUG";
const log: Logger = LoggerProvider.getOrCreate({
  label: "plugin-copm-crpc-server-test",
  level: logLevel,
});

function makeMatrix(supportedNetworks: string[]): string[][] {
  const supportedCombos = [];
  for (const val1 of supportedNetworks) {
    for (const val2 of supportedNetworks) {
      supportedCombos.push([val1, val2]);
    }
  }
  return supportedCombos;
}

describe("Copm Pledge and Claim", () => {
  let copmTester: CopmTestertMultiNetwork;

  const pledgeAssetName: string =
    "pledgeasset" + new Date().getTime().toString();

  const supportedNetworks = ["fabric", "corda"];
  let networksToTest: string[][];
  if (process.env["COPM_NET_1"] && process.env["COPM_NET_2"]) {
    networksToTest = [[process.env["COPM_NET_1"], process.env["COPM_NET_2"]]];
  } else {
    networksToTest = makeMatrix(supportedNetworks);
  }

  log.info(`Supported network combos: ${JSON.stringify(networksToTest)}`);

  beforeAll(async () => {
    copmTester = new CopmTestertMultiNetwork(log, CopmNetworkMode.Pledge);
    await copmTester.startServer();
    log.info("test setup complete");
  });

  afterAll(async () => {
    if (copmTester) {
      await copmTester.stopServer();
    }
  });

  test.each(networksToTest)(
    "%s-%s nft pledge and claim",
    async (net1Type, net2Type) => {
      if (net1Type == "corda" && net2Type == "fabric") {
        // can not transfer nft from corda to fabric due to
        // maturity date issue
        //https://github.com/hyperledger-cacti/cacti/issues/3610
        return;
      }
      await copmTester.setNetworks(net1Type, net2Type);

      const assetType = "bond01";
      const partyA = copmTester.getPartyA(assetType);
      const partyB = copmTester.getPartyB(assetType);
      const certA = await copmTester.getCertificateString(partyA);
      const certB = await copmTester.getCertificateString(partyB);
      const assetsPartyA = await copmTester.assetsFor(partyA);
      const assetsPartyB = await copmTester.assetsFor(partyB);

      await assetsPartyA.addNonFungibleAsset(assetType, pledgeAssetName);

      const pledgeNFTResult = await copmTester.clientFor(partyA).pledgeAssetV1(
        new PledgeAssetV1Request({
          assetPledgeV1PB: {
            asset: {
              assetType: assetType,
              assetId: pledgeAssetName,
            },
            source: partyA,
            destination: partyB,
            expirySecs: BigInt(45),
            destinationCertificate: certB,
          },
        }),
      );

      expect(pledgeNFTResult).toBeTruthy();
      expect(pledgeNFTResult.pledgeId).toBeString();

      const claimNFTResult = await copmTester
        .clientFor(partyB)
        .claimPledgedAssetV1(
          new ClaimPledgedAssetV1Request({
            assetPledgeClaimV1PB: {
              pledgeId: pledgeNFTResult.pledgeId,
              asset: {
                assetType: assetType,
                assetId: pledgeAssetName,
              },
              source: partyA,
              destination: partyB,
              sourceCertificate: certA,
              destCertificate: certB,
            },
          }),
        );
      expect(claimNFTResult).toBeTruthy();

      expect(
        await assetsPartyA.userOwnsNonFungibleAsset(assetType, pledgeAssetName),
      ).toBeFalse();
      expect(
        await assetsPartyB.userOwnsNonFungibleAsset(assetType, pledgeAssetName),
      ).toBeTrue();
    },
  );

  test.each(networksToTest)(
    "%s-%s fungible pledge and claim",
    async (net1Type, net2Type) => {
      await copmTester.setNetworks(net1Type, net2Type);
      log.info("starting tests");
      const assetType = "token1";
      const exchangeQuantity = 10;
      const partyA = copmTester.getPartyA(assetType);
      const partyB = copmTester.getPartyB(assetType);
      const certA = await copmTester.getCertificateString(partyA);
      const certB = await copmTester.getCertificateString(partyB);

      const assetsPartyA = await copmTester.assetsFor(partyA);
      const assetsPartyB = await copmTester.assetsFor(partyB);

      await assetsPartyA.addToken(assetType, exchangeQuantity);
      await assetsPartyB.addToken(assetType, 1);

      const partyAStartBalance = await assetsPartyA.tokenBalance(assetType);
      const partyBStartBalance = await assetsPartyB.tokenBalance(assetType);

      log.info(
        "party a %s@%s start balance %d",
        partyA.userId,
        partyA.organization,
        partyAStartBalance,
      );
      log.info(
        "party b %s@%s start balance %d",
        partyB.userId,
        partyB.organization,
        partyBStartBalance,
      );

      const pledgeResult = await copmTester.clientFor(partyA).pledgeAssetV1(
        new PledgeAssetV1Request({
          assetPledgeV1PB: {
            asset: {
              assetType: assetType,
              assetQuantity: exchangeQuantity,
            },
            source: partyA,
            destination: partyB,
            expirySecs: BigInt(45),
            destinationCertificate: certB,
          },
        }),
      );

      expect(pledgeResult).toBeTruthy();
      expect(pledgeResult.pledgeId).toBeString();

      const claimResult = await copmTester
        .clientFor(partyB)
        .claimPledgedAssetV1(
          new ClaimPledgedAssetV1Request({
            assetPledgeClaimV1PB: {
              pledgeId: pledgeResult.pledgeId,
              asset: {
                assetType: assetType,
                assetQuantity: exchangeQuantity,
              },
              source: partyA,
              destination: partyB,
              sourceCertificate: certA,
              destCertificate: certB,
            },
          }),
        );
      expect(claimResult).toBeTruthy();

      expect(await assetsPartyA.tokenBalance(assetType)).toEqual(
        partyAStartBalance - exchangeQuantity,
      );

      expect(await assetsPartyB.tokenBalance(assetType)).toEqual(
        partyBStartBalance + exchangeQuantity,
      );
    },
  );
});
