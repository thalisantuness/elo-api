package com.elo.api.controllers;

import com.elo.api.dtos.LoginDTO;
import com.elo.api.dtos.UsuarioDTO;
import com.elo.api.models.Usuario;
import com.elo.api.security.JwtTokenProvider;
import com.elo.api.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final JwtTokenProvider tokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginDTO dto) {
        try {
            System.out.println("1 - Recebendo login para: " + dto.email());

            Usuario usuario = usuarioService.buscarPorEmail(dto.email());
            System.out.println("2 - Usuario encontrado: " + usuario.getEmail());

            boolean senhaValida = usuarioService.validarSenha(usuario, dto.senha());
            System.out.println("3 - Senha válida: " + senhaValida);

            if (!senhaValida) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Senha incorreta"));
            }

            if (usuario.getStatus() == Usuario.StatusUsuario.bloqueado) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Usuário bloqueado"));
            }

            System.out.println("4 - Gerando token...");
            String token = tokenProvider.generateToken(usuario);
            System.out.println("5 - Token gerado com sucesso");

            Map<String, Object> usuarioMap = new HashMap<>();
            usuarioMap.put("usuario_id", usuario.getUsuarioId());
            usuarioMap.put("email", usuario.getEmail());
            usuarioMap.put("role", usuario.getRole().name());
            usuarioMap.put("nome", usuario.getNome());
            usuarioMap.put("foto_perfil", usuario.getFotoPerfil());
            usuarioMap.put("pontos", usuario.getPontos());
            usuarioMap.put("status", usuario.getStatus().name());
            usuarioMap.put("cdl_id", usuario.getCdlId());
            usuarioMap.put("telefone", usuario.getTelefone());
            usuarioMap.put("cidade", usuario.getCidade());
            usuarioMap.put("estado", usuario.getEstado());

            Map<String, Object> response = new HashMap<>();
            response.put("usuario", usuarioMap);
            response.put("token", token);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("ERRO NO LOGIN: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/usuarios")
    public ResponseEntity<?> cadastrar(@Valid @RequestBody UsuarioDTO dto,
                                       @AuthenticationPrincipal Usuario usuarioLogado) {
        try {
            boolean roleReservada = dto.getRole() == Usuario.Role.cdl
                    || dto.getRole() == Usuario.Role.empresa
                    || dto.getRole() == Usuario.Role.admin;

            if (roleReservada) {
                if (usuarioLogado == null || usuarioLogado.getRole() != Usuario.Role.admin) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Apenas administradores podem criar CDLs e empresas"));
                }
            }

            Integer cdlIdFromContext = null;
            if (usuarioLogado != null && usuarioLogado.getRole() == Usuario.Role.cdl) {
                cdlIdFromContext = usuarioLogado.getUsuarioId();
            }

            Usuario usuario = usuarioService.criarUsuario(dto, cdlIdFromContext);
            usuario.setSenha(null);

            Map<String, Object> resposta = new HashMap<>();
            resposta.put("message", "Usuário cadastrado com sucesso");
            resposta.put("usuario", usuario);
            return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // NOVO ENDPOINT PARA CRIAR ADMIN MASTER (NÃO PRECISA DE LOGIN)
    @PostMapping("/setup/admin")
    public ResponseEntity<?> criarAdminMaster(@Valid @RequestBody UsuarioDTO dto) {
        try {
            // Verificar se já existe algum admin
            List<Usuario> admins = usuarioService.listarAdmins();
            if (!admins.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin já existe! Use o login normal."));
            }

            // Forçar role admin e status ativo
            dto.setRole(Usuario.Role.admin);

            Usuario usuario = usuarioService.criarUsuario(dto, null);
            usuario.setSenha(null);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message", "Admin master criado com sucesso!",
                            "usuario", usuario
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<Usuario>> listar(@AuthenticationPrincipal Usuario usuarioLogado) {
        List<Usuario> usuarios = usuarioService.listarUsuariosComFiltros(usuarioLogado);
        usuarios.forEach(u -> u.setSenha(null));
        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/usuarios/{id}")
    public ResponseEntity<Usuario> buscarPorId(@PathVariable Integer id) {
        Usuario usuario = usuarioService.buscarPorId(id);
        usuario.setSenha(null);
        return ResponseEntity.ok(usuario);
    }

    @PatchMapping("/usuarios/{id}/perfil")
    public ResponseEntity<?> atualizarPerfil(@PathVariable Integer id,
                                             @Valid @RequestBody UsuarioDTO dto,
                                             @AuthenticationPrincipal Usuario usuarioLogado) {
        Usuario usuario = usuarioService.atualizarPerfil(id, dto,
                usuarioLogado.getUsuarioId(), usuarioLogado.getRole().name());
        usuario.setSenha(null);
        return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso", "usuario", usuario));
    }

    @PatchMapping("/usuarios/{id}/senha")
    public ResponseEntity<?> alterarSenha(@PathVariable Integer id,
                                          @RequestBody Map<String, String> senhas,
                                          @AuthenticationPrincipal Usuario usuarioLogado) {
        usuarioService.alterarSenha(id, senhas.get("senhaAtual"), senhas.get("novaSenha"),
                usuarioLogado.getUsuarioId());
        return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
    }

    @PatchMapping("/usuarios/{id}/foto")
    public ResponseEntity<?> atualizarFotoPerfil(@PathVariable Integer id,
                                                 @RequestBody Map<String, String> body,
                                                 @AuthenticationPrincipal Usuario usuarioLogado) {
        Usuario usuario = usuarioService.atualizarFotoPerfil(id, body.get("foto_perfil"),
                usuarioLogado.getUsuarioId());
        usuario.setSenha(null);
        return ResponseEntity.ok(Map.of("message", "Foto atualizada com sucesso", "usuario", usuario));
    }

    @GetMapping("/cdls")
    public ResponseEntity<List<Usuario>> listarCdls() {
        return ResponseEntity.ok(usuarioService.listarCdlsAtivas());
    }

    @GetMapping("/cdls/{cdlId}/lojas")
    public ResponseEntity<List<Usuario>> listarLojasDaCdl(@PathVariable Integer cdlId) {
        return ResponseEntity.ok(usuarioService.listarLojasPorCdl(cdlId));
    }

    @PostMapping("/admin/criar")
    public ResponseEntity<?> criarAdminSemLogin(@Valid @RequestBody UsuarioDTO dto) {
        try {
            // Forçar role admin
            dto.setRole(Usuario.Role.admin);

            Usuario usuario = usuarioService.criarUsuario(dto, null);
            usuario.setSenha(null);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "message", "Admin criado com sucesso!",
                            "usuario", usuario
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/admin/aprovar-cdl/{id}")
    public ResponseEntity<?> aprovarCdl(@PathVariable Integer id, @AuthenticationPrincipal Usuario usuarioLogado) {
        if (usuarioLogado.getRole() != Usuario.Role.admin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Apenas admin pode aprovar CDLs"));
        }
        Usuario usuario = usuarioService.aprovarCdl(id);
        usuario.setSenha(null);
        return ResponseEntity.ok(Map.of("message", "CDL aprovada com sucesso", "usuario", usuario));
    }
}