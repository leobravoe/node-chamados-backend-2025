# AtendeAí — Fila de Ajuda em Sala

## 1) Problema
<!-- Escreva o problema sem falar de telas/tecnologias.
     Responda: Quem sofre? Onde? O que atrapalha? Por que isso importa?
     EXEMPLO: Em aulas práticas, alunos esperam muito para serem atendidos.
     Há filas confusas e frustração. O professor não vê ordem nem tempo de espera.
     Objetivo inicial: organizar a fila para reduzir a espera e garantir justiça. -->
- Em aulas práticas, alunos esperam muito para serem atendidos.
- Há filas confusas e frustração. O professor não vê ordem nem tempo de espera.
- Objetivo inicial: organizar a fila para reduzir a espera e garantir justiça

## 2) Atores e Decisores (quem usa / quem decide)
<!-- Liste papéis (não nomes).
     EXEMPLO:
     Usuários principais: Alunos da turma de Desenvolvimento Web
     Decisores/Apoiadores: Professores da disciplina; Coordenação do curso -->
- Atores: Alunos e Professores
- Decisores/Apoiadores: Professores; Coordenação do curso

## 3) Casos de uso (de forma simples)
<!-- Formato "Ator: ações que pode fazer".
     DICA: Use "Manter (inserir, mostrar, editar, remover)" quando for CRUD.
     EXEMPLO:
     Todos: Logar/deslogar do sistema; Manter dados cadastrais
     Professor: Manter (inserir, mostrar, editar, remover) todos os chamados
     Aluno: Manter (inserir, mostrar, editar, remover) seus chamados -->
- Todos: Logar/deslogar do sistema; Manter dados cadastrais
- Professor: Manter (inserir, mostrar, editar, remover) todos os chamados
- Aluno: Manter (inserir, mostrar, editar, remover) seus chamados

## 4) Limites e suposições
<!-- Simples assim:
     - Limites = regras/prazos/obrigações que você não controla.
     - Suposições = coisas que você espera ter e podem falhar.
     - Plano B = como você segue com a 1ª fatia se algo falhar.
     EXEMPLO:
     Limites: entrega final até o fim da disciplina (ex.: 2025-11-30); rodar no navegador; sem serviços pagos.
     Suposições: internet no laboratório; navegador atualizado; acesso ao GitHub; 10 min para teste rápido.
     Plano B: sem internet → rodar local e salvar em arquivo/LocalStorage; sem tempo do professor → testar com 3 colegas. -->
Limites: [prazo final], [regras/tecnologias obrigatórias], [restrições]  
Suposições: [internet/navegador/GitHub/tempo de teste]  
Plano B: [como continua entregando a 1ª fatia se algo falhar]

## 5) Hipóteses + validação
<!-- Preencha as duas frases abaixo. Simples e direto.
     EXEMPLO Valor: Se o aluno ver sua posição na fila, sente mais controle e conclui melhor a atividade.
     Validação: teste com 5 alunos; sucesso se ≥4 abrem/fecham chamado sem ajuda.
     EXEMPLO Viabilidade: Com app no navegador (HTML/CSS/JS + armazenamento local),
     criar e listar chamados responde em até 1 segundo na maioria das vezes (ex.: 9 de cada 10).
     Validação: medir no protótipo com 30 ações; meta: pelo menos 27 de 30 ações (9/10) em 1s ou menos. -->
H-Valor: Se [X], então [Y] melhora em [critério].  
Validação (valor): [teste rápido/observação]; alvo: [meta simples].

H-Viabilidade: Com [tecnologia], [ação/tela] leva até [n] s.  
Validação (viabilidade): [medição no protótipo]; meta: [n] s ou menos na maioria das vezes (ex.: 9/10).

## 6) Fluxo principal e primeira fatia
<!-- Pense “Entrada → Processo → Saída”.
     EXEMPLO de Fluxo:
     1) Aluno faz login
     2) Clica em "Pedir ajuda" e descreve a dúvida
     3) Sistema salva e coloca na fila
     4) Lista mostra ordem e tempo desde criação
     5) Professor encerra o chamado
     EXEMPLO de 1ª fatia:
     Inclui login simples, criar chamado, listar em ordem.
     Critérios de aceite (objetivos): criar → aparece na lista com horário; encerrar → some ou marca "fechado". -->
