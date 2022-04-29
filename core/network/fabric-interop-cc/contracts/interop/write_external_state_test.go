/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// writeExtenalState contains the chaincode function to process a response
// from a remote network
package main

import (
	"encoding/json"
	"testing"

	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

var cordaB64View = `CjQIBBIcVHVlIE5vdiAxNyAwMDoxMzo0NiBHTVQgMjAyMBoMTm90YXJpemF0aW9uIgRKU09OEtYHCoQGClhhMjZHVW9WYythenlIMENUYjN2K2pTdmp3Y255M0hFd3AyMlJrdDkvZC9GcXN4WVVvYXhVWTdUOWNKRk9TVTZiVW42UFIwNmFVckxxdjZLbzZ1NG5CUT09Ep8FLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJ3akNDQVYrZ0F3SUJBZ0lJVUprUXZtS20zNVl3RkFZSUtvWkl6ajBFQXdJR0NDcUdTTTQ5QXdFSE1DOHgKQ3pBSkJnTlZCQVlUQWtkQ01ROHdEUVlEVlFRSERBWk1iMjVrYjI0eER6QU5CZ05WQkFvTUJsQmhjblI1UVRBZQpGdzB5TURBM01qUXdNREF3TURCYUZ3MHlOekExTWpBd01EQXdNREJhTUM4eEN6QUpCZ05WQkFZVEFrZENNUTh3CkRRWURWUVFIREFaTWIyNWtiMjR4RHpBTkJnTlZCQW9NQmxCaGNuUjVRVEFxTUFVR0F5dGxjQU1oQU1NS2FSRUsKaGNUZ1NCTU16Szgxb1BVU1BvVm1HL2ZKTUxYcS91alNtc2U5bzRHSk1JR0dNQjBHQTFVZERnUVdCQlJNWHREcwpLRlp6VUxkUTNjMkRDVUV4M1QxQ1VEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01Bc0dBMVVkRHdRRUF3SUNoREFUCkJnTlZIU1VFRERBS0JnZ3JCZ0VGQlFjREFqQWZCZ05WSFNNRUdEQVdnQlI0aHdMdUxnZklaTUVXekc0bjNBeHcKZmdQYmV6QVJCZ29yQmdFRUFZT0tZZ0VCQkFNQ0FRWXdGQVlJS29aSXpqMEVBd0lHQ0NxR1NNNDlBd0VIQTBjQQpNRVFDSUM3SjQ2U3hERHozTGpETnJFUGpqd1AycHJnTUVNaDdyL2dKcG91UUhCaytBaUErS3pYRDBkNW1pSTg2CkQybVlLNEMzdFJsaTNYM1ZnbkNlOENPcWZZeXVRZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0aBlBhcnR5QRLMAQpsW1NpbXBsZVN0YXRlKGtleT1ILCB2YWx1ZT0xLCBvd25lcj1PPVBhcnR5QSwgTD1Mb25kb24sIEM9R0IsIGxpbmVhcklkPTIzMTRkNmI3LTFlY2EtNDg5Mi04OGY4LTc2ZDg1YjhhODVjZCldElxsb2NhbGhvc3Q6OTA4MC9Db3JkYV9OZXR3b3JrL2xvY2FsaG9zdDoxMDAwNiNjb20uY29yZGFTaW1wbGVBcHBsaWNhdGlvbi5mbG93LkdldFN0YXRlQnlLZXk6SA==`

var cordaMember = common.Member{
	Value: "-----BEGIN CERTIFICATE-----\nMIIBwjCCAV+gAwIBAgIIUJkQvmKm35YwFAYIKoZIzj0EAwIGCCqGSM49AwEHMC8x\nCzAJBgNVBAYTAkdCMQ8wDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAe\nFw0yMDA3MjQwMDAwMDBaFw0yNzA1MjAwMDAwMDBaMC8xCzAJBgNVBAYTAkdCMQ8w\nDQYDVQQHDAZMb25kb24xDzANBgNVBAoMBlBhcnR5QTAqMAUGAytlcAMhAMMKaREK\nhcTgSBMMzK81oPUSPoVmG/fJMLXq/ujSmse9o4GJMIGGMB0GA1UdDgQWBBRMXtDs\nKFZzULdQ3c2DCUEx3T1CUDAPBgNVHRMBAf8EBTADAQH/MAsGA1UdDwQEAwIChDAT\nBgNVHSUEDDAKBggrBgEFBQcDAjAfBgNVHSMEGDAWgBR4hwLuLgfIZMEWzG4n3Axw\nfgPbezARBgorBgEEAYOKYgEBBAMCAQYwFAYIKoZIzj0EAwIGCCqGSM49AwEHA0cA\nMEQCIC7J46SxDDz3LjDNrEPjjwP2prgMEMh7r/gJpouQHBk+AiA+KzXD0d5miI86\nD2mYK4C3tRli3X3VgnCe8COqfYyuQg==\n-----END CERTIFICATE-----",
	Type:  "certificate",
	Chain: []string{},
}

var cordaMembership = common.Membership{
	SecurityDomain: "Corda_Network",
	Members:        map[string]*common.Member{"PartyA": &cordaMember},
}

var cordaVerificationPolicy = common.VerificationPolicy{
	SecurityDomain: "Corda_Network",
	Identifiers: []*common.Identifier{{
		Pattern: "localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:*",
		Policy: &common.Policy{
			Criteria: []string{"PartyA"},
			Type:     "signature",
		},
	}},
}

var fabricNetwork = "network1"
var fabricRelayEndpoint = "relay-network1:9080"
var fabricPattern = "mychannel:simplestate:Read:a"
var fabricViewAddress = fabricRelayEndpoint + "/" + fabricNetwork + "/" + fabricPattern

var b64View = "CjIIAxIYMjAyMS0wOC0wOVQxMToxOToxNC41OTJaGgxOb3Rhcml6YXRpb24iBlNUUklORxKBDApKCMgBGkUKCEFyY3R1cnVzEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEaigMKIFDt2MRSUeTYAeOVPLZH7N+xPQ+ayZ2KwTWB2AlSLsXsEuUCCogCEmYKCl9saWZlY3ljbGUSWAooCiJuYW1lc3BhY2VzL2ZpZWxkcy9pbnRlcm9wL1NlcXVlbmNlEgIIBgosCiZuYW1lc3BhY2VzL2ZpZWxkcy9zaW1wbGVzdGF0ZS9TZXF1ZW5jZRICCAMSagoHaW50ZXJvcBJfCiMKHQBhY2Nlc3NDb250cm9sAENvcmRhX05ldHdvcmsAEgIICwogChoAbWVtYmVyc2hpcABDb3JkYV9OZXR3b3JrABICCA0KFgoQAPSPv79pbml0aWFsaXplZBICCAcSMgoLc2ltcGxlc3RhdGUSIwoWChAA9I+/v2luaXRpYWxpemVkEgIIBAoJCgFhEgQICRABGkoIyAEaRQoIQXJjdHVydXMSOXJlbGF5LW5ldHdvcmsxOjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6YSIMEgdpbnRlcm9wGgExIqUICtkHCgdPcmcxTVNQEs0HLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNvakNDQWttZ0F3SUJBZ0lVTWN4Y1FNWENUcThpVmlCZFUrRFNidTVjM2Rzd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl4TURjek1EQTFORGN3TUZvWERUSXlNRGN6TURBMU5USXdNRm93V3pFTE1Ba0cKQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUtFd3RJZVhCbApjbXhsWkdkbGNqRU5NQXNHQTFVRUN4TUVjR1ZsY2pFT01Bd0dBMVVFQXhNRmNHVmxjakF3V1RBVEJnY3Foa2pPClBRSUJCZ2dxaGtqT1BRTUJCd05DQUFUWk1uU1hRbyswcWhxTW5yYmxROTRsaExsdW9BeUxsMUQ1K2JPTkRmRXYKUU9IVU9HKy9XL0pqOUV1M1UwTCtNZTRzd1c1M3ZGYmJHNGtWLzZYQzFZMlFvNEhkTUlIYU1BNEdBMVVkRHdFQgovd1FFQXdJSGdEQU1CZ05WSFJNQkFmOEVBakFBTUIwR0ExVWREZ1FXQkJSZXp2K3cyM1F3aWFYcGVYSUhBVGovCmJRSjByakFmQmdOVkhTTUVHREFXZ0JSeWh2V0Mramd2T3N1UlNGNmFyWHUyemwwZy9EQWlCZ05WSFJFRUd6QVoKZ2hkd1pXVnlNQzV2Y21jeExtNWxkSGR2Y21zeExtTnZiVEJXQmdncUF3UUZCZ2NJQVFSS2V5SmhkSFJ5Y3lJNgpleUpvWmk1QlptWnBiR2xoZEdsdmJpSTZJaUlzSW1obUxrVnVjbTlzYkcxbGJuUkpSQ0k2SW5CbFpYSXdJaXdpCmFHWXVWSGx3WlNJNkluQmxaWElpZlgwd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ09yVmZvbmJCOHh2RU8zYjcKbk1OOHdMK3VhNVV2RmVoSnlHS0RISFN0YURZQ0lHNURWdE42Wm03Q0J0dG1xQlJ6dWt5UzBpZ2p6cE9NMXNxTwpTZS94QS94eAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tChJHMEUCIQCwTtxvaQhZmLWuBXJFtI0RUaBOxBB5O2ItCjekFUyMUwIgTrOPxQ/PSKDsj+mJTLfEcrK5+f80sqQoQFJr+qBLy2k="

var b64ViewConfidential = "CjIIAxIYMjAyMi0wNC0yOVQxODo0Njo1OC45NzJaGgxOb3Rhcml6YXRpb24iBlNUUklORxLpHAr0CAjIARruCAqyAQqNAQTmm12BRo0TmKw6iwCuxSIgm7ZwEGib20B8e/z2pOkkkzBLPQHUqDYV9Fi4o9SJRhWG+6xWJ5Ohb9QeFjad9p4fnz6GfE3Y4nniiOPMQoDiMbzu0WMorzaPtdCrQAXTXlbPGvE89TDi7FimFpkW/Uq+GDUShvcVv4FiUe55YrgX1XUZzQPYHQipulpiiRogAeXsECkdXiDOcqaoeuUhyX02kmYMDnPRIBhWY6mlnIYSOXJlbGF5LW5ldHdvcmsxOjkwODAvbmV0d29yazEvbXljaGFubmVsOnNpbXBsZXN0YXRlOlJlYWQ6YRgBItMGLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNSekNDQWUyZ0F3SUJBZ0lVR3ZEU01HMzlvN2JhYUNaS2lobE0vVWRseDVZd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl4TURrd056QTVNVGN3TUZvWERUSXlNRGt3TnpBNU1qSXdNRm93SVRFUE1BMEcKQTFVRUN4TUdZMnhwWlc1ME1RNHdEQVlEVlFRREV3VjFjMlZ5TVRCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OQpBd0VIQTBJQUJGWkRvc0NOaStBNkQ0YjRkRHJ0NWFHdzBQQjdmUlQwcDRoZ1RucWsxVVdmNTJVOGpPSVhnayt0CldGeklDSjBMdGM2aVpXRUtkZUl1NlV6Sy9RMmV0RTZqZ2Jzd2diZ3dEZ1lEVlIwUEFRSC9CQVFEQWdlQU1Bd0cKQTFVZEV3RUIvd1FDTUFBd0hRWURWUjBPQkJZRUZDMlBGbjRzaUNMR1hsLy90ZEFHVElKZVVlSjFNQjhHQTFVZApJd1FZTUJhQUZMbkViUU5kOVZZK2NEbVNEdnpxeEkwY0tKbnhNRmdHQ0NvREJBVUdCd2dCQkV4N0ltRjBkSEp6CklqcDdJbWhtTGtGbVptbHNhV0YwYVc5dUlqb2lJaXdpYUdZdVJXNXliMnhzYldWdWRFbEVJam9pZFhObGNqRWkKTENKb1ppNVVlWEJsSWpvaVkyeHBaVzUwSW4xOU1Bb0dDQ3FHU000OUJBTUNBMGdBTUVVQ0lRQ0RhOXlsbHpmRQpHa28zQy9IOFp4U0p3ZTFlNklnV0xuc1VJTjlFY3gzK3BRSWdQSXUvRTB2bHdjamd1TDV4amI2aUFKRnNxZTFWClI5OUlwRjlTb1VRNUNqTT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQoqJDU3NTRiOTQ4LWM4MGYtNDUwYS1hNzA1LWY1NmM3NTA2MjMxNhrHCwogFcRWeu2pvbBCYfrDN0psmIG56fC7F8Ju5dCMIIjGDH8SogsKmgISZgoKX2xpZmVjeWNsZRJYCigKIm5hbWVzcGFjZXMvZmllbGRzL2ludGVyb3AvU2VxdWVuY2USAggGCiwKJm5hbWVzcGFjZXMvZmllbGRzL3NpbXBsZXN0YXRlL1NlcXVlbmNlEgIIAxJ+CgdpbnRlcm9wEnMKHgoYAGFjY2Vzc0NvbnRyb2wAbmV0d29yazIAEgIIDgobChUAbWVtYmVyc2hpcABuZXR3b3JrMgASAggQChYKEAD0j7+/aW5pdGlhbGl6ZWQSAggHChwKFmUyZUNvbmZpZGVudGlhbGl0eUZsYWcSAggHEjAKC3NpbXBsZXN0YXRlEiEKFgoQAPSPv79pbml0aWFsaXplZBICCAQKBwoBYRICCAga9AgIyAEa7ggKsgEKjQEE5ptdgUaNE5isOosArsUiIJu2cBBom9tAfHv89qTpJJMwSz0B1Kg2FfRYuKPUiUYVhvusVieToW/UHhY2nfaeH58+hnxN2OJ54ojjzEKA4jG87tFjKK82j7XQq0AF015WzxrxPPUw4uxYphaZFv1Kvhg1Eob3Fb+BYlHueWK4F9V1Gc0D2B0IqbpaYokaIAHl7BApHV4gznKmqHrlIcl9NpJmDA5z0SAYVmOppZyGEjlyZWxheS1uZXR3b3JrMTo5MDgwL25ldHdvcmsxL215Y2hhbm5lbDpzaW1wbGVzdGF0ZTpSZWFkOmEYASLTBi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDUnpDQ0FlMmdBd0lCQWdJVUd2RFNNRzM5bzdiYWFDWktpaGxNL1VkbHg1WXdDZ1lJS29aSXpqMEVBd0l3CmFERUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUsKRXd0SWVYQmxjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdApZMkV0YzJWeWRtVnlNQjRYRFRJeE1Ea3dOekE1TVRjd01Gb1hEVEl5TURrd056QTVNakl3TUZvd0lURVBNQTBHCkExVUVDeE1HWTJ4cFpXNTBNUTR3REFZRFZRUURFd1YxYzJWeU1UQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDkKQXdFSEEwSUFCRlpEb3NDTmkrQTZENGI0ZERydDVhR3cwUEI3ZlJUMHA0aGdUbnFrMVVXZjUyVThqT0lYZ2srdApXRnpJQ0owTHRjNmlaV0VLZGVJdTZVeksvUTJldEU2amdic3dnYmd3RGdZRFZSMFBBUUgvQkFRREFnZUFNQXdHCkExVWRFd0VCL3dRQ01BQXdIUVlEVlIwT0JCWUVGQzJQRm40c2lDTEdYbC8vdGRBR1RJSmVVZUoxTUI4R0ExVWQKSXdRWU1CYUFGTG5FYlFOZDlWWStjRG1TRHZ6cXhJMGNLSm54TUZnR0NDb0RCQVVHQndnQkJFeDdJbUYwZEhKegpJanA3SW1obUxrRm1abWxzYVdGMGFXOXVJam9pSWl3aWFHWXVSVzV5YjJ4c2JXVnVkRWxFSWpvaWRYTmxjakVpCkxDSm9aaTVVZVhCbElqb2lZMnhwWlc1MEluMTlNQW9HQ0NxR1NNNDlCQU1DQTBnQU1FVUNJUUNEYTl5bGx6ZkUKR2tvM0MvSDhaeFNKd2UxZTZJZ1dMbnNVSU45RWN4MytwUUlnUEl1L0Uwdmx3Y2pndUw1eGpiNmlBSkZzcWUxVgpSOTlJcEY5U29VUTVDak09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KKiQ1NzU0Yjk0OC1jODBmLTQ1MGEtYTcwNS1mNTZjNzUwNjIzMTYiDBIHaW50ZXJvcBoBMSKlCArZBwoHT3JnMU1TUBLNBy0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlDb2pDQ0FrbWdBd0lCQWdJVU1jeGNRTVhDVHE4aVZpQmRVK0RTYnU1YzNkc3dDZ1lJS29aSXpqMEVBd0l3CmFERUxNQWtHQTFVRUJoTUNWVk14RnpBVkJnTlZCQWdURGs1dmNuUm9JRU5oY205c2FXNWhNUlF3RWdZRFZRUUsKRXd0SWVYQmxjbXhsWkdkbGNqRVBNQTBHQTFVRUN4TUdSbUZpY21sak1Sa3dGd1lEVlFRREV4Qm1ZV0p5YVdNdApZMkV0YzJWeWRtVnlNQjRYRFRJeE1EY3pNREExTkRjd01Gb1hEVEl5TURjek1EQTFOVEl3TUZvd1d6RUxNQWtHCkExVUVCaE1DVlZNeEZ6QVZCZ05WQkFnVERrNXZjblJvSUVOaGNtOXNhVzVoTVJRd0VnWURWUVFLRXd0SWVYQmwKY214bFpHZGxjakVOTUFzR0ExVUVDeE1FY0dWbGNqRU9NQXdHQTFVRUF4TUZjR1ZsY2pBd1dUQVRCZ2NxaGtqTwpQUUlCQmdncWhrak9QUU1CQndOQ0FBVFpNblNYUW8rMHFocU1ucmJsUTk0bGhMbHVvQXlMbDFENStiT05EZkV2ClFPSFVPRysvVy9KajlFdTNVMEwrTWU0c3dXNTN2RmJiRzRrVi82WEMxWTJRbzRIZE1JSGFNQTRHQTFVZER3RUIKL3dRRUF3SUhnREFNQmdOVkhSTUJBZjhFQWpBQU1CMEdBMVVkRGdRV0JCUmV6dit3MjNRd2lhWHBlWElIQVRqLwpiUUowcmpBZkJnTlZIU01FR0RBV2dCUnlodldDK2pndk9zdVJTRjZhclh1MnpsMGcvREFpQmdOVkhSRUVHekFaCmdoZHdaV1Z5TUM1dmNtY3hMbTVsZEhkdmNtc3hMbU52YlRCV0JnZ3FBd1FGQmdjSUFRUktleUpoZEhSeWN5STYKZXlKb1ppNUJabVpwYkdsaGRHbHZiaUk2SWlJc0ltaG1Ma1Z1Y205c2JHMWxiblJKUkNJNkluQmxaWEl3SWl3aQphR1l1Vkhsd1pTSTZJbkJsWlhJaWZYMHdDZ1lJS29aSXpqMEVBd0lEUndBd1JBSWdPclZmb25iQjh4dkVPM2I3Cm5NTjh3TCt1YTVVdkZlaEp5R0tESEhTdGFEWUNJRzVEVnRONlptN0NCdHRtcUJSenVreVMwaWdqenBPTTFzcU8KU2UveEEveHgKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQoSRzBFAiEApQJHQ6Cn36u44EtWW713lnDj2y8xQUTGRczi/FGucKwCIH3zsuTHrS5w6mEALO8fgY6tVI9TLtDiz6Abnm8GiIUe"

var b64ViewContents = "CghBcmN0dXJ1cxIQev6XmXObPZZ3lyo7WO9gmw=="

var fabricCert = "-----BEGIN CERTIFICATE-----\nMIICFjCCAb2gAwIBAgIUYyc2soSqUtWVHTOtud7D1FbCHp0wCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTIxMDczMDA1NDYwMFoXDTM2MDcyNjA1NDYwMFowaDELMAkG\nA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQKEwtIeXBl\ncmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMtY2Etc2Vy\ndmVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEM/GelSlifY6+rMOE3G95SXF+\ndTHpG8j5cYK82EVCaLCSvNlCKgpupuQnbkLy+V6dgf9tKSnEsZgiHeB6AyJK/6NF\nMEMwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYE\nFHKG9YL6OC86y5FIXpqte7bOXSD8MAoGCCqGSM49BAMCA0cAMEQCIA9iMqQ/aJiC\na++ft4tN7io83jB17/fzG3BRC9soRR3bAiALgWNYk5118DKTkhFdJVQ0VIoopEtq\nGzi+/j4j7fu/wQ==\n-----END CERTIFICATE-----\n"


var network2Member = common.Member{
	Value: fabricCert,
	Type:  "ca",
	Chain: []string{},
}

var network1Membership = common.Membership{
	SecurityDomain: fabricNetwork,
	Members:        map[string]*common.Member{"Org1MSP": &network2Member},
}

var network1VerificationPolicy = common.VerificationPolicy{
	SecurityDomain: fabricNetwork,
	Identifiers: []*common.Identifier{{
		Pattern: fabricPattern,
		Policy: &common.Policy{
			Criteria: []string{"Org1MSP"},
			Type:     "signature",
		},
	}},
}

func TestWriteExternalState(t *testing.T) {
	// Happy case: Fabric
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	// mock all the calls to the chaincode stub
	network1VerificationPolicyBytes, err := json.Marshal(&network1VerificationPolicy)
	require.NoError(t, err)
	network1MembershipBytes, err := json.Marshal(&network1Membership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, network1MembershipBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(peer.Response{
		Status:  200,
		Message: "",
		Payload: []byte("I am a result"),
	})

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{b64View}, []string{""})
	require.NoError(t, err)

	// Test success with encrypted view payload
	chaincodeStub.GetStateReturnsOnCall(2, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(3, network1MembershipBytes, nil)
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{b64ViewConfidential}, []string{b64ViewContents})
	require.NoError(t, err)

	// Test failures when invalid or insufficient arguments are supplied
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{2}, []string{fabricViewAddress}, []string{b64View}, []string{""})
	require.EqualError(t, err, "Index 2 out of bounds of array (length 2)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{0, 1}, []string{fabricViewAddress}, []string{b64View}, []string{""})
	require.EqualError(t, err, "Number of argument indices for substitution (2) does not match number of addresses (1)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{}, []string{""})
	require.EqualError(t, err, "Number of addresses (1) does not match number of views (0)")

	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{b64View}, []string{})
	require.EqualError(t, err, "Number of addresses (1) does not match number of view contents (0)")

	// Happy case: Corda
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	// mock all the calls to the chaincode stub
	cordaVerificationPolicyBytes, err := json.Marshal(&cordaVerificationPolicy)
	require.NoError(t, err)
	cordaMembershipBytes, err := json.Marshal(&cordaMembership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, cordaVerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, cordaMembershipBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(peer.Response{
		Status:  200,
		Message: "",
		Payload: []byte("I am a result"),
	})
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{"localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H"}, []string{cordaB64View}, []string{""})
	require.NoError(t, err)

	// Test case: Invalid cert in Membership
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	network1Membership.Members["Org1MSP"].Value = "invalid cert"
	invalidMembershipBytes, err := json.Marshal(&network1Membership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, network1VerificationPolicyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, invalidMembershipBytes, nil)
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{b64View}, []string{""})
	require.EqualError(t, err, "VerifyView error: Verify membership failed. Certificate not valid: Client cert not in a known PEM format")

	// Test case: Invalid policy in verification policy
	ctx, chaincodeStub = wtest.PrepMockStub()
	interopcc = SmartContract{}
	network1VerificationPolicy.Identifiers[0].Pattern = "not matching policy"
	invalidVerificationPolicyBytes, err := json.Marshal(&network1VerificationPolicy)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, invalidVerificationPolicyBytes, nil)
	err = interopcc.WriteExternalState(ctx, fabricNetwork, "mychannel", "Write", []string{"test-key", ""}, []int{1}, []string{fabricViewAddress}, []string{b64View}, []string{""})
	require.EqualError(t, err, "VerifyView error: Unable to resolve verification policy: Verification Policy Error: Failed to find verification policy matching view address: " + fabricPattern)
}
