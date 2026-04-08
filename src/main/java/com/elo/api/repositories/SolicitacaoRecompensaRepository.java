package com.elo.api.repositories;

import com.elo.api.models.SolicitacaoRecompensa;
import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SolicitacaoRecompensaRepository extends JpaRepository<SolicitacaoRecompensa, Integer> {
    List<SolicitacaoRecompensa> findByUsuario(Usuario usuario);
    List<SolicitacaoRecompensa> findByRecompensaUsuario(Usuario empresa);
    List<SolicitacaoRecompensa> findByRecompensaUsuarioUsuarioId(Integer empresaId);
}
