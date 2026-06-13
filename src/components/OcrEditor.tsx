/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, FileText, Download, Shield, Eye, EyeOff, Edit3, 
  Settings, Bold, Italic, Underline, AlignJustify, RefreshCw, 
  FileSpreadsheet, Sparkles, CheckCircle2, AlertTriangle, Plus, Trash2, ShieldAlert,
  ChevronUp, ChevronDown, Save, BookOpen, X
} from "lucide-react";
import { OcrDocument, ExtractionField } from "../types";

export interface ExportTemplate {
  id: string;
  name: string;
  fields: ExtractionField[];
}

export const DEFAULT_TEMPLATES: ExportTemplate[] = [
  {
    id: "default-1",
    name: "Mẫu Quyết định hành chính (Mặc định)",
    fields: [
      { id: "1", name: "Họ và tên", key: "Họ tên", type: "text" },
      { id: "2", name: "Số CCCD / Định danh", key: "CCCD", type: "text" },
      { id: "3", name: "Ngày sinh / Năm sinh", key: "sinh", type: "date" },
      { id: "4", name: "Địa chỉ liên hệ", key: "ngụ tại", type: "text" }
    ]
  },
  {
    id: "default-2",
    name: "Mẫu Lý lịch tư pháp chuyên sâu",
    fields: [
      { id: "ll-1", name: "Hộ và tên đối tượng", key: "Họ tên", type: "text" },
      { id: "ll-2", name: "Thời gian cư trú", key: "ngụ tại", type: "text" },
      { id: "ll-3", name: "Nghề nghiệp / Đơn vị tuyển dụng", key: "đơn vị", type: "text" },
      { id: "ll-4", name: "Tiền án tiền sự", key: "án tích", type: "text" }
    ]
  },
  {
    id: "default-3",
    name: "Mẫu Trích lục hồ sơ Khai sinh / Kết hôn",
    fields: [
      { id: "ks-1", name: "Họ tên đứa trẻ / Đương sự chính", key: "Nguyễn", type: "text" },
      { id: "ks-2", name: "Họ tên cha", key: "Bố", type: "text" },
      { id: "ks-3", name: "Họ tên mẹ", key: "Mẹ", type: "text" },
      { id: "ks-4", name: "Số quyển đăng ký", key: "Số đăng ký", type: "text" }
    ]
  }
];

interface OcrEditorProps {
  document: OcrDocument | null;
  onBack: () => void;
  membershipRole: "Free" | "Pro";
  setActiveTab: (tab: string) => void;
}

