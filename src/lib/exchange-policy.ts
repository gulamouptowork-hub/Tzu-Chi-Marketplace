export function nextExchangeStatus(
  buyerCompleted: boolean,
  sellerCompleted: boolean,
) {
  return buyerCompleted && sellerCompleted
    ? ("COMPLETED" as const)
    : ("ACCEPTED" as const);
}
