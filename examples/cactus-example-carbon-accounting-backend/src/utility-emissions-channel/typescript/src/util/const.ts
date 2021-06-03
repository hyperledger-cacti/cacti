/*
    SPDX-License-Identifier: Apache-2.0
*/

// const.ts : keep all the required constants at one place

// Error Name constants
export const ErrStateNotFound = "STATE_NOT_FOUND";
export const ErrStateAlreadyExists = "STATE_ALREADY_EXISTS";
export const ErrInvalidQueryString = "INVALID_QUERY_STRING";
export const ErrUnknownUOM = "UNKNOWN_UOM";
export const ErrInvalidDateFormat = "INVALID_DATA_FORMAT";

// chaincode entry point errors
export const ErrInvalidNumberOfArgument = "INVALID_NUMBER_OF_ARGUMENT";
export const ErrInvalidArgument = "INVALID_ARGUMENT";
export const ErrMethodNotSupported = "METHOD_NOT_SUPPORTED";
// message
export const MsgSuccess = "METHOD_EXECUTED_SUCCESSFULLY";
export const MsgFailure = "METHOD_EXECUTED_FAILED";

//  weight unit
export const WEIGHT_TONS = "TONS";

export const REGIONS = {
  NERC: "nerc_region",

  // Countries
  USA: "usa",
};
