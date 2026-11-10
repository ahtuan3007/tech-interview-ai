# Giai đoạn 4 — Lịch phỏng vấn và phòng chờ

Nhánh: `feat/interview-scheduling`. Phạm vi gồm bước 4.1–4.3; Monaco, Realtime, sandbox, AI chấm điểm và dashboard thuộc các nhánh giai đoạn 5–7 tiếp theo.

## Luồng ứng dụng

1. Đăng nhập, mở **Phỏng vấn → Đặt lịch mới** hoặc **Đặt lịch** từ một đề bài.
2. Chọn đề bài từ dữ liệu thật. Với AI, có thể bắt đầu ngay hoặc đặt giờ. Với hai người, nhập UUID hồ sơ của người phỏng vấn khác mình và chọn giờ tương lai.
3. Server dùng chính user đang đăng nhập làm `interviewee_id`, tạo trạng thái `SCHEDULED`, nhận UUID từ database và chuyển đến `/room/[id]/lobby`.
4. Phòng chờ chỉ cho hai thành viên đã chỉ định hoặc ADMIN truy cập. Các trạng thái micro/camera được ghi rõ là mô phỏng. Sao chép liên kết không cấp thêm quyền truy cập.
5. Đúng giờ, nút vào phòng cập nhật có điều kiện `SCHEDULED → LIVE` và mở `/room/[id]`. Phiên AI không cần người thứ hai. Người đến sau vào lại một phiên LIVE mà không cập nhật lặp.

Giờ nhập và hiển thị là Việt Nam (UTC+7); server lưu ISO UTC. Có thể đặt lịch tối đa 366 ngày. Mã hồ sơ của mỗi người hiển thị tại trang đặt lịch để trao đổi riêng khi ghép cặp. Không mở danh sách profiles của toàn hệ thống.

## Database đang thiếu điều kiện triển khai

Kiểm tra chỉ đọc trong phiên triển khai xác nhận:

- `interview_sessions` tồn tại; các cột `id`, `interviewer_id`, `interviewee_id`, `status`, `scheduled_at`, `created_at` truy vấn được.
- Thiếu `question_id` và `session_mode` (lỗi PostgreSQL `42703`).
- Enum hiện tại `session_status` nhận `SCHEDULED`, `COMPLETED` nhưng không nhận `LIVE`, `EXPIRED` (lỗi `22P02`).

Không có DDL, migration, Supabase CLI, tạo tài khoản hay thay đổi Dashboard được thực thi. Ứng dụng không đổi tên cột để đoán schema và không trả phòng giả khi INSERT lỗi.

`docs/sql/phase-4-interview-sessions.sql` là **bản nháp để chủ database rà soát**, không phải script đã kiểm chứng trên cloud. Nó bổ sung mode enum, hai cột và các giá trị status, ràng buộc mới, RLS theo thành viên/ADMIN và trigger giữ nguyên danh tính phiên/kiểm tra chuyển trạng thái. Cần so sánh constraints, grants, triggers và policies hiện có trước khi áp dụng. Policies restrictive mới có thể kết hợp với policy restrictive cũ để chặn cả thao tác hợp lệ; cần kiểm thử bằng ba tài khoản thật. Không tự gán đề bài/mode cho phiên lịch sử. Ràng buộc NOT VALID áp dụng cho dữ liệu mới; chỉ validate/đặt NOT NULL sau khi chủ dự án xác định cách backfill lịch sử.

## Kiểm thử

```sh
npx tsc --noEmit
npm run lint
node --test tests/questions.test.mjs tests/interviews.test.mjs
npm run build
```

Các test dùng mock transport, không ghi vào Supabase thật. Bao phủ đăng nhập, dữ liệu giả mạo, thời gian, ghép cặp chính mình, quyền phòng độc lập với RLS, chuyển trạng thái khi vào đồng thời và lỗi schema/RLS.

Sau cập nhật schema/RLS, kiểm thử trên cloud: tạo phòng AI ngay; tạo phòng AI tương lai; tạo phòng hai người; tài khoản người ngoài mở UUID bị từ chối; hai thành viên và ADMIN vào được; chưa đến giờ/COMPLETED/EXPIRED không vào; hai người cùng bấm vào chỉ tạo một chuyển LIVE; kiểm tra các hành vi này cả qua REST để xác nhận RLS.

Chưa thể xác nhận luồng ghi dữ liệu thật hoặc tính đúng của RLS mới trước khi cập nhật schema và có tài khoản thử nghiệm. PR nên ở trạng thái draft cho đến khi hoàn tất các bước này.
