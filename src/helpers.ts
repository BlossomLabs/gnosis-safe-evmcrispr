import { BigNumber, utils } from "ethers";
import { ActionFunction, Action } from "./types";

export const timeUnits: { [key: string]: number } = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31536000,
};

export const normalizeActions = (actions: ActionFunction[]): ActionFunction => {
  return async () => {
    const normalizedActions: Action[][] = [];
    for (const action of actions) {
      normalizedActions.push(await action());
    }
    return normalizedActions.flat();
  };
};

export const toDecimals = (amount: number | string, decimals = 18): BigNumber => {
  const [integer, decimal] = String(amount).split(".");
  return BigNumber.from((integer != "0" ? integer : "") + (decimal || "").padEnd(decimals, "0") || "0");
};

export function encodeActCall(signature: string, params: any[] = []): string {
  const sigBytes = utils.hexDataSlice(utils.id(signature), 0, 4);
  const types = signature.replace(")", "").split("(")[1];

  // No params, return signature directly
  if (types === "") {
    return sigBytes;
  }

  const paramBytes = new utils.AbiCoder().encode(types.split(","), params);

  return `${sigBytes}${paramBytes.slice(2)}`;
}

function stripBytePrefix(bytes: string) {
  return bytes.substring(0, 2) === '0x' ? bytes.slice(2) : bytes
}

function createExecutorId(id: number) {
  return `0x${String(id).padStart(8, '0')}`
}

export function encodeCallScript(actions: Action[], specId = 1): string {
  return actions.reduce((script, { to, data }) => {
    const addr = utils.defaultAbiCoder.encode(['address'], [to]);

    const calldataBytes = stripBytePrefix(data.slice(2));
    const length = utils.defaultAbiCoder.encode(['uint256'], [calldataBytes.length / 2]);

    // Remove first 12 bytes of padding for addr and 28 bytes for uint32
    return (
      script +
      stripBytePrefix(addr).slice(24) +
      stripBytePrefix(length).slice(56) +
      calldataBytes
    )
  }, createExecutorId(specId))
}
