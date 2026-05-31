import PptxGenJS from 'pptxgenjs';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Xuất sơ đồ tư duy ra file ảnh PNG
 */
export const exportToPng = async (reactFlowElement, fileName = 'sodo_mindmap.png') => {
  if (!reactFlowElement) {
    throw new Error("Không tìm thấy canvas sơ đồ tư duy.");
  }

  try {
    const dataUrl = await toPng(reactFlowElement, {
      backgroundColor: '#F8FAFC',
      style: {
        transform: 'translate(0px, 0px) scale(1)',
      },
      // Loại bỏ thanh điều khiển zoom và các thanh công cụ khỏi ảnh chụp
      filter: (node) => {
        if (node.classList) {
          const exclusions = [
            'react-flow__controls', 
            'react-flow__panel', 
            'mindmap-toolbar',
            'react-flow__attribution'
          ];
          return !exclusions.some(cls => node.classList.contains(cls));
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Lỗi khi xuất ảnh PNG:", error);
    throw error;
  }
};

/**
 * Xuất sơ đồ tư duy ra file văn bản PDF
 */
export const exportToPdf = async (reactFlowElement, fileName = 'sodo_mindmap.pdf') => {
  if (!reactFlowElement) {
    throw new Error("Không tìm thấy canvas sơ đồ tư duy.");
  }

  try {
    const dataUrl = await toPng(reactFlowElement, {
      backgroundColor: '#F8FAFC',
      style: {
        transform: 'translate(0px, 0px) scale(1)',
      },
      filter: (node) => {
        if (node.classList) {
          const exclusions = [
            'react-flow__controls', 
            'react-flow__panel', 
            'mindmap-toolbar',
            'react-flow__attribution'
          ];
          return !exclusions.some(cls => node.classList.contains(cls));
        }
        return true;
      }
    });

    // Tạo PDF khổ ngang A4 (Landscape)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: 'a4'
    });

    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          const imgWidth = img.width;
          const imgHeight = img.height;

          // Giữ tỷ lệ khung hình khớp với kích thước PDF
          const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
          const width = imgWidth * ratio;
          const height = imgHeight * ratio;

          // Căn giữa ảnh trong trang PDF
          const x = (pdfWidth - width) / 2;
          const y = (pdfHeight - height) / 2;

          pdf.addImage(dataUrl, 'PNG', x, y, width, height);
          pdf.save(fileName);
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (err) => reject(err);
    });
  } catch (error) {
    console.error("Lỗi khi xuất PDF:", error);
    throw error;
  }
};

