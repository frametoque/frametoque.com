"use server";

import sql from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { promises as fs } from 'fs';
import path from 'path';

export async function uploadReceipt(formData: FormData, type: 'income' | 'expenses'): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) throw new Error("No file uploaded");

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const uploadDir = path.join(process.cwd(), 'public', 'admin', 'receipts', type);
  
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);
  
  return `/admin/receipts/${type}/${filename}`;
}

// -- DASHBOARD --
export async function getDashboardData(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';

  const incomes = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`;
  const expenses = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`;
  const unpaid = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status IN ('unpaid', 'pending', 'partially paid')`;
  
  const totalIncome = incomes[0]?.total ? parseFloat(incomes[0].total) : 0;
  const totalExpenses = expenses[0]?.total ? parseFloat(expenses[0].total) : 0;
  const netProfit = totalIncome - totalExpenses;

  // Let's get monthly chart data within the range
  const chartDataRaw = await sql`
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
  `;

  const recentInvoicesRaw = await sql`
    SELECT invoice_id as id, user_email as client, total as amount, payment_status as status
    FROM invoices
    WHERE created_at >= ${start}::timestamp AND created_at <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY created_at DESC
    LIMIT 4
  `;

  const recentTransactionsRaw = await sql`
    SELECT id, 'income' as type, description as name, date, amount FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    UNION ALL
    SELECT id, 'expense' as type, description as name, date, amount FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY date DESC
    LIMIT 5
  `;

  // Fetch year-wise comparisons
  const incomeByYear = await sql`
    SELECT 
      EXTRACT(YEAR FROM date) as year,
      SUM(amount) as total
    FROM admin_incomes
    WHERE EXTRACT(YEAR FROM date) IN (2025, 2026)
    GROUP BY EXTRACT(YEAR FROM date)
  `;

  const expenseByYear = await sql`
    SELECT 
      EXTRACT(YEAR FROM date) as year,
      SUM(amount) as total
    FROM admin_expenses
    WHERE EXTRACT(YEAR FROM date) IN (2025, 2026)
    GROUP BY EXTRACT(YEAR FROM date)
  `;

  const expenseBreakdownRange = await sql`
    SELECT 
      category as name,
      SUM(amount) as value
    FROM admin_expenses
    WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    GROUP BY category
    ORDER BY value DESC
  `;

  const previousIncome = parseFloat(incomeByYear.find(r => Math.round(parseFloat(r.year)) === 2025)?.total || 0);
  const currentIncome = parseFloat(incomeByYear.find(r => Math.round(parseFloat(r.year)) === 2026)?.total || 0);

  const previousExpense = parseFloat(expenseByYear.find(r => Math.round(parseFloat(r.year)) === 2025)?.total || 0);
  const currentExpense = parseFloat(expenseByYear.find(r => Math.round(parseFloat(r.year)) === 2026)?.total || 0);

  const previousNet = previousIncome - previousExpense;
  const currentNet = currentIncome - currentExpense;

  const totalExpenseRange = expenseBreakdownRange.reduce((sum, r) => sum + parseFloat(r.value), 0);

  const expenseBreakdown = expenseBreakdownRange.map(r => {
    const val = parseFloat(r.value);
    return {
      name: r.name || 'Other',
      value: val,
      percentage: totalExpenseRange > 0 ? parseFloat(((val / totalExpenseRange) * 100).toFixed(1)) : 0
    };
  });

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    unpaidCount: unpaid[0]?.count || 0,
    chartData: chartDataRaw.map(row => ({
      name: row.name,
      income: parseFloat(row.income),
      expenses: parseFloat(row.expenses)
    })),
    recentInvoices: recentInvoicesRaw.map(row => ({
      id: row.id,
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
export async function getIncomes(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';
  const statsThisMonth = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date)`;
  const statsLastMonth = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`;
  const statsYtd = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('year', date) = date_trunc('year', current_date)`;

  const rows = await sql`
    SELECT i.id, i.date, i.amount, c.full_name as client, i.client_id as "clientId", i.description as desc, i.category, i.invoice_id as invoice, i.receipt_url as "receiptUrl"
    FROM admin_incomes i
    LEFT JOIN admin_clients c ON i.client_id = c.id
    WHERE i.date >= ${start}::timestamp AND i.date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY i.date DESC
  `;

  return {
    thisMonth: parseFloat(statsThisMonth[0]?.total || 0),
    lastMonth: parseFloat(statsLastMonth[0]?.total || 0),
    ytd: parseFloat(statsYtd[0]?.total || 0),
    items: rows.map(r => ({
      ...r,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount)
    }))
  };
}

