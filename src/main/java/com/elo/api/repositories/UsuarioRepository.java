package com.elo.api.repositories;

import com.elo.api.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Usuario> findByRole(Usuario.Role role);

    List<Usuario> findByRoleAndStatus(Usuario.Role role, Usuario.StatusUsuario status);

    List<Usuario> findByCdlIdAndRole(Integer cdlId, Usuario.Role role);

    List<Usuario> findByCdlId(Integer cdlId);

    @Query("SELECT u FROM Usuario u WHERE u.role = 'empresa' AND u.status = 'ativo' AND u.cdlId = :cdlId")
    List<Usuario> findEmpresasAtivasByCdlId(@Param("cdlId") Integer cdlId);

    @Query("SELECT u FROM Usuario u WHERE u.role = 'cliente' AND u.cdlId = :cdlId")
    List<Usuario> findClientesByCdlId(@Param("cdlId") Integer cdlId);

    @Query("SELECT u FROM Usuario u WHERE u.role = 'empresa' AND u.status = 'ativo'")
    List<Usuario> findAllEmpresasAtivas();

    @Query("SELECT u FROM Usuario u WHERE u.role = 'cdl' AND u.status = 'ativo'")
    List<Usuario> findAllCdlsAtivas();

    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.status = :status WHERE u.usuarioId = :usuarioId")
    int updateStatus(@Param("usuarioId") Integer usuarioId, @Param("status") Usuario.StatusUsuario status);
}
