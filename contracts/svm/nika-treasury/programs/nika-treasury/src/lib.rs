use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB");

#[program]
pub mod nika_treasury {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, merkle_root: [u8; 32]) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.merkle_root = merkle_root;
        state.version = 0;
        state.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn update_root(ctx: Context<UpdateRoot>, new_root: [u8; 32]) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        state.merkle_root = new_root;
        state.version += 1;
        Ok(())
    }

    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        amount: u64,
        proof: Vec<[u8; 32]>
    ) -> Result<bool> {
        let state = &ctx.accounts.state;
        let user = ctx.accounts.user.key();
        
        // Create leaf
        let leaf = hash_leaf(user, amount);
        
        // Verify merkle proof
        let valid = verify_merkle_proof(&proof, state.merkle_root, leaf);
        
        Ok(valid)
    }

    pub fn viewRoot(ctx: Context<ViewRoot>) -> Result<[u8; 32]> {
        let state = &ctx.accounts.state;
        Ok(state.merkle_root)
    }

    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
        proof: Vec<[u8; 32]>
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let user = ctx.accounts.user.key();
        
        // Check if already claimed
        let claim_key = (state.version, user);
        require!(!ctx.accounts.state.claimed.contains_key(&claim_key), ErrorCode::AlreadyClaimed);
        
        // Verify proof
        let leaf = hash_leaf(user, amount);
        require!(verify_merkle_proof(&proof, state.merkle_root, leaf), ErrorCode::InvalidProof);
        
        // Mark as claimed
        ctx.accounts.state.claimed.insert(claim_key);
        
        // Transfer tokens
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        emit!(Claimed {
            user,
            amount,
            version: state.version,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ViewRoot<'info> {
    pub state: Account<'info, State>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + State::LEN)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRoot<'info> {
    #[account(mut, has_one = authority)]
    pub state: Account<'info, State>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyProof<'info> {
    pub state: Account<'info, State>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: This is safe because we're using it as a seed
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct State {
    pub merkle_root: [u8; 32],
    pub version: u64,
    pub authority: Pubkey,
    pub claimed: std::collections::HashSet<(u64, Pubkey)>,
}

impl State {
    pub const LEN: usize = 32 + 8 + 32 + 8; // merkle_root + version + authority + claimed size
}

fn hash_leaf(user: Pubkey, amount: u64) -> [u8; 32] {
    use solana_program::hash::hash;
    let data = format!("{}:{}", user, amount);
    hash(data.as_bytes()).to_bytes()
}

fn verify_merkle_proof(proof: &[[u8; 32]], root: [u8; 32], leaf: [u8; 32]) -> bool {
    use solana_program::hash::hash;
    
    let mut computed_hash = leaf;
    
    for proof_element in proof {
        let combined = if computed_hash <= *proof_element {
            [computed_hash, *proof_element].concat()
        } else {
            [*proof_element, computed_hash].concat()
        };
        
        computed_hash = hash(&combined).to_bytes();
    }
    
    computed_hash == root
}

#[event]
pub struct Claimed {
    pub user: Pubkey,
    pub amount: u64,
    pub version: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Invalid proof")]
    InvalidProof,
}
