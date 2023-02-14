<script>
import config from "../config";
import robonomics from "../robonomics";

export default {
  data() {
    return {
      connectMultiaddr: config.CONNECT_MULTIADDR
    };
  },
  watch: {
    connectMultiaddr() {
      this.connect();
    }
  },
  created() {
    this.connect();
  },
  methods: {
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
