package com.elo.api.services;

import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.exceptions.UnauthorizedException;
import com.elo.api.models.Recompensa;
import com.elo.api.models.SolicitacaoRecompensa;
import com.elo.api.models.Usuario;
import com.elo.api.repositories.RecompensaRepository;
import com.elo.api.repositories.SolicitacaoRecompensaRepository;
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
public class SolicitacaoRecompensaService {

    private final SolicitacaoRecompensaRepository solicitacaoRecompensaRepository;
    private final RecompensaRepository recompensaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public SolicitacaoRecompensa solicitar(Integer recomId, Integer clienteId) {
        Integer nonNullRecomId = java.util.Objects.requireNonNull(recomId, "recomId não pode ser nulo");
        Integer nonNullClienteId = java.util.Objects.requireNonNull(clienteId, "clienteId não pode ser nulo");
        
        Recompensa recompensa = recompensaRepository.findById(nonNullRecomId)
                .orElseThrow(() -> new ResourceNotFoundException("Recompensa não encontrada"));

        Usuario cliente = usuarioRepository.findById(nonNullClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));

        if (cliente.getPontos() < recompensa.getPontos()) {
            throw new RuntimeException("Pontos insuficientes para esta recompensa");
        }

        if (recompensa.getEstoque() <= 0) {
            throw new RuntimeException("Recompensa sem estoque disponível");
        }

        // Deduzir pontos e estoque preventivamente
        cliente.setPontos(cliente.getPontos() - recompensa.getPontos());
        recompensa.setEstoque(recompensa.getEstoque() - 1);

        usuarioRepository.save(cliente);
        recompensaRepository.save(recompensa);

        SolicitacaoRecompensa solicitacao = new SolicitacaoRecompensa();
        solicitacao.setUsuario(cliente);
        solicitacao.setRecompensa(recompensa);
        solicitacao.setStatus(SolicitacaoRecompensa.StatusSolicitacao.pendente);
        solicitacao.setDataSolicitacao(LocalDateTime.now());

        SolicitacaoRecompensa salva = solicitacaoRecompensaRepository.save(solicitacao);

        // Notificar empresa
        if (recompensa.getUsuario().getTelefone() != null) { 
             // pushNotificationService.enviarNotificacao(...)
        }

        return salva;
    }

    public SolicitacaoRecompensa buscarPorId(Integer id) {
        Objects.requireNonNull(id, "ID da solicitação não pode ser nulo");
        return solicitacaoRecompensaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada"));
    }

    public List<SolicitacaoRecompensa> listarPorCliente(Integer clienteId) {
        Integer nonNullClienteId = Objects.requireNonNull(clienteId, "clienteId não pode ser nulo");
        Usuario cliente = usuarioRepository.findById(nonNullClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
        return solicitacaoRecompensaRepository.findByUsuario(cliente);
    }

    public List<SolicitacaoRecompensa> listarPorEmpresa(Integer empresaId) {
        Integer nonNullEmpresaId = Objects.requireNonNull(empresaId, "ID da empresa não pode ser nulo");
        return solicitacaoRecompensaRepository.findByRecompensaUsuarioUsuarioId(nonNullEmpresaId);
    }

    @Transactional
    public SolicitacaoRecompensa responder(Integer solicitacaoId, SolicitacaoRecompensa.StatusSolicitacao status, Integer empresaId) {
        Integer nonNullSolicitacaoId = Objects.requireNonNull(solicitacaoId, "solicitacaoId não pode ser nulo");
        Integer nonNullEmpresaId = Objects.requireNonNull(empresaId, "empresaId não pode ser nulo");
        
        SolicitacaoRecompensa solicitacao = solicitacaoRecompensaRepository.findById(nonNullSolicitacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada"));

        if (!solicitacao.getRecompensa().getUsuario().getUsuarioId().equals(nonNullEmpresaId)) {
            throw new UnauthorizedException("Não autorizado a responder esta solicitação");
        }

        if (solicitacao.getStatus() != SolicitacaoRecompensa.StatusSolicitacao.pendente) {
            throw new RuntimeException("Solicitação já processada");
        }

        solicitacao.setStatus(status);
        solicitacao.setDataResposta(LocalDateTime.now());

        if (status == SolicitacaoRecompensa.StatusSolicitacao.rejeitada) {
            // Estornar pontos e estoque
            Usuario cliente = solicitacao.getUsuario();
            Recompensa recompensa = solicitacao.getRecompensa();
            
            cliente.setPontos(cliente.getPontos() + recompensa.getPontos());
            recompensa.setEstoque(recompensa.getEstoque() + 1);
            
            usuarioRepository.save(cliente);
            recompensaRepository.save(recompensa);
        }

        return solicitacaoRecompensaRepository.save(solicitacao);
    }
}
