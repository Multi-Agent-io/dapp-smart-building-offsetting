<template>
  <div>
    <div>
      <div>
        <h2>Your subscription</h2>
      </div>

      <div>
        <h3>Owner account</h3>
        <input v-model="owner" />
        <div v-if="subscription.isActive.value" class="success">
          Subscription active till
          {{ $filters.date(subscription.validUntil.value) }}
        </div>
        <div v-else class="error">No active subsription</div>
      </div>

      <div>
        <h3>Controller</h3>
        <div>
          <select v-model="controller">
            <option
              v-for="(item, key) in subscription.devices.value"
              :key="key"
              :value="item"
            >
              {{ item }}
            </option>
          </select>
        </div>

        <div v-if="extension" class="success">Account from extension</div>

        <!-- <template v-if="!extension"> -->
        <div>
          <label>Seed phrase to encrypt data:</label>
          <input v-model="seed" type="password" />
        </div>
        <div v-if="seed && !validateUri" class="error">Wrong seed phrase</div>
        <!-- </template> -->
      </div>
    </div>
  </div>
</template>

<script>
import { useSubscription } from "@/hooks/useSubscription";
import { Keyring } from "@polkadot/keyring";
import { encodeAddress } from "@polkadot/util-crypto";
import { ref } from "vue";
import robonomics from "../robonomics";

export default {
  setup() {
    const owner = ref("");
    const controller = ref("");
    const seed = ref("");
    const extension = ref(false);

    const subscription = useSubscription(owner);

    return {
      controller,
      seed,
      owner,
      subscription,
      extension
    };
  },
  emits: ["controller"],
  computed: {
    controllerAccount() {
      if (this.seed) {
        try {
          const k = new Keyring();
          return k.addFromUri(this.seed, {}, "ed25519");
        } catch (error) {
          console.log(error);
        }
      }
      return null;
    },
    validateUri() {
      if (
        this.seed &&
        this.controllerAccount &&
        this.controller &&
        encodeAddress(this.controller) ===
          encodeAddress(this.controllerAccount.address)
      ) {
        return true;
      }
      return false;
    }
  },
  watch: {
    async controller() {
      if (this.controller && robonomics.accountManager.isReady) {
        try {
          await robonomics.accountManager.selectAccountByAddress(
            this.controller
          );
          this.extension = true;
          this.$emit("controller", robonomics.accountManager.account);
        } catch (error) {
          this.extension = false;
          console.log(error.message);
        }
      }
    },
    validateUri: {
      immediate: true,
      handler() {
        if (this.seed) {
          if (this.validateUri) {
            this.$emit("controller", this.controllerAccount);
          } else {
            this.$emit("controller", null);
          }
        }
      }
    }
  }
};
</script>
