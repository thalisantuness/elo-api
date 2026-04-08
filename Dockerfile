# 🏗️ ESTÁGIO 1: BUILD
FROM maven:3.8.4-openjdk-17-slim AS build

WORKDIR /app

# Copia arquivos do projeto
COPY pom.xml .
COPY src ./src

# Build da aplicação sem rodar testes para agilizar o build inicial
RUN mvn clean package -DskipTests

# 🚀 ESTÁGIO 2: RUNTIME
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copia o JAR do estágio de build
COPY --from=build /app/target/elo-api-*.jar app.jar

# Define as variáveis de ambiente com valores padrão
ENV PORT=8000

# Expõe a porta
EXPOSE ${PORT}

# Comando para rodar a aplicação
ENTRYPOINT ["java", "-jar", "app.jar"]
