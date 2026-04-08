package com.elo.api.services;

import com.elo.api.models.PasswordReset;
import com.elo.api.repositories.PasswordResetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetRepository passwordResetRepository;
    private final EmailService emailService;

    @Transactional
    public PasswordReset criarTokenReset(String email) {
        Objects.requireNonNull(email, "Email não pode ser nulo");
        // Excluir tokens antigos
        passwordResetRepository.deleteByEmail(email);

        // Criar novo token
        PasswordReset reset = new PasswordReset();
        reset.setEmail(email);
        reset.setToken(UUID.randomUUID().toString());
        reset.setExpiresAt(LocalDateTime.now().plusHours(1));
        reset.setUsed(false);

        return passwordResetRepository.save(reset);
    }

    public PasswordReset buscarTokenValido(String token) {
        Objects.requireNonNull(token, "Token não pode ser nulo");
        return passwordResetRepository
                .findByTokenAndUsedFalseAndExpiresAtGreaterThan(token, LocalDateTime.now())
                .orElse(null);
    }

    @Transactional
    public void marcarTokenComoUsado(String token) {
        Objects.requireNonNull(token, "Token não pode ser nulo");
        PasswordReset reset = buscarTokenValido(token);
        if (reset != null) {
            reset.setUsed(true);
            passwordResetRepository.save(reset);
        }
    }

    @Transactional
    public void invalidarTokensPorEmail(String email) {
        Objects.requireNonNull(email, "Email não pode ser nulo");
        passwordResetRepository.invalidateByEmail(email);
    }

    @Transactional
    public void solicitarReset(String email, String nomeUsuario, String frontendUrl) {
        PasswordReset reset = criarTokenReset(email);

        String resetLink = frontendUrl + "?token=" + reset.getToken();

        emailService.enviarEmailRecuperacaoSenha(email, nomeUsuario, resetLink);
    }
}
