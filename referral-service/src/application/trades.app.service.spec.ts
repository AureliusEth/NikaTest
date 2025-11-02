import { TradesAppService } from './trades.app.service';
import type { IdempotencyStore, LedgerRepository, ReferralRepository, TradesRepository, UserRecord, UserRepository } from './ports/repositories';

class InMemTrades implements TradesRepository { public trades:any[]=[]; async createTrade(id:string, userId:string, fee:number){ this.trades.push({id,userId,fee}); } }
class InMemIdem implements IdempotencyStore { private s=new Set<string>(); async exists(k:string){return this.s.has(k);} async put(k:string){this.s.add(k);} }
class InMemUsers implements UserRepository { constructor(private u:Record<string,UserRecord>){ } async findById(id:string){ return this.u[id]||null;} async findByReferralCode(){return null as any} async createOrGetReferralCode(){ return 'x'; } }
class InMemRef implements ReferralRepository { constructor(private map:Record<string,string>={}){} async getAncestors(uid:string){ const a:string[]=[]; let cur=this.map[uid]; while(cur){ a.push(cur); cur=this.map[cur]; } return a; } async hasReferrer(){return false} async createLink(){ } async getDirectReferees(){ return []; } }
class InMemLedger implements LedgerRepository { public entries:any[]=[]; async recordEntries(e:any[]){ this.entries.push(...e);} async getEarningsSummary(){ return { total:0, byLevel:{} as any}; } }

describe('TradesAppService', () => {
  it('writes ledger entries for cashback and uplines and is idempotent', async () => {
    const trades = new InMemTrades();
    const idem = new InMemIdem();
    const ledger = new InMemLedger();
    const users = new InMemUsers({ U: { id:'U', feeCashbackRate: 0.1 } as any });
    const ref = new InMemRef({ U: 'A1' });
    const svc = new TradesAppService(trades as any, idem as any, ledger as any, ref as any, users as any);

    await svc.processTrade({ tradeId: 't1', userId: 'U', feeAmount: 100, token: 'XP' });
    expect(ledger.entries.length).toBe(2); // cashback + level1
    const cashback = ledger.entries.find(e=>e.level===0);
    const l1 = ledger.entries.find(e=>e.level===1);
    expect(cashback.amount).toBeCloseTo(10);
    expect(l1.amount).toBeCloseTo(30);

    // idempotent
    await svc.processTrade({ tradeId: 't1', userId: 'U', feeAmount: 100, token: 'XP' });
    expect(ledger.entries.length).toBe(2);
  });
});




