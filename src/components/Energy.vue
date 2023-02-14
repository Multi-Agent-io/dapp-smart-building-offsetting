<template>
  <div>
    <div
      :disabled="!controller"
      :loading="liability && liability.report === null"
    >
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
          <div>Last compensation date: {{ lastBurnDate }}</div>
          <div>{{ kwhToBurn }} kwh</div>
        </div>
        <button v-if="!isAuthorizedCrust" @click.stop.prevent="crustAuth">
          ipfs auth
        </button>
        <template v-else>
          <div>
            <div>geo: <input v-model="geo" /></div>
          </div>
          <button @click="burn" :loading="isLoadBurn">Compensation</button>
        </template>
        <div v-if="errorBurn" class="error">{{ errorBurn }}</div>
      </template>
      <template v-else>
        <h3>Energy</h3>
        <div>
          <div><input v-model="energy" /> kWh</div>
        </div>
        <button @click="request" :disabled="isLoadRequest">Request</button>
        <div v-if="errorRequest" class="error">{{ errorRequest }}</div>
      </template>
    </div>
  </div>
</template>

<script>
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { utils } from "robonomics-interface";
import config from "../config";
import robonomics from "../robonomics";

export default {
  props: ["owner", "controller"],
  data() {
    return {
      energy: 10,
      geo: "",
      lastBurnDate: null,
      kwhToBurn: null,
      // energy: 10,
      // geo: "59.934280, 30.335099",
      // lastBurnDate: "-",
      // kwhToBurn: 5,
      liability: null,
      isLoadRequest: false,
      errorRequest: null,
      isLoadBurn: false,
      errorBurn: null,
      isAuthorizedCrust: false,
      gateway: config.GATEWAY
    };
  },
  methods: {
    async crustAuth() {
      try {
        const address = encodeAddress(this.controller.address, 66);

        let signature;
        if (this.controller.signMsg) {
          signature = (
            await this.controller.signMsg(stringToU8a(address))
          ).toString();
        } else {
          signature = u8aToHex(await this.controller.sign(address));
        }
        this.$crust.auth(address, signature);
        this.isAuthorizedCrust = true;
      } catch (error) {
        console.log(error);
      }
    },
    async request() {
      this.isLoadRequest = true;
      this.errorRequest = null;
      this.lastBurnDate = null;
      this.kwhToBurn = null;
      const subscriber = robonomics.api.rpc.pubsub.subscribe(
        config.LAST_BURN_DATE_RESPONSE_TOPIC,
        obj => {
          try {
            const data = JSON.parse(obj.data.toHuman());

            if (data.last_compensation_date === "None") {
              this.lastBurnDate = "-";
            } else {
              this.lastBurnDate = data.last_compensation_date;
            }

            this.kwhToBurn = data.kwh_to_compensate;
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
        config.LAST_BURN_DATE_QUERY_TOPIC,
        JSON.stringify({
          timestamp: Date.now(),
          address: this.owner,
          kwh_current: this.energy
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
          geo: this.geo,
          kwh: this.energy
        }),
        "burn",
        [this.gateway]
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
                .catFile(ipfsHash, this.gateway)
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
          timestamp: Date.now(),
          technics: hash,
          economics: economics,
          promisee: encodeAddress(this.controller.address, 32),
          promisee_signature: {
            [this.controller.type.toUpperCase()]: signature
          }
        })
      );
      const result = await robonomics.api.rpc.pubsub.publish(
        config.LIABILITY_QUERY_TOPIC,
        JSON.stringify({
          timestamp: Date.now(),
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
      if (this.controller.signMsg) {
        return (await this.controller.signMsg(stringToU8a(data))).toString();
      }
      return u8aToHex(await this.controller.sign(data));
    }
  }
};
</script>
