# CBDC + SATP Monitoring

## Table of Contents

1. [Context](#context)
2. [Possible Solution Approaches](#possible-solution-approaches)
    1. [Docker Within Docker](#docker-within-docker)
    2. [Separate Dockers](#separate-dockers)
3. [Implementation](#partial-implementation-pull-request)
4. [Considerations](#considerations)

## Context

The current state of the SATP-Hermes package includes a module for the creation and processing of telemetry data for monitoring purposes. However this feature is not yet integrated in the CBDC example and requires some configurating.

[Link to Github Issue](https://github.com/hyperledger-cacti/cacti/issues/3760)

## Possible Solution Approaches

There are two possible integration approaches to run in parallel the SATP-Hermes gateway and the monitoring system:

1. [Run everything together as a pack within the gateway docker container](#docker-within-docker)
2. [Run a container for each, as sort of a microservice structure](#separate-dockers)

### Docker Within Docker

Consists of running both the SATP gateway and the monitoring docker image together as a pack within the same docker container.

**Advantages:**

- Requires minimal orchestration: telemetry can continue to be exported to the default endpoint (localhost:4318).
- No Docker networking configuration is required for telemetry communication.
- Simpler setup for development or proof-of-concept environments.

**Disadvantages:**

- Violates container best practices by bundling multiple concerns into a single container.
- Increased container complexity and size.
- Harder to isolate failures (e.g., monitoring stack failures affecting the gateway).
- Less scalable and harder to reuse the monitoring stack across multiple services.
- Not suitable for production-grade deployments.

### Separate Dockers

This approach consists of running the SATP gateway and the monitoring stack in separate Docker containers, connected through a shared Docker network.

**Advantages:**

- Clear separation of concerns between business logic (SATP gateway) and observability.
- Aligns with container and microservice best practices.
- Easier scalability and reuse of the monitoring stack.
- Failures in the monitoring system do not directly impact the SATP gateway.
- Better mirrors real-world deployment scenarios.

**Disadvantages:**

- Requires Docker network configuration and explicit endpoint configuration.
- The telemetry exporter endpoint must be updated from localhost to the monitoring container hostname (e.g., otel-lgtm:4318).
- Slightly more complex orchestration and setup.

## Partial Implementation Pull Request

[Link to Github PR](https://github.com/hyperledger-cacti/cacti/pull/4061)

## Considerations
