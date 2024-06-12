use anchor_lang::system_program;
// use solana_program::program::invoke;

use {
    anchor_lang::prelude::*,
    anchor_spl::{associated_token, token},
};

// use solana_program::rent::Rent;

use crate::constants::{PRESALE_SEED, PRESALE_VAULT, RENT_MINIMUM};
use crate::state::PresaleInfo;

pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
    let presale_info = &mut ctx.accounts.presale_info;

    // transfer token to the presaleAta
    msg!(
        "Mint: {}",
        &ctx.accounts.mint_account.to_account_info().key()
    );
    msg!(
        "From Token Address: {}",
        &ctx.accounts.from_associated_token_account.key()
    );
    msg!(
        "To Token Address: {}",
        &ctx.accounts.to_associated_token_account.key()
    );
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.from_associated_token_account.to_account_info(),
                to: ctx.accounts.to_associated_token_account.to_account_info(),
                authority: ctx.accounts.from_authority.to_account_info(),
            },
        ),
        amount,
    )?;

    // transfer Sol to the presaleVault
    msg!(
        "From Wallet Address: {}",
        &ctx.accounts.from_associated_token_account.key()
    );
    msg!(
        "To Wallet Address: {}",
        &ctx.accounts.to_associated_token_account.key()
    );
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.presale_vault.to_account_info(),
            },
        ),
        RENT_MINIMUM,
    )?;

    presale_info.deposit_token_amount = presale_info.deposit_token_amount + amount;

    msg!("Tokens deposited successfully.");

    Ok(())
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub mint_account: Account<'info, token::Mint>,

    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = from_authority,
    )]
    pub from_associated_token_account: Account<'info, token::TokenAccount>,

    #[account(constraint = admin.key() == from_authority.key())]
    pub from_authority: Signer<'info>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint_account,
        associated_token::authority = presale_info,
    )]
    pub to_associated_token_account: Account<'info, token::TokenAccount>,

    /// CHECK: This is not dangerous
    #[account(
        mut,
        // init,
        // payer = payer,
        seeds = [PRESALE_VAULT],
        bump,
        // space = 0
    )]
    pub presale_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    // #[account(mut)]
    // pub payer: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub admin: AccountInfo<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}
