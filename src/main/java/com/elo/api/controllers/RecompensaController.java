package com.elo.api.controllers;

import com.elo.api.models.Recompensa;
import com.elo.api.models.Usuario;
import com.elo.api.services.RecompensaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recompensas")
@RequiredArgsConstructor
@Slf4j
public class RecompensaController {

    private final RecompensaService recompensaService;

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Recompensa recompensa,
                                   @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            Recompensa nova = recompensaService.criarRecompensa(recompensa, usuarioLogado.getUsuarioId());
            return ResponseEntity.status(HttpStatus.CREATED).body(nova);
        } catch (Exception e) {
            log.error("Erro ao criar recompensa: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<Recompensa>> listar(@AuthenticationPrincipal Usuario usuarioLogado) {
        List<Recompensa> recompensas;
        if (usuarioLogado.getRole() == Usuario.Role.empresa || usuarioLogado.getRole() == Usuario.Role.cdl) {
            recompensas = recompensaService.listarRecompensasPorUsuario(usuarioLogado.getUsuarioId());
        } else {
            recompensas = recompensaService.listarTodas();
        }
        return ResponseEntity.ok(recompensas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Recompensa> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(recompensaService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id,
                                       @RequestBody Recompensa recompensa,
                                       @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            Recompensa atualizada = recompensaService.atualizarRecompensa(id, recompensa, usuarioLogado.getUsuarioId());
            return ResponseEntity.ok(atualizada);
        } catch (Exception e) {
            log.error("Erro ao atualizar recompensa: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id,
                                     @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            recompensaService.deletarRecompensa(id, usuarioLogado.getUsuarioId());
            return ResponseEntity.ok(Map.of("message", "Recompensa deletada com sucesso"));
        } catch (Exception e) {
            log.error("Erro ao deletar recompensa: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
