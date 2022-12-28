import Crust from "../utils/crust";

export default {
  install: app => {
    app.config.globalProperties.$crust = new Crust();
  }
};
