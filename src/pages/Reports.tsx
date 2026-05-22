import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const REPORTS = [
  { id: 'inst-wise', title: 'Institution-wise Staff Report', description: 'Complete breakdown of employees by polytechnic institution.' },
  { id: 'vacant', title: 'Vacancy Status Report', description: 'Department-wise vacancies and pending recruitment positions.' },
  { id: 'retire', title: 'Retirement Due Report', description: 'Employees retiring within the next 12 - 24 months.' },
  { id: 'gender', title: 'Gender & Community Audit', description: 'Diversity statistics across different branches and grades.' },
];

export function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchRealData = async () => {
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch('/api/employees', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const downloadPDF = async (id: string) => {
    setGenerating(id);
    try {
      const employees = await fetchRealData();
      const doc = new jsPDF();
      doc.text('DTE Telangana - Staff Report', 14, 15);
      (doc as any).autoTable({
        head: [['S.No', 'Employee Name', 'ID', 'Designation', 'Institution']],
        body: employees.map((e: any, i) => [
          (i + 1).toString(),
          e.name,
          e.employeeId || 'N/A',
          e.designation,
          e.institutionId
        ]),
        startY: 20,
      });
      doc.save(`dte_report_${id}.pdf`);
    } catch (err) {
      alert("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const downloadExcel = async (id: string) => {
    setGenerating(id);
    try {
      const data = await fetchRealData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `dte_report_${id}.xlsx`);
    } catch (err) {
      alert("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports Engine</h1>
        <p className="text-slate-500 mt-1">Generate and export administrative records for decision making.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {REPORTS.map((report) => (
          <div key={report.id} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl text-tg-green group-hover:bg-emerald-50 transition-colors">
                <FileText className="w-8 h-8" />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadExcel(report.id)}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                  title="Export Excel"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </button>
                <button 
                   onClick={() => downloadPDF(report.id)}
                   disabled={generating === report.id}
                   className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm disabled:opacity-50"
                   title="Export PDF"
                >
                  {generating === report.id ? (
                     <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <h3 className="font-bold text-xl text-slate-900 mb-2">{report.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">{report.description}</p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                 <Calendar className="w-3.5 h-3.5" />
                 Last generated: 2 days ago
              </div>
              <button className="flex items-center gap-2 text-sm font-bold text-tg-green">
                 <Printer className="w-4 h-4" />
                 Print Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Summary Section */}
      <div className="bg-tg-dark rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <CheckCircle2 className="w-48 h-48" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-bold mb-4">State-wide Administrative Summary</h3>
            <p className="text-white/70 mb-6 leading-relaxed">
               The current staff composition report shows 92% placement across urban institutions and 84% in rural areas. 
               Recruitment requirements for the next cycle are being processed.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Total Gazetted</p>
                  <p className="font-bold">482</p>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Non-Gazetted</p>
                  <p className="font-bold">1,020</p>
               </div>
               <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Contractual</p>
                  <p className="font-bold">142</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
