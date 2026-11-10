# Giai đoạn 4 — Lịch phỏng vấn và phòng chờ

Nhánh: `feat/interview-scheduling`. Phạm vi gồm bước 4.1–4.3; Monaco, Realtime, sandbox, AI chấm điểm và dashboard thuộc các nhánh giai đoạn 5–7 tiếp theo.

## Luồng ứng dụng

1. Đăng nhập, mở **Phỏng vấn → Đặt lịch mới** hoặc **Đặt lịch** từ một đề bài.
2. Chọn đề bài từ dữ liệu thật. Với AI, có thể bắt đầu ngay hoặc đặt giờ. Với hai người, nhập UUID hồ sơ của người phỏng vấn khác mình và chọn giờ tương lai.
3. Server dùng chính user đang đăng nhập làm `interviewee_id`, tạo trạng thái `SCHEDULED`, nhận UUID từ database và chuyển đến `/room/[id]/lobby`.
4. Phòng chờ chỉ cho hai thành viên đã chỉ định hoặc ADMIN truy cập. Các trạng thái micro/camera được ghi rõ là mô phỏng. Sao chép liên kết không cấp thêm quyền truy cập.
5. Đúng giờ, nút vào phòng cập nhật có điều kiện `SCHEDULED → LIVE` và mở `/room/[id]`. Phiên AI không cần người thứ hai. Người đến sau vào lại một phiên LIVE mà không cập nhật lặp.

Giờ nhập và hiển thị là Việt Nam (UTC+7); server lưu ISO UTC. Có thể đặt lịch tối đa 366 ngày. Mã hồ sơ của mỗi người hiển thị tại trang đặt lịch để trao đổi riêng khi ghép cặp. Không mở danh sách profiles của toàn hệ thống.

## Database

Hai migration trong `supabase/migrations` đã được áp dụng theo thứ tự trên Supabase của dự án. Bảng phiên trống tại thời điểm triển khai. Các cột đề bài, chế độ, giờ hẹn và trạng thái là bắt buộc. Ràng buộc phân biệt phòng AI và phòng hai người; lịch sử không được tự gán dữ liệu. Trigger cập nhật thời gian hiện có được giữ nguyên.

RLS giới hạn quyền xem và cập nhật theo thành viên hoặc ADMIN. Người đăng nhập chỉ tạo lịch cho chính mình và chỉ được cập nhật cột trạng thái. Trigger kiểm tra quá trình chuyển trạng thái, bao gồm thời điểm mở phòng. Người dùng có thể sửa hồ sơ nhưng không thể tự đổi vai trò.

## Kiểm thử ứng dụng

```sh
npx tsc --noEmit
npm run lint
node --test tests/questions.test.mjs tests/interviews.test.mjs
npm run build
```

Các test ứng dụng dùng mock transport để kiểm tra danh tính, thời gian, quyền phòng, xử lý vào phòng đồng thời và lỗi database.
