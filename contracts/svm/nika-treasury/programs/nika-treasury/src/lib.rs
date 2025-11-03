use anchor_lang::prelude::*;

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
        
        // Emit event for easier testing
        emit!(ProofVerified {
            user: user,
            amount: amount,
            valid: valid,
        });
        
        Ok(valid)
    }
    pub fn viewRoot(ctx: Context<ViewRoot>) -> Result<[u8; 32]> {
        let state = &ctx.accounts.state;
        Ok(state.merkle_root)
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
#[account]
pub struct State {
    pub merkle_root: [u8; 32],
    pub version: u64,
    pub authority: Pubkey,
}
impl State {
    pub const LEN: usize =  32 + 8 + 32;
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

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
}

#[event]
pub struct ProofVerified {
    pub user: Pubkey,
    pub amount: u64,
    pub valid: bool,
}