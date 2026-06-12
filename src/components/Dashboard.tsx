/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LayoutDashboard, FileText, Activity, Shield, CheckCircle2, ChevronRight, AlertTriangle, ScanLine, Clock } from "lucide-react";
import { RecentActivity } from "../types";

interface DashboardProps {
  onStartOcr: () => void;
}

const RECENT_ACTIVITIES: RecentActivity[] = [
  { id: "1", fileName: "Ban_an_hinh_su_so_24_2024_HS_ST.pdf", time: "10 phút trước", format: "Bản án (PDF/A)", status: "Hoàn thành", icon: "file" },
  { id: "2", fileName: "Cao_trang_truy_to_15_CT_VKS_P1.pdf", time: "25 phút trước", format: "Cáo trạng (PDF)", status: "Hoàn thành", icon: "file" },
  { id: "3", fileName: "Don_khoi_kien_tranh_chap_hop_dong.pdf", time: "1 giờ trước", format: "Đơn khởi kiện (PDF)", status: "Hoàn thành", icon: "file" },
  { id: "4", fileName: "Quyet_dinh_thu_ly_dan_su_112_2024.pdf", time: "2 giờ trước", format: "Quyết định thụ lý (PDF)", status: "Hoàn thành", icon: "file" },
  { id: "5", fileName: "Bien_ban_nghi_an_02_dan_su_phuc_tham.pdf", time: "Hôm qua", format: "Biên bản (PDF)", status: "Lỗi", icon: "warning" },
];

