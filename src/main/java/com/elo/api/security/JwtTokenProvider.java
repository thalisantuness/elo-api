package com.elo.api.security;

import com.elo.api.models.Usuario;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private int jwtExpirationMs;

    private Key key;

    @PostConstruct
    public void init() {
        try {
            // Garante que o secret tem pelo menos 32 bytes
            byte[] keyBytes = jwtSecret.getBytes();
            if (keyBytes.length < 32) {
                // Se for menor que 32 bytes, completa
                byte[] newKey = new byte[32];
                System.arraycopy(keyBytes, 0, newKey, 0, Math.min(keyBytes.length, 32));
                this.key = Keys.hmacShaKeyFor(newKey);
            } else {
                this.key = Keys.hmacShaKeyFor(keyBytes);
            }
            System.out.println("JWT Key initialized successfully");
        } catch (Exception e) {
            System.err.println("Error initializing JWT key: " + e.getMessage());
            throw new RuntimeException("Failed to initialize JWT key", e);
        }
    }

    public String generateToken(Usuario usuario) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("usuario_id", usuario.getUsuarioId());
        claims.put("role", usuario.getRole().name());
        claims.put("email", usuario.getEmail());
        claims.put("cdl_id", usuario.getCdlId());

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(usuario.getEmail())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        String email = claims.getSubject();
        Integer usuarioId = claims.get("usuario_id", Integer.class);
        String role = claims.get("role", String.class);
        Integer cdlId = claims.get("cdl_id", Integer.class);

        Usuario usuario = new Usuario();
        usuario.setEmail(email);
        usuario.setUsuarioId(usuarioId);
        usuario.setRole(Usuario.Role.valueOf(role));
        usuario.setCdlId(cdlId);

        return new UsernamePasswordAuthenticationToken(usuario, null, null);
    }
}