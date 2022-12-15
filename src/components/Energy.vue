<template>
  <div>
    <div
      :disabled="!controller"
      :loading="loadDatalog || (liability && liability.report === null)"
    >
      <div>
        <h2>Energy</h2>
      </div>
      <div v-if="loadDatalog">
        Load
        <div>...</div>
      </div>
      <template v-else>
        <template v-if="liability">
          <div>
            <h3>Liability</h3>
            <div>
              <b>Technical</b>:
              <a
                :href="`https://ipfs.io/ipfs/${liability.technical}`"
                target="_blank"
              >
                {{ liability.technical }} </a
              ><br />
              <b>Promisee</b>: {{ liability.promisee }}<br />
              <b>Promisor</b>: {{ liability.promisor }}
            </div>

            <h3>Report</h3>
            <div>
              <a
                v-if="liability.reportHash"
                :href="`http://ipfs.io/ipfs/${liability.reportHash}`"
                target="_blank"
              >
                {{ liability.reportHash }}
              </a>
              <div v-else-if="!liability.report">...</div>
              <a v-else :href="liability.report" target="_blank">
                {{ liability.report }}
              </a>
            </div>
          </div>
        </template>
        <template v-else-if="lastBurnDate">
          <h3>Burn</h3>
          <div>
            <div>Last burn date: {{ lastBurnDate }}</div>
            <div>{{ kwhToBurn }} kwh</div>
          </div>
          <button v-if="!isAuthorizedCrust" @click.stop.prevent="crustAuth">
            crust auth
          </button>
          <div v-else @click="burn" :loading="isLoadBurn">Burn</div>
          <div v-if="errorBurn" class="error">{{ errorBurn }}</div>
        </template>
        <template v-else-if="energy">
          <h3>Energy</h3>
          <div>
            <div>{{ energy.energy }} kWh</div>
          </div>
          <button @click="request" :disabled="isLoadRequest">Request</button>
          <div v-if="errorRequest" class="error">{{ errorRequest }}</div>
        </template>
        <template v-else>
          <h3>Energy</h3>
          <div>
            <div>not found</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import { useAccount } from "@/hooks/useAccount";
import { u8aToHex, u8aToString } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { utils } from "robonomics-interface";
import { onUnmounted } from "vue";
import robonomics from "../robonomics";

const LAST_BURN_DATE_QUERY_TOPIC = "last_burn_date_query";
const LAST_BURN_DATE_RESPONSE_TOPIC = "last_burn_date_response";
const LIABILITY_QUERY_TOPIC = "liability_query";

