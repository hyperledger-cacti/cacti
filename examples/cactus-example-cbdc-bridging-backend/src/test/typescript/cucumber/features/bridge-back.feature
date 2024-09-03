Feature: Client successfully bridges back CBDC

  @bridgeBack
  @fabric
  @besu
  Scenario: Client successfully initiates bridge back of CBDC to own address in the source chain
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "alice" with 500 CBDC available in the sidechain smart contract
    When "alice" escrows 500 CBDC and creates an asset reference with id "d25fbcbb-0895-4905-b8d5-502d5e83b122" in the sidechain
    Then "alice" initiates bridge back of 500 CBDC referenced by id "d25fbcbb-0895-4905-b8d5-502d5e83b122" to "alice" address in the source chain

  @bridgeBack
  @fabric
  @besu
  Scenario: Client initiates bridge back of CBDC and accounts have consistent balances in both chains
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "alice" with 500 CBDC available in the sidechain smart contract
    When "alice" escrows 500 CBDC and creates an asset reference with id "d25fbcbb-0895-4905-b8d5-502d5e83b122" in the sidechain
    Then "alice" initiates bridge back of 500 CBDC referenced by id "d25fbcbb-0895-4905-b8d5-502d5e83b122" to "alice" address in the source chain
    Then "alice" has 0 CBDC available in the sidechain
    Then "bob" has 0 CBDC available in the sidechain
    Then "alice" has 500 CBDC available in the source chain
    Then "bob" has 0 CBDC available in the source chain

  @bridgeBack
  @fabric
  @besu
  Scenario: Client successfully initiates bridge back half of the escrowed CBDC to own address in the source chain
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "alice" with 500 CBDC available in the sidechain smart contract
    When "alice" escrows 250 CBDC and creates an asset reference with id "d25fbcbb-0895-4905-b8d5-502d5e83b122" in the sidechain
    Then "alice" initiates bridge back of 250 CBDC referenced by id "d25fbcbb-0895-4905-b8d5-502d5e83b122" to "alice" address in the source chain
    Then "alice" has 250 CBDC available in the sidechain
    Then "bob" has 0 CBDC available in the sidechain
    Then "alice" has 250 CBDC available in the source chain
    Then "bob" has 250 CBDC available in the source chain

  @bridgeBack
  @fabric
  @besu
  Scenario: Client fails to initiate bridge back of double the escrowed CBDC to own address in the source chain
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Given "alice" with 500 CBDC available in the sidechain smart contract
    When "alice" escrows 500 CBDC and creates an asset reference with id "d25fbcbb-0895-4905-b8d5-502d5e83b122" in the sidechain
    Then "alice" fails to initiate bridge back of 10000 CBDC referenced by id "d25fbcbb-0895-4905-b8d5-502d5e83b122"

  @bridgeBack
  @fabric
  @besu
  Scenario: Impersonator fails to initiate bridge back of CBDC escrowed by another user address but transfer
    Given "alice" with 500 CBDC available in the sidechain smart contract
    When "alice" escrows 500 CBDC and creates an asset reference with id "d25fbcbb-0895-4905-b8d5-502d5e83b122" in the sidechain
    Then "charlie" fails to initiate bridge back of 500 CBDC referenced by id "d25fbcbb-0895-4905-b8d5-502d5e83b122"
    Then "alice" has 0 CBDC available in the source chain
    Then "alice" has 0 CBDC available in the sidechain
    Then "bob" has 0 CBDC available in the source chain
    Then "bob" has 500 CBDC available in the sidechain
    Then "charlie" has 0 CBDC available in the source chain
    Then "charlie" has 0 CBDC available in the sidechain
