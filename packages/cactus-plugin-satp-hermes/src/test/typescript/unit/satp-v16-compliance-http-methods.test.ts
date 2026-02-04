/**
 * ΔID: Δ03
 * SPEC: draft-ietf-satp-core-16 §5.4.1 ("Clients and Servers")
 *
 * v16 §5.4.1 normative text:
 *   "Servers MUST support the use of the HTTPS POST method for the endpoint.
 *    It is NOT RECOMMENDED to support the use of the HTTPS GET method, because
 *    the messages may change the state of the protocol and are not idempotent
 *    [RFC 9110]."
 *   "Clients MUST use the HTTPS POST method to send messages in this stage
 *    to the server."
 *
 * Gap: No test currently asserts that the SATP Connect RPC gateway endpoints
 * reject HTTP GET requests. This test uses the production Connect Node adapter
 * and generated Stage 1 service descriptor without starting ledger containers.
 */

import { create } from "@bufbuild/protobuf";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { Servers } from "@hyperledger-cacti/cactus-common";
import http from "node:http";
import { AddressInfo } from "node:net";
import {
	SatpStage1Service,
	TransferProposalResponseSchema,
} from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_1_pb";

describe("Δ03 — draft-ietf-satp-core-16 §5.4.1 HTTP method enforcement", () => {
	const server = http.createServer(
		connectNodeAdapter({
			routes: (router) => {
				router.service(SatpStage1Service, {
					transferProposal: async () => create(TransferProposalResponseSchema),
				});
			},
		}),
	);

	afterAll(async () => {
		await Servers.shutdown(server);
	});

	it("SATP Connect RPC stage endpoints MUST reject HTTP GET", async () => {
		const address = (await Servers.listen({
			hostname: "127.0.0.1",
			port: 0,
			server,
		})) as AddressInfo;
		const response = await fetch(
			`http://${address.address}:${address.port}/cacti.satp.v13.service.SatpStage1Service/TransferProposal`,
			{ method: "GET" },
		);

		// SPEC REF: draft-ietf-satp-core-16 §5.4.1
		expect([405, 415]).toContain(response.status);
	});
});
