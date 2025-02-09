
import { beginCell, Address, toNano } from '@ton/core';
import { SendTransactionRequest } from '@tonconnect/ui-react';

export const getJettonTransferRequest = (
  amount: string,
  recipientAddress: string,
  templatePrice: number
): SendTransactionRequest => {
  const recipient = Address.parse(recipientAddress);
  const amountNano = toNano(templatePrice.toString());

  return {
    validUntil: Math.floor(Date.now() / 1000) + 360, // 6 minutes
    messages: [{
      address: recipient.toString(),
      amount: amountNano.toString(),
    }]
  };
};