export async function createIncome(data: any) {
  await sql`
    INSERT INTO admin_incomes (date, amount, description, category, payment_method, invoice_id, client_id, receipt_url)
    VALUES (${data.date}, ${data.amount}, ${data.description}, ${data.category}, ${data.paymentMethod}, ${data.invoiceId || null}, ${data.clientId || null}, ${data.receiptUrl || null})
  `;
}

export async function createClient(data: { name: string; email: string; company?: string | null; phone?: string | null; address?: string | null }): Promise<string> {
  const clientId = 'C-' + Date.now();
  await sql`
    INSERT INTO admin_clients (id, full_name, email, company, phone, address, active)
    VALUES (${clientId}, ${data.name}, ${data.email}, ${data.company || null}, ${data.phone || null}, ${data.address || null}, true)
  `;
  return clientId;
}

export async function updateClient(clientId: string, data: { name?: string; email?: string; company?: string | null; phone?: string | null; address?: string | null }) {
  // Fetch current email first so we can cascade if it changes
  const existing = await sql`SELECT email FROM admin_clients WHERE id = ${clientId}`;
  if (existing.length === 0) throw new Error("Client not found");
  const oldEmail = existing[0].email as string;
  const newEmail = data.email?.trim() || oldEmail;
  const emailChanged = newEmail.toLowerCase() !== oldEmail.toLowerCase();

  // Update admin_clients row
  await sql`
    UPDATE admin_clients
    SET 
      full_name = COALESCE(${data.name  || null}, full_name),
      email   = ${newEmail},
      company = ${data.company ?? null},
      phone   = ${data.phone   ?? null},
      address = ${data.address ?? null}
    WHERE id = ${clientId}
  `;

  // Cascade email change to every table that stores user_email
  if (emailChanged) {
    await sql`UPDATE invoices  SET user_email = ${newEmail} WHERE LOWER(user_email) = LOWER(${oldEmail})`;
    await sql`UPDATE projects  SET user_email = ${newEmail} WHERE LOWER(user_email) = LOWER(${oldEmail})`;
  }
}

export async function deleteClient(clientId: string) {
  await sql`DELETE FROM admin_clients WHERE id = ${clientId}`;
}

export async function updateIncome(id: number, data: any) {
  await sql`
    UPDATE admin_incomes 
    SET date = ${data.date}, amount = ${data.amount}, description = ${data.description}, category = ${data.category}, payment_method = ${data.paymentMethod}, invoice_id = ${data.invoiceId || null}, client_id = ${data.clientId || null}, receipt_url = ${data.receiptUrl || null}
    WHERE id = ${id}
  `;
}

