import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Alert() {
  const phoneNumber = "+94701901461";
  const whatsappLink = `https://wa.me/${phoneNumber.replace(/\D/g, '')}`;
  
  return (
    <div className="w-full max-w-4xl mx-auto my-10 px-4">
      <div className="relative bg-gradient-to-br from-slate-900/30 to-slate-800/20 backdrop-blur-lg rounded-2xl border border-green-700/40 shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-green-500/10 to-transparent rounded-full translate-x-20 translate-y-20" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-900/50 to-green-800/40 border border-green-600/40 shadow-lg">
                <AlertCircle className="w-10 h-10 text-green-300" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-green-100 mb-2">
                    Need Help?
                  </h3>
                  <p className="text-green-200/90 text-lg leading-relaxed">
                    We are still maintaining this section. If you want to know prices or place an order, 
                    contact us via WhatsApp.
                  </p>
                </div>
                
                <div>
                  <Link
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-600 hover:from-green-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-green-900/40 border border-green-500/40 group transform hover:-translate-y-0.5"
                  >
                    <svg 
                      className="w-6 h-6" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.897 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411" />
                    </svg>
                    <span className="text-lg group-hover:translate-x-1 transition-transform duration-300">
                      WhatsApp: {phoneNumber}
                    </span>
                    <svg 
                      className="w-5 h-5 ml-1 opacity-0 group-hover:opacity-100 transition-all duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
                
                <div className="pt-4 border-t border-green-700/40">
                  <p className="text-green-300/80 italic">
                    <span className="text-green-400 font-medium">Note:</span> Sorry for any inconvenience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}