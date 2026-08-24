"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Landmark, RefreshCw, Star, Undo2 } from "lucide-react";
import { getAccounts, createAccount, updateAccount, deleteAccount, transferCash, setDefaultAccount, getTransfers, updateTransfer, deleteTransfer } from "../actions/accounts";
import AnimatedNumber from "../components/AnimatedNumber";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount || 0);
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ name: "", type: "Cash Account", bankName: "", accountNumber: "", branch: "", initialBalance: 0, isCompanyAccount: true });
  const [transferData, setTransferData] = useState({ date: new Date().toISOString().split("T")[0], sourceAccountId: 0, destinationAccountId: 0, amount: 0, description: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [accs, trans] = await Promise.all([getAccounts(), getTransfers()]);
      setAccounts(accs);
      setTransfers(trans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleCreate = () => { setEditingId(null); setFormData({ name: "", type: "Cash Account", bankName: "", accountNumber: "", branch: "", initialBalance: 0, isCompanyAccount: true }); setShowCreate(true); };
    const handleTransfer = () => setShowTransfer(true);
    window.addEventListener("accounts:open-create", handleCreate);
    window.addEventListener("accounts:open-transfer", handleTransfer);
    return () => {
      window.removeEventListener("accounts:open-create", handleCreate);
      window.removeEventListener("accounts:open-transfer", handleTransfer);
    };
  }, []);

    const handleSave = async () => {
    const payload = { ...formData, initialBalance: parseFloat(formData.initialBalance as any) || 0 };
    if (editingId) {
      await updateAccount(editingId, payload);
    } else {
      await createAccount(payload);
    }
    setShowCreate(false);
    setEditingId(null);
    setFormData({ name: "", type: "Cash Account", bankName: "", accountNumber: "", branch: "", initialBalance: 0, isCompanyAccount: true });
    load();
  };

  const handleTransfer = async () => {
    const amt = parseFloat(transferData.amount as any) || 0;
    if (transferData.sourceAccountId && transferData.destinationAccountId && amt !== 0) {
      if (editingTransferId) {
        await updateTransfer(editingTransferId, { ...transferData, amount: amt });
      } else {
        await transferCash({ ...transferData, amount: amt });
      }
      setShowTransfer(false);
      setEditingTransferId(null);
      setTransferData({ date: new Date().toISOString().split("T")[0], sourceAccountId: 0, destinationAccountId: 0, amount: 0, description: "" });
      load();
    }
  };

  const handleEditTransfer = (tr: any) => {
    setEditingTransferId(tr.id);
    setTransferData({
      date: tr.date,
      sourceAccountId: tr.sourceAccountId,
      destinationAccountId: tr.destinationAccountId,
      amount: tr.amount,
      description: tr.description
    });
    setShowTransfer(true);
  };

  const handleDeleteTransfer = async (id: number) => {
    if (confirm("Are you sure you want to undo this transfer?")) {
      await deleteTransfer(id);
      load();
    }
  };

  const handleSetDefault = async (id: number) => {
    await setDefaultAccount(id);
    load();
  };

    const handleEdit = (acc: any) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.name,
      type: acc.type,
      bankName: acc.bankName || "",
      accountNumber: acc.accountNumber || "",
      branch: acc.branch || "",
      initialBalance: acc.initialBalance || 0,
      isCompanyAccount: acc.isCompanyAccount !== false
    });
    setShowCreate(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      await deleteAccount(id);
      load();
    }
  };

  const totalAssets = accounts.reduce((sum, a) => sum + (a.isCompanyAccount ? (a.currentBalance || 0) : (a.currentBalance > 0 ? a.currentBalance : 0)), 0);
  const totalBank = accounts.filter(a => a.type === "Bank Account").reduce((sum, a) => sum + a.currentBalance, 0);
  const totalCash = accounts.filter(a => a.type === "Cash Account" && a.isCompanyAccount).reduce((sum, a) => sum + a.currentBalance, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded-full w-24" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col h-48 animate-pulse">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/5" />
                  <div className="space-y-2">
                    <div className="h-5 bg-white/10 rounded-full w-32" />
                    <div className="h-3 bg-white/5 rounded-full w-20" />
                  </div>
                </div>
              </div>
              <div className="mt-auto flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded-full w-16" />
                  <div className="h-3 bg-white/5 rounded-full w-16" />
                </div>
                <div className="space-y-2 text-right flex flex-col items-end">
                  <div className="h-3 bg-white/5 rounded-full w-20" />
                  <div className="h-6 bg-white/10 rounded-full w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl"><Wallet className="w-6 h-6"/></div>
          <div><p className="text-sm text-gray-400">Total Assets Balance</p><p className="text-2xl font-semibold">{formatLKR(totalAssets)}</p></div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-green-500/10 text-green-400 rounded-2xl"><Landmark className="w-6 h-6"/></div>
          <div><p className="text-sm text-gray-400">Bank Accounts Balance</p><p className="text-2xl font-semibold text-green-400">{formatLKR(totalBank)}</p></div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl"><Wallet className="w-6 h-6"/></div>
          <div><p className="text-sm text-gray-400">Cash Accounts Balance</p><p className="text-2xl font-semibold text-blue-400">{formatLKR(totalCash)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className={`p-3 rounded-2xl ${
                  acc.type === 'Bank Account' 
                    ? 'bg-green-500/10 text-green-400' 
                    : acc.isCompanyAccount === false 
                      ? 'bg-white/10 text-gray-400' 
                      : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {acc.type === 'Bank Account' ? <Landmark className="w-5 h-5"/> : <Wallet className="w-5 h-5"/>}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {acc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{acc.type}</p>
                    {acc.isCompanyAccount === false && (
                      <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-white/10 text-gray-300 rounded-md">
                        {acc.currentBalance < 0 ? "Capital" : "Debt"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {acc.isCompanyAccount && (
                  <button onClick={() => handleSetDefault(acc.id)} className={`transition-colors ${acc.isDefault ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`} title="Set as Default">
                    <Star className="w-4 h-4" fill={acc.isDefault ? "currentColor" : "none"} />
                  </button>
                )}
                <button onClick={() => handleEdit(acc)} className="text-gray-400 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(acc.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            {acc.type === 'Bank Account' && (
              <div className="text-xs text-gray-400 mb-6 space-y-1">
                <p>Bank: {acc.bankName}</p>
                <p>A/C: {acc.accountNumber}</p>
                <p>Branch: {acc.branch}</p>
              </div>
            )}

            <div className="flex justify-between items-end mt-auto">
              <div className="space-y-1">
                <p className="text-xs text-green-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> Inflow: {formatLKR(acc.periodInflow)}</p>
                <p className="text-xs text-red-400 flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> Outflow: {formatLKR(acc.periodOutflow)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                <p className={`text-xl font-semibold ${acc.isCompanyAccount ? (acc.currentBalance < 0 ? 'text-red-400' : 'text-green-400') : (acc.currentBalance > 0 ? 'text-red-400' : acc.currentBalance < 0 ? 'text-green-400' : 'text-green-400')}`}>
                  {formatLKR(acc.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-lg font-semibold mb-6">Cash Transfer History</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-gray-500">No transfers recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-xl">Date</th>
                  <th className="px-4 py-3 font-medium">Source Account</th>
                  <th className="px-4 py-3 font-medium">Destination Account</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{tr.date}</td>
                    <td className="px-4 py-3 text-red-400">{tr.sourceAccountName}</td>
                    <td className="px-4 py-3 text-green-400">{tr.destinationAccountName}</td>
                    <td className="px-4 py-3 text-gray-400">{tr.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatLKR(tr.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleEditTransfer(tr)} className="text-gray-400 hover:text-white transition-colors" title="Edit Transfer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTransfer(tr.id)} className="text-gray-400 hover:text-red-400 transition-colors" title="Undo Transfer">
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-6">{editingId ? "Edit Account" : "Create Account"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Account Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Account Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <option>Cash Account</option>
                  <option>Bank Account</option>
                </select>
              </div>
                            {formData.type === 'Cash Account' && (
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={formData.isCompanyAccount} onChange={e => setFormData({...formData, isCompanyAccount: e.target.checked})} className="w-5 h-5 rounded border-white/10 bg-white/5 accent-brand-500 cursor-pointer" />
                  <label className="text-sm text-gray-400">Is this a Company Cash Account?</label>
                </div>
              )}
              {formData.type === 'Bank Account' && (
                <>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Bank Name</label>
                    <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Account Number</label>
                      <input type="text" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Branch</label>
                      <input type="text" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Initial Balance (LKR)</label>
                <input type="number" value={Number.isNaN(Number(formData.initialBalance)) ? formData.initialBalance : formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: e.target.value === "" ? "" : e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setShowCreate(false); setEditingId(null); setFormData({ name: "", type: "Cash Account", bankName: "", accountNumber: "", branch: "", initialBalance: 0, isCompanyAccount: true }); }} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors">Save Account</button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-6">Transfer Cash</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Date</label>
                <input type="date" value={transferData.date} onChange={e => setTransferData({...transferData, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Source Account (From)</label>
                <select value={transferData.sourceAccountId} onChange={e => setTransferData({...transferData, sourceAccountId: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <option value={0}>Select Source Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatLKR(a.currentBalance)})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Destination Account (To)</label>
                <select value={transferData.destinationAccountId} onChange={e => setTransferData({...transferData, destinationAccountId: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                  <option value={0}>Select Destination Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatLKR(a.currentBalance)})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Amount (LKR)</label>
                <input type="number" value={Number.isNaN(Number(transferData.amount)) ? transferData.amount : transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value === "" ? "" : e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <input type="text" value={transferData.description} onChange={e => setTransferData({...transferData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5" />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setShowTransfer(false); setEditingTransferId(null); setTransferData({ date: new Date().toISOString().split("T")[0], sourceAccountId: 0, destinationAccountId: 0, amount: 0, description: "" }); }} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={handleTransfer} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors">{editingTransferId ? "Save Changes" : "Transfer Funds"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
