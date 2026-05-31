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

/**
 * Xuất cấu trúc thông tin vụ án ra slide PowerPoint (.pptx) để báo cáo/trình chiếu
 */
export const exportToPptx = async (jsonData, fileName = 'baocao_an_slides.pptx') => {
  if (!jsonData) {
    throw new Error("Không có dữ liệu vụ án để xuất slide.");
  }

  try {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    // Định nghĩa bảng màu thiết kế
    const primaryColor = '163A70';   // Navy đậm uy nghiêm
    const secondaryColor = '2F5FA7'; // Blue chuyên nghiệp
    const accentColor = 'C62828';    // Red pháp lý
    const textColor = '1F2937';      // Xám đậm dễ đọc
    const white = 'FFFFFF';

    // Hàm tiện ích: Thêm tiêu đề trang slide chuẩn nghiệp vụ
    const addSlideHeader = (slide, titleText) => {
      // Tiêu đề
      slide.addText(titleText.toUpperCase(), {
        x: 0.6,
        y: 0.4,
        w: 9.0,
        h: 0.6,
        fontSize: 20,
        bold: true,
        color: primaryColor,
        fontFace: 'Arial'
      });

      // Đường kẻ trang trí ngăn cách
      slide.addShape(pres.ShapeType.rect, {
        x: 0.6,
        y: 1.0,
        w: 12.1,
        h: 0.03,
        fill: { color: secondaryColor }
      });
    };

    // SLIDE 1: Trang bìa báo cáo án
    const slide1 = pres.addSlide();
    slide1.background = { color: primaryColor };

    // Tên vụ án
    slide1.addText(jsonData.caseTitle || 'BÁO CÁO SƠ ĐỒ TƯ DUY VỤ ÁN', {
      x: 0.8,
      y: 1.8,
      w: 11.7,
      h: 1.6,
      fontSize: 32,
      bold: true,
      color: white,
      align: 'center',
      fontFace: 'Arial'
    });

    // Phân loại và xuất xứ
    slide1.addText(`LOẠI VỤ ÁN: ${jsonData.caseType ? jsonData.caseType.toUpperCase() : 'CHƯA XÁC ĐỊNH'}\nBáo cáo trực quan phục vụ công tác nghiệp vụ xét xử`, {
      x: 0.8,
      y: 3.8,
      w: 11.7,
      h: 1.0,
      fontSize: 14,
      color: '94A3B8', // slate-400
      align: 'center',
      fontFace: 'Arial'
    });

    // SLIDE 2: Đương sự & Thành phần tham gia
    const slide2 = pres.addSlide();
    addSlideHeader(slide2, 'Đương sự & Thành phần tham gia');

    if (jsonData.parties && jsonData.parties.length > 0) {
      const rows = jsonData.parties.map(p => [
        { text: p.role || 'Đương sự', options: { bold: true, color: primaryColor } },
        { text: p.name || 'Không rõ', options: { bold: true } },
        { text: p.detail || 'Không có thông tin bổ sung' }
      ]);

      slide2.addTable([
        [
          { text: 'Vai trò tố tụng', options: { fill: primaryColor, color: white, bold: true } },
          { text: 'Họ và tên', options: { fill: primaryColor, color: white, bold: true } },
          { text: 'Nhân thân / Chi tiết liên quan', options: { fill: primaryColor, color: white, bold: true } }
        ],
        ...rows
      ], {
        x: 0.6,
        y: 1.3,
        w: 12.1,
        rowH: 0.45,
        border: { pt: 1, color: 'E2E8F0' },
        fontSize: 11,
        fontFace: 'Arial',
        valign: 'middle'
      });
    } else {
      slide2.addText('⚠️ Cần bổ sung thông tin các bên đương sự tham gia tố tụng.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // SLIDE 3: Tiến trình & Dòng thời gian sự việc
    const slide3 = pres.addSlide();
    addSlideHeader(slide3, 'Dòng thời gian & Diễn biến sự việc');

    if (jsonData.timeline && jsonData.timeline.length > 0) {
      let currentY = 1.3;
      jsonData.timeline.slice(0, 6).forEach((t) => {
        // Vẽ cột mốc thời gian nổi bật
        slide3.addText(`• [${t.date || 'Thời gian'}]`, {
          x: 0.6,
          y: currentY,
          w: 2.5,
          h: 0.5,
          fontSize: 12,
          bold: true,
          color: secondaryColor,
          fontFace: 'Arial'
        });

        // Vẽ nội dung sự kiện
        slide3.addText(t.event || 'Mô tả sự kiện', {
          x: 3.1,
          y: currentY,
          w: 9.6,
          h: 0.5,
          fontSize: 11,
          color: textColor,
          fontFace: 'Arial'
        });

        currentY += 0.65;
      });
    } else {
      slide3.addText('⚠️ Cần bổ sung diễn biến quá trình sự việc.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // SLIDE 4: Yêu cầu & Quan điểm tranh chấp
    const slide4 = pres.addSlide();
    addSlideHeader(slide4, 'Yêu cầu & Quan điểm của các bên');

    if (jsonData.claims && jsonData.claims.length > 0) {
      let currentY = 1.3;
      jsonData.claims.slice(0, 5).forEach((c) => {
        slide4.addText(`- ${c.party || 'Chủ thể'}:`, {
          x: 0.6,
          y: currentY,
          w: 3.0,
          h: 0.6,
          fontSize: 12,
          bold: true,
          color: primaryColor,
          fontFace: 'Arial'
        });

        slide4.addText(c.content || 'Nội dung quan điểm', {
          x: 3.6,
          y: currentY,
          w: 9.1,
          h: 0.6,
          fontSize: 11,
          color: textColor,
          fontFace: 'Arial'
        });

        currentY += 0.75;
      });
    } else {
      slide4.addText('⚠️ Cần bổ sung yêu cầu tố cáo/khởi kiện và lập luận của các bên.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // SLIDE 5: Vấn đề pháp lý mấu chốt
    const slide5 = pres.addSlide();
    addSlideHeader(slide5, 'Các vấn đề pháp lý mấu chốt');

    if (jsonData.legalIssues && jsonData.legalIssues.length > 0) {
      let currentY = 1.3;
      jsonData.legalIssues.slice(0, 4).forEach((issueObj, i) => {
        slide5.addText(`Vấn đề ${i + 1}: ${issueObj.issue || 'Nội dung tranh chấp'}`, {
          x: 0.6,
          y: currentY,
          w: 12.1,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: primaryColor,
          fontFace: 'Arial'
        });
        currentY += 0.35;

        if (issueObj.description) {
          slide5.addText(`Lập luận nghiên cứu: ${issueObj.description}`, {
            x: 0.8,
            y: currentY,
            w: 11.9,
            h: 0.4,
            fontSize: 11.5,
            italic: true,
            color: textColor,
            fontFace: 'Arial'
          });
          currentY += 0.55;
        } else {
          currentY += 0.15;
        }
      });
    } else {
      slide5.addText('⚠️ Cần bổ sung các vấn đề pháp lý cần tranh biện tại tòa.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // SLIDE 6: Chứng cứ & Tài liệu hồ sơ
    const slide6 = pres.addSlide();
    addSlideHeader(slide6, 'Hệ thống chứng cứ & Tài liệu vụ án');

    if (jsonData.evidence && jsonData.evidence.length > 0) {
      const rows = jsonData.evidence.slice(0, 6).map(e => [
        { text: e.name || 'Chứng cứ', options: { bold: true } },
        { text: e.source || '-' },
        { text: e.value || '-', options: { color: secondaryColor, italic: true } }
      ]);

      slide6.addTable([
        [
          { text: 'Tài liệu / Vật chứng', options: { fill: primaryColor, color: white, bold: true } },
          { text: 'Nguồn cung cấp / Thu thập', options: { fill: primaryColor, color: white, bold: true } },
          { text: 'Giá trị chứng minh tố tụng', options: { fill: primaryColor, color: white, bold: true } }
        ],
        ...rows
      ], {
        x: 0.6,
        y: 1.3,
        w: 12.1,
        rowH: 0.45,
        border: { pt: 1, color: 'E2E8F0' },
        fontSize: 10.5,
        fontFace: 'Arial',
        valign: 'middle'
      });
    } else {
      slide6.addText('⚠️ Cần bổ sung danh mục chứng cứ hồ sơ vụ án.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // SLIDE 7: Hướng giải quyết & Căn cứ áp dụng
    const slide7 = pres.addSlide();
    addSlideHeader(slide7, 'Quyết định tuyên án & Đề xuất giải quyết');

    if (jsonData.decision && jsonData.decision.length > 0) {
      let currentY = 1.3;
      jsonData.decision.slice(0, 5).forEach((d) => {
        slide7.addText(`✔ ${d.point || 'Mô tả phán quyết'}`, {
          x: 0.6,
          y: currentY,
          w: 12.1,
          h: 0.5,
          fontSize: 12,
          bold: true,
          color: primaryColor,
          fontFace: 'Arial'
        });
        currentY += 0.45;

        if (d.basis) {
          slide7.addText(`Căn cứ pháp lý: ${d.basis}`, {
            x: 0.9,
            y: currentY,
            w: 11.8,
            h: 0.35,
            fontSize: 11,
            italic: true,
            color: '1E8E5A', // Xanh lục success
            fontFace: 'Arial'
          });
          currentY += 0.55;
        } else {
          currentY += 0.15;
        }
      });
    } else {
      slide7.addText('⚠️ Cần bổ sung phần đề xuất áp dụng pháp luật và hướng phán quyết.', {
        x: 0.6,
        y: 1.5,
        w: 12.1,
        fontSize: 14,
        color: accentColor,
        italic: true,
        fontFace: 'Arial'
      });
    }

    // Lưu file trình chiếu PowerPoint
    await pres.writeFile({ fileName: fileName });
  } catch (error) {
    console.error("Lỗi khi xuất slide PPTX:", error);
    throw error;
  }
};
