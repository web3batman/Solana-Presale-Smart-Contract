use {
    anchor_lang::prelude::*,
    anchor_spl::{
        token,
        associated_token,
    },
};

use crate::state::PresaleInfo;
use crate::constants::PRESALE_SEED;
use crate::errors::PresaleError;

pub fn withdraw_token(
    ctx: Context<WithdrawToken>,
    amount: u64,
    bump: u8
) -> Result<()> {
    let presale_info = &mut ctx.accounts.presale_info;

    if presale_info.deposit_token_amount < amount {
        return Err(PresaleError::InsufficientFund.into());
    }

    presale_info.deposit_token_amount = presale_info.deposit_token_amount - amount;

    msg!("Transferring presale tokens to buyer {}...", &ctx.accounts.admin_authority.key());
    msg!("Mint: {}", &ctx.accounts.mint_account.to_account_info().key());   
    msg!("From Token Address: {}", &ctx.accounts.presale_associated_token_account.key());     
    msg!("To Token Address: {}", &ctx.accounts.admin_associated_token_account.key());     
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.presale_associated_token_account.to_account_info(),
                to: ctx.accounts.admin_associated_token_account.to_account_info(),
                authority: ctx.accounts.presale_info.to_account_info(),
            },
            &[&[PRESALE_SEED, &[bump]][..]],
        ),
        amount,
    )?;

    msg!("Withdrew presale tokens successfully.");

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    bump: u8
)]
pub struct WithdrawToken<'info> {
    // Presale token accounts
    #[account(mut)]
    pub mint_account: Box<Account<'info, token::Mint>>,
    
    #[account(
        mut,
        associated_token::mint = presale_token_mint_account,
        associated_token::authority = admin_authority,
    )]
    pub admin_associated_token_account: Account<'info, token::TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = presale_token_mint_account,
        associated_token::authority = presale_info,
    )]
    pub presale_associated_token_account: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    pub presale_token_mint_account: Account<'info, token::Mint>,

    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,
    
    // pub presale_authority: SystemAccount<'info>,
    
    // #[account(
        // mut,
        // constraint = admin_authority.key() == presale_info.authority.key()
    // )]
    pub admin_authority: Signer<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}