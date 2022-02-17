export type Address = string;
export type Identifier = string;
export type Entity = Identifier | Address;
export type ActionFunction = () => Promise<Action[]>;
export interface Action {
  /**
   * The recipient address.
   */
  to: string;
  /**
   * The encoded action. It can be conceived of as contract function calls.
   */
  data: string;
  /**
   * The ether which needs to be sent along with the action (in wei).
   */
  value?: number;
}
