use anchor_lang::prelude::*;

use crate::state::PresaleInfo;
use crate::constants::PRESALE_SEED;

// Edit the details for presale
pub fn start_presale(
    ctx: Context<StartPresale>,
    start_time: u64,
    end_time: u64
) -> Result<()> {

    let presale = &mut ctx.accounts.presale_info;

    // Set the presale details
    presale.is_live = true;
    presale.start_time = start_time;
    presale.end_time = end_time;

    msg!("Presale has started for token: {} at the time: {}", presale.token_mint_address, start_time);
    Ok(())
}

#[derive(Accounts)]
pub struct StartPresale<'info> {
    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,

    #[account(mut)]
    pub authority: Signer<'info>,
}