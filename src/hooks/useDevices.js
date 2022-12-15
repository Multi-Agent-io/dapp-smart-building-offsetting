import { ref, watchEffect } from "vue";
import robonomics from "../robonomics";

export const useDevices = owner => {
  const devices = ref([]);

  const loadDevices = async owner => {
    const result = await robonomics.rws.getDevices(owner);
    devices.value = result.map(item => {
      return {
        name: "",
        address: item.toHuman()
      };
    });
  };
  watchEffect(async () => {
    await loadDevices(owner.value);
  });

  return {
    devices,
    loadDevices
  };
};
