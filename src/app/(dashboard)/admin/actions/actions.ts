"use server";

import sql from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { put, del } from '@vercel/blob';
import { logSystemAction } from "@/lib/logger";
import { getGravatarUrl } from "@/lib/gravatar";
import { reactivateDomainAfterRenewalPayment } from "./domains-shared";
import { revalidatePath } from "next/cache";

export async function uploadReceipt(formData: FormData, type: 'income' | 'expenses'): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) {
    await logSystemAction(`Upload Error: No file provided for ${type} receipt`);
    throw new Error("No file uploaded");
  }

  try {
    const filename = `admin/receipts/${type}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const blob = await put(filename, file, {
      access: 'public',
    });
    
    await logSystemAction(`Uploaded ${type} receipt: "${file.name}"`);
    return blob.url;
  } catch (err: any) {
    await logSystemAction(`Upload Error: Failed to upload ${type} receipt: "${file.name}" - ${err.message || String(err)}`);
    throw err;
  }
}

// -- DASHBOARD --
export async function getDashboardData(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const [
    incomesStatsRow,
    expensesStatsRow,
    invoiceAging,
    chartDataRaw,
    recentInvoicesRaw,
    recentQuotationsRaw,
    recentTransactionsRaw,
    expenseBreakdownRange,
    incomeBreakdownRange,
    clientsCountRows,
    accounts,
    clientDueAmountRows
  ] = await Promise.all([
    sql`
      SELECT 
        SUM(CASE WHEN date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp THEN amount ELSE 0 END) as range_total,
        SUM(CASE WHEN date_trunc('month', date) = date_trunc('month', current_date) THEN amount ELSE 0 END) as this_month,
        SUM(CASE WHEN date_trunc('month', date) = date_trunc('month', current_date - interval '1 month') THEN amount ELSE 0 END) as last_month,
        SUM(CASE WHEN EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount ELSE 0 END) as current_year,
        SUM(CASE WHEN EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 THEN amount ELSE 0 END) as previous_year
      FROM admin_incomes
    `,
    sql`
      SELECT 
        SUM(CASE WHEN date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp THEN amount ELSE 0 END) as range_total,
        SUM(CASE WHEN date_trunc('month', date) = date_trunc('month', current_date) THEN amount ELSE 0 END) as this_month,
        SUM(CASE WHEN date_trunc('month', date) = date_trunc('month', current_date - interval '1 month') THEN amount ELSE 0 END) as last_month,
        SUM(CASE WHEN EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount ELSE 0 END) as current_year,
        SUM(CASE WHEN EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 THEN amount ELSE 0 END) as previous_year
      FROM admin_expenses
    `,
    sql`
      SELECT 
        payment_status as status,
        SUM(total) as amount_sum,
        SUM(total_due) as total_due_sum,
        COUNT(*) as count
      FROM invoices
      GROUP BY payment_status
    `,
    sql`
      SELECT 
        TO_CHAR(date, 'Mon') as name,
        EXTRACT(MONTH FROM date) as month_num,
        EXTRACT(YEAR FROM date) as year_num,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM (
        SELECT date, amount, 'income' as type FROM admin_incomes
        UNION ALL
        SELECT date, amount, 'expense' as type FROM admin_expenses
      ) as combined
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
      ORDER BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
    `,
    sql`
      SELECT 
        i.invoice_id as id, 
        COALESCE(c.full_name, i.user_email) as client, 
        COALESCE(NULLIF(i.project_name, ''), (SELECT description FROM invoice_items WHERE invoice_id = i.invoice_id LIMIT 1), 'Project') as service,
        i.total as amount, 
        i.payment_status as status
      FROM invoices i
      LEFT JOIN admin_clients c ON LOWER(i.user_email) = LOWER(c.email)
      WHERE i.date >= ${start}::timestamp AND i.date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY i.date DESC, i.created_at DESC
      LIMIT 4
    `,
    sql`
      SELECT q.id, COALESCE(q.description, 'Untitled') as project, COALESCE(c.full_name, q.client_name, 'Unknown') as client, q.amount as amount, q.status
      FROM admin_quotations q
      LEFT JOIN admin_clients c ON q.client_id = c.id
      WHERE q.date >= ${start}::timestamp AND q.date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY q.date DESC, q.created_at DESC
      LIMIT 4
    `,
    sql`
      SELECT id, 'income' as type, description as name, date, created_at, amount FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      UNION ALL
      SELECT id, 'expense' as type, description as name, date, created_at, amount FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY date DESC, created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT 
        category as name,
        SUM(amount) as value
      FROM admin_expenses
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      GROUP BY category
      ORDER BY value DESC
    `,
    sql`
      SELECT 
        category as name,
        SUM(amount) as value
      FROM admin_incomes
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      GROUP BY category
      ORDER BY value DESC
    `,
    sql`SELECT COUNT(*) as count FROM admin_clients`,
    import('./accounts').then(m => m.getAccounts(start, end)),
    sql`
      SELECT 
        COALESCE(c.full_name, i.user_email) as client_name,
        SUM(i.total_due) as due_amount
      FROM invoices i
      LEFT JOIN admin_clients c ON LOWER(i.user_email) = LOWER(c.email)
      WHERE LOWER(i.payment_status) IN ('unpaid', 'pending', 'partially paid', 'advance paid', 'advance-paid')
      GROUP BY COALESCE(c.full_name, i.user_email)
      HAVING SUM(i.total_due) > 0
      ORDER BY due_amount DESC
    `
  ]);

  const incomesStats = incomesStatsRow[0] || {};
  const expensesStats = expensesStatsRow[0] || {};

  const totalAssets = accounts.filter((a: any) => a.isCompanyAccount).reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);
  const totalAfterDebts = accounts.reduce((sum: number, a: any) => sum + (a.isCompanyAccount ? (a.currentBalance || 0) : (a.currentBalance > 0 ? a.currentBalance : 0)), 0);
  const totalCapital = accounts.reduce((sum: number, a: any) => sum + (!a.isCompanyAccount && a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0), 0);

  const totalIncome = parseFloat(incomesStats.range_total || 0);
  const totalExpenses = parseFloat(expensesStats.range_total || 0);
  const netProfit = totalIncome - totalExpenses;

  const previousIncome = parseFloat(incomesStats.previous_year || 0);
  const currentIncome = parseFloat(incomesStats.current_year || 0);

  const previousExpense = parseFloat(expensesStats.previous_year || 0);
  const currentExpense = parseFloat(expensesStats.current_year || 0);

  const previousNet = previousIncome - previousExpense;
  const currentNet = currentIncome - currentExpense;

  let unpaidCount = 0;
  let unpaidAmount = 0;
  const targetStatuses = ['unpaid', 'pending', 'partially paid', 'advance paid', 'advance-paid'];
  invoiceAging.forEach(row => {
    if (targetStatuses.includes(row.status?.toLowerCase())) {
      unpaidCount += parseInt(row.count || 0);
      unpaidAmount += parseFloat(row.total_due_sum || 0);
    }
  });

  const totalExpenseRange = expenseBreakdownRange.reduce((sum, r) => sum + parseFloat(r.value), 0);
  const totalIncomeRange = incomeBreakdownRange.reduce((sum, r) => sum + parseFloat(r.value), 0);

  const expenseBreakdown = expenseBreakdownRange.map(r => {
    const val = parseFloat(r.value);
    return {
      name: r.name || 'Other',
      value: val,
      percentage: totalExpenseRange > 0 ? parseFloat(((val / totalExpenseRange) * 100).toFixed(1)) : 0
    };
  });

  const incomeBreakdown = incomeBreakdownRange.map(r => {
    const val = parseFloat(r.value);
    return {
      name: r.name || 'Other',
      value: val,
      percentage: totalIncomeRange > 0 ? parseFloat(((val / totalIncomeRange) * 100).toFixed(1)) : 0
    };
  });

  const clientDueAmounts = clientDueAmountRows.map(r => ({
    client: r.client_name || 'Unknown',
    due_amount: parseFloat(r.due_amount || 0)
  }));

  return {
    totalIncome,
    totalExpenses,
    totalAssets,
    totalAfterDebts,
    totalCapital,
    netProfit,
    incomeBreakdown,
    totalClients: parseInt(clientsCountRows[0]?.count || 0, 10),
    unpaidCount,
    unpaidAmount,
    clientDueAmounts,
    currentMonthStats: {
      income: parseFloat(incomesStats.this_month || 0),
      expenses: parseFloat(expensesStats.this_month || 0),
      lastMonthIncome: parseFloat(incomesStats.last_month || 0),
      lastMonthExpenses: parseFloat(expensesStats.last_month || 0),
    },
    invoiceAging: invoiceAging.map(row => ({
      status: row.status,
      amount: parseFloat(row.amount_sum || 0),
      count: parseInt(row.count || 0)
    })),
    chartData: chartDataRaw.map(row => ({
      name: row.name,
      income: parseFloat(row.income),
      expenses: parseFloat(row.expenses),
      year: parseInt(row.year_num, 10)
    })),
    recentInvoices: recentInvoicesRaw.map(row => ({
      id: row.id,
      service: row.service,
      client: row.client,
      amount: parseFloat(row.amount),
      status: row.status,
    })),
    recentQuotations: recentQuotationsRaw.map(row => ({
      id: row.id,
      project: row.project,
      client: row.client,
      amount: parseFloat(row.amount),
      status: row.status,
    })),
    recentTransactions: recentTransactionsRaw.map((row, index) => ({
      id: index,
      type: row.type,
      name: row.name,
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(row.amount)
    })),
    netIncomeComparison: {
      previousIncome,
      currentIncome,
      previousExpense,
      currentExpense,
      previousNet,
      currentNet
    },
    expenseBreakdown
  };
}

function getCutoffDate(range: string) {
  const d = new Date();
  if (range === 'this year') return new Date(d.getFullYear(), 0, 1).toISOString();
  if (range === '6 months') { d.setMonth(d.getMonth() - 6); return d.toISOString(); }
  if (range === 'three months') { d.setMonth(d.getMonth() - 3); return d.toISOString(); }
  if (range === 'one month') { d.setMonth(d.getMonth() - 1); return d.toISOString(); }
  return new Date(0).toISOString();
}

// -- INCOMES --
export async function getIncomes(startDate?: string, endDate?: string, limit: number = 1000, offset: number = 0) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const [statsThisMonth, statsLastMonth, statsYtd, rows] = await Promise.all([
    sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date)`,
    sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`,
    sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('year', date) = date_trunc('year', current_date)`,
    sql`
      SELECT 
        i.id, i.date, TO_CHAR(i.date, 'YYYY-MM-DD') as "rawDate", i.amount, c.full_name as client, i.client_id as "clientId", c.email as "clientEmail", 
        i.description as desc, i.category, i.invoice_id as invoice, i.account_id as "accountId", i.payment_method as "paymentMethod",
        COALESCE(
          i.receipt_url,
          (SELECT slip_url FROM invoice_payment_slips ips WHERE ips.invoice_id = i.invoice_id ORDER BY ips.id DESC LIMIT 1),
          inv.bank_slip
        ) as "receiptUrl",
        CASE WHEN inv.invoice_id IS NOT NULL THEN true ELSE false END as "hasValidInvoice",
        i.created_at
      FROM admin_incomes i
      LEFT JOIN admin_clients c ON i.client_id = c.id
      LEFT JOIN invoices inv ON i.invoice_id = inv.invoice_id
      WHERE i.date >= ${start}::timestamp AND i.date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY i.date DESC, i.created_at DESC, i.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  ]);

  return {
    thisMonth: parseFloat(statsThisMonth[0]?.total || 0),
    lastMonth: parseFloat(statsLastMonth[0]?.total || 0),
    ytd: parseFloat(statsYtd[0]?.total || 0),
    items: rows.map(r => ({
      ...r,
      rawDate: r.rawDate,
      created_at: r.created_at,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount)
    }))
  };
}

export async function createIncome(data: any) {
  // If payment method is bank transfer and no account_id is provided, try to fetch the invoice's bank account
  let accountId = data.accountId || null;
  if (!accountId && data.paymentMethod === 'Bank Transfer') {
    const def = await sql`SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1`;
    if (def.length > 0) accountId = def[0].id;
  }

  const nextId = await getAvailableReceiptId();
  await sql`
    INSERT INTO admin_incomes (id, date, amount, description, category, payment_method, invoice_id, client_id, receipt_url, account_id)
    VALUES (${nextId}, ${data.date}, ${data.amount}, ${data.description}, ${data.category}, ${data.paymentMethod}, ${data.invoiceId || null}, ${data.clientId || null}, ${data.receiptUrl || null}, ${accountId})
  `;

  if (data.invoiceId) {
    if (data.receiptUrl) {
      try {
        const existing = await sql`SELECT id FROM invoice_payment_slips WHERE invoice_id = ${data.invoiceId} AND slip_url = ${data.receiptUrl}`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO invoice_payment_slips (invoice_id, slip_url, amount, status, reviewed_at, review_note)
            VALUES (${data.invoiceId}, ${data.receiptUrl}, ${data.amount}, 'approved', CURRENT_TIMESTAMP, ${data.description || 'Income Receipt'})
          `;
        }
      } catch (err) {
        console.warn("Failed to sync slip to invoice_payment_slips:", err);
      }
    }

    try {
      const invRows = await sql`SELECT total, advance, total_due, payment_status FROM invoices WHERE invoice_id = ${data.invoiceId}`;
      if (invRows.length > 0) {
        const inv = invRows[0];
        const currentDue = parseFloat(inv.total_due != null ? inv.total_due : inv.total);
        const paidAmt = parseFloat(data.amount || '0');
        const newDue = Math.max(0, currentDue - paidAmt);
        const newStatus = newDue < 0.01 ? 'fully paid' : 'partially paid';
        await sql`
          UPDATE invoices
          SET payment_status = ${newStatus},
              total_due = ${newDue}
          WHERE invoice_id = ${data.invoiceId}
        `;
      }
    } catch (err) {
      console.warn("Failed to update invoice status on income creation:", err);
    }
  }

  await logSystemAction(`Created income: Recorded LKR ${data.amount} for "${data.description}"`);
}

