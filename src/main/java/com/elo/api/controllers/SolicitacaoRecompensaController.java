package com.elo.api.controllers;

import com.elo.api.models.SolicitacaoRecompensa;
import com.elo.api.models.Usuario;
import com.elo.api.services.SolicitacaoRecompensaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/solicitacoes-recompensas")
@RequiredArgsConstructor
@Slf4j
public class SolicitacaoRecompensaController {

    private final SolicitacaoRecompensaService solicitacaoRecompensaService;

    @PostMapping("/recompensa/{recomId}")
    public ResponseEntity<?> solicitar(@PathVariable Integer recomId,
                                       @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            SolicitacaoRecompensa solicitacao = solicitacaoRecompensaService.solicitar(recomId, usuarioLogado.getUsuarioId());
            return ResponseEntity.status(HttpStatus.CREATED).body(solicitacao);
        } catch (Exception e) {
            log.error("Erro ao solicitar recompensa: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<List<SolicitacaoRecompensa>> listarMinhasSolicitacoes(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(solicitacaoRecompensaService.listarPorCliente(usuarioLogado.getUsuarioId()));
    }

    @GetMapping("/empresa")
    public ResponseEntity<List<SolicitacaoRecompensa>> listarSolicitacoesEmpresa(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(solicitacaoRecompensaService.listarPorEmpresa(usuarioLogado.getUsuarioId()));
    }

    @PatchMapping("/{solicitacaoId}/responder")
    public ResponseEntity<?> responder(@PathVariable Integer solicitacaoId,
                                       @RequestBody Map<String, String> body,
                                       @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            SolicitacaoRecompensa.StatusSolicitacao status = SolicitacaoRecompensa.StatusSolicitacao.valueOf(body.get("status").toLowerCase());
            SolicitacaoRecompensa respondida = solicitacaoRecompensaService.responder(solicitacaoId, status, usuarioLogado.getUsuarioId());
            return ResponseEntity.ok(respondida);
        } catch (Exception e) {
            log.error("Erro ao responder solicitação de recompensa: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
