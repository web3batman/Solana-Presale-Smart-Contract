use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct UserInfo {
    // Buy quote amount
    pub buy_quote_amount: u64,
    // Buy token amount
    pub buy_token_amount: u64,
    // Buy time
    pub buy_time: u64,
    // claim amount
    // pub claim_amount: u64,
    // claim time
    pub claim_time: u64,
}