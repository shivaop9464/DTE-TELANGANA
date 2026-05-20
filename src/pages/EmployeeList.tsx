import { useState, useEffect, FormEvent } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { collection, query, getDocs, limit, orderBy, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee } from '../types';
import { formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

import * as XLSX from 'xlsx';
import { Institution } from '../types';

export function EmployeeList() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Multitab state for the form modal
  const [activeTab, setActiveTab] = useState<'personal' | 'social' | 'professional' | 'pay' | 'deputation'>('personal');

  const initialFormState = {
    name: '',
    fatherName: '',
    employeeId: '',
    dob: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    community: '',
    subCaste: '',
    religion: '',
    phCategory: 'None',
    phPercentage: '',
    maritalStatus: 'Single',
    nativePlace: '',
    nativeDistrict: '',
    mobile: '',
    email: '',
    qualification: '',
    designation: '',
    branch: '',
    institutionId: '',
    biometricId: '',
    workingSince: '',
    againstPostDetails: '',
    payScale: '',
    aictePayLevel: '',
    basicPay: 0,
    incrementDate: '',
    initialAppointmentPost: '',
    initialJoiningDate: '',
    regularizationDate: '',
    superannuationDate: '',
    contractServiceDetails: '',
    contractPeriod: '',
    localCadre: 'State-wide',
    cadreChoiceStatus: '',
    deputationStatus: 'No',
    deputationInstitution: '',
    spouseEmploymentStatus: 'Unemployed',
    spouseDetails: '',
    remarks: '',
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED',
    certificateName: '',
    certificateUrl: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleTabChange = (targetTab: 'personal' | 'social' | 'professional' | 'pay' | 'deputation') => {
    const tabs: ('personal' | 'social' | 'professional' | 'pay' | 'deputation')[] = ['personal', 'social', 'professional', 'pay', 'deputation'];
    const currentIdx = tabs.indexOf(activeTab);
    const targetIdx = tabs.indexOf(targetTab);
    
    // Always allow going backward or staying on the same tab
    if (targetIdx <= currentIdx) {
      setActiveTab(targetTab);
      return;
    }
    
    // Sequentially validate tabs up to the target index
    for (let i = 0; i < targetIdx; i++) {
      const tabToValidate = tabs[i];
      if (tabToValidate === 'personal') {
        if (!formData.name?.trim()) { alert("Please enter Name of Regular Employee in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.fatherName?.trim()) { alert("Please enter Father's Name in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.dob) { alert("Please enter Date of Birth in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.mobile?.trim()) { alert("Please enter Mobile Number in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.email?.trim()) { alert("Please enter Email ID in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.nativePlace?.trim()) { alert("Please enter Native Place in Personal Details (Step 1)"); setActiveTab('personal'); return; }
        if (!formData.nativeDistrict?.trim()) { alert("Please enter Native District in Personal Details (Step 1)"); setActiveTab('personal'); return; }
      }
      if (tabToValidate === 'social') {
        if (!formData.community?.trim()) { alert("Please enter Community in Social & Category (Step 2)"); setActiveTab('social'); return; }
        if (!formData.religion?.trim()) { alert("Please enter Religion in Social & Category (Step 2)"); setActiveTab('social'); return; }
      }
      if (tabToValidate === 'professional') {
        if (!formData.employeeId?.trim()) { alert("Please enter Employee ID in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.biometricId?.trim()) { alert("Please enter Biometric ID in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.designation?.trim()) { alert("Please enter Present Designation in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.branch?.trim()) { alert("Please enter Branch / Trade in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.qualification?.trim()) { alert("Please enter Highest Qualification in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.workingSince) { alert("Please enter Working Since Date in Professional Details (Step 3)"); setActiveTab('professional'); return; }
        if (!formData.institutionId) { alert("Please select Assigned Polytechnic in Professional Details (Step 3)"); setActiveTab('professional'); return; }
      }
      if (tabToValidate === 'pay') {
        if (!formData.payScale?.trim()) { alert("Please enter Pay Scales in Pay & Service (Step 4)"); setActiveTab('pay'); return; }
        if (!formData.basicPay && formData.basicPay !== 0) { alert("Please enter Basic Pay in Pay & Service (Step 4)"); setActiveTab('pay'); return; }
      }
    }
    
    // All checks passed! Move to target tab
    setActiveTab(targetTab);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      
      // Filter based on role if needed
      let filteredData = data;
      if (profile && (profile.role === 'PRINCIPAL' || profile.role === 'DATA_ENTRY') && profile.institutionId) {
        filteredData = data.filter(emp => emp.institutionId === profile.institutionId);
      } else if (profile && profile.role === 'EMPLOYEE') {
        const emailLower = (profile.email || '').toLowerCase();
        const usernameLower = (profile.username || '').toLowerCase();
        filteredData = data.filter(emp => 
          (emp.email || '').toLowerCase() === emailLower ||
          (emp.employeeId || '').toLowerCase() === usernameLower ||
          (emp.employeeId || '').toLowerCase() === emailLower
        );
      }
      
      setEmployees(filteredData);

      const instSnap = await getDocs(query(collection(db, 'institutions'), orderBy('name')));
      setInstitutions(instSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Institution[]);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleExport = () => {
    // Generate clean flat array for Excel
    const exportData = employees.map(emp => {
      const instName = institutions.find(i => i.id === emp.institutionId)?.name || emp.institutionId;
      return {
        "Employee ID": emp.employeeId,
        "Name of Regular Employee": emp.name,
        "Father's Name": emp.fatherName,
        "Date of Birth": emp.dob,
        "Gender": emp.gender,
        "Community": emp.community,
        "Sub-Caste": emp.subCaste || '',
        "Religion": emp.religion,
        "PH Category": emp.phCategory,
        "PH Percentage": emp.phPercentage || '',
        "Marital Status": emp.maritalStatus || '',
        "Native Place": emp.nativePlace || '',
        "Native District": emp.nativeDistrict || '',
        "Mobile Number": emp.mobile,
        "Email ID": emp.email,
        "Highest Qualification": emp.qualification,
        "Present Designation": emp.designation,
        "Branch/Trade": emp.branch,
        "Institution Details": instName,
        "Biometric ID": emp.biometricId,
        "Working Since Date": emp.workingSince,
        "Against Post Details": emp.againstPostDetails || '',
        "Pay Scales": emp.payScale,
        "AICTE Pay Level": emp.aictePayLevel || '',
        "Basic Pay": emp.basicPay,
        "Increment Date": emp.incrementDate || '',
        "Initial Appointment Post": emp.initialAppointmentPost || '',
        "Initial Joining Date": emp.initialJoiningDate || '',
        "Regularization Date": emp.regularizationDate || '',
        "Superannuation Date": emp.superannuationDate || '',
        "Contract Service Details": emp.contractServiceDetails || '',
        "Contract Period": emp.contractPeriod || '',
        "Local Cadre": emp.localCadre || '',
        "Cadre Choice Status": emp.cadreChoiceStatus || '',
        "Deputation Status": emp.deputationStatus,
        "Deputation Institution": emp.deputationInstitution || '',
        "Spouse Employment Status": emp.spouseEmploymentStatus || '',
        "Spouse Details": emp.spouseDetails || '',
        "Remarks": emp.remarks,
        "Status": emp.status,
        "Has Certificate Attached": emp.certificateUrl ? "Yes" : "No",
        "Certificate Document Name": emp.certificateName || "N/A"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees_list.xlsx");
  };

  const handleSaveEmployee = async (e: FormEvent) => {
    e.preventDefault();

    // Perform solid multi-tab validation on all required inputs
    if (!formData.name?.trim()) { alert("Please enter Name of Regular Employee in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.fatherName?.trim()) { alert("Please enter Father's Name in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.dob) { alert("Please enter Date of Birth in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.mobile?.trim()) { alert("Please enter Mobile Number in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.email?.trim()) { alert("Please enter Email ID in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.nativePlace?.trim()) { alert("Please enter Native Place in Personal Details (Step 1)"); setActiveTab('personal'); return; }
    if (!formData.nativeDistrict?.trim()) { alert("Please enter Native District in Personal Details (Step 1)"); setActiveTab('personal'); return; }

    if (!formData.community?.trim()) { alert("Please enter Community in Social & Category (Step 2)"); setActiveTab('social'); return; }
    if (!formData.religion?.trim()) { alert("Please enter Religion in Social & Category (Step 2)"); setActiveTab('social'); return; }

    if (!formData.employeeId?.trim()) { alert("Please enter Employee ID in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.biometricId?.trim()) { alert("Please enter Biometric ID in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.designation?.trim()) { alert("Please enter Present Designation in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.branch?.trim()) { alert("Please enter Branch / Trade in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.qualification?.trim()) { alert("Please enter Highest Qualification in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.workingSince) { alert("Please enter Working Since Date in Professional Details (Step 3)"); setActiveTab('professional'); return; }
    if (!formData.institutionId) { alert("Please select Assigned Polytechnic in Professional Details (Step 3)"); setActiveTab('professional'); return; }

    if (!formData.payScale?.trim()) { alert("Please enter Pay Scales in Pay & Service (Step 4)"); setActiveTab('pay'); return; }
    if (!formData.basicPay && formData.basicPay !== 0) { alert("Please enter Basic Pay in Pay & Service (Step 4)"); setActiveTab('pay'); return; }

    if (formData.deputationStatus === 'Yes' && !formData.deputationInstitution?.trim()) {
      alert("Please enter Deputation Institution Details in Contract & Deputation (Step 5)");
      setActiveTab('deputation');
      return;
    }

    try {
      const payload: any = {
        ...formData,
        basicPay: Number(formData.basicPay) || 0
      };

      // If edited and saved by CTE_ADMIN or SUPER_ADMIN, status goes to APPROVED automatically
      if (editingId && (profile?.role === 'CTE_ADMIN' || profile?.role === 'SUPER_ADMIN')) {
        payload.status = 'APPROVED';
      }

      if (editingId) {
        await updateDoc(doc(db, 'employees', editingId), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'employees'), {
          ...payload,
          status: (profile?.role === 'CTE_ADMIN' || profile?.role === 'SUPER_ADMIN') ? 'APPROVED' : 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchData();
      setFormData(initialFormState);
      setActiveTab('personal');
    } catch (err) {
      console.error(err);
      alert("Failed to save employee");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const token = localStorage.getItem('dte_token');
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete from server");
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete record: " + (err.message || err));
    }
  };

  const handleEditClick = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name || '',
      fatherName: emp.fatherName || '',
      employeeId: emp.employeeId || '',
      dob: emp.dob || '',
      gender: emp.gender || 'Male',
      community: emp.community || '',
      subCaste: emp.subCaste || '',
      religion: emp.religion || '',
      phCategory: emp.phCategory || 'None',
      phPercentage: emp.phPercentage || '',
      maritalStatus: emp.maritalStatus || 'Single',
      nativePlace: emp.nativePlace || '',
      nativeDistrict: emp.nativeDistrict || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      qualification: emp.qualification || '',
      designation: emp.designation || '',
      branch: emp.branch || '',
      institutionId: emp.institutionId || '',
      biometricId: emp.biometricId || '',
      workingSince: emp.workingSince || '',
      againstPostDetails: emp.againstPostDetails || '',
      payScale: emp.payScale || '',
      aictePayLevel: emp.aictePayLevel || '',
      basicPay: emp.basicPay || 0,
      incrementDate: emp.incrementDate || '',
      initialAppointmentPost: emp.initialAppointmentPost || '',
      initialJoiningDate: emp.initialJoiningDate || '',
      regularizationDate: emp.regularizationDate || '',
      superannuationDate: emp.superannuationDate || '',
      contractServiceDetails: emp.contractServiceDetails || '',
      contractPeriod: emp.contractPeriod || '',
      localCadre: emp.localCadre as any || 'State-wide',
      cadreChoiceStatus: emp.cadreChoiceStatus || '',
      deputationStatus: emp.deputationStatus ? (emp.deputationStatus === true || emp.deputationStatus === 'Yes' ? 'Yes' : 'No') : 'No',
      deputationInstitution: emp.deputationInstitution || '',
      spouseEmploymentStatus: emp.spouseEmploymentStatus || 'Unemployed',
      spouseDetails: emp.spouseDetails || '',
      remarks: emp.remarks || '',
      status: emp.status || 'PENDING',
      certificateName: emp.certificateName || '',
      certificateUrl: emp.certificateUrl || ''
    });
    setActiveTab('personal');
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'employees', id), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadExcel = (record: Employee) => {
    if (!record) return;
    const dataRows = [
      ["DEPARTMENT OF TECHNICAL EDUCATION, GOVERNMENT OF TELANGANA"],
      ["EMPLOYEE SERVICE PROFILE REPORT"],
      [""],
      ["SECTION 1: PERSONAL & CONTACT DETAILS"],
      ["Employee Name", record.name],
      ["Father's Name", record.fatherName],
      ["Date of Birth", record.dob ? formatDate(record.dob) : 'N/A'],
      ["Gender", record.gender],
      ["Marital Status", record.maritalStatus || 'N/A'],
      ["Mobile", record.mobile],
      ["Email", record.email],
      ["Native Place", record.nativePlace || 'N/A'],
      ["Native District", record.nativeDistrict || 'N/A'],
      [""],
      ["SECTION 2: SOCIAL & CATEGORY"],
      ["Community", record.community],
      ["Sub-Caste", record.subCaste || 'N/A'],
      ["Religion", record.religion],
      ["PH Category", record.phCategory],
      ["PH Percentage", record.phPercentage ? `${record.phPercentage}%` : 'N/A'],
      [""],
      ["SECTION 3: PROFESSIONAL & POSTING DETAILS"],
      ["Employee ID", record.employeeId],
      ["Biometric Machine ID", record.biometricId],
      ["Present Designation", record.designation],
      ["Branch/Trade", record.branch],
      ["Highest Qualification", record.qualification],
      ["Working Since Date", record.workingSince ? formatDate(record.workingSince) : 'N/A'],
      ["Institution Details", institutions.find(i => i.id === record.institutionId)?.name || record.institutionId],
      ["Against Post Details", record.againstPostDetails || 'N/A'],
      [""],
      ["SECTION 4: PAY SCALES, TIMELINES & CADRE CHOICE"],
      ["Pay Scales", record.payScale],
      ["AICTE Pay Level", record.aictePayLevel || 'N/A'],
      ["Basic Pay (₹)", (Number(record.basicPay) || 0).toLocaleString()],
      ["Increment Date", record.incrementDate ? formatDate(record.incrementDate) : 'N/A'],
      ["Initial Appointment Post", record.initialAppointmentPost || 'N/A'],
      ["Initial Joining Date", record.initialJoiningDate ? formatDate(record.initialJoiningDate) : 'N/A'],
      ["Regularization Date", record.regularizationDate ? formatDate(record.regularizationDate) : 'N/A'],
      ["Superannuation Date", record.superannuationDate ? formatDate(record.superannuationDate) : 'N/A'],
      ["Local Cadre", record.localCadre || 'N/A'],
      ["Cadre Choice Status", record.cadreChoiceStatus || 'N/A'],
      [""],
      ["SECTION 5: SPOUSE, DEPUTATION & CONTRACT DETAILS"],
      ["Spouse Employment Status", record.spouseEmploymentStatus || 'N/A'],
      ["Spouse Details", record.spouseDetails || 'N/A'],
      ["Deputation Status", record.deputationStatus === 'Yes' || record.deputationStatus === true ? 'Yes' : 'No'],
      ["Deputation Institution", record.deputationInstitution || 'N/A'],
      ["Contract Service Details", record.contractServiceDetails || 'N/A'],
      ["Contract Period Details", record.contractPeriod || 'N/A'],
      ["Remarks", record.remarks || 'No remarks recorded'],
      [""],
      ["SECTION 6: UPLOADED CERTIFICATIONS"],
      ["Certificate Attached", record.certificateUrl ? "Yes" : "No"],
      ["Certificate Name", record.certificateName || "N/A"],
      [""],
      ["PROFILE VERIFICATION STATUS", record.status === 'REJECTED' ? 'DECLINED' : record.status]
    ];

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service Profile");
    XLSX.writeFile(wb, `Employee_Profile_${record.employeeId}.xlsx`);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (emp.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
                          (emp.biometricId || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (profile?.role === 'EMPLOYEE') {
    const myRecord = employees[0];

    const triggerEmployeeDownload = () => {
      if (myRecord) {
        handleDownloadExcel(myRecord);
      }
    };

    if (loading) {
      return (
        <div className="flex h-96 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-tg-green border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm font-medium text-slate-500 font-sans">Retrieving your profile record...</p>
          </div>
        </div>
      );
    }

    if (!myRecord) {
      return (
        <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl border border-slate-200/60 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-500">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-sans">Record Awaiting Registration</h2>
          <p className="text-slate-500 text-sm leading-relaxed font-sans">
            Your unique technical education service profile is not yet added to the registry database by your college. <br />
            Please reach out to your **Institution Principal** or **Data Entry Operator** to upload/register your record under email:
            <br />
            <span className="font-semibold text-tg-green text-base">{profile?.email}</span>.
          </p>
          <div className="pt-6 border-t border-slate-100 flex justify-center">
            <p className="text-xs text-slate-400 font-sans">Department of Technical Education, Govt of Telangana</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-2xl font-sans shrink-0">
              {(myRecord.name || "E").charAt(0)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900 font-sans">{myRecord.name}</h1>
              <p className="text-slate-500 text-sm font-sans">
                Employee ID: <span className="font-semibold text-slate-700">{myRecord.employeeId}</span> • 
                Biometric ID: <span className="font-semibold text-slate-700">{myRecord.biometricId || 'N/A'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-3">
            <span className={
              "inline-flex items-center px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider font-sans " +
              (myRecord.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
               myRecord.status === 'PENDING' ? "bg-amber-50 text-amber-600 border border-amber-100" : 
               "bg-rose-50 text-rose-600 border border-rose-100")
            }>
              Status: {myRecord.status === 'REJECTED' ? 'DECLINED' : myRecord.status}
            </span>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 print:hidden justify-end">
          <button 
            onClick={() => handleDownloadExcel(myRecord)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Download Excel Report
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-tg-green text-white font-bold text-sm rounded-xl hover:bg-tg-dark shadow-md transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Print Service Form (PDF)
          </button>
        </div>

        {/* Printable Detailed service report layout */}
        <div id="employee-report-print-area" className="bg-white rounded-3xl border border-slate-200/60 shadow-xl p-4 sm:p-8 md:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
          
          {/* Print Emblem Header */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-200">
            <img 
              src="https://www.image2url.com/r2/default/images/1779256057735-2ea64428-37cc-4a9e-a854-bf574afc7f8e.jpeg" 
              alt="TS Emblem" 
              className="w-16 h-16 mx-auto object-contain" 
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">DEPARTMENT OF TECHNICAL EDUCATION</h2>
              <h3 className="text-sm font-bold text-slate-600 tracking-widest uppercase font-sans">Government of Telangana</h3>
              <p className="text-xs font-semibold text-slate-400 font-mono">EMPLOYEE PROFILE & SERVICE REGISTRY RECORD</p>
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 1: PERSONAL & CONTACT INFORMATION
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Employee Name</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Father's Name</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.fatherName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Date of Birth</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.dob ? formatDate(myRecord.dob) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Gender</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.gender}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Marital Status</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.maritalStatus || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Mobile Number</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.mobile}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-400 font-sans">Email Address</p>
                <p className="font-semibold text-slate-800 mt-0.5 truncate font-sans">{myRecord.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Native Place</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.nativePlace || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Native District</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.nativeDistrict || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 2: SOCIAL GROUP & socio-demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Community Group</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.community}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Sub-Caste</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.subCaste || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Religion</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.religion}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">PH Category</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.phCategory || 'None'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">PH Percentage</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.phPercentage ? `${myRecord.phPercentage}%` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 3: PRESENT POSTING & SERVICE ENTRY
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Employee ID</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.employeeId}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Biometric Reg ID</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.biometricId}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Present Designation</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.designation}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Branch/Trade Specialty</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.branch}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Highest Qualification</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.qualification}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Working Since Date</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.workingSince ? formatDate(myRecord.workingSince) : 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-400 font-sans">Institution Name</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">
                  {institutions.find(i => i.id === myRecord.institutionId)?.name || myRecord.institutionId}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Against Sanctioned Post</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.againstPostDetails || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 4: FINANCIALS, APPOINTMENTS & CADRES
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Pay Scales Structure</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.payScale}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">AICTE Pay Scale Level</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.aictePayLevel || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Basic Monthly Pay</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">₹{(Number(myRecord.basicPay) || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Annual Increment Date</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.incrementDate ? formatDate(myRecord.incrementDate) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Initial Appointment Post</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.initialAppointmentPost || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Initial Joining Date</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.initialJoiningDate ? formatDate(myRecord.initialJoiningDate) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Regularization Date</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.regularizationDate ? formatDate(myRecord.regularizationDate) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Superannuation Date</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.superannuationDate ? formatDate(myRecord.superannuationDate) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Local Cadre Assignment</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.localCadre || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-bold text-slate-400 font-sans">Cadre Choice Option Status</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.cadreChoiceStatus || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 5: EXTRA CLASSIFICATIONS (CONTRACT, DEPUTATION, MARRIAGE)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Spouse Employment Sector</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.spouseEmploymentStatus || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-400 font-sans">Spouse Specifics</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.spouseDetails || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Deputation Status</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.deputationStatus === 'Yes' || myRecord.deputationStatus === true ? 'Yes' : 'No'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-slate-400 font-sans">Deputation Institution Details</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.deputationInstitution || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Contract Service Details</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.contractServiceDetails || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 font-sans">Contract Length Details</p>
                <p className="font-semibold text-slate-800 mt-0.5 font-sans">{myRecord.contractPeriod || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-bold text-slate-400 font-sans">Administrative Remarks</p>
                <p className="font-semibold text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed font-sans">
                  {myRecord.remarks || 'No notes reported.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 6 - Certifications */}
          <div className="space-y-4 pt-4 border-t border-slate-100/80">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-tg-green border-b border-slate-100 pb-1.5 font-mono">
              SECTION 6: UPLOADED CERTIFICATIONS
            </h4>
            <div className="text-sm">
              {myRecord.certificateUrl ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">Attached Professional Certificate</p>
                      <p className="font-semibold text-slate-800 mt-0.5 max-w-xs sm:max-w-md md:max-w-lg truncate">{myRecord.certificateName || 'Uploaded_Certificate.pdf'}</p>
                    </div>
                  </div>
                  <a 
                    href={myRecord.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-tg-green text-white text-xs font-bold rounded-xl hover:bg-tg-dark shadow-sm transition-all text-center cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    View Certificate File
                  </a>
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium font-mono">No certificate attached to this service profile. Edit your profile to attach certifications.</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Statement footer */}
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Registry Ledger Stamp</p>
              <p className="text-xs font-semibold text-slate-500 mt-1 font-sans">Generated: {new Date().toLocaleDateString()} via DTE Telangana</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Authorized Seal</p>
              <p className="text-xs font-bold text-tg-green mt-1 font-sans">Department of Technical Education, Govt. of Telangana</p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="text-slate-500 mt-1">Manage and track staff records across all polytechnics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 shadow-sm transition-all animate-none"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                ...initialFormState,
                institutionId: profile?.institutionId || ''
              });
              setActiveTab('personal');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-tg-green text-white font-bold text-sm rounded-xl hover:bg-tg-dark shadow-lg shadow-emerald-900/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* View Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="tg-gradient p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">{selectedEmployee.name}</h3>
                <p className="text-white/80 text-sm mt-1">Employee ID: {selectedEmployee.employeeId} | Biometric ID: {selectedEmployee.biometricId || 'N/A'}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                selectedEmployee.status === 'APPROVED' ? "bg-emerald-500 text-white" : 
                selectedEmployee.status === 'PENDING' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
              }`}>
                {selectedEmployee.status}
              </span>
            </div>

            <div className="p-4 sm:p-8 space-y-8 overflow-y-auto flex-1">
              {/* Section: Personal Credentials */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">1. Personal & Contact Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Name of Regular Employee</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Father’s Name</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.fatherName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Date of Birth</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.dob ? formatDate(selectedEmployee.dob) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Gender</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Marital Status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.maritalStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Mobile Number</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Email ID</p>
                    <p className="font-semibold text-slate-900 mt-0.5 truncate">{selectedEmployee.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Native Place</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.nativePlace || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Native District</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.nativeDistrict || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Social & Socio-Demographics */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">2. Social & Socio-Demographics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Community</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.community || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Sub-Caste</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.subCaste || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Religion</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.religion || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">PH Category</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.phCategory || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">PH Percentage</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.phPercentage ? `${selectedEmployee.phPercentage}%` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Occupational Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">3. Present Posting & Professional Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Employee ID</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Biometric ID</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.biometricId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Present Designation</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.designation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Branch / Trade</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.branch || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Highest Qualification</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.qualification || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Working Since Date</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.workingSince ? formatDate(selectedEmployee.workingSince) : 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-slate-400">Institution Details</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {institutions.find(i => i.id === selectedEmployee.institutionId)?.name || selectedEmployee.institutionId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Against Post Details</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.againstPostDetails || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Pay scales, Appointments & Services */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">4. Pay Scales & Appointment Timelines</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Pay Scales</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.payScale || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">AICTE Pay Level</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.aictePayLevel || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Basic Pay</p>
                    <p className="font-semibold text-slate-900 mt-0.5">₹{(Number(selectedEmployee.basicPay) || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Increment Date</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.incrementDate ? formatDate(selectedEmployee.incrementDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Initial Appointment Post</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.initialAppointmentPost || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Initial Joining Date</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.initialJoiningDate ? formatDate(selectedEmployee.initialJoiningDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Regularization Date</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.regularizationDate ? formatDate(selectedEmployee.regularizationDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Superannuation (Retirement) Date</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.superannuationDate ? formatDate(selectedEmployee.superannuationDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Local Cadre</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.localCadre || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Cadre Choice Status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.cadreChoiceStatus || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Ancillary Info: Spouse, Contract, Deputation */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">5. Spouse, Deputation & Contract details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400">Spouse Employment Status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.spouseEmploymentStatus || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-slate-400">Spouse Details (Name/Org)</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.spouseDetails || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Deputation Status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.deputationStatus === 'Yes' || selectedEmployee.deputationStatus === true ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-slate-400">Deputation Institution</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.deputationInstitution || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Contract Service Details</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.contractServiceDetails || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Contract Period Details</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedEmployee.contractPeriod || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <p className="text-xs font-bold text-slate-400">Remarks</p>
                    <p className="font-semibold text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">{selectedEmployee.remarks || 'No formal remarks documented'}</p>
                  </div>
                </div>
              </div>

              {/* Section 6 - Certifications */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-tg-green border-b border-emerald-100 pb-1">6. Uploaded Certifications</h4>
                <div className="text-sm">
                  {selectedEmployee.certificateUrl ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">Attached Professional Certificate</p>
                          <p className="font-semibold text-slate-800 break-all">{selectedEmployee.certificateName || 'Uploaded_Certificate.pdf'}</p>
                        </div>
                      </div>
                      <a 
                        href={selectedEmployee.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-tg-green text-white text-xs font-bold rounded-xl hover:bg-tg-dark shadow-sm transition-all text-center cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        View Certificate File
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium font-mono">No certificate attached to this employee's profile.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2">
                {(profile?.role === 'CTE_ADMIN' || profile?.role === 'SUPER_ADMIN') && (
                  <>
                    {selectedEmployee.status !== 'APPROVED' && (
                      <button 
                        onClick={async () => {
                          await handleStatusUpdate(selectedEmployee.id, 'APPROVED');
                          setSelectedEmployee(null);
                        }} 
                        className="px-4 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Profile
                      </button>
                    )}
                    {selectedEmployee.status !== 'REJECTED' && (
                      <button 
                        onClick={async () => {
                          await handleStatusUpdate(selectedEmployee.id, 'REJECTED');
                          setSelectedEmployee(null);
                        }} 
                        className="px-4 h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline Profile
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="px-6 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl"
                >
                  Print Profile
                </button>
                <button 
                  onClick={() => setSelectedEmployee(null)} 
                  className="px-6 h-11 bg-tg-green text-white font-bold text-sm rounded-xl hover:bg-tg-dark"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Multitab Add/Edit Employee Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
            <div className="tg-gradient p-6 text-white">
              <h3 className="text-2xl font-bold">{editingId ? 'Edit Employee Record' : 'Record New Employee'}</h3>
              <p className="text-white/85 text-xs mt-1">Please fill in all standard details below across target registration sections.</p>
            </div>

            {/* Sub-tab navigation */}
            <div className="bg-slate-50 border-b border-slate-200/60 px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none focus:outline-none select-none">
              <button
                type="button"
                onClick={() => handleTabChange('personal')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'personal' ? 'bg-tg-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                1. Personal Details
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('social')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'social' ? 'bg-tg-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                2. Social & Category
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('professional')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'professional' ? 'bg-tg-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                3. Professional Details
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('pay')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'pay' ? 'bg-tg-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                4. Pay & Service
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('deputation')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all focus:outline-none shrink-0 ${
                  activeTab === 'deputation' ? 'bg-tg-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                5. Contract & Deputation
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1 max-h-[60vh] bg-white">
                
                {/* 1. PERSONAL DETAILS TAB */}
                {activeTab === 'personal' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-l-4 border-tg-green pl-2 mb-4">1. Personal & Identity Attributes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Name of Regular Employee <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Father’s Name <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Date of Birth <span className="text-red-500">*</span></label>
                        <input type="date" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Gender <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Marital Status <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Mobile Number <span className="text-red-500">*</span></label>
                        <input type="tel" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Email ID <span className="text-red-500">*</span></label>
                        <input type="email" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Native Place <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.nativePlace} onChange={e => setFormData({...formData, nativePlace: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Native District <span className="text-red-500">*</span></label>
                        <input type="text" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          placeholder="e.g. Hyderabad, Rangareddy..."
                          value={formData.nativeDistrict} onChange={e => setFormData({...formData, nativeDistrict: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SOCIAL & PH CATEGORIES TAB */}
                {activeTab === 'social' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-l-4 border-tg-green pl-2 mb-4">2. Social Grouping, PH category & Spouse Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Community <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. OC, BC-A, BC-B, SC, ST" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.community} onChange={e => setFormData({...formData, community: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Sub-Caste</label>
                        <input type="text" placeholder="e.g. Kapu, Madiga, Mala..." className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.subCaste} onChange={e => setFormData({...formData, subCaste: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Religion <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. Hindu, Muslim, Christian" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">PH Category <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.phCategory} onChange={e => setFormData({...formData, phCategory: e.target.value})}>
                          <option value="None">None</option>
                          <option value="OH">Orthopedically Handicapped (OH)</option>
                          <option value="HH">Hearing Handicapped (HH)</option>
                          <option value="VH">Visually Handicapped (VH)</option>
                          <option value="Other">Other Category</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">PH Percentage (%)</label>
                        <input type="text" placeholder="e.g. 40, if applicable" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.phPercentage} onChange={e => setFormData({...formData, phPercentage: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Spouse Employment Status</label>
                        <select className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.spouseEmploymentStatus} onChange={e => setFormData({...formData, spouseEmploymentStatus: e.target.value})}>
                          <option value="Unemployed">No Spouse / Unemployed</option>
                          <option value="Government">Government Sector</option>
                          <option value="Private">Private Sector</option>
                          <option value="Self Employment">Self Employed</option>
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Spouse Details (Name, Occupation and Department)</label>
                        <input type="text" placeholder="e.g. Smt. Lakshmi, Manager at SBI Hyderabad" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.spouseDetails} onChange={e => setFormData({...formData, spouseDetails: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. OCCUPATIONAL & PROFESSIONAL DETAILS */}
                {activeTab === 'professional' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-l-4 border-tg-green pl-2 mb-4">3. Professional & Posting Credentials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Employee ID <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. EMP10243" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Biometric ID <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="Biometric Machine Reg ID" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.biometricId} onChange={e => setFormData({...formData, biometricId: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Present Designation <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. Senior Lecturer, Associate Professor" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Branch / Trade <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. Civil Engineering, ECE, CSE" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Highest Qualification <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. M.Tech, Ph.D in Computer Engineering" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Working Since Date <span className="text-red-500">*</span></label>
                        <input type="date" required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.workingSince} onChange={e => setFormData({...formData, workingSince: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Institution Details (Assigned Polytechnic) <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.institutionId} onChange={e => setFormData({...formData, institutionId: e.target.value})}>
                          <option value="">Select Institution</option>
                          {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Against Post Details</label>
                        <input type="text" placeholder="Details of filled post approval against sanctioned strength" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.againstPostDetails} onChange={e => setFormData({...formData, againstPostDetails: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                          Certifications (Upload Certificate)
                        </label>
                        <div id="certificate-upload-dropzone" className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-100/50 transition-colors relative">
                          {formData.certificateUrl ? (
                            <div className="space-y-2 w-full flex flex-col items-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Certificate Uploaded Successfully
                              </span>
                              <p className="text-xs font-medium text-slate-600 truncate max-w-full italic">
                                {formData.certificateName || "certified_document.pdf"}
                              </p>
                              <div className="flex gap-2">
                                <a 
                                  href={formData.certificateUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  View Certificate
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, certificateUrl: '', certificateName: '' })}
                                  className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-lg shadow-sm hover:bg-rose-100 transition-all cursor-pointer"
                                >
                                  Remove File
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 py-2">
                              <div className="flex justify-center">
                                <Plus className="w-8 h-8 text-slate-400 border border-dashed border-slate-300 rounded-lg p-1.5" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600">
                                  Drag & drop or <span className="text-tg-green hover:underline cursor-pointer font-bold">browse</span>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Supports PDF, PNG & JPEG up to 2MB (Converted to Secure Base64)
                                </p>
                              </div>
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      alert("File is too large. Form certificates are capped at 2MB to keep database transfers light.");
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      setFormData({
                                        ...formData,
                                        certificateUrl: reader.result as string,
                                        certificateName: file.name
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. PAY SCALE, RECRUITMENT TIMELINES & CADRE */}
                {activeTab === 'pay' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-l-4 border-tg-green pl-2 mb-4">4. Pay scales, Timelines & Cadre choices</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Pay Scales <span className="text-red-500">*</span></label>
                        <input type="text" required placeholder="e.g. RPS 2020: 57,700 - 1,82,400" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.payScale} onChange={e => setFormData({...formData, payScale: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">AICTE Pay Level</label>
                        <input type="text" placeholder="e.g. Level-10, Level-11" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.aictePayLevel} onChange={e => setFormData({...formData, aictePayLevel: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Basic Pay (₹) <span className="text-red-500">*</span></label>
                        <input type="number" required placeholder="Basic monthly payroll base" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.basicPay || ''} onChange={e => setFormData({...formData, basicPay: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Increment Date</label>
                        <input type="date" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.incrementDate} onChange={e => setFormData({...formData, incrementDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Initial Appointment Post</label>
                        <input type="text" placeholder="e.g. Lecturer in CSE" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.initialAppointmentPost} onChange={e => setFormData({...formData, initialAppointmentPost: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Initial Joining Date</label>
                        <input type="date" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.initialJoiningDate} onChange={e => setFormData({...formData, initialJoiningDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Regularization Date</label>
                        <input type="date" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.regularizationDate} onChange={e => setFormData({...formData, regularizationDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Superannuation (Retirement) Date</label>
                        <input type="date" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm" 
                          value={formData.superannuationDate} onChange={e => setFormData({...formData, superannuationDate: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Local Cadre <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.localCadre} onChange={e => setFormData({...formData, localCadre: e.target.value})}>
                          <option value="State-wide">State-wide</option>
                          <option value="Multi-Zone">Multi-Zone</option>
                          <option value="Zone">Zone</option>
                          <option value="District">District</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Cadre Choice Status</label>
                        <input type="text" placeholder="Options or choices given for localized district" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.cadreChoiceStatus} onChange={e => setFormData({...formData, cadreChoiceStatus: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. CONTRACT, DEPUTATION & REMARKS */}
                {activeTab === 'deputation' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-l-4 border-tg-green pl-2 mb-4">5. Contracts, Deputation & Extra Remarks</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Contract Service Details</label>
                        <input type="text" placeholder="Detailed terms for temporary / consolidated contract positions" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.contractServiceDetails} onChange={e => setFormData({...formData, contractServiceDetails: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Contract Period</label>
                        <input type="text" placeholder="e.g. 1 year, 2025 to 2026" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                          value={formData.contractPeriod} onChange={e => setFormData({...formData, contractPeriod: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Deputation Status <span className="text-red-500">*</span></label>
                        <select required className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                          value={formData.deputationStatus} onChange={e => setFormData({...formData, deputationStatus: e.target.value})}>
                          <option value="No">No (In parent Poly-technic)</option>
                          <option value="Yes">Yes (On deputation to another Institution)</option>
                        </select>
                      </div>
                      {formData.deputationStatus === 'Yes' && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-500">Deputation Institution Details <span className="text-red-500">*</span></label>
                          <input type="text" required placeholder="Name/Designation at current deputed polytechnic" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none" 
                            value={formData.deputationInstitution} onChange={e => setFormData({...formData, deputationInstitution: e.target.value})} />
                        </div>
                      )}
                      
                      {profile?.role === 'SUPER_ADMIN' && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-500">Registry Profile Status</label>
                          <select className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:outline-none text-sm"
                            value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                            <option value="PENDING">Pending (Awaiting Principal/Audit Check)</option>
                            <option value="APPROVED">Approved (Verified Standard Profile)</option>
                            <option value="REJECTED">Rejected (Profile correction required)</option>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Remarks / Extra notes</label>
                        <textarea rows={3} placeholder="Any further comments, outstanding promotions, or qualification upgrades..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none text-sm" 
                          value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal guided footer with navigation buttons */}
              <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">
                  Step {activeTab === 'personal' ? '1' : activeTab === 'social' ? '2' : activeTab === 'professional' ? '3' : activeTab === 'pay' ? '4' : '5'} of 5
                </span>
                
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setIsModalOpen(false); setEditingId(null); }} 
                    className="px-5 h-10 bg-slate-100 hover:bg-slate-200/60 text-slate-600 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>

                  {/* Previous tab triggers */}
                  {activeTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ('personal' | 'social' | 'professional' | 'pay' | 'deputation')[] = ['personal', 'social', 'professional', 'pay', 'deputation'];
                        const prevIdx = tabs.indexOf(activeTab) - 1;
                        if (prevIdx >= 0) setActiveTab(tabs[prevIdx]);
                      }}
                      className="px-5 h-10 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl"
                    >
                      Back
                    </button>
                  )}

                  {/* Next Step VS Save Option */}
                  {activeTab !== 'deputation' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ('personal' | 'social' | 'professional' | 'pay' | 'deputation')[] = ['personal', 'social', 'professional', 'pay', 'deputation'];
                        const nextIdx = tabs.indexOf(activeTab) + 1;
                        if (nextIdx < tabs.length) handleTabChange(tabs[nextIdx]);
                      }}
                      className="px-5 h-10 bg-tg-green text-white font-bold text-xs rounded-xl shadow-md hover:bg-tg-dark"
                    >
                      Next Section
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      className="px-6 h-10 bg-tg-green text-white font-bold text-xs rounded-xl shadow-md hover:bg-tg-dark"
                    >
                      {editingId ? 'Update Record' : 'Save Complete Record'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, ID or biometric ID..." 
            className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tg-green/20 focus:border-tg-green transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 h-12 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-tg-green/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">ApprovedOnly</option>
            <option value="PENDING">PendingOnly</option>
            <option value="REJECTED">RejectedOnly</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Institution</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Working Since</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-tg-green border-t-transparent mx-auto mb-2"></div>
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="font-bold text-slate-900">No employees found</h4>
                      <p className="text-sm text-slate-500">There are no records matching your current filter specs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                          {(emp.name || "E").charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.employeeId || 'No ID'} {emp.biometricId ? `• Bio: ${emp.biometricId}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.designation}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {institutions.find(i => i.id === emp.institutionId)?.name || emp.institutionId || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider " +
                        (emp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600" : 
                         emp.status === 'PENDING' ? "bg-amber-50 text-amber-600" : 
                         "bg-rose-50 text-rose-600")
                      }>
                        {emp.status === 'REJECTED' ? 'DECLINED' : emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {emp.workingSince ? formatDate(emp.workingSince) : (emp.appointmentDate ? formatDate(emp.appointmentDate) : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'CTE_ADMIN') && (
                          <>
                            {emp.status !== 'APPROVED' && (
                              <button 
                                onClick={() => handleStatusUpdate(emp.id, 'APPROVED')} 
                                title="Approve" 
                                className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {emp.status !== 'REJECTED' && (
                              <button 
                                onClick={() => handleStatusUpdate(emp.id, 'REJECTED')} 
                                title="Decline" 
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => setSelectedEmployee(emp)}
                          title="View Fully Details" 
                          className="p-2 text-slate-400 hover:text-tg-green hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownloadExcel(emp)}
                          title="Download Service Profile Form" 
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'CTE_ADMIN' || profile?.role === 'PRINCIPAL' || profile?.role === 'DATA_ENTRY') && (
                          <>
                            <button onClick={() => handleEditClick(emp)} title="Edit" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} title="Delete" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
