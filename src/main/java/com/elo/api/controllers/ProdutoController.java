package com.elo.api.controllers;

import com.elo.api.dtos.ProdutoDTO;
import com.elo.api.models.Produto;
import com.elo.api.models.Usuario;
import com.elo.api.services.ProdutoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService produtoService;

    @PostMapping
    public ResponseEntity<Produto> criar(@Valid @RequestBody ProdutoDTO dto,
                                         @AuthenticationPrincipal Usuario usuarioLogado) {
        Produto produto = produtoService.criarProduto(dto,
                usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        return ResponseEntity.status(HttpStatus.CREATED).body(produto);
    }

    @GetMapping
    public ResponseEntity<List<Produto>> listar(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(produtoService.listarProdutos(usuarioLogado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Produto> buscarPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(produtoService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(@PathVariable Integer id,
                                             @Valid @RequestBody ProdutoDTO dto,
                                             @AuthenticationPrincipal Usuario usuarioLogado) {
        Produto produto = produtoService.atualizarProduto(id, dto,
                usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        return ResponseEntity.ok(produto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id,
                                     @AuthenticationPrincipal Usuario usuarioLogado) {
        produtoService.deletarProduto(id, usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        return ResponseEntity.ok(Map.of("message", "Produto deletado com sucesso"));
    }

    @PostMapping("/{id}/fotos")
    public ResponseEntity<?> adicionarFoto(@PathVariable Integer id,
                                           @RequestBody Map<String, String> body,
                                           @AuthenticationPrincipal Usuario usuarioLogado) {
        var foto = produtoService.adicionarFoto(id, body.get("imageBase64"),
                usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        return ResponseEntity.status(HttpStatus.CREATED).body(foto);
    }

    @DeleteMapping("/{id}/fotos/{fotoId}")
    public ResponseEntity<?> deletarFoto(@PathVariable Integer id,
                                         @PathVariable Integer fotoId,
                                         @AuthenticationPrincipal Usuario usuarioLogado) {
        produtoService.deletarFoto(id, fotoId, usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        return ResponseEntity.ok(Map.of("message", "Foto deletada com sucesso"));
    }
}
