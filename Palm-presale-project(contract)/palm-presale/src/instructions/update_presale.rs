use anchor_lang::prelude::*;

use crate::state::PresaleInfo;
use crate::constants::PRESALE_SEED;

// Edit the details for a presale
pub fn update_presale(
    ctx: Context<UpdatePresale>,
    max_token_amount_per_address: u64,
    price_per_token: u64,
    softcap_amount: u64,
    hardcap_amount: u64,
    start_time: u64,
    end_time: u64,
) -> Result<()> {
    
    let presale_info = &mut ctx.accounts.presale_info;
    presale_info.max_token_amount_per_address = max_token_amount_per_address;
    presale_info.price_per_token = price_per_token;
    presale_info.softcap_amount = softcap_amount;
    presale_info.hardcap_amount = hardcap_amount;
    presale_info.start_time = start_time;
    presale_info.end_time = end_time;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePresale<'info> {
    // presale_detils account
    #[account(
        mut,
        seeds = [PRESALE_SEED],
        bump
    )]
    pub presale_info: Box<Account<'info, PresaleInfo>>,
    
    // Set the authority to the transaction signer
    #[account(
        mut,
        constraint = authority.key() == presale_info.authority
    )]
    pub authority: Signer<'info>,
    
    // Must be included when initializing an account
    pub system_program: Program<'info, System>,
}