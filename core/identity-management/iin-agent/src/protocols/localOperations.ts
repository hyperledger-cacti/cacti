/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise} from '../common/utils';


// Runs flows through local IIN agents
export const flowAndRecordAttestationsOnLedger = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('flowAndRecordAttestationsOnLedger:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Generates attestations on a foreign network unit's state
export const requestAttestation = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('requestAttestation:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Processes attestations on a foreign network unit's state received from a local IIN agent
export const sendAttestation = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('sendAttestation:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};
