/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise} from './utils';


// Handles communication with foreign IIN agents
export const syncExternalStateFromIINAgent = async (networkUnit: iin_agent_pb.NetworkUnitIdentity) => {
    console.log('syncExternalStateFromIINAgent:', networkUnit.getNetworkId(), '-', networkUnit.getParticipantId());
};
