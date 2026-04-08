package com.elo.api.repositories;

import com.elo.api.models.Recompensa;
import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RecompensaRepository extends JpaRepository<Recompensa, Integer> {
    List<Recompensa> findByUsuario(Usuario usuario);
    List<Recompensa> findByUsuarioUsuarioId(Integer usuarioId);
}
