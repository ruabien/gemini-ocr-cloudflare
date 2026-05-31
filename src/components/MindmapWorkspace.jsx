/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Scale, Edit3, Trash2, PlusCircle, Layout, X, RefreshCw } from 'lucide-react';
import { generateCaseMindmap, convertJsonToFlow } from '../utils/mindmapService';
import { exportToPng, exportToPdf, exportToPptx } from '../utils/mindmapExportHelper';
import CustomMindmapNode from './CustomMindmapNode';

// Đăng ký loại node tùy chỉnh
const nodeTypes = {
  customMindmapNode: CustomMindmapNode,
};

export default function MindmapWorkspace({ ocrText, config, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState('hinh_su');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  // States của React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reactFlowWrapper = useRef(null);

  // Danh sách các Template
  const templates = [
    { key: 'hinh_su', name: 'Hình sự', icon: 'gavel' },
    { key: 'dan_su', name: 'Dân sự', icon: 'balance' },
    { key: 'hanh_chinh', name: 'Hành chính', icon: 'account_balance' },
    { key: 'hon_nhan', name: 'Hôn nhân & Gia đình', icon: 'favorite' }
  ];

  // Lấy danh sách API Keys từ cấu hình hiện tại hoặc localStorage (dùng chung nguồn với OCR)
  const apiKeysPool = useMemo(() => {
    const rawKeys = config?.apiKey || localStorage.getItem('ocr_api_key') || '';
    return rawKeys.split(',').map(k => k.trim()).filter(Boolean);
  }, [config?.apiKey]);

  const modelName = config?.model || localStorage.getItem('ocr_model') || 'gemini-2.5-flash';

  // Thực hiện phân tích vụ án và sinh sơ đồ tư duy bằng Gemini
  const handleGenerateMindmap = async (templateKey = selectedTemplate) => {
    if (apiKeysPool.length === 0) {
      setGenerationError("Chưa cấu hình Gemini API Key. Vui lòng vào Cấu hình API để thêm key trước khi tạo sơ đồ.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setSelectedNode(null);

    try {
      // 1. Gọi API Gemini lấy kết quả trích xuất dạng JSON thông qua cơ chế rotation
      const parsedData = await generateCaseMindmap(ocrText, templateKey, apiKeysPool, modelName);

      // 2. Chuyển đổi dữ liệu JSON thành Nodes & Edges và áp dụng thuật toán layout
      const { nodes: flowNodes, edges: flowEdges } = convertJsonToFlow(parsedData);
      setNodes(flowNodes);
      setEdges(flowEdges);
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
    } finally {
      setIsGenerating(false);
    }
  };

  // Tự động kích hoạt tạo sơ đồ lần đầu khi mở Workspace
  useEffect(() => {
    if (ocrText && ocrText.trim()) {
      handleGenerateMindmap();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý sự kiện click vào Node
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Xử lý sự kiện click vào Background để bỏ chọn Node
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Sửa chữ trong Node được chọn
  const handleLabelChange = (e) => {
    if (!selectedNode) return;
    const newLabel = e.target.value;

    // Cập nhật nhãn trong danh sách nodes của React Flow
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: newLabel,
            },
          };
        }
        return n;
      })
    );

    // Cập nhật selectedNode để đồng bộ input
    setSelectedNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        label: newLabel,
      },
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

    // 1. Loại bỏ node khỏi danh sách nodes
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    // 2. Loại bỏ edges nối với node này
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

    // 3. Nếu danh mục cha không còn con nào, tự động tạo node "Cần bổ sung"
    if (parentEdge) {
      const parentId = parentEdge.source;
      const otherChildren = edges.filter((e) => e.source === parentId && e.target !== nodeId);

      if (otherChildren.length === 0) {
        const catType = parentId.replace('cat-', '');
        const placeholderId = `det-${catType}-placeholder`;

        setNodes((nds) => [
          ...nds,
          {
            id: placeholderId,
            type: 'customMindmapNode',
            data: {
              label: '⚠️ Cần bổ sung dữ liệu',
              nodeType: 'placeholder',
              categoryType: catType,
              isPlaceholder: true,
              accentColor: selectedNode.data.accentColor,
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

  // Thêm Node con dưới Node Danh mục được chọn
  const handleAddChildNode = () => {
    if (!selectedNode) return;
    if (!selectedNode.id.startsWith('cat-')) {
      alert("⚠️ Chỉ được thêm thông tin con dưới các Danh mục chính (Cấp 2).");
      return;
    }

    const catId = selectedNode.id;
    const catType = catId.replace('cat-', '');

    // Kiểm tra xem có node placeholder "Cần bổ sung" nào đang tồn tại không
    const placeholderId = `det-${catType}-placeholder`;
    const hasPlaceholder = nodes.some((n) => n.id === placeholderId);

    const newId = `det-${catType}-${Math.random().toString(36).substring(2, 9)}`;

    // Tạo text gợi ý ban đầu dựa trên danh mục
    let initialText = "Nội dung thông tin mới";
    if (catType === 'parties') initialText = "Vai trò: Họ và tên";
    else if (catType === 'timeline') initialText = "[Thời gian]: Mô tả sự kiện";
    else if (catType === 'claims') initialText = "[Chủ thể]: Nội dung yêu cầu/quan điểm";
    else if (catType === 'legalIssues') initialText = "Vấn đề: Mô tả tranh chấp pháp lý";
    else if (catType === 'evidence') initialText = "Tên chứng cứ (Nguồn): Giá trị chứng minh";
    else if (catType === 'decision') initialText = "Quyết định: Điều khoản áp dụng";

    // Tính toán tọa độ Y phù hợp (đặt ở dưới cùng các con hiện có của danh mục đó)
    const childX = selectedNode.position.x + 340;
    const siblingIds = edges.filter((e) => e.source === catId).map((e) => e.target);
    const siblingNodes = nodes.filter((n) => siblingIds.includes(n.id) && n.id !== placeholderId);

    let childY = selectedNode.position.y;
    if (siblingNodes.length > 0) {
      const maxY = Math.max(...siblingNodes.map((n) => n.position.y));
      childY = maxY + 100; // Chiều cao node + gap
    }

    // 1. Xóa placeholder nếu có
    if (hasPlaceholder) {
      setNodes((nds) => nds.filter((n) => n.id !== placeholderId));
      setEdges((eds) => eds.filter((e) => e.target !== placeholderId));
      childY = selectedNode.position.y;
    }

    // 2. Thêm Node mới
    const newNode = {
      id: newId,
      type: 'customMindmapNode',
      data: {
        label: initialText,
        nodeType: 'detail',
        categoryType: catType,
        accentColor: selectedNode.data.accentColor,
        isPlaceholder: false,
      },
      position: { x: childX, y: childY },
    };

    setNodes((nds) => [...nds, newNode]);

    // 3. Thêm Edge kết nối
    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${catId}-${newId}`,
        source: catId,
        target: newId,
        type: 'smoothstep',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      },
    ]);

    // Tự động focus vào node mới tạo để chỉnh sửa nhanh
    setTimeout(() => {
      setSelectedNode(newNode);
    }, 50);
  };

  // Căn chỉnh bố cục đẹp lại (Reset / Align Layout)
  const handleAlignLayout = () => {
    const rootNode = nodes.find((n) => n.id === 'root');
    if (!rootNode) return;

    // Hàm đệ quy xây dựng cây từ danh sách Nodes/Edges
    const buildSubtree = (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      const childIds = edges.filter((e) => e.source === nodeId).map((e) => e.target);
      // Sắp xếp các con theo Y hiện tại để giữ thứ tự kéo thả của người dùng
      const sortedChildNodes = nodes
        .filter((n) => childIds.includes(n.id))
        .sort((a, b) => a.position.y - b.position.y);

      return {
        id: node.id,
        label: node.data.label,
        type: node.data.nodeType,
        categoryType: node.data.categoryType,
        children: sortedChildNodes.map((c) => buildSubtree(c.id)),
      };
    };

    const tree = buildSubtree('root');

    // Chạy lại thuật toán layout
    const NODE_HEIGHT = 80;
    const VERTICAL_GAP = 20;
    const HORIZONTAL_SPACING = 340;

    const computeSubtreeHeight = (node) => {
      if (!node.children || node.children.length === 0) {
        node.subtreeHeight = NODE_HEIGHT;
        return NODE_HEIGHT;
      }
      let childrenHeightSum = 0;
      node.children.forEach((child) => {
        childrenHeightSum += computeSubtreeHeight(child);
      });
      node.subtreeHeight = Math.max(NODE_HEIGHT, childrenHeightSum + (node.children.length - 1) * VERTICAL_GAP);
      return node.subtreeHeight;
    };

    computeSubtreeHeight(tree);

    const updatedNodes = [];

    const assignPositions = (node, x, yStart) => {
      const yCenter = yStart + node.subtreeHeight / 2;
      const existingNode = nodes.find((n) => n.id === node.id);

      if (existingNode) {
        updatedNodes.push({
          ...existingNode,
          position: { x, y: yCenter - NODE_HEIGHT / 2 },
        });
      }

      if (node.children && node.children.length > 0) {
        let currentY = yStart;
        node.children.forEach((child) => {
          assignPositions(child, x + HORIZONTAL_SPACING, currentY);
          currentY += child.subtreeHeight + VERTICAL_GAP;
        });
      }
    };

    assignPositions(tree, 50, 50);
    setNodes(updatedNodes);
    alert("⚡ Đã sắp xếp và căn chỉnh lại sơ đồ tự động.");
  };

  // Reconstruct JSON từ Nodes/Edges để phục vụ xuất slide PowerPoint PPTX
  const handleExportPPTX = async () => {
    try {
      const rootNode = nodes.find((n) => n.id === 'root');
      if (!rootNode) return;

      const getDetailsForCategory = (catId) => {
        const childIds = edges.filter((e) => e.source === catId).map((e) => e.target);
        return nodes
          .filter((n) => childIds.includes(n.id) && !n.data.isPlaceholder)
          .map((n) => n.data.label);
      };

      const caseTypeLabel = getDetailsForCategory('cat-caseType')[0] || '';

      // Tái cấu trúc cấu trúc dữ liệu theo schema ban đầu
      const reconstructedJson = {
        caseTitle: rootNode.data.label,
        caseType: caseTypeLabel,
        parties: getDetailsForCategory('cat-parties').map((label) => {
          const colonIdx = label.indexOf(':');
          let role = 'Đương sự';
          let name = label;
          let detail = '';

          if (colonIdx !== -1) {
            role = label.substring(0, colonIdx).trim();
            const afterColon = label.substring(colonIdx + 1).trim();
            // Kiểm tra thông tin trong ngoặc đơn
            const bracketIdx = afterColon.indexOf('(');
            if (bracketIdx !== -1) {
              name = afterColon.substring(0, bracketIdx).trim();
              detail = afterColon.substring(bracketIdx + 1, afterColon.lastIndexOf(')')).trim();
            } else {
              name = afterColon;
            }
          }
          return { name, role, detail };
        }),
        timeline: getDetailsForCategory('cat-timeline').map((label) => {
          const startBracket = label.indexOf('[');
          const endBracket = label.indexOf(']');
          let date = '';
          let event = label;

          if (startBracket !== -1 && endBracket !== -1) {
            date = label.substring(startBracket + 1, endBracket).trim();
            event = label.substring(endBracket + 1).trim();
            if (event.startsWith(':')) {
              event = event.substring(1).trim();
            }
          }
          return { date, event };
        }),
        claims: getDetailsForCategory('cat-claims').map((label) => {
          const startBracket = label.indexOf('[');
          const endBracket = label.indexOf(']');
          let party = 'Các bên';
          let content = label;

          if (startBracket !== -1 && endBracket !== -1) {
            party = label.substring(startBracket + 1, endBracket).trim();
            content = label.substring(endBracket + 1).trim();
            if (content.startsWith(':')) {
              content = content.substring(1).trim();
            }
          }
          return { party, content };
        }),
        legalIssues: getDetailsForCategory('cat-legalIssues').map((label) => {
          const colonIdx = label.indexOf(':');
          let issue = label;
          let description = '';

          if (colonIdx !== -1) {
            issue = label.substring(0, colonIdx).trim();
            description = label.substring(colonIdx + 1).trim();
          }
          return { issue, description };
        }),
        evidence: getDetailsForCategory('cat-evidence').map((label) => {
          // Phân tách "Tên chứng cứ (Nguồn) - Giá trị"
          let name;
          let source = '';
          let value = '';

          const dashIdx = label.indexOf(' - ');
          let nameSourcePart = label;
          if (dashIdx !== -1) {
            nameSourcePart = label.substring(0, dashIdx).trim();
            value = label.substring(dashIdx + 3).trim();
          }

          const startBracket = nameSourcePart.indexOf('(');
          if (startBracket !== -1) {
            name = nameSourcePart.substring(0, startBracket).trim();
            source = nameSourcePart.substring(startBracket + 1, nameSourcePart.lastIndexOf(')')).trim();
            if (source.startsWith('Nguồn:')) {
              source = source.substring(6).trim();
            }
          } else {
            name = nameSourcePart;
          }

          return { name, source, value };
        }),
        decision: getDetailsForCategory('cat-decision').map((label) => {
          const bracketIdx = label.indexOf('[');
          let point = label;
          let basis = '';

          if (bracketIdx !== -1) {
            point = label.substring(0, bracketIdx).trim();
            basis = label.substring(bracketIdx + 1, label.lastIndexOf(']')).trim();
            if (basis.startsWith('Cơ sở:')) {
              basis = basis.substring(6).trim();
            }
          }
          return { point, basis };
        }),
      };

      const safeFileName = rootNode.data.label.replace(/[^a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '').replace(/\s+/g, '_');
      await exportToPptx(reconstructedJson, `bao_cao_an_${safeFileName || 'so_do'}.pptx`);
    } catch (err) {
      alert("Lỗi khi xuất slide PPTX: " + err.message);
    }
  };

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
            <span className="material-icons text-primary text-[24px]">workspace_premium</span>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
                👑 Sơ đồ tư duy báo cáo án
                <span className="text-[9px] bg-primary text-white font-extrabold px-1 py-0.5 rounded-sm normal-case tracking-normal">PREMIUM</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[400px]">
                {nodes.find(n => n.id === 'root')?.data?.label || 'Đang phân tích vụ án...'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Template Selector dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1">
            {templates.map((tpl) => (
              <button
                key={tpl.key}
                disabled={isGenerating}
                onClick={() => {
                  setSelectedTemplate(tpl.key);
                  handleGenerateMindmap(tpl.key);
                }}
                className={`flex items-center gap-1 h-8 px-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedTemplate === tpl.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="material-icons text-[14px]">{tpl.icon}</span>
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>

          {/* Quick Layout Re-alignment */}
          <button
            onClick={handleAlignLayout}
            disabled={isGenerating || nodes.length === 0}
            className="flex items-center justify-center gap-1.5 h-10 px-3.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Tự động xếp thẳng hàng các node sau khi kéo thả"
          >
            <Layout size={14} />
            <span>Sắp xếp lại</span>
          </button>

          {/* Export Dropdown options */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
            <button
              onClick={handleExportPNG}
              disabled={isGenerating || nodes.length === 0}
              className="flex items-center gap-1 h-8 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất sơ đồ ra file ảnh PNG"
            >
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isGenerating || nodes.length === 0}
              className="flex items-center gap-1 h-8 px-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất sơ đồ ra bản vẽ PDF"
            >
              <span>PDF</span>
            </button>
            <button
              onClick={handleExportPPTX}
              disabled={isGenerating || nodes.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất cấu trúc vụ án ra slide trình chiếu PowerPoint"
            >
              <span className="material-icons text-[14px]">slideshow</span>
              <span>Xuất PPTX (Slide)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-h-0 bg-slate-950 relative">
        {/* React Flow Board Container */}
        <div ref={reactFlowWrapper} className="flex-1 h-full relative">
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
              minZoom={0.1}
              maxZoom={2.0}
            >
              <Controls className="bg-slate-800 border border-slate-700 text-white rounded-xl shadow-md [&_button]:border-slate-700 [&_button]:bg-slate-800 hover:[&_button]:bg-slate-700" />
              <Background color="#334155" gap={24} size={1} />
            </ReactFlow>
          ) : null}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center max-w-sm px-6">
                {/* Scale legal logo animation */}
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 animate-pulse scale-110">
                  <Scale size={32} className="animate-bounce" />
                </div>
                <h4 className="font-extrabold text-lg text-white mb-2 tracking-wide uppercase">AI đang phân tích vụ án</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Đang tiến hành trích xuất thực thể đương sự, thiết lập dòng thời gian, tổng hợp chứng cứ và xây dựng sơ đồ tư duy tương tác...
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
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleGenerateMindmap()}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    <span>Thử lại lần nữa</span>
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
          selectedNode ? 'translate-x-0' : 'translate-x-full absolute right-0'
        }`}>
          {selectedNode ? (
            <div className="flex-1 flex flex-col p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
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
              <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 mb-5 text-xs text-slate-400">
                <div className="flex items-center justify-between mb-1.5">
                  <span>Loại Node:</span>
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-slate-800">
                    {selectedNode.data.nodeType === 'caseRoot' ? 'Vụ Án (Gốc)' : 
                     selectedNode.data.nodeType === 'category' ? 'Danh mục' : 
                     selectedNode.data.nodeType === 'placeholder' ? 'Bổ sung' : 'Chi tiết'}
                  </span>
                </div>
                {selectedNode.data.categoryType !== 'default' && (
                  <div className="flex items-center justify-between">
                    <span>Phân nhánh:</span>
                    <span 
                      className="font-bold text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: selectedNode.data.accentColor }}
                    >
                      {selectedNode.data.categoryType}
                    </span>
                  </div>
                )}
              </div>

              {/* Text Label Area Input */}
              <div className="mb-6 flex-1 min-h-0 flex flex-col">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nội dung hiển thị:
                </label>
                {selectedNode.id === 'root' || selectedNode.id.startsWith('cat-') ? (
                  // Node Cha: Input text đơn giản
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={handleLabelChange}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4.5 py-3 text-sm text-white font-semibold outline-none transition-all"
                  />
                ) : (
                  // Node chi tiết: Cho phép gõ textarea nhiều chữ
                  <textarea
                    value={selectedNode.data.label}
                    onChange={handleLabelChange}
                    className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-4.5 text-xs leading-relaxed text-slate-300 font-medium outline-none resize-none transition-all"
                    placeholder="Nhập nội dung chi tiết..."
                  />
                )}
              </div>

              {/* Node Operations Action Bar */}
              <div className="border-t border-slate-800 pt-5 space-y-3">
                {/* Nút Thêm node con (chỉ cho node Danh mục) */}
                {selectedNode.data.nodeType === 'category' && (
                  <button
                    onClick={handleAddChildNode}
                    className="w-full flex items-center justify-center gap-2 h-11 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <PlusCircle size={14} />
                    <span>Thêm thông tin con</span>
                  </button>
                )}

                {/* Nút Xóa node (chỉ cho node Chi tiết / Placeholder) */}
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
              <p>Chọn một Node trên sơ đồ để hiệu chỉnh nội dung, thêm con hoặc xóa node.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