export async function deleteIncome(id: number) {
  try {
    // 1. Fetch the income record details before deleting
    const incomeRows = await sql`
      SELECT invoice_id, amount, description
      FROM admin_incomes
      WHERE id = ${id}
    `;
    
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
}

// -- EXPENSES --
export async function getExpenses(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';
  const statsThisMonth = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date)`;
  const statsLastMonth = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`;
  const statsYtd = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('year', date) = date_trunc('year', current_date)`;

  const rows = await sql`
    SELECT id, date, amount, description as desc, category, payment_method as "paidVia", receipt_url as "receiptUrl"
    FROM admin_expenses
    WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY date DESC
  `;

  return {
    thisMonth: parseFloat(statsThisMonth[0]?.total || 0),
    lastMonth: parseFloat(statsLastMonth[0]?.total || 0),
    ytd: parseFloat(statsYtd[0]?.total || 0),
    items: rows.map(r => ({
      ...r,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount)
    }))
  };
}

export async function createExpense(data: any) {
  await sql`
    INSERT INTO admin_expenses (date, amount, description, category, payment_method, receipt_url)
    VALUES (${data.date}, ${data.amount}, ${data.description}, ${data.category}, ${data.paymentMethod}, ${data.receiptUrl || null})
  `;
}

export async function updateExpense(id: number, data: any) {
  await sql`
    UPDATE admin_expenses 
    SET date = ${data.date}, amount = ${data.amount}, description = ${data.description}, category = ${data.category}, payment_method = ${data.paymentMethod}, receipt_url = ${data.receiptUrl || null}
    WHERE id = ${id}
  `;
}

export async function deleteExpense(id: number) {
  await sql`DELETE FROM admin_expenses WHERE id = ${id}`;
}

// -- INVOICES --
export async function getInvoices() {
  const totalIssuedCount = await sql`SELECT COUNT(*) as count FROM invoices`;
  const paidCount = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'fully paid'`;
  const pendingCount = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status IN ('unpaid', 'pending', 'partially paid')`;
  const totalDueSum = await sql`
    SELECT SUM(COALESCE(total_due, total)) as total 
    FROM invoices 
    WHERE payment_status != 'fully paid'
  `;

  const rows = await sql`
    SELECT invoice_id as id, user_email as client, project_name as service, total as amount, total_due, date as due_date, payment_status as status, work_status
    FROM invoices
    ORDER BY created_at DESC
  `;

  return {
    totalIssued: parseInt(totalIssuedCount[0]?.count || '0'),
    paid: parseInt(paidCount[0]?.count || '0'),
    pending: parseInt(pendingCount[0]?.count || '0'),
    totalDue: parseFloat(totalDueSum[0]?.total || '0'),
    items: rows.map(r => ({
      id: r.id,
      client: r.client || 'Unknown',
      service: r.service,
      amount: parseFloat(r.amount),
      total_due: parseFloat(r.total_due != null ? r.total_due : r.amount),
      due: r.due_date ? new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
      status: r.status,
      work_status: r.work_status,
      overdue: r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date() && r.status !== 'paid' && r.status !== 'fully paid')
    }))
  };
}

export async function deleteInvoice(id: string) {
  await sql`
    UPDATE admin_quotations
    SET linked_invoice_id = NULL,
        status = 'draft',
        project_confirmed = false
    WHERE linked_invoice_id = ${id}
  `;
  await sql`DELETE FROM invoices WHERE invoice_id = ${id}`;
}

export async function getInvoiceByIdAdmin(invoiceId: string) {
  // Join with admin_clients and bank_accs to get client name + billing address + bank account
  const result = await sql`
    SELECT
      i.invoice_id,
      i.user_email,
      i.project_name,
      i.date,
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
      COALESCE(ac.full_name, i.user_email) as client_name,
      ac.address as billing_address,
      ba.name as bank_acc_name,
      ba.number as bank_acc_number,
      ba.bank as bank_acc_bank,
      ba.branch as bank_acc_branch
    FROM invoices i
    LEFT JOIN admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
    LEFT JOIN bank_accs ba ON i.bank_account_id = ba.id
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
    SELECT date, amount, payment_method, description
    FROM admin_incomes
    WHERE invoice_id = ${invoiceId}
    ORDER BY date DESC
  `;

  invoice.items = itemsResult;
  invoice.payments = payments.map(p => ({
    date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    amount: parseFloat(p.amount),
    method: p.payment_method,
    description: p.description
  }));

  return invoice;
}

// -- CLIENTS --
export async function getClients() {
  const rows = await sql`
    SELECT c.id,
           c.full_name as name,
           c.email,
           c.active,
           c.company,
           c.phone,
           c.address,
           c.clerk_id,
           (SELECT COUNT(*) FROM invoices i WHERE LOWER(i.user_email) = LOWER(c.email)) as invoices,
           COALESCE((SELECT SUM(amount) FROM admin_incomes inc WHERE inc.client_id = c.id), 0) as revenue,
           (SELECT COUNT(*) FROM admin_incomes inc WHERE inc.client_id = c.id) as income_count,
           (SELECT COUNT(*) FROM projects p WHERE LOWER(p.user_email) = LOWER(c.email) OR p.client_id = c.id) as project_count
    FROM admin_clients c
    ORDER BY c.id DESC
  `;

  const clerk = await clerkClient();

  const clients = await Promise.all(rows.map(async r => {
    let imageUrl = null;
    if (r.clerk_id) {
      try {
        const user = await clerk.users.getUser(r.clerk_id);
        imageUrl = user.imageUrl;
      } catch (e) {
        console.error("Failed to fetch clerk user image for", r.clerk_id, e);
      }
    }

    return {
      id: r.id,
      name: r.name || r.email.split('@')[0],
      email: r.email,
      active: r.active,
      company: r.company,
      phone: r.phone,
      address: r.address,
      imageUrl: imageUrl,
      invoices: parseInt(r.invoices),
      revenue: parseFloat(r.revenue),
      incomeCount: parseInt(r.income_count),
      projectCount: parseInt(r.project_count),
    };
  }));

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
           c.website
    FROM admin_clients c
    WHERE c.id = ${clientId}
  `;

  if (rows.length === 0) return null;
  const c = rows[0];

  let imageUrl = null;
  if (c.clerk_id) {
    try {
      const user = await clerk.users.getUser(c.clerk_id);
      imageUrl = user.imageUrl;
    } catch (e) {
      console.error("Failed to fetch clerk user image for", c.clerk_id, e);
    }
  }

  const invoices = await sql`
    SELECT invoice_id as id, project_name as service, total as amount, date as due_date, payment_status as status
    FROM invoices
    WHERE LOWER(user_email) = LOWER(${c.email})
    ORDER BY date DESC
  `;

  // Also fetch manual income entries linked to this client
  const incomes = await sql`
    SELECT id, description as service, amount, date, category, invoice_id
    FROM admin_incomes
    WHERE client_id = ${clientId}
    ORDER BY date DESC
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
    imageUrl,
    orders,
    invoices: invoiceOrders, // kept for backward compatibility
  };
}

async function generateUniqueInvoiceId(): Promise<string> {
  while (true) {
    const num = Math.floor(100000 + Math.random() * 900000);
    const invoiceId = `INV-${num}`;
    const existing = await sql`SELECT 1 FROM invoices WHERE invoice_id = ${invoiceId}`;
    if (existing.length === 0) {
      return invoiceId;
    }
  }
}

export async function createInvoice(invoiceData: any, lineItems: any[]) {
  // Upsert client — also save billing address if provided
  const existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${invoiceData.userEmail})`;
  
  if (existingClient.length === 0 && invoiceData.userEmail) {
    const clientId = 'C-' + Date.now();
    await sql`
      INSERT INTO admin_clients (id, full_name, company, email, phone, address, active)
      VALUES (
        ${clientId},
        ${invoiceData.clientName || invoiceData.userEmail.split('@')[0]},
        ${invoiceData.company || null},
        ${invoiceData.userEmail},
        ${invoiceData.phone || null},
        ${invoiceData.billingAddress || null},
        true
      )
    `;
  } else if (existingClient.length > 0) {
    // Update name/address on existing client whenever new values were entered
    await sql`
      UPDATE admin_clients
      SET 
        full_name = COALESCE(${invoiceData.clientName || null}, full_name),
        address = COALESCE(${invoiceData.billingAddress || null}, address)
      WHERE LOWER(email) = LOWER(${invoiceData.userEmail})
    `;
  }

  const invoiceId = await generateUniqueInvoiceId();
  await sql`
  INSERT INTO invoices (
    invoice_id, user_email, project_name, date, 
    subtotal, discount, total, advance, total_due, 
    work_status, payment_status, currency, category, bank_account_id
  ) VALUES (
    ${invoiceId}, ${invoiceData.userEmail},
    ${invoiceData.projectName}, ${invoiceData.date},
    ${invoiceData.subtotal}, ${invoiceData.discount}, ${invoiceData.total}, ${invoiceData.advance}, ${invoiceData.totalDue},
    ${invoiceData.workStatus}, ${invoiceData.paymentStatus}, ${invoiceData.currency}, ${invoiceData.category || null},
    ${invoiceData.bankAccountId || null}
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

  return { success: true, invoiceId };
}

export async function updateInvoice(invoiceId: string, invoiceData: any, lineItems: any[]) {
  // If a billing address was edited, persist it back to admin_clients
  if (invoiceData.billingAddress) {
    await sql`
      UPDATE admin_clients
      SET address = ${invoiceData.billingAddress}
      WHERE LOWER(email) = LOWER(${invoiceData.userEmail})
    `;
  }

  await sql`
  UPDATE invoices SET
    user_email = ${invoiceData.userEmail},
    project_name = ${invoiceData.projectName},
    date = ${invoiceData.date},
    subtotal = ${invoiceData.subtotal},
    discount = ${invoiceData.discount},
    total = ${invoiceData.total},
    advance = ${invoiceData.advance},
    total_due = ${invoiceData.totalDue},
    work_status = ${invoiceData.workStatus},
    payment_status = ${invoiceData.paymentStatus},
    currency = ${invoiceData.currency},
    category = ${invoiceData.category || null},
    bank_account_id = ${invoiceData.bankAccountId || null}
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

  return { success: true };
}

