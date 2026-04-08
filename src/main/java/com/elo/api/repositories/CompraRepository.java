package com.elo.api.repositories;

import com.elo.api.models.Compra;
import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CompraRepository extends JpaRepository<Compra, Integer> {

    List<Compra> findByEmpresa(Usuario empresa);

    List<Compra> findByCliente(Usuario cliente);

    Optional<Compra> findByQrCodeId(String qrCodeId);

    List<Compra> findByEmpresaUsuarioId(Integer empresaId);

    List<Compra> findByClienteUsuarioId(Integer clienteId);

    @Query("SELECT COUNT(c) FROM Compra c WHERE c.empresa.usuarioId = :empresaId AND c.status = 'validada'")
    long countComprasValidadasByEmpresa(@Param("empresaId") Integer empresaId);

    @Query("SELECT COALESCE(SUM(c.valor), 0.0) FROM Compra c WHERE c.empresa.usuarioId = :empresaId AND c.status = 'validada'")
    Double sumValorValidadasByEmpresa(@Param("empresaId") Integer empresaId);

    @Query("SELECT COALESCE(SUM(c.pontosAdquiridos), 0) FROM Compra c WHERE c.empresa.usuarioId = :empresaId AND c.status = 'validada'")
    Long sumPontosValidadasByEmpresa(@Param("empresaId") Integer empresaId);
}
