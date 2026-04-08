package com.elo.api.repositories;

import com.elo.api.models.Regra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegraRepository extends JpaRepository<Regra, Integer> {
    List<Regra> findByAtivaTrue();
}
