package com.accenture.interoperability.webserver

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.SignatureException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.filter.GenericFilterBean
import java.io.IOException
import java.util.*
import javax.servlet.FilterChain
import javax.servlet.ServletException
import javax.servlet.ServletRequest
import javax.servlet.ServletResponse
import javax.servlet.http.HttpServletRequest

/**
 * JSON Web Token secure filter configuration.
 */
@Component
class JwtConfig(
    @Value("\${jwt.secret}") internal val signingKey: String,
    @Value("\${jwt.expiration}") internal val expirationMinutes: Long
) {
    internal val expirationDate get() = Date(System.currentTimeMillis() + (expirationMinutes * 60_000L))

    internal fun jwtToken(subject: String) = Jwts.builder()
        .setSubject(subject)
        .claim("roles", "user")
        .setExpiration(expirationDate)
        .signWith(SignatureAlgorithm.HS256, signingKey)
        .compact()
}

/**
 * JSON Web Token secure filter.
 */
open class JwtFilter(private val jwtConfig : JwtConfig) : GenericFilterBean() {

    @Throws(IOException::class, ServletException::class)
    override fun doFilter(req: ServletRequest, res: ServletResponse, chain: FilterChain) {

        val request = req as HttpServletRequest
        val authHeader = request.getHeader("authorization")
            ?: throw ServletException("Missing Authorization header")

        val authorizationHeaderPrefix = "Bearer "
        if (!authHeader.startsWith(authorizationHeaderPrefix))
            throw ServletException("Invalid Authorization header")

        val token = authHeader.substring(authorizationHeaderPrefix.length)

        try {
            val claims = Jwts.parser().setSigningKey(jwtConfig.signingKey).parseClaimsJws(token).body
            request.setAttribute("claims", claims)
        } catch (e: SignatureException) {
            throw ServletException("Invalid token")
        }

        chain.doFilter(req, res)
    }
}
