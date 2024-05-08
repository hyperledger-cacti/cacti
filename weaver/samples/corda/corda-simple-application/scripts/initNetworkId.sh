#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

## If 'network1' is deployed, initialize its membership
if [[ $(docker ps | grep corda_partya_1 | wc -l) == 1 ]]
then
	MEMBERS=""

	MEMBERS+="O=PartyA, L=London, C=GB;"
	if [[ $(docker ps | grep corda_partyb_1 | wc -l) == 1 ]]
	then
		MEMBERS+="O=PartyB, L=London, C=GB;"
	fi
	if [[ $(docker ps | grep corda_partyc_1 | wc -l) == 1 ]]
	then
		MEMBERS+="O=PartyC, L=London, C=GB;"
	fi
	MEMBERS=${MEMBERS::-1}

	echo $MEMBERS

	./clients/build/install/clients/bin/clients network-id create-state -m "$MEMBERS"
fi

## If 'network2' is deployed, initialize its membership
if [[ $(docker ps | grep corda_network2_partya_1 | wc -l) == 1 ]]
then
	MEMBERS=""

	MEMBERS+="O=PartyA, L=London, C=GB;"
	if [[ $(docker ps | grep corda_network2_partyb_1 | wc -l) == 1 ]]
	then
		MEMBERS+="O=PartyB, L=London, C=GB;"
	fi
	if [[ $(docker ps | grep corda_network2_partyc_1 | wc -l) == 1 ]]
	then
		MEMBERS+="O=PartyC, L=London, C=GB;"
	fi
	MEMBERS=${MEMBERS::-1}

	echo $MEMBERS

	CORDA_PORT=30006 NETWORK_NAME=Corda_Network2 ./clients/build/install/clients/bin/clients network-id create-state -m "$MEMBERS"
fi