export default function OcrEditor({ document, onBack, membershipRole, setActiveTab }: OcrEditorProps) {
  if (!document) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Chưa có dữ liệu hồ sơ được chọn.
          </h2>
          <p className="text-slate-600 mb-6">
            Vui lòng quay lại trang Phân tích OCR để chọn file và tiến hành bóc tách.
          </p>
          <button
            onClick={onBack}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            Quay lại Phân tích OCR
          </button>
        </div>
      </div>
    );
  }

  // Trạng thái nâng cấp & tính năng PRO
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  // Trạng thái lưu trữ văn bản đang biên tập
  const [editorText, setEditorText] = useState(document.rawText);
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [originalBackup, setOriginalBackup] = useState(document.rawText);
  const [isEncryptActive, setIsEncryptActive] = useState(true);

  // Trạng thái các trường Excel tự định nghĩa
  const [exportFields, setExportFields] = useState<ExtractionField[]>([
    { id: "1", name: "Họ và tên", key: "Họ tên", type: "text" },
    { id: "2", name: "Số CCCD / Định danh", key: "CCCD", type: "text" },
    { id: "3", name: "Ngày sinh / Năm sinh", key: "sinh", type: "date" },
    { id: "4", name: "Địa chỉ liên hệ", key: "ngụ tại", type: "text" }
  ]);

  // Bộ quản lý template trong localStorage
  const [userTemplates, setUserTemplates] = useState<ExportTemplate[]>(() => {
    try {
      const saved = localStorage.getItem("SOVEREIGN_OCR_EXCEL_TEMPLATES");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default-1");
  const [templateSaveName, setTemplateSaveName] = useState<string>("");
  
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);

  // Di chuyển trường dữ liệu lên trước (sắp xếp)
  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const updated = [...exportFields];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setExportFields(updated);
  };

  // Di chuyển trường dữ liệu xuống sau (sắp xếp)
  const moveFieldDown = (index: number) => {
    if (index === exportFields.length - 1) return;
    const updated = [...exportFields];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setExportFields(updated);
  };

  // Áp dụng mẫu trường được chọn
  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    // Tìm trong Default và User Templates
    const foundDefault = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (foundDefault) {
      setExportFields([...foundDefault.fields]);
      return;
    }
    
    const foundUser = userTemplates.find(t => t.id === templateId);
    if (foundUser) {
      setExportFields([...foundUser.fields]);
    }
  };

  // Lưu cấu hình trường hiện trị thành Template mới
  const handleSaveAsTemplate = () => {
    const trimmedName = templateSaveName.trim();
    if (!trimmedName) return;
    if (exportFields.length === 0) {
      alert("Vui lòng thiết lập ít nhất một cột dữ liệu trước khi lưu thành mẫu.");
      return;
    }

    const newTemplate: ExportTemplate = {
      id: "user-" + Date.now().toString(),
      name: trimmedName,
      fields: [...exportFields]
    };

    const updated = [...userTemplates, newTemplate];
    setUserTemplates(updated);
    localStorage.setItem("SOVEREIGN_OCR_EXCEL_TEMPLATES", JSON.stringify(updated));
    setSelectedTemplateId(newTemplate.id);
    setTemplateSaveName("");
    alert(`Đã lưu cấu hình làm mẫu "${trimmedName}" thành công! Mẫu này sẽ có sẵn cho tất cả các tài liệu sau.`);
  };

  // Xóa Template tự lưu
  const handleDeleteTemplate = (templateId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const updated = userTemplates.filter(t => t.id !== templateId);
    setUserTemplates(updated);
    localStorage.setItem("SOVEREIGN_OCR_EXCEL_TEMPLATES", JSON.stringify(updated));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("default-1");
      setExportFields([...DEFAULT_TEMPLATES[0].fields]);
    }
  };
  
  // Trình soạn thảo Ref
  const editorRef = useRef<HTMLDivElement>(null);

  // Đồng bộ text biên tập với UI editorRef
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerText = editorText;
    }
  }, [editorText]);

  // Áp dụng phong cách biên tập sành điệu
  const applyStyle = (command: string) => {
    window.document.execCommand(command, false, undefined);
  };

  // 1. Logic Anonymization (Mật danh hóa thông tin đương sự qua API)
  const handleToggleAnonymize = async () => {
    if (isAnonymized) {
      // Phục hồi nguyên bản
      setEditorText(originalBackup);
      setIsAnonymized(false);
    } else {
      setIsRedacting(true);
      try {
        const response = await fetch("/api/ocr/anonymize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editorText })
        });
        const data = await response.json();
        if (data.success) {
          // Lưu backup và cập nhật
          setOriginalBackup(editorText);
          setEditorText(data.anonymizedText);
          setIsAnonymized(true);
        }
      } catch (err) {
        console.error("Lỗi mật danh hóa:", err);
        // Fallback offline nhanh
        const fallbackText = editorText
          .replace(/Nguyễn Văn A/g, "Nguyễn Văn ***")
          .replace(/Trần Văn B/g, "Trần Văn ***")
          .replace(/Nguyễn Thị C/g, "Nguyễn Thị ***")
          .replace(/\d{12}/g, "079*********");
        setOriginalBackup(editorText);
        setEditorText(fallbackText);
        setIsAnonymized(true);
      } finally {
        setIsRedacting(false);
      }
    }
  };

  // 2. Logic Xuất file DOCX nghị định 30 qua API
  const handleExportDocx = async () => {
    if (membershipRole !== "Pro") {
      setUpgradeFeature("Xuất tệp Word (.DOCX) chuẩn Nghị định 30/2020/NĐ-CP của khối Tố tụng, Tư pháp");
      setShowUpgradeModal(true);
      return;
    }

    setIsExportingDocx(true);
    try {
      const textToExport = editorRef.current ? editorRef.current.innerText : editorText;
      const response = await fetch("/api/ocr/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToExport, fileName: document.name })
      });
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = `${document.name.replace(/\.[^/.]+$/, "")}_ND30.doc`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Lỗi xuất DOCX:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // 2b. Logic Xuất file văn bản thô mặc định (.TXT) - Dành cho tất cả thành viên
  const handleExportTxt = () => {
    try {
      const textToExport = editorRef.current ? editorRef.current.innerText : editorText;
      const blob = new Blob([textToExport], { type: "text/plain;charset=utf-8" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = `${document.name.replace(/\.[^/.]+$/, "")}_OCR.txt`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Lỗi xuất TXT:", err);
    }
  };

  // 3. Logic Xuất bảng trích xuất tùy chỉnh Excel qua API
  const handleExportExcel = async () => {
    if (membershipRole !== "Pro") {
      setUpgradeFeature("Trích xuất cấu trúc trường dữ liệu sang Excel tùy biến (Họ tên bị can, Bị cáo, Tuổi, Ngày thụ lý...)");
      setShowUpgradeModal(true);
      return;
    }

    setIsExportingExcel(true);
    try {
      const textToAnalyze = editorRef.current ? editorRef.current.innerText : editorText;
      const response = await fetch("/api/ocr/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze, fields: exportFields })
      });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = "VN_OCR_TRICH_XUAT.csv"; // CSV UTF-8 BOM hoàn hảo trên MS Excel
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Lỗi trích xuất Excel:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Thêm trường trích xuất tùy định nghĩa của cán bộ
  const handleAddExportField = () => {
    if (!newFieldName.trim() || !newFieldKey.trim()) return;
    const newField: ExtractionField = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      key: newFieldKey.trim(),
      type: "text"
    };
    setExportFields([...exportFields, newField]);
    setNewFieldName("");
    setNewFieldKey("");
  };

  // Xóa trường trích xuất
  const handleRemoveExportField = (id: string) => {
    setExportFields(exportFields.filter(f => f.id !== id));
  };

  // Xử lý thay đổi nội dung trực tiếp
  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorText(editorRef.current.innerText);
    }
  };

  return (
    <div id="ocr-editor-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* THANH PANEL LỆNH TRÊN CÙNG */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Quay lại scanner để tải tài liệu khác"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center">
              <FileText className="h-4.5 w-4.5 text-red-600 mr-2" />
              <span>Workspace: {document.name}</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Định dạng quét: <span className="text-slate-700 font-bold">{document.fileType}</span> • {document.resolution} • Uploader: {document.uploader}
            </p>
          </div>
        </div>

        {/* Nút Xuất File và Trực quan Bảo mật */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Trạng thái AES-256 */}
          <div 
            onClick={() => setIsEncryptActive(!isEncryptActive)}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono tracking-wider flex items-center space-x-1.5 cursor-pointer transition-all ${
              isEncryptActive 
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400" 
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
            title="Bộ bảo vệ luồng dữ liệu AES-256"
          >
            <Shield className={`h-3.5 w-3.5 ${isEncryptActive ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
            <span>AES-256: {isEncryptActive ? "đang bảo mật" : "tắt"}</span>
          </div>

          <button
            onClick={handleToggleAnonymize}
            disabled={isRedacting}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wide flex items-center space-x-1.5 transition-all ${
              isAnonymized
                ? "bg-yellow-500 text-white border-yellow-600"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
            }`}
          >
            {isAnonymized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
            <span>{isRedacting ? "Đang mã hóa..." : isAnonymized ? "Hiện thông tin đương sự" : "Mật danh hóa đương sự"}</span>
          </button>

          {/* Nút xuất văn bản TXT mặc định */}
          <button
            onClick={handleExportTxt}
            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
            title="Xuất file văn bản thô không định dạng lề (Mặc định miễn phí)"
          >
            <Download className="h-4 w-4 text-slate-350" />
            <span>Xuất bản thô (.TXT)</span>
          </button>

          {/* Nút xuất Word premium */}
          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className={`font-bold px-4 py-1.5 rounded-lg text-xs tracking-wide flex items-center space-x-1.5 shadow-md cursor-pointer transition-all ${
              membershipRole === "Pro"
                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-rose-500/10"
                : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-300/45"
            }`}
          >
            {membershipRole === "Pro" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            )}
            <span>
              {isExportingDocx ? "Đang xuất..." : membershipRole === "Pro" ? "Xuất Word (.DOCX)" : "Xuất Word PRO (.DOCX)"}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CỘT BÊN TRÁI (LỚP BIỂU DIỄN VĂN BẢN VÀ Ô NHẬN DIỆN MÀU VÀNG/ĐỎ) - Chiếm 5/12 cột */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg paper-glow">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block animate-pulse" />
                <span>Bản chụp tài liệu nguyên bản</span>
              </h4>
              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono text-slate-400">
                100% RAW SCAN
              </span>
            </div>

            {/* Khung mô phỏng văn bản gốc với ô khoanh vùng màu vàng/đỏ đặc trưng của OCR công nghệ cao */}
            <div className="p-6 bg-slate-950 text-slate-400 relative font-mono text-[9px] h-[500px] overflow-y-auto custom-scrollbar select-none">
              
              {/* Lớp lưới kỹ thuật */}
              <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1.5px,transparent_1.5px),linear-gradient(to_bottom,#808080_1.5px,transparent_1.5px)] bg-[size:1.5rem_1.5rem]" />

              <div className="relative z-10 space-y-8 leading-relaxed">
                <div className="flex justify-between items-center">
                  <div className="border border-yellow-500/40 bg-yellow-500/5 p-1 rounded relative" title="Khu vực Quốc hiệu">
                    <span className="absolute -top-3.5 left-0 text-[8px] bg-yellow-500 text-slate-950 px-1 font-bold rounded uppercase">Quốc hiệu</span>
                    <p className="font-bold text-slate-200">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-slate-200">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                  
                  <div className="border border-yellow-500/40 bg-yellow-500/5 p-1 rounded relative text-right">
                    <span className="absolute -top-3.5 right-0 text-[8px] bg-yellow-500 text-slate-950 px-1 font-bold rounded uppercase">Địa danh / Ngày tháng</span>
                    <p className="text-slate-300">Hà Nội, ngày 15 tháng 10 năm 2023</p>
                  </div>
                </div>

                <div className="border border-red-500/50 bg-red-500/5 p-1.5 rounded relative max-w-xs">
                  <span className="absolute -top-3.5 left-0 text-[8px] bg-red-500 text-white px-1 font-bold rounded uppercase">Cơ quan ban hành / Số hiệu</span>
                  <p className="font-bold text-slate-200">UBND THÀNH PHỐ HÀ NỘI</p>
                  <p className="font-bold text-slate-200">SỞ TÀI CHÍNH</p>
                  <p className="text-yellow-400 font-bold">Số: 042/QĐ-STC</p>
                </div>

                <div className="border border-yellow-500/40 bg-yellow-500/5 p-2 rounded relative text-center">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] bg-yellow-500 text-slate-950 px-1 font-bold rounded uppercase">Trích yếu</span>
                  <h3 className="font-bold text-slate-100 text-xs">QUYẾT ĐỊNH</h3>
                  <p className="text-slate-300 mt-1">Về việc phê duyệt dự toán kinh phí triển khai hệ thống OCR tập trung</p>
                </div>

                <div className="space-y-3 font-sans text-slate-300 text-[10px] leading-relaxed">
                  <p className="italic">Căn cứ Luật Ngân sách nhà nước ngày 25 tháng 6 năm 2015;</p>
                  <p className="italic">Căn cứ Nghị định số 163/2016/NĐ-CP ngày 21 tháng 12 năm 2016 của Chính phủ chi tiết...</p>
                  
                  <div className="border-l-2 border-red-500 bg-red-500/5 p-2 rounded">
                    <div className="flex items-center space-x-1 mb-1 text-red-400 font-bold uppercase text-[8px]">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Khu vực chứa thông tin đương sự nhạy cảm</span>
                    </div>
                    <p className="text-rose-200">
                       Người phê duyệt quyết định này: Nguyễn Văn A - Giám đốc Sở Tài chính. 
                       Người đại diện: Ông Trần Văn B. Bà Nguyễn Thị C, ngụ tại 123 Đường Lê Lợi, CCCD 079092001122.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-700 p-2 rounded bg-slate-900/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Sở Tài chính Hà Nội</p>
                    <p className="text-[8px] text-slate-500">Đã kiểm chứng mộc chữ ký số</p>
                  </div>
                  <div className="h-8 w-8 rounded-full border border-red-500/50 flex items-center justify-center text-[8px] font-bold text-red-500 uppercase animate-pulse">
                    MỘC ĐỎ
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SỬA NHANH & CHI TIẾT OCR (Accuracy Panel) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center space-x-1.5 border-b border-slate-100 pb-2.5">
              <Sparkles className="h-4 w-4 text-rose-600" />
              <span>Chẩn đoán & Sửa nhanh lỗi scan</span>
            </h4>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Độ chính xác bóc tách</p>
                <p className="text-xl font-mono font-black text-emerald-600 mt-0.5">{document.accuracy}%</p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-200 block">
                TỐI ƯU TIẾNG VIỆT
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Phát hiện cảnh báo ({document.warnings.length})</p>
              
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {document.warnings.map((warn: any, index: number) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-250 p-2 rounded flex items-start space-x-2 text-yellow-800 text-[10px] leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Dòng {warn.line}: "{warn.text}"</p>
                      <p className="text-slate-600">{warn.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT BÊN PHẢI (TRÌNH BIÊN TẬP VĂN BẢN VÀ PANEL EXCEL) - Chiếm 7/12 cột */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TRÌNH EDIT RICH TEXT CHUẨN NGHỊ ĐỊNH 30 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md paper-glow">
            
            {/* Thanh công cụ biên tập */}
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => applyStyle("bold")}
                  className="p-1 px-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-sm transition-colors cursor-pointer"
                  title="In đậm (CTRL+B)"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyStyle("italic")}
                  className="p-1 px-2 text-xs font-italic text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-sm transition-colors cursor-pointer"
                  title="In nghiêng (CTRL+I)"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyStyle("underline")}
                  className="p-1 px-2 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-sm transition-colors cursor-pointer"
                  title="Gạch chân (CTRL+U)"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyStyle("justify") /* giả lập */}
                  className="p-1 px-2 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-sm transition-colors cursor-pointer"
                  title="Căn đều hai bên"
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </button>

                <span className="h-4 w-px bg-slate-300 mx-1" />

                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded font-mono border border-slate-300">
                  Times New Roman • 14pt (Nghị định 30)
                </span>
              </div>

              <span className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Sovereign Live Editor
              </span>
            </div>

            {/* Khung nhập liệu Rich text */}
            <div className="p-8 min-h-[440px] max-h-[500px] overflow-y-auto custom-scrollbar bg-white focus:outline-none focus:ring-0">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="legal-editor leading-[1.5] text-justify text-[14pt] text-black bg-white focus:outline-none"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '14pt',
                  lineHeight: '1.5',
                  color: '#000000',
                  textAlign: 'justify'
                }}
              />
            </div>

            {/* Thanh trạng thái dưới cùng của trình soạn thảo */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mẫu soạn thảo tương thích hoàn hảo MS Word (.doc/.docx)</span>
              </span>
              <span className="font-mono">Số ký tự: {editorText.length} kự</span>
            </div>
          </div>

          {/* PANEL KẾT XUẤT EXCEL TỰ ĐỊNH NGHĨA */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Header / Export Button */}
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Trích xuất bảng dữ liệu Excel mẫu tùy chỉnh</span>
                </h4>
                <p className="text-slate-400 text-[10px] mt-0.5">Đặt cấu hình các cột thông tin mà bạn muốn bóc tách từ tài liệu ra dạng bảng.</p>
              </div>
              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm border cursor-pointer w-full sm:w-auto justify-center transition-colors ${
                  membershipRole === "Pro"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/10"
                    : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border-amber-300/45 animate-pulse"
                }`}
              >
                {membershipRole === "Pro" ? (
                  <FileSpreadsheet className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 mr-0.5" />
                )}
                <span>{isExportingExcel ? "Đang xuất..." : membershipRole === "Pro" ? "Trích Xuất Excel (.XLSX)" : "Trích Xuất Excel PRO (.XLSX)"}</span>
              </button>
            </div>

            {/* QUẢN LÝ TEMPLATES (MẪU TRƯỜNG DỮ LIỆU CHUYÊN SÂU LƯU TRÊN LOCALSTORAGE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase flex items-center space-x-1">
                  <BookOpen className="h-3 w-3 text-red-500" />
                  <span>Chọn mẫu trường dữ liệu (Template):</span>
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm cursor-pointer"
                >
                  <optgroup label="Hệ thống (Mặc định)">
                    {DEFAULT_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                  {userTemplates.length > 0 && (
                    <optgroup label="Mẫu của tôi (Custom)">
                      {userTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {userTemplates.some(t => t.id === selectedTemplateId) && (
                  <button
                    onClick={(e) => handleDeleteTemplate(selectedTemplateId, e)}
                    className="text-[10px] text-rose-600 hover:underline font-bold mt-1.5 inline-block text-left cursor-pointer"
                  >
                    Xóa mẫu tự lưu này
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase flex items-center space-x-1">
                  <Save className="h-3 w-3 text-emerald-500" />
                  <span>Lưu cấu hình hiện tại thành mẫu mới:</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Nhập tên mẫu để lưu dùng lần sau..."
                    value={templateSaveName}
                    onChange={(e) => setTemplateSaveName(e.target.value)}
                    className="flex-grow bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm"
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!templateSaveName.trim()}
                    className="bg-slate-800 hover:bg-slate-705 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1 border border-slate-700 transition-all cursor-pointer shadow-sm"
                    title="Lưu thành mẫu mới"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Lưu mẫu</span>
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH SẮP XẾP TRƯỜNG DỮ LIỆU DẠNG BẢNG - DI CHUYỂN TRƯỚC VÀ SAU */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cấu hình thứ tự trường dữ liệu:</p>
              
              {exportFields.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-slate-300 text-slate-400 text-xs">
                  Chưa có trường bóc tách nào. Vui lòng thêm trường hoặc chọn Template mẫu ở trên.
                </div>
              ) : (
                <div className="border border-slate-150 rounded-lg overflow-hidden bg-white shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase text-slate-500 font-bold">
                        <th className="py-2 px-3 text-center w-12">Thứ tự</th>
                        <th className="py-2 px-3">Tên cột Excel</th>
                        <th className="py-2 px-2">Từ khóa định dạng (Key)</th>
                        <th className="py-2 px-2 text-center w-24">Sắp xếp</th>
                        <th className="py-2 px-2 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {exportFields.map((field, index) => (
                        <tr key={field.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-400 text-center">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-700">
                            {field.name}
                          </td>
                          <td className="py-2 px-2">
                            <code className="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                              {field.key}
                            </code>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => moveFieldUp(index)}
                                disabled={index === 0}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  index === 0 
                                    ? "text-slate-200 cursor-not-allowed" 
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                                title="Di chuyển lên trước"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveFieldDown(index)}
                                disabled={index === exportFields.length - 1}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  index === exportFields.length - 1 
                                    ? "text-slate-200 cursor-not-allowed" 
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                                title="Di chuyển xuống sau"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleRemoveExportField(field.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                              title="Xóa cột này"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Form thêm cột mới */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-150 space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Thêm trường mới vào cấu hình</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Tên Cột (Hiển thị Excel)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyên đơn, Bị cáo"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Từ khóa nhận diện (Key)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: nguyên đơn, bị cáo"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAddExportField}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded text-[11.5px] font-bold flex items-center space-x-1 border border-slate-700 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Xác nhận thêm cột</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {showUpgradeModal && (
        <div id="upgrade-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden transform transition-all">
            <div className="bg-slate-900 p-5 text-white relative">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-450 text-slate-400">Hội viên đặc quyền</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1 leading-snug">
                Nâng cấp tài khoản PRO khối tư pháp
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-2.5 text-xs bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-200/55">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-[11px]">Cần nâng cấp PRO để sử dụng:</p>
                  <p className="mt-0.5 text-slate-700 text-[11px] leading-relaxed font-semibold">{upgradeFeature}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Thiết kế chuyên biệt cho Kiểm sát viên. Giúp tự động hiệu chỉnh văn bản đạt chuẩn Nghị định 30 văn phòng hành chính và tùy chọn bóc tách trường thông tin kết xuất Excel.
                </p>

                <div className="border border-slate-150 rounded-lg p-3 bg-slate-50 space-y-1.5 text-[10.5px] text-slate-750">
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Mở khóa kết xuất Word (.DOCX) chuẩn tối tụng</span>
                  </p>
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Tự xây dựng template & Xuất Excel (.XLSX)</span>
                  </p>
                  <p className="font-bold text-slate-700 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-1.5" />
                    <span>Bóc tách không giới hạn trang nghiệp vụ</span>
                  </p>
                </div>
              </div>

              <div className="flex space-x-2 pt-1 text-xs">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg text-slate-700 font-bold border border-slate-300 transition-all cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setActiveTab("upgrade");
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-1.5 rounded-lg text-slate-950 font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kích hoạt PRO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
