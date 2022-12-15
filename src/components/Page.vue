<template>
  <div>
    <subscription
      @controller="
        result => {
          controller = result;
        }
      "
      class="block"
    />
    <pubsub
      @listen="
        result => {
          pubsub = result;
        }
      "
      class="block"
    />
    <energy :controller="controller" :pubsub="pubsub" class="block" />
  </div>
</template>

<script>
import Energy from "./Energy.vue";
import Pubsub from "./Pubsub.vue";
import Subscription from "./Subscription.vue";

export default {
  components: { Subscription, Pubsub, Energy },
  data() {
    return {
      controller: null,
      pubsub: false
    };
  }
};
</script>
