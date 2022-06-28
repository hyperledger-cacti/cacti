/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise} from '../common/utils';


// Handles communication with foreign IIN agents
export const syncExternalStateFromIINAgent = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('syncExternalStateFromIINAgent:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Generates network unit's state/configuration
export const requestIdentityConfiguration = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('requestIdentityConfiguration:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};

// Processes foreign network unit's state/configuration received from a foreign IIN agent
export const sendIdentityConfiguration = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('sendIdentityConfiguration:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};
