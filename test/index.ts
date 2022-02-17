import { expect } from "chai";
import { ethers } from "hardhat";
import EVMcrispr from '../src/main'

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const evm = EVMcrispr.create("0x", (await ethers.getSigners())[0]);
    expect(1).to.be.eq(1);
  });
});