export default function Dashboard({ onStartOcr }: DashboardProps) {
  return (
    <div id="dashboard-tab" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Slogan chào mừng */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Bảng tổng quan VKS OCR</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Thống kê giám sát và hiệu năng bóc tách số hóa tư pháp phục vụ Viện kiểm sát nhân dân.</p>
        </div>
        <button
          onClick={onStartOcr}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide flex items-center space-x-1.5 shadow-md border border-yellow-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-transform cursor-pointer"
        >
          <ScanLine className="h-4 w-4" />
          <span>Bóc tách tài liệu mới</span>
        </button>
      </div>

      {/* Grid thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* STAT 1: Tổng số tài liệu */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng hồ sơ tố tụng số hóa</p>
            <h3 className="text-3xl font-black text-slate-800 font-mono mt-1">1,284</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center">
              +14.2% so với tháng trước
            </p>
          </div>
          <div className="h-12 w-12 bg-red-100/60 rounded-xl flex items-center justify-center text-red-600">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* STAT 2: Độ chính xác trung bình */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Độ chính xác bóc tách</p>
            <h3 className="text-3xl font-black text-emerald-600 font-mono mt-1">99.4%</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Đánh giá từ 42,400 trang
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-100/60 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* STAT 3: Dung lượng đã nén và bảo mật */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cơ sở dữ liệu mật</p>
            <h3 className="text-3xl font-black text-slate-800 font-mono mt-1">4.2 GB</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Stateless (Nhật ký RAM an toàn)
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-100/60 rounded-xl flex items-center justify-center text-blue-600">
            <Shield className="h-6 w-6" />
          </div>
        </div>

        {/* STAT 4: Queue active */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mẫu trích xuất sẵn dùng</p>
            <h3 className="text-3xl font-black text-yellow-600 font-mono mt-1">12</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center">
              ● Serverless Edge Hoạt động
            </p>
          </div>
          <div className="h-12 w-12 bg-yellow-105/60 rounded-xl flex items-center justify-center text-yellow-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid Biểu đồ và Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Biểu đồ xu hướng số hóa (SVG Custom) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Biểu đồ công suất nhận diện theo ngày</h4>
            <p className="text-slate-400 text-xs mt-0.5">Số lượng trang bản án/cáo trạng được OCR thành công hàng ngày.</p>
          </div>
          
          <div className="h-56 w-full mt-6 relative flex flex-end items-end">
            {/* SVG Area chart */}
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* Path Area */}
              <path
                d="M 0 130 C 50 110, 80 80, 120 90 C 160 100, 200 40, 250 60 C 300 80, 350 20, 400 30 C 450 40, 500 10, 500 10 L 500 150 L 0 150 Z"
                fill="url(#chartGrad)"
              />
              {/* Path Line */}
              <path
                d="M 0 130 C 50 110, 80 80, 120 90 C 160 100, 200 40, 250 60 C 300 80, 350 20, 400 30 C 450 40, 500 10, 500 10"
                fill="none"
                stroke="#b91c1c"
                strokeWidth="2.5"
              />
            </svg>
            
            {/* Tooltip hoặc labels mốc ngày */}
            <div className="absolute top-2 right-4 bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-mono shadow-md border border-slate-700">
              Hôm nay: 384 hồ sơ (Tăng vọt)
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono mt-4 border-t border-slate-100 pt-4">
            <span>Thứ 2</span>
            <span>Thứ 3</span>
            <span>Thứ 4</span>
            <span>Thứ 5</span>
            <span>Thứ 6</span>
            <span>Thứ 7</span>
            <span>Chủ Nhật</span>
          </div>
        </div>

        {/* Phân bổ loại tệp (Biểu đồ tròn SVG) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Phân bổ cấu trúc tài liệu đầu vào</h4>
            <p className="text-slate-400 text-xs mt-0.5">Tỷ lệ định dạng tệp quét được tiếp nhận bóc tách.</p>
          </div>

          <div className="my-6 flex items-center justify-center">
            {/* SVG Donut Chart */}
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Circle */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                {/* Slice 1: PDF (75%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#b91c1c" strokeWidth="3" strokeDasharray="75 25" strokeDashoffset="0" />
                {/* Slice 2: JPEG/PNG (20%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#eab308" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-75" />
                {/* Slice 3: DOCX/Orther (5%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#475569" strokeWidth="3" strokeDasharray="5 95" strokeDashoffset="-95" />
              </svg>
              <div className="absolute text-center">
                <p className="text-lg font-black text-slate-800 font-mono leading-none">75%</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Bản án/Cáo trạng</p>
              </div>
            </div>
          </div>

          {/* Chú giải thông tin */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" />
                <span>Bản án hình sự, dân sự</span>
              </span>
              <span className="font-bold text-slate-700 font-mono">75%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />
                <span>Hình ảnh cáo trạng</span>
              </span>
              <span className="font-bold text-slate-700 font-mono">20%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-slate-600 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600 inline-block" />
                <span>Khác (Đơn thụ lý, DOCX...)</span>
              </span>
              <span className="font-bold text-slate-700 font-mono">5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nhật ký hoạt động gần đây của cán bộ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Danh sách hoạt động số hóa nghiệp vụ mới nhất</h4>
            <p className="text-slate-400 text-xs mt-0.5">Lịch sử bóc tách, chỉnh sửa và kết xuất tệp của Kiểm sát viên.</p>
          </div>
          <span className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer flex items-center space-x-1">
            <span>Xem toàn bộ nhật ký</span>
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {RECENT_ACTIVITIES.map((activity) => (
            <div key={activity.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activity.status === "Lỗi" 
                    ? "bg-rose-50 text-rose-500 border border-rose-100" 
                    : "bg-slate-50 text-slate-600 border border-slate-150"
                }`}>
                  {activity.status === "Lỗi" ? (
                    <AlertTriangle className="h-4.5 w-4.5" />
                  ) : (
                    <Clock className="h-4.5 w-4.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{activity.fileName}</h5>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Định dạng: <span className="text-slate-600">{activity.format}</span> • {activity.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activity.status === "Hoàn thành" 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                    : activity.status === "Đang xử lý" 
                    ? "bg-yellow-50 text-yellow-600 border border-yellow-200" 
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                }`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
