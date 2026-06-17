//! `cacti-test-program` — a minimal, self-contained Anchor program used ONLY by
//! the Solana connector's tests. It deliberately exercises the things the
//! connector's ABI layer needs to handle:
//!   - an instruction that initializes a PDA account (`initialize`)
//!   - an instruction that mutates it (`increment`)
//!   - args of different types (`u64`, `pubkey`)
//!   - an account schema to decode (`Counter`)
//!   - events to decode / stream (`Initialized`, `Incremented`)
//!
//! It has no dependency on any application program — the connector ships its own
//! test artifact, the same way the Ethereum connector ships HelloWorld.sol.

use anchor_lang::prelude::*;

declare_id!("4JfcF73r9QQ8pmL64UuzCTUt3cSACN2435BQJzWBSL5X");

#[program]
pub mod cacti_test_program {
    use super::*;

    /// Create the per-authority counter PDA and seed its value. Emits `Initialized`.
    pub fn initialize(ctx: Context<Initialize>, value: u64, label: Pubkey) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.authority.key();
        counter.value = value;
        counter.label = label;
        counter.bump = ctx.bumps.counter;
        emit!(Initialized {
            authority: counter.authority,
            value,
            label,
        });
        Ok(())
    }

    /// Increment the counter by `amount`. Emits `Incremented`.
    pub fn increment(ctx: Context<Increment>, amount: u64) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.value = counter.value.checked_add(amount).unwrap();
        emit!(Incremented {
            value: counter.value,
            amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Counter::INIT_SPACE,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump
    )]
    pub counter: Account<'info, Counter>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub authority: Pubkey,
    pub value: u64,
    pub label: Pubkey,
    pub bump: u8,
}

#[event]
pub struct Initialized {
    pub authority: Pubkey,
    pub value: u64,
    pub label: Pubkey,
}

#[event]
pub struct Incremented {
    pub value: u64,
    pub amount: u64,
}
