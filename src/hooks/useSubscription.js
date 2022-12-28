import { validateAddress } from "@polkadot/util-crypto";
import { computed, ref, watch } from "vue";
import robonomics from "../robonomics";
import { useDevices } from "./useDevices";

const getLedger = async owner => {
  const res = await robonomics.rws.getLedger(owner);
  if (!res.isEmpty) {
    return res.value;
  }
  return;
};

const DAYS_TO_MS = 24 * 60 * 60 * 1000;

export const useSubscription = (initialOwner = null) => {
  const owner = ref(initialOwner);
  const rawData = ref(null);

  const { devices, loadDevices } = useDevices(owner);

  const validUntil = computed(() => {
    if (rawData.value === null) {
      return "";
    }
    const issue_time = rawData.value.issueTime.toNumber();
    let days = 0;
    if (rawData.value.kind.isDaily) {
      days = rawData.value.kind.value.days.toNumber();
    }
    return issue_time + days * DAYS_TO_MS;
  });

  const countMonth = computed(() => {
    if (rawData.value === null) {
      return 0;
    }
    let days = 0;
    if (rawData.value.kind.isDaily) {
      days = rawData.value.kind.value.days.toNumber();
    }
    return days / 30;
  });

  const isActive = computed(() => {
    if (rawData.value === null || Date.now() > validUntil.value) {
      return false;
    }
    return true;
  });

  const loadLedger = async () => {
    if (owner.value) {
      try {
        validateAddress(owner.value);
        const ledger = await getLedger(owner.value);
        if (ledger) {
          rawData.value = ledger;
          return;
        }
        // eslint-disable-next-line no-empty
      } catch (e) {
        console.log(e);
      }
    }
    rawData.value = null;
  };

  watch(
    owner,
    async () => {
      await loadLedger();
    },
    {
      immediate: true
    }
  );

  return {
    owner,
    rawData,
    devices,
    isActive,
    countMonth,
    validUntil,
    loadLedger,
    loadDevices
  };
};