export default {
  props: ["controller", "pubsub"],
  setup() {
    const { account, unsubscribe } = useAccount();

    onUnmounted(() => {
      unsubscribe();
    });

    return {
      account
    };
  },
  data() {
    return {
      loadDatalog: false,
      energy: null,
      lastBurnDate: null,
      kwhToBurn: null,
      liability: null,
      isLoadRequest: false,
      errorRequest: null,
      isLoadBurn: false,
      errorBurn: null,
      isAuthorizedCrust: false
    };
  },
  async created() {
    this.getEnergyFromDatalog();
  },
  watch: {
    controller() {
      this.getEnergyFromDatalog();
    }
  },
  methods: {
    async crustAuth() {
      try {
        const address = encodeAddress(this.accountManager.account.address, 66);
        const signature = await this.accountManager.account.signMsg(address);
        this.$crust.auth(address, signature);
        this.isAuthorizedCrust = true;
      } catch (error) {
        console.log(error);
      }
    },
    async getEnergyFromDatalog() {
      if (!this.controller) {
        this.energy = null;
        this.lastBurnDate = null;
        this.kwhToBurn = null;
        return;
      }
      this.loadDatalog = true;
      try {
        const log = await robonomics.datalog.read(
          encodeAddress(this.controller.address, 32)
        );
        const result = await this.$crust.catFile(
          log[log.length - 1][1].toHuman()
        );
        const res = JSON.parse(this.decrypt(result));
        this.energy = res.energy;
        // eslint-disable-next-line no-empty
      } catch (_) {}
      this.loadDatalog = false;
    },
    async request() {
      this.isLoadRequest = true;
      this.errorRequest = null;
      this.lastBurnDate = null;
      this.kwhToBurn = null;
      const subscriber = robonomics.api.rpc.pubsub.subscribe(
        LAST_BURN_DATE_RESPONSE_TOPIC,
        obj => {
          try {
            const data = JSON.parse(obj.data.toHuman());
            console.log(data);

            if (data.last_burn_date === "None") {
              this.lastBurnDate = "-";
            } else {
              this.lastBurnDate = data.last_burn_date;
            }

            this.kwhToBurn = data.kwh_to_burn;
          } catch (error) {
            console.log(error, obj.data.toHuman());
          }
          this.isLoadRequest = false;
          subscriber.then(unsubscribe => {
            unsubscribe();
          });
        }
      );
      const result = await robonomics.api.rpc.pubsub.publish(
        LAST_BURN_DATE_QUERY_TOPIC,
        JSON.stringify({
          datetime: Date.now(),
          address: this.account,
          kwh_current: this.energy.energy
        })
      );
      console.log("pubsub publish", result.toHuman());
      if (!result.toHuman()) {
        this.errorRequest = "Error: Message not sent";
        this.isLoadRequest = false;
        subscriber.then(unsubscribe => {
          unsubscribe();
        });
      }
    },
    async burn() {
      this.isLoadBurn = true;
      this.errorBurn = null;

      const hash = await this.$crust.add(
        JSON.stringify({
          geo: this.energy.geo,
          kwh: this.energy.energy
        }),
        "burn"
      );

      const technics = utils.cidToHex(hash);
      const economics = 0;
      const signature = await this.signData(technics, economics);
      const unsubscribeLiability = await robonomics.liability.on({}, r => {
        for (const item of r) {
          if (item.event === "NewLiability") {
            console.log("NewLiability", item.data);
            if (
              item.data.promisee === encodeAddress(this.controller.address, 32)
            ) {
              this.isLoadBurn = false;
              this.liability = {
                ...item.data,
                technical: utils.hexToCid(item.data.technical),
                report: null,
                reportHash: null
              };
              console.log("liability", this.liability);
            }
          } else if (item.event === "NewReport") {
            console.log("NewReport", item.data);
            if (
              item.data.index === this.liability.index &&
              item.data.sender === this.liability.promisor
            ) {
              this.isLoadBurn = false;
              const ipfsHash = utils.hexToCid(item.data.payload);

              this.$crust
                .catFile(ipfsHash)
                .then(r => {
                  try {
                    console.log(r);
                    this.liability.report = r.burn_transaction_hash;
                  } catch (error) {
                    console.log(error);
                    this.liability.reportHash = ipfsHash;
                  }
                })
                .catch(() => {
                  this.liability.reportHash = ipfsHash;
                });

              unsubscribeLiability();
            }
          }
        }
      });
      console.log(
        JSON.stringify({
          datetime: Date.now(),
          technics: hash,
          economics: economics,
          promisee: encodeAddress(this.controller.address, 32),
          promisee_signature: {
            [this.controller.type.toUpperCase()]: signature
          }
        })
      );
      const result = await robonomics.api.rpc.pubsub.publish(
        LIABILITY_QUERY_TOPIC,
        JSON.stringify({
          datetime: Date.now(),
          technics: hash,
          economics: economics,
          promisee: encodeAddress(this.controller.address, 32),
          promisee_signature: {
            [this.controller.type.toUpperCase()]: signature
          }
        })
      );
      console.log("pubsub publish", result.toHuman());
      if (!result.toHuman()) {
        this.errorBurn = "Error: Message not sent";
        this.isLoadBurn = false;
        unsubscribeLiability();
      }
    },
    async signData(technics, economics) {
      const { data } = robonomics.liability.getDataLiability(
        technics,
        economics
      );
      return u8aToHex(await this.controller.sign(data));
    },
    decrypt(encryptMessage) {
      const decryptMessage = this.controller.decryptMessage(
        encryptMessage,
        this.controller.publicKey
      );
      return u8aToString(decryptMessage);
    }
  }
};
</script>
