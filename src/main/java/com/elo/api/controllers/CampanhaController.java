package com.elo.api.controllers;

import com.elo.api.models.Campanha;
import com.elo.api.models.Usuario;
import com.elo.api.services.CampanhaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/campanhas")
@RequiredArgsConstructor
@Slf4j
public class CampanhaController {

    private final CampanhaService campanhaService;

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Campanha campanha,
                                   @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            Campanha nova = campanhaService.criarCampanha(campanha, usuarioLogado.getUsuarioId());
            return ResponseEntity.status(HttpStatus.CREATED).body(nova);
        } catch (Exception e) {
            log.error("Erro ao criar campanha: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<Campanha>> listar(@AuthenticationPrincipal Usuario usuarioLogado) {
        List<Campanha> campanhas;
        if (usuarioLogado.getRole() == Usuario.Role.empresa) {
            campanhas = campanhaService.listarCampanhasPorEmpresa(usuarioLogado.getUsuarioId());
        } else if (usuarioLogado.getRole() == Usuario.Role.cliente) {
            if (usuarioLogado.getCdlId() != null) {
                campanhas = campanhaService.listarCampanhasAtivasPorCdl(usuarioLogado.getCdlId());
            } else {
                campanhas = campanhaService.listarCampanhasAtivas();
            }
        } else {
            campanhas = campanhaService.listarCampanhasAtivas();
        }
        return ResponseEntity.ok(campanhas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Campanha> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(campanhaService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id,
                                       @RequestBody Campanha campanha,
                                       @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            Campanha atualizada = campanhaService.atualizarCampanha(id, campanha, usuarioLogado.getUsuarioId());
            return ResponseEntity.ok(atualizada);
        } catch (Exception e) {
            log.error("Erro ao atualizar campanha: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id,
                                     @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            campanhaService.deletarCampanha(id, usuarioLogado.getUsuarioId());
            return ResponseEntity.ok(Map.of("message", "Campanha deletada com sucesso"));
        } catch (Exception e) {
            log.error("Erro ao deletar campanha: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
