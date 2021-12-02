/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
    Documentation: [
        "external/introduction",
        {
            type: "category",
            label: "Getting Started",
            items: [
                "external/getting-started/guide",
                {
                    type: "category",
                    label: "Launching a Test Network",
                    items: [
                        "external/getting-started/test-network/overview",
                        "external/getting-started/test-network/setup-local",
                        "external/getting-started/test-network/setup-local-docker",
                        "external/getting-started/test-network/setup-packages",
                        "external/getting-started/test-network/setup-packages-docker",
                        "external/getting-started/test-network/ledger-initialization",
                        "external/getting-started/test-network/advanced-configuration",
                    ],
                },
                {
                    type: "category",
                    label: "Testing Interoperation Modes",
                    items: [
                        "external/getting-started/interop/overview",
                        "external/getting-started/interop/data-sharing",
                        "external/getting-started/interop/asset-exchange",
                        "external/getting-started/interop/asset-transfer",
                    ],
                },
                {
                    type: "category",
                    label: "Enabling Weaver in your Network and Application",
                    items: [
                        "external/getting-started/enabling-weaver-network/overview",
                        "external/getting-started/enabling-weaver-network/fabric",
                        "external/getting-started/enabling-weaver-network/corda",
                        "external/getting-started/enabling-weaver-network/besu",
                    ],
                },
            ],
        },
        {
            type: "category",
            label: "What is Interoperability?",
            items: [
                "external/what-is-interoperability/understanding-interoperability",
                "external/what-is-interoperability/levels-of-interoperability",
                "external/what-is-interoperability/integration-patterns",
            ],
        },
        "external/interoperability-modes",
        "external/design-principles",
        {
            type: "category",
            label: "User Stories",
            items: [
                "external/user-stories/overview",
                "external/user-stories/global-trade",
                "external/user-stories/financial-markets",
                "external/user-stories/legacy-integration",
            ],
        },
        {
            type: "category",
            label: "Architecture and Design",
            items: [
                "external/architecture-and-design/overview",
                "external/architecture-and-design/relay",
                "external/architecture-and-design/drivers",
                "external/architecture-and-design/weaver-dapps",
                "external/architecture-and-design/decentralized-identity",
            ],
        },
        {
            type: "category",
            label: "Security Model",
            items: [
                "external/security-model/authentication",
                "external/security-model/access-control",
                "external/security-model/proofs-and-verification",
                "external/security-model/end-to-end-security",
            ],
        },
        {
            type: "category",
            label: "Deployment Considerations",
            items: [
                "external/deployment-considerations/deployment-patterns",
                "external/deployment-considerations/governance-and-policies",
                "external/deployment-considerations/legal-and-regulation",
            ],
        },
        "external/specifications",
        "external/roadmap",
        "external/publications",
    ],
}
