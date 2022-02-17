import { BigNumber, BigNumberish, ethers, providers, Signer, utils } from "ethers";
import { timeUnits, normalizeActions, encodeActCall, encodeCallScript, toDecimals } from "./helpers";
import { Address, ActionFunction, Action, Entity } from "./types";
/**
 * The default main EVMcrispr class that expose all the functionalities.
 * @category Main
 */
export default class EVMcrispr {

  #signer: Signer;
  #safe: Address;

  protected constructor(safe: Address, signer: Signer) {
    this.#safe = safe;
    this.#signer = signer;
  }

  static async create(
    gnosisSafeAddress: string,
    signer: Signer,
  ): Promise<EVMcrispr> {
    const evmcrispr = new EVMcrispr(gnosisSafeAddress, signer);
    await evmcrispr._connect();
    return evmcrispr;
  }

  protected async _connect(): Promise<void> {
    // TODO Retreive gnosis safe data
  }

  get signer(): Signer {
    return this.#signer;
  }

  addOwner(owner: string): ActionFunction {
    return async () => {
      return [{
        to: "",
        data: "",
      }]
    };
  }

  removeOwner(owner: string): ActionFunction {
    return async () => {
      return [{
        to: "",
        data: "",
      }]
    };
  }

  changeThresold(n: number): ActionFunction {
    return async () => {
      return [{
        to: "",
        data: "",
      }]
    };
  }

  module(name: string): Address {
    return "";
  }

  modules(): string[] {
    return [];
  }

  addModule(address: string): ActionFunction {
    return async () => {
      return [
        {
          to: "",
          data: "",
          // data: safe.abiInterface.encodeFunctionData("", [
          // ]),
        },
      ];
    };
  }

  removeModule(address: string): ActionFunction {
    return async () => {
      return [
        {
          to: "",
          data: "",
        }
      ]
    }
  }

  encodeAction(target: Entity, signature: string, params: any[]): ActionFunction {
    return async () => {
      if (!/\w+\(((\w+(\[\d*\])*)+(,\w+(\[\d*\])*)*)?\)/.test(signature)) {
        throw new Error("Wrong signature format: " + signature + ".");
      }
      const paramTypes = signature.split("(")[1].slice(0, -1).split(",");
      return [
        {
          to: this.#resolveEntity(target),
          data: encodeActCall(signature, this.#resolveParams(params, paramTypes)),
        },
      ];
    };
  }

  async encode(
    actionFunctions: ActionFunction[] | ((evm: EVMcrispr) => ActionFunction)
  ): Promise<{ action: Action; preTxActions: Action[] }> {
    const _actionFunctions = Array.isArray(actionFunctions) ? actionFunctions : [actionFunctions(this)];
    if (_actionFunctions.length === 0) {
      throw new Error("No actions provided.");
    }
    const actions = await normalizeActions(_actionFunctions)();
    const preTxActions: Action[] = [];
    const value = 0;

    const script = encodeCallScript(actions);

    return { action: { to: this.#safe, data: encodeActCall("forward(bytes)", [script]) , value }, preTxActions };
  }

  async forward(
    actions: ActionFunction[] | ((evm: EVMcrispr) => ActionFunction),
    options?: { gasPrice?: BigNumberish; gasLimit?: BigNumberish }
  ): Promise<providers.TransactionReceipt> {
    const { action, preTxActions } = await this.encode(actions);
    // Execute pretransactions actions
    for (const action of preTxActions) {
      await (
        await this.#signer.sendTransaction({
          ...action,
          gasPrice: options?.gasPrice,
          gasLimit: options?.gasLimit,
        })
      ).wait();
    }

    return (
      await this.#signer.sendTransaction({
        ...action,
        gasPrice: options?.gasPrice,
        gasLimit: options?.gasLimit,
      })
    ).wait();
  }

  #resolveEntity(entity: Entity): Address {
    switch (entity) {
      case "ETH":
      case "XDAI":
      case "ZERO_ADDRESS":
        return ethers.constants.AddressZero;
      default:
        return utils.isAddress(entity) ? entity : entity; // TODO: Search entity by name
    }
  }

  #resolveNumber(number: string | number): BigNumber | number {
    if (typeof number === "string") {
      const [, amount, decimals = "0", unit] = number.match(/^(\d*(?:\.\d*)?)(?:e(\d+))?([s|m|h|d|w|y]?)$/) || ["0", "0"];
      return toDecimals(amount, parseInt(decimals)).mul(timeUnits[unit] ?? 1);
    }
    return number;
  }

  #resolveBoolean(boolean: string | boolean): boolean {
    if (typeof boolean === "string") {
      if (boolean === "false") {
        return false;
      }
      if (boolean === "true") {
        return true;
      }
      throw new Error(`Parameter should be a boolean ("true" or "false"), "${boolean}" given.`);
    }
    return !!boolean;
  }

  #resolveParam(param: any, type: string): any {
    if (/\[\d*\]$/g.test(type)) {
      if (!Array.isArray(param)) {
        throw new Error(`Parameter ${type} should be an array, ${param} given.`);
      }
      return param.map((param: any[]) => this.#resolveParam(param, type.slice(0, type.lastIndexOf("["))));
    }
    if (type === "address") {
      return this.#resolveEntity(param);
    }
    if (/^u?int(\d)*$/.test(type)) {
      return this.#resolveNumber(param);
    }
    if (type === "bool") {
      return this.#resolveBoolean(param);
    }
    return param;
  }

  #resolveParams(params: any[], types: string[]): any[] {
    return params
      .map((param) => (param instanceof Function ? param() : param))
      .map((param, i) => this.#resolveParam(param, types[i]));
  }
}
