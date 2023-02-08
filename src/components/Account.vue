<template>
  <div>
    <p>{{ error }}</p>
  </div>
</template>

<script>
import { formatBalance } from "@polkadot/util";
import robonomics from "../robonomics";
import AccountManager from "../utils/accountManagerUi";

export default {
  data() {
    return {
      isReady: false,
      account: null,
      accounts: [],
      unsubscribe: null,
      balance: "",
      error: ""
    };
  },
  created() {
    this.connect();
    robonomics.accountManager.onReady(() => {
      this.isReady = true;
      console.log("allow");
      console.log("polkadot-js", AccountManager.checkAllow("polkadot-js"));
      console.log("talisman", AccountManager.checkAllow("talisman"));
      console.log("subwallet-js", AccountManager.checkAllow("subwallet-js"));
    });
    setTimeout(() => {
      console.log("installed");
      console.log("polkadot-js", AccountManager.checkInstalled("polkadot-js"));
      console.log("talisman", AccountManager.checkInstalled("talisman"));
      console.log(
        "subwallet-js",
        AccountManager.checkInstalled("subwallet-js")
      );
    }, 1000);
  },
  computed: {
    balancePrint() {
      return formatBalance(this.balance, {
        decimals: robonomics.api.registry.chainDecimals[0],
        withUnit: robonomics.api.registry.chainTokens[0]
      });
    }
  },
  watch: {
    async account(address) {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
      await robonomics.accountManager.selectAccountByAddress(address);
      this.unsubscribe = await robonomics.account.getBalance(address, r => {
        this.balance = r.free.sub(r.feeFrozen);
      });
    }
  },
  methods: {
    async connect() {
      this.error = "";
      try {
        await AccountManager.initPlugin(robonomics.accountManager.keyring, {
          isDevelopment: true
        });
        this.accounts = robonomics.accountManager.getAccounts();
        if (this.accounts.length) {
          this.account = this.accounts[0].address;
        }
      } catch (error) {
        this.error = error.message;
      }
    }
  }
};
</script>
