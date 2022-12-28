import { validateAddress } from "@polkadot/util-crypto";
import { computed, ref, watch } from "vue";
import robonomics from "../robonomics";

const getReferenceCallWeight = () => {
  return robonomics.api.consts.rws.referenceCallWeight;
};

const getLedger = async owner => {
  const res = await robonomics.rws.getLedger(owner);
  if (!res.isEmpty) {
    return res.value;
  }
  return;
};

const DAYS_TO_MS = 24 * 60 * 60 * 1000;

export const getFreeWeightCalc = async owner => {
  const ledger = await getLedger(owner);
  if (!ledger) {
    return -1;
  }

  const freeWeight = ledger.freeWeight.toNumber();
  const lastUpdate = ledger.lastUpdate.toNumber();
  const issueTime = ledger.issueTime.toNumber();

  const referenceCallWeight = getReferenceCallWeight();
  const now = Date.now();

  let utps = (() => {
    let duration_ms = 30 * DAYS_TO_MS;
    if (now < issueTime + duration_ms) {
      return 10000;
    }
    return 0;
  })();

  // let utps = match subscription.kind {
  //     Subscription::Lifetime { tps } => tps,
  //     Subscription::Daily { days } => {
  //         let duration_ms = <T::Time as Time>::Moment::from(days * DAYS_TO_MS);
  //         // If subscription active then 0.01 TPS else 0 TPS
  //         if now < subscription.issue_time.clone() + duration_ms {
  //             10_000 // uTPS
  //         } else {
  //             0u32
  //         }
  //     }
  // };

  const delta = now - lastUpdate;
  return Math.floor(
    freeWeight + (referenceCallWeight * utps * delta) / 1000000000
  );
};

const getDevices = async owner => {
  const result = await robonomics.rws.getDevices(owner);
  if (result.isEmpty) {
    return [];
  }
  return result.map(item => item.toHuman());
};

const hasDeviceByOwner = async (owner, device) => {
  const result = await getDevices(owner);
  if (result.includes(device)) {
    return true;
  }
  return false;
};

export const useSubscription = (initialOwner = null) => {
  const owner = ref(initialOwner);
  const subscription = ref(null);

  const validUntil = computed(() => {
    if (subscription.value === null) {
      return "";
    }
    const issue_time = subscription.value.issueTime.toNumber();
    let days = 0;
    if (subscription.value.kind.isDaily) {
      days = subscription.value.kind.value.days.toNumber();
    }
    return issue_time + days * DAYS_TO_MS;
  });
  const validUntilFormat = computed(() => {
    if (subscription.value === null) {
      return "-";
    }
    return new Date(validUntil.value).toLocaleDateString();
  });
  const countMonth = computed(() => {
    if (subscription.value === null) {
      return 0;
    }
    let days = 0;
    if (subscription.value.kind.isDaily) {
      days = subscription.value.kind.value.days.toNumber();
    }
    return days / 30;
  });
  const isActive = computed(() => {
    if (subscription.value === null || Date.now() > validUntil.value) {
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
          subscription.value = ledger;
          return;
        }
        // eslint-disable-next-line no-empty
      } catch (e) {
        console.log(e);
      }
    }
    subscription.value = null;
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

  const hasDevice = async device => {
    return await hasDeviceByOwner(owner.value, device);
  };

  return {
    owner,
    subscription,
    isActive,
    countMonth,
    validUntil,
    validUntilFormat,
    hasDevice,
    loadLedger // REMOVE
  };
};
