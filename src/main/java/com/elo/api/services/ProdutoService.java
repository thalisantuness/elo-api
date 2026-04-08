package com.elo.api.services;

import com.elo.api.dtos.ProdutoDTO;
import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.exceptions.UnauthorizedException;
import com.elo.api.models.FotoProduto;
import com.elo.api.models.Produto;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.ProdutoRepository;
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
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final UsuarioRepository usuarioRepository;
    private final S3Service s3Service;

    @Transactional
    public Produto criarProduto(ProdutoDTO dto, Integer usuarioLogadoId, String role) {
        Integer nonNullEmpresaId = java.util.Objects.requireNonNull(dto.getEmpresaId(), "Empresa ID não pode ser nulo");
        Usuario empresa = usuarioRepository.findById(nonNullEmpresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        // Verificar permissão
        if (role.equals("empresa") && !empresa.getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado");
        }

        if (role.equals("cdl") && !empresa.getCdlId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("CDL só pode criar produtos para suas lojas");
        }

        Produto produto = new Produto();
        produto.setEmpresa(empresa);
        produto.setNome(dto.getNome());
        produto.setValor(dto.getValor());
        produto.setValorCusto(dto.getValorCusto());
        produto.setQuantidade(dto.getQuantidade());
        produto.setTipoComercializacao(dto.getTipoComercializacao());
        produto.setTipoProduto(dto.getTipoProduto());

        if (dto.getEmpresasAutorizadas() != null) {
            produto.setEmpresasAutorizadas(dto.getEmpresasAutorizadas());
        }

        // Upload da foto principal
        if (dto.getImagemBase64() != null && dto.getImagemBase64().startsWith("data:image")) {
            try {
                String fotoUrl = s3Service.uploadImagem(dto.getImagemBase64(), "produtos/principal");
                produto.setFotoPrincipal(fotoUrl);
            } catch (Exception e) {
                log.error("Erro ao fazer upload da foto principal: {}", e.getMessage());
            }
        }

        Produto saved = produtoRepository.save(produto);

        // Upload das fotos secundárias
        if (dto.getFotosSecundarias() != null) {
            for (String fotoBase64 : dto.getFotosSecundarias()) {
                if (fotoBase64 != null && fotoBase64.startsWith("data:image")) {
                    adicionarFoto(saved.getProdutoId(), fotoBase64, usuarioLogadoId, role);
                }
            }
        }

        return saved;
    }

    public List<Produto> listarProdutos(Usuario usuarioLogado) {
        switch (usuarioLogado.getRole()) {
            case admin:
                return produtoRepository.findAll();
            case cdl:
                return produtoRepository.findByCdlId(usuarioLogado.getUsuarioId());
            case empresa:
                return produtoRepository.findByEmpresaUsuarioId(usuarioLogado.getUsuarioId());
            case cliente:
                if (usuarioLogado.getCdlId() != null) {
                    return produtoRepository.findByCdlId(usuarioLogado.getCdlId());
                }
                return List.of();
            default:
                return List.of();
        }
    }

    public Produto buscarPorId(Integer id) {
        java.util.Objects.requireNonNull(id, "ID do produto não pode ser nulo");
        return produtoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado"));
    }

    @Transactional
    public Produto atualizarProduto(Integer id, ProdutoDTO dto, Integer usuarioLogadoId, String role) {
        Produto produto = buscarPorId(id);

        // Verificar permissão
        if (!role.equals("admin") && !produto.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            if (role.equals("cdl") && !produto.getEmpresa().getCdlId().equals(usuarioLogadoId)) {
                throw new UnauthorizedException("Não autorizado");
            } else if (!role.equals("cdl")) {
                throw new UnauthorizedException("Não autorizado");
            }
        }

        if (dto.getNome() != null) produto.setNome(dto.getNome());
        if (dto.getValor() != null) produto.setValor(dto.getValor());
        if (dto.getValorCusto() != null) produto.setValorCusto(dto.getValorCusto());
        if (dto.getQuantidade() != null) produto.setQuantidade(dto.getQuantidade());
        if (dto.getTipoComercializacao() != null) produto.setTipoComercializacao(dto.getTipoComercializacao());
        if (dto.getTipoProduto() != null) produto.setTipoProduto(dto.getTipoProduto());

        // Atualizar foto principal
        if (dto.getImagemBase64() != null && dto.getImagemBase64().startsWith("data:image")) {
            if (produto.getFotoPrincipal() != null) {
                s3Service.deletarArquivo(produto.getFotoPrincipal());
            }
            String fotoUrl = s3Service.uploadImagem(dto.getImagemBase64(), "produtos/principal");
            produto.setFotoPrincipal(fotoUrl);
        }

        produto.setDataUpdate(LocalDateTime.now());

        return produtoRepository.save(produto);
    }

    @Transactional
    public void deletarProduto(Integer id, Integer usuarioLogadoId, String role) {
        Produto produto = buscarPorId(id);

        if (!role.equals("admin") && !produto.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado");
        }

        // Deletar fotos do S3
        if (produto.getFotoPrincipal() != null) {
            s3Service.deletarArquivo(produto.getFotoPrincipal());
        }

        for (FotoProduto foto : produto.getFotos()) {
            if (foto.getImageData() != null) {
                s3Service.deletarArquivo(foto.getImageData());
            }
        }

        produtoRepository.delete(produto);
    }

    @Transactional
    public FotoProduto adicionarFoto(Integer produtoId, String imagemBase64, Integer usuarioLogadoId, String role) {
        Produto produto = buscarPorId(produtoId);

        if (!role.equals("admin") && !produto.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado");
        }

        String fotoUrl = s3Service.uploadImagem(imagemBase64, "produtos/secundarias");

        FotoProduto foto = new FotoProduto();
        foto.setProduto(produto);
        foto.setImageData(fotoUrl);

        produto.getFotos().add(foto);
        produtoRepository.save(produto);

        return foto;
    }

    @Transactional
    public void deletarFoto(Integer produtoId, Integer fotoId, Integer usuarioLogadoId, String role) {
        Produto produto = buscarPorId(produtoId);

        if (!role.equals("admin") && !produto.getEmpresa().getUsuarioId().equals(usuarioLogadoId)) {
            throw new UnauthorizedException("Não autorizado");
        }

        FotoProduto foto = produto.getFotos().stream()
                .filter(f -> f.getPhotoId().equals(fotoId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Foto não encontrada"));

        if (foto.getImageData() != null) {
            s3Service.deletarArquivo(foto.getImageData());
        }

        produto.getFotos().remove(foto);
        produtoRepository.save(produto);
    }
}
