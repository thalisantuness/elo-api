package com.elo.api.repositories;

import com.elo.api.models.Campanha;
import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CampanhaRepository extends JpaRepository<Campanha, Integer> {

    List<Campanha> findByEmpresa(Usuario empresa);

    @Query("SELECT c FROM Campanha c WHERE c.ativa = true AND c.dataInicio <= :now AND c.dataFim >= :now")
    List<Campanha> findAtivas(@Param("now") LocalDateTime now);

    @Query("SELECT c FROM Campanha c WHERE c.empresa.cdlId = :cdlId AND c.ativa = true AND c.dataInicio <= :now AND c.dataFim >= :now")
    List<Campanha> findAtivasPorCdl(@Param("cdlId") Integer cdlId, @Param("now") LocalDateTime now);
}
