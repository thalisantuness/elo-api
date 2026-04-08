package com.elo.api.services;

import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.exceptions.UnauthorizedException;
import com.elo.api.models.Campanha;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.CampanhaRepository;
import com.elo.api.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampanhaService {

    private final CampanhaRepository campanhaRepository;
    private final UsuarioRepository usuarioRepository;
    private final S3Service s3Service;

    @Transactional
    public Campanha criarCampanha(Campanha campanha, Integer empresaId) {
        Objects.requireNonNull(empresaId, "ID da empresa não pode ser nulo");
        Usuario empresa = usuarioRepository.findById(empresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        if (empresa.getRole() != Usuario.Role.empresa) {
            throw new UnauthorizedException("Apenas empresas podem criar campanhas");
        }

        campanha.setEmpresa(empresa);
        campanha.setDataCadastro(LocalDateTime.now());

        // Processar imagem se for base64
        if (campanha.getImagemUrl() != null && campanha.getImagemUrl().startsWith("data:image")) {
            try {
                String folder = "campanhas/" + empresaId;
                String imageUrl = s3Service.uploadImagem(campanha.getImagemUrl(), folder);
                campanha.setImagemUrl(imageUrl);
            } catch (Exception e) {
                log.error("Erro ao fazer upload da imagem da campanha: {}", e.getMessage());
            }
        }

        return campanhaRepository.save(campanha);
    }

    public List<Campanha> listarCampanhasAtivas() {
        return campanhaRepository.findAtivas(LocalDateTime.now());
    }

    public List<Campanha> listarCampanhasAtivasPorCdl(Integer cdlId) {
        return campanhaRepository.findAtivasPorCdl(cdlId, LocalDateTime.now());
    }

    public List<Campanha> listarCampanhasPorEmpresa(Integer empresaId) {
        Objects.requireNonNull(empresaId, "ID da empresa não pode ser nulo");
        Usuario empresa = usuarioRepository.findById(empresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        return campanhaRepository.findByEmpresa(empresa);
    }

    public Campanha buscarPorId(Integer id) {
        if (id == null) throw new IllegalArgumentException("ID da campanha não pode ser nulo");
        return campanhaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campanha não encontrada"));
    }

    @Transactional
    public Campanha atualizarCampanha(Integer id, Campanha dados, Integer usuarioLogadoId) {
        Campanha campanha = buscarPorId(id);

        if (!campanha.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a editar esta campanha");
        }

        if (dados.getTitulo() != null) campanha.setTitulo(dados.getTitulo());
        if (dados.getDescricao() != null) campanha.setDescricao(dados.getDescricao());
        if (dados.getDataInicio() != null) campanha.setDataInicio(dados.getDataInicio());
        if (dados.getDataFim() != null) campanha.setDataFim(dados.getDataFim());
        if (dados.getAtiva() != null) campanha.setAtiva(dados.getAtiva());

        if (dados.getImagemUrl() != null && dados.getImagemUrl().startsWith("data:image")) {
            // Deletar anterior
            if (campanha.getImagemUrl() != null) {
                s3Service.deletarArquivo(campanha.getImagemUrl());
            }
            String folder = "campanhas/" + campanha.getEmpresa().getUsuarioId();
            String imageUrl = s3Service.uploadImagem(dados.getImagemUrl(), folder);
            campanha.setImagemUrl(imageUrl);
        }

        campanha.setDataUpdate(LocalDateTime.now());
        return campanhaRepository.save(campanha);
    }

    @Transactional
    public void deletarCampanha(Integer id, Integer usuarioLogadoId) {
        Campanha campanha = buscarPorId(id);

        if (!campanha.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado a deletar esta campanha");
        }

        if (campanha.getImagemUrl() != null) {
            s3Service.deletarArquivo(campanha.getImagemUrl());
        }

        campanhaRepository.delete(campanha);
    }
}
