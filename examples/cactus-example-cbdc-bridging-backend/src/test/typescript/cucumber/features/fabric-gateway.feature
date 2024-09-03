@fabric
Feature: Hyperledger Fabric gateway is working properly

  Scenario: Alice successfully escrows CBDC in the source chain
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then "alice" has 0 CBDC available in the source chain
    Then "bob" has 500 CBDC available in the source chain

  Scenario: Alice successfully creates an asset reference
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then the asset reference chaincode has an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57"

  Scenario: Alice successfully locks an asset reference
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    When "bob" locks the asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then the asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" is locked in the source chain

  Scenario: Alice successfully locks an asset reference and Bob tries to lock the same
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    When "bob" locks the asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then "charlie" fails to lock the asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain

  Scenario: Alice successfully escrows 500 CBDC and tries to transfer to Bob
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then "alice" fails to transfer 500 CBDC to "charlie"

  Scenario: Alice successfully deletes an asset reference
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    When "bob" locks and deletes an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    Then the asset reference chaincode has no asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57"

  Scenario: BridgeEntity successfully refunds CBDC
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    When "bob" locks and deletes an asset reference with id "00ed12e4-044e-46ff-98ef-a4e25f519b57" in the source chain
    When bob refunds 500 CBDC to "alice" in the source chain
    Then "bob" has 0 CBDC available in the source chain
    Then "alice" has 500 CBDC available in the source chain

  Scenario: Chaincode correctly tracks amount of bridged out CBDC (1)
    Given "alice" with 500 CBDC available in the source chain
    When "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    When "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    Then the bridged out amount in the chaincode is 500 CBDC

  Scenario: Chaincode correctly tracks amount of bridged out CBDC (2)
    Given "alice" with 500 CBDC available in the source chain
    Given "alice" escrows 500 CBDC and creates an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    When "bob" locks and deletes an asset reference with id "c5dfbd04-a71b-4848-92d1-78cd1fafaaf1" in the source chain
    When bob refunds 500 CBDC to "alice" in the source chain
    Then the bridged out amount in the chaincode is 0 CBDC