import { createApp } from "vue";
import App from "./App.vue";
import Ipfs from "./ipfs";

const app = createApp(App);

app.use(Ipfs).mount("#app");