export async function createClient(data: { name: string; email?: string | null; company?: string | null; phone?: string | null; address?: string | null; legal_name?: string | null }): Promise<string> {
  const clientId = 'C-' + Date.now();
  const emailToSave = (data.email && data.email.trim() !== '') ? data.email.trim() : `${clientId}@client.local`;

  const legalNameToSave = (data.legal_name && data.legal_name.trim() !== '') ? data.legal_name.trim() : data.name.trim();
  let addressToSave = (data.address && data.address.trim() !== '') ? data.address.trim() : null;
  if (!addressToSave && data.email && data.email.trim() !== '') {
    addressToSave = data.email.trim();
  }

  await sql`
    INSERT INTO admin_clients (id, full_name, email, company, phone, address, active, legal_name)
    VALUES (${clientId}, ${data.name}, ${emailToSave}, ${data.company || null}, ${data.phone || null}, ${addressToSave}, true, ${legalNameToSave})
  `;
  await logSystemAction(`Created client: "${data.name}" (${data.email || data.phone || 'No contact'})`);
  return clientId;
}

export async function updateClient(clientId: string, data: { name?: string; email?: string | null; company?: string | null; phone?: string | null; address?: string | null; legal_name?: string | null }) {
  // Fetch current email first so we can cascade if it changes
  const existing = await sql`SELECT email, full_name FROM admin_clients WHERE id = ${clientId}`;
  if (existing.length === 0) throw new Error("Client not found");
  const oldEmail = (existing[0].email as string) || "";
  const clientName = existing[0].full_name || clientId;
  
  let newEmail = oldEmail;
  if (data.email !== undefined) {
    newEmail = (data.email && data.email.trim() !== '') ? data.email.trim() : `${clientId}@client.local`;
  }
  
  const emailChanged = oldEmail && newEmail && newEmail.toLowerCase() !== oldEmail.toLowerCase();

  let legalNameToSave = data.legal_name;
  if (legalNameToSave !== undefined && (!legalNameToSave || legalNameToSave.trim() === '')) {
    legalNameToSave = (data.name && data.name.trim() !== '') ? data.name.trim() : clientName;
  }
  
  let addressToSave = data.address;
  if (addressToSave !== undefined && (!addressToSave || addressToSave.trim() === '')) {
    if (newEmail && !newEmail.includes('@client.local')) {
      addressToSave = newEmail;
    } else {
      addressToSave = null;
    }
  }

  // Update admin_clients row
  await sql`
    UPDATE admin_clients
    SET 
      full_name = COALESCE(${data.name  || null}, full_name),
      email   = ${newEmail},
      company = ${data.company !== undefined ? data.company : null},
      phone   = ${data.phone   ?? null},
      address = ${addressToSave !== undefined ? addressToSave : null},
      legal_name = ${legalNameToSave !== undefined ? legalNameToSave : null}
    WHERE id = ${clientId}
  `;

  // Cascade email change to every table that stores user_email
  if (emailChanged) {
    await sql`UPDATE invoices SET user_email = ${newEmail} WHERE LOWER(user_email) = LOWER(${oldEmail})`;
  }

  // Cascade legal_name to all linked records so they stay in sync
  if (legalNameToSave !== undefined) {
    await sql`UPDATE invoices SET legal_name = ${legalNameToSave} WHERE LOWER(user_email) = LOWER(${newEmail})`;
    await sql`UPDATE admin_quotations SET legal_name = ${legalNameToSave} WHERE client_id = ${clientId}`;
  }

  await logSystemAction(`Updated client details for "${clientName}" (${clientId})`);
}

export async function deleteClient(clientId: string) {
  const existing = await sql`SELECT full_name FROM admin_clients WHERE id = ${clientId}`;
  const clientName = existing[0]?.full_name || clientId;
  await sql`DELETE FROM admin_clients WHERE id = ${clientId}`;
  await logSystemAction(`Deleted client: "${clientName}" (${clientId})`);
}

export async function updateIncome(id: number, data: any) {
  let accountId = data.accountId || null;
  if (!accountId && data.paymentMethod === 'Bank Transfer') {
    const def = await sql`SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1`;
    if (def.length > 0) accountId = def[0].id;
  }

  await sql`
    UPDATE admin_incomes 
    SET date = ${data.date}, amount = ${data.amount}, description = ${data.description}, category = ${data.category}, payment_method = ${data.paymentMethod}, invoice_id = ${data.invoiceId || null}, client_id = ${data.clientId || null}, receipt_url = ${data.receiptUrl || null}, account_id = ${accountId}
    WHERE id = ${id}
  `;

  if (data.invoiceId && data.receiptUrl) {
    try {
      const existingSlip = await sql`SELECT id FROM invoice_payment_slips WHERE invoice_id = ${data.invoiceId} AND slip_url = ${data.receiptUrl}`;
      if (existingSlip.length === 0) {
        await sql`
          INSERT INTO invoice_payment_slips (invoice_id, slip_url, amount, status, reviewed_at, review_note)
          VALUES (${data.invoiceId}, ${data.receiptUrl}, ${data.amount}, 'approved', CURRENT_TIMESTAMP, ${data.description || 'Income Receipt'})
        `;
      }
    } catch (err) {
      console.warn("Failed to sync slip on updateIncome:", err);
    }
  }

  await logSystemAction(`Updated income ID ${id}: recorded LKR ${data.amount} for "${data.description}"`);
}

export async function deleteIncome(id: number) {
  let incomeDesc = "";
  let incomeAmount = 0;
  try {
    // 1. Fetch the income record details before deleting
    const incomeRows = await sql`
      SELECT invoice_id, amount, description
      FROM admin_incomes
      WHERE id = ${id}
    `;
    
    if (incomeRows.length > 0) {
      incomeDesc = incomeRows[0].description || "";
      incomeAmount = parseFloat(incomeRows[0].amount || "0");
    }

    if (incomeRows.length > 0 && incomeRows[0].invoice_id) {
      const income = incomeRows[0];
      const invoiceId = income.invoice_id;
      const deletedAmount = parseFloat(income.amount);
      const isAdvance = income.description?.toLowerCase().includes("advance");

      // 2. Fetch the corresponding invoice
      const invoiceRows = await sql`
        SELECT total, advance, total_due
        FROM invoices
        WHERE invoice_id = ${invoiceId}
      `;

      if (invoiceRows.length > 0) {
        const invoice = invoiceRows[0];
        const totalAmount = parseFloat(invoice.total);
        const currentAdvance = parseFloat(invoice.advance || '0');
        const currentTotalDue = parseFloat(invoice.total_due != null ? invoice.total_due : invoice.total);

        let newAdvance = currentAdvance;
        let newTotalDue = currentTotalDue;

        if (isAdvance) {
          newAdvance = Math.max(0, currentAdvance - deletedAmount);
          newTotalDue = Math.max(0, totalAmount - newAdvance);
        } else {
          newTotalDue = Math.min(totalAmount, currentTotalDue + deletedAmount);
        }

        // Determine new status
        let newStatus = 'unpaid';
        if (newTotalDue < 0.01) {
          newStatus = 'fully paid';
        } else if (newTotalDue < totalAmount) {
          if (newAdvance > 0) {
            newStatus = 'advance-paid';
          } else {
            newStatus = 'partially paid';
          }
        }

        // Update invoice fields
        await sql`
          UPDATE invoices
          SET payment_status = ${newStatus},
              advance = ${newAdvance},
              total_due = ${newTotalDue}
          WHERE invoice_id = ${invoiceId}
        `;
      }
    }
  } catch (e) {
    console.error("Failed to update invoice balance upon income deletion:", e);
  }

  // 3. Delete the income record
  await sql`DELETE FROM admin_incomes WHERE id = ${id}`;
  await logSystemAction(`Deleted income record: "LKR ${incomeAmount}" for "${incomeDesc}" (ID: ${id})`);
}

// -- EXPENSES --
export async function getExpenses(startDate?: string, endDate?: string, limit: number = 1000, offset: number = 0) {
  await processRecurringExpenses();
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const [statsThisMonth, statsLastMonth, statsYtd, rows] = await Promise.all([
    sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date)`,
    sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`,
    sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('year', date) = date_trunc('year', current_date)`,
    sql`
      SELECT id, date, TO_CHAR(date, 'YYYY-MM-DD') as "rawDate", amount, description as desc, category, payment_method as "paidVia", receipt_url as "receiptUrl", account_id as "accountId", created_at
      FROM admin_expenses
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY date DESC, created_at DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `
  ]);

  return {
    thisMonth: parseFloat(statsThisMonth[0]?.total || 0),
    lastMonth: parseFloat(statsLastMonth[0]?.total || 0),
    ytd: parseFloat(statsYtd[0]?.total || 0),
    items: rows.map(r => ({
      ...r,
      rawDate: r.rawDate,
      created_at: r.created_at,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount)
    }))
  };
}

export async function createExpense(data: any) {
  let accountId = data.accountId || null;
  if (!accountId && data.paymentMethod === 'Bank Transfer') {
    const def = await sql`SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1`;
    if (def.length > 0) accountId = def[0].id;
  }
  await sql`
    INSERT INTO admin_expenses (date, amount, description, category, payment_method, receipt_url, account_id)
    VALUES (${data.date}, ${data.amount}, ${data.description}, ${data.category}, ${data.paymentMethod}, ${data.receiptUrl || null}, ${accountId})
  `;

  if (data.isScheduled) {
    let nextDate = new Date(data.date);
    if (data.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (data.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (data.frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    await sql`
      INSERT INTO admin_scheduled_expenses (title, amount, category, frequency, next_due_date, payment_method, status)
      VALUES (${data.description}, ${data.amount}, ${data.category}, ${data.frequency}, ${nextDate.toISOString().split('T')[0]}, ${data.paymentMethod}, 'active')
    `;
  }
  await logSystemAction(`Created expense: Recorded LKR ${data.amount} for "${data.description}"`);
}

export async function updateExpense(id: number, data: any) {
  let accountId = data.accountId || null;
  if (!accountId && data.paymentMethod === 'Bank Transfer') {
    const def = await sql`SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1`;
    if (def.length > 0) accountId = def[0].id;
  }
  await sql`
    UPDATE admin_expenses 
    SET date = ${data.date}, amount = ${data.amount}, description = ${data.description}, category = ${data.category}, payment_method = ${data.paymentMethod}, receipt_url = ${data.receiptUrl || null}, account_id = ${accountId}
    WHERE id = ${id}
  `;
  await logSystemAction(`Updated expense ID ${id}: recorded LKR ${data.amount} for "${data.description}"`);
}

export async function deleteExpense(id: number) {
  let expDesc = "";
  let expAmount = 0;
  try {
    const existing = await sql`SELECT description, amount FROM admin_expenses WHERE id = ${id}`;
    if (existing.length > 0) {
      expDesc = existing[0].description || "";
      expAmount = parseFloat(existing[0].amount || "0");
    }
  } catch (e) {}

  await sql`DELETE FROM admin_expenses WHERE id = ${id}`;
  await logSystemAction(`Deleted expense record: "LKR ${expAmount}" for "${expDesc}" (ID: ${id})`);
}

async function ensureScheduledExpensesTable() {
}

export async function processRecurringExpenses() {
  await ensureScheduledExpensesTable();
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const rows = await sql`
      SELECT id, title, amount, category, frequency, next_due_date, payment_method
      FROM admin_scheduled_expenses
      WHERE status = 'active' AND next_due_date <= ${todayStr}
    `;

    for (const item of rows) {
      let nextDate = new Date(item.next_due_date);
      while (nextDate.toISOString().split('T')[0] <= todayStr) {
        const occurrenceDate = nextDate.toISOString().split('T')[0];

        // 1. Insert into actual expenses
        await sql`
          INSERT INTO admin_expenses (date, amount, description, category, payment_method)
          VALUES (${occurrenceDate}, ${item.amount}, ${item.title + ' (Recurring)'}, ${item.category}, ${item.payment_method})
        `;

        // 2. Roll date forward
        if (item.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (item.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (item.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          break;
        }
      }

      // 3. Update next due date in db
      await sql`
        UPDATE admin_scheduled_expenses
        SET next_due_date = ${nextDate.toISOString().split('T')[0]}
        WHERE id = ${item.id}
      `;
    }
  } catch (e) {
    console.error("Failed to process recurring expenses:", e);
  }
}

export async function getScheduledExpenses() {
  await ensureScheduledExpensesTable();
  try {
    const rows = await sql`
      SELECT id, title, amount, category, frequency, next_due_date, payment_method as "paymentMethod", status
      FROM admin_scheduled_expenses
      ORDER BY next_due_date ASC
    `;
    return rows.map((r: any) => {
      let dueStr = '';
      if (r.next_due_date) {
        if (typeof r.next_due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.next_due_date)) {
          dueStr = r.next_due_date;
        } else {
          const dObj = new Date(r.next_due_date);
          if (!isNaN(dObj.getTime())) {
            dueStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
          }
        }
      }
      return {
        ...r,
        amount: parseFloat(r.amount),
        next_due_date: dueStr
      };
    });
  } catch (error) {
    console.error("Failed to get scheduled expenses:", error);
    throw new Error("Failed to retrieve scheduled expenses.");
  }
}

export async function createScheduledExpense(data: any) {
  await ensureScheduledExpensesTable();
  await sql`
    INSERT INTO admin_scheduled_expenses (title, amount, category, frequency, next_due_date, payment_method, status)
    VALUES (${data.title}, ${data.amount}, ${data.category}, ${data.frequency}, ${data.next_due_date}, ${data.paymentMethod}, 'active')
  `;
}

export async function updateScheduledExpense(id: number, data: any) {
  await ensureScheduledExpensesTable();
  await sql`
    UPDATE admin_scheduled_expenses
    SET title = ${data.title}, amount = ${data.amount}, category = ${data.category}, frequency = ${data.frequency}, next_due_date = ${data.next_due_date}, payment_method = ${data.paymentMethod}, status = ${data.status}
    WHERE id = ${id}
  `;
}

export async function deleteScheduledExpense(id: number) {
  await ensureScheduledExpensesTable();
  await sql`DELETE FROM admin_scheduled_expenses WHERE id = ${id}`;
}

export async function payScheduledExpense(id: number) {
  await ensureScheduledExpensesTable();
  const rows = await sql`
    SELECT * FROM admin_scheduled_expenses WHERE id = ${id}
  `;
  if (rows.length === 0) return;
  const item = rows[0];

  // 1. Insert into actual expenses
  await sql`
    INSERT INTO admin_expenses (date, amount, description, category, payment_method)
    VALUES (CURRENT_DATE, ${item.amount}, ${item.title + ' (Scheduled Payment)'}, ${item.category}, ${item.payment_method})
  `;

  // 2. Roll date forward
  let nextDate = new Date(item.next_due_date);
  if (item.frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
    await sql`
      UPDATE admin_scheduled_expenses
      SET next_due_date = ${nextDate.toISOString().split('T')[0]}
      WHERE id = ${id}
    `;
  } else if (item.frequency === 'yearly') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    await sql`
      UPDATE admin_scheduled_expenses
      SET next_due_date = ${nextDate.toISOString().split('T')[0]}
      WHERE id = ${id}
    `;
  } else {
    await sql`
      DELETE FROM admin_scheduled_expenses WHERE id = ${id}
    `;
  }
}

// -- INVOICES --
export async function getInvoices(limit: number = 1000, offset: number = 0) {
  const [totalIssuedCount, rows, nonAdvancePaymentsRows] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM invoices`,
    sql`
      SELECT i.invoice_id as id, i.user_email as client_email, c.id as client_id, c.full_name as client_name, i.project_name as service, i.subtotal, i.total, i.discount, i.advance, i.tax_rate, i.total_due, i.date, i.due_date, i.payment_status as status, i.work_status, i.legal_name, i.created_at, i.bank_account_id
      FROM invoices i
      LEFT JOIN admin_clients c ON LOWER(i.user_email) = LOWER(c.email)
      ORDER BY i.date DESC, i.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT invoice_id, SUM(amount) as paid_sum
      FROM admin_incomes
      WHERE invoice_id IS NOT NULL AND LOWER(description) NOT LIKE 'advance:%' AND LOWER(description) NOT LIKE 'advance payment%'
      GROUP BY invoice_id
    `
  ]);
  const paymentsMap: Record<string, number> = {};
  nonAdvancePaymentsRows.forEach((p: any) => {
    paymentsMap[p.invoice_id] = parseFloat(p.paid_sum || '0');
  });

  let paidCount = 0;
  let pendingCount = 0;
  let computedTotalDueSum = 0;

  const items = rows.map(r => {
    const subtotal = parseFloat(r.subtotal || 0);
    const discount = parseFloat(r.discount || 0);
    const advance = parseFloat(r.advance || 0);
    const taxRate = parseFloat(r.tax_rate || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalVal = parseFloat(r.total != null ? r.total : (subtotal + taxAmount - discount));
    const nonAdvanceVal = paymentsMap[r.id] || 0;

    const calculatedTotalDue = Math.max(0, totalVal - advance - nonAdvanceVal);

    let status = r.status;
    if (calculatedTotalDue < 0.01) {
      status = 'fully paid';
    }

    if (status === 'fully paid' || status === 'paid') {
      paidCount++;
    } else {
      pendingCount++;
      computedTotalDueSum += calculatedTotalDue;
    }

    return {
      id: r.id,
      created_at: r.created_at,
      client: r.client_name || r.client_email?.split('@')[0] || 'Unknown',
      clientEmail: r.client_email || '',
      client_email: r.client_email || '',
      clientId: r.client_id,
      legalName: r.legal_name || '',
      service: r.service,
      amount: totalVal,
      total_due: calculatedTotalDue,
      date: r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }) : '-',
      dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }) : '',
      status: status,
      work_status: r.work_status,
      bankAccountId: r.bank_account_id,
      overdue: r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date() && status !== 'paid' && status !== 'fully paid')
    };
  });

  return {
    totalIssued: parseInt(totalIssuedCount[0]?.count || '0'),
    paid: paidCount,
    pending: pendingCount,
    totalDue: computedTotalDueSum,
    items: items
  };
}

