import axios from "axios";

const endpoints = [
  "https://ipfs-gw.decloud.foundation",
  "https://gw.crustfiles.net",
  "https://gw.crustfiles.app",
  "https://crustipfs.xyz",
  "https://crustwebsites.net"
];

export default class Crust {
  constructor() {
    this.authHeader = null;
    this.pinner = axios.create({
      baseURL: "https://pin.crustcode.com/psa"
    });
  }
  createNode(endpoint) {
    this.ipfs = axios.create({
      baseURL: `${endpoint}/api/v0`
    });
  }
  auth(address, signature) {
    const authHeaderRaw = `sub-${address}:${signature}`;
    this.authHeader = Buffer.from(authHeaderRaw).toString("base64");
  }
  async add(fileContent, name = "") {
    const formData = new FormData();
    formData.append("file", fileContent, name);
    for (const endpoint of endpoints) {
      this.createNode(endpoint);
      try {
        const res = await this.ipfs.post("/add", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            authorization: `Basic ${this.authHeader}`
          }
        });
        if (res.status === 200 && res.data.Hash) {
          return res.data.Hash;
        } else {
          console.log("ipfs gateway response", endpoint, res);
        }
      } catch (error) {
        console.log("ipfs gateway error", endpoint, error);
      }
    }
    throw new Error("ipfs gateway error");
  }
  pin(cid, name = "") {
    return this.pinner.post(
      "/pins",
      { cid: cid },
      {
        headers: {
          authorization: `Bearer ${this.authHeader}`,
          name: name
        }
      }
    );
  }
  listenStatus(rid) {
    return this.pinner.get(`/pins/${rid}`, {
      headers: {
        authorization: `Bearer ${this.authHeader}`
      }
    });
  }
  async catFile(hash, gateway = "https://ipfs.io", attempts = 5) {
    const url = new URL(gateway);
    gateway = url.origin;
    if (url.protocol === "http") {
      gateway = gateway.replace("http://", "https://");
    }
    try {
      const result = await axios.get(`${gateway}/ipfs/${hash}`);
      return result.data;
    } catch (error) {
      if (attempts <= 0) {
        throw error;
      }
    }
    return await this.catFile(hash, gateway, attempts - 1);
  }
}
