import { Buffer } from "buffer";
import { create } from "ipfs-http-client";

export default class Crust {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  auth(address, signature) {
    // console.log(`sub-${address}`);
    // console.log(signature);
    const authHeaderRaw = `sub-${address}:${signature}`;
    // console.log(authHeaderRaw);
    this.authHeader = Buffer.from(authHeaderRaw).toString("base64");
    // console.log(this.authHeader);
  }
  authClear() {
    this.authHeader = null;
  }
  async add(fileContent) {
    const client = create({
      url: this.endpoint,
      headers: {
        authorization: `Basic ${this.authHeader}`
      }
    });
    const { cid } = await client.add(fileContent);
    return cid.toString();
  }
  async cat(hash) {
    const decoder = new TextDecoder();
    const client = create({
      url: this.endpoint,
      headers: {
        authorization: `Basic ${this.authHeader}`
      }
    });
    let content = "";
    for await (const chunk of client.cat(hash)) {
      content += decoder.decode(chunk, {
        stream: true
      });
    }
    try {
      return JSON.parse(content);
    } catch (_) {
      return content;
    }
  }
}
