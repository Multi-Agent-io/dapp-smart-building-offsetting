import config from "../config";
import Ipfs from "../utils/ipfs";

export default {
  install: app => {
    app.config.globalProperties.$ipfs = new Ipfs(config.GATEWAY);
  }
};
