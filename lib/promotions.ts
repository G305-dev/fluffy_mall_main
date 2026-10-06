export const NEW_CUSTOMER_DISCOUNT_PERCENT = 5;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}