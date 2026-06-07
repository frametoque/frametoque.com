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
export async function getDashboardData() {
  const incomes = await sql`SELECT SUM(amount) as total FROM admin_incomes`;
  const expenses = await sql`SELECT SUM(amount) as total FROM admin_expenses`;
  const unpaid = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'unpaid'`;
  
  const totalIncome = incomes[0]?.total ? parseFloat(incomes[0].total) : 0;
  const totalExpenses = expenses[0]?.total ? parseFloat(expenses[0].total) : 0;
  const netProfit = totalIncome - totalExpenses;

  // Chart data: Group by month for the last 6 months
  const chartDataRaw = await sql`
    SELECT 
      TO_CHAR(date, 'Mon') as name,
      EXTRACT(MONTH FROM date) as month_num,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM (
      SELECT date, amount, 'income' as type FROM admin_incomes
      UNION ALL
      SELECT date, amount, 'expense' as type FROM admin_expenses
    ) as combined
    WHERE date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
    ORDER BY EXTRACT(MONTH FROM date)
  `;

  // Recent Invoices
  const recentInvoicesRaw = await sql`
    SELECT invoice_id as id, user_email as client, total as amount, payment_status as status
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 4
  `;

  // Recent Transactions
  const recentTransactionsRaw = await sql`
    SELECT id, 'income' as type, description as name, date, amount FROM admin_incomes
    UNION ALL
    SELECT id, 'expense' as type, description as name, date, amount FROM admin_expenses
    ORDER BY date DESC
    LIMIT 5
  `;

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
    }))
  };
}

function getCutoffDate(range: string) {
  const d = new Date();
  if (range === 'this year') return new Date(d.getFullYear(), 0, 1).toISOString();
  if (range === '6 months') { d.setMonth(d.getMonth() - 6); return d.toISOString(); }
  if (range === 'three months') { d.setMonth(d.getMonth() - 3); return d.toISOString(); }
  if (range === 'one month') { d.setMonth(d.getMonth() - 1); return d.toISOString(); }
  return new Date(0).toISOString(); // lifetime
}

// -- INCOMES --
export async function getIncomes(range = 'lifetime') {
  const cutoff = getCutoffDate(range);
  const statsThisMonth = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date)`;
  const statsLastMonth = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`;
  const statsYtd = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date_trunc('year', date) = date_trunc('year', current_date)`;

  const rows = await sql`
    SELECT i.id, i.date, i.amount, c.name as client, i.client_id as "clientId", i.description as desc, i.category, i.invoice_id as invoice, i.receipt_url as "receiptUrl"
    FROM admin_incomes i
    LEFT JOIN admin_clients c ON i.client_id = c.id
    WHERE i.date >= ${cutoff}
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

// Create a new client and return its ID
export async function createClient(data: { name: string; email: string; company?: string | null; phone?: string | null }): Promise<string> {
  const clientId = 'C-' + Date.now();
  await sql`
    INSERT INTO admin_clients (id, name, email, company, phone, active)
    VALUES (${clientId}, ${data.name}, ${data.email}, ${data.company || null}, ${data.phone || null}, true)
  `;
  return clientId;
}

export async function updateIncome(id: number, data: any) {
  await sql`
    UPDATE admin_incomes 
    SET date = ${data.date}, amount = ${data.amount}, description = ${data.description}, category = ${data.category}, payment_method = ${data.paymentMethod}, invoice_id = ${data.invoiceId || null}, client_id = ${data.clientId || null}, receipt_url = ${data.receiptUrl || null}
    WHERE id = ${id}
  `;
}

export async function deleteIncome(id: number) {
  await sql`DELETE FROM admin_incomes WHERE id = ${id}`;
}

// -- EXPENSES --
export async function getExpenses(range = 'lifetime') {
  const cutoff = getCutoffDate(range);
  const statsThisMonth = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date)`;
  const statsLastMonth = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('month', date) = date_trunc('month', current_date - interval '1 month')`;
  const statsYtd = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date_trunc('year', date) = date_trunc('year', current_date)`;

  const rows = await sql`
    SELECT id, date, amount, description as desc, category, payment_method as "paidVia", receipt_url as "receiptUrl"
    FROM admin_expenses
    WHERE date >= ${cutoff}
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
  const paidCount = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'paid'`;
  const pendingCount = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'unpaid'`;
  const overdueCount = await sql`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'overdue'`;

  const rows = await sql`
    SELECT invoice_id as id, user_email as client, project_name as service, total as amount, date as due_date, payment_status as status
    FROM invoices
    ORDER BY created_at DESC
  `;

  return {
    totalIssued: parseInt(totalIssuedCount[0]?.count || '0'),
    paid: parseInt(paidCount[0]?.count || '0'),
    pending: parseInt(pendingCount[0]?.count || '0'),
    overdue: parseInt(overdueCount[0]?.count || '0'),
    items: rows.map(r => ({
      id: r.id,
      client: r.client || 'Unknown',
      service: r.service,
      amount: parseFloat(r.amount),
      due: r.due_date ? new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
      status: r.status,
      overdue: r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date() && r.status !== 'paid')
    }))
  };
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE invoice_id = ${id}`;
}

