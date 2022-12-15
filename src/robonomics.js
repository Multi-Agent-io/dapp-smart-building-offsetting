import keyring from "@polkadot/ui-keyring";
import {
  AccountManagerUi as AccountManager,
  Robonomics
} from "robonomics-interface";
// import AccountManager from "./utils/accountManagerDapp";

const config = {
  endpoint:
    process.env.NODE_ENV !== "production"
      ? "wss://kusama.rpc.robonomics.network/"
      : "ws://127.0.0.1:9944/",

  types: {
    Message: { from: "AccountId", data: "Vec<u8>" }
  },
  rpc: {
    pubsub: {
      peer: {
        description: "",
        params: [],
        type: "String"
      },
      listen: {
        description: "",
        params: [
          {
            name: "address",
            type: "String"
          }
        ],
        type: "Bool"
      },
      listeners: {
        description: "",
        params: [],
        type: "Vec<String>"
      },
      connect: {
        description: "",
        params: [
          {
            name: "address",
            type: "String"
          }
        ],
        type: "Bool"
      },
      subscribe: {
        description: "",
        params: [
          {
            name: "topic_name",
            type: "String"
          }
        ],
        pubsub: ["subscribe", "subscribe", "unsubscribe"],
        type: "Message"
      },
      unsubscribe: {
        description: "",
        params: [
          {
            name: "topic_name",
            type: "String"
          }
        ],
        type: "Bool"
      },
      publish: {
        description: "",
        params: [
          {
            name: "topic_name",
            type: "String"
          },
          {
            name: "message",
            type: "String"
          }
        ],
        type: "Bool"
      }
    }
  }
};
console.log(config);

const robonomics = new Robonomics(config);
robonomics.setAccountManager(new AccountManager(keyring));

export default robonomics;
