/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise} from '../common/utils';


// Generates attestations on a foreign security domain unit's state
export const requestAttestation = async (attestedSecurityDomain: iin_agent_pb.AttestedSecurityDomain) => {
    console.log('requestAttestation:');
};

// Processes attestations on a foreign security domain unit's state received from a local IIN agent
export const sendAttestation = async (attestedSecurityDomain: iin_agent_pb.AttestedSecurityDomain) => {
    console.log('sendAttestation:');
};
