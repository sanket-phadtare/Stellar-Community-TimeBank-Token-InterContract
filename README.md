# Stellar Powered Community Time-Bank

A production-ready Stellar Soroban dApp featuring a Community Time Bank with a custom TIME token, inter-contract calls for escrow-based service booking, real-time event streaming, and mobile-responsive UI.

---

## Live Demo

 **https://stellar-community-time-bank-token-i.vercel.app/**

---

## Demo Video

 **https://youtu.be/7Yo_hBKsA98**

---

## Screenshots

### Desktop View
<img width="1918" height="876" alt="1" src="https://github.com/user-attachments/assets/fe03dad5-b827-415e-8317-51cf4f4c92d6" />


### Mobile Responsive View
<img width="572" height="1280" alt="mobile-responsive" src="https://github.com/user-attachments/assets/2e30411b-778d-47b2-818e-77df0743fd65" />


### CI/CD Pipeline Running
<img width="1918" height="875" alt="2" src="https://github.com/user-attachments/assets/1ac26429-a0e6-4efc-9e3e-9bf8f6d9f607" />


---

## Architecture

This project uses **two Soroban smart contracts** that communicate via inter-contract calls:

```
┌─────────────────────────────────┐
│     Time Bank Contract          │
│  CD7THTFWVFCBB5AZILYFGRUTJQ... │
│                                 │
│  register_user() ──────────────►│─── mint(user, 5) ──────────►┐
│  book_service()  ──────────────►│─── transfer_from() ─────────►│
│  confirm_completion() ─────────►│─── transfer_escrow() ────────►│
└─────────────────────────────────┘                              │
                                                                 ▼
                                              ┌──────────────────────────────┐
                                              │     TIME Token Contract      │
                                              │  CA64CKMJHBS6OIMEIQC2ZDL... │
                                              │                              │
                                              │  • mint()                    │
                                              │  • transfer()                │
                                              │  • transfer_from()           │
                                              │  • transfer_escrow()         │
                                              │  • balance()                 │
                                              └──────────────────────────────┘
```

---

## Requirements Met

| Requirement | Status | Details |
|---|---|---|
| Inter-contract calls | ✅ | Time Bank calls Token contract for mint, transfer, escrow |
| Custom token deployed | ✅ | TIME token — `CA64CK...LE5GO` |
| CI/CD running | ✅ | GitHub Actions — builds on every push to main |
| Mobile responsive | ✅ | Panels stack on mobile, optimized layout |
| 8+ meaningful commits | ✅ | See commit history |

---

## Contract Addresses

### Time Bank Contract
```
CAHQ26CKRI4T5T7KDFC7DIFCZKQKZ2G5QWH5UFOPTAMDHUEMD35WYMOT
```
 [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAHQ26CKRI4T5T7KDFC7DIFCZKQKZ2G5QWH5UFOPTAMDHUEMD35WYMOT)

### TIME Token Contract
```
CBGPTFRXPEZG776XIRMDCTALFDVRXBMQO5RQ5K2JYKMGLD2UDHP2EWL5
```
 [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBGPTFRXPEZG776XIRMDCTALFDVRXBMQO5RQ5K2JYKMGLD2UDHP2EWL5)

---

## Inter-Contract Call Transaction Hashes

| Action | Transaction Hash |
|---|---|
| Time Bank Initialize | `ae337bc2e08c6d5f4433c4268fb6ce29644779c5b6bac0e913281642b5200d93` |
| Token Initialize | `6dad83e803a55fef32afad2f255eac0efdfda27899ebe9d1e601e5a31b7f03fb` |

