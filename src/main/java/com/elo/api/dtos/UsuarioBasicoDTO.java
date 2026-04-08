package com.elo.api.dtos;

public record UsuarioBasicoDTO(
        Integer usuarioId,
        String nomeCompleto,
        String email,
        String imagemPerfil,
        String role
) {}