export const exportToPptx = async (jsonData, fileName = 'baocao_an_slides.pptx') => {
  if (!jsonData) {
    throw new Error("Không có dữ liệu vụ án để xuất slide.");
  }

  try {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    // Bảng màu thiết kế nghiệp vụ
    const primaryColor = '163A70';   // Navy đậm
    const secondaryColor = '2F5FA7'; // Blue
    const accentColor = 'C62828';    // Red
    const textColor = '1F2937';      // Xám tối
    const white = 'FFFFFF';

    // Helper: Thêm tiêu đề slide chuẩn VKS
    const addSlideHeader = (slide, titleText) => {
      slide.addText(titleText.toUpperCase(), {
        x: 0.6,
        y: 0.3,
        w: 9.0,
        h: 0.5,
        fontSize: 18,
        bold: true,
        color: primaryColor,
        fontFace: 'Arial'
      });

      slide.addShape(pres.ShapeType.rect, {
        x: 0.6,
        y: 0.8,
        w: 12.1,
        h: 0.03,
        fill: { color: secondaryColor }
      });
    };

    // ==========================================
    // SLIDE 1: SƠ ĐỒ TỔNG THỂ VỤ ÁN
    // ==========================================
    const slide1 = pres.addSlide();
    slide1.background = { color: 'F8FAFC' };

    // Header Slide 1
    addSlideHeader(slide1, jsonData.caseTitle || 'Sơ đồ tổng thể vụ án');

    const branches = jsonData.branches || [];

    // Vẽ các L1 branches dạng thẻ lưới (Grid cards)
    // Tối đa 6 cards trên slide (2 hàng x 3 cột) để giữ slide sạch đẹp
    const maxCards = 6;
    const cardsToDraw = branches.slice(0, maxCards);

    const cols = 3;
    const cardW = 3.8;
    const cardH = 1.9;
    const startX = 0.6;
    const startY = 1.1;
    const gapX = 0.35;
    const gapY = 0.3;

    cardsToDraw.forEach((branch, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const branchColor = (branch.color || '#163A70').replace('#', '');

      // Vẽ hình nền trắng của thẻ
      slide1.addShape(pres.ShapeType.roundRect, {
        x, y, w: cardW, h: cardH,
        fill: { color: white },
        line: { color: 'E2E8F0', width: 1 }
      });

      // Vẽ thanh màu bên trái biểu diễn nhóm
      slide1.addShape(pres.ShapeType.rect, {
        x, y, w: 0.1, h: cardH,
        fill: { color: branchColor }
      });

      // Tên nhánh L1
      slide1.addText(branch.label || 'Danh mục', {
        x: x + 0.2,
        y: y + 0.15,
        w: cardW - 0.3,
        h: 0.35,
        fontSize: 12,
        bold: true,
        color: branchColor,
        fontFace: 'Arial'
      });

      // Trích xuất 2 con L2 đại diện hiển thị tóm tắt trong thẻ
      let summaryText;
      if (branch.subBranches && branch.subBranches.length > 0) {
        summaryText = branch.subBranches
          .slice(0, 2)
          .map(sb => `• ${sb.label}`)
          .join('\n');
      } else if (branch.note) {
        summaryText = `Ghi chú: ${branch.note}`;
      } else {
        summaryText = "• Chưa có dữ liệu chi tiết";
      }

      slide1.addText(summaryText, {
        x: x + 0.2,
        y: y + 0.5,
        w: cardW - 0.3,
        h: cardH - 0.6,
        fontSize: 10,
        color: textColor,
        fontFace: 'Arial',
        valign: 'top'
      });
    });

    // ==========================================
    // SLIDE 2: TIMELINE / DIỄN BIẾN HÀNH VI
    // ==========================================
    const slide2 = pres.addSlide();
    addSlideHeader(slide2, 'Dòng thời gian & Diễn biến hành vi');

    // Tìm nhánh liên quan đến diễn biến hành vi/thời gian
    const timelineBranch = branches.find(b => 
      /thời gian|diễn biến|hành vi|tiến trình|sự việc/i.test(b.label || '')
    );

    let timelineItems = [];
    if (timelineBranch && timelineBranch.subBranches) {
      timelineBranch.subBranches.forEach(sb => {
        timelineItems.push({ time: sb.label, desc: sb.note || sb.evidence || '' });
        if (sb.subBranches) {
          sb.subBranches.forEach(sub3 => {
            timelineItems.push({ time: '', desc: `${sub3.label}${sub3.note ? ` (${sub3.note})` : ''}` });
          });
        }
      });
    }

    // Fallback: nếu không tìm thấy nhánh chuyên dụng, lấy diễn biến từ L2 các nhánh khác
    if (timelineItems.length === 0) {
      branches.forEach(b => {
        if (b.subBranches) {
          b.subBranches.slice(0, 2).forEach(sb => {
            timelineItems.push({ time: b.label, desc: sb.label });
          });
        }
      });
    }

    if (timelineItems.length > 0) {
      let currentY = 1.1;
      timelineItems.slice(0, 6).forEach((item) => {
        // Cột mốc
        slide2.addText(item.time ? `• ${item.time}` : '  └─', {
          x: 0.8,
          y: currentY,
          w: 2.8,
          h: 0.5,
          fontSize: 12,
          bold: !!item.time,
          color: item.time ? secondaryColor : '64748B',
          fontFace: 'Arial'
        });

        // Diễn biến chi tiết
        slide2.addText(item.desc || 'Mô tả chi tiết sự việc', {
          x: 3.7,
          y: currentY,
          w: 9.0,
          h: 0.5,
          fontSize: 11,
          color: textColor,
          fontFace: 'Arial'
        });

        currentY += 0.65;
      });
    } else {
      slide2.addText('⚠️ Cần bổ sung diễn biến quá trình sự việc.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 13,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // ==========================================
    // SLIDE 3: CHỨNG CỨ BUỘC TỘI - GỠ TỘI
    // ==========================================
    const slide3 = pres.addSlide();
    addSlideHeader(slide3, 'Đánh giá Chứng cứ Buộc tội - Gỡ tội');

    // Tìm nhánh buộc tội & gỡ tội
    const buocToiBranch = branches.find(b => /buộc tội|cáo trạng|phạm tội|tang vật/i.test(b.label || ''));
    const goToiBranch = branches.find(b => /gỡ tội|bào chữa|giảm nhẹ|ngoại phạm/i.test(b.label || ''));

    let buocToiList = [];
    if (buocToiBranch && buocToiBranch.subBranches) {
      buocToiList = buocToiBranch.subBranches.map(sb => {
        let text = sb.label;
        if (sb.evidence) text += ` (Chứng cứ: ${sb.evidence})`;
        return text;
      });
    }

    let goToiList = [];
    if (goToiBranch && goToiBranch.subBranches) {
      goToiList = goToiBranch.subBranches.map(sb => {
        let text = sb.label;
        if (sb.evidence) text += ` (Chứng cứ: ${sb.evidence})`;
        return text;
      });
    }

    // Fallback: nếu rỗng, lấy từ nhánh chứng cứ chung và phân tách tự động
    if (buocToiList.length === 0 && goToiList.length === 0) {
      const evidenceBranch = branches.find(b => /chứng cứ|tài liệu/i.test(b.label || ''));
      if (evidenceBranch && evidenceBranch.subBranches) {
        evidenceBranch.subBranches.forEach((sb, idx) => {
          if (idx % 2 === 0) {
            buocToiList.push(sb.label);
          } else {
            goToiList.push(sb.label);
          }
        });
      }
    }

    // Cột bên trái: Buộc tội
    slide3.addText('CHỨNG CỨ BUỘC TỘI (CÔNG TỐ)', {
      x: 0.6,
      y: 1.1,
      w: 5.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: accentColor,
      fontFace: 'Arial'
    });

    slide3.addShape(pres.ShapeType.rect, {
      x: 0.6, y: 1.45, w: 5.8, h: 0.02,
      fill: { color: accentColor }
    });

    if (buocToiList.length > 0) {
      let bY = 1.6;
      buocToiList.slice(0, 5).forEach((text) => {
        slide3.addText(`• ${text}`, {
          x: 0.6, y: bY, w: 5.8, h: 0.65,
          fontSize: 10.5, color: textColor, fontFace: 'Arial',
          valign: 'top'
        });
        bY += 0.7;
      });
    } else {
      slide3.addText('Chưa có thông tin chứng cứ buộc tội.', { x: 0.6, y: 1.6, w: 5.8, fontSize: 11, italic: true, color: '64748B' });
    }

    // Cột bên phải: Gỡ tội
    slide3.addText('CHỨNG CỨ GỠ TỘI / GIẢM NHẸ', {
      x: 6.9,
      y: 1.1,
      w: 5.8,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: '1E8E5A', // Xanh lục
      fontFace: 'Arial'
    });

    slide3.addShape(pres.ShapeType.rect, {
      x: 6.9, y: 1.45, w: 5.8, h: 0.02,
      fill: { color: '1E8E5A' }
    });

    if (goToiList.length > 0) {
      let gY = 1.6;
      goToiList.slice(0, 5).forEach((text) => {
        slide3.addText(`• ${text}`, {
          x: 6.9, y: gY, w: 5.8, h: 0.65,
          fontSize: 10.5, color: textColor, fontFace: 'Arial',
          valign: 'top'
        });
        gY += 0.7;
      });
    } else {
      slide3.addText('Chưa có thông tin chứng cứ gỡ tội.', { x: 6.9, y: 1.6, w: 5.8, fontSize: 11, italic: true, color: '64748B' });
    }

    // ==========================================
    // SLIDE 4: VẤN ĐỀ CẦN LÀM RÕ / ĐỀ XUẤT
    // ==========================================
    const slide4 = pres.addSlide();
    addSlideHeader(slide4, 'Vấn đề cần làm rõ & Đề xuất nghiệp vụ');

    // Tập hợp tất cả các câu hỏi ghi nhận trong JSON
    let allQuestions = [];
    branches.forEach(b => {
      if (b.questions && b.questions.length > 0) {
        allQuestions.push(...b.questions);
      }
    });

    // Lấy thêm từ nhánh Yêu cầu điều tra bổ sung
    const reqBranch = branches.find(b => /yêu cầu|điều tra|bổ sung|cần làm rõ|đề xuất/i.test(b.label || ''));
    let proposalsList = [];
    if (reqBranch && reqBranch.subBranches) {
      proposalsList = reqBranch.subBranches.map(sb => sb.label);
    }

    if (allQuestions.length === 0 && proposalsList.length === 0) {
      // Fallback: nếu rỗng, lấy từ nhánh quyết định phán quyết
      const decisionBranch = branches.find(b => /quyết định|giải quyết|phán quyết/i.test(b.label || ''));
      if (decisionBranch && decisionBranch.subBranches) {
        proposalsList = decisionBranch.subBranches.map(sb => sb.label);
      }
    }

    // Hiển thị danh sách câu hỏi cần làm rõ
    slide4.addText('CÂU HỎI NGHIỆP VỤ CẦN LÀM RÕ:', {
      x: 0.6, y: 1.1, w: 5.8, h: 0.4,
      fontSize: 12, bold: true, color: accentColor, fontFace: 'Arial'
    });

    if (allQuestions.length > 0) {
      let qY = 1.5;
      allQuestions.slice(0, 5).forEach((q) => {
        slide4.addText(`❓ ${q}`, {
          x: 0.6, y: qY, w: 5.8, h: 0.6,
          fontSize: 11, color: textColor, fontFace: 'Arial',
          valign: 'top'
        });
        qY += 0.65;
      });
    } else {
      slide4.addText('Không phát hiện câu hỏi cần làm rõ thêm.', { x: 0.6, y: 1.5, w: 5.8, fontSize: 11, italic: true, color: '64748B' });
    }

    // Hiển thị đề xuất hướng giải quyết/yêu cầu điều tra
    slide4.addText('ĐỀ XUẤT HƯỚNG XỬ LÝ / YÊU CẦU ĐIỀU TRA:', {
      x: 6.9, y: 1.1, w: 5.8, h: 0.4,
      fontSize: 12, bold: true, color: primaryColor, fontFace: 'Arial'
    });

    if (proposalsList.length > 0) {
      let pY = 1.5;
      proposalsList.slice(0, 5).forEach((p) => {
        slide4.addText(`✔ ${p}`, {
          x: 6.9, y: pY, w: 5.8, h: 0.6,
          fontSize: 11, color: textColor, fontFace: 'Arial',
          valign: 'top'
        });
        pY += 0.65;
      });
    } else {
      slide4.addText('Không phát hiện đề xuất hoặc yêu cầu nghiệp vụ bổ sung.', { x: 6.9, y: 1.5, w: 5.8, fontSize: 11, italic: true, color: '64748B' });
    }

    // Lưu PowerPoint
    await pres.writeFile({ fileName: fileName });
  } catch (error) {
    console.error("Lỗi khi xuất slide PPTX:", error);
    throw error;
  }
};
