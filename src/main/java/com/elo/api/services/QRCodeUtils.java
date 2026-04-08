package com.elo.api.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

@Component
@Slf4j
public class QRCodeUtils {

    @Value("${qr.secret:default-secret-key-for-qrcode}")
    private String secret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String gerarQRCodeBase64(String data) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(data, BarcodeFormat.QR_CODE, 300, 300);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            byte[] qrCodeBytes = outputStream.toByteArray();
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(qrCodeBytes);

        } catch (Exception e) {
            log.error("Erro ao gerar QR Code: {}", e.getMessage());
            throw new RuntimeException("Erro ao gerar QR Code", e);
        }
    }

    public String gerarPayloadComAssinatura(Map<String, Object> payload) {
        try {
            Map<String, Object> sortedPayload = new TreeMap<>(payload);
            String payloadStr = objectMapper.writeValueAsString(sortedPayload);

            String assinatura = gerarHmacSha256(payloadStr, secret);

            Map<String, Object> signedPayload = new HashMap<>(payload);
            signedPayload.put("assinatura", assinatura);

            return objectMapper.writeValueAsString(signedPayload);
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar payload assinado", e);
        }
    }

    public Map<String, Object> validarQRCode(String qrCodeData) {
        try {
            Map<String, Object> result = objectMapper.readValue(qrCodeData, new TypeReference<Map<String, Object>>() {});
            
            String assinaturaRecebida = (String) result.get("assinatura");
            result.remove("assinatura");

            Map<String, Object> sortedPayload = new TreeMap<>(result);
            String payloadStr = objectMapper.writeValueAsString(sortedPayload);
            String assinaturaCalculada = gerarHmacSha256(payloadStr, secret);

            if (!assinaturaCalculada.equals(assinaturaRecebida)) {
                log.warn("Assinatura de QR Code inválida");
                return Map.of("valid", false, "error", "Assinatura inválida");
            }

            // Verificar expiração
            Object expiresAtObj = result.get("expiresAt");
            if (expiresAtObj != null) {
                long expiresAt = Long.parseLong(expiresAtObj.toString());
                if (System.currentTimeMillis() > expiresAt) {
                    return Map.of("valid", false, "error", "QR Code expirado");
                }
            }

            result.put("valid", true);
            return result;

        } catch (Exception e) {
            log.error("Erro ao validar QR Code: {}", e.getMessage());
            return Map.of("valid", false, "error", "Formato inválido");
        }
    }

    private String gerarHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar HMAC", e);
        }
    }
}
