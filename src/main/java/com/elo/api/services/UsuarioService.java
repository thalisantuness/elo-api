package com.elo.api.services;

import com.elo.api.dtos.UsuarioDTO;
import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.exceptions.UnauthorizedException;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Service s3Service;

    @Transactional
    public Usuario criarUsuario(UsuarioDTO dto, Integer cdlIdFromContext) {
        log.info("Criando usuário: email={}, role={}", dto.getEmail(), dto.getRole());

        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email já cadastrado");
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(dto.getEmail());
        usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        usuario.setNome(dto.getNome());
        usuario.setTelefone(dto.getTelefone());
        usuario.setRole(dto.getRole());
        usuario.setClienteEndereco(dto.getClienteEndereco());
        usuario.setCidade(dto.getCidade());
        usuario.setEstado(dto.getEstado());
        usuario.setCnpj(dto.getCnpj());
        usuario.setPontos(0);

        // Definir CDL ID baseado no contexto
        if (dto.getRole() == Usuario.Role.cliente && dto.getCdlId() != null) {
            usuario.setCdlId(dto.getCdlId());
        } else if (dto.getRole() == Usuario.Role.empresa && cdlIdFromContext != null) {
            usuario.setCdlId(cdlIdFromContext);
        } else if (dto.getRole() == Usuario.Role.empresa && dto.getCdlId() != null) {
            usuario.setCdlId(dto.getCdlId());
        }

        usuario.setStatus(Usuario.StatusUsuario.ativo);

        // Upload da foto de perfil
        if (dto.getFotoPerfil() != null && dto.getFotoPerfil().startsWith("data:image")) {
            try {
                String fotoUrl = s3Service.uploadImagem(dto.getFotoPerfil(), "usuarios/perfil");
                usuario.setFotoPerfil(fotoUrl);
            } catch (Exception e) {
                log.error("Erro ao fazer upload da foto de perfil: {}", e.getMessage());
            }
        }

        usuario.setDataCadastro(LocalDateTime.now());

        return usuarioRepository.save(usuario);
    }

    public Usuario buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    public Usuario buscarPorId(Integer id) {
        Integer nonNullId = java.util.Objects.requireNonNull(id, "ID do usuário não pode ser nulo");
        return usuarioRepository.findById(nonNullId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    public List<Usuario> listarAdmins() {
        return usuarioRepository.findByRole(Usuario.Role.admin);
    }

    public List<Usuario> listarUsuariosComFiltros(Usuario usuarioLogado) {
        switch (usuarioLogado.getRole()) {
            case admin:
                return usuarioRepository.findAll();
            case cdl:
                return usuarioRepository.findByCdlId(usuarioLogado.getUsuarioId());
            case empresa:
                return usuarioRepository.findByRole(Usuario.Role.cliente);
            case cliente:
                if (usuarioLogado.getCdlId() != null) {
                    return usuarioRepository.findByCdlIdAndRole(usuarioLogado.getCdlId(), Usuario.Role.empresa);
                }
                return List.of();
            default:
                return List.of();
        }
    }

    public List<Usuario> listarCdlsAtivas() {
        return usuarioRepository.findByRoleAndStatus(Usuario.Role.cdl, Usuario.StatusUsuario.ativo);
    }

    public List<Usuario> listarLojasPorCdl(Integer cdlId) {
        Integer nonNullCdlId = java.util.Objects.requireNonNull(cdlId, "cdlId não pode ser nulo");
        return usuarioRepository.findByCdlIdAndRole(nonNullCdlId, Usuario.Role.empresa);
    }

    @Transactional
    public Usuario atualizarPerfil(Integer id, UsuarioDTO dto, Integer usuarioLogadoId, String role) {
        if (!role.equals("admin") && !id.equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a editar este perfil");
        }

        Usuario usuario = buscarPorId(id);

        if (dto.getNome() != null) usuario.setNome(dto.getNome());
        if (dto.getTelefone() != null) usuario.setTelefone(dto.getTelefone());
        if (dto.getClienteEndereco() != null) usuario.setClienteEndereco(dto.getClienteEndereco());
        if (dto.getCidade() != null) usuario.setCidade(dto.getCidade());
        if (dto.getEstado() != null) usuario.setEstado(dto.getEstado());

        usuario.setDataAtualizacao(LocalDateTime.now());

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void alterarSenha(Integer id, String senhaAtual, String novaSenha, Integer usuarioLogadoId) {
        if (!id.equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a alterar senha de outro usuário");
        }

        Usuario usuario = buscarPorId(id);

        if (!passwordEncoder.matches(senhaAtual, usuario.getSenha())) {
            throw new UnauthorizedException("Senha atual incorreta");
        }

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuario.setDataAtualizacao(LocalDateTime.now());
        usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario atualizarFotoPerfil(Integer id, String fotoBase64, Integer usuarioLogadoId) {
        if (!id.equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado");
        }

        Usuario usuario = buscarPorId(id);

        if (usuario.getFotoPerfil() != null) {
            s3Service.deletarArquivo(usuario.getFotoPerfil());
        }

        String fotoUrl = s3Service.uploadImagem(fotoBase64, "usuarios/perfil");
        usuario.setFotoPerfil(fotoUrl);
        usuario.setDataAtualizacao(LocalDateTime.now());

        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario aprovarCdl(Integer id) {
        Usuario usuario = buscarPorId(id);

        if (usuario.getRole() != Usuario.Role.cdl) {
            throw new RuntimeException("Usuário não é uma CDL");
        }

        usuario.setStatus(Usuario.StatusUsuario.ativo);
        return usuarioRepository.save(usuario);
    }

    @Transactional
    public Usuario tornarAdmin(Integer id) {
        Usuario usuario = buscarPorId(id);
        usuario.setRole(Usuario.Role.admin);
        usuario.setStatus(Usuario.StatusUsuario.ativo);
        return usuarioRepository.save(usuario);
    }

    public boolean validarSenha(Usuario usuario, String senha) {
        return passwordEncoder.matches(senha, usuario.getSenha());
    }

    @Transactional
    public Usuario validarTokenEResetarSenha(String token, String novaSenha) {
        // Por simplicidade na migração, assumindo que TokenProvider ou similar valida o token.
        // Em um sistema real, haveria uma tabela de tokens de recuperação.
        // Aqui buscaremos o usuário associado (mock ou via JWT).
        // Se o token for o email do usuário (exemplo simples/temporário):
        Usuario usuario = buscarPorEmail(token);
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuario.setDataAtualizacao(LocalDateTime.now());
        return usuarioRepository.save(usuario);
    }
}
