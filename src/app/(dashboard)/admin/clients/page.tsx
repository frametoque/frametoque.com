"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getClients } from "../actions";

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getClients();
        setData(res);
      } catch (e) {
        console.error("Failed to load clients", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading clients...</div>;
  }

  const filteredClients = data.filter((client: any) => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = [...data]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      revenue: c.revenue
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2.5 outline-none focus:border-brand-500 transition-colors text-sm text-white"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client: any) => (
          <Link 
            href={`/admin/clients/${client.id}`} 
            key={client.id}
            className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {client.imageUrl ? (
                <img src={client.imageUrl} alt={client.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {client.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {client.name}
                  {client.active ? (
                    <span className="w-2 h-2 rounded-full bg-green-400" title="Active"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-500" title="Inactive"></span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{client.email}</p>
                {(client.company || client.phone) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {client.company && <span className="text-brand-400 mr-2">{client.company}</span>}
                    {client.phone}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Invoices</p>
                <p className="font-medium">{client.invoices}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Revenue</p>
                <p className="font-semibold text-brand-400">{formatLKR(client.revenue)}</p>
              </div>
              <div className="text-gray-500 group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}
        {filteredClients.length === 0 && (
          <div className="col-span-1 lg:col-span-2 text-center text-gray-500 py-8">
            No clients found.
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-400/10 rounded-xl">
            <Users className="w-5 h-5 text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold">Top Clients by Revenue</h2>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value/1000}k`} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => [formatLKR(value), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#29B6F6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
