import { ReferralAppService } from './referral.app.service';
import type { IdempotencyStore, LedgerRepository, ReferralRepository, UserRecord, UserRepository } from './ports/repositories';

class InMemUsers implements UserRepository {
  private users = new Map<string, UserRecord & { code?: string }>();
  constructor(init: Array<UserRecord & { code?: string }> = []) {
    for (const u of init) this.users.set(u.id, u);
  }
  async findById(userId: string) { return this.users.get(userId) || null; }
  async findByReferralCode(code: string) {
    for (const u of this.users.values()) if (u.code === code) return u;
    return null;
  }
  async createOrGetReferralCode(userId: string) {
    const u = this.users.get(userId);
    if (!u) throw new Error('missing user');
    if (!u.code) { u.code = `ref_${userId}`; }
    return u.code!;
  }
}

class InMemRef implements ReferralRepository {
  private links = new Map<string, string>(); // referee -> referrer
  constructor(init: Array<{ referrerId: string; refereeId: string }> = []) { for (const l of init) this.links.set(l.refereeId, l.referrerId); }
  async getAncestors(userId: string, maxLevels: number) {
    const a: string[] = []; let cur = this.links.get(userId);
    while (cur && a.length < maxLevels) { a.push(cur); cur = this.links.get(cur); }
    return a;
  }
  async hasReferrer(userId: string) { return this.links.has(userId); }
  async createLink(referrerId: string, refereeId: string, level: number) { this.links.set(refereeId, referrerId); }
  async getDirectReferees(userId: string) { return [...this.links.entries()].filter(([k,v])=>v===userId).map(([k])=>k); }
}

class InMemLedger implements LedgerRepository {
  public entries: any[] = [];
  async recordEntries(e: any[]) { this.entries.push(...e); }
  async getEarningsSummary(userId: string) {
    const mine = this.entries.filter(x=>x.beneficiaryId===userId);
    const byLevel: Record<number, number> = {} as any; let total = 0;
    for (const m of mine) { byLevel[m.level] = (byLevel[m.level]||0)+m.amount; total+=m.amount; }
    return { total, byLevel };
  }
}

class NoopIdem implements IdempotencyStore { async exists(){return false;} async put(){}}

describe('ReferralAppService', () => {
  it('creates/gets referral code and registers by code', async () => {
    const users = new InMemUsers([
      { id: 'A', email: 'a@e', feeCashbackRate: 0, code: 'codeA' },
      { id: 'U', email: 'u@e', feeCashbackRate: 0 },
    ]);
    const ref = new InMemRef();
    const ledger = new InMemLedger();
    const svc = new ReferralAppService(users as any, ref as any, ledger as any, new NoopIdem() as any);

    const code = await svc.createOrGetReferralCode('U');
    expect(code).toBe('ref_U');

    // register U under A via codeA => level 1
    const res = await svc.registerReferralByCode('U', 'codeA');
    expect(res).toBe(1);
  });

  it('computes network and earnings via ports', async () => {
    const users = new InMemUsers([{ id: 'R', email: 'r@e', feeCashbackRate: 0 }]);
    const ref = new InMemRef([{ referrerId: 'R', refereeId: 'L1' }, { referrerId: 'L1', refereeId: 'L2' }]);
    const ledger = new InMemLedger();
    ledger.entries.push({ beneficiaryId: 'R', level: 1, amount: 3 });
    const svc = new ReferralAppService(users as any, ref as any, ledger as any, new NoopIdem() as any);

    const net = await svc.getNetwork('R');
    expect(net.level1).toContain('L1');
    expect(net.level2).toContain('L2');
    const earn = await svc.getEarnings('R');
    expect(earn.total).toBe(3);
    expect(earn.byLevel[1]).toBe(3);
  });
});




