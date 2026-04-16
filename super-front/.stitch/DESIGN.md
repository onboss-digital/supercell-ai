# Design System: The Intelligent Canvas

## 1. Concept & Persona: "The Digital Curator"
Este design system afasta-se de interfaces tradicionais amontoadas e adota a persona de uma inteligência "ouvinte" e orquestradora. O sistema prioriza a **clareza editorial** e a **assimetria intencional**, dando escalas tipográficas massivas para insights-chave e ocultando metadados secundários em rótulos refinados.

## 2. Core Principles: The "No-Line" Rule
**Mandato Estrito:** Proibido o uso de bordas sólidas de 1px para definir seções.
As fronteiras devem ser criadas através de:
- **Mudanças de Tonalidade:** Usar `surface` contra `surface-container-low`.
- **Espaço Negativo:** Uso generoso de padding (`2rem` ou `3rem`) para isolar grupos funcionais.

## 3. Surface Architecture (Nesting)
As superfícies são tratadas como camadas físicas:
1. **Base:** `surface` (#f8f9ff)
2. **Seções:** `surface-container-low` (#eff4ff)
3. **Cards Hero:** `surface-container-lowest` (#ffffff)
4. **Interação/Hover:** `surface-container-high` (#dee9fc)

## 4. Typography (Inter)
- **Display LG/MD:** Usado para métricas ("ROAS", "Gasto"). SemiBold com `-0.02em` de espaçamento.
- **Headline:** Títulos de página robustos e autoritários.
- **Body:** `on_surface_variant` (#434656) para leitura longa e menos fadiga ocular.
- **Label:** Uppercase com `+0.05em` para metadados secundários.

## 5. Effects: Glassmorphism & Gradients
- **Floating Tiles:** Use `backdrop-filter: blur(20px)` com fundo branco a 80% opacidade.
- **Assinatura de Energia:** Botões primários devem usar gradiente linear de `primary` (#0049db) a `primary_container` (#2962ff) em ângulo de 135°.
- **Pulse Status:** IA ativa é representada por um ponto pulsante em `secondary` (Esmeralda).

## 6. Design System Notes for Stitch Generation
Quando gerar novas telas, use este bloco:
```markdown
DESIGN SYSTEM: "The Digital Curator". Colors: Primary #0049db, Secondary #10B981 (Emerald), Tertiary #C5A059 (Gold). Surface: #f8f9ff. Rules: 1. NO solid borders (use tonal shifts). 2. Glassmorphism for floating UI. 3. Massive Display typography for metrics. 4. Roundness: 1rem (xl) for cards, 0.5rem (md) for buttons. 5. Spacing Scale: Base 4px, standard gaps 32px (8).
```
