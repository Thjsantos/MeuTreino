# Meu Treino

App para montar treinos de academia, executá-los e registrar no calendário. Usuários fixos: Thiago e Carla, cada um com seus próprios treinos, execuções e calendário.

## Como rodar

Requer Node.js 22.5+ (usa o SQLite embutido, sem instalar dependências).

```
node server.js
```

Abra http://localhost:3000 (no Windows, dê dois cliques em `iniciar.bat`).

## API

A documentação interativa (Swagger UI) fica em `/docs`, gerada a partir de [`openapi.yaml`](openapi.yaml). Rotas por recurso: treinos, registros do calendário e treino em andamento, por usuário.

```
npm test   # testes da API (usa um banco temporário)
```

Código do servidor em `src/`: `routes.js` (rotas), `validate.js` (validação), `repo.js` (SQL) e `http.js` (servidor, senha e estáticos).

## Dados

Ficam em um banco SQLite **fora do projeto**: `~/MeuTreinoDados/treino.db`
(mude com a variável `MEUTREINO_DB`; a porta com `PORT`).

## Base de exercícios

`exercises.js` vem de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público); as imagens são carregadas de lá. `exercises_pt.js` contém os nomes e instruções traduzidos automaticamente para português.
