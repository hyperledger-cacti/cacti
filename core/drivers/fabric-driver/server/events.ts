/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import ack_pb from '@hyperledger-labs/weaver-protos-js/common/ack_pb';
import eventsPb from '@hyperledger-labs/weaver-protos-js/common/events_pb';
import events_grpc_pb from '@hyperledger-labs/weaver-protos-js/relay/events_grpc_pb';
import { addEventSubscription, deleteEventSubscription } from "./utils"

function subscribeEventHelper(
    call_request: eventsPb.EventSubscription,
    client: events_grpc_pb.EventSubscribeClient
) {
    const newRequestId = call_request.getQuery()!.getRequestId();
    addEventSubscription(call_request).then((requestId) => {
        const ack_send = new ack_pb.Ack();
        if (newRequestId == requestId) {
            // event being subscribed for the first time
            ack_send.setMessage('Event subscription is successful!');
            ack_send.setStatus(ack_pb.Ack.STATUS.OK);
    
            // the event listener logic follows here
        } else {
            // event being subscribed already exists
            ack_send.setMessage(`Event subscription already exists with requestId: ${requestId}`);
            ack_send.setStatus(ack_pb.Ack.STATUS.ERROR);
        }
        ack_send.setRequestId(newRequestId);
    
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`);
    
        if (!process.env.RELAY_ENDPOINT) {
            throw new Error('RELAY_ENDPOINT is not set.');
        }
    
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send, function (err: any, response: any) {
            console.log(`Response: ${JSON.stringify(response.toObject())} Error: ${JSON.stringify(err)}`);
        });
    }).catch((error) => {
        const errorString: string = `error (thrown as part of async processing while storing to DB during subscribeEvent): ${JSON.stringify(error)}`;
        console.error(errorString);
        const ack_send_error = new ack_pb.Ack();
        ack_send_error.setRequestId(newRequestId);
        ack_send_error.setMessage(errorString);
        ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`);
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send_error, function (err: any, response: any) {
            console.log(`Response: ${JSON.stringify(response.toObject())} Error: ${JSON.stringify(err)}`);
        });
    });
}

function unsubscribeEventHelper(
    call_request: eventsPb.EventSubscription,
    client: events_grpc_pb.EventSubscribeClient
) {
    const newRequestId = call_request.getQuery()!.getRequestId();
    deleteEventSubscription(call_request.getEventMatcher()!, newRequestId).then((deletedSubscription: eventsPb.EventSubscription) => {
        const ack_send = new ack_pb.Ack();
        
        // event got unsubscribed
        ack_send.setMessage(`Event ${JSON.stringify(deletedSubscription.toObject())} unsubscription is successful!`);
        ack_send.setStatus(ack_pb.Ack.STATUS.OK);
        ack_send.setRequestId(newRequestId);
    
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`);
    
        if (!process.env.RELAY_ENDPOINT) {
            throw new Error('RELAY_ENDPOINT is not set.');
        }
    
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send, function (err: any, response: any) {
            console.log(`Response: ${JSON.stringify(response.toObject())} Error: ${JSON.stringify(err)}`);
        });
    }).catch((error) => {
        const errorString: string = `error (thrown as part of async processing while deleting from DB during unsubscribeEvent): ${JSON.stringify(error)}`;
        console.error(errorString);
        const ack_send_error = new ack_pb.Ack();
        ack_send_error.setRequestId(newRequestId);
        ack_send_error.setMessage(errorString);
        ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
        // gRPC response.
        console.log(`Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`);
        // Sending the fabric state to the relay.
        client.sendDriverSubscriptionStatus(ack_send_error, function (err: any, response: any) {
            console.log(`Response: ${JSON.stringify(response.toObject())} Error: ${JSON.stringify(err)}`);
        });
    });
}

export {
    subscribeEventHelper,
    unsubscribeEventHelper
}