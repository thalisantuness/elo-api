package com.elo.api.repositories;

import com.elo.api.models.PasswordReset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordReset, Integer> {

    Optional<PasswordReset> findByTokenAndUsedFalseAndExpiresAtGreaterThan(
            String token, LocalDateTime now);

    @Modifying
    @Transactional
    @Query("UPDATE PasswordReset p SET p.used = true WHERE p.email = :email")
    int invalidateByEmail(@Param("email") String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);
}
