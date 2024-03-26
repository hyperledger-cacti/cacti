// @generated by protoc-gen-connect-es v1.3.0 with parameter "target=ts,js_import_style=module"
// @generated from file cacti/satp/v02/stage_0.proto (package cacti.satp.v02, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { PreTransferVerificationAndContextEstablishmentRequest, PreTransferVerificationAndContextEstablishmentResponse } from "./stage_0_pb.js";
import { MethodKind } from "@bufbuild/protobuf";

/**
 * util RPCs
 *
 * @generated from service cacti.satp.v02.SatpStage0Service
 */
export const SatpStage0Service = {
  typeName: "cacti.satp.v02.SatpStage0Service",
  methods: {
    /**
     * step RPCs
     *
     * @generated from rpc cacti.satp.v02.SatpStage0Service.TransferProposalClaims
     */
    transferProposalClaims: {
      name: "TransferProposalClaims",
      I: PreTransferVerificationAndContextEstablishmentRequest,
      O: PreTransferVerificationAndContextEstablishmentResponse,
      kind: MethodKind.Unary,
    },
  }
} as const;
