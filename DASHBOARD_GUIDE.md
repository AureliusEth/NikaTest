# Dashboard Feature Guide

## Overview

This guide explains the new dashboard feature that displays user XP, referral earnings, and trade activity in an elegant, comprehensive interface.

## Features Implemented

### 1. Dashboard UI (`/dashboard`)

The dashboard provides a comprehensive view of:

- **Total XP Earned**: Prominently displayed at the top with a gradient background
- **Key Metrics**: 
  - Total Referrals count
  - Active Traders (users who have made trades)
  - Recent Activity count
- **Referrals Table**: Shows all referred users with:
  - User ID
  - Referral Level (1, 2, or 3) with commission rate
  - Number of trades
  - Total XP earned from that user
  - Percentage contribution to total earnings (with visual progress bar)
- **Activity Feed**: Real-time feed of recent trades showing:
  - Trader ID
  - Level indicator
  - Trade fee amount
  - XP earned from that trade
  - Relative time (e.g., "2h ago")

### 2. Backend API Endpoints

#### GET `/api/referral/dashboard`
Returns comprehensive dashboard data including:
```json
{
  "totalXP": 1234.56,
  "referrals": [
    {
      "userId": "USER_001",
      "level": 1,
      "totalEarned": 150.00,
      "tradeCount": 5,
      "percentage": 12.14
    }
  ]
}
```

#### GET `/api/referral/activity`
Returns recent trade activity:
```json
[
  {
    "tradeId": "TRADE_123",
    "userId": "USER_001",
    "feeAmount": 100.00,
    "earnedAmount": 30.00,
    "level": 1,
    "createdAt": "2025-11-02T10:30:00Z"
  }
]
```

### 3. Mock Data Generation

#### Comprehensive Mock Script
Use the new script to generate realistic test data:

```bash
cd referral-service
npm run mock-comprehensive
```

This script:
- Creates a multi-level referral network (up to 3 levels)
- Generates users at each referral level
- Creates multiple trades from different users
- Simulates realistic trading patterns

Options:
```bash
# Generate with custom settings
npm run mock-comprehensive -- --users=20 --trades=50

# Default: 15 users, 40 trades
npm run mock-comprehensive
```

## Database Structure

All trades are stored in the `Trade` table:
```sql
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feeAmount" DECIMAL(18,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);
```

Commission ledger entries track earnings:
```sql
CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sourceTradeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'XP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);
```

## Usage Flow

### For Testing

1. **Start the services**:
   ```bash
   # Terminal 1 - Backend
   cd referral-service
   npm run start:dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Generate mock data**:
   ```bash
   cd referral-service
   npm run mock-comprehensive
   ```

3. **View the dashboard**:
   - Open browser to `http://localhost:3001` (or your frontend port)
   - Click "Dashboard" link
   - Use the Root User ID shown in the mock script output

### For Users

1. **Access Dashboard**: Navigate to `/dashboard` from the home page
2. **View XP**: See total XP earned prominently at the top
3. **Monitor Referrals**: See all referred users and their contribution
4. **Track Activity**: View recent trades in real-time

## Design Highlights

- **Elegant UI**: Clean, modern interface with card-based layout
- **Color-coded Levels**: 
  - Level 1: Purple (30% commission)
  - Level 2: Blue (3% commission)
  - Level 3: Green (2% commission)
- **Visual Progress Bars**: Show each referral's contribution percentage
- **Responsive Design**: Works on all screen sizes
- **Real-time Updates**: Fetches latest data on load

## Technical Architecture

### Frontend
- React components with TypeScript
- Hexagonal architecture (Ports & Adapters)
- Custom hooks for data fetching (`useDashboard`, `useActivity`)
- Tailwind CSS for styling

### Backend
- NestJS framework
- Prisma ORM for database access
- Clean architecture with repository pattern
- Efficient SQL queries with joins for performance

## Commission Rates

- **Level 1** (Direct Referrals): 30% of trade fees
- **Level 2** (2nd Level): 3% of trade fees
- **Level 3** (3rd Level): 2% of trade fees

## Performance Considerations

- Database queries are optimized with indexes
- Activity feed limited to 50 most recent entries
- Efficient SQL joins reduce number of database calls
- Frontend caching prevents unnecessary re-fetches

## Future Enhancements

Potential improvements:
- Real-time updates via WebSockets
- Filtering and sorting options
- Export functionality for reports
- Date range filters
- Chart visualizations for earnings over time
- Pagination for large datasets

