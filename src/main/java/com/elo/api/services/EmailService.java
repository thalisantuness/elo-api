package com.elo.api.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Envia email de recuperação de senha
     */
    public void enviarEmailRecuperacaoSenha(String para, String nomeUsuario, String linkReset) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(para);
            message.setSubject("Recuperação de Senha - Elo API");
            message.setText(corpoEmailRecuperacao(nomeUsuario, linkReset));

            mailSender.send(message);
            log.info("Email de recuperação enviado para: {}", para);
        } catch (Exception e) {
            log.error("Erro ao enviar email de recuperação para {}: {}", para, e.getMessage());
        }
    }

    /**
     * Envia email de confirmação de senha alterada
     */
    public void enviarEmailConfirmacaoSenha(String para, String nomeUsuario) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(para);
            message.setSubject("Senha Alterada - Elo API");
            message.setText(corpoEmailConfirmacao(nomeUsuario));

            mailSender.send(message);
            log.info("Email de confirmação enviado para: {}", para);
        } catch (Exception e) {
            log.error("Erro ao enviar email de confirmação para {}: {}", para, e.getMessage());
        }
    }

    /**
     * Envia email de boas-vindas
     */
    public void enviarEmailBoasVindas(String para, String nomeUsuario) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(para);
            message.setSubject("Bem-vindo ao Elo API!");
            message.setText(corpoEmailBoasVindas(nomeUsuario));

            mailSender.send(message);
            log.info("Email de boas-vindas enviado para: {}", para);
        } catch (Exception e) {
            log.error("Erro ao enviar email de boas-vindas para {}: {}", para, e.getMessage());
        }
    }

    private String corpoEmailRecuperacao(String nomeUsuario, String linkReset) {
        return String.format("""
            Olá %s,
            
            Recebemos uma solicitação para redefinir sua senha no Elo API.
            
            Clique no link abaixo para criar uma nova senha:
            %s
            
            Este link é válido por 1 hora.
            
            Se você não solicitou esta alteração, ignore este email.
            
            Atenciosamente,
            Equipe Elo API
            """, nomeUsuario, linkReset);
    }

    private String corpoEmailConfirmacao(String nomeUsuario) {
        return String.format("""
            Olá %s,
            
            Sua senha foi alterada com sucesso no Elo API.
            
            Se você não realizou esta alteração, entre em contato com nosso suporte imediatamente.
            
            Atenciosamente,
            Equipe Elo API
            """, nomeUsuario);
    }

    private String corpoEmailBoasVindas(String nomeUsuario) {
        return String.format("""
            Olá %s,
            
            Bem-vindo ao Elo API! Estamos muito felizes em tê-lo conosco.
            
            Agora você pode:
            - 🛍️ Acumular pontos em suas compras
            - 🎁 Resgatar recompensas exclusivas
            - 📱 Acompanhar seu saldo em tempo real
            - 🔔 Receber ofertas personalizadas
            
            Qualquer dúvida, estamos à disposição.
            
            Atenciosamente,
            Equipe Elo API
            """, nomeUsuario);
    }
}
