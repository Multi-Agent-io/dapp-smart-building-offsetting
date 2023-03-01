<template>
  <div>
    <account class="block" />
    <pubsub />
    <energy class="block" />
  </div>
</template>

<script>
import Account from "./Account.vue";
import Energy from "./Energy.vue";
import Pubsub from "./Pubsub.vue";

export default {
  components: { Account, Pubsub, Energy }
};
</script>
