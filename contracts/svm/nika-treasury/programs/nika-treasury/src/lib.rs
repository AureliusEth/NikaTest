use anchor_lang::prelude::*;
use solana_program::keccak;

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
        user_id: String,
        token: String,
        amount_str: String,
        proof: Vec<[u8; 32]>
    ) -> Result<bool> {
        let state = &ctx.accounts.state;
        
        // Create leaf (must match backend format: userId:token:amount)
        // backend uses: `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`
        let leaf = hash_leaf(&user_id, &token, &amount_str);
        
        // Verify merkle proof
        let valid = verify_merkle_proof(&proof, state.merkle_root, leaf);
        
        // Emit event for easier testing
        emit!(ProofVerified {
            user_id: user_id.clone(),
            token: token.clone(),
            amount_str: amount_str.clone(),
            valid: valid,
        });
        
        Ok(valid)
    }

    pub fn view_root(ctx: Context<ViewRoot>) -> Result<[u8; 32]> {
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

// Hash leaf using keccak256 format: userId:token:amount (matches backend MerkleTreeService.createLeaf)
// Backend creates: `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`
fn hash_leaf(user_id: &str, token: &str, amount_str: &str) -> [u8; 32] {
    let data = format!("{}:{}:{}", user_id, token, amount_str);
    keccak::hash(data.as_bytes()).to_bytes()
}

fn verify_merkle_proof(proof: &[[u8; 32]], root: [u8; 32], leaf: [u8; 32]) -> bool {
    
    let mut computed_hash = leaf;
    
    for proof_element in proof {
        let combined = if computed_hash <= *proof_element {
            [computed_hash, *proof_element].concat()
        } else {
            [*proof_element, computed_hash].concat()
        };
        
        computed_hash = keccak::hash(&combined).to_bytes();
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
    pub user_id: String,
    pub token: String,
    pub amount_str: String,
    pub valid: bool,
}
