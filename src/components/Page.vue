<template>
  <div>
    <account />
    <subscription
      @controller="
        result => {
          controller = result;
        }
      "
      class="block"
    />
    <pubsub />
    <energy v-if="controller" :controller="controller" class="block" />
  </div>
</template>

<script>
import Account from "./Account.vue";
import Energy from "./Energy.vue";
import Pubsub from "./Pubsub.vue";
import Subscription from "./Subscription.vue";

export default {
  components: { Account, Subscription, Pubsub, Energy },
  data() {
    return {
      controller: null
    };
  }
};
</script>
