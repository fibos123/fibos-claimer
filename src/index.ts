import Cron from "croner";
import FIBOS from "fibos.js";

const httpEndpoint = process.env.HTTP_ENDPOINT as string;

function fibosClaimer() {
  const FIBOS_CLAIMER = process.env.FIBOS_CLAIMER as string;
  FIBOS_CLAIMER.split("|").forEach((clainmer) => {
    const [PATTERN, PRODUCER_NAME, PRIVATE_KEY] = clainmer.split(",");
    console.log({ CRON_NAME: "fibosClaimer", PATTERN, PRODUCER_NAME });
    Cron(PATTERN, async () => {
      try {
        const result = await _claimrewards(PRODUCER_NAME, PRIVATE_KEY);
        console.log(new Date(), "claimer", PRODUCER_NAME, result);
      } catch (error) {
        console.error(new Date(), "claimer", PRODUCER_NAME, error);
      }
    });
  });
}

function fibosTransfer() {
  const FIBOS_TRANSFER = process.env.FIBOS_TRANSFER as string;
  FIBOS_TRANSFER.split("|").forEach((transfer) => {
    const [PATTERN, TRANSFER_NAME, PRIVATE_KEY, TO, MEMO] = transfer.split(",");
    console.log({ CRON_NAME: "fibosTransfer", PATTERN, TRANSFER_NAME, TO, MEMO });
    Cron(PATTERN, async () => {
      try {
        const quantity = await _getBalance(TRANSFER_NAME);
        const result = await _transfer(TRANSFER_NAME, PRIVATE_KEY, TO, MEMO, quantity);
        console.log(new Date(), "transfer", TRANSFER_NAME, result);
      } catch (error) {
        console.error(new Date(), "transfer", TRANSFER_NAME, error);
      }
    });
  });
}

fibosClaimer();
fibosTransfer();

async function _claimrewards(producerName: string, privateKey: string) {
  const fibos = FIBOS({
    chainId: "6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a",
    keyProvider: privateKey,
    httpEndpoint: httpEndpoint,
  });
  const result = await fibos.claimrewards(producerName);
  return result;
}

async function _getBalance(accountName: string) {
  const fibos = FIBOS({
    chainId: "6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a",
    httpEndpoint: httpEndpoint,
  });

  const accounts = await fibos.getTableRows({
    json: true,
    code: "eosio.token",
    scope: accountName,
    table: "accounts",
    table_key: "",
    lower_bound: "",
    upper_bound: "",
    limit: 100,
  });

  let balance = 0;

  if (accounts.rows && accounts.rows.length) {
    accounts.rows.map((account: any) => {
      if (account.balance.quantity.substr(-2) === "FO" && account.balance.contract === "eosio") {
        balance = parseFloat(account.balance.quantity);
      }
    });
  }

  return balance;
}

async function _transfer(transferName: string, privateKey: string, to: string, memo: string, quantity: number) {
  const fibos = FIBOS({
    chainId: "6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a",
    keyProvider: privateKey,
    httpEndpoint: httpEndpoint,
  });
  const data = {
    from: transferName,
    to: to,
    quantity: `${quantity.toFixed(4)} FO`,
    memo: memo,
  };

  const eosioTokenContract = await fibos.contract("eosio.token");
  const result = await eosioTokenContract.transfer(data, {
    authorization: transferName,
  });
  return result;
}
