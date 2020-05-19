**EC Account Information Management API**

API for registering account information on the End-chains.


----
  
Register new EC account information

* **URL**

  /ecaccounts
  

* **Method:**

  `POST`
  
* **URL Params**

  None

* **Data Params**

  Data parameters must be given as an JSON Object.

  **Required:**
 
  `userID - [string], CC user ID tied to the account`
 
  `chainID - [string], ID of the EC to which the account belongs`
 
  `accountID - [string], ID of the EC-side account, such as when using the EC API`
 
  `alias - [string], display name, for example, on the UI`

  **Optional:**
 
  `authInfo - [string], Parameters used when authentication is required for EC-side account operations`

* **Success Response:**

  * **Code:** 201 <br />
    **Content:** a JSON object of registered EC account.

    `ECAccountID - [string], ID of the registered EC account information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2001, message: "No user ID specified. "} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2002, message: "No chain id specified. "} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2003, message: "No account ID specified"} }`


  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2004, message: "No account display name specified"} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Update EC account information

* **URL**

  /ecaccounts/:id

* **Method:**

  `PUT`
  
*  **URL Params**

   **Required:**
 
   `id - [string], EC account ID to update`

* **Data Params**

   **Optional:**
 
   `userID - [string], CC user ID tied to the account`
 
   `chainID - [string], ID of the EC to which the account belongs`
 
   `accountID - [string], ID of the EC-side account, such as when using the EC API`
 
   `alias - [string],  display name, for example, on the UI`
 
   `authInfo - [string], Parameters used when authentication is required for EC-side account operations`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of updated EC account.

    `ECAccountID - [string], ID of the updated EC account information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`


  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1001, message: "Account ID not registered. "} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Delete EC account information

* **URL**

  /ecaccounts/:id

* **Method:**

  `DELETE`
  
*  **URL Params**

   **Required:**
 
   `id - [string], EC account ID to delete`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 204 <br />
    **Content:** None
 
* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve one of EC account information

* **URL**

  /ecaccounts/:id

* **Method:**

  `GET`
  
*  **URL Params**

   **Required:**
 
   `id - [string], EC account ID to retrieve`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of retrieved EC account.

    `id - [string], EC account ID`
 
    `userID - [string], CC user ID tied to the account`
 
    `chainID - [string], ID of the EC to which the account belongs`
 
    `chainName - [string], display name of the EC`
 
    `accountID - [string], ID of the EC-side account, such as when using the EC API`
 
    `alias - [string],  display name of the EC account`
 
    `authInfo - [string], Parameters used when authentication is required for EC-side account operations`

* **Error Response:**

  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1001, message: "Account ID not registered. "} }`

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve EC account information list

* **URL**

  /ecaccounts

* **Method:**

  `GET`
  
*  **URL Params**

   **Optional:**
 
   Filtering condition (If you specify a chainID, please also specify a userID)
 
   `userID - [string], CC user ID tied to the account`
 
   `chainID - [string], ID of the EC to which the account belongs`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** JSON array object of retrieved EC accounts
 
* **Error Response:**

  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2001, message: "No user ID specified. "} }`


  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`


