package com.elo.api.controllers;

import com.elo.api.models.PasswordReset;
import com.elo.api.models.Usuario;
import com.elo.api.services.PasswordResetService;
import com.elo.api.services.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final UsuarioService usuarioService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @PostMapping("/esqueci-senha")
    public ResponseEntity<?> solicitarReset(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email é obrigatório"));
        }

        Usuario usuario = usuarioService.buscarPorEmail(email);

        if (usuario != null) {
            passwordResetService.solicitarReset(email, usuario.getNomeCompleto(), frontendUrl);
        }

        // Sempre retorna sucesso por segurança
        return ResponseEntity.ok(Map.of(
                "message", "Se o email existir em nosso sistema, você receberá um link de recuperação",
                "success", true
        ));
    }

    @GetMapping("/validar-token/{token}")
    public ResponseEntity<?> validarToken(@PathVariable String token) {
        PasswordReset reset = passwordResetService.buscarTokenValido(token);

        if (reset == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Token inválido ou expirado",
                    "valid", false
            ));
        }

        return ResponseEntity.ok(Map.of(
                "valid", true,
                "email", reset.getEmail(),
                "expires_at", reset.getExpiresAt()
        ));
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<?> redefinirSenha(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String novaSenha = body.get("novaSenha");
        String confirmarSenha = body.get("confirmarSenha");

        // Validações
        if (token == null || novaSenha == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Token e nova senha são obrigatórios",
                    "success", false
            ));
        }

        if (novaSenha.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "A senha deve ter pelo menos 6 caracteres",
                    "success", false
            ));
        }

        if (confirmarSenha != null && !novaSenha.equals(confirmarSenha)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "As senhas não coincidem",
                    "success", false
            ));
        }

        PasswordReset reset = passwordResetService.buscarTokenValido(token);
        if (reset == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Token inválido ou expirado",
                    "success", false
            ));
        }

        Usuario usuario = usuarioService.validarTokenEResetarSenha(token, novaSenha);

        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Erro ao redefinir senha",
                    "success", false
            ));
        }

        // Invalidar outros tokens
        passwordResetService.invalidarTokensPorEmail(reset.getEmail());

        return ResponseEntity.ok(Map.of(
                "message", "Senha redefinida com sucesso! Você já pode fazer login com a nova senha.",
                "success", true,
                "usuario_id", usuario.getUsuarioId(),
                "email", reset.getEmail()
        ));
    }
}
