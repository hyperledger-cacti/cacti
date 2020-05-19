**Destination EC information management API**

API for managing connectivity information of End-Chains.

----
  
Destination EC information generation

* **URL**

  /endchains

* **Method:**

  `POST`
  
* **URL Params**

  None

* **Data Params**

  **Required:**
 
  `chainID - [string], ID of the destination EC information to register`
 
  `chainName - [string], display name, for example, on the UI`
 
  `adapterUrl - [string], - URL of the adapter server to the appropriate EC`

* **Success Response:**

  * **Code:** 201 <br />
    **Content:** a JSON object of registered destination EC information.

    `chainID - [string], ID of registered destination EC information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2002, message: "No chain id specified. "} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2005, message: "No display name specified for the chain. "} }`

 
  * **Code:** 422 Unprocessable Entity<br />
    **Content:** `{ error : { code : 2007, message: "The adapter URL is not specified. "} }`

 
  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3002, message: "This is the chain ID of the already registered destination. "} }`

 
  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Update destination EC information

* **URL**

  /endchains/:id

* **Method:**

  `PUT`
  
*  **URL Params**

   **Required:**
 
   `id - [string], Chain ID to update`

* **Data Params**

  **Optional:**
 
  `chainName - [string], display name, for example, on the UI`
 
  `adapterUrl - [string], URL of the adapter server to the appropriate EC`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of updated destination EC information.

    `chainID - [string], ID of updated destination EC information`
 
* **Error Response:**

  * **Code:** 400 Bad Request<br />
    **Content:** `{ error : { code : 2000, message: "The request is not in JSON format. "} }`

  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1002, message: "Unregistered chain ID of the destination. "} }`

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Delete destination EC information

* **URL**

  /endchains/:id

* **Method:**

  `DELETE`
  
* **URL Params**

  **Required:**
 
  `id [string], Chain ID to delete`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 204 <br />
    **Content:** None
 
* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Retrieve one destination EC information

* **URL**

  /endchains/:id

* **Method:**

  `GET`
  
* **URL Params**

  **Required:**
 
  `id - [string], Chain ID to get`

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** a JSON object of retrieved destination EC information.

    `id - [string], Chain ID`
 
    `chainName - [string], display name, for example, on the UI`
 
    `adapterUrl - [string], URL of the adapter server to the appropriate EC`
 
* **Error Response:**

  * **Code:** 404 Not Found<br />
    **Content:** `{ error : { code : 1002, message: "Unregistered chain ID of the destination. "} }`

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

----

Get the list of destination EC information

* **URL**

  /endchains

* **Method:**

  `GET`
  
*  **URL Params**

  None

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** JSON array of retrieved EC information.

* **Error Response:**

  * **Code:** 500 Internal Server Error<br />
    **Content:** `{ error : { code : 3000, message: "Internal error. <_Error details_>"} }`

