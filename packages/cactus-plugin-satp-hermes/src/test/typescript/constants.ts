//export const SATP_DOCKER_IMAGE_NAME = "hyperledger/cacti-satp-hermes-gateway";
export const SATP_DOCKER_IMAGE_NAME = process.env.SATP_DOCKER_IMAGE_NAME || "hyperledger/cacti-satp-hermes-gateway";
export const SATP_DOCKER_IMAGE_VERSION = process.env.SATP_DOCKER_IMAGE_VERSION || "latest";
export const SATP_DOCKER_IMAGE_OMIT_PULL = process.env.SATP_DOCKER_IMAGE_OMIT_PULL === "true";
