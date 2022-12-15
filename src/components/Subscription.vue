<template>
  <div>
    <div>
      <div>
        <h2>Your subscription</h2>
      </div>

      <div>
        <h3>Account</h3>

        <Account />

        <div v-if="subscription.isActive.value" class="success">
          Subscription active till {{ subscription.validUntilFormat.value }}
        </div>
        <div v-else class="error">No active subsription</div>
      </div>

      <div>
        <h3>Controller</h3>

        <div>
          <label>Account:</label>
          <select v-model="controller">
            <option
              v-for="(item, key) in devices"
              :key="key"
              :value="item.address"
            >
              {{ item.address.substr(0, 5) }}...{{ item.address.substr(-5) }}
            </option>
          </select>
        </div>

        <div>
          <label>Seed phrase to encrypt data:</label>
          <input v-model="seed" type="password" />
        </div>

        <div v-if="seed && !validateUri" class="error">Wrong seed phrase</div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAccount } from "@/hooks/useAccount";
import { useDevices } from "@/hooks/useDevices";
import { useSubscription } from "@/hooks/useSubscription";
import { Keyring } from "@polkadot/keyring";
import { encodeAddress } from "@polkadot/util-crypto";
import { onUnmounted, ref, watch } from "vue";
import Account from "./Account.vue";

export default {
  components: { Account },
  setup() {
    const controller = ref("");
    const seed = ref("");
    const { account, unsubscribe } = useAccount();

    onUnmounted(() => {
      unsubscribe();
    });

    const subscription = useSubscription(account);

    const { devices, loadDevices } = useDevices(account);

    watch(devices, () => {
      if (devices.value.length) {
        controller.value = devices.value[0].address;
      } else {
        controller.value = "";
      }
    });

    return {
      controller,
      seed,
      account,
      subscription,
      devices,
      loadDevices
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
    validateUri: {
      immediate: true,
      handler() {
        if (this.validateUri) {
          this.$emit("controller", this.controllerAccount);
        } else {
          this.$emit("controller", null);
        }
      }
    }
  }
};
</script>