[View Initialize TX](https://stellar.expert/explorer/testnet/tx/ae337bc2e08c6d5f4433c4268fb6ce29644779c5b6bac0e913281642b5200d93)

---

## Custom TIME Token

| Property | Value |
|---|---|
| Name | TimeToken |
| Symbol | TIME |
| Decimals | 0 |
| Contract | `CBGPTFRXPEZG776XIRMDCTALFDVRXBMQO5RQ5K2JYKMGLD2UDHP2EWL5` |
| Network | Stellar Testnet |

### Token Functions
- `mint(to, amount)` — mints TIME tokens (called by Time Bank on registration)
- `transfer(from, to, amount)` — standard transfer with auth
- `transfer_from(spender, from, to, amount)` — allowance-based transfer for escrow
- `transfer_escrow(from, to, amount)` — escrow release without auth (Time Bank internal)
- `balance(id)` — read token balance
- `approve(from, spender, amount)` — set spending allowance

---

## How It Works

### Real World Flow

1. **Alice registers** → Time Bank calls `mint()` on Token contract → Alice receives **5 TIME**
2. **Alice lists a service** → "Guitar Lessons · 2 TIME" stored on-chain
3. **Bob registers** → receives **5 TIME**
4. **Bob books Alice's service** → Bob approves Time Bank to spend 2 TIME → Time Bank calls `transfer_from()` → **2 TIME locked in escrow**
5. **Alice teaches Bob** → real world interaction
6. **Bob confirms completion** → Time Bank calls `transfer_escrow()` → **2 TIME released to Alice**

### Inter-Contract Calls
Every booking and registration triggers cross-contract calls between the Time Bank and Token contracts on Stellar Testnet — verifiable on Stellar Expert explorer.

---

## CI/CD Pipeline

GitHub Actions runs on every push to `main`:

```yaml
✅ Checkout code
✅ Setup Node.js 20
✅ Install dependencies  
✅ Build project (Vite)
```

🔗 [View Actions](https://github.com/your-username/Stellar-TimeBank-Token-InterContract/actions)

---

## Mobile Responsive Design

- Panels stack vertically on mobile screens
- Stats panel hidden on mobile for cleaner UX
- Contract/address pills hidden on small screens
- Full functionality maintained on all screen sizes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust + Soroban SDK v25 |
| Frontend | React + Vite |
| Wallet | Freighter |
| Blockchain | Stellar Testnet |
| Real-time Events | Stellar RPC `getEvents` polling |
| Deployment | Vercel |
| CI/CD | GitHub Actions |

---

## Project Structure

```
├── community-timebank/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityFeed.jsx     # Real-time event streaming
│   │   │   ├── ServiceBoard.jsx     # Services + bookings + confirm
│   │   │   ├── OfferForm.jsx        # Post a service
│   │   │   └── WalletConnect.jsx    # Freighter wallet
│   │   ├── hooks/
│   │   │   └── useEventStream.js    # Polls Stellar RPC for events
│   │   ├── utils/
│   │   │   └── contract.js          # Soroban contract calls
│   │   └── context/
│   │       └── WalletContext.jsx    # Wallet state
│   └── .github/workflows/ci.yml    # GitHub Actions
│
└── time-bank-contract/          # Soroban smart contracts
    └── contracts/
        ├── time_bank/           # Main marketplace contract
        │   └── src/
        │       ├── lib.rs       # Core logic + inter-contract calls
        │       └── events.rs    # On-chain event definitions
        └── time_token/          # Custom TIME token contract
            └── src/
                └── lib.rs       # SEP-41 token implementation
```

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/your-username/Stellar-TimeBank-Token-InterContract.git

# Install frontend dependencies
cd community-timebank
npm install

# Set up environment variables
cp .env.example .env
# Fill in your contract addresses

# Run development server
npm run dev
```

### Environment Variables
```env
VITE_CONTRACT_ID=CAHQ26CKRI4T5T7KDFC7DIFCZKQKZ2G5QWH5UFOPTAMDHUEMD35WYMOT
VITE_TOKEN_CONTRACT_ID=CBGPTFRXPEZG776XIRMDCTALFDVRXBMQO5RQ5K2JYKMGLD2UDHP2EWL5
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Key Commits

| Commit | Description |
|---|---|
| `feat: initial Green Belt setup` | Project structure and base contracts |
| `feat: add TIME token SAC contract` | Custom Soroban token implementation |
| `feat: inter-contract calls in time bank` | Time Bank calls Token for mint/transfer |
| `feat: add ActivityFeed real-time events` | Live event streaming from Stellar RPC |
| `feat: add ServiceBoard with bookings` | Browse services + My Bookings tab |
| `feat: confirm completion escrow release` | Transfer escrow to provider on confirm |
| `feat: mobile responsive layout` | Stacking panels for mobile screens |
| `ci: add GitHub Actions CI/CD pipeline` | Automated build on push to main |

---

## Network

**Stellar Testnet** — All contracts deployed and verified on Stellar Testnet.

Fund your wallet at: [https://friendbot.stellar.org](https://friendbot.stellar.org)
