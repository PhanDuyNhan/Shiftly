"use client";
import { useEffect,useState } from "react";
import { api } from "./lib/api";

type Me={id:string;email:string|null;phone:string|null;system_role:string;must_change_password:boolean;memberships:{store_id:string;store_name:string;role_in_store:string}[]};
const cards=[
  {href:"/schedule",icon:"▦",title:"Lịch làm việc",description:"Xem các ca đã công bố và khai báo trong tuần."},
  {href:"/leave",icon:"◷",title:"Nghỉ phép",description:"Gửi đơn, theo dõi quyết định và xem lịch sử."},
  {href:"/availability",icon:"◫",title:"Giờ khả dụng",description:"Cập nhật thời gian bận và nguyện vọng ca."},
  {href:"/profile",icon:"◉",title:"Hồ sơ cá nhân",description:"Giữ thông tin liên hệ và hồ sơ của bạn luôn chính xác."},
];
export default function Home(){
  const [me,setMe]=useState<Me|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{api<Me>("/api/me").then(setMe).catch(()=>setMe(null)).finally(()=>setLoading(false));},[]);
  if(loading)return <main><div className="empty-state"><strong>Đang tải không gian làm việc…</strong></div></main>;
  if(!me)return <main><section className="hero"><p className="eyebrow">Chào mừng đến Shiftly</p><h1>Mọi ca làm, trong một nơi.</h1><p>Đăng nhập để xem lịch, gửi đơn nghỉ và cập nhật thời gian làm việc của bạn.</p><a className="button-link" href="/login">Đăng nhập để bắt đầu →</a></section></main>;
  if(me.must_change_password)return <main><section className="hero"><p className="eyebrow">Bảo vệ tài khoản</p><h1>Đổi mật khẩu để bắt đầu</h1><p>Mật khẩu tạm chỉ dùng cho lần đăng nhập đầu tiên.</p><a className="button-link" href="/change-password">Đổi mật khẩu →</a></section></main>;
  const managers=me.memberships.filter((item)=>item.role_in_store==="manager");
  return <main>
    <section className="hero"><p className="eyebrow">Không gian làm việc</p><h1>Chào mừng trở lại.</h1><p>Chọn việc cần làm hôm nay. Lịch làm việc và đơn nghỉ của bạn luôn sẵn ở đây.</p><div className="row"><a className="button-link" href="/schedule">Xem lịch của tôi →</a><a className="button-link secondary" href="/leave/new">Gửi đơn nghỉ</a></div></section>
    <div className="section-heading"><h2>Dành cho bạn</h2><span className="muted">{me.email??me.phone??me.id}</span></div>
    <div className="grid">{cards.map((card)=><a className="feature-card" key={card.href} href={card.href}><span className="feature-icon" aria-hidden="true">{card.icon}</span><h3>{card.title}</h3><p>{card.description}</p><span className="feature-link">Mở trang →</span></a>)}</div>
    {(managers.length>0||me.system_role==="admin")&&<><div className="section-heading"><h2>Quản lý</h2></div><div className="grid">{managers.map((item)=><a className="feature-card" key={item.store_id} href={`/stores/${item.store_id}`}><span className="feature-icon" aria-hidden="true">⌂</span><h3>{item.store_name}</h3><p>Nhân viên, nhu cầu và lịch ca của cửa hàng.</p><span className="feature-link">Quản lý cửa hàng →</span></a>)}{me.system_role==="admin"&&<a className="feature-card" href="/admin"><span className="feature-icon" aria-hidden="true">⚙</span><h3>Quản trị hệ thống</h3><p>Cửa hàng, vị trí, quyền quản lý và loại nghỉ.</p><span className="feature-link">Mở quản trị →</span></a>}</div></>}
    <div className="section-heading"><h2>Tài khoản</h2></div><button className="secondary" onClick={async()=>{await api("/api/auth/logout","POST");location.href="/login";}}>Đăng xuất</button>
  </main>;
}
