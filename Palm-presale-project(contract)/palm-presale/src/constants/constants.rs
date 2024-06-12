use anchor_lang::prelude::*;

#[constant]
pub const PRESALE_SEED: &[u8] = b"PRESALE_SEED";
pub const USER_SEED: &[u8] = b"USER_SEED";
pub const PRESALE_VAULT: &[u8] = b"PRESALE_VAULT";
pub const RENT_MINIMUM: u64 = 1_000_000;