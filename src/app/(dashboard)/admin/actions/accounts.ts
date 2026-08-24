"use server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";

// Fetch all accounts and calculate running balances
export async function getAccounts(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const rows = await sql`
    SELECT id, name, type, bank_name, account_number, branch, initial_balance, created_at, is_company_account
    FROM admin_accounts
    ORDER BY created_at ASC
  `;

  const accounts = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    bankName: r.bank_name || "",
    accountNumber: r.account_number || "",
    branch: r.branch || "",
    initialBalance: parseFloat(r.initial_balance || "0"),
    createdAt: r.created_at,
    isCompanyAccount: r.is_company_account !== false,
    currentBalance: parseFloat(r.initial_balance || "0"),
    periodInflow: 0,
    periodOutflow: 0,
  }));

  if (accounts.length === 0) return accounts;

  const incomesAll = await sql`SELECT account_id, SUM(amount) as total FROM admin_incomes WHERE account_id IS NOT NULL GROUP BY account_id`;
  const expensesAll = await sql`SELECT account_id, SUM(amount) as total FROM admin_expenses WHERE account_id IS NOT NULL GROUP BY account_id`;
  const transfersOutAll = await sql`SELECT source_account_id as account_id, SUM(amount) as total FROM admin_transfers WHERE source_account_id IS NOT NULL GROUP BY source_account_id`;
  const transfersInAll = await sql`SELECT destination_account_id as account_id, SUM(amount) as total FROM admin_transfers WHERE destination_account_id IS NOT NULL GROUP BY destination_account_id`;

  const incomesPeriod = await sql`SELECT account_id, SUM(amount) as total FROM admin_incomes WHERE account_id IS NOT NULL AND date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp GROUP BY account_id`;
  const expensesPeriod = await sql`SELECT account_id, SUM(amount) as total FROM admin_expenses WHERE account_id IS NOT NULL AND date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp GROUP BY account_id`;
  const transfersOutPeriod = await sql`SELECT source_account_id as account_id, SUM(amount) as total FROM admin_transfers WHERE source_account_id IS NOT NULL AND date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp GROUP BY source_account_id`;
  const transfersInPeriod = await sql`SELECT destination_account_id as account_id, SUM(amount) as total FROM admin_transfers WHERE destination_account_id IS NOT NULL AND date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp GROUP BY destination_account_id`;

  const toDict = (arr: any[]) => arr.reduce((acc, row) => ({ ...acc, [row.account_id]: parseFloat(row.total || "0") }), {});
  
  const incAllMap = toDict(incomesAll);
  const expAllMap = toDict(expensesAll);
  const trOutAllMap = toDict(transfersOutAll);
  const trInAllMap = toDict(transfersInAll);

  const incPerMap = toDict(incomesPeriod);
  const expPerMap = toDict(expensesPeriod);
  const trOutPerMap = toDict(transfersOutPeriod);
  const trInPerMap = toDict(transfersInPeriod);

  for (const acc of accounts) {
    const id = acc.id;
    acc.currentBalance += (incAllMap[id] || 0) + (trInAllMap[id] || 0);
    acc.currentBalance -= (expAllMap[id] || 0) + (trOutAllMap[id] || 0);
    acc.periodInflow = (incPerMap[id] || 0) + (trInPerMap[id] || 0);
    acc.periodOutflow = (expPerMap[id] || 0) + (trOutPerMap[id] || 0);
  }

  return accounts;
}

export async function createAccount(data: { name: string; type: string; bankName?: string; accountNumber?: string; branch?: string; initialBalance: number }) {
  await sql`
    INSERT INTO admin_accounts (name, type, bank_name, account_number, branch, initial_balance, is_company_account)
    VALUES (${data.name}, ${data.type}, ${data.bankName || null}, ${data.accountNumber || null}, ${data.branch || null}, ${data.initialBalance || 0}, ${data.isCompanyAccount !== false})
  `;
  await logSystemAction(`Created account "${data.name}"`);
}

export async function updateAccount(id: number, data: { name: string; type: string; bankName?: string; accountNumber?: string; branch?: string; isCompanyAccount?: boolean }) {
  await sql`
    UPDATE admin_accounts 
    SET name = ${data.name}, type = ${data.type}, bank_name = ${data.bankName || null}, account_number = ${data.accountNumber || null}, branch = ${data.branch || null}, is_company_account = ${data.isCompanyAccount !== false}
    WHERE id = ${id}
  `;
  await logSystemAction(`Updated account ID ${id}`);
}

export async function deleteAccount(id: number) {
  await sql`DELETE FROM admin_accounts WHERE id = ${id}`;
  await logSystemAction(`Deleted account ID ${id}`);
}

export async function transferCash(data: { date: string; sourceAccountId: number; destinationAccountId: number; amount: number; description: string }) {
  await sql`
    INSERT INTO admin_transfers (date, source_account_id, destination_account_id, amount, description)
    VALUES (${data.date}, ${data.sourceAccountId}, ${data.destinationAccountId}, ${data.amount}, ${data.description})
  `;
  await logSystemAction(`Transferred LKR ${data.amount}`);
}

export async function getLedger(accountId: number | null, startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  let transactions;
  if (accountId) {
    transactions = await sql`
      WITH unified AS (
        SELECT date, description, 'Income' as ref_type, id as ref_id, account_id, NULL::integer as related_account_id, amount as debit, 0 as credit
        FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Expense' as ref_type, id as ref_id, account_id, NULL::integer as related_account_id, 0 as debit, amount as credit
        FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Transfer Out' as ref_type, id as ref_id, source_account_id as account_id, destination_account_id as related_account_id, 0 as debit, amount as credit
        FROM admin_transfers WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Transfer In' as ref_type, id as ref_id, destination_account_id as account_id, source_account_id as related_account_id, amount as debit, 0 as credit
        FROM admin_transfers WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      )
      SELECT * FROM unified WHERE account_id = ${accountId} ORDER BY date ASC
    `;
  } else {
    transactions = await sql`
      WITH unified AS (
        SELECT date, description, 'Income' as ref_type, id as ref_id, account_id, NULL::integer as related_account_id, amount as debit, 0 as credit
        FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Expense' as ref_type, id as ref_id, account_id, NULL::integer as related_account_id, 0 as debit, amount as credit
        FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Transfer Out' as ref_type, id as ref_id, source_account_id as account_id, destination_account_id as related_account_id, 0 as debit, amount as credit
        FROM admin_transfers WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
        UNION ALL
        SELECT date, description, 'Transfer In' as ref_type, id as ref_id, destination_account_id as account_id, source_account_id as related_account_id, amount as debit, 0 as credit
        FROM admin_transfers WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      )
      SELECT * FROM unified ORDER BY date ASC
    `;
  }

  return transactions.map((t: any) => ({
    date: new Date(t.date).toISOString().split('T')[0],
    description: t.description || "",
    referenceType: t.ref_type,
    referenceId: t.ref_id,
    accountId: t.account_id,
    relatedAccountId: t.related_account_id,
    debit: parseFloat(t.debit || "0"),
    credit: parseFloat(t.credit || "0"),
  }));
}