export async function deleteInvoice(id: string) {
  let projectName = "";
  try {
    const existing = await sql`SELECT project_name FROM invoices WHERE invoice_id = ${id}`;
    if (existing.length > 0) {
      projectName = existing[0].project_name || "";
    }
  } catch (e) {}

  await sql`
    UPDATE admin_quotations
    SET linked_invoice_id = NULL,
        status = 'draft',
        project_confirmed = false
    WHERE linked_invoice_id = ${id}
  `;
  // Check if this invoice is a renewal invoice
  const renewalRows = await sql`
    SELECT domain_order_id, domain_name FROM domain_renewal_history WHERE invoice_id = ${id}
  `;

  if (renewalRows.length > 0) {
    const domainOrderId = renewalRows[0].domain_order_id;
    const domainName = renewalRows[0].domain_name;

    // Find a previous invoice ID (either the latest prior renewal, or the registration invoice)
    const prevRenewals = await sql`
      SELECT invoice_id FROM domain_renewal_history 
      WHERE domain_order_id = ${domainOrderId} AND invoice_id != ${id} 
      ORDER BY renewal_date DESC LIMIT 1
    `;

    let prevInvoiceId = null;
    if (prevRenewals.length > 0) {
      prevInvoiceId = prevRenewals[0].invoice_id;
    } else {
      const regInvoices = await sql`
        SELECT invoice_id FROM invoices 
        WHERE project_name = ${`Domain Registration: ${domainName}`} LIMIT 1
      `;
      if (regInvoices.length > 0) {
        prevInvoiceId = regInvoices[0].invoice_id;
      }
    }

    // Update domain order: only update invoice_id, do NOT touch status/expiry
    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = ${prevInvoiceId}
      WHERE id = ${domainOrderId}
    `;

    // Delete renewal history record
    await sql`
      DELETE FROM domain_renewal_history WHERE invoice_id = ${id}
    `;
  } else {
    // Normal registration invoice deletion behavior
    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = NULL,
          status = 'pending',
          expiry_date = NULL
      WHERE invoice_id = ${id}
    `;
  }

  await sql`DELETE FROM invoices WHERE invoice_id = ${id}`;
  await logSystemAction(`Deleted invoice: "${projectName}" (${id})`);
}

export async function getInvoiceByIdAdmin(invoiceId: string) {
  // Join with admin_clients and bank_accs to get client name + billing address + bank account
  const result = await sql`
    SELECT
      i.invoice_id,
      i.user_email,
      i.project_name,
      i.date,
      i.due_date,
      i.currency,
      i.category,
      i.subtotal,
      i.discount,
      i.total,
      i.advance,
      i.total_due,
      i.work_status,
      i.payment_status,
      i.bank_account_id,
      i.tax_rate,
      i.legal_name,
      i.bank_slip,
      COALESCE(ac.full_name, i.user_email) as client_name,
      ac.address as billing_address,
      ba.name as bank_acc_name,
      ba.account_number as bank_acc_number,
      ba.bank_name as bank_acc_bank,
      ba.branch as bank_acc_branch
    FROM invoices i
    LEFT JOIN admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
    LEFT JOIN admin_accounts ba ON COALESCE(i.bank_account_id, (SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1)) = ba.id
    WHERE i.invoice_id = ${invoiceId}
  `;

  if (result.length === 0) return null;
  const invoice = result[0];

  const itemsResult = await sql`
    SELECT description, price, total, quantity 
    FROM invoice_items 
    WHERE invoice_id = ${invoiceId}
    ORDER BY id ASC
  `;

  const payments = await sql`
    SELECT id, date, amount, payment_method, description, receipt_url, created_at
    FROM admin_incomes
    WHERE invoice_id = ${invoiceId}
    ORDER BY date DESC, created_at DESC, id DESC
  `;

  const slipRows = await sql`
    SELECT id, slip_url, amount, status, uploaded_at, review_note
    FROM invoice_payment_slips
    WHERE invoice_id = ${invoiceId}
    ORDER BY uploaded_at DESC, id DESC
  `;

  invoice.items = itemsResult;
  invoice.payments = payments.map(p => ({
    id: p.id,
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }),
    amount: parseFloat(p.amount),
    method: p.payment_method,
    description: p.description,
    receipt_url: p.receipt_url
  }));

  const mappedSlips = slipRows.map(s => ({
    id: s.id,
    url: s.slip_url,
    amount: parseFloat(s.amount),
    status: s.status,
    uploaded_at: s.uploaded_at,
    review_note: s.review_note
  }));

  for (const inc of payments) {
    if (inc.receipt_url && !mappedSlips.some(s => s.url === inc.receipt_url)) {
      mappedSlips.push({
        id: `income-${inc.id}`,
        url: inc.receipt_url,
        amount: parseFloat(inc.amount || 0),
        status: 'approved',
        uploaded_at: inc.created_at || inc.date || null,
        review_note: inc.description || 'Income Receipt'
      });
    }
  }

  const advanceVal  = parseFloat(invoice.advance || 0);
  const subtotalVal = parseFloat(invoice.subtotal || 0);
  const discountVal = parseFloat(invoice.discount || 0);
  const taxRateVal  = parseFloat(invoice.tax_rate || 0);
  const taxAmountVal = subtotalVal * (taxRateVal / 100);
  const totalVal    = parseFloat(invoice.total || (subtotalVal + taxAmountVal - discountVal));

  if (invoice.bank_slip && !mappedSlips.some(s => s.url === invoice.bank_slip)) {
    mappedSlips.push({
      id: 'legacy',
      url: invoice.bank_slip,
      amount: advanceVal > 0 ? advanceVal : totalVal,
      status: invoice.payment_status === 'on review' ? 'pending' : (invoice.payment_status === 'fully paid' || invoice.payment_status === 'advance-paid' ? 'approved' : 'pending'),
      uploaded_at: invoice.date || null,
      review_note: 'Bank Slip'
    });
  }

  invoice.payment_slips = mappedSlips;

  const nonAdvancePayments = (invoice.payments || [])
    .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  const calculatedTotalDue = Math.max(0, totalVal - advanceVal - nonAdvancePayments);
  invoice.total_due = calculatedTotalDue;
  invoice.payments_total = nonAdvancePayments;

  return invoice;
}

// -- CLIENTS --
export async function getClients() {
  const clerk = await clerkClient();

  let clerkUsersMap: Record<string, string> = {};
  let clerkEmailSet: Set<string> = new Set();
  let clerkIdSet: Set<string> = new Set();
  try {
    const { data: users } = await clerk.users.getUserList({ limit: 500 });
    users.forEach((u) => {
      clerkIdSet.add(u.id);
      u.emailAddresses.forEach((e) => {
        clerkEmailSet.add(e.emailAddress.toLowerCase());
      });
      if (u.imageUrl) {
        clerkUsersMap[u.id] = u.imageUrl;
        u.emailAddresses.forEach((e) => {
          clerkUsersMap[e.emailAddress.toLowerCase()] = u.imageUrl;
        });
      }
    });
  } catch (e) {
    console.warn("Failed to fetch clerk users for images", e);
  }

  const rows = await sql`
    SELECT c.id,
           c.full_name as name,
           c.email,
           c.active,
           c.company,
           c.phone,
           c.address,
           c.clerk_id,
           c.legal_name,
           (SELECT COUNT(*) FROM invoices i WHERE LOWER(i.user_email) = LOWER(c.email)) as invoices,
           COALESCE((SELECT SUM(amount) FROM admin_incomes inc WHERE inc.client_id = c.id), 0) as revenue,
           (SELECT COUNT(*) FROM admin_incomes inc WHERE inc.client_id = c.id) as income_count,
           (SELECT COUNT(*) FROM invoices i WHERE LOWER(i.user_email) = LOWER(c.email) AND i.work_status IS NOT NULL) as project_count,
           (SELECT COUNT(*) FROM admin_quotations q WHERE q.client_id = c.id) as quotation_count
    FROM admin_clients c
    ORDER BY c.id DESC
  `;

  const clients = await Promise.all(
    rows.map(async (r) => {
      let imageUrl: string | null = null;
      if (r.clerk_id && clerkUsersMap[r.clerk_id]) {
        imageUrl = clerkUsersMap[r.clerk_id];
      } else if (r.email && clerkUsersMap[r.email.toLowerCase()]) {
        imageUrl = clerkUsersMap[r.email.toLowerCase()];
      } else if (r.email) {
        imageUrl = getGravatarUrl(r.email.trim());
      }

      return {
        id: r.id,
        name: r.name || r.email.split('@')[0],
        email: r.email,
        clerkId: r.clerk_id || null,
        hasClerkProfile:
          (r.clerk_id && clerkIdSet.has(r.clerk_id)) ||
          (r.email && clerkEmailSet.has(r.email.toLowerCase())),
        active: r.active,
        company: r.company,
        phone: r.phone,
        address: r.address,
        legalName: r.legal_name || "",
        imageUrl,
        invoices: parseInt(r.invoices),
        revenue: parseFloat(r.revenue),
        incomeCount: parseInt(r.income_count),
        projectCount: parseInt(r.project_count),
        quotationCount: parseInt(r.quotation_count),
      };
    })
  );

  return clients;
}


