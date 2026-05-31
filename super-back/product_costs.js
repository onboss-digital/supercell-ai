export const PRODUCT_COSTS = {
  "REALME NOTE 60X": 630.00,
  "REALME C85": 1100.00,
  "REALME C63": 850.00,
  "REALME NOTE 70": 800.00,
  "REALME C75": 1000.00,
  "REALME C71": 850.00,
  "IPHONE 11": 700.00,
  "IPHONE XR": 500.00,
  "IPHONE 13": 1730.00,
  "IPHONE 14": 1800.00,
  "IPHONE 12 PRO": 1920.00,
  "IPHONE 13 PRO": 2200.00,
  "IPHONE 15 PRO": 3000.00,
  "REDMI 15C": 900.00
};

export function calcularLucroReal(produtoNome, valorTotal) {
  const nomeNormalizado = (produtoNome || "").toUpperCase();
  for (const [modelo, custo] of Object.entries(PRODUCT_COSTS)) {
    if (nomeNormalizado.includes(modelo)) {
      return Math.max(0, valorTotal - custo);
    }
  }
  // Caso o produto não esteja mapeado, usa uma margem padrão de 50% (média da sua operação)
  return valorTotal * 0.50;
}
