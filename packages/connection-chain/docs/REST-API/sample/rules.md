**Asset Transfer Rules API**

Managing asset transfer rule information

----
  
Transformation Rule Information Generation

* **URL**

  /rules

* **Method:**

  `POST`
  
*  **URL Params**

  None

* **Data Params**

  **Required:**
 
  `ruleName - [string], display name on the UI`
 
  `fromChain - [object], The sender EC information`
 
  `fromChain.chainID - [string], The ID of the sender EC`
 
  `fromChain.settlementAccountID - [string], The ID of the representative account of the sender EC`
 
  `toChain - [object], The ID of the receiver EC`
 
  `toChain.chainID - [string], The ID of the receiver EC`
 
  `toChain.settlementAccountID - [string], The ID of the representative account of the receiver EC`

  **Optional:**
 
  `fromChain.escrowAccountID - [string], The ID of the escrow account of the sender EC. If omitted, no escrow occurs.`
 
  `rule - [string], The conversion ratio (%) for the conversion of value from the sender asset to the receiver asset. The default is 100.`
 
  `commission - [string], Amount to deduct from the receiver asset before conversion. The default is 0.`

* **Success Response:**

  * **Code:** 201 <br />
    **Content:** a JSON object of registered transformation rule information.

    `ruleID - [string], ID of the registered transformation rule information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2012, message: "No display name for the transformation rule specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2024, message: "No sender end-chain information specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2013, message: "No sender end-chain ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2025, message: "No receiver end-chain information specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2015, message: "No receiver end-chain ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2011, message: "No representative account ID specified."} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2028, message: "The escrow account and the representative account are duplicated."} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Update transformation rule information

* **URL**

  /rules/:id

* **Method:**

  `PUT`
  
*  **URL Params**

   **Required:**
 
   `id - [string], The rule ID to update`

* **Data Params**

   **Optional:**
 
   `ruleName - [string], display name on the UI`
 
   `fromChain - [object], The sender EC information`
 
   `fromChain.chainID - [string], The ID of the sender EC`
 
   `fromChain.settlementAccountID - [string], The ID of the representative account of the sender EC`
 
   `fromChain.escrowAccountID - [string], The ID of the escrow account of the sender EC`
 
   `fromChain.isEscrow - [boolean], true if the change (no escrow -> escrow), false if the change (escrow -> no escrow)`
 
   `toChain - [object], The ID of the receiver EC`
 
   `toChain.chainID - [string], The ID of the receiver EC`
 
   `toChain.settlementAccountID - [string], The ID of the representative account of the receiver EC`
 
   `rule - [string], The conversion ratio (%) for the conversion of value from the sender asset to the receiver asset`
 
   `commission - [string], Amount to deduct from the receiver asset before conversion`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of updated transformation rule information.

    `ruleID - [string], ID of the updated transformation rule information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`

 
  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1003, message: "Unregistered conversion rule ID."} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2010, message: "No escrow account ID specified."} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2011, message: "No representative account ID specified."} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2028, message: "The escrow account and the representative account are duplicated."} }`

 
  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Delete conversion rule information

* **URL**

  /rules/:id

* **Method:**

  `DELETE`
  
*  **URL Params**

   **Required:**
 
   `id - [string], Rule ID to delete`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 204 <br />
    **Content:** None
 
* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Get one conversion rule information

* **URL**

  /rules/:id

* **Method:**

  `GET`
  
*  **URL Params**

   **Required:**
 
   `id - [string], Rule ID to get`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of retrieved transfer rule

    `id - [string], The rule ID`
 
    `ruleName - [string], display name on the UI`
 
    `fromChain - [object], The sender EC information`
 
    `fromChain.chainID - [string], The ID of the sender EC`
 
    `fromChain.settlementAccountID - [string], The ID of the representative account of the sender EC`
 
    `fromChain.escrowAccountID - [string], The ID of the escrow account of the sender EC`
 
    `toChain - [object], The ID of the receiver EC`
 
    `toChain.chainID - [string], The ID of the receiver EC`
 
    `toChain.settlementAccountID - [string], The ID of the representative account of the receiver EC`
 
    `rule - [string], The conversion ratio (%) for the conversion of value from the sender asset to the receiver asset`
 
    `commission - [string], Amount to deduct from the receiver asset before conversion`
 
* **Error Response:**

  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1003, message: "Unregistered conversion rule ID."} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve the list of conversion rule information

* **URL**

  /endchains

* **Method:**

  `GET`
  
* **URL Params**

  **Optional:**
 
  Filtering condition 
 
  `fromChainID - [string], Chain ID of the sender EC`
 
  `toChainID - [string], Chain ID of the receiver EC`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON array of retrieved transfer rule information list 

* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