export async function getClientById(clientId: string) {
  const clerk = await clerkClient();

  const rows = await sql`
    SELECT c.id,
           c.full_name as name,
           c.email,
           c.active,
           c.company,
           c.phone,
           c.address,
           c.clerk_id,
           c.website,
           c.legal_name
    FROM admin_clients c
    WHERE c.id = ${clientId}
  `;

  if (rows.length === 0) return null;
  const c = rows[0];

  let imageUrl = null;
  
  if (c.clerk_id) {
    try {
      const u = await clerk.users.getUser(c.clerk_id);
      if (u?.imageUrl) {
        imageUrl = u.imageUrl;
      }
    } catch (e) {
      console.warn("Failed to fetch clerk user image by ID", e);
    }
  }
  
  if (!imageUrl && c.email) {
    try {
      const { data: users } = await clerk.users.getUserList({ emailAddress: [c.email.trim()] });
      if (users.length > 0 && users[0].imageUrl) {
        imageUrl = users[0].imageUrl;
      }
    } catch (e) {
      console.warn("Failed to fetch clerk user image by email", e);
    }
  }

  if (!imageUrl && c.email) {
    imageUrl = getGravatarUrl(c.email.trim());
  }

  const invoices = await sql`
    SELECT invoice_id as id, project_name as service, total as amount, date as due_date, payment_status as status, created_at
    FROM invoices
    WHERE LOWER(user_email) = LOWER(${c.email})
    ORDER BY date DESC, created_at DESC
  `;

  // Also fetch manual income entries linked to this client
  const incomes = await sql`
    SELECT id, description as service, amount, date, category, invoice_id, created_at
    FROM admin_incomes
    WHERE client_id = ${clientId}
    ORDER BY date DESC, created_at DESC, id DESC
  `;

  // Build unified orders list — skip income rows already represented by a linked invoice
  const invoiceIds = new Set(invoices.map((r: any) => r.id));

  const invoiceOrders = invoices.map((r: any) => ({
    id: r.id,
    type: 'invoice',
    service: r.service,
    amount: parseFloat(r.amount),
    date: r.due_date ? new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
    status: r.status,
    overdue: r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date() && r.status !== 'fully paid'),
    rawDate: r.due_date ? new Date(r.due_date) : new Date(0),
  }));

  const incomeOrders = incomes
    .filter((r: any) => !r.invoice_id || !invoiceIds.has(r.invoice_id))
    .map((r: any) => ({
      id: `INC-${r.id}`,
      type: 'income',
      service: r.service || r.category || 'Income',
      amount: parseFloat(r.amount),
      date: r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
      status: 'fully paid', // manual incomes are already received
      overdue: false,
      rawDate: r.date ? new Date(r.date) : new Date(0),
    }));

  const orders = [...invoiceOrders, ...incomeOrders]
    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  return {
    id: c.id,
    name: c.name || c.email.split('@')[0],
    email: c.email,
    active: c.active,
    company: c.company,
    phone: c.phone,
    address: c.address,
    website: c.website,
    legalName: c.legal_name || "",
    imageUrl,
    orders,
    invoices: invoiceOrders, // kept for backward compatibility
  };
}

export async function generateUniqueInvoiceId(): Promise<string> {
  const existing = await sql`SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'INV-%'`;
  const usedIds = existing
    .map(row => parseInt(row.invoice_id.replace('INV-', ''), 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);
    
  let nextId = 1;
  for (const num of usedIds) {
    if (num === nextId) nextId++;
    else if (num > nextId) break;
  }
  return `INV-${String(nextId).padStart(5, '0')}`;
}

export async function getAvailableQuotationId(): Promise<number> {
  const existing = await sql`SELECT id FROM admin_quotations`;
  const usedIds = existing.map(r => r.id).sort((a, b) => a - b);
  let nextId = 1;
  for (const num of usedIds) {
    if (num === nextId) nextId++;
    else if (num > nextId) break;
  }
  return nextId;
}

export async function getAvailableReceiptId(): Promise<number> {
  const existing = await sql`SELECT id FROM admin_incomes`;
  const usedIds = existing.map(r => r.id).sort((a, b) => a - b);
  let nextId = 1;
  for (const num of usedIds) {
    if (num === nextId) nextId++;
    else if (num > nextId) break;
  }
  return nextId;
}

export async function createInvoice(invoiceData: any, lineItems: any[]) {
  // Upsert client — also save billing address if provided
  let existingClient: any[] = [];
  if (invoiceData.clientId) {
    existingClient = await sql`SELECT id FROM admin_clients WHERE id = ${invoiceData.clientId}`;
  } else if (invoiceData.userEmail) {
    existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${invoiceData.userEmail})`;
  }
  
  if (existingClient.length === 0 && (invoiceData.userEmail || invoiceData.phone)) {
    const clientId = invoiceData.clientId || 'C-' + Date.now();
    await sql`
      INSERT INTO admin_clients (id, full_name, company, email, phone, address, active, legal_name)
      VALUES (
        ${clientId},
        ${invoiceData.clientName || (invoiceData.userEmail ? invoiceData.userEmail.split('@')[0] : 'Unknown')},
        ${invoiceData.company || null},
        ${invoiceData.userEmail || null},
        ${invoiceData.phone || null},
        ${invoiceData.billingAddress || null},
        true,
        ${invoiceData.legalName || null}
      )
    `;
  } else if (existingClient.length > 0) {
    // Update name/address on existing client whenever new values were entered
    await sql`
      UPDATE admin_clients
      SET 
        full_name = COALESCE(${invoiceData.clientName || null}, full_name),
        address = COALESCE(${invoiceData.billingAddress || null}, address),
        legal_name = COALESCE(${invoiceData.legalName || null}, legal_name)
      WHERE id = ${existingClient[0].id}
    `;
  }

  const invoiceId = await generateUniqueInvoiceId();
  await sql`
  INSERT INTO invoices (
    invoice_id, user_email, project_name, date, due_date,
    subtotal, discount, total, advance, total_due, 
    work_status, payment_status, currency, category, bank_account_id, tax_rate, legal_name
  ) VALUES (
    ${invoiceId}, ${invoiceData.userEmail || null},
    ${invoiceData.projectName}, ${invoiceData.date}, ${invoiceData.dueDate || null},
    ${invoiceData.subtotal}, ${invoiceData.discount}, ${invoiceData.total}, ${invoiceData.advance}, ${invoiceData.totalDue},
    ${invoiceData.workStatus}, ${invoiceData.paymentStatus}, ${invoiceData.currency}, ${invoiceData.category || null},
    ${invoiceData.bankAccountId || null}, ${parseFloat(invoiceData.taxRate) || 0}, ${invoiceData.legalName || null}
  )
`;

  for (const item of lineItems) {
    if (item.description) {
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
        VALUES (${invoiceId}, ${item.description}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate})
      `;
    }
  }

  await logSystemAction(`Created invoice: "${invoiceData.projectName}" (${invoiceId}) for LKR ${invoiceData.total}`);
  return { success: true, invoiceId };
}

export async function updateInvoice(invoiceId: string, invoiceData: any, lineItems: any[]) {
  // If a billing address was edited, persist it back to admin_clients
  if (invoiceData.billingAddress) {
    await sql`
      UPDATE admin_clients
      SET 
        address = ${invoiceData.billingAddress},
        legal_name = COALESCE(${invoiceData.legalName || null}, legal_name)
      WHERE LOWER(email) = LOWER(${invoiceData.userEmail})
    `;
  }

  const existingPayments = await sql`
    SELECT amount, description FROM admin_incomes WHERE invoice_id = ${invoiceId}
  `;
  const nonAdvancePayments = existingPayments
    .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  const subtotalVal = parseFloat(invoiceData.subtotal || 0);
  const discountVal = parseFloat(invoiceData.discount || 0);
  const advanceVal  = parseFloat(invoiceData.advance || 0);
  const taxRateVal  = parseFloat(invoiceData.taxRate || 0);
  const taxAmountVal = subtotalVal * (taxRateVal / 100);
  const totalVal    = parseFloat(invoiceData.total || (subtotalVal + taxAmountVal - discountVal));
  const calculatedTotalDue = Math.max(0, totalVal - advanceVal - nonAdvancePayments);

  await sql`
  UPDATE invoices SET
    user_email = ${invoiceData.userEmail},
    project_name = ${invoiceData.projectName},
    date = ${invoiceData.date},
    due_date = ${invoiceData.dueDate || null},
    subtotal = ${invoiceData.subtotal},
    discount = ${invoiceData.discount},
    total = ${invoiceData.total},
    advance = ${invoiceData.advance},
    total_due = ${calculatedTotalDue},
    work_status = ${invoiceData.workStatus},
    payment_status = ${invoiceData.paymentStatus},
    currency = ${invoiceData.currency},
    category = ${invoiceData.category || null},
    bank_account_id = ${invoiceData.bankAccountId || null},
    tax_rate = ${parseFloat(invoiceData.taxRate) || 0},
    legal_name = ${invoiceData.legalName || null}
  WHERE invoice_id = ${invoiceId}
`;

  await sql`DELETE FROM invoice_items WHERE invoice_id = ${invoiceId}`;

  for (const item of lineItems) {
    if (item.description) {
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
        VALUES (${invoiceId}, ${item.description}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate})
      `;
    }
  }

  await logSystemAction(`Updated invoice: "${invoiceData.projectName}" (${invoiceId})`);
  return { success: true };
}

// -- REPORTS --
export async function getReports(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const [incomeStats, expenseStats, rawIncome, expensesBreakdown, journalEntriesRaw] = await Promise.all([
    sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`,
    sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`,
    sql`
      SELECT category, amount
      FROM admin_incomes
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    `,
    sql`
      SELECT category as name, SUM(amount) as value
      FROM admin_expenses
      WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      GROUP BY category
      ORDER BY value DESC
    `,
    sql`
      SELECT id, 'income' as type, description, date, created_at, amount, category, payment_method, invoice_id FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      UNION ALL
      SELECT id, 'expense' as type, description, date, created_at, amount, category, payment_method, NULL as invoice_id FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
      ORDER BY date DESC, created_at DESC
    `
  ]);

  const totalIncome = parseFloat(incomeStats[0]?.total || 0);
  const totalExpenses = parseFloat(expenseStats[0]?.total || 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

  const serviceMap: Record<string, number> = {};
  for (const row of rawIncome) {
    const rawCategory = (row.category || 'Other').trim();
    const categoryName = rawCategory
      ? rawCategory.split(',').map((s: string) => s.trim()).filter(Boolean).join(' + ') || 'Other'
      : 'Other';
    serviceMap[categoryName] = (serviceMap[categoryName] || 0) + parseFloat(row.amount);
  }
  const incomeByService = Object.entries(serviceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const journalEntries = journalEntriesRaw.map((r: any) => ({
    id: `${r.type}-${r.id}`,
    rawId: r.id,
    type: r.type,
    description: r.description || '',
    date: r.date,
    amount: parseFloat(r.amount || 0),
    category: r.category || 'Other',
    paymentMethod: r.payment_method || 'Cash',
    invoiceId: r.invoice_id || null
  }));

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    incomeByService,
    expensesBreakdown: expensesBreakdown.map(r => ({ name: r.name || 'Other', value: parseFloat(r.value) })),
    journalEntries
  };
}

// -- QUOTATIONS --
export async function getQuotations(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';
  
  const rows = await sql`
    SELECT q.id, q.date, q.amount, q.advance, q.total_due as "totalDue", q.discount, q.bank_account_id as "bankAccountId",
           COALESCE(c.full_name, q.client_name) as client, COALESCE(c.email, q.client_email) as "clientEmail", q.client_phone as "clientPhone", q.client_id as "clientId", q.description as desc, q.category,
           q.invoice_id as invoice, q.receipt_url as "receiptUrl", q.status, q.project_confirmed as "projectConfirmed", q.legal_name as "legalName", q.created_at
    FROM admin_quotations q
    LEFT JOIN admin_clients c ON q.client_id = c.id
    WHERE q.date >= ${start}::timestamp AND q.date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY q.date DESC, q.created_at DESC, q.id DESC
  `;
 
  const confirmedCount = rows.filter((r: any) => r.status === 'confirmed').length;
  const totalValue = rows.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
 
  return {
    confirmedCount,
    totalValue,
    items: rows.map(r => ({
      ...r,
      created_at: r.created_at,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount),
      advance: parseFloat(r.advance || 0),
      discount: parseFloat(r.discount || 0),
      bankAccountId: r.bankAccountId,
      clientEmail: r.clientEmail || '',
      legalName: r.legalName || '',
      totalDue: parseFloat(r.totalDue || r.amount),
      paymentMethod: 'Bank Transfer'
    }))
  };
}
 
// ─── REPLACE createQuotation in actions.ts ───────────────────────────────────
export async function createQuotation(data: any, lineItems: any[] = []) {
  const advance = data.advance || 0;
  const discount = data.discount || 0;
  const totalDue = data.totalDue ?? (data.amount - advance);

  let existingClient: any[] = [];
  if (data.clientId) {
    existingClient = await sql`SELECT id FROM admin_clients WHERE id = ${data.clientId}`;
  } else if (data.userEmail) {
    existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${data.userEmail})`;
  }

  if (existingClient.length === 0 && (data.userEmail || data.phone)) {
    const clientId = data.clientId || 'C-' + Date.now();
    data.clientId = clientId;
    await sql`
      INSERT INTO admin_clients (id, full_name, email, phone, address, active, legal_name)
      VALUES (
        ${clientId},
        ${data.clientName || (data.userEmail ? data.userEmail.split('@')[0] : 'Unknown')},
        ${data.userEmail || null},
        ${data.phone || null},
        ${data.billingAddress || null},
        true,
        ${data.legalName || null}
      )
    `;
  } else if (existingClient.length > 0) {
    data.clientId = existingClient[0].id;
    await sql`
      UPDATE admin_clients
      SET 
        full_name = COALESCE(${data.clientName || null}, full_name),
        address = COALESCE(${data.billingAddress || null}, address),
        legal_name = COALESCE(${data.legalName || null}, legal_name),
        email = COALESCE(${data.userEmail || null}, email),
        phone = COALESCE(${data.phone || null}, phone)
      WHERE id = ${existingClient[0].id}
    `;
  }

  const nextId = await getAvailableQuotationId();

  const result = await sql`
    INSERT INTO admin_quotations (
      id, date, amount, advance, total_due, discount,
      description, category, payment_method, invoice_id, client_id, receipt_url, status, bank_account_id, notes, legal_name, valid_until
    )
    VALUES (
      ${nextId}, ${data.date}, ${data.amount}, ${advance}, ${totalDue}, ${discount},
      ${data.description}, ${data.category}, ${data.paymentMethod},
      ${data.invoiceId || null}, ${data.clientId || null}, ${data.receiptUrl || null}, 'draft', ${data.bankAccountId || null}, ${data.notes || null}, ${data.legalName || null}, ${data.validUntil || null}
    )
    RETURNING id
  `;

  const quotationId = result[0].id;

  for (const item of lineItems) {
    if (item.description) {
      await sql`
        INSERT INTO quotation_items (quotation_id, description, quantity, price, total)
        VALUES (${quotationId}, ${item.description}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate})
      `;
    }
  }
  await logSystemAction(`Created quotation for "${data.description || 'Quotation'}" (ID: ${quotationId}) for LKR ${data.amount}`);
}

