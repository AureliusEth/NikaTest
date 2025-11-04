import { ReferralService } from '../../infrastructure/services/referral.service';
import { ReferralRepository } from '../../application/ports/repositories';

class InMemoryReferralRepo implements ReferralRepository {
  // map refereeId -> referrerId
  private links = new Map<string, string>();

  constructor(initial: Array<{ referrerId: string; refereeId: string }>) {
    for (const l of initial) this.links.set(l.refereeId, l.referrerId);
  }

  async getAncestors(userId: string, maxLevels: number): Promise<string[]> {
    const ancestors: string[] = [];
    let current: string | undefined = this.links.get(userId);
    while (current && ancestors.length < maxLevels) {
      ancestors.push(current);
      current = this.links.get(current);
    }
    return ancestors;
  }

  async hasReferrer(userId: string): Promise<boolean> {
    return this.links.has(userId);
  }

  async createLink(referrerId: string, refereeId: string, level: number): Promise<void> {
    this.links.set(refereeId, referrerId);
  }

  async getDirectReferees(userId: string): Promise<string[]> {
    const referees: string[] = [];
    for (const [refereeId, referrerId] of this.links.entries()) {
      if (referrerId === userId) {
        referees.push(refereeId);
      }
    }
    return referees;
  }
}

describe('ReferralService', () => {
  it('rejects self-referral', async () => {
    const repo = new InMemoryReferralRepo([]);
    const svc = new ReferralService(repo);
    await expect(svc.computeLevelOrThrow('U', 'U')).rejects.toThrow('Cannot self-refer');
  });

  it('rejects when user already has referrer', async () => {
    const repo = new InMemoryReferralRepo([{ referrerId: 'A', refereeId: 'U' }]);
    const svc = new ReferralService(repo);
    await expect(svc.computeLevelOrThrow('U', 'B')).rejects.toThrow('Referrer already set');
  });

  it('detects cycles', async () => {
    // U is an ancestor of A (A <- B <- U). Attempting U -> A would create a cycle.
    const repo = new InMemoryReferralRepo([
      { referrerId: 'U', refereeId: 'B' },
      { referrerId: 'B', refereeId: 'A' },
    ]);
    const svc = new ReferralService(repo);
    await expect(svc.computeLevelOrThrow('U', 'A')).rejects.toThrow('Cycle detected');
  });

  it('computes level based on referrer depth and enforces ≤3', async () => {
    // root <- A <- B <- C ; referrer=C has depth 3 (A,B,root?), effectively ancestors length 3
    const repo = new InMemoryReferralRepo([
      { referrerId: 'root', refereeId: 'A' },
      { referrerId: 'A', refereeId: 'B' },
      { referrerId: 'B', refereeId: 'C' },
    ]);
    const svc = new ReferralService(repo);
    // New link D -> C would be level 4 (ancestors of C length=3) -> reject
    await expect(svc.computeLevelOrThrow('D', 'C')).rejects.toThrow('Depth exceeds 3 levels');

    // New link X -> B is allowed (ancestors of B: [A, root] => level=3)
    await expect(svc.computeLevelOrThrow('X', 'B')).resolves.toBe(3);
  });
});


