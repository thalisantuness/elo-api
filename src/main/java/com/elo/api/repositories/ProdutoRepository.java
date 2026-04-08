package com.elo.api.repositories;

import com.elo.api.models.Produto;
import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Integer> {

    List<Produto> findByEmpresa(Usuario empresa);

    List<Produto> findByEmpresaUsuarioId(Integer empresaId);

    @Query("SELECT p FROM Produto p WHERE p.empresa.usuarioId IN :empresaIds")
    List<Produto> findByEmpresaIds(@Param("empresaIds") List<Integer> empresaIds);

    @Query("SELECT p FROM Produto p WHERE p.empresa.cdlId = :cdlId")
    List<Produto> findByCdlId(@Param("cdlId") Integer cdlId);
}