// ─── REPLACE updateQuotation in actions.ts ───────────────────────────────────
export async function updateQuotation(id: number, data: any, lineItems: any[] = []) {
  try {
    const advance = data.advance || 0;
    const discount = data.discount || 0;
    const totalDue = data.totalDue ?? (data.amount - advance);

    let existingClient: any[] = [];
    if (data.clientId) {
      existingClient = await sql`SELECT id FROM admin_clients WHERE id = ${data.clientId}`;
    } else if (data.userEmail) {
      existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${data.userEmail})`;
    }

    if (existingClient.length === 0 && (data.userEmail || data.phone)) {
      const clientId = data.clientId || 'C-' + Date.now();
      data.clientId = clientId;
      await sql`
        INSERT INTO admin_clients (id, full_name, email, phone, address, active, legal_name)
        VALUES (
          ${clientId},
          ${data.clientName || (data.userEmail ? data.userEmail.split('@')[0] : 'Unknown')},
          ${data.userEmail || null},
          ${data.phone || null},
          ${data.billingAddress || null},
          true,
          ${data.legalName || null}
        )
      `;
    } else if (existingClient.length > 0) {
      data.clientId = existingClient[0].id;
      await sql`
        UPDATE admin_clients
        SET 
          full_name = COALESCE(${data.clientName || null}, full_name),
          address = COALESCE(${data.billingAddress || null}, address),
          legal_name = COALESCE(${data.legalName || null}, legal_name),
          email = COALESCE(${data.userEmail || null}, email),
          phone = COALESCE(${data.phone || null}, phone)
        WHERE id = ${existingClient[0].id}
      `;
    }

    await sql`
      UPDATE admin_quotations 
      SET 
        date          = ${data.date}, 
        amount        = ${data.amount},
        advance       = ${advance},
        total_due     = ${totalDue},
        discount      = ${discount},
        description   = ${data.description}, 
        category      = ${data.category}, 
        payment_method= ${data.paymentMethod}, 
        client_id     = ${data.clientId || null},
        invoice_id    = ${data.invoiceId || null}, 
        receipt_url   = ${data.receiptUrl || null},
        bank_account_id = ${data.bankAccountId || null},
        notes         = ${data.notes || null},
        legal_name    = ${data.legalName || null},
        valid_until   = ${data.validUntil || null}
      WHERE id = ${id} AND status != 'confirmed'
    `;

    await sql`DELETE FROM quotation_items WHERE quotation_id = ${id}`;

    for (const item of lineItems) {
      if (item.description) {
        await sql`
          INSERT INTO quotation_items (quotation_id, description, quantity, price, total)
          VALUES (${id}, ${item.description}, ${item.quantity}, ${item.rate}, ${item.quantity * item.rate})
        `;
      }
    }

    await logSystemAction(`Updated quotation ID ${id} ("${data.description || 'Quotation'}")`);
    revalidatePath("/admin/quotations");
    revalidatePath(`/admin/quotations/${id}/edit`);
    revalidatePath("/admin/clients");
  } catch (e) {
    console.error("Failed to update quotation:", e);
    throw new Error("Failed to update quotation");
  }
}
 
export async function deleteQuotation(id: number) {
  let quoteDesc = "";
  try {
    const existing = await sql`SELECT description FROM admin_quotations WHERE id = ${id}`;
    if (existing.length > 0) {
      quoteDesc = existing[0].description || "";
    }
  } catch (e) {}

  const q = await sql`SELECT linked_invoice_id FROM admin_quotations WHERE id = ${id}`;
  const linkedInvoiceId = q[0]?.linked_invoice_id;

  if (linkedInvoiceId) {
    await sql`UPDATE admin_quotations SET linked_invoice_id = NULL WHERE id = ${id}`;
    await sql`DELETE FROM invoice_items WHERE invoice_id = ${linkedInvoiceId}`;
    await sql`DELETE FROM invoices WHERE invoice_id = ${linkedInvoiceId}`;
  }

  await sql`DELETE FROM admin_quotations WHERE id = ${id}`;
  await logSystemAction(`Deleted quotation ID ${id} ("${quoteDesc}")`);
}
 
export async function confirmQuotation(quotationId: number, quotationData: any, projectName: string, bankAccountId: number | null = null) {
  const quotation = await sql`
    SELECT q.*, c.id as client_id_val, COALESCE(c.email, q.client_email) as email, COALESCE(c.full_name, q.client_name) as client_name, c.company, c.address as billing_address
    FROM admin_quotations q
    LEFT JOIN admin_clients c ON q.client_id = c.id
    WHERE q.id = ${quotationId}
  `;

  if (quotation.length === 0) throw new Error(`Quotation #${quotationId} not found`);

  const q = quotation[0];

  if (q.status === 'confirmed') {
    throw new Error("Quotation is already confirmed");
  }

  const userEmail = q.email || null;
  if (!userEmail) throw new Error("Quotation has no linked client email — please assign a client before confirming");

  const amount   = parseFloat(q.amount   || 0);
  const discountVal = parseFloat(q.discount || 0);
  const subtotalVal = amount + discountVal; // since amount is total (subtotal - discount), subtotal is amount + discount
  const invoiceTotal = amount; // no need to subtract discount again
  const advanceVal = parseFloat(q.advance || 0);
  const totalDueVal = invoiceTotal - advanceVal;
  const description = q.description || 'Project';

  // Resolve or create client
  let resolvedClientId: string | null = q.client_id_val || null;
  const existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${userEmail})`;
  if (existingClient.length === 0) {
    const clientId = 'C-' + Date.now();
    await sql`
      INSERT INTO admin_clients (id, full_name, company, email, phone, address, active)
      VALUES (
        ${clientId},
        ${q.client_name || userEmail.split('@')[0]},
        ${q.company || null},
        ${userEmail},
        null,
        ${q.billing_address || null},
        true
      )
    `;
    resolvedClientId = clientId;
  } else {
    resolvedClientId = existingClient[0].id;
  }

  const invoiceId = await generateUniqueInvoiceId();

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // Create invoice with work_status = 'in progress'
    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date,
        subtotal, discount, total, advance, total_due,
        work_status, payment_status, currency, bank_account_id
      ) VALUES (
        ${invoiceId},
        ${userEmail},
        ${projectName},
        ${todayStr},
        ${subtotalVal},
        ${discountVal},
        ${invoiceTotal},
        ${advanceVal},
        ${totalDueVal},
        'in progress',
        'unpaid',
        'LKR',
        ${bankAccountId}
      )
    `;

    const qItems = await sql`
      SELECT description, quantity, price, total FROM quotation_items WHERE quotation_id = ${quotationId}
    `;

    if (qItems.length > 0) {
      for (const item of qItems) {
        await sql`
          INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
          VALUES (${invoiceId}, ${item.description}, ${item.quantity}, ${item.price}, ${item.total})
        `;
      }
    } else {
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
        VALUES (${invoiceId}, ${description}, 1, ${amount}, ${amount})
      `;
    }

    await sql`
      UPDATE admin_quotations
      SET status = 'confirmed', project_confirmed = true, linked_invoice_id = ${invoiceId}
      WHERE id = ${quotationId}
    `;

    await logSystemAction(`Confirmed quotation ID ${quotationId} for "${projectName}" (Linked Invoice: ${invoiceId})`);

    return { success: true, invoiceId };

  } catch (e: any) {
    console.error("confirmQuotation DB error:", e);
    throw new Error(e?.message ?? "Failed to confirm quotation and create invoice");
  }
}

export async function getQuotationById(quotationId: string) {
  try {
    const quotation = await sql`
      SELECT q.*,
             COALESCE(c.full_name, q.client_name) as client_name, COALESCE(c.email, q.client_email) as email, c.company, COALESCE(c.phone, q.client_phone) as phone,
             c.address as billing_address,
             ba.name as bank_acc_name, ba.account_number as bank_acc_number,
      ba.bank_name as bank_acc_bank,
      ba.branch as bank_acc_branch
      FROM admin_quotations q
      LEFT JOIN admin_clients c ON q.client_id = c.id
      LEFT JOIN admin_accounts ba ON COALESCE(q.bank_account_id, (SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1)) = ba.id
      WHERE q.id = ${parseInt(quotationId)}
    `;
 
    if (quotation.length === 0) return null;
 
    const q = quotation[0];
 
    const itemRows = await sql`
      SELECT id, description, quantity, price, total
      FROM quotation_items
      WHERE quotation_id = ${parseInt(quotationId)}
      ORDER BY id ASC
    `;
 
    return {
      id: q.id,
      date: q.date,
      amount: parseFloat(q.amount),
      advance: parseFloat(q.advance || 0),
      total_due: parseFloat(q.total_due || q.amount),
      billing_address: q.billing_address || '',
      client_id: q.client_id,
      client_name: q.client_name || q.email?.split('@')[0] || '',
      email: q.email,
      company: q.company,
      phone: q.phone,
      project_name: q.description,
      description: q.description,
      category: q.category,
      payment_method: q.payment_method,
      invoice_id: q.invoice_id,
      valid_until: q.valid_until,
      receipt_url: q.receipt_url,
      status: q.status,
      project_confirmed: q.project_confirmed,
      created_at: q.created_at,
      updated_at: q.updated_at,
      discount: q.discount || 0,
      notes: q.notes || "",
      legal_name: q.legal_name || "",
      bank_account_id: q.bank_account_id,
      bank_acc_name: q.bank_acc_name,
      bank_acc_number: q.bank_acc_number,
      bank_acc_bank: q.bank_acc_bank,
      bank_acc_branch: q.bank_acc_branch,
      items: itemRows.map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: parseInt(i.quantity),
        rate: parseFloat(i.price),
        total: parseFloat(i.total),
      }))
    };
  } catch (e) {
    console.error("Failed to fetch quotation by ID:", e);
    throw new Error("Failed to fetch quotation");
  }
}


// -- BANK ACCOUNTS --
export async function getBankAccounts() {
  const rows = await sql`
    SELECT id, name, account_number as number, bank_name as bank, branch, 0 as is_default
    FROM admin_accounts
    WHERE type = 'Bank Account'
    ORDER BY id ASC
  `;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    number: r.number,
    bank: r.bank,
    branch: r.branch,
    is_default: Number(r.is_default || 0),
  }));
}

export async function recordInvoicePayment(
  invoiceId: string,
  paidAmount: number,
  paymentMethod: string,
  paymentDate: string,
  isAdvance: boolean,
  customDescription?: string,
  accountId?: number | null
) {
  try {
    // 1. Fetch invoice info
    const invoiceRows = await sql`
      SELECT user_email, project_name, total, currency, category, payment_status, advance, total_due, bank_account_id, bank_slip
      FROM invoices
      WHERE invoice_id = ${invoiceId}
    `;
    if (invoiceRows.length === 0) {
      throw new Error("Invoice not found");
    }
    const invoice = invoiceRows[0];
    const totalAmount = parseFloat(invoice.total);
    const currentAdvance = parseFloat(invoice.advance || '0');
    const currentTotalDue = parseFloat(invoice.total_due != null ? invoice.total_due : invoice.total);

    // 2. Fetch or resolve client
    let clientId = null;
    if (invoice.user_email) {
      const clientRows = await sql`
        SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${invoice.user_email})
      `;
      if (clientRows.length > 0) {
        clientId = clientRows[0].id;
      }
    }

    // 3. Create description and category for the income entry
    let description = customDescription;
    if (!description) {
      description = isAdvance 
        ? `Advance: ${invoice.project_name || 'Project'}`
        : invoice.project_name || 'Payment';
    }
    const category = invoice.category || 'Web dev';

    // 4. Create the income record with receipt_url if available
    let receiptUrlToAttach = null;
    if (invoice.bank_slip) {
      receiptUrlToAttach = invoice.bank_slip;
    } else {
      const existingSlips = await sql`
        SELECT slip_url FROM invoice_payment_slips WHERE invoice_id = ${invoiceId} ORDER BY id DESC LIMIT 1
      `;
      if (existingSlips.length > 0) {
        receiptUrlToAttach = existingSlips[0].slip_url;
      }
    }

    const nextId = await getAvailableReceiptId();
    await sql`
      INSERT INTO admin_incomes (id, date, amount, description, category, payment_method, invoice_id, client_id, receipt_url, account_id)
      VALUES (${nextId}, ${paymentDate}, ${paidAmount}, ${description}, ${category}, ${paymentMethod}, ${invoiceId}, ${clientId}, ${receiptUrlToAttach}, ${accountId != null ? accountId : (paymentMethod === 'Bank Transfer' ? invoice.bank_account_id : null)})
    `;

    // 5. Update invoice payment fields
    let newAdvance = currentAdvance;
    let newTotalDue = currentTotalDue;
    let newStatus = invoice.payment_status;

    if (isAdvance) {
      newAdvance = currentAdvance + paidAmount;
      newTotalDue = Math.max(0, totalAmount - newAdvance);
      newStatus = 'advance-paid';
    } else {
      newTotalDue = Math.max(0, currentTotalDue - paidAmount);
      const isFullyPaid = newTotalDue < 0.01;
      newStatus = isFullyPaid ? 'fully paid' : 'partially paid';
    }

    await sql`
      UPDATE invoices
      SET payment_status = ${newStatus},
          advance = ${newAdvance},
          total_due = ${newTotalDue}
      WHERE invoice_id = ${invoiceId}
    `;

    await logSystemAction(`Recorded payment of LKR ${paidAmount} via ${paymentMethod} for invoice ${invoiceId}`);

    if (newStatus === "fully paid") {
      await reactivateDomainAfterRenewalPayment(invoiceId);
    }

    return { success: true };
  } catch (e) {
    console.error("Failed to record invoice payment:", e);
    throw new Error(e instanceof Error ? e.message : "Failed to record invoice payment");
  }
}

export async function submitBankSlip(invoiceId: string, slipBase64: string, amount?: string | number) {
  try {
    const invoiceRows = await sql`SELECT total, total_due, category FROM invoices WHERE invoice_id = ${invoiceId}`;
    if (invoiceRows.length === 0) return { success: false, error: "Invoice not found" };

    const invoice = invoiceRows[0];
    const currentDue = parseFloat(invoice.total_due != null ? invoice.total_due : invoice.total || '0');
    const isDomainInvoice = String(invoice.category || '').toLowerCase() === 'domain';
    let slipAmount = isDomainInvoice ? currentDue : parseFloat(String(amount ?? ''));

    if (isDomainInvoice) {
      slipAmount = currentDue;
    }

    if (!Number.isFinite(slipAmount) || slipAmount <= 0) {
      return { success: false, error: "Please enter a valid payment amount" };
    }

    if (slipAmount > currentDue + 0.0001) {
      return { success: false, error: "Amount cannot exceed the remaining balance" };
    }

    let bankSlipUrl = slipBase64;
    if (typeof slipBase64 === 'string' && slipBase64.startsWith('data:')) {
      const matches = slipBase64.match(/^data:(.+);base64,(.*)$/);
      if (!matches) {
        throw new Error('Invalid slip data');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const fileExtension = mimeType.split('/')[1].split('+')[0] || 'png';
      const binary = Buffer.from(base64Data, 'base64');
      const filename = `admin/bank-slips/${Date.now()}-${invoiceId}.${fileExtension}`;
      const blob = await put(filename, binary, {
        access: 'public',
        contentType: mimeType,
      });
      bankSlipUrl = blob.url;
    }

    await sql`
      INSERT INTO invoice_payment_slips (invoice_id, slip_url, amount, status)
      VALUES (${invoiceId}, ${bankSlipUrl}, ${parseFloat(slipAmount.toFixed(2))}, 'pending')
    `;

    await sql`
      UPDATE invoices
      SET payment_status = 'on review',
          bank_slip = ${bankSlipUrl}
      WHERE invoice_id = ${invoiceId}
    `;

    await sql`
      UPDATE admin_incomes
      SET receipt_url = ${bankSlipUrl}
      WHERE invoice_id = ${invoiceId} AND receipt_url IS NULL
    `;

    await logSystemAction(`Bank slip uploaded for invoice ${invoiceId}. Status changed to on review.`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to upload bank slip:", err);
    return { success: false, error: err.message };
  }
}

export async function approveBankSlip(invoiceId: string, slipId?: string | number) {
  try {
    let slipRows: any[] = [];
    if (slipId != null) {
      slipRows = await sql`SELECT * FROM invoice_payment_slips WHERE invoice_id = ${invoiceId} AND id = ${slipId}`;
    } else {
      slipRows = await sql`
        SELECT * FROM invoice_payment_slips
        WHERE invoice_id = ${invoiceId} AND status = 'pending'
        ORDER BY uploaded_at ASC, id ASC
        LIMIT 1
      `;
    }

    if (slipRows.length === 0) return { success: false, error: "Slip not found" };
    const slip = slipRows[0];
    if (slip.status !== 'pending') return { success: false, error: "Slip already processed" };

    const invoiceRows = await sql`SELECT * FROM invoices WHERE invoice_id = ${invoiceId}`;
    if (invoiceRows.length === 0) return { success: false, error: "Invoice not found" };
    const invoice = invoiceRows[0];

    const paidAmount = parseFloat(slip.amount || 0);
    const currentTotalDue = parseFloat(invoice.total_due != null ? invoice.total_due : invoice.total);
    const newTotalDue = Math.max(0, currentTotalDue - paidAmount);

    let newStatus = 'unpaid';
    if (newTotalDue < 0.01) {
      newStatus = 'fully paid';
    } else if (currentTotalDue > 0.01) {
      newStatus = 'partially paid';
    }

    let clientId = null;
    if (invoice.user_email) {
      const clientRows = await sql`
        SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${invoice.user_email})
      `;
      if (clientRows.length > 0) {
        clientId = clientRows[0].id;
      }
    }

    const description = `Bank Transfer Payment for ${invoice.project_name || 'Project'}`;
    const category = invoice.category || 'Web dev';
    const nextId = await getAvailableReceiptId();
    await sql`
      INSERT INTO admin_incomes (id, date, amount, description, category, payment_method, invoice_id, client_id, receipt_url, account_id)
      VALUES (${nextId}, CURRENT_DATE, ${paidAmount}, ${description}, ${category}, 'Bank Transfer', ${invoiceId}, ${clientId}, ${slip.slip_url || null}, ${invoice.bank_account_id})
    `;

    await sql`
      UPDATE invoice_payment_slips
      SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ${slip.id}
    `;

    await sql`
      UPDATE invoices
      SET payment_status = ${newStatus},
          total_due = ${newTotalDue}
      WHERE invoice_id = ${invoiceId}
    `;

    await logSystemAction(`Approved bank slip for invoice ${invoiceId}. Amount: ${paidAmount}.`);

    if (newStatus === "fully paid") {
      await reactivateDomainAfterRenewalPayment(invoiceId);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to approve bank slip:", err);
    return { success: false, error: err.message };
  }
}

export async function declineBankSlip(invoiceId: string, slipId?: string | number) {
  try {
    let slipRows: any[] = [];
    if (slipId != null) {
      slipRows = await sql`SELECT * FROM invoice_payment_slips WHERE invoice_id = ${invoiceId} AND id = ${slipId}`;
    } else {
      slipRows = await sql`
        SELECT * FROM invoice_payment_slips
        WHERE invoice_id = ${invoiceId} AND status = 'pending'
        ORDER BY uploaded_at ASC, id ASC
        LIMIT 1
      `;
    }

    if (slipRows.length === 0) return { success: false, error: "Slip not found" };
    const slip = slipRows[0];
    if (slip.status !== 'pending') return { success: false, error: "Slip already processed" };

    // Delete the slip image from blob storage if it exists
    const slipUrl = slip.slip_url;
    if (slipUrl && (slipUrl.includes('blob.vercel-storage.com') || slipUrl.includes('public.blob.vercel-storage.com'))) {
      try {
        // Extract the blob path from the URL
        const urlParts = slipUrl.split('.com/');
        if (urlParts.length > 1) {
          const blobPath = urlParts[1];
          await del(blobPath);
        }
      } catch (blobErr) {
        console.warn("Failed to delete slip image from blob storage:", blobErr);
      }
    }

    // Delete the slip record from the database
    await sql`
      DELETE FROM invoice_payment_slips
      WHERE id = ${slip.id}
    `;

    const remainingPendingRows = await sql`
      SELECT id FROM invoice_payment_slips
      WHERE invoice_id = ${invoiceId} AND status = 'pending'
    `;
    const approvedRows = await sql`
      SELECT id FROM invoice_payment_slips
      WHERE invoice_id = ${invoiceId} AND status = 'approved'
    `;

    if (remainingPendingRows.length === 0 && approvedRows.length === 0) {
      await sql`
        UPDATE invoices
        SET payment_status = 'pending'
        WHERE invoice_id = ${invoiceId}
      `;
    }

    await logSystemAction(`Deleted declined bank slip for invoice ${invoiceId}.`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to decline bank slip:", err);
    return { success: false, error: err.message };
  }
}

export async function undoApprovedBankSlipPayment(invoiceId: string, slipId: number) {
  try {
    // First, get the specific slip to find its amount
    const slipRows = await sql`
      SELECT amount FROM invoice_payment_slips
      WHERE invoice_id = ${invoiceId} AND id = ${slipId} AND status = 'approved'
    `;

    if (slipRows.length === 0) {
      return { success: false, error: "No approved bank slip found with this ID" };
    }

    const slipAmount = parseFloat(slipRows[0].amount || "0");

    // Find the corresponding income record for this specific slip
    const incomeRows = await sql`
      SELECT id, amount, description
      FROM admin_incomes
      WHERE invoice_id = ${invoiceId}
        AND payment_method = 'Bank Transfer'
        AND amount = ${slipAmount}
      ORDER BY id DESC
      LIMIT 1
    `;

    if (incomeRows.length === 0) {
      // Even if no income record found, we can still mark the slip as declined
      await sql`
        UPDATE invoice_payment_slips
        SET status = 'declined', reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ${slipId}
      `;

      await logSystemAction(`Marked bank slip ${slipId} as declined (no income record to reverse).`);
      return { success: true };
    }

    const incomeId = incomeRows[0].id;

    // Delete the income record
    await deleteIncome(incomeId);

    // Mark the slip as declined
    await sql`
      UPDATE invoice_payment_slips
      SET status = 'declined', reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ${slipId}
    `;

    await logSystemAction(`Declined approved bank slip ${slipId} for invoice ${invoiceId}. Reversed income record of ${slipAmount}.`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to undo approved bank slip payment:", err);
    return { success: false, error: err.message };
  }
}

export async function adminUploadPaymentSlip(invoiceId: string, slipBase64: string, amount: number) {
  try {
    // Validate amount
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Please enter a valid payment amount" };
    }

    // Process the slip image
    let slipUrl = slipBase64;
    if (typeof slipBase64 === 'string' && slipBase64.startsWith('data:')) {
      const matches = slipBase64.match(/^data:(.+);base64,(.*)$/);
      if (!matches) {
        throw new Error('Invalid slip data');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const fileExtension = mimeType.split('/')[1].split('+')[0] || 'png';
      const binary = Buffer.from(base64Data, 'base64');
      const filename = `admin/payment-slips/${Date.now()}-${invoiceId}.${fileExtension}`;
      const blob = await put(filename, binary, {
        access: 'public',
        contentType: mimeType,
      });
      slipUrl = blob.url;
    }

    // Insert the slip with 'approved' status and mark as admin-uploaded
    await sql`
      INSERT INTO invoice_payment_slips (invoice_id, slip_url, amount, status, reviewed_at, review_note)
      VALUES (${invoiceId}, ${slipUrl}, ${amount}, 'approved', CURRENT_TIMESTAMP, 'Added by admin')
    `;

    await sql`
      UPDATE admin_incomes
      SET receipt_url = ${slipUrl}
      WHERE invoice_id = ${invoiceId} AND receipt_url IS NULL
    `;

    await logSystemAction(`Admin uploaded and auto-approved payment slip for invoice ${invoiceId}: LKR ${amount}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to upload admin payment slip:", err);
    return { success: false, error: err.message };
  }
}