export async function getInvoiceByIdAdmin(invoiceId: string) {
  const result = await sql`
    SELECT
      invoice_id,
      user_email,
      project_name,
      billing_address,
      date,
      currency,
      subtotal,
      discount,
      total,
      advance,
      total_due,
      work_status,
      payment_status
    FROM invoices
    WHERE invoice_id = ${invoiceId}
  `;

  if (result.length === 0) return null;
  const invoice = result[0];

  const itemsResult = await sql`
    SELECT description, price, total, quantity 
    FROM invoice_items 
    WHERE invoice_id = ${invoiceId}
    ORDER BY id ASC
  `;

  invoice.items = itemsResult;
  return invoice;
}

// -- CLIENTS --
export async function getClients() {
  const rows = await sql`
    SELECT c.id, 
           COALESCE(u.full_name, c.name) as name, 
           c.email, 
           c.active,
           COALESCE(u.company, c.company) as company,
           COALESCE(u.phone, c.phone) as phone,
           u.clerk_id,
           COUNT(i.invoice_id) as invoices, 
           COALESCE(SUM(i.total), 0) as revenue
    FROM admin_clients c
    LEFT JOIN users u ON c.email = u.email
    LEFT JOIN invoices i ON c.email = i.user_email
    GROUP BY c.id, c.name, c.email, c.active, c.company, c.phone, u.full_name, u.company, u.phone, u.clerk_id
    ORDER BY revenue DESC
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
      imageUrl: imageUrl,
      invoices: parseInt(r.invoices),
      revenue: parseFloat(r.revenue)
    };
  }));

  return clients;
}

export async function getClientById(clientId: string) {
  const clerk = await clerkClient();

  const rows = await sql`
    SELECT c.id, 
           COALESCE(u.full_name, c.name) as name, 
           c.email, 
           c.active,
           COALESCE(u.company, c.company) as company,
           COALESCE(u.phone, c.phone) as phone,
           u.clerk_id,
           u.address,
           u.website
    FROM admin_clients c
    LEFT JOIN users u ON c.email = u.email
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
    invoices: invoices.map(r => ({
      id: r.id,
      service: r.service,
      amount: parseFloat(r.amount),
      due: r.due_date ? new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-',
      status: r.status,
      overdue: r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date() && r.status !== 'paid')
    }))
  };
}

export async function createInvoice(invoiceData: any, lineItems: any[]) {
  // 1. Check if client exists by email, if not create them in admin_clients
  const existingClient = await sql`SELECT id FROM admin_clients WHERE email = ${invoiceData.userEmail}`;
  
  if (existingClient.length === 0 && invoiceData.userEmail) {
    const clientId = 'C-' + Date.now();
    await sql`
      INSERT INTO admin_clients (id, name, company, email, phone)
      VALUES (${clientId}, ${invoiceData.clientName || invoiceData.userEmail.split('@')[0]}, ${invoiceData.company || null}, ${invoiceData.userEmail}, ${invoiceData.phone || null})
    `;
  }

  // 2. Generate Invoice ID and Insert Invoice
  const invoiceId = 'INV-' + Date.now();
  await sql`
    INSERT INTO invoices (
      invoice_id, user_email, project_name, billing_address, date, 
      subtotal, discount, total, advance, total_due, 
      work_status, payment_status, currency
    ) VALUES (
      ${invoiceId}, ${invoiceData.userEmail}, ${invoiceData.projectName}, ${invoiceData.billingAddress}, ${invoiceData.date},
      ${invoiceData.subtotal}, ${invoiceData.discount}, ${invoiceData.total}, ${invoiceData.advance}, ${invoiceData.totalDue},
      ${invoiceData.workStatus}, ${invoiceData.paymentStatus}, ${invoiceData.currency}
    )
  `;

  // 3. Insert Line Items
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
  await sql`
    UPDATE invoices SET
      user_email = ${invoiceData.userEmail},
      project_name = ${invoiceData.projectName},
      billing_address = ${invoiceData.billingAddress},
      date = ${invoiceData.date},
      subtotal = ${invoiceData.subtotal},
      discount = ${invoiceData.discount},
      total = ${invoiceData.total},
      advance = ${invoiceData.advance},
      total_due = ${invoiceData.totalDue},
      work_status = ${invoiceData.workStatus},
      payment_status = ${invoiceData.paymentStatus},
      currency = ${invoiceData.currency}
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
export async function getReports(range = 'lifetime') {
  const cutoff = getCutoffDate(range);

  const incomeStats = await sql`SELECT SUM(amount) as total FROM admin_incomes WHERE date >= ${cutoff}`;
  const expenseStats = await sql`SELECT SUM(amount) as total FROM admin_expenses WHERE date >= ${cutoff}`;
  
  const annualRevenue = parseFloat(incomeStats[0]?.total || 0);
  const annualExpenses = parseFloat(expenseStats[0]?.total || 0);
  const netProfit = annualRevenue - annualExpenses;
  const profitMargin = annualRevenue > 0 ? ((netProfit / annualRevenue) * 100).toFixed(1) : '0.0';

  const incomeByService = await sql`
    SELECT category as name, SUM(amount) as value
    FROM admin_incomes
    WHERE date >= ${cutoff}
    GROUP BY category
    ORDER BY value DESC
  `;

  const expensesBreakdown = await sql`
    SELECT category as name, SUM(amount) as value
    FROM admin_expenses
    WHERE date >= ${cutoff}
    GROUP BY category
    ORDER BY value DESC
  `;

  return {
    annualRevenue,
    annualExpenses,
    netProfit,
    profitMargin,
    incomeByService: incomeByService.map(r => ({ name: r.name || 'Other', value: parseFloat(r.value) })),
    expensesBreakdown: expensesBreakdown.map(r => ({ name: r.name || 'Other', value: parseFloat(r.value) }))
  };
}
