import axios from "axios";

export default class Crust {
  constructor() {
    this.authHeader = null;
    this.ipfs = axios.create({
      baseURL: "https://ipfs-gw.decloud.foundation/api/v0"
      // baseURL: 'https://crustwebsites.net/api/v0'
      // baseURL: 'https://gw.crustapps.net/api/v0'
    });
    this.pinner = axios.create({
      baseURL: "https://pin.crustcode.com/psa"
    });
  }
  auth(address, signature) {
    const authHeaderRaw = `sub-${address}:${signature}`;
    this.authHeader = Buffer.from(authHeaderRaw).toString("base64");
  }
  async add(fileContent, name = "") {
    const formData = new FormData();
    formData.append("file", fileContent, name);
    const res = await this.ipfs.post("/add?pin=true", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        authorization: `Basic ${this.authHeader}`
      }
    });
    if (res.data.Hash) {
      return res.data.Hash;
    }
    throw new Error("file hash not received");
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
