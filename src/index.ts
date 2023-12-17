import Cron from "croner";
import { Api, JsonRpc, JsSignatureProvider } from "@mingfunwong/fibosjs";

const httpEndpoint = process.env.HTTP_ENDPOINT as string;

function fibosClaimer() {
  const FIBOS_CLAIMER = process.env.FIBOS_CLAIMER as string;
  if (FIBOS_CLAIMER) {
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
}

function fibosTransfer() {
  const FIBOS_TRANSFER = process.env.FIBOS_TRANSFER as string;
  if (FIBOS_TRANSFER) {
    FIBOS_TRANSFER.split("|").forEach((transfer) => {
      const [PATTERN, TRANSFER_NAME, PRIVATE_KEY, TO, MEMO] = transfer.split(",");
      console.log({ CRON_NAME: "fibosTransfer", PATTERN, TRANSFER_NAME, TO, MEMO });
      Cron(PATTERN, async () => {
        try {
          const quantity = await _getBalance(TRANSFER_NAME);
          if (quantity) {
            const result = await _transfer(TRANSFER_NAME, PRIVATE_KEY, TO, MEMO, quantity);
            console.log(new Date(), "transfer", TRANSFER_NAME, result);
          }
        } catch (error) {
          console.error(new Date(), "transfer", TRANSFER_NAME, error);
        }
      });
    });
  }
}

fibosClaimer();
fibosTransfer();

async function _claimrewards(producerName: string, privateKey: string) {
  const signatureProvider = new JsSignatureProvider([privateKey]);
  const rpc = new JsonRpc(httpEndpoint, { fetch });
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  const transaction = {
    actions: [
      {
        account: "eosio",
        name: "claimrewards",
        authorization: [
          {
            actor: producerName,
            permission: "active",
          },
        ],
        data: {
          owner: producerName,
        },
      },
    ],
  };
  const transactConfig = {
    blocksBehind: 3,
    expireSeconds: 30,
  };

  const result = await api.transact(transaction, transactConfig);

  return result;
}

async function _getBalance(accountName: string) {
  const rpc = new JsonRpc(httpEndpoint, { fetch });

  const accounts = await rpc.get_table_rows({
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
  const signatureProvider = new JsSignatureProvider([privateKey]);
  const rpc = new JsonRpc(httpEndpoint, { fetch });
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  const transaction = {
    actions: [
      {
        account: "eosio.token",
        name: "transfer",
        authorization: [
          {
            actor: transferName,
            permission: "active",
          },
        ],
        data: {
          from: transferName,
          to: to,
          quantity: `${quantity.toFixed(4)} FO`,
          memo: memo,
        },
      },
    ],
  };
  const transactConfig = {
    blocksBehind: 3,
    expireSeconds: 30,
  };

  const result = await api.transact(transaction, transactConfig);

  return result;
}