// -- PAYMENT SLIPS --
export async function submitPaymentSlip(invoiceId: string, amount: number, slipBase64: string) {
  try {
    let slipUrl = slipBase64;
    if (typeof slipBase64 === 'string' && slipBase64.startsWith('data:')) {
      const matches = slipBase64.match(/^data:(.+);base64,(.*)$/);
      if (!matches) {
        throw new Error('Invalid slip data');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const fileExtension = mimeType.split('/')[1].split('+')[0] || 'png';
      const binary = Buffer.from(base64Data, 'base64');
      const filename = `admin/payment-slips/${Date.now()}-${invoiceId}.${fileExtension}`;
      const blob = await put(filename, binary, {
        access: 'public',
        contentType: mimeType,
      });
      slipUrl = blob.url;
    }

    await sql`
      INSERT INTO invoice_payment_slips (invoice_id, slip_url, amount, status)
      VALUES (${invoiceId}, ${slipUrl}, ${amount}, 'pending')
    `;

    await logSystemAction(`Payment slip submitted for invoice ${invoiceId}: LKR ${amount}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to submit payment slip:", err);
    return { success: false, error: err.message };
  }
}

export async function reviewPaymentSlip(id: number, approved: boolean, reviewerId: string, note?: string) {
  try {
    const slipRows = await sql`SELECT * FROM invoice_payment_slips WHERE id = ${id}`;
    if (slipRows.length === 0) return { success: false, error: "Slip not found" };
    const slip = slipRows[0];

    const invoiceId = slip.invoice_id;
    const amount = slip.amount;

    if (approved) {
      // On approval, find the corresponding invoice and update its payment status
      const invoiceRows = await sql`SELECT * FROM invoices WHERE invoice_id = ${invoiceId}`;
           if (invoiceRows.length > 0) {
        const invoice = invoiceRows[0];
        const newTotalDue = Math.max(0, parseFloat(invoice.total_due) - amount);
        let newStatus = 'partially paid';

        if (newTotalDue < 0.01) {
          newStatus = 'fully paid';
        }

        await sql`
          UPDATE invoices
          SET payment_status = ${newStatus},
              total_due = ${newTotalDue}
          WHERE invoice_id = ${invoiceId}
        `;
      }

      await logSystemAction(`Approved payment slip for invoice ${invoiceId}: LKR ${amount}`);
    } else {
      await logSystemAction(`Declined payment slip for invoice ${invoiceId}: LKR ${amount}`);
    }

    await sql`
      UPDATE invoice_payment_slips
      SET status = ${approved ? 'approved' : 'declined'},
          reviewed_at = CURRENT_TIMESTAMP,
          reviewed_by = ${reviewerId},
          review_note = ${note || null}
      WHERE id = ${id}
    `;

    return { success: true };
  } catch (err: any) {
    console.error("Failed to review payment slip:", err);
    return { success: false, error: err.message };
  }
}

export async function getExpenseBreakdownByMode(mode: string) {
  let start = '1970-01-01';
  let end = '2099-12-31';

  const now = new Date();
  if (mode === 'This Month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (mode === 'Last Month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  } else if (mode === 'This Year') {
    start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
  } else if (mode === 'Last Year') {
    start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
  } // Lifetime is default

  const rows = await sql`
    SELECT 
      category as name,
      SUM(amount) as value
    FROM admin_expenses
    WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    GROUP BY category
    ORDER BY value DESC
  `;

  const total = rows.reduce((sum, r) => sum + parseFloat(r.value), 0);
  return rows.map(r => {
    const val = parseFloat(r.value);
    return {
      name: r.name || 'Other',
      value: val,
      percentage: total > 0 ? parseFloat(((val / total) * 100).toFixed(1)) : 0
    };
  });
}

export async function getTopClients() {
  // Lifetime top clients by revenue
  const rows = await sql`
    SELECT 
      c.full_name as name,
      SUM(i.amount) as value
    FROM admin_incomes i
    LEFT JOIN admin_clients c ON i.client_id = c.id
    WHERE c.full_name IS NOT NULL
    GROUP BY c.id, c.full_name
    ORDER BY value DESC
    LIMIT 6
  `;
  return rows.map(r => ({
    name: r.name,
    value: parseFloat(r.value)
  }));
}
