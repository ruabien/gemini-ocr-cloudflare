import { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, ArrowUp, ArrowDown, Copy, 
  Check, FileSpreadsheet, RefreshCw, 
  Settings, Award, Layers, FileText, ChevronRight
} from 'lucide-react';
import { extractStructuredData } from '../utils/extractionService';
import { exportToExcel } from '../utils/exportHelper';

export default function CustomExtractorModal({ isOpen, onClose, activeFile, allFiles, config }) {
  // Trạng thái Quản lý Mẫu
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [isEditingTemplateName, setIsEditingTemplateName] = useState(false);
  const [tempTemplateName, setTempTemplateName] = useState('');

  // Trạng thái Kết quả trích xuất
  // Cấu trúc: { [fileId]: { [fieldId]: value, _fileName: string } }
  const [extractedData, setExtractedData] = useState({});
  const [selectedFileId, setSelectedFileId] = useState('');
  
  // Trạng thái Xử lý AI
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [copied, setCopied] = useState(false);

  // Khởi tạo các template từ localStorage hoặc mặc định
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('legalExtractionTemplates');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTemplates(parsed);
          if (parsed.length > 0) {
            setActiveTemplateId(parsed[0].id);
          }
        } catch (e) {
          console.error("Lỗi đọc template từ localStorage:", e);
          initDefaultTemplates();
        }
      } else {
        initDefaultTemplates();
      }
    }
  }, [isOpen]);

  // Cập nhật selectedFileId khi mở modal hoặc activeFile thay đổi
  useEffect(() => {
    if (isOpen && activeFile) {
      setSelectedFileId(activeFile.id);
    }
  }, [isOpen, activeFile]);

  // Hàm khởi tạo các mẫu mặc định
  const initDefaultTemplates = () => {
    const defaults = [
      {
        id: 'hinh_su_so_tham',
        name: 'Hình sự sơ thẩm',
        isDefault: true,
        fields: [
          { id: 'so_thu_ly', label: 'Số thụ lý', description: 'Số thụ lý vụ án hình sự', dataType: 'text', required: true, order: 1, example: '12/2024/TLST-HS' },
          { id: 'ngay_thu_ly', label: 'Ngày thụ lý', description: 'Ngày thụ lý vụ án', dataType: 'date', required: true, order: 2, example: '15/05/2024' },
          { id: 'ho_ten_bi_cao', label: 'Họ tên bị cáo', description: 'Đầy đủ họ tên của bị cáo hoặc các bị cáo', dataType: 'text', required: true, order: 3, example: 'Nguyễn Văn A, Trần Văn B' },
          { id: 'nam_sinh', label: 'Năm sinh', description: 'Năm sinh của bị cáo', dataType: 'number', required: false, order: 4, example: '1990' },
          { id: 'dia_chi', label: 'Địa chỉ bị cáo', description: 'Nơi đăng ký hộ khẩu thường trú hoặc nơi ở của bị cáo', dataType: 'text', required: false, order: 5, example: 'Quận 1, TP. Hồ Chí Minh' },
          { id: 'toi_danh', label: 'Tội danh', description: 'Tội danh bị truy tố/xét xử theo Cáo trạng hoặc Bản án', dataType: 'text', required: true, order: 6, example: 'Trộm cắp tài sản' },
          { id: 'dieu_luat_ap_dung', label: 'Điều luật áp dụng', description: 'Các điều, khoản của Bộ luật Hình sự áp dụng', dataType: 'text', required: false, order: 7, example: 'Khoản 1 Điều 173 BLHS' },
          { id: 'nguoi_bi_hai', label: 'Người bị hại', description: 'Họ tên người bị hại trong vụ án', dataType: 'text', required: false, order: 8, example: 'Lê Thị C' },
          { id: 'co_quan_to_tung', label: 'Cơ quan tiến hành tố tụng', description: 'Tên Tòa án hoặc Viện kiểm sát giải quyết', dataType: 'text', required: false, order: 9, example: 'Tòa án nhân dân quận Hoàn Kiếm' }
        ]
      },
      {
        id: 'dan_su_so_tham',
        name: 'Dân sự sơ thẩm',
        isDefault: true,
        fields: [
          { id: 'so_thu_ly', label: 'Số thụ lý', description: 'Số thụ lý vụ án dân sự', dataType: 'text', required: true, order: 1, example: '88/2024/TLST-DS' },
          { id: 'ngay_thu_ly', label: 'Ngày thụ lý', description: 'Ngày thụ lý vụ án dân sự', dataType: 'date', required: true, order: 2, example: '20/06/2024' },
          { id: 'nguyen_don', label: 'Nguyên đơn', description: 'Họ tên của nguyên đơn', dataType: 'text', required: true, order: 3, example: 'Nguyễn Thị D' },
          { id: 'dia_chi_nguyen_don', label: 'Địa chỉ nguyên đơn', description: 'Nơi cư trú của nguyên đơn', dataType: 'text', required: false, order: 4, example: 'Quận Ba Đình, Hà Nội' },
          { id: 'bi_don', label: 'Bị đơn', description: 'Họ tên của bị đơn', dataType: 'text', required: true, order: 5, example: 'Công ty TNHH MTV X' },
          { id: 'dia_chi_bi_don', label: 'Địa chỉ bị đơn', description: 'Trụ sở hoặc nơi cư trú của bị đơn', dataType: 'text', required: false, order: 6, example: 'Quận 3, TP. Hồ Chí Minh' },
          { id: 'nguoi_lien_quan', label: 'Người liên quan', description: 'Người có quyền lợi, nghĩa vụ liên quan', dataType: 'text', required: false, order: 7, example: 'Nguyễn Văn E' },
          { id: 'quan_he_tranh_chap', label: 'Quan hệ tranh chấp', description: 'Tranh chấp về hợp đồng, đất đai, hôn nhân...', dataType: 'text', required: true, order: 8, example: 'Tranh chấp hợp đồng tín dụng' },
          { id: 'tai_san_tranh_chap', label: 'Tài sản tranh chấp', description: 'Thông tin tài sản hoặc số tiền tranh chấp', dataType: 'currency', required: false, order: 9, example: '500.000.000 đồng' }
        ]
      },
      {
        id: 'thi_hanh_an_dan_su',
        name: 'Thi hành án dân sự',
        isDefault: true,
        fields: [
          { id: 'so_quyet_dinh', label: 'Số quyết định', description: 'Số quyết định thi hành án', dataType: 'text', required: true, order: 1, example: '150/QĐ-CCTHADS' },
          { id: 'ngay_quyet_dinh', label: 'Ngày quyết định', description: 'Ngày ban hành quyết định thi hành án', dataType: 'date', required: true, order: 2, example: '12/03/2024' },
          { id: 'nguoi_phai_thi_hanh', label: 'Người phải thi hành án', description: 'Họ tên người phải thi hành án', dataType: 'text', required: true, order: 3, example: 'Phạm Văn G' },
          { id: 'nguoi_duoc_thi_hanh', label: 'Người được thi hành án', description: 'Họ tên người được nhận quyền lợi thi hành án', dataType: 'text', required: true, order: 4, example: 'Ngân hàng TMCP Y' },
          { id: 'so_tien_thi_hanh', label: 'Số tiền thi hành', description: 'Số tiền phải thi hành án', dataType: 'currency', required: false, order: 5, example: '1.200.000.000 đồng' },
          { id: 'tai_san_nghiep_vu', label: 'Tài sản thi hành', description: 'Chi tiết nhà đất, xe cộ kê biên xử lý', dataType: 'text', required: false, order: 6, example: 'Quyền sử dụng đất tại thửa 12, tờ bản đồ số 4...' },
          { id: 'co_quan_thi_hanh', label: 'Cơ quan thi hành án', description: 'Chi cục/Cục Thi hành án dân sự ban hành', dataType: 'text', required: false, order: 7, example: 'Chi cục THADS quận Cầu Giấy' }
        ]
      }
    ];
    setTemplates(defaults);
    setActiveTemplateId(defaults[0].id);
    localStorage.setItem('legalExtractionTemplates', JSON.stringify(defaults));
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  // Lưu cấu hình mẫu hiện tại vào localStorage
  const saveTemplatesToStorage = (updatedTemplates) => {
    setTemplates(updatedTemplates);
    localStorage.setItem('legalExtractionTemplates', JSON.stringify(updatedTemplates));
  };

  // Quản lý Mẫu: Đổi tên mẫu
  const handleRenameTemplate = () => {
    if (!tempTemplateName.trim()) return;
    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, name: tempTemplateName.trim(), isDefault: false };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
    setIsEditingTemplateName(false);
  };

  // Quản lý Mẫu: Tạo mẫu mới
  const handleCreateTemplate = () => {
    const newId = `custom_${Math.random().toString(36).substring(2, 9)}`;
    const newTemplate = {
      id: newId,
      name: 'Mẫu tùy chỉnh mới',
      isDefault: false,
      fields: [
        { id: 'truong_1', label: 'Trường dữ liệu 1', description: 'Mô tả trường cần trích xuất', dataType: 'text', required: false, order: 1, example: '' }
      ]
    };
    const updated = [...templates, newTemplate];
    saveTemplatesToStorage(updated);
    setActiveTemplateId(newId);
    setIsEditingTemplateName(true);
    setTempTemplateName('Mẫu tùy chỉnh mới');
  };

  // Quản lý Mẫu: Nhân bản
  const handleCloneTemplate = () => {
    if (!activeTemplate) return;
    const newId = `custom_${Math.random().toString(36).substring(2, 9)}`;
    const cloned = {
      ...activeTemplate,
      id: newId,
      name: `${activeTemplate.name} (Bản sao)`,
      isDefault: false
    };
    const updated = [...templates, cloned];
    saveTemplatesToStorage(updated);
    setActiveTemplateId(newId);
  };

  // Quản lý Mẫu: Xóa mẫu
  const handleDeleteTemplate = () => {
    if (!activeTemplate) return;
    if (activeTemplate.isDefault) {
      alert("Không thể xóa mẫu mặc định của hệ thống.");
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa mẫu trích xuất "${activeTemplate.name}"?`)) {
      const updated = templates.filter(t => t.id !== activeTemplateId);
      saveTemplatesToStorage(updated);
      if (updated.length > 0) {
        setActiveTemplateId(updated[0].id);
      } else {
        initDefaultTemplates();
      }
    }
  };

  // Cấu hình Trường: Thêm trường mới
  const handleAddField = () => {
    if (!activeTemplate) return;
    const fieldId = `field_${Math.random().toString(36).substring(2, 6)}`;
    const newField = {
      id: fieldId,
      label: `Trường mới ${activeTemplate.fields.length + 1}`,
      description: '',
      dataType: 'text',
      required: false,
      order: activeTemplate.fields.length + 1,
      example: ''
    };
    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, fields: [...t.fields, newField], isDefault: false };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
  };

  // Cấu hình Trường: Sửa thông tin trường
  const handleUpdateField = (fieldId, property, value) => {
    if (!activeTemplate) return;

    // Chuyển đổi ID sang snake_case không dấu nếu sửa ID
    let finalValue = value;
    if (property === 'id') {
      finalValue = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9_]/g, '_') // Thay ký tự đặc biệt bằng _
        .replace(/_+/g, '_'); // Tránh nhiều dấu gạch dưới liền nhau
    }

    const updatedFields = activeTemplate.fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, [property]: finalValue };
      }
      return f;
    });

    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, fields: updatedFields, isDefault: false };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
  };

  // Cấu hình Trường: Xóa trường
  const handleDeleteField = (fieldId) => {
    if (!activeTemplate) return;
    if (activeTemplate.fields.length <= 1) {
      alert("Một mẫu trích xuất phải có ít nhất 1 trường dữ liệu.");
      return;
    }
    const updatedFields = activeTemplate.fields
      .filter(f => f.id !== fieldId)
      .map((f, index) => ({ ...f, order: index + 1 })); // Đánh lại thứ tự

    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, fields: updatedFields, isDefault: false };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
  };

  // Cấu hình Trường: Di chuyển thứ tự Up/Down
  const handleMoveField = (index, direction) => {
    if (!activeTemplate) return;
    const fields = [...activeTemplate.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Đổi chỗ
    const temp = fields[index];
    fields[index] = fields[targetIndex];
    fields[targetIndex] = temp;

    // Đánh lại thuộc tính order
    const updatedFields = fields.map((f, i) => ({ ...f, order: i + 1 }));

    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return { ...t, fields: updatedFields, isDefault: false };
      }
      return t;
    });
    saveTemplatesToStorage(updated);
  };

  // Xử lý trích xuất dữ liệu bằng AI
  const handleRunAiExtraction = async (scope = 'single') => {
    if (!activeTemplate || isExtracting) return;

    // Lấy danh sách file cần trích xuất
    let filesToProcess;
    if (scope === 'single') {
      if (!activeFile) {
        alert("Không tìm thấy tệp hiện tại để trích xuất.");
        return;
      }
      if (activeFile.status !== 'completed' || !activeFile.result) {
        alert("Vui lòng đợi quá trình OCR của tệp này hoàn tất trước.");
        return;
      }
      filesToProcess = [activeFile];
    } else {
      // Chế độ hàng loạt: lấy tất cả các file đã hoàn thành OCR
      const completedFiles = allFiles.filter(f => f.status === 'completed' && f.result && !f.isParentPdf);
      if (completedFiles.length === 0) {
        alert("Không tìm thấy tệp ảnh/trang PDF nào đã hoàn tất OCR trong hàng đợi.");
        return;
      }
      filesToProcess = completedFiles;
    }

    setIsExtracting(true);
    setExtractionProgress({ current: 0, total: filesToProcess.length, currentName: '' });

    const newExtractedData = { ...extractedData };

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileItem = filesToProcess[i];
      setExtractionProgress({
        current: i + 1,
        total: filesToProcess.length,
        currentName: fileItem.name
      });

      try {
        // Lấy text kết quả OCR (gộp trang nếu là parent pdf, tuy nhiên scope ở đây là các sub-pages đã completed)
        const textToExtract = fileItem.result;
        
        // Gọi AI trích xuất
        const responseJson = await extractStructuredData(textToExtract, activeTemplate, config);
        
        // Lưu kết quả trích xuất tạm thời
        newExtractedData[fileItem.id] = {
          ...responseJson,
          _fileName: fileItem.name
        };
      } catch (err) {
        console.error(`Lỗi trích xuất tệp ${fileItem.name}:`, err);
        // Lưu giá trị trống khi lỗi và ghi đè lỗi vào trường đầu tiên để người dùng nhận biết
        const emptyObj = { _fileName: fileItem.name, _error: err.message };
        activeTemplate.fields.forEach(f => {
          emptyObj[f.id] = `[Lỗi trích xuất: ${err.message}]`;
        });
        newExtractedData[fileItem.id] = emptyObj;
      }
    }

    setExtractedData(newExtractedData);
    setIsExtracting(false);
    
    // Tự động chọn file đầu tiên vừa trích xuất để hiển thị kết quả
    if (filesToProcess.length > 0) {
      setSelectedFileId(filesToProcess[0].id);
    }
  };

  // Cập nhật giá trị trích xuất thủ công
  const handleEditExtractedValue = (fileId, fieldId, value) => {
    setExtractedData(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [fieldId]: value
      }
    }));
  };

  // Xuất file Excel (.xlsx)
  const handleExportExcel = () => {
    const rowIds = Object.keys(extractedData);
    if (rowIds.length === 0) {
      alert("Chưa có dữ liệu trích xuất để xuất Excel.");
      return;
    }

    const rows = rowIds.map(id => extractedData[id]);
    const fields = activeTemplate.fields;
    const includeFileName = rowIds.length > 1 || allFiles.length > 1;
    const filename = `${activeTemplate.name.replace(/\s+/g, '_')}_trich_xuat.xlsx`;

    try {
      exportToExcel(rows, fields, filename, includeFileName);
    } catch (e) {
      alert(`Không thể xuất file Excel: ${e.message}`);
    }
  };

  // Sao chép dòng dữ liệu (TSV)
  const handleCopyTSV = async () => {
    const rowIds = Object.keys(extractedData);
    if (rowIds.length === 0) {
      alert("Chưa có dữ liệu trích xuất để sao chép.");
      return;
    }

    const fields = [...activeTemplate.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    const includeFileName = rowIds.length > 1 || allFiles.length > 1;

    // Header
    let tsvLines = [];
    let headerRow = [];
    if (includeFileName) {
      headerRow.push("Tên tệp");
    }
    fields.forEach(f => headerRow.push(f.label || f.id));
    tsvLines.push(headerRow.join("\t"));

    // Dữ liệu
    rowIds.forEach(id => {
      const dataRow = extractedData[id];
      let rowCells = [];
      if (includeFileName) {
        rowCells.push(dataRow._fileName || "N/A");
      }
      fields.forEach(f => {
        let val = dataRow[f.id];
        if (val === undefined || val === null) {
          val = "";
        }
        // Thay thế ký tự ngắt dòng hoặc tab trong text để không làm vỡ cấu trúc TSV
        val = String(val).replace(/\r?\n|\r/g, " ").replace(/\t/g, " ");
        rowCells.push(val);
      });
      tsvLines.push(rowCells.join("\t"));
    });

    const tsvContent = tsvLines.join("\n");

    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Không thể sao chép TSV:", err);
      alert("Lỗi sao chép dữ liệu vào clipboard.");
    }
  };

  // Reset dữ liệu trích xuất hiện tại
  const handleResetExtractedData = () => {
    if (window.confirm("Bạn có chắc muốn xóa sạch toàn bộ kết quả trích xuất hiện tại? Các mẫu cấu hình sẽ được giữ nguyên.")) {
      setExtractedData({});
    }
  };

  if (!isOpen) return null;

  // Lấy các file hợp lệ cho danh sách hiển thị
  const validFilesForDetails = allFiles.filter(f => !f.isParentPdf);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in py-4 px-4 overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-surface rounded-2xl shadow-2xl border border-border flex flex-col my-auto max-h-[92vh] overflow-hidden animate-fade-up text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Award size={20} className="stroke-[2px]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-text-primary flex items-center gap-2">
                <span>Trích xuất dữ liệu tùy chỉnh sau OCR</span>
                <span className="text-[10px] bg-primary text-white font-extrabold px-1.5 py-0.5 rounded-full">PRO</span>
              </h3>
              <p className="text-[11px] text-text-secondary">Trích xuất văn bản thô thành bảng dữ liệu chuyên môn bằng Trí tuệ nhân tạo Gemini</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-background cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* AI Processing Overlay */}
        {isExtracting && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Layers size={24} className="animate-bounce" />
              </div>
            </div>
            <h4 className="font-bold text-base text-text-primary mb-2">Đang phân tích cấu trúc & Trích xuất bằng Gemini...</h4>
            <p className="text-xs text-text-secondary max-w-sm mb-4">
              Hệ thống đang gửi văn bản OCR đến AI để trích xuất các trường nghiệp vụ được cấu hình. Quá trình này có thể mất vài giây.
            </p>
            <div className="w-full max-w-md bg-background border border-border rounded-xl p-3 shadow-xs">
              <div className="flex justify-between items-center text-xs font-bold text-text-secondary mb-1.5">
                <span className="truncate max-w-[280px]">Đang xử lý: {extractionProgress.currentName}</span>
                <span>{extractionProgress.current} / {extractionProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full" 
                  style={{ width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          
          {/* Left panel: Template configuration (35%) */}
          <div className="w-full lg:w-[35%] border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-0 bg-background/10">
            
            {/* Choose & Edit Template Selector */}
            <div className="p-4 border-b border-border space-y-3 bg-surface/40">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Mẫu trích xuất</span>
                <div className="flex gap-1">
                  <button 
                    onClick={handleCreateTemplate}
                    className="p-1 text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                    title="Tạo mẫu trích xuất mới"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={handleCloneTemplate}
                    className="p-1 text-text-secondary hover:bg-background rounded transition-all cursor-pointer"
                    title="Nhân bản mẫu hiện tại"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={handleDeleteTemplate}
                    disabled={activeTemplate?.isDefault}
                    className="p-1 text-accent hover:bg-accent/10 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                    title="Xóa mẫu hiện tại"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                {isEditingTemplateName ? (
                  <div className="flex gap-1.5 w-full">
                    <input
                      type="text"
                      value={tempTemplateName}
                      onChange={(e) => setTempTemplateName(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs bg-surface border border-primary rounded-lg focus:outline-none font-bold text-text-primary"
                    />
                    <button 
                      onClick={handleRenameTemplate}
                      className="px-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button 
                      onClick={() => setIsEditingTemplateName(false)}
                      className="px-2 border border-border text-text-secondary text-xs rounded-lg hover:bg-background transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2 items-center">
                    <select
                      value={activeTemplateId}
                      onChange={(e) => {
                        setActiveTemplateId(e.target.value);
                        setIsEditingTemplateName(false);
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-bold text-text-primary cursor-pointer"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} {t.isDefault ? '(Mặc định)' : ''}</option>
                      ))}
                    </select>
                    {!activeTemplate?.isDefault && (
                      <button 
                        onClick={() => {
                          setIsEditingTemplateName(true);
                          setTempTemplateName(activeTemplate?.name || '');
                        }}
                        className="p-2 border border-border text-text-secondary hover:text-text-primary bg-surface rounded-lg hover:bg-background cursor-pointer"
                        title="Đổi tên mẫu"
                      >
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* List of fields to configure */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cấu hình trường ({activeTemplate?.fields?.length || 0})</span>
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Thêm trường</span>
                </button>
              </div>

              {activeTemplate && activeTemplate.fields.sort((a, b) => (a.order || 0) - (b.order || 0)).map((field, idx) => (
                <div 
                  key={field.id} 
                  className="bg-surface border border-border rounded-xl p-3 shadow-xs space-y-2.5 relative group hover:border-secondary/40 transition-colors"
                >
                  {/* Field Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-primary bg-primary-container/10 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, 'label', e.target.value)}
                        placeholder="Tên trường hiển thị"
                        className="text-xs font-bold text-text-primary bg-transparent focus:bg-background px-1 focus:outline-none border-b border-transparent focus:border-border rounded min-w-[120px]"
                      />
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer"
                        title="Di chuyển lên"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === activeTemplate.fields.length - 1}
                        className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-0.5 text-accent/60 hover:text-accent cursor-pointer"
                        title="Xóa trường này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Field details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-text-secondary font-medium">Mã ID (snake_case)</span>
                      <input
                        type="text"
                        value={field.id}
                        onChange={(e) => handleUpdateField(field.id, 'id', e.target.value)}
                        placeholder="ma_id"
                        className="w-full px-2 py-1 bg-background border border-border rounded focus:outline-none font-mono text-[10px] text-text-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-text-secondary font-medium">Kiểu dữ liệu</span>
                      <select
                        value={field.dataType}
                        onChange={(e) => handleUpdateField(field.id, 'dataType', e.target.value)}
                        className="w-full px-1.5 py-1 bg-background border border-border rounded focus:outline-none text-[10px] text-text-primary focus:border-primary cursor-pointer"
                      >
                        <option value="text">Text (Văn bản)</option>
                        <option value="date">Date (Ngày tháng)</option>
                        <option value="number">Number (Số)</option>
                        <option value="currency">Currency (Tiền tệ)</option>
                        <option value="list">List (Danh sách)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-text-secondary font-medium block">Mô tả nghiệp vụ cần AI trích xuất</span>
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => handleUpdateField(field.id, 'description', e.target.value)}
                      placeholder="Mô tả cụ thể thông tin cần lấy..."
                      className="w-full text-[10px] px-2 py-1 bg-background border border-border rounded focus:outline-none text-text-primary focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-text-secondary select-none">
                      <input
                        type="checkbox"
                        checked={!!field.required}
                        onChange={(e) => handleUpdateField(field.id, 'required', e.target.checked)}
                        className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                      />
                      <span>Bắt buộc (Cảnh báo nếu thiếu)</span>
                    </label>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-[9px] text-text-secondary font-medium shrink-0">Ví dụ:</span>
                      <input
                        type="text"
                        value={field.example || ''}
                        onChange={(e) => handleUpdateField(field.id, 'example', e.target.value)}
                        placeholder="Giá trị mẫu..."
                        className="flex-1 text-[9px] px-1.5 py-0.5 bg-background border border-border rounded focus:outline-none font-mono text-text-primary"
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>
            
            {/* Quick Actions to trigger extraction */}
            <div className="p-4 border-t border-border bg-surface shrink-0 space-y-2">
              <button
                onClick={() => handleRunAiExtraction('single')}
                disabled={!activeFile || activeFile.status !== 'completed' || isExtracting}
                className="w-full h-10 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Trích xuất Tệp đang xem</span>
              </button>
              <button
                onClick={() => handleRunAiExtraction('batch')}
                disabled={isExtracting || allFiles.filter(f => f.status === 'completed' && !f.isParentPdf).length === 0}
                className="w-full h-10 border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Layers size={14} />
                <span>Trích xuất Hàng loạt ({allFiles.filter(f => f.status === 'completed' && !f.isParentPdf).length} tệp)</span>
              </button>
            </div>

          </div>

          {/* Right panel: Extracted results editing & export (65%) */}
          <div className="w-full lg:w-[65%] flex flex-col min-h-0 bg-surface">
            
            {/* Toolbar for exporting */}
            <div className="px-6 py-3 border-b border-border bg-background/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Kết quả trích xuất</span>
                <span className="text-[10px] text-text-secondary bg-background px-2 py-0.5 rounded-full font-bold">
                  {Object.keys(extractedData).length} đã xử lý
                </span>
              </div>

              {Object.keys(extractedData).length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTSV}
                    className="h-8 px-3 text-[11px] font-bold border border-border hover:border-primary/20 hover:bg-primary/5 text-text-primary hover:text-primary transition-all rounded-lg flex items-center gap-1.5 cursor-pointer"
                    title="Sao chép dưới dạng bảng dữ liệu tab-separated (TSV) để paste nhanh vào Excel"
                  >
                    {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép dòng'}</span>
                  </button>
                  
                  <button
                    onClick={handleExportExcel}
                    className="h-8 px-3 text-[11px] font-bold bg-success hover:bg-success-hover text-white transition-all rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Tải xuống tệp Excel (.xlsx) chuẩn"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Xuất Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={handleResetExtractedData}
                    className="h-8 px-2 text-[11px] font-bold border border-border hover:border-accent/20 hover:bg-accent/5 text-text-secondary hover:text-accent rounded-lg transition-all cursor-pointer"
                    title="Xóa dữ liệu kết quả"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Split layout: Files list on left, fields details on right */}
            {Object.keys(extractedData).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-on-surface-variant/40">
                <FileSpreadsheet size={64} strokeWidth={1} className="mb-4 opacity-30 text-primary" />
                <h4 className="font-bold text-sm text-text-primary mb-1">Chưa có dữ liệu trích xuất cấu trúc</h4>
                <p className="text-[11px] text-text-secondary max-w-sm text-center leading-relaxed">
                  Hãy cấu hình các trường nghiệp vụ ở cột bên trái và bấm **Trích xuất** để AI tự động phân tích và tạo dữ liệu bảng.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">
                
                {/* Sub-list: Extracted files */}
                <div className="w-full sm:w-[35%] border-b sm:border-b-0 sm:border-r border-border overflow-y-auto bg-background/5 p-3 space-y-2 shrink-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block px-1 select-none">Tệp tin</span>
                  
                  {validFilesForDetails.map(f => {
                    const hasData = !!extractedData[f.id];
                    if (!hasData) return null;
                    const isSelected = selectedFileId === f.id;
                    const isError = !!extractedData[f.id]?._error;

                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFileId(f.id)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-surface hover:bg-background border-border text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`material-icons text-[16px] shrink-0 ${isSelected ? 'text-white' : 'text-text-secondary/70'}`}>
                            {isError ? 'warning' : 'description'}
                          </span>
                          <span className="text-[11px] font-bold truncate max-w-[140px]" title={f.name}>
                            {f.name}
                          </span>
                        </div>
                        <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-text-secondary/50'} />
                      </button>
                    );
                  })}
                </div>

                {/* Sub-detail: Fields of selected file */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedFileId && extractedData[selectedFileId] ? (
                    <>
                      <div className="flex justify-between items-center border-b border-border pb-3 shrink-0 select-none">
                        <span className="text-[11px] font-bold text-text-primary truncate" title={extractedData[selectedFileId]?._fileName}>
                          Nội dung: {extractedData[selectedFileId]?._fileName}
                        </span>
                        {extractedData[selectedFileId]?._error && (
                          <span className="text-[9px] bg-accent/15 text-accent font-bold px-2 py-0.5 rounded-full">
                            Bị lỗi
                          </span>
                        )}
                      </div>

                      {/* Extracted form fields */}
                      <div className="space-y-4">
                        {activeTemplate.fields
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map(f => {
                            const val = extractedData[selectedFileId][f.id] || '';
                            const isMissing = f.required && (!val || String(val).trim() === '');
                            
                            return (
                              <div key={f.id} className="space-y-1 text-[11px]">
                                <div className="flex justify-between items-center">
                                  <label className="font-bold text-text-primary flex items-center gap-1 select-none">
                                    <span>{f.label}</span>
                                    {f.required && <span className="text-accent">*</span>}
                                  </label>
                                  {isMissing ? (
                                    <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span>⚠️ Cần kiểm tra</span>
                                    </span>
                                  ) : (
                                    f.dataType && (
                                      <span className="text-[9px] font-semibold text-text-secondary bg-background px-1.5 py-0.5 rounded font-mono uppercase">
                                        {f.dataType}
                                      </span>
                                    )
                                  )}
                                </div>
                                
                                {f.description && (
                                  <p className="text-[10px] text-text-secondary font-medium leading-relaxed italic">{f.description}</p>
                                )}

                                {f.dataType === 'list' ? (
                                  <textarea
                                    value={val}
                                    onChange={(e) => handleEditExtractedValue(selectedFileId, f.id, e.target.value)}
                                    placeholder={f.example ? `Ví dụ: ${f.example}` : 'Nhập danh sách giá trị...'}
                                    rows={2}
                                    className="w-full p-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-text-primary leading-relaxed resize-y font-medium"
                                  />
                                ) : (
                                  <input
                                    type={f.dataType === 'number' ? 'number' : 'text'}
                                    value={val}
                                    onChange={(e) => handleEditExtractedValue(selectedFileId, f.id, e.target.value)}
                                    placeholder={f.example ? `Ví dụ: ${f.example}` : 'Nhập giá trị...'}
                                    className="w-full h-10 px-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-text-primary font-medium"
                                  />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary/50 text-xs">
                      Chọn một tệp ở danh sách bên trái để xem và sửa kết quả trích xuất.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Privacy Warning & Disclaimer */}
            <div className="p-4 border-t border-border bg-background/30 shrink-0 text-[10px] text-text-secondary font-medium flex items-start gap-2 select-none">
              <span className="material-icons text-[14px] text-primary mt-0.5">security</span>
              <div className="leading-relaxed">
                <strong>🛡️ Cảnh báo Bảo mật & Nghiệp vụ:</strong> Dữ liệu OCR và kết quả trích xuất chỉ được xử lý tạm thời trên bộ nhớ RAM trình duyệt và gửi trực tiếp qua Gemini API của bạn, hoàn toàn không được lưu trữ hoặc gửi lên bất kỳ máy chủ bên thứ ba nào. Người dùng bắt buộc phải đối chiếu và kiểm tra lại toàn bộ kết quả trước khi sử dụng cho công tác chuyên môn/tố tụng.
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
