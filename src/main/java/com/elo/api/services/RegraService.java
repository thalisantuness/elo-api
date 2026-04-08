package com.elo.api.services;

import com.elo.api.exceptions.ResourceNotFoundException;
import com.elo.api.models.Regra;
import com.elo.api.repositories.RegraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RegraService {

    private final RegraRepository regraRepository;

    public List<Regra> listarAtivas() {
        return regraRepository.findByAtivaTrue();
    }

    public Regra buscarPorId(Integer id) {
        if (id == null) throw new IllegalArgumentException("ID da regra não pode ser nulo");
        return regraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra não encontrada"));
    }

    public Regra salvar(Regra regra) {
        java.util.Objects.requireNonNull(regra, "A regra não pode ser nula");
        return regraRepository.save(regra);
    }
}
