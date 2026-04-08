package com.elo.api.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.elo.api.models.Usuario;
import lombok.Data;

@Data
public class UsuarioDTO {

        private Integer usuarioId;

        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        private String email;

        @NotBlank(message = "Senha é obrigatória")
        private String senha;

        @NotBlank(message = "Nome é obrigatório")
        private String nome;

        private String telefone;

        @NotNull(message = "Role é obrigatório")
        private Usuario.Role role;

        private String fotoPerfil;
        private String clienteEndereco;
        private String cidade;
        private String estado;
        private String cnpj;
        private Integer cdlId;
}
