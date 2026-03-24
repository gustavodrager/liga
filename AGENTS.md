# Contexto do projeto

Projeto já existente de plataforma web para registro de partidas de futevôlei.

## Stack e arquitetura
- Monólito modular em camadas: Api, Aplicacao, Dominio e Infraestrutura
- Backend: .NET 8, ASP.NET Core Web API e EF Core
- Frontend: React + Vite
- Banco: PostgreSQL
- Preservar nomes, mensagens e convenções já usadas no projeto, incluindo o padrão em português

## Regras de domínio essenciais
- Partidas são sempre 2x2
- Cada dupla possui exatamente 2 atletas
- Partida pode estar vinculada a uma categoria
- Partida de campeonato pode existir como jogo agendado antes do resultado
- Categoria pertence a uma competição
- Competição pode ou não estar vinculada a uma liga
- Competição pode estar vinculada a um local cadastrado
- Campeonato pode ter categorias próprias e cada categoria de campeonato pode vincular um formato de campeonato
- Não existe empate no futevôlei

## Convenções já adotadas no produto
- Atleta deve ser tratado por nome completo; o apelido é derivado do primeiro e último nome do registro final
- Na inscrição de campeonato, a dupla pode vir de um cadastro existente ou ser criada no fluxo da inscrição a partir dos dois atletas
- Se um atleta com o mesmo nome completo já existir, reutilizar o cadastro quando for a mesma pessoa; se for outra pessoa, diferenciar com apelido/complemento
- Dupla e inscrição de campeonato devem tratar a ordem dos dois atletas de forma normalizada; não assumir que a ordem digitada será a ordem persistida
- Competição com liga vinculada conta automaticamente no ranking da liga
- Ranking da liga soma os pontos de todas as competições da liga; ranking da competição continua separado por categoria
- Modelos de importação CSV existentes devem refletir os campos reais da API e reaproveitar os serviços já existentes no backend

## Regras configuráveis por competição
- Não introduzir hardcode novo de regra fixa de jogo ou pontuação
- Sempre usar a regra da competição quando ela existir
- Sem configuração, usar um único ponto de fallback; não espalhar defaults pela API, frontend e persistência
- Fallback padrão da partida: mínimo 18 pontos, diferença mínima de 2, sem empate
- Fallback padrão de pontuação: vitória 3 pontos, derrota 0 pontos
- Regras reutilizáveis de competição já incluem pontos por participação e pontuação de 1º, 2º e 3º lugar

## Estruturas já existentes
- Competições possuem regras reutilizáveis, local e categorias; campeonatos também trabalham com inscrições
- Categorias de campeonato podem vincular um formato de campeonato reutilizável e gerar tabela inicial de jogos a partir dele
- Há página e endpoint para ranking, regras, formatos de campeonato e modelos de importação
- Importação em lote deve passar pelos serviços de aplicação; não criar bypass direto de regra de negócio
- Já existe caso real de importação de campeonato com atletas, duplas, inscrições e partidas; ao evoluir isso, preferir reaproveitar esse fluxo em vez de criar outro importador paralelo

## Diretrizes de implementação
- Não criar projeto novo
- Sempre analisar o código e o fluxo existente antes de implementar
- Respeitar arquitetura, convenções e padrões atuais
- Reutilizar estruturas existentes antes de criar novas abstrações
- Não criar solução paralela, padrão novo ou biblioteca nova sem ganho claro
- Evitar duplicação e abstrações prematuras
- Não quebrar funcionalidades existentes
- Priorizar simplicidade, clareza, consistência de domínio e manutenção

## Forma de trabalho
Antes de implementar:
1. analisar o cenário atual
2. identificar arquivos e camadas impactados
3. explicar brevemente a abordagem
4. só então editar

Ao mexer em entidades ou relacionamentos, revisar também DTOs, serviços, mapeamentos, migrações e telas afetadas.

Ao mexer em fluxo de campeonato, revisar em conjunto:
- competições
- categorias
- inscrições
- partidas
- geração da tabela de jogos
- ranking
- importação
