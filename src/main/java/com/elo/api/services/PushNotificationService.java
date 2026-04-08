package com.elo.api.services;

import com.elo.api.models.Usuario;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class PushNotificationService {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean enviarNotificacao(String pushToken, String title, String body, Object data) {
        try {
            // Validar token
            if (!isExpoPushToken(pushToken)) {
                log.warn("Token inválido: {}", pushToken);
                return false;
            }

            // Criar payload
            NotificationPayload payload = NotificationPayload.builder()
                    .to(pushToken)
                    .sound("default")
                    .title(title)
                    .body(body)
                    .data(data)
                    .priority("high")
                    .badge(1)
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(payload);

            // Enviar para Expo
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://exp.host/--/api/v2/push/send"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                log.info("Notificação enviada com sucesso para: {}", pushToken);
                return true;
            } else {
                log.error("Erro ao enviar notificação. Status: {}, Body: {}",
                        response.statusCode(), response.body());
                return false;
            }

        } catch (Exception e) {
            log.error("Erro ao enviar push notification", e);
            return false;
        }
    }

    public void enviarNotificacaoMultiplos(List<Usuario> usuarios, String title, String body, Object data) {
        for (Usuario usuario : usuarios) {
            if (usuario.getPushToken() != null) {
                enviarNotificacao(usuario.getPushToken(), title, body, data);
            }
        }
    }

    private boolean isExpoPushToken(String token) {
        return token != null &&
                (token.startsWith("ExponentPushToken[") ||
                        token.startsWith("ExpoPushToken["));
    }

    @lombok.Builder
    @lombok.Data
    public static class NotificationPayload {
        private String to;
        private String sound;
        private String title;
        private String body;
        private Object data;
        private String priority;
        private Integer badge;
    }
}
