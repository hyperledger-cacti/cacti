Feature: Client successfully bridges out CBDC

  @bridgeOut
  @fabric
  @besu
  Scenario: Chaincode correctly tracks amount of bridged out CBDC when running bridging protocol
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    When "alice" initiates bridge out of 500 CBDC referenced by id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" to "alice" address in the sidechain
    Then the bridged out amount in the chaincode is 500 CBDC

  @bridgeOut
  @fabric
  @besu
  Scenario: Client successfully initiates bridge out of CBDC to own address in the sidechain
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    When "alice" initiates bridge out of 500 CBDC referenced by id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" to "alice" address in the sidechain
    Then "alice" has 0 CBDC available in the source chain
    Then "bob" has 500 CBDC available in the source chain
    Then "alice" has 500 CBDC available in the sidechain

  @bridgeOut
  @fabric
  Scenario: Client initiates bridge out of CBDC to another user address and the operation fails
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Then "alice" tries to initiate bridge out of 500 CBDC referenced by id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" to "charlie" address in the sidechain and operation fails because "it is not possible to bridge CBDC to another user"

  @bridgeOut
  @fabric
  Scenario: Impersonator tries initiates bridge out of other user CBDC and the operation fails
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Then "charlie" tries to initiate bridge out of 500 CBDC referenced by id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" to "charlie" address in the sidechain and operation fails because "it is not possible to transfer tokens escrowed by another user"

  @bridgeOut
  @fabric
  Scenario: Client tries initiates bridge out of more CBDC than the amount escrowed and the operation fails
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Then "alice" tries to initiate bridge out of 1000 CBDC referenced by id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" to "alice" address in the sidechain and operation fails because "it is not possible to transfer a different amount of CBDC than the ones escrowed"
