package com.hecs.mini_program_backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import lombok.Data;

import java.util.Date;

@Data
public class TokenParse {
    private String openid;
    private Integer userType;
    private Date expiration;

    public void parseToken(String token) {
        Date now = new Date();
        JwtParser jwtParser = Jwts.parserBuilder()
                .setSigningKey(JwtKeyProvider.signingKey())
                .build();
        Jws<Claims> jwsClaims = jwtParser.parseClaimsJws(token);
        Claims claims = jwsClaims.getBody();

        expiration = claims.getExpiration();
        if (expiration.before(now)) {
            throw new JwtException("Token has expired");
        }

        Object openIdClaim = claims.get("openid");
        if (openIdClaim == null) {
            throw new JwtException("Token is missing openid");
        }
        openid = openIdClaim.toString();

        Object userTypeClaim = claims.get("user_type");
        userType = userTypeClaim == null ? null : Integer.parseInt(userTypeClaim.toString());
    }
}
