# AGENTS.md

## Contexto do projeto
Plataforma web para registro de partidas de futevôlei.

## Stack
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core
- Frontend: React + Vite
- Banco: PostgreSQL
- Arquitetura: monólito modular em camadas

## Regras obrigatórias
- Não criar projeto novo
- Sempre analisar o código existente antes de implementar
- Respeitar arquitetura e padrões atuais
- Não criar soluções paralelas desnecessárias
- Evitar overengineering
- Priorizar simplicidade, clareza e manutenção

## Regras de domínio
- Partidas são 2x2
- Cada dupla possui exatamente 2 atletas
- Partida pode estar vinculada a uma categoria
- Categoria pertence a uma competição
- Competição pode ou não estar vinculada a uma liga

## Regras configuráveis por competição
- Nunca hardcodar regra de jogo ou pontuação
- Sempre usar a regra da competição quando existir
- Quando não existir, usar fallback padrão
- Regra padrão da partida: mínimo 18 pontos, diferença mínima de 2, sem empate
- Regra padrão de pontuação: vitória 3 pontos, derrota 0 pontos

## Como trabalhar
Antes de implementar:
1. analisar o cenário atual
2. identificar arquivos afetados
3. explicar brevemente a abordagem
4. só então implementar

## Estilo de implementação
- Código limpo e direto
- Reutilizar estruturas existentes
- Evitar duplicação de lógica
- Evitar abstrações prematuras
- Pensar como produto real em evolução