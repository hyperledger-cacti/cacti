/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { handlePromise} from '../common/utils';


// Handles communication with foreign IIN agents
export const syncExternalStateFromIINAgent = async (securityDomainUnit: iin_agent_pb.SecurityDomainMemberIdentity) => {
    console.log('syncExternalStateFromIINAgent:', securityDomainUnit.getSecurityDomain(), '-', securityDomainUnit.getMemberId());
};

// Generates security domain unit's state/configuration
export const requestIdentityConfiguration = async (securityDomainUnit: iin_agent_pb.SecurityDomainMemberIdentityRequest) => {
    console.log('requestIdentityConfiguration:', securityDomainUnit.getSourceNetwork()!.getSecurityDomain(), '-', securityDomainUnit.getSourceNetwork()!.getMemberId());
};

// Processes foreign security domain unit's state/configuration received from a foreign IIN agent
export const sendIdentityConfiguration = async (attestedMembership: iin_agent_pb.AttestedMembership) => {
    const attestation = attestedMembership.getAttestation();
    if (attestation) {
        const securityDomainUnit = attestation.getUnitIdentity();
        if (securityDomainUnit) {
            console.log('sendIdentityConfiguration:', securityDomainUnit.getSecurityDomain(), '-', securityDomainUnit.getMemberId());
        }
    }
};