**Fluxo principal (curto):**  
1) [entrada do usuário] → 2) [processo] → 3) [salvar algo] → 4) [mostrar resultado]

**Primeira fatia vertical (escopo mínimo):**  
Inclui: [uma tela], [uma ação principal], [salvar], [mostrar algo]  
Critérios de aceite:
- [Condição 1 bem objetiva]
- [Condição 2 bem objetiva]

## 7) Esboços de algumas telas (wireframes)
<!-- Vale desenho no papel (foto), Figma, Excalidraw, etc. Não precisa ser bonito, precisa ser claro.
     EXEMPLO de telas:
     • Login
     • Lista de chamados (ordem + tempo desde criação)
     • Novo chamado (formulário simples)
     • Painel do professor (atender/encerrar)
     EXEMPLO de imagem:
     ![Wireframe - Lista de chamados](img/wf-lista-chamados.png) -->
[Links ou imagens dos seus rascunhos de telas aqui]

## 8) Tecnologias
<!-- Liste apenas o que você REALMENTE pretende usar agora. -->

### 8.1 Navegador
**Navegador:** [HTML/CSS/JS | React/Vue/Bootstrap/etc., se houver]  
**Armazenamento local (se usar):** [LocalStorage/IndexedDB/—]  
**Hospedagem:** [GitHub Pages/—]

### 8.2 Front-end (servidor de aplicação, se existir)
**Front-end (servidor):** [ex.: Next.js/React/—]  
**Hospedagem:** [ex.: Vercel/—]

### 8.3 Back-end (API/servidor, se existir)
**Back-end (API):** [ex.: FastAPI/Express/PHP/Laravel/Spring/—]  
**Banco de dados:** [ex.: SQLite/Postgres/MySQL/MongoDB/—]  
**Deploy do back-end:** [ex.: Render/Railway/—]

## 9) Plano de Dados (Dia 0) — somente itens 1–3
<!-- Defina só o essencial para criar o banco depois. -->

### 9.1 Entidades
<!-- EXEMPLO:
     - Usuario — pessoa que usa o sistema (aluno/professor)
     - Chamado — pedido de ajuda criado por um usuário -->
- [Entidade 1] — [o que representa em 1 linha]
- [Entidade 2] — [...]
- [Entidade 3] — [...]

### 9.2 Campos por entidade
<!-- Use tipos simples: uuid, texto, número, data/hora, booleano, char. -->

### Usuario
| Campo           | Tipo                          | Obrigatório | Exemplo            |
|-----------------|-------------------------------|-------------|--------------------|
| id              | número                        | sim         | 1                  |
| nome            | texto                         | sim         | "Ana Souza"        |
| email           | texto                         | sim (único) | "ana@exemplo.com"  |
| senha_hash      | texto                         | sim         | "$2a$10$..."       |
| papel           | número (0=aluno, 1=professor) | sim         | 0                  |
| dataCriacao     | data/hora                     | sim         | 2025-08-20 14:30   |
| dataAtualizacao | data/hora                     | sim         | 2025-08-20 15:10   |

### Chamado
| Campo           | Tipo               | Obrigatório | Exemplo                 |
|-----------------|--------------------|-------------|-------------------------|
| id              | número             | sim         | 2                       |
| Usuario_id      | número (fk)        | sim         | 8f3a-...                |
| texto           | texto              | sim         | "Erro ao compilar"      |
| estado          | char               | sim         | 'a' \| 'f'              |
| dataCriacao     | data/hora          | sim         | 2025-08-20 14:35        |
| dataAtualizacao | data/hora          | sim         | 2025-08-20 14:50        |

### 9.3 Relações entre entidades
<!-- Frases simples bastam. EXEMPLO:
     Um Usuario tem muitos Chamados (1→N).
     Um Chamado pertence a um Usuario (N→1). -->
- Um [A] tem muitos [B]. (1→N)
- Um [B] pertence a um [A]. (N→1)
