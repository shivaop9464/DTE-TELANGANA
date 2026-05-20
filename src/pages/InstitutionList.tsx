import { useState, useEffect, FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { 
  School, 
  MapPin, 
  Users, 
  Plus, 
  Download,
  Search,
  ExternalLink,
  Edit2,
  Trash2
} from 'lucide-react';
import { collection, query, getDocs, orderBy, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Institution } from '../types';

export function InstitutionList() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    district: '',
    principalName: '',
    staffStrength: 0,
    workingStrength: 0,
    vacancies: 0
  });

  const fetchInstitutions = async () => {
    try {
      const q = query(collection(db, 'institutions'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Institution[];
      setInstitutions(data);
    } catch (err) {
      console.error('Error fetching institutions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(institutions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Institutions");
    XLSX.writeFile(wb, "institutions_list.xlsx");
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'institutions', editingId), {
          ...formData,
          vacancies: formData.staffStrength - formData.workingStrength
        });
      } else {
        const instId = formData.id || `INST-${Date.now()}`;
        await setDoc(doc(db, 'institutions', instId), {
          ...formData,
          id: instId,
          vacancies: formData.staffStrength - formData.workingStrength
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchInstitutions();
      setFormData({ id: '', name: '', district: '', principalName: '', staffStrength: 0, workingStrength: 0, vacancies: 0 });
    } catch (err) {
      console.error(err);
      alert("Failed to save institution");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the institution record.")) return;
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch(`/api/institutions/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete institution from server");
      }
      fetchInstitutions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete institution record");
    }
  };

  const handleEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setFormData({
      id: inst.id,
      name: inst.name,
      district: inst.district,
      principalName: inst.principalName,
      staffStrength: inst.staffStrength,
      workingStrength: inst.workingStrength,
      vacancies: inst.vacancies
    });
    setIsModalOpen(true);
  };

  const filteredData = institutions.filter(inst => 
    inst.name.toLowerCase().includes(search.toLowerCase()) ||
    inst.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Institutions</h1>
          <p className="text-slate-500 mt-1">Directory of Government Polytechnics in Telangana.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-tg-green text-white font-bold text-sm rounded-xl hover:bg-tg-dark shadow-lg shadow-emerald-900/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Institution
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="tg-gradient p-8 text-white">
              <h3 className="text-2xl font-bold">{editingId ? 'Edit Institution' : 'Register Institution'}</h3>
              <p className="text-white/60 text-sm mt-1">{editingId ? 'Update details for this polytechnic.' : 'Enroll a new polytechnic institution into the system.'}</p>
            </div>
            <form onSubmit={handleRegister} className="p-8 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Institution ID (optional)</label>
                    <input type="text" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="e.g. GPT-HYD" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Institution Name</label>
                    <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">District</label>
                    <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Principal Name</label>
                    <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.principalName} onChange={e => setFormData({...formData, principalName: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Sanctioned Strength</label>
                    <input type="number" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.staffStrength} onChange={e => setFormData({...formData, staffStrength: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Working Strength</label>
                    <input type="number" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                      value={formData.workingStrength} onChange={e => setFormData({...formData, workingStrength: parseInt(e.target.value) || 0})} />
                  </div>
               </div>
               <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 h-12 bg-tg-green text-white font-bold rounded-xl shadow-lg">{editingId ? 'Update' : 'Register'}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Filter by name or district..." 
          className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tg-green/20 focus:border-tg-green transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse">
               <div className="h-4 w-1/3 bg-slate-100 rounded mb-4"></div>
               <div className="h-8 w-2/3 bg-slate-200 rounded mb-6"></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="h-10 bg-slate-50 rounded"></div>
                 <div className="h-10 bg-slate-50 rounded"></div>
               </div>
            </div>
          ))
        ) : filteredData.length === 0 ? (
          <div className="col-span-full py-24 text-center">
             <School className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400">No institutions found</p>
          </div>
        ) : (
          filteredData.map((inst) => (
            <div key={inst.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-emerald-50 p-2 rounded-lg text-tg-green">
                  <School className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(inst.id)} title="Delete" className="text-slate-300 hover:text-rose-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(inst)} title="Edit" className="text-slate-300 hover:text-blue-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-slate-300 hover:text-tg-green transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-tg-green transition-colors leading-snug">{inst.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {inst.district}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Staff Strength</p>
                  <p className="font-bold text-slate-700">{inst.workingStrength} / {inst.staffStrength}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vacancies</p>
                   <p className="font-bold text-rose-600">{inst.vacancies}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Principal</p>
                  <p className="text-xs font-semibold text-slate-700">{inst.principalName}</p>
                </div>
                <button className="text-xs font-bold text-tg-green bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-all">
                  Manage Staff
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
