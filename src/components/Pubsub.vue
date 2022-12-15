<template>
  <div>
    <div>
      <div>
        <h2>Pubsub</h2>
      </div>
      <div>
        <div>Connect multiaddr</div>
        <div>
          <input v-model="connectMultiaddr" type="text" />
        </div>
      </div>
      <div>
        <div>Listen multiaddr</div>
        <div>
          <input v-model="listenMultiaddr" type="text" />
        </div>
        <div>
          <button v-if="!isListen" @click="listen">listen</button>
          <div v-else class="success">Ok</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import robonomics from "../robonomics";

export default {
  emits: ["listen"],
  data() {
    return {
      // agent server work
      // listenMultiaddr: "/ip4/23.88.52.147/tcp/44440",
      // connectMultiaddr: "/ip4/91.122.35.172/tcp/44440",

      // local test
      listenMultiaddr: "/ip4/127.0.0.1/tcp/44440",
      connectMultiaddr: "/ip4/127.0.0.1/tcp/44441",

      isListen: false
    };
  },
  watch: {
    multiaddrLocal() {
      this.listen();
    },
    multiaddr() {
      this.connect();
    },
    isListen() {
      this.$emit("listen", this.isListen);
    }
  },
  created() {
    this.listen();
    this.connect();
  },
  methods: {
    async checkListen() {
      const results = await robonomics.api.rpc.pubsub.listeners();
      const list = results.toHuman();
      console.log(
        "pubsub listeners",
        list,
        list.includes(this.listenMultiaddr)
      );
      return list.includes(this.listenMultiaddr);
    },
    async listen() {
      if (await this.checkListen()) {
        this.isListen = true;
        return;
      }
      const resultExternal = await robonomics.api.rpc.pubsub.listen(
        this.listenMultiaddr
      );
      console.log(
        "pubsub listen",
        this.listenMultiaddr,
        resultExternal.toHuman()
      );
      if (await this.checkListen()) {
        this.isListen = true;
        return;
      }
      this.isListen = false;
      console.log("no subs");
    },
    async connect() {
      try {
        const result = await robonomics.api.rpc.pubsub.connect(
          this.connectMultiaddr
        );
        console.log("pubsub connect", this.connectMultiaddr, result.toHuman());
      } catch (error) {
        console.log("pubsub connect", this.connectMultiaddr, error.message);
      }
    }
  }
};
</script>
