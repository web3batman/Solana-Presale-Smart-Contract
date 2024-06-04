use {
    anchor_lang::{prelude::*, system_program},
    anchor_spl::{
        token,
        associated_token,
    },
};

use crate::state::PresaleInfo;
use crate::constants::PRESALE_SEED;

pub fn withdraw_sol(
    ctx: Context<WithdrawSol>, 
    amount: u64,
    bump: u8
) -> Result<()> {

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(), 
            system_program::Transfer {
                from: ctx.accounts.presale_info.to_account_info(),
                to: ctx.accounts.admin.to_account_info(),
            },
            &[&[PRESALE_SEED, ctx.accounts.presale_authority.key().as_ref(), &[bump]][..]],
        )
        ,amount
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    bump: u8
)]
pub struct WithdrawSol<'info> {

    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,
    
    pub presale_authority: SystemAccount<'info>,
    
    #[account(constraint = admin.key() == admin_authority.key())]
    pub admin_authority: SystemAccount<'info>,
    
    #[account(
        mut,
        constraint = admin.key() == presale_info.authority
    )]
    pub admin: Signer<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
}