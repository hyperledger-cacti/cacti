import { Context, Contract, Transaction } from "fabric-contract-api";

// Define objectType names for prefix
const balancePrefix: string = "balance";
const allowancePrefix: string = "allowance";

// Define key names for options
const nameKey: string = "name";
const symbolKey: string = "symbol";
const decimalsKey: string = "decimals";
const totalSupplyKey: string = "totalSupply";

class TokenERC20Contract extends Contract {
  /**
   * Return the name of the token - e.g. "MyToken".
   * The original function name is `name` in ERC20 specification.
   * However, 'name' conflicts with a parameter `name` in `Contract` class.
   * As a work around, we use `TokenName` as an alternative function name.
   *
   * @param {Context} ctx the transaction context
   * @returns {String} Returns the name of the token
   */
  async TokenName(ctx: Context): Promise<string> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const nameBytes = await ctx.stub.getState(nameKey);

    return nameBytes.toString();
  }

  /**
   * Return the symbol of the token. E.g. “HIX”.
   *
   * @param {Context} ctx the transaction context
   * @returns {String} Returns the symbol of the token
   */
  async Symbol(ctx: Context): Promise<string> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const symbolBytes = await ctx.stub.getState(symbolKey);
    return symbolBytes.toString();
  }

  /**
   * Return the number of decimals the token uses
   * e.g. 8, means to divide the token amount by 100000000 to get its user representation.
   *
   * @param {Context} ctx the transaction context
   * @returns {Number} Returns the number of decimals
   */
  async Decimals(ctx: Context): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const decimalsBytes = await ctx.stub.getState(decimalsKey);
    const decimals: number = parseInt(decimalsBytes.toString());
    return decimals;
  }

  /**
   * Return the total token supply.
   *
   * @param {Context} ctx the transaction context
   * @returns {Number} Returns the total token supply
   */
  async TotalSupply(ctx: Context): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const totalSupplyBytes = await ctx.stub.getState(totalSupplyKey);
    const totalSupply: number = parseInt(totalSupplyBytes.toString());
    return totalSupply;
  }

  /**
   * BalanceOf returns the balance of the given account.
   *
   * @param {Context} ctx the transaction context
   * @param {String} owner The owner from which the balance will be retrieved
   * @returns {Number} Returns the account balance
   */
  async BalanceOf(ctx: Context, owner: string): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const balanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      owner,
    ]);

    const balanceBytes = await ctx.stub.getState(balanceKey);
    if (!balanceBytes || balanceBytes.length === 0) {
      throw new Error(`the account ${owner} does not exist`);
    }
    const balance: number = parseInt(balanceBytes.toString());

    return balance;
  }

  /**
   *  Transfer transfers tokens from client account to recipient account.
   *  recipient account must be a valid clientID as returned by the ClientAccountID() function.
   *
   * @param {Context} ctx the transaction context
   * @param {String} to The recipient
   * @param {Integer} value The amount of token to be transferred
   * @returns {Boolean} Return whether the transfer was successful or not
   */
  async Transfer(ctx: Context, to: string, value: string): Promise<boolean> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const from: string = ctx.clientIdentity.getID();

    const transferResp: boolean = await this._transfer(ctx, from, to, value);
    if (!transferResp) {
      throw new Error("Failed to transfer");
    }

    // Emit the Transfer event
    const transferEvent = { from, to, value: parseInt(value) };
    ctx.stub.setEvent("Transfer", Buffer.from(JSON.stringify(transferEvent)));

    return true;
  }

  /**
   * Transfer `value` amount of tokens from `from` to `to`.
   *
   * @param {Context} ctx the transaction context
   * @param {String} from The sender
   * @param {String} to The recipient
   * @param {Integer} value The amount of token to be transferred
   * @returns {Boolean} Return whether the transfer was successful or not
   */
  async TransferFrom(
    ctx: Context,
    from: string,
    to: string,
    value: string,
  ): Promise<boolean> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const spender: string = ctx.clientIdentity.getID();

    // Retrieve the allowance of the spender
    const allowanceKey: string = ctx.stub.createCompositeKey(allowancePrefix, [
      from,
      spender,
    ]);
    const currentAllowanceBytes = await ctx.stub.getState(allowanceKey);

    if (!currentAllowanceBytes || currentAllowanceBytes.length === 0) {
      throw new Error(`spender ${spender} has no allowance from ${from}`);
    }

    const currentAllowance: number = parseInt(currentAllowanceBytes.toString());

    // Convert value from string to int
    const valueInt: number = parseInt(value);

    // Check if the transferred value is less than the allowance
    if (currentAllowance < valueInt) {
      throw new Error("The spender does not have enough allowance to spend.");
    }

    const transferResp: boolean = await this._transfer(ctx, from, to, value);
    if (!transferResp) {
      throw new Error("Failed to transfer");
    }

    // Decrease the allowance
    const updatedAllowance: number = this.sub(currentAllowance, valueInt);
    await ctx.stub.putState(
      allowanceKey,
      Buffer.from(updatedAllowance.toString()),
    );
    console.log(
      `spender ${spender} allowance updated from ${currentAllowance} to ${updatedAllowance}`,
    );

    // Emit the Transfer event
    const transferEvent = { from, to, value: valueInt };
    ctx.stub.setEvent("Transfer", Buffer.from(JSON.stringify(transferEvent)));

    console.log("transferFrom ended successfully");
    return true;
  }

  async _transfer(
    ctx: Context,
    from: string,
    to: string,
    value: string,
  ): Promise<boolean> {
    if (from === to) {
      throw new Error("cannot transfer to and from same client account");
    }

    // Convert value from string to int
    const valueInt: number = parseInt(value);

    if (valueInt < 0) {
      // transfer of 0 is allowed in ERC20, so just validate against negative amounts
      throw new Error("transfer amount cannot be negative");
    }

    // Retrieve the current balance of the sender
    const fromBalanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      from,
    ]);
    const fromCurrentBalanceBytes = await ctx.stub.getState(fromBalanceKey);

    if (!fromCurrentBalanceBytes || fromCurrentBalanceBytes.length === 0) {
      throw new Error(`client account ${from} has no balance`);
    }

    const fromCurrentBalance: number = parseInt(
      fromCurrentBalanceBytes.toString(),
    );

    // Check if the sender has enough tokens to spend.
    if (fromCurrentBalance < valueInt) {
      throw new Error(`client account ${from} has insufficient funds.`);
    }

    // Retrieve the current balance of the recepient
    const toBalanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      to,
    ]);
    const toCurrentBalanceBytes = await ctx.stub.getState(toBalanceKey);

    let toCurrentBalance: number;
    // If recipient current balance doesn't yet exist, we'll create it with a current balance of 0
    if (!toCurrentBalanceBytes || toCurrentBalanceBytes.length === 0) {
      toCurrentBalance = 0;
    } else {
      toCurrentBalance = parseInt(toCurrentBalanceBytes.toString());
    }

    // Update the balance
    const fromUpdatedBalance: number = this.sub(fromCurrentBalance, valueInt);
    const toUpdatedBalance: number = this.add(toCurrentBalance, valueInt);

    await ctx.stub.putState(
      fromBalanceKey,
      Buffer.from(fromUpdatedBalance.toString()),
    );
    await ctx.stub.putState(
      toBalanceKey,
      Buffer.from(toUpdatedBalance.toString()),
    );

    console.log(
      `client ${from} balance updated from ${fromCurrentBalance} to ${fromUpdatedBalance}`,
    );
    console.log(
      `recipient ${to} balance updated from ${toCurrentBalance} to ${toUpdatedBalance}`,
    );

    return true;
  }

  /**
   * Allows `spender` to spend `value` amount of tokens from the owner.
   *
   * @param {Context} ctx the transaction context
   * @param {String} spender The spender
   * @param {Integer} value The amount of tokens to be approved for transfer
   * @returns {Boolean} Return whether the approval was successful or not
   */
  @Transaction(true)
  async Approve(
    ctx: Context,
    spender: string,
    value: string,
  ): Promise<boolean> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const owner: string = ctx.clientIdentity.getID();

    const allowanceKey: string = ctx.stub.createCompositeKey(allowancePrefix, [
      owner,
      spender,
    ]);

    const valueInt: number = parseInt(value);
    await ctx.stub.putState(allowanceKey, Buffer.from(valueInt.toString()));

    // Emit the Approval event
    const approvalEvent = { owner, spender, value: valueInt };
    ctx.stub.setEvent("Approval", Buffer.from(JSON.stringify(approvalEvent)));

    console.log("approve ended successfully");
    return true;
  }

  /**
   * Returns the amount of tokens which `spender` is allowed to withdraw from `owner`.
   *
   * @param {Context} ctx the transaction context
   * @param {String} owner The owner of tokens
   * @param {String} spender The spender who are able to transfer the tokens
   * @returns {Number} Return the amount of remaining tokens allowed to spent
   */
  async Allowance(
    ctx: Context,
    owner: string,
    spender: string,
  ): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const allowanceKey: string = ctx.stub.createCompositeKey(allowancePrefix, [
      owner,
      spender,
    ]);

    const allowanceBytes = await ctx.stub.getState(allowanceKey);
    if (!allowanceBytes || allowanceBytes.length === 0) {
      throw new Error(`spender ${spender} has no allowance from ${owner}`);
    }

    const allowance: number = parseInt(allowanceBytes.toString());
    return allowance;
  }

  // ================== Extended Functions ==========================

  /**
   * Set optional infomation for a token.
   *
   * @param {Context} ctx the transaction context
   * @param {String} name The name of the token
   * @param {String} symbol The symbol of the token
   * @param {String} decimals The decimals of the token
   * @param {String} totalSupply The totalSupply of the token
   */
  async Initialize(
    ctx: Context,
    name: string,
    symbol: string,
    decimals: string,
  ): Promise<boolean> {
    // Check contract options are not already set, client is not authorized to change them once intitialized
    const nameBytes = await ctx.stub.getState(nameKey);
    console.log("nameBytes: ", nameBytes);
    if (nameBytes && nameBytes.length > 0) {
      throw new Error(
        "contract options are already set, client is not authorized to change them",
      );
    }

    await ctx.stub.putState(nameKey, Buffer.from(name));
    await ctx.stub.putState(symbolKey, Buffer.from(symbol));
    await ctx.stub.putState(decimalsKey, Buffer.from(decimals));

    console.log(`name: ${name}, symbol: ${symbol}, decimals: ${decimals}`);
    return true;
  }

  /**
   * Mint creates new tokens and adds them to minter's account balance
   *
   * @param {Context} ctx the transaction context
   * @param {Integer} amount amount of tokens to be minted
   * @returns {Object} The balance
   */
  @Transaction(true)
  async Mint(ctx: Context, amount: string): Promise<boolean> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    // Get ID of submitting client identity
    const minter: string = ctx.clientIdentity.getID();

    const amountInt: number = parseInt(amount);
    if (amountInt <= 0) {
      throw new Error("mint amount must be a positive integer");
    }

    const balanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      minter,
    ]);

    const currentBalanceBytes = await ctx.stub.getState(balanceKey);
    // If minter current balance doesn't yet exist, we'll create it with a current balance of 0
    let currentBalance: number;
    if (!currentBalanceBytes || currentBalanceBytes.length === 0) {
      currentBalance = 0;
    } else {
      currentBalance = parseInt(currentBalanceBytes.toString());
    }
    const updatedBalance: number = this.add(currentBalance, amountInt);

    await ctx.stub.putState(balanceKey, Buffer.from(updatedBalance.toString()));

    // Increase totalSupply
    const totalSupplyBytes = await ctx.stub.getState(totalSupplyKey);
    let totalSupply: number;
    if (!totalSupplyBytes || totalSupplyBytes.length === 0) {
      console.log("Initialize the tokenSupply");
      totalSupply = 0;
    } else {
      totalSupply = parseInt(totalSupplyBytes.toString());
    }
    totalSupply = this.add(totalSupply, amountInt);
    await ctx.stub.putState(
      totalSupplyKey,
      Buffer.from(totalSupply.toString()),
    );

    // Emit the Transfer event
    const transferEvent = { from: "0x0", to: minter, value: amountInt };
    ctx.stub.setEvent("Transfer", Buffer.from(JSON.stringify(transferEvent)));

    console.log(
      `minter account ${minter} balance updated from ${currentBalance} to ${updatedBalance}`,
    );
    return true;
  }

  /**
   * Burn redeem tokens from minter's account balance
   *
   * @param {Context} ctx the transaction context
   * @param {Integer} amount amount of tokens to be burned
   * @returns {Object} The balance
   */
  async Burn(ctx: Context, amount: string): Promise<boolean> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const minter: string = ctx.clientIdentity.getID();

    const amountInt: number = parseInt(amount);

    const balanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      minter,
    ]);

    const currentBalanceBytes = await ctx.stub.getState(balanceKey);
    if (!currentBalanceBytes || currentBalanceBytes.length === 0) {
      throw new Error("The balance does not exist");
    }
    const currentBalance: number = parseInt(currentBalanceBytes.toString());
    const updatedBalance: number = this.sub(currentBalance, amountInt);

    await ctx.stub.putState(balanceKey, Buffer.from(updatedBalance.toString()));

    // Decrease totalSupply
    const totalSupplyBytes = await ctx.stub.getState(totalSupplyKey);
    if (!totalSupplyBytes || totalSupplyBytes.length === 0) {
      throw new Error("totalSupply does not exist.");
    }
    const totalSupply: number = this.sub(
      parseInt(totalSupplyBytes.toString()),
      amountInt,
    );
    await ctx.stub.putState(
      totalSupplyKey,
      Buffer.from(totalSupply.toString()),
    );

    // Emit the Transfer event
    const transferEvent = { from: minter, to: "0x0", value: amountInt };
    ctx.stub.setEvent("Transfer", Buffer.from(JSON.stringify(transferEvent)));

    console.log(
      `minter account ${minter} balance updated from ${currentBalance} to ${updatedBalance}`,
    );
    return true;
  }

  /**
   * ClientAccountBalance returns the balance of the requesting client's account.
   *
   * @param {Context} ctx the transaction context
   * @returns {Number} Returns the account balance
   */
  @Transaction(false)
  async ClientAccountBalance(ctx: Context): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    // Get ID of submitting client identity
    const clientAccountID: string = ctx.clientIdentity.getID();

    const balanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [
      clientAccountID,
    ]);
    const balanceBytes = await ctx.stub.getState(balanceKey);
    if (!balanceBytes || balanceBytes.length === 0) {
      throw new Error(`the account ${clientAccountID} does not exist`);
    }
    const balance: number = parseInt(balanceBytes.toString());

    return balance;
  }

  /**
   * ClientIDAccountBalance returns the balance of the given client's account.
   * The clientID must be a valid clientID as returned by the ClientAccountID() function.
   * */
  @Transaction(false)
  async ClientIDAccountBalance(ctx: Context, id: string): Promise<number> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    const balanceKey: string = ctx.stub.createCompositeKey(balancePrefix, [id]);
    const balanceBytes = await ctx.stub.getState(balanceKey);
    if (!balanceBytes || balanceBytes.length === 0) {
      throw new Error(`the account ${id} does not exist`);
    }
    const balance: number = parseInt(balanceBytes.toString());

    return balance;
  }

  // ClientAccountID returns the id of the requesting client's account.
  // In this implementation, the client account ID is the clientId itself.
  // Users can use this function to get their own account id, which they can then give to others as the payment address
  async ClientAccountID(ctx: Context): Promise<string> {
    // Check contract options are already set first to execute the function
    await this.CheckInitialized(ctx);

    // Get ID of submitting client identity
    const clientAccountID: string = ctx.clientIdentity.getID();
    return clientAccountID;
  }

  // Checks that contract options have been already initialized
  async CheckInitialized(ctx: Context): Promise<void> {
    const nameBytes = await ctx.stub.getState(nameKey);

    if (!nameBytes || nameBytes.length === 0) {
      throw new Error(
        "contract options need to be set before calling any function, call Initialize() to initialize contract",
      );
    }
  }

  // add two number checking for overflow
  add(a: number, b: number): number {
    const c: number = a + b;
    if (a !== c - b || b !== c - a) {
      throw new Error(`Math: addition overflow occurred ${a} + ${b}`);
    }
    return c;
  }

  // add two number checking for overflow
  sub(a: number, b: number): number {
    const c: number = a - b;
    if (a !== c + b || b !== a - c) {
      throw new Error(`Math: subtraction overflow occurred ${a} - ${b}`);
    }
    return c;
  }
}

export default TokenERC20Contract;
