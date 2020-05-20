**Asset Transfer Transaction Information Management API**

Access asset transfer transactions

----
  
Asset transfer transaction information generation

* **URL**

  /transfers

* **Method:**

  `POST`
  
*  **URL Params**

  None

* **Data Params**

  **Required:**
 
  `ruleID - [string], ID of the conversion rule to apply`
 
  `fromChain - [object], the sender information`
 
  `fromChain.chainID - [string], ID of the sender EC`
 
  `fromChain.accountID - [string], ID of the sender account`
 
  `fromChain.asset - [string], The amount of assets in the sender end-chain. You can specify only one of it or that in the receiver EC.`
 
  `toChain - [object], the receiver information`
 
  `toChain.chainID - [string], The ID of the receiver EC`
 
  `toChain.accountID - [string], The ID of the receiver account`
 
  `toChain.asset - [string], The amount of assets in the receiver end-chain. You can specify only one of it or that in the sender EC`

  **Optional:**
 
  `txID - [string], ID of the asset transfer transaction information. The default is set automatically.`

* **Success Response:**

  * **Code:** 201 <br />
    **Content:** a JSON object of registered asset transfer transaction information.

    `txID - [string], ID of the generated asset transfer transaction information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2001, message: "No user ID specified. "} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2019, message: "No transformation rule ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2024, message: "No sender end-chain information specified."} }`

  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2013, message: "No sender end-chain ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2020, message: "No sender end-chain account ID has been specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2025, message: "No receiver end-chain information specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2015, message: "No receiver end-chain ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2021, message: "No receiver end-chain account ID has been specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2032, message: "The specified end-chain ID and the end-chain ID defined in the transformation rule do not match."} }`


  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1003, message: "Unregistered conversion rule ID."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2029, message: "The sender account and the receiver account are duplicated."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2030, message: "The sender account and the representative account of the sender end-chain are duplicated."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2031, message: "The receiver account and the representative account of the receiver end-chain are duplicated."} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve one asset transfer transaction

* **URL**

  /transfers/:id

* **Method:**

  `GET`
  
* **URL Params**

  **Required:**
 
  `id - [string], The operation ID to get`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of retrieved asset transfer transaction information 
    Each event ID and time stamp is displayed only when the corresponding operation is performed.

    `id - [string], ID of the asset transfer transaction information`
 
    `ruleID - [string], ID of the conversion rule to apply`
 
    `fromChain - [object], the sender information`
 
    `fromChain.chainID - [string], ID of the sender EC`
 
    `fromChain.accountID - [string], ID of the sender account`
 
    `fromChain.asset - [string], The amount of assets in the sender end-chain`
 
    `fromChain.escrowAccountID - [string], The ID of the escrow account of the sender EC`
 
    `fromChain.settlementAccountID - [string], The ID of the representative account of the sender EC`
 
    `fromChain.escrowEvID - [string], Event ID of the asset transfer request to the escrow account`
 
    `fromChain.settlementEvID - [string], Event ID of the asset transfer request to the representative account`
 
    `fromChain.restoreEvID - [string], Event ID of the transfer request from the escrow account to the sender account`
 
    `toChain - [object], the receiver information`
 
    `toChain.chainID - [string], The ID of the receiver EC`
 
    `toChain.accountID - [string], The ID of the receiver account`
 
    `toChain.asset - [string], The amount of assets in the receiver end-chain`
 
    `toChain.settlementAccountID - [string], The ID of the representative account of the receiver EC`
 
    `toChain.paymentEvID - [string], Event ID of the transfer request from the representative account to the receiver account`
 
    `progress - [string], Current asset transfer transaction progress`
 
    `timestamps - [object], Timestamp at each progress of the asset transfer transaction`
 
    `timestamps.create - [string], Date Created`
 
    `timestamps.requestMargin - [string], Date and time when escrow event ID was recorded`
 
    `timestamps.fixedMargin - [string], Date and time of the escrow complete status`
 
    `timestamps.failedMargin - [string], Date and time of the escrow failure status`
 
    `timestamps.requestDirectFreeze - [string], Date and time when dicrectly freezing event ID was recorded (No escrow)`
 
    `timestamps.fixedDirectFreeze - [string], Date and time of the dicrectly freezing complete status (No escrow)`
 
    `timestamps.failedDirectFreeze - [string], Date and time of the dicrectly freezing failure status (No escrow)`
 
    `timestamps.requestCredit - [string], Date and time when credit event ID was recorded`
 
    `timestamps.fixedCredit - [string], Date and time of the credit complete status`
 
    `timestamps.failedCredit - [string], Date and time when credit event ID was recorded`
 
    `timestamps.requestRecovery - [string], Date and time when recovery event ID was recorded`
 
    `timestamps.fixedRecovery - [string], Date and time of the recovery complete status`
 
    `timestamps.requestFreeze - [string], Date and time when freezing event ID was recorded (Escrow)`
 
    `timestamps.fixedFreeze - [string], Date and time of the freezing complete status (Escrow)`
 
* **Error Response:**

  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1004, message: "Unregistered transaction ID."} }`

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve the list of asset transfer transaction information

* **URL**

  /transfers

* **Method:**

  `GET`
  
* **URL Params**

  **Optional:**
 
  Filtering condition 
 
  `userID - [string], ID of the user who generated the asset transfer transaction information`
 
  `progress - [string], Current asset transfer transaction progress`
 
  `createdBefore - [string], Creation Date and Time (Before the specified date)`
 
  `createdAfter - [string], Creation Date and Time (After the specified date)`
 
  `updatedBefore - [string], Last Modified (Before the specified date)`
 
  `updatedAfter - [string], Last Modified (After the specified date)`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON array of retrieved asset transfer transaction information list 
 
* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`



