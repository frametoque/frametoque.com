"use client";

import { useEffect, useState } from "react";
import { getTopClients } from "../actions/actions";


const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
  }).format(amount || 0);
};

export default function TopClientsWidget() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTopClients().then(res => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-full min-h-[420px]">
      <div>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          Top Clients
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No clients found.</p>
        ) : (
          <div className="space-y-4">
            {data.map((client, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                    #{i + 1}
                  </div>
                  <p className="font-semibold text-sm text-white truncate max-w-[150px]">
                    {client.name}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className="font-semibold text-sm text-green-400">
                    {formatLKR(client.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
