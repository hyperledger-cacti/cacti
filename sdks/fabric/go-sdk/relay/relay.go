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

	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/networks"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

type Relay struct {
	endPoint    string
	timeoutSecs uint64
}

func NewRelay(localEndPoint string, timeout uint64) *Relay {
	relayObj := &Relay{
		endPoint:    localEndPoint,
		timeoutSecs: timeout,
	}
	return relayObj
}

/**
 * sendRequest to send a request to a remote network using gRPC and the relay.
 * @returns {string} The ID of the request
 */
func (r *Relay) sendRequest(address string, policy []string, requestingNetwork string, certificate string, signature string,
	nonce string, org string) (string, error) {

	// set up a connection to the server
	conn, err := grpc.Dial(r.endPoint, grpc.WithInsecure())
	if err != nil {
		return "", logThenErrorf("grpc Dial() failed to connect in sendRequest: %v", err)
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
		return "", logThenErrorf("error in grpc RequestState(): %v", err)
	}

	return resp.RequestId, nil
}

/**
 * ProcessRequest sends a request to a remote network using gRPC and the relay and polls for a response on the local network
 * Uses the timeout provided by the class.
 * @returns {string} The state returned by the remote request
 */
func (r *Relay) ProcessRequest(address string, policy []string, requestingNetwork string, certificate string, signature string,
	nonce string, org string) (*common.RequestState, error) {

	requestId, err := r.sendRequest(address, policy, requestingNetwork, certificate, signature, nonce, org)
	if err != nil {
		return nil, logThenErrorf("sendRequest() error: %s", err.Error())
	}
	// Adds timout time to current time.
	currentTimeSecs := uint64(time.Now().Unix())
	endTime := currentTimeSecs + r.timeoutSecs
	finalState, err := r.recursiveState(requestId, endTime)
	if err != nil {
		return nil, logThenErrorf("error to get state: %s", err.Error())
	}
	if finalState.GetError() != "" {
		return nil, logThenErrorf("cannot get finalState: %s", finalState.GetError())
	}
	return finalState, nil
}

func (r *Relay) recursiveState(requestID string, endTime uint64) (*common.RequestState, error) {
	state, err := r.getRequest(requestID)
	if err != nil {
		return nil, logThenErrorf("getRequest() error: %s", err.Error())
	}
	if (state.GetStatus() == common.RequestState_PENDING) ||
		(state.GetStatus() == common.RequestState_PENDING_ACK) {
		// return error if the waiting time is elapsed
		currentTimeSecs := uint64(time.Now().Unix())
		if endTime <= currentTimeSecs {
			return nil, logThenErrorf("timeout: state is still pending")
		} else {
			return r.recursiveState(requestID, endTime)
		}
	} else {
		return state, nil
	}
}

/**
 * getRequest is used to get the request from the local network
 * @returns {object} The request object from the relay
 */
func (r *Relay) getRequest(requestId string) (*common.RequestState, error) {

	// set up a connection to the server
	conn, err := grpc.Dial(r.endPoint, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return nil, logThenErrorf("grpc Dial() failed to connect in getRequest: %v", err)
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
		return nil, logThenErrorf("error in grpc GetState(): %s", err.Error())
	}
	log.Debugf("requestState: %v", requestState)

	return requestState, nil
}
