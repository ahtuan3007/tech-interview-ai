# Bàn giao Questions CRUD

Nhánh: `feat/questions-crud`. Tiếp tục trên các thay đổi đang có; chưa stage, commit hoặc push. Không chạy Supabase CLI, migration hay chỉnh Dashboard.

## Phạm vi đã triển khai

- Types theo schema sau cùng: `ADMIN | INTERVIEWEE`, `is_demo_account`, không ghi các cột `weight`, `tech_stack`, `bio`, `is_demo_user`.
- Kết nối Supabase dùng cookie-aware client/server; `utils/supabase.ts` cũ không còn tồn tại. Next.js 16 dùng `proxy.ts`; cookie làm mới được giữ cả khi redirect.
- Navbar chung: tên người dùng, role badge, RLS badge, liên kết đề thi/hồ sơ và đăng xuất.
- Login có hai nút demo; thông tin đăng nhập chỉ được đọc ở server. Hồ sơ chỉ sửa tên/cấp độ mục tiêu, không sửa quyền.
- Danh sách đề thi có thống kê, tìm kiếm, lọc, Big-O, số Public/Hidden; nút quản trị chỉ render với ADMIN.
- Trang chi tiết render Markdown, starter code, hints. Server lọc Hidden trước khi truyền props xuống ứng viên/khách.
- Form tạo/sửa hai cột: route guard, Markdown preview, gợi ý Big-O, test case thêm/xóa/đổi thứ tự, explanation/Hidden toggle, JSONB preview, ba ngôn ngữ starter code và hints.
- Server Actions kiểm tra ADMIN, validate dữ liệu lồng nhau và chỉ ghi các trường thuộc schema. Giữ nguyên khoảng trắng input/output.
- AI helper chỉ cho ADMIN, có fallback 2 Public + 3 Hidden; chặn lưu output TODO chưa xác nhận.
- Hỗ trợ cả `/questions/edit/[id]` và `/questions/[id]/edit`.
- Tailwind chuyển sang PostCSS theo tài liệu Next.js cài trong dự án để xử lý panic của custom CSS loader khi production build trên Windows; vẫn dùng Turbopack.

## File tạo/chỉnh sửa trong working tree

```text
README.md
app/layout.tsx
app/components/navbar.tsx
app/components/markdown.tsx
app/login/page.tsx
app/page.tsx
app/profile/page.tsx
app/profile/actions.ts
app/profile/profile-form.tsx
app/questions/page.tsx
app/questions/questions-list-client.tsx
app/questions/[id]/page.tsx
app/questions/[id]/question-detail-client.tsx
app/questions/[id]/edit/page.tsx
app/questions/create/page.tsx
app/questions/edit/[id]/page.tsx
app/questions/question-form-client.tsx
app/questions/actions.ts
app/api/ai/generate-test-cases/route.ts
types/database.ts
utils/supabase/proxy.ts
next.config.ts
postcss.config.mjs
package.json
package-lock.json
tests/questions.test.mjs
docs/questions-crud-review.md
```

## Kiểm tra và giới hạn

- TypeScript, ESLint và 6 bài kiểm thử server boundary đã qua. Các test mock Supabase/LLM, không ghi dữ liệu cloud.
- Dev HTTP: danh sách và login trả 200; khách bị chuyển khỏi trang tạo/sửa; profile chuyển về login; AI API trả 401 cho khách. Truy vấn đọc bảng questions trên cloud đã thành công.
- Chưa kiểm thử đăng nhập/CRUD thật với ADMIN và INTERVIEWEE: thiếu bốn biến môi trường demo trong `.env.local`. Tên biến và cách cấu hình có trong `.env.example` và README. Không tự tạo hoặc đoán mật khẩu.
- Chưa có `OPENAI_API_KEY`, nên chưa kiểm thử gọi LLM thật; fallback đã được kiểm thử.
- Việc giữ kín Hidden trong props không thay thế việc bảo vệ trực tiếp JSONB qua Supabase REST. Các policy cloud hiện có không được thay đổi hoặc xác nhận bằng tài khoản ứng viên trong lần này.
- CLI và npm audit cảnh báo phiên bản Next.js hiện tại có lỗ hổng bảo mật; chưa nâng phiên bản ngoài phạm vi yêu cầu.

Mở `/login` và `/questions` để duyệt giao diện trước khi thực hiện Git SOP.
