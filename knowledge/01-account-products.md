# NestBank Account Products

NestBank is a fictional bank used for learning. All figures below match the rules coded in the application.

## Basic Saver (code BASIC_SAVER)
- Account type: Savings
- Profit rate: 8.5% per year, paid monthly
- Minimum opening balance: Rs 1,000
- Daily withdrawal limit: Rs 50,000
- Includes a debit card and free SMS alerts. No cheque book.

## Student Saver (code STUDENT_SAVER)
- Cloned from Basic Saver with student-friendly changes.
- No minimum opening balance.
- Daily withdrawal limit: Rs 20,000.
- Profit rate: 8.5% per year.

## Freelancer Saver (code FREELANCER_SAVER)
- Designed for freelancers receiving foreign remittances.
- Profit rate: 9.25% per year.
- Daily withdrawal limit: Rs 200,000.
- International transfers are enabled and remittances are tracked for tax certificates.

## Business Current (code BUSINESS_CURRENT)
- Account type: Current. Current accounts earn no profit.
- Minimum opening balance: Rs 25,000.
- Daily withdrawal limit: Rs 1,000,000.
- Includes cheque book, debit card and unlimited transactions.

## 1-Year Term Deposit (code TERM_DEPOSIT_1Y)
- Account type: Fixed Deposit.
- Profit rate: 12% per year, compounded monthly.
- Minimum deposit: Rs 50,000.
- Withdrawals are not allowed before maturity (daily withdrawal limit is zero).

## Savings balances above Rs 1,000,000
Savings accounts use tiered profit: the part of the balance above Rs 1,000,000 earns an extra 1.5% per year on top of the normal rate.
