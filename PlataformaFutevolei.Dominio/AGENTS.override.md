# Regras específicas do domínio

- Manter entidades sem dependência de infraestrutura, HTTP ou detalhes da API
- Preservar invariantes do domínio e a consistência das relações do projeto
- Evitar setters e mutações públicas desnecessárias, sem quebrar as necessidades atuais do EF Core
- Ao alterar regra de entidade ou relacionamento, alinhar aplicação, mapeamentos e constraints do banco
- Não criar abstrações de domínio genéricas sem ganho real
- Preservar as invariantes já adotadas: partida sem empate, dupla com exatamente dois atletas e categoria ligada a competição
- Quando a regra estiver hoje centralizada na aplicação, não forçar migração prematura para entidades sem ganho claro
