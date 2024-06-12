use anchor_lang::{prelude::*, system_program};

use crate::constants::{PRESALE_SEED, PRESALE_VAULT};
use crate::state::PresaleInfo;

pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64, bump: u8) -> Result<()> {
    msg!("Vault: {:?} Send Amount {:?}", ctx.accounts.presale_vault.to_account_info().lamports(), amount);
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.presale_vault.to_account_info(),
                to: ctx.accounts.admin.to_account_info(),
            },
            &[&[PRESALE_VAULT, /*ctx.accounts.presale_info.key().as_ref(),*/ &[bump]][..]],
        ),
        amount,
    )?;

    Ok(())
}

// pub fn withdraw_sol<'info>(
//     // source: AccountInfo<'info>,
//     // destination: AccountInfo<'info>,
//     // system_program: AccountInfo<'info>,
//     ctx: Context<WithdrawSol>,
//     signers: &[&[&[u8]]; 1],
//     amount: u64,
// ) -> ProgramResult {
//     let ix = solana_program::system_instruction::transfer(ctx.accounts.presale_vault.to_account_info().key, ctx.accoutnx.admin.to_account_info().key, amount);
//     invoke_signed(&ix, &[ctx.accounts.presale_vault.to_account_info().key, ctx.accoutnx.admin.to_account_info().key, system_program], signers)
// }

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    /// CHECK: 
    #[account(
        mut,
        seeds = [PRESALE_VAULT, /* presale_info.key().as_ref() */],
        bump
    )]
    pub presale_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = admin.key() == presale_info.authority
    )]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
