package com.elo.api.services;

import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.exceptions.UnauthorizedException;
import com.elo.api.models.Recompensa;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.RecompensaRepository;
import com.elo.api.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecompensaService {

    private final RecompensaRepository recompensaRepository;
    private final UsuarioRepository usuarioRepository;
    private final S3Service s3Service;

    @Transactional
    public Recompensa criarRecompensa(Recompensa recompensa, Integer usuarioId) {
        java.util.Objects.requireNonNull(usuarioId, "ID do usuário não pode ser nulo");
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        if (usuario.getRole() != Usuario.Role.empresa && usuario.getRole() != Usuario.Role.cdl) {
            throw new UnauthorizedException("Apenas empresas ou CDLs podem criar recompensas");
        }

        recompensa.setUsuario(usuario);
        recompensa.setDataCadastro(LocalDateTime.now());

        if (recompensa.getImagemUrl() != null && recompensa.getImagemUrl().startsWith("data:image")) {
            try {
                String folder = "recompensas/" + usuarioId;
                String imageUrl = s3Service.uploadImagem(recompensa.getImagemUrl(), folder);
                recompensa.setImagemUrl(imageUrl);
            } catch (Exception e) {
                log.error("Erro ao fazer upload da imagem da recompensa: {}", e.getMessage());
            }
        }

        return recompensaRepository.save(recompensa);
    }

    public List<Recompensa> listarRecompensasPorUsuario(Integer usuarioId) {
        java.util.Objects.requireNonNull(usuarioId, "ID do usuário não pode ser nulo");
        return recompensaRepository.findByUsuarioUsuarioId(usuarioId);
    }

    public List<Recompensa> listarTodas() {
        return recompensaRepository.findAll();
    }

    public Recompensa buscarPorId(Integer id) {
        java.util.Objects.requireNonNull(id, "ID da recompensa não pode ser nulo");
        return recompensaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recompensa não encontrada"));
    }

    @Transactional
    public Recompensa atualizarRecompensa(Integer id, Recompensa dados, Integer usuarioLogadoId) {
        Recompensa recompensa = buscarPorId(id);

        if (!recompensa.getUsuario().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a editar esta recompensa");
        }

        if (dados.getNome() != null) recompensa.setNome(dados.getNome());
        if (dados.getDescricao() != null) recompensa.setDescricao(dados.getDescricao());
        if (dados.getPontos() != null) recompensa.setPontos(dados.getPontos());
        if (dados.getEstoque() != null) recompensa.setEstoque(dados.getEstoque());

        if (dados.getImagemUrl() != null && dados.getImagemUrl().startsWith("data:image")) {
            if (recompensa.getImagemUrl() != null) {
                s3Service.deletarArquivo(recompensa.getImagemUrl());
            }
            String folder = "recompensas/" + recompensa.getUsuario().getUsuarioId();
            String imageUrl = s3Service.uploadImagem(dados.getImagemUrl(), folder);
            recompensa.setImagemUrl(imageUrl);
        }

        recompensa.setDataUpdate(LocalDateTime.now());
        return recompensaRepository.save(recompensa);
    }

    @Transactional
    public void deletarRecompensa(Integer id, Integer usuarioLogadoId) {
        Recompensa recompensa = buscarPorId(id);

        if (!recompensa.getUsuario().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a deletar esta recompensa");
        }

        if (recompensa.getImagemUrl() != null) {
            s3Service.deletarArquivo(recompensa.getImagemUrl());
        }

        recompensaRepository.delete(recompensa);
    }
}
