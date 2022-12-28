<template>
  <div>
    <subscription
      @owner="
        result => {
          owner = result;
        }
      "
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
    <energy
      :owner="owner"
      :controller="controller"
      :pubsub="pubsub"
      class="block"
    />
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
      owner: null,
      controller: null,
      pubsub: false
    };
  }
};
</script>
