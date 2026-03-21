# Contexto do projeto

Este é um projeto já existente de plataforma web para registro de partidas de futevôlei.

## Stack principal
- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core
- Frontend: React + Vite
- Banco de dados: PostgreSQL
- Arquitetura: monólito modular com camadas

## Diretrizes obrigatórias
- Não criar projeto novo
- Sempre analisar o código existente antes de implementar
- Respeitar arquitetura, convenções e padrões atuais
- Não quebrar funcionalidades existentes
- Não criar soluções paralelas desnecessárias
- Evitar overengineering
- Priorizar simplicidade, clareza e manutenção
- Reutilizar estruturas existentes sempre que possível

## Regras de domínio
- partidas são sempre 2x2
- cada dupla possui exatamente 2 atletas
- partida pode estar vinculada a uma categoria
- categoria pertence a uma competição
- competição pode ou não estar vinculada a uma liga

## Regras configuráveis por competição
- nunca hardcodar regras fixas de jogo ou pontuação
- sempre usar a regra configurada da competição quando existir
- quando não existir, usar fallback padrão
- regra padrão da partida: mínimo 18 pontos, diferença mínima de 2, sem empate
- regra padrão de pontuação: vitória 3 pontos, derrota 0 pontos

## Forma de trabalho
Antes de implementar:
1. analisar o cenário atual
2. identificar arquivos impactados
3. explicar brevemente a abordagem
4. só então implementar

## Prioridades
- simplicidade
- clareza
- consistência com o domínio
- manutenção
- evolução futura sem complicar o presente
