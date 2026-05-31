/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Scale, Edit3, Trash2, PlusCircle, Layout, X, RefreshCw } from 'lucide-react';
import { generateCaseMindmap, convertJsonToFlow, getDagreLayout } from '../utils/mindmapService';
import { exportToPng, exportToPdf, exportToPptx } from '../utils/mindmapExportHelper';
import CustomMindmapNode from './CustomMindmapNode';

// Đăng ký loại node tùy chỉnh
const nodeTypes = {
  customMindmapNode: CustomMindmapNode,
};

export default function MindmapWorkspace({ ocrText, config, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [diagramType, setDiagramType] = useState('');
  const [diagramFormat, setDiagramFormat] = useState('');
  const [activeTheme, setActiveTheme] = useState('classic_judicial');
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  // States của React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reactFlowWrapper = useRef(null);

  // Quản lý nguồn đầu vào của Sơ đồ tư duy
  const [showSourceModal, setShowSourceModal] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef(null);

  // Trạng thái của máy trạng thái phân tích
  const [status, setStatus] = useState('idle'); // 'idle' | 'source_selected' | 'config_ready' | 'generating' | 'generated' | 'error'
  const [generatedConfig, setGeneratedConfig] = useState({ template: '', type: '', format: '' });

  // Bảng màu cho phép đổi màu sắc nhánh
  const colorsList = [
    { hex: '#163A70', name: 'Navy' },
    { hex: '#2F5FA7', name: 'Blue' },
    { hex: '#1E8E5A', name: 'Lục' },
    { hex: '#D97706', name: 'Cam' },
    { hex: '#7C3AED', name: 'Tím' },
    { hex: '#DB2777', name: 'Hồng' },
    { hex: '#C62828', name: 'Đỏ' },
    { hex: '#475569', name: 'Slate' }
  ];

  // Lấy danh sách API Keys từ cấu hình hiện tại hoặc localStorage (dùng chung nguồn với OCR)
  const apiKeysPool = useMemo(() => {
    const rawKeys = config?.apiKey || localStorage.getItem('ocr_api_key') || '';
    return rawKeys.split(',').map(k => k.trim()).filter(Boolean);
  }, [config?.apiKey]);

  const modelName = config?.model || localStorage.getItem('ocr_model') || 'gemini-2.5-flash';

  // Thực hiện phân tích vụ án và sinh sơ đồ tư duy bằng Gemini
  const handleGenerateMindmap = async (templateKey = selectedTemplate, type = diagramType, format = diagramFormat, textToUse = inputText) => {
    if (apiKeysPool.length === 0) {
      setGenerationError("Chưa cấu hình Gemini API Key. Vui lòng vào Cấu hình API để thêm key trước khi tạo sơ đồ.");
      setStatus('error');
      return;
    }
    if (!textToUse || !textToUse.trim()) {
      setGenerationError("Không có dữ liệu văn bản để phân tích sơ đồ.");
      setStatus('error');
      return;
    }
    if (!templateKey || !type || !format) {
      setGenerationError("Cấu hình sơ đồ tư duy không hợp lệ (thiếu mẫu vụ án, loại sơ đồ, hoặc hình thức).");
      setStatus('error');
      return;
    }
    if (textToUse.trim().length < 50) {
      setGenerationError("Văn bản nguồn quá ngắn (tối thiểu 50 ký tự) để tạo sơ đồ.");
      setStatus('error');
      return;
    }

    setIsGenerating(true);
    setStatus('generating');
    setGenerationError(null);
    setSelectedNode(null);

    try {
      // 1. Gọi API Gemini lấy kết quả trích xuất dạng JSON thông qua cơ chế rotation
      const parsedData = await generateCaseMindmap(textToUse, templateKey, apiKeysPool, modelName, type, format);

      // 2. Chuyển đổi dữ liệu JSON thành Nodes & Edges và áp dụng thuật toán layout
      const orientation = (format === 'hình cây' || format === 'đa luồng') ? 'vertical' : 'horizontal';
      const { nodes: flowNodes, edges: flowEdges } = convertJsonToFlow(parsedData, orientation, activeTheme);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setGeneratedConfig({ template: templateKey, type: type, format: format });
      setStatus('generated');
    } catch (error) {
      console.error("Lỗi sinh sơ đồ:", error);
      
      let displayError = error.message;
      if (error.code === 'CONFIG_MISSING') {
        displayError = "Chưa cấu hình Gemini API Key. Vui lòng vào Cấu hình API để thêm key trước khi tạo sơ đồ.";
      } else if (error.code === 'INVALID_KEY' || error.message.includes("API key not valid") || error.message.includes("key is invalid")) {
        displayError = "Gemini API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong Cấu hình API.";
      } else if (error.code === 'QUOTA_EXCEEDED') {
        displayError = "Hạn mức API Key của bạn đã bị quá tải (Rate Limit / Quota Exceeded). Vui lòng đợi 1 phút hoặc đổi sang Key khác.";
      } else if (error.code === 'BLOCKED_REQUEST') {
        displayError = "Truy cập bị từ chối. API Key không có quyền sử dụng mô hình này hoặc kết nối bị chặn.";
      } else if (error.code === 'RECITATION') {
        displayError = "Không thể tạo sơ đồ tư duy do bộ lọc trích dẫn (Recitation Filter) của Google chặn tài liệu này.";
      }
      
      setGenerationError(displayError);
      setStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Lắng nghe phím Esc để thoát chế độ trình chiếu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreenMode) {
        setIsFullscreenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMode]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, theme: newTheme }
    })));
    
    // Đồng thời cập nhật edges class và style mới của theme
    setEdges((eds) => eds.map((e) => {
      let edgeColor;
      // Tìm target node để lấy accent color
      const targetNode = nodes.find(n => n.id === e.target);
      const accentColor = targetNode?.data?.accentColor || '#163A70';
      const isPlaceholder = !!targetNode?.data?.isPlaceholder;
      
      if (newTheme === 'investigation_board') {
        edgeColor = isPlaceholder ? '#ef4444' : '#b91c1c';
      } else if (newTheme === 'executive_summary') {
        edgeColor = isPlaceholder ? '#ef4444' : '#18181b';
      } else {
        edgeColor = isPlaceholder ? '#ef4444' : accentColor;
      }
      
      return {
        ...e,
        className: `${newTheme}-edge`,
        animated: isPlaceholder || (newTheme === 'presentation_pro'),
        style: {
          ...e.style,
          stroke: edgeColor
        }
      };
    }));
  };

  // Mở màn hình chọn nguồn dữ liệu ngay khi Workspace được mount hoặc nạp ocrText ban đầu
  useEffect(() => {
    if (ocrText && ocrText.trim()) {
      if (ocrText.trim().length >= 50) {
        setInputText(ocrText);
        setSourceName("Kết quả OCR hiện tại");
        setStatus('source_selected');
        setShowSourceModal(false);
      } else {
        setShowSourceModal(true);
        setStatus('idle');
      }
    } else {
      setShowSourceModal(true);
      setStatus('idle');
    }
  }, [ocrText]);

  // Tự động chuyển đổi giữa source_selected và config_ready
  useEffect(() => {
    if (status === 'source_selected' || status === 'config_ready' || status === 'idle') {
      const isConfigValid = 
        inputText && 
        inputText.trim().length >= 50 && 
        selectedTemplate && 
        selectedTemplate !== '' &&
        diagramType && 
        diagramType !== '' &&
        diagramFormat && 
        diagramFormat !== '';
      
      if (isConfigValid) {
        if (status !== 'config_ready') setStatus('config_ready');
      } else {
        if (inputText && inputText.trim().length >= 50) {
          if (status !== 'source_selected') setStatus('source_selected');
        } else {
          if (status !== 'idle') setStatus('idle');
        }
      }
    }
  }, [inputText, selectedTemplate, diagramType, diagramFormat, status]);

  // Xử lý Hủy/Đóng hộp thoại chọn nguồn
  const handleCancelSourceSelection = () => {
    if (nodes.length === 0 && status !== 'source_selected' && status !== 'config_ready') {
      onClose(); // Nếu chưa dựng sơ đồ và chưa nạp dữ liệu thì đóng hẳn workspace
    } else {
      setShowSourceModal(false); // Chỉ đóng popup chọn nguồn
    }
  };

  // Xử lý khi tải file văn bản lên
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'txt' && ext !== 'md') {
      alert("⚠️ Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ .txt hoặc .md");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      if (!text || !text.trim()) {
        alert("⚠️ Tệp tin văn bản trống. Vui lòng chọn tệp có nội dung.");
        return;
      }
      if (text.trim().length < 50) {
        alert("⚠️ Tệp văn bản quá ngắn (dưới 50 ký tự) để tạo sơ đồ. Vui lòng chọn tệp khác.");
        return;
      }
      setInputText(text);
      setSourceName(`Tệp văn bản: ${file.name}`);
      setShowSourceModal(false);
      setStatus('source_selected'); // Chuyển sang chọn cấu hình, không gọi AI ngay
      alert("Đã nạp nội dung. Vui lòng chọn mẫu vụ án và loại sơ đồ trước khi tạo.");
    };
    reader.onerror = () => {
      alert("⚠️ Đọc tệp tin thất bại. Vui lòng thử lại.");
    };
    reader.readAsText(file, "UTF-8");
  };

  // Xử lý khi dán văn bản trực tiếp
  const handlePasteSubmit = () => {
    if (!pasteText || pasteText.trim().length < 50) {
      alert("⚠️ Nội dung dán quá ngắn. Vui lòng nhập nội dung chi tiết hơn (tối thiểu 50 ký tự) để AI phân tích chính xác.");
      return;
    }
    setInputText(pasteText);
    setSourceName("Nội dung dán trực tiếp");
    setShowSourceModal(false);
    setStatus('source_selected'); // Chuyển sang chọn cấu hình, không gọi AI ngay
    alert("Đã nạp nội dung. Vui lòng chọn mẫu vụ án và loại sơ đồ trước khi tạo.");
  };

  // Xử lý sự kiện click vào Node
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Xử lý sự kiện click vào Background để bỏ chọn Node
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Sửa chữ hiển thị của Node
  const handleLabelChange = (e) => {
    if (!selectedNode) return;
    const newLabel = e.target.value;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: { ...n.data, label: newLabel },
          };
        }
        return n;
      })
    );

    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, label: newLabel },
    }));
  };

  // Sửa ghi chú (Note) của Node
  const handleNoteChange = (e) => {
    if (!selectedNode) return;
    const newNote = e.target.value;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: { ...n.data, note: newNote },
          };
        }
        return n;
      })
    );

    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, note: newNote },
    }));
  };

  // Sửa tài liệu chứng cứ (Evidence) của Node
  const handleEvidenceChange = (e) => {
    if (!selectedNode) return;
    const newEvidence = e.target.value;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: { ...n.data, evidence: newEvidence },
          };
        }
        return n;
      })
    );

    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, evidence: newEvidence },
    }));
  };

  // Đổi màu sắc nhánh cho Node được chọn
  const handleColorChange = (hexColor) => {
    if (!selectedNode) return;

    // Đổi màu cho chính node được chọn và toàn bộ các node con nằm trong cây con của nó
    const getChildNodeIds = (nodeId) => {
      const childIds = edges.filter((e) => e.source === nodeId).map((e) => e.target);
      let subChildIds = [];
      childIds.forEach((cid) => {
        subChildIds.push(...getChildNodeIds(cid));
      });
      return [...childIds, ...subChildIds];
    };

    const targetNodeIds = [selectedNode.id, ...getChildNodeIds(selectedNode.id)];

    setNodes((nds) =>
      nds.map((n) => {
        if (targetNodeIds.includes(n.id)) {
          return {
            ...n,
            data: { ...n.data, accentColor: hexColor },
          };
        }
        return n;
      })
    );

    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, accentColor: hexColor },
    }));
  };

  // Xóa Node được chọn
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    if (selectedNode.id === 'root' || selectedNode.id.startsWith('cat-')) {
      alert("⚠️ Không được phép xóa Node gốc hoặc các Danh mục chính của cấu trúc vụ án.");
      return;
    }

    const nodeId = selectedNode.id;
    const parentEdge = edges.find((e) => e.target === nodeId);

    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

    // Nếu danh mục cha không còn con nào, tự động tạo node "Cần bổ sung"
    if (parentEdge) {
      const parentId = parentEdge.source;
      const otherChildren = edges.filter((e) => e.source === parentId && e.target !== nodeId);

      if (otherChildren.length === 0) {
        const placeholderId = `${parentId}-placeholder`;

        setNodes((nds) => [
          ...nds,
          {
            id: placeholderId,
            type: 'customMindmapNode',
            data: {
              label: '⚠️ Cần bổ sung dữ liệu',
              nodeType: 'placeholder',
              accentColor: selectedNode.data.accentColor,
              note: '',
              evidence: '',
              orientation: selectedNode.data.orientation,
              isPlaceholder: true,
            },
            position: { x: selectedNode.position.x, y: selectedNode.position.y },
          },
        ]);

        setEdges((eds) => [
          ...eds,
          {
            id: `edge-${parentId}-${placeholderId}`,
            source: parentId,
            target: placeholderId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#e11d48', strokeWidth: 2 },
          },
        ]);
      }
    }

    setSelectedNode(null);
  };

  // Thêm Node con dưới Node được chọn (chỉ hỗ trợ thêm dưới category hoặc subBranch)
  const handleAddChildNode = () => {
    if (!selectedNode) return;
    const nodeType = selectedNode.data.nodeType;
    if (nodeType !== 'category' && nodeType !== 'subBranch') {
      alert("⚠️ Chỉ hỗ trợ cấu trúc 3 tầng: Danh mục (Cấp 1) -> Nhánh con (Cấp 2) -> Chi tiết (Cấp 3). Vui lòng chọn nhánh L1 hoặc L2 để thêm.");
      return;
    }

    const parentId = selectedNode.id;
    const isL1 = nodeType === 'category';
    const childType = isL1 ? 'subBranch' : 'detail';

    // Tạo ID cho con mới
    const newId = `node-${childType}-${Math.random().toString(36).substring(2, 9)}`;

    // Tìm và loại bỏ placeholder nếu có
    const placeholderId = `${parentId}-placeholder`;
    const hasPlaceholder = nodes.some((n) => n.id === placeholderId);

    // Tính toán tọa độ đặt con
    const isVertical = selectedNode.data.orientation === 'vertical';
    
    let childX = selectedNode.position.x;
    let childY = selectedNode.position.y;
    
    if (isVertical) {
      childY = selectedNode.position.y + 180;
    } else {
      childX = selectedNode.position.x + 340;
    }

    const siblingIds = edges.filter((e) => e.source === parentId).map((e) => e.target);
    const siblingNodes = nodes.filter((n) => siblingIds.includes(n.id) && n.id !== placeholderId);

    if (siblingNodes.length > 0) {
      if (isVertical) {
        const maxX = Math.max(...siblingNodes.map((n) => n.position.x));
        childX = maxX + 300;
      } else {
        const maxY = Math.max(...siblingNodes.map((n) => n.position.y));
        childY = maxY + 100;
      }
    }

    if (hasPlaceholder) {
      setNodes((nds) => nds.filter((n) => n.id !== placeholderId));
      setEdges((eds) => eds.filter((e) => e.target !== placeholderId));
      if (isVertical) childX = selectedNode.position.x;
      else childY = selectedNode.position.y;
    }

    const newNode = {
      id: newId,
      type: 'customMindmapNode',
      data: {
        label: isL1 ? 'Nhánh cấp 2 mới' : 'Nội dung chi tiết mới',
        nodeType: childType,
        accentColor: selectedNode.data.accentColor,
        note: '',
        evidence: '',
        orientation: selectedNode.data.orientation,
        isPlaceholder: false,
      },
      position: { x: childX, y: childY },
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      },
    ]);

    setTimeout(() => {
      setSelectedNode(newNode);
    }, 50);
  };

  // Căn chỉnh bố cục đẹp lại (Reset / Align Layout bằng Dagre)
  const handleAlignLayout = () => {
    if (nodes.length === 0) return;
    const direction = (diagramFormat === 'hình cây' || diagramFormat === 'đa luồng') ? 'TB' : 'LR';
    const { nodes: layoutedNodes, edges: layoutedEdges } = getDagreLayout(nodes, edges, direction, activeTheme);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    alert("✨ Đã tối ưu bố cục tự động bằng Dagre Layout.");
  };

  // Xuất PowerPoint chuẩn 4 Slide theo Hướng dẫn 10
  const handleExportPPTX = async () => {
    try {
      const rootNode = nodes.find((n) => n.id === 'root');
      if (!rootNode) return;



      // Tìm các L1 branches từ các edge nối với root
      const l1Edges = edges.filter(e => e.source === 'root');
      const l1Nodes = nodes
        .filter(n => l1Edges.some(e => e.target === n.id))
        .sort((a, b) => a.position.y - b.position.y);

      const reconstructedBranches = l1Nodes.map(l1 => {
        const color = l1.data.accentColor;
        
        // Nhánh cấp 2
        const l2Edges = edges.filter(e => e.source === l1.id);
        const l2Nodes = nodes
          .filter(n => l2Edges.some(e => e.target === n.id) && !n.id.startsWith('q-') && !n.data.isPlaceholder)
          .sort((a, b) => a.position.y - b.position.y);

        // Lấy câu hỏi L1
        const qNode = nodes.find(n => l2Edges.some(e => e.target === n.id) && n.id.startsWith('q-'));
        let questions = [];
        if (qNode) {
          const qLines = qNode.data.label.split('\n').slice(1);
          questions = qLines.map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean);
        }

        const subBranches = l2Nodes.map(l2 => {
          // Nhánh cấp 3
          const l3Edges = edges.filter(e => e.source === l2.id);
          const l3Nodes = nodes
            .filter(n => l3Edges.some(e => e.target === n.id) && !n.data.isPlaceholder)
            .sort((a, b) => a.position.y - b.position.y);

          const l3Branches = l3Nodes.map(l3 => ({
            label: l3.data.label,
            note: l3.data.note,
            evidence: l3.data.evidence
          }));

          return {
            label: l2.data.label,
            note: l2.data.note,
            evidence: l2.data.evidence,
            subBranches: l3Branches
          };
        });

        return {
          label: l1.data.label,
          color: color,
          note: l1.data.note,
          questions: questions,
          subBranches: subBranches
        };
      });

      const reconstructedJson = {
        caseTitle: rootNode.data.label,
        branches: reconstructedBranches
      };

      const safeFileName = rootNode.data.label.replace(/[^a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '').replace(/\s+/g, '_');
      await exportToPptx(reconstructedJson, `bao_cao_an_hd10_${safeFileName || 'so_do'}.pptx`);
    } catch (err) {
      alert("Lỗi khi xuất slide PPTX: " + err.message);
    }
  };

  const isConfigModified = status === 'generated' && (
    selectedTemplate !== generatedConfig.template ||
    diagramType !== generatedConfig.type ||
    diagramFormat !== generatedConfig.format
  );

  const handleExportPNG = async () => {
    if (reactFlowWrapper.current) {
      try {
        const flowContainer = reactFlowWrapper.current.querySelector('.react-flow');
        const rootNode = nodes.find((n) => n.id === 'root');
        const safeFileName = rootNode?.data?.label?.substring(0, 30) || 'mindmap';
        await exportToPng(flowContainer, `so_do_${safeFileName}.png`);
      } catch (err) {
        alert("Lỗi khi xuất ảnh PNG: " + err.message);
      }
    }
  };

  const handleExportPDF = async () => {
    if (reactFlowWrapper.current) {
      try {
        const flowContainer = reactFlowWrapper.current.querySelector('.react-flow');
        const rootNode = nodes.find((n) => n.id === 'root');
        const safeFileName = rootNode?.data?.label?.substring(0, 30) || 'mindmap';
        await exportToPdf(flowContainer, `so_do_${safeFileName}.pdf`);
      } catch (err) {
        alert("Lỗi khi xuất file PDF: " + err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/60 backdrop-blur-md overflow-hidden animate-fade-in font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Đóng workspace"
          >
            <X size={20} />
          </button>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-[24px]">insights</span>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
                👑 Sơ đồ tư duy theo Hướng dẫn 10/HD-VKSTC
                <span className="text-[8px] bg-primary text-white font-extrabold px-1.5 py-0.5 rounded-sm normal-case tracking-normal">PREMIUM</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[400px]">
                {status === 'idle' ? 'Chưa chọn dữ liệu nguồn' : 
                 (status === 'source_selected' || status === 'config_ready') ? 'Đang thiết lập cấu hình sơ đồ vụ án' :
                 status === 'generating' ? 'AI đang phân tích và tạo sơ đồ...' :
                 nodes.find(n => n.id === 'root')?.data?.label || 'Sơ đồ tư duy vụ án'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        {status === 'generated' && (
          <div className="flex items-center gap-3">
            {/* Template chọn loại án */}
            <div className="flex flex-col text-left gap-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mẫu Vụ án</span>
              <select
                value={selectedTemplate}
                disabled={isGenerating}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-primary font-semibold"
              >
                <option value="hinh_su">Hình sự</option>
                <option value="dan_su">Dân sự</option>
                <option value="hanh_chinh">Hành chính</option>
                <option value="hon_nhan">Hôn nhân & Gia đình</option>
                <option value="thi_hanh_an">Thi hành án</option>
                <option value="tuy_chinh">Tùy chỉnh</option>
              </select>
            </div>

            {/* Chọn Loại sơ đồ HD10 */}
            <div className="flex flex-col text-left gap-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Loại sơ đồ (HD10)</span>
              <select
                value={diagramType}
                disabled={isGenerating}
                onChange={(e) => setDiagramType(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-primary font-semibold max-w-[200px]"
              >
                <option value="tong_the">Sơ đồ tổng thể vụ án</option>
                <option value="dien_bien">Sơ đồ diễn biến hành vi</option>
                <option value="danh_gia_chung_cu">Sơ đồ đánh giá chứng cứ</option>
                <option value="bi_can_hanh_vi">Sơ đồ bị can/bị cáo và hành vi</option>
                <option value="buoc_toi_go_toi">Sơ đồ buộc tội - gỡ tội</option>
                <option value="yeu_cau_dieu_tra">Sơ đồ yêu cầu điều tra bổ sung</option>
                <option value="doi_chieu_chung_cu">Bảng đối chiếu lời khai/chứng cứ</option>
              </select>
            </div>

            {/* Chọn Hình thức */}
            <div className="flex flex-col text-left gap-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hình thức</span>
              <select
                value={diagramFormat}
                disabled={isGenerating}
                onChange={(e) => setDiagramFormat(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-primary font-semibold"
              >
                <option value="hình cây">Hình cây</option>
                <option value="hình luồng">Luồng</option>
                <option value="đa luồng">Đa luồng</option>
                <option value="ngang/dọc">Ngang/dọc/quy trình</option>
                <option value="bảng biểu">Bảng biểu</option>
              </select>
            </div>

            {/* Nút Tạo lại sơ đồ (chỉ hiển thị khi cấu hình thay đổi sau khi đã dựng sơ đồ thành công) */}
            {isConfigModified && (
              <button
                onClick={() => handleGenerateMindmap(selectedTemplate, diagramType, diagramFormat, inputText)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 h-9 px-3.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md animate-pulse active:scale-95 mt-3.5"
                title="Cấu hình đã thay đổi. Click để tạo lại sơ đồ theo cấu hình mới."
              >
                <span className="material-icons text-[14px]">refresh</span>
                <span>Tạo lại sơ đồ</span>
              </button>
            )}

            {/* Quick Layout Re-alignment */}
            <button
              onClick={handleAlignLayout}
              disabled={isGenerating || nodes.length === 0}
              className="flex items-center justify-center gap-1 h-9 px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-3.5"
              title="Tự động xếp thẳng hàng các node theo hình thức đã chọn"
            >
              <Layout size={12} />
              <span>Sắp xếp</span>
            </button>

            <button
              onClick={() => setShowSourceModal(true)}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 h-9 px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 mt-3.5"
              title="Thay đổi nguồn dữ liệu phân tích (OCR, Tải tệp, Dán văn bản)"
            >
              <span className="material-icons text-[14px]">swap_horiz</span>
              <span>Đổi nguồn</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-800 mx-1 mt-3.5"></div>

            {/* Export options */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 mt-3.5">
              <button
                onClick={handleExportPNG}
                disabled={isGenerating || nodes.length === 0}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                title="Xuất sơ đồ ra file ảnh PNG"
              >
                <span>PNG</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isGenerating || nodes.length === 0}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                title="Xuất sơ đồ ra bản vẽ PDF"
              >
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportPPTX}
                disabled={isGenerating || nodes.length === 0}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-all cursor-pointer disabled:opacity-40"
                title="Xuất sơ đồ ra 4 Slide PowerPoint trình chiếu HD10"
              >
                <span>PPTX</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-h-0 bg-slate-950 relative">
        {(status === 'source_selected' || status === 'config_ready') ? (
          /* Dashboard cấu hình trước khi tạo sơ đồ */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 overflow-y-auto">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 font-sans text-white">
              
              {/* Step Header */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">1</div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-200">Cấu hình & Tạo sơ đồ tư duy</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Nạp dữ liệu nguồn thành công. Vui lòng thiết lập thông số để tạo sơ đồ tư duy nghiệp vụ.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {/* Cấu hình */}
                <div className="space-y-4">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Tham số cấu hình</h4>
                  
                  {/* Mẫu Vụ án */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 font-bold">Mẫu Vụ án / Nghiệp vụ:</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn mẫu vụ án --</option>
                      <option value="hinh_su">Hình sự</option>
                      <option value="dan_su">Dân sự</option>
                      <option value="hanh_chinh">Hành chính</option>
                      <option value="hon_nhan">Hôn nhân & Gia đình</option>
                      <option value="thi_hanh_an">Thi hành án</option>
                      <option value="tuy_chinh">Tùy chỉnh</option>
                    </select>
                  </div>

                  {/* Loại sơ đồ */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 font-bold">Loại Sơ đồ (Theo Hướng dẫn 10):</label>
                    <select
                      value={diagramType}
                      onChange={(e) => setDiagramType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn loại sơ đồ --</option>
                      <option value="tong_the">Sơ đồ tổng thể vụ án</option>
                      <option value="dien_bien">Sơ đồ diễn biến hành vi</option>
                      <option value="danh_gia_chung_cu">Sơ đồ đánh giá chứng cứ</option>
                      <option value="bi_can_hanh_vi">Sơ đồ bị can/bị cáo và hành vi</option>
                      <option value="buoc_toi_go_toi">Sơ đồ buộc tội - gỡ tội</option>
                      <option value="yeu_cau_dieu_tra">Sơ đồ yêu cầu điều tra bổ sung</option>
                      <option value="doi_chieu_chung_cu">Bảng đối chiếu lời khai/chứng cứ</option>
                    </select>
                  </div>

                  {/* Hình thức */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 font-bold">Hình thức hiển thị:</label>
                    <select
                      value={diagramFormat}
                      onChange={(e) => setDiagramFormat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn hình thức --</option>
                      <option value="hình cây">Hình cây</option>
                      <option value="hình luồng">Luồng</option>
                      <option value="đa luồng">Đa luồng</option>
                      <option value="ngang/dọc">Ngang/dọc/quy trình</option>
                      <option value="bảng biểu">Bảng biểu</option>
                    </select>
                  </div>

                  {/* Giao diện Theme */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 font-bold">Giao diện (Theme):</label>
                    <select
                      value={activeTheme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-white font-semibold outline-none cursor-pointer"
                    >
                      <option value="classic_judicial">⚖️ Cổ điển Tư pháp (Judicial)</option>
                      <option value="presentation_pro">🎬 Trình chiếu Hiện đại (Pro Glow)</option>
                      <option value="investigation_board">📌 Bảng điều tra phá án (Cork Board)</option>
                      <option value="executive_summary">📝 Báo cáo Tóm tắt (High Contrast)</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-4 flex flex-col">
                  <div className="flex flex-col gap-1 text-[11px] shrink-0 text-slate-400">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Nguồn dữ liệu:</span>{' '}
                      <span className="text-slate-200 font-semibold">{sourceName || 'Chưa xác định'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Dung lượng:</span>{' '}
                      <span className="text-slate-200 font-semibold">{inputText ? inputText.length.toLocaleString() : 0} ký tự</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
                    Xem trước nội dung (500 - 1000 ký tự đầu):
                  </h4>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 min-h-[180px] max-h-[220px] overflow-y-auto text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap select-text">
                    {inputText ? inputText.substring(0, 1000) : ''}
                    {inputText && inputText.length > 1000 && <span className="text-primary font-bold">... [Còn tiếp {inputText.length - 1000} ký tự]</span>}
                  </div>

                  {(!inputText || inputText.trim().length < 50) && (
                    <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-3 text-[10px] text-amber-500 leading-normal flex items-start gap-1.5 shrink-0">
                      <span className="material-icons text-[14px]">warning</span>
                      <span>Cảnh báo: Nội dung văn bản quá ngắn. Hãy bổ sung tối thiểu 50 ký tự để AI phân tích tốt nhất.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer hành động */}
              <div className="border-t border-slate-800 pt-5 mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <button
                  onClick={() => setShowSourceModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span className="material-icons text-[14px]">swap_horiz</span>
                  <span>Chọn nguồn dữ liệu khác</span>
                </button>

                <button
                  onClick={() => handleGenerateMindmap(selectedTemplate, diagramType, diagramFormat, inputText)}
                  disabled={isGenerating || !inputText || inputText.trim().length < 50 || !selectedTemplate || !diagramType || !diagramFormat}
                  className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 uppercase tracking-wider text-center"
                >
                  <span className="material-icons text-[16px]">insights</span>
                  <span>🚀 Tạo sơ đồ báo cáo án</span>
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* Khung làm việc sơ đồ và hiệu chỉnh gốc */
          <>
            {/* React Flow Board Container */}
            <div ref={reactFlowWrapper} className={`flex-1 h-full relative theme-board ${activeTheme}`}>
              {nodes.length > 0 && !isGenerating ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  fitView
                  minZoom={0.05}
                  maxZoom={2.0}
                >
                  <Controls className="bg-slate-800 border border-slate-700 text-white rounded-xl shadow-md [&_button]:border-slate-700 [&_button]:bg-slate-800 hover:[&_button]:bg-slate-700" />
                  <Background color={activeTheme === 'executive_summary' ? '#cbd5e1' : '#334155'} gap={24} size={1} />
                  
                  {/* Banner cảnh báo nghiệp vụ theo quy chuẩn HD10 */}
                  <Panel position="bottom-center" className="bg-slate-900/90 text-slate-400 border border-slate-800 rounded-xl px-5 py-2.5 max-w-[900px] text-center backdrop-blur-xs select-none shadow-xl mb-4">
                    <p className="text-[10px] leading-relaxed">
                      ⚠️ <strong>Khuyến cáo nghiệp vụ:</strong> Sơ đồ do AI tạo chỉ là bản nháp hỗ trợ nghiên cứu hồ sơ. Người dùng phải tự kiểm tra, chỉnh sửa và chịu trách nhiệm về nội dung trước khi sử dụng báo cáo án hoặc trình chiếu. Công cụ chỉ mang tính sơ đồ hóa thông tin, không thay thế báo cáo đề xuất hay cáo trạng.
                    </p>
                  </Panel>
                </ReactFlow>
              ) : null}

              {/* Floating controls panel when in presentation/fullscreen mode */}
              {isFullscreenMode && (
                <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] select-none animate-fade-in text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Chủ đề:</span>
                    <select
                      value={activeTheme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-primary font-semibold"
                    >
                      <option value="classic_judicial">⚖️ Cổ điển Tư pháp</option>
                      <option value="presentation_pro">🎬 Trình chiếu Hiện đại</option>
                      <option value="investigation_board">📌 Bảng điều tra</option>
                      <option value="executive_summary">📝 Báo cáo Tóm tắt</option>
                    </select>
                  </div>
                  
                  <div className="h-6 w-[1px] bg-slate-800"></div>

                  <button
                    onClick={handleAlignLayout}
                    className="flex items-center gap-1.5 h-8 px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                    title="Tối ưu lại bố cục tự động"
                  >
                    <Layout size={12} />
                    <span>Tối ưu bố cục</span>
                  </button>

                  <div className="h-6 w-[1px] bg-slate-800"></div>

                  <button
                    onClick={() => setIsFullscreenMode(false)}
                    className="flex items-center gap-1.5 h-8 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                    title="Thoát chế độ trình chiếu (Esc)"
                  >
                    <span className="material-icons text-[14px]">fullscreen_exit</span>
                    <span>Thoát</span>
                  </button>
                </div>
              )}

              {/* Loading Indicator */}
              {isGenerating && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center text-center max-w-sm px-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 animate-pulse scale-110">
                      <Scale size={32} className="animate-bounce" />
                    </div>
                    <h4 className="font-extrabold text-lg text-white mb-2 tracking-wide uppercase">AI đang phân tích nghiệp vụ</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Đang lập sơ đồ phân tầng (Cấp 1-2-3) theo đúng Hướng dẫn 10/HD-VKSTC, phân bổ các nhóm bị can, chứng cứ và câu hỏi làm rõ...
                    </p>
                    <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full w-2/3 animate-[scan_2s_infinite_ease-in-out]"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message Display */}
              {generationError && !isGenerating && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md text-left text-slate-300 mx-4">
                    <div className="flex items-center gap-2 mb-3 text-red-500 font-bold">
                      <span className="material-icons text-[20px]">warning</span>
                      <h4 className="text-sm">Lỗi Khởi Tạo Sơ Đồ</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400 mb-4 whitespace-pre-wrap bg-slate-950 p-4 rounded-xl font-mono border border-slate-800">
                      {generationError}
                    </p>
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => handleGenerateMindmap()}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} />
                        <span>Thử lại lần nữa</span>
                      </button>
                      <button
                        onClick={() => {
                          setGenerationError(null);
                          setStatus('source_selected');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Quay lại cấu hình
                      </button>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Panel for Node Editing (Glassmorphic Slide-in) */}
            <div className={`w-80 h-full border-l border-slate-800 bg-slate-900/90 backdrop-blur-md text-white flex flex-col shrink-0 transition-all duration-300 ${
              isFullscreenMode ? 'hidden' : (selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0')
            }`}>
              {selectedNode ? (
                <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5 shrink-0">
                    <div className="flex items-center gap-2">
                      <Edit3 size={16} className="text-primary" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">
                        Hiệu chỉnh Node
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Node Metadata Summary Info */}
                  <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 mb-5 text-xs text-slate-400 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span>Cấp bậc Node:</span>
                      <span className="font-bold text-white uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-slate-800">
                        {selectedNode.id === 'root' ? 'Tổng thể (Từ gốc)' : 
                         selectedNode.data.nodeType === 'category' ? 'Nhánh L1' : 
                         selectedNode.data.nodeType === 'subBranch' ? 'Nhánh L2' : 
                         selectedNode.data.isPlaceholder ? 'Placeholder' : 'Nhánh L3 (Chi tiết)'}
                      </span>
                    </div>
                  </div>

                  {/* Nhóm chọn màu sắc nhánh */}
                  <div className="mb-5 shrink-0">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Màu sắc nhánh:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorsList.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => handleColorChange(c.hex)}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-90 ${
                            selectedNode.data.accentColor === c.hex
                              ? 'ring-2 ring-offset-2 ring-primary border-white scale-105'
                              : 'border-slate-800'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text Label Area Input */}
                  <div className="mb-4 shrink-0">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Nội dung hiển thị (Tiêu đề):
                    </label>
                    {selectedNode.id === 'root' || selectedNode.data.nodeType === 'category' ? (
                      <input
                        type="text"
                        value={selectedNode.data.label}
                        onChange={handleLabelChange}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs text-white font-semibold outline-none transition-all"
                      />
                    ) : (
                      <textarea
                        value={selectedNode.data.label}
                        onChange={handleLabelChange}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs leading-relaxed text-slate-300 font-medium outline-none resize-none transition-all"
                        placeholder="Nhập nội dung chi tiết..."
                      />
                    )}
                  </div>

                  {/* Thêm Ghi chú (Note) */}
                  <div className="mb-4 shrink-0">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      📝 Ghi chú riêng:
                    </label>
                    <textarea
                      value={selectedNode.data.note || ''}
                      onChange={handleNoteChange}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs leading-relaxed text-slate-400 font-medium outline-none resize-none transition-all"
                      placeholder="Thêm ghi chú nghiệp vụ hoặc lý giải..."
                    />
                  </div>

                  {/* Thêm Tài liệu/Chứng cứ liên quan (Evidence) */}
                  <div className="mb-6 flex-1 min-h-0 flex flex-col">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">
                      📎 Tài liệu chứng cứ liên quan:
                    </label>
                    <textarea
                      value={selectedNode.data.evidence || ''}
                      onChange={handleEvidenceChange}
                      className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs leading-relaxed text-slate-400 font-medium outline-none resize-none transition-all"
                      placeholder="Liên kết số bút lục hoặc tên tài liệu chứng cứ..."
                    />
                  </div>

                  {/* Node Operations Action Bar */}
                  <div className="border-t border-slate-800 pt-5 space-y-3 shrink-0">
                    {/* Nút Thêm node con (cho node category hoặc subBranch) */}
                    {(selectedNode.data.nodeType === 'category' || selectedNode.data.nodeType === 'subBranch') && (
                      <button
                        onClick={handleAddChildNode}
                        className="w-full flex items-center justify-center gap-2 h-11 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <PlusCircle size={14} />
                        <span>Thêm nhánh con cấp dưới</span>
                      </button>
                    )}

                    {/* Nút Xóa node (chỉ cho các node con L2/L3) */}
                    {selectedNode.id !== 'root' && !selectedNode.id.startsWith('cat-') && (
                      <button
                        onClick={handleDeleteNode}
                        className="w-full flex items-center justify-center gap-2 h-11 bg-red-950/40 border border-red-900/60 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        <Trash2 size={14} />
                        <span>Xóa khỏi sơ đồ</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-medium p-6 text-center">
                  <span className="material-icons text-[40px] opacity-35 mb-3">touch_app</span>
                  <p>Chọn một Node trên sơ đồ để hiệu chỉnh nội dung, ghi chú, chứng cứ, đổi màu sắc hoặc thêm con.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Màn hình chọn nguồn dữ liệu (Source Selector Modal) */}
      {showSourceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl mx-4 relative flex flex-col max-h-[90%] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary text-[22px]">source</span>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                  Chọn nguồn dữ liệu sơ đồ tư duy
                </h3>
              </div>
              <button
                onClick={handleCancelSourceSelection}
                className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                Vui lòng chọn nguồn văn bản hồ sơ để AI phân tích nghiệp vụ và khởi tạo sơ đồ tư duy báo cáo án.
              </p>

              {/* Source Option Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Option A: OCR Result */}
                <div 
                  onClick={() => {
                    if (ocrText && ocrText.trim()) {
                      setInputText(ocrText);
                      setShowSourceModal(false);
                      setStatus('source_selected');
                      alert("Đã nạp nội dung. Vui lòng chọn mẫu vụ án và loại sơ đồ trước khi tạo.");
                    }
                  }}
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2 ${
                    ocrText && ocrText.trim()
                      ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-primary/50'
                      : 'border-slate-800/40 bg-slate-950/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-icons text-[18px] ${ocrText && ocrText.trim() ? 'text-primary' : 'text-slate-500'}`}>description</span>
                    <span className="font-bold text-xs">Kết quả OCR hiện tại</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {ocrText && ocrText.trim() 
                      ? `Sử dụng văn bản bóc tách từ hồ sơ đang mở (${ocrText.trim().length.toLocaleString()} ký tự).`
                      : 'Chưa có dữ liệu văn bản OCR từ giao diện chính.'}
                  </p>
                  {ocrText && ocrText.trim() && (
                    <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded self-start mt-1 font-semibold uppercase">Khả dụng</span>
                  )}
                </div>

                {/* Option B: Upload File */}
                <div 
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  className="border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-primary text-[18px]">upload_file</span>
                    <span className="font-bold text-xs">Tải file văn bản</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Tải tệp văn bản từ máy tính của bạn (hỗ trợ định dạng .txt, .md).
                  </p>
                  <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded self-start mt-1 font-semibold uppercase">TXT, MD</span>
                  <input 
                    type="file" 
                    accept=".txt,.md" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </div>

              </div>

              {/* Option C: Paste Content Pane */}
              <div className="border border-slate-800 bg-slate-950/20 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-primary text-[18px]">content_paste</span>
                    <span className="font-bold text-xs">Dán nội dung trực tiếp</span>
                  </div>
                  {pasteText.trim().length > 0 && (
                    <button 
                      onClick={() => setPasteText('')}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold cursor-pointer border-none bg-transparent outline-none"
                    >
                      Xóa nội dung
                    </button>
                  )}
                </div>
                
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 text-xs leading-relaxed text-slate-300 font-medium outline-none resize-none transition-all placeholder:text-slate-600"
                  placeholder="Dán nội dung bản án, báo cáo, cáo trạng hoặc tài liệu hồ sơ tại đây... (Tối thiểu 50 ký tự để AI phân tích tốt)"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Số ký tự: <strong className={pasteText.trim().length >= 50 ? 'text-green-500' : 'text-amber-500'}>{pasteText.length.toLocaleString()}</strong> / 50 tối thiểu
                  </span>
                  
                  <button
                    onClick={handlePasteSubmit}
                    disabled={pasteText.trim().length < 50}
                    className="bg-primary hover:bg-primary-hover disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    Xác nhận & Tạo sơ đồ
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-4 mt-5 flex justify-end gap-2 shrink-0">
              <button
                onClick={handleCancelSourceSelection}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