// -- REPORTS --
export async function getReports(startDate?: string, endDate?: string) {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';
  const incomeStats = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`;
  const expenseStats = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp`;
  
  const annualRevenue = parseFloat(incomeStats[0]?.total || 0);
  const annualExpenses = parseFloat(expenseStats[0]?.total || 0);
  const netProfit = annualRevenue - annualExpenses;
  const profitMargin = annualRevenue > 0 ? ((netProfit / annualRevenue) * 100).toFixed(1) : '0.0';

  const rawIncome = await sql`
    SELECT category, amount
    FROM admin_incomes
    WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
  `;

  const serviceMap: Record<string, number> = {};
  for (const row of rawIncome) {
    const services = (row.category || 'Other')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    for (const service of services) {
      serviceMap[service] = (serviceMap[service] || 0) + parseFloat(row.amount);
    }
  }
  const incomeByService = Object.entries(serviceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const expensesBreakdown = await sql`
    SELECT category as name, SUM(amount) as value
    FROM admin_expenses
    WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    GROUP BY category
    ORDER BY value DESC
  `;

  const journalEntriesRaw = await sql`
    SELECT id, 'income' as type, description, date, amount, category, payment_method, invoice_id FROM admin_incomes WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    UNION ALL
    SELECT id, 'expense' as type, description, date, amount, category, payment_method, NULL as invoice_id FROM admin_expenses WHERE date >= ${start}::timestamp AND date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY date DESC
  `;

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
    annualRevenue,
    annualExpenses,
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
    SELECT q.id, q.date, q.amount, q.advance, q.total_due as "totalDue",
           c.full_name as client, q.client_id as "clientId", q.description as desc, q.category,
           q.invoice_id as invoice, q.receipt_url as "receiptUrl", q.status, q.project_confirmed as "projectConfirmed"
    FROM admin_quotations q
    LEFT JOIN admin_clients c ON q.client_id = c.id
    WHERE q.date >= ${start}::timestamp AND q.date <= (${end} || ' 23:59:59.999')::timestamp
    ORDER BY q.date DESC
  `;
 
  const confirmedCount = rows.filter((r: any) => r.status === 'confirmed').length;
  const totalValue = rows.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
 
  return {
    confirmedCount,
    totalValue,
    items: rows.map(r => ({
      ...r,
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(r.amount),
      advance: parseFloat(r.advance || 0),
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

  if (data.clientId && data.billingAddress) {
    await sql`
      UPDATE admin_clients
      SET address = ${data.billingAddress}
      WHERE id = ${data.clientId} AND (address IS NULL OR address = '')
    `;
  }

  const result = await sql`
    INSERT INTO admin_quotations (
      date, amount, advance, total_due, discount,
      description, category, payment_method, invoice_id, client_id, receipt_url, status
    )
    VALUES (
      ${data.date}, ${data.amount}, ${advance}, ${totalDue}, ${discount},
      ${data.description}, ${data.category}, ${data.paymentMethod},
      ${data.invoiceId || null}, ${data.clientId || null}, ${data.receiptUrl || null}, 'draft'
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
}

// ─── REPLACE updateQuotation in actions.ts ───────────────────────────────────
export async function updateQuotation(id: number, data: any, lineItems: any[] = []) {
  try {
    const advance = data.advance || 0;
    const discount = data.discount || 0;
    const totalDue = data.totalDue ?? (data.amount - advance);

    if (data.clientId && data.billingAddress) {
      await sql`
        UPDATE admin_clients
        SET address = ${data.billingAddress}
        WHERE id = ${data.clientId}
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
        invoice_id    = ${data.invoiceId || null}, 
        receipt_url   = ${data.receiptUrl || null}
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
  } catch (e) {
    console.error("Failed to update quotation:", e);
    throw new Error("Failed to update quotation");
  }
}
 
export async function deleteQuotation(id: number) {
  const q = await sql`SELECT linked_invoice_id FROM admin_quotations WHERE id = ${id}`;
  const linkedInvoiceId = q[0]?.linked_invoice_id;

  if (linkedInvoiceId) {
    await sql`UPDATE admin_quotations SET linked_invoice_id = NULL WHERE id = ${id}`;
    await sql`DELETE FROM invoice_items WHERE invoice_id = ${linkedInvoiceId}`;
    await sql`DELETE FROM invoices WHERE invoice_id = ${linkedInvoiceId}`;
  }

  await sql`DELETE FROM admin_quotations WHERE id = ${id}`;
}
 
export async function confirmQuotation(quotationId: number, quotationData: any, projectName: string) {
  const quotation = await sql`
    SELECT q.*, c.id as client_id_val, c.email, c.full_name as client_name, c.company, c.address as billing_address
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
  const advance  = parseFloat(q.advance  || 0);
  const totalDue = parseFloat(q.total_due != null ? q.total_due : amount - advance);
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

  try {
    // Create invoice with work_status = 'in progress'
    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date,
        subtotal, discount, total, advance, total_due,
        work_status, payment_status, currency
      ) VALUES (
        ${invoiceId},
        ${userEmail},
        ${projectName},
        ${q.date},
        ${amount},
        ${q.discount || 0},
        ${amount},
        ${advance},
        ${totalDue},
        'in progress',
        'unpaid',
        'LKR'
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

    // Auto-create project with status='in progress' and progress=0
    await sql`
      INSERT INTO projects (
        title, description, type, status, progress, price, invoice_number, user_email, client_id, submitted_at, updated_at
      ) VALUES (
        ${projectName},
        ${description},
        ${q.category || null},
        'in progress',
        0,
        ${amount},
        ${invoiceId},
        ${userEmail},
        ${resolvedClientId},
        now(),
        now()
      )
    `;

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
             c.full_name as client_name, c.email, c.company, c.phone,
             c.address as billing_address
      FROM admin_quotations q
      LEFT JOIN admin_clients c ON q.client_id = c.id
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
      client_name: q.client_name || q.email?.split('@')[0] || '',
      email: q.email,
      company: q.company,
      phone: q.phone,
      project_name: q.description,
      description: q.description,
      category: q.category,
      payment_method: q.payment_method,
      invoice_id: q.invoice_id,
      receipt_url: q.receipt_url,
      status: q.status,
      project_confirmed: q.project_confirmed,
      created_at: q.created_at,
      updated_at: q.updated_at,
      discount: q.discount || 0,
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


export async function getProjects() {
  try {
    const rows = await sql`
      SELECT p.*, c.full_name as client_name, c.company as client_company
      FROM projects p
      LEFT JOIN admin_clients c ON p.client_id = c.id
      ORDER BY p.updated_at DESC, p.id DESC
    `;
    return rows;
  } catch (e) {
    console.error("Failed to fetch projects:", e);
    throw new Error("Failed to fetch projects");
  }
}

export async function getProjectById(id: number) {
  try {
    const rows = await sql`
      SELECT p.*, c.full_name as client_name, c.company as client_company
      FROM projects p
      LEFT JOIN admin_clients c ON p.client_id = c.id
      WHERE p.id = ${id}
    `;
    return rows[0] || null;
  } catch (e) {
    console.error("Failed to fetch project by ID:", e);
    throw new Error("Failed to fetch project");
  }
}

export async function createProject(data: any) {
  try {
    if (data.clientId && data.billingAddress) {
      await sql`
        UPDATE admin_clients
        SET address = ${data.billingAddress}
        WHERE id = ${data.clientId}
      `;
    }
    const invoiceNum = data.invoiceNumber || 'PRJ-' + Date.now();
    const result = await sql`
      INSERT INTO projects (
        title, description, type, request_id, status, progress, price, invoice_number, user_email, client_id, submitted_at, updated_at
      ) VALUES (
        ${data.title},
        ${data.description || null},
        ${data.type || null},
        ${data.requestId || null},
        ${data.status || 'pending'},
        ${data.progress || 0},
        ${data.price || 0},
        ${invoiceNum},
        ${data.userEmail},
        ${data.clientId || null},
        now(),
        now()
      )
      RETURNING id
    `;
    return result[0].id;
  } catch (e) {
    console.error("Failed to create project:", e);
    throw new Error("Failed to create project");
  }
}

export async function updateProject(id: number, data: any) {
  try {
    if (data.clientId && data.billingAddress) {
      await sql`
        UPDATE admin_clients
        SET address = ${data.billingAddress}
        WHERE id = ${data.clientId}
      `;
    }
    const invoiceNum = data.invoiceNumber || 'PRJ-' + Date.now();
    await sql`
      UPDATE projects
      SET 
        title = ${data.title},
        description = ${data.description || null},
        type = ${data.type || null},
        request_id = ${data.requestId || null},
        status = ${data.status || 'pending'},
        progress = ${data.progress || 0},
        price = ${data.price || 0},
        invoice_number = ${invoiceNum},
        user_email = ${data.userEmail},
        client_id = ${data.clientId || null},
        updated_at = now()
      WHERE id = ${id}
    `;
  } catch (e) {
    console.error("Failed to update project:", e);
    throw new Error("Failed to update project");
  }
}

export async function deleteProject(id: number) {
  try {
    await sql`DELETE FROM projects WHERE id = ${id}`;
  } catch (e) {
    console.error("Failed to delete project:", e);
    throw new Error("Failed to delete project");
  }
}

// -- BANK ACCOUNTS --
export async function getBankAccounts() {
  const rows = await sql`
    SELECT id, name, number, bank, branch
    FROM bank_accs
    ORDER BY id ASC
  `;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    number: r.number,
    bank: r.bank,
    branch: r.branch,
  }));
}

export async function recordInvoicePayment(
  invoiceId: string,
  paidAmount: number,
  paymentMethod: string,
  paymentDate: string,
  isAdvance: boolean
) {
  try {
    // 1. Fetch invoice info
    const invoiceRows = await sql`
      SELECT user_email, project_name, total, currency, category, payment_status, advance, total_due
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
    const description = isAdvance 
      ? `Advance: ${invoice.project_name || 'Project'}`
      : invoice.project_name || 'Payment';
    const category = invoice.category || 'Web dev';

    // 4. Create the income record
    await sql`
      INSERT INTO admin_incomes (date, amount, description, category, payment_method, invoice_id, client_id)
      VALUES (${paymentDate}, ${paidAmount}, ${description}, ${category}, ${paymentMethod}, ${invoiceId}, ${clientId})
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

    return { success: true };
  } catch (e) {
    console.error("Failed to record invoice payment:", e);
    throw new Error(e instanceof Error ? e.message : "Failed to record invoice payment");
  }
}