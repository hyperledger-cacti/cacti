/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package relay

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/sanvenDev/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/sanvenDev/weaver-dlt-interoperability/common/protos-go/networks"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

const (
	//address     = "localhost:9080"
	timeoutTime = 60 // in seconds
)

/**
 * SendRequest to send a request to a remote network using gRPC and the relay.
 * @returns {string} The ID of the request
 */
func SendRequest(localRelayEndpoint string, address string, policy []string, requestingNetwork string, certificate string, signature string,
	nonce string, org string) (string, error) {

	// set up a connection to the server
	conn, err := grpc.Dial(localRelayEndpoint, grpc.WithInsecure())
	//conn, err := grpc.Dial(address, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return "", logThenErrorf("SendRequest(): failed to connect: %v", err)
	}
	defer conn.Close()

	networkClient := networks.NewNetworkClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	networkQuery := &networks.NetworkQuery{
		Policy:             policy,
		Address:            address,
		RequestingRelay:    "",
		RequestingNetwork:  requestingNetwork,
		Certificate:        certificate,
		RequestorSignature: signature,
		Nonce:              nonce,
		RequestingOrg:      org,
	}
	resp, err := networkClient.RequestState(ctx, networkQuery)
	if err != nil {
		return "", logThenErrorf("request state error: %v", err)
	}

	return resp.RequestId, nil
}

/**
 * ProcessRequest sends a request to a remote network using gRPC and the relay and polls for a response on the local network
 * Uses the timeout provided by the class.
 * @returns {string} The state returned by the remote request
 */
func ProcessRequest(localRelayEndpoint string, address string, policy []string, requestingNetwork string, certificate string, signature string,
	nonce string, org string) (*common.RequestState, error) {

	requestId, err := SendRequest(localRelayEndpoint, address, policy, requestingNetwork, certificate, signature, nonce, org)
	if err != nil {
		return nil, logThenErrorf("request state error: %s", err.Error())
	}
	// Adds timout time to current time.
	currentTimeSecs := uint64(time.Now().Unix())
	endTime := currentTimeSecs + timeoutTime
	//TODO: SLOW DOWN
	finalState, err := recursiveState(localRelayEndpoint, requestId, endTime)
	if err != nil {
		return nil, logThenErrorf("state error: %s", err.Error())
	}
	if finalState.GetError() != "" {
		return nil, logThenErrorf("error from view payload: %s", finalState.GetError())
	}
	return finalState, nil
}

func recursiveState(localRelayEndpoint string, requestID string, endTime uint64) (*common.RequestState, error) {
	state, err := GetRequest(localRelayEndpoint, requestID)
	if err != nil {
		return nil, logThenErrorf("request state error: %s", err.Error())
	}
	if (state.GetStatus() == common.RequestState_PENDING) ||
		(state.GetStatus() == common.RequestState_PENDING_ACK) {
		// return error if the waiting time is elapsed
		currentTimeSecs := uint64(time.Now().Unix())
		if endTime <= currentTimeSecs {
			return nil, logThenErrorf("timeout: State is still pending")
		} else {
			return recursiveState(localRelayEndpoint, requestID, endTime)
		}
	} else {
		return state, nil
	}
}

/**
 * GetRequest is used to get the request from the local network
 * @returns {object} The request object from the relay
 */
//func GetRequest(requestId string) (*networks.GetStateMessage, error) {
func GetRequest(localRelayEndpoint string, requestId string) (*common.RequestState, error) {

	// set up a connection to the server
	conn, err := grpc.Dial(localRelayEndpoint, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return nil, logThenErrorf("GetRequest(): failed to connect: %v", err)
	}
	defer conn.Close()

	networkClient := networks.NewNetworkClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	getStateMessage := &networks.GetStateMessage{
		RequestId: requestId,
	}
	requestState, err := networkClient.GetState(ctx, getStateMessage)
	if err != nil {
		return nil, logThenErrorf("failed to get state: %v", err)
	}
	log.Infof("requestState: %+v", requestState)

	return requestState, nil
}
