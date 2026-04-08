package com.elo.api.controllers;

import com.elo.api.models.Compra;
import com.elo.api.models.Usuario;
import com.elo.api.services.CompraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    @PostMapping("/qr-code")
    public ResponseEntity<?> gerarQRCode(@RequestBody Map<String, Object> body,
                                         @AuthenticationPrincipal Usuario usuarioLogado) {
        BigDecimal valor = new BigDecimal(body.get("valor").toString());
        Integer campanhaId = body.get("campanha_id") != null ? (Integer) body.get("campanha_id") : null;

        Compra compra = compraService.gerarQRCode(valor, campanhaId, usuarioLogado.getUsuarioId());

        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("message", "QR Code gerado com sucesso");
        resp.put("compra_id", compra.getCompraId());
        resp.put("qr_code_base64", compra.getQrCodeImage());
        resp.put("qr_code_data", compra.getQrCodeData());
        resp.put("expira_em", compra.getQrCodeExpiraEm());
        resp.put("valor", compra.getValor());
        resp.put("pontos_estimados", compra.getPontosAdquiridos());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/compra")
    public ResponseEntity<?> claimCompra(@RequestBody Map<String, String> body,
                                         @AuthenticationPrincipal Usuario usuarioLogado) {
        Compra compra = compraService.claimCompra(body.get("qr_code_data"), usuarioLogado.getUsuarioId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Compra claimada com sucesso! Pontos adicionados.",
                "compra_id", compra.getCompraId(),
                "valor", compra.getValor(),
                "pontos_adquiridos", compra.getPontosAdquiridos()
        ));
    }

    @GetMapping("/compras")
    public ResponseEntity<List<Compra>> listarCompras(@AuthenticationPrincipal Usuario usuarioLogado) {
        List<Compra> compras;
        if (usuarioLogado.getRole() == Usuario.Role.empresa) {
            compras = compraService.listarComprasPorEmpresa(usuarioLogado.getUsuarioId());
        } else {
            compras = compraService.listarComprasPorCliente(usuarioLogado.getUsuarioId());
        }
        return ResponseEntity.ok(compras);
    }

    @GetMapping("/minhas-estatisticas")
    public ResponseEntity<?> estatisticasEmpresa(@AuthenticationPrincipal Usuario usuarioLogado) {
        if (usuarioLogado.getRole() != Usuario.Role.empresa) {
            return ResponseEntity.status(403).body(Map.of("error", "Apenas empresas podem ver estatísticas"));
        }
        return ResponseEntity.ok(compraService.getEstatisticasEmpresa(usuarioLogado.getUsuarioId()));
    }
}
