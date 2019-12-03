package com.accenture.interoperability.webserver

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.*


/**
 * Authentication configuration.
 */
@Component
class SingleUser(
    @Value("\${auth.username}") private val username: String,
    @Value("\${auth.password}") private val password: String
) {
    internal fun isValidSingleUser(
        username: String, password: String
    ) = this.password == password && this.username == username
}

/**
 * Authentication API endpoints.
 */
@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val singleUser: SingleUser,
    private val jwtConfig: JwtConfig
) {

    class LoginRequestBody(
        val username: String,
        val password: String
    )

    /**
     * Endpoint for user authentication.
     */
    @PostMapping("/login", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun postLogin(
        @RequestBody requestBody: LoginRequestBody
    ) = if (singleUser.isValidSingleUser(requestBody.username, requestBody.password))
        ResponseEntity.ok(
            mapOf("token" to jwtConfig.jwtToken(requestBody.username))
        )
    else
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication error")


    @GetMapping("/random-number", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun getRandomNumber() = ResponseEntity.ok(
        mapOf("num" to (Math.random() * 100).toInt())
    )
}


