/**
 * Shopify checkout extension entrypoint scaffold.
 * Replace placeholder render logic with @shopify/ui-extensions-react/checkout components.
 */
export const extensionTarget = "purchase.checkout.block.render";

export const renderPayByBankBlock = () => {
  return {
    title: "Pay by Bank",
    subtitle: "Secure bank transfer checkout option",
    behavior: "invoke-payment-session"
  };
};
