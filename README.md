# Meu Treino

App para montar treinos de academia, executá-los e registrar no calendário. Cada usuário tem seus próprios treinos, execuções e calendário. Os usuários são fixos (sem cadastro) e definidos pela variável `USERS`; por padrão, Thiago e Carla.

## Como rodar

Requer Node.js 22.5+ (usa o SQLite embutido, sem instalar dependências).

```
node server.js
```

Abra http://localhost:3000 (no Windows, dê dois cliques em `iniciar.bat`).

## Usuários

Defina a variável de ambiente `USERS` com os nomes separados por vírgula:

```
USERS="Ana,Bruno" node server.js        # Linux/macOS
$env:USERS="Ana,Bruno"; node server.js  # PowerShell
```

No Render, crie `USERS` em *Environment*. Sem a variável, os usuários são `Thiago,Carla`. Nomes novos são criados no banco ao iniciar; **tirar um nome da lista não apaga o usuário nem os dados dele**. Duplicados (sem diferenciar maiúsculas) são ignorados e cada nome pode ter até 50 caracteres.

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

`exercises.js` vem de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público); as imagens são carregadas de lá. `exercises_pt.js` (nomes e instruções em português) vem de [exercicios-bd-ptbr](https://github.com/joao-gugel/exercicios-bd-ptbr) (CC0) e é gerado por `node scripts/gerar-exercicios-pt.js`, fixado num commit específico da tradução.
