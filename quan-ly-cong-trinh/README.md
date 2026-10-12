# Khải Minh Ops — quản lý công trình điện mặt trời

**Phần mềm nội bộ độc lập.** Không kết nối, chỉnh sửa hoặc dùng tài khoản website bán hàng. Đây là bản thử chạy trên một máy, có backend Python và cơ sở dữ liệu SQLite thật; giao diện web dùng được trên máy tính và điện thoại khi triển khai máy chủ nội bộ sau này.

## Thử trực tiếp trên GitHub Pages — không cần tải ZIP hay cài Python

**Mở [bản thử Khải Minh Ops](https://phannohope98-png.github.io/solar/quan-ly-cong-trinh/)** rồi bấm **Quản lý**, **Kế toán** hoặc **Thi công** để thử.

Bản trình duyệt tự tạo bộ dữ liệu mẫu. Bạn có thể tạo/sửa công trình, thêm quy trình sáu giai đoạn, giao việc, nhập vật tư, ghi thu chi, tải/tải lại tệp hồ sơ và xuất báo cáo CSV. Dữ liệu cùng tệp được lưu thật trong **IndexedDB của trình duyệt bạn đang dùng**, không gửi dữ liệu nhập lên GitHub. Tải lại trang không làm mất hồ sơ.

Vào **Dữ liệu & sao lưu** để xuất JSON có kèm tệp, nhập lại bản sao lưu hoặc đặt lại dữ liệu mẫu. Khôi phục có bước xác nhận và kiểm tra dữ liệu trước khi thay thế. Nên sao lưu trước khi xóa dữ liệu trình duyệt hoặc đổi máy.

**Phạm vi:** đây là bản thử quy trình trên một trình duyệt; không đồng bộ giữa máy/nhân viên. Các vai trò mô phỏng quyền thao tác, không phải cơ chế bảo mật cho dữ liệu công ty. Không dùng mật khẩu thật cho tài khoản thử. Khi chốt quy trình, dùng backend/máy chủ có xác thực, phân quyền và sao lưu dùng chung.

GitHub Pages chạy các tệp `index.html`, `app.js`, `browser-store.js`, `styles.css`, `logo.svg` trong thư mục này. Backend Python ở các phần bên dưới là lựa chọn triển khai độc lập, không bắt buộc để mở link thử. Không thay đổi ứng dụng ở thư mục gốc repo.

## Giải quyết việc gì?

- **Tổng quan:** công trình đang chạy, việc trễ/bị vướng, vật tư thiếu, khoản thu/chi quá hạn.
- **Mỗi công trình một hồ sơ:** khách hàng, vị trí, công suất, giá trị hợp đồng, đội phụ trách và ngày bàn giao.
- **Công việc:** người chịu trách nhiệm, hạn, giai đoạn và ghi chú vướng mắc. Có quy trình mẫu khảo sát → thiết kế → vật tư → thi công → nghiệm thu → bảo hành; quản lý điều chỉnh người và hạn cho thực tế.
- **Vật tư tại công trình:** cần bao nhiêu, đã nhận bao nhiêu, đã dùng bao nhiêu, nhà cung cấp và ngày giao dự kiến. Cảnh báo thiếu = cần − đã nhận. Đây chưa phải hệ thống kho tổng hoặc mua hàng tự động.
- **Thu chi & công nợ:** khoản thu/chi dự kiến, đã thanh toán, hạn và ngày thực tế. Thu một phần được tách thành các đợt. Số còn phải thu hợp đồng = giá trị hợp đồng − tổng thực thu, không cộng trùng các khoản dự kiến.
- **Hồ sơ & chứng từ:** tải PDF, JPG, PNG, XLSX tối đa 10 MB; gắn số chứng từ và công trình. Tải tệp yêu cầu đăng nhập.
- **Nhân sự:** tài khoản và vai trò; xem số công trình, việc mở, việc trễ của từng người. Lịch sử thao tác cho quản lý.
- **Xuất CSV:** báo cáo hợp đồng, thực thu, thực chi và còn phải thu, mở bằng Excel.

## Chạy thử nhanh trên Windows

Các file `.cmd` tự tìm Python: Python launcher, runtime đi kèm Codex nếu có, rồi `python` trong PATH. Trên máy đang dùng Codex này có thể bấm chạy ngay. Trên máy khác, nếu chưa có Python, cài Python **3.12 hoặc mới hơn** từ [python.org](https://www.python.org/downloads/), chọn thêm Python vào PATH nếu trình cài đặt hỗ trợ. Không cần Node, npm, dịch vụ cloud hay thư viện pip.

Tải repository → mở thư mục `quan-ly-cong-trinh` → bấm đúp **start-demo.cmd**. Hoặc mở terminal tại thư mục này:

```powershell
python server.py --demo
```

Mở địa chỉ được in ra, mặc định **http://127.0.0.1:8878**. Nếu cổng đã được sử dụng:

```powershell
python server.py --demo --port 8879
```

Bản mẫu có 3 vai trò, cùng mật khẩu **SolarDemo2026!**:

| Tên đăng nhập | Vai trò | Được làm gì |
|---|---|---|
| admin | Quản lý | Tạo công trình, phân công, vật tư, tài chính, hồ sơ, nhân sự |
| ketoan | Kế toán | Xem công trình; ghi thu chi và hồ sơ; không sửa công việc/vật tư |
| thicong | Thi công | Chỉ xem công trình được giao; cập nhật trạng thái/ghi chú việc của mình, vật tư và hồ sơ hiện trường |

Thi công **không** được nhận dữ liệu giá trị hợp đồng, thu chi, hóa đơn hoặc chứng từ thanh toán từ API. Phân quyền được kiểm tra phía server, không chỉ ẩn nút trên giao diện.

Demo chỉ cho phép mở trên máy này, sử dụng `data-demo/` riêng. Không dùng tài khoản hoặc dữ liệu mẫu cho công việc thật. Dữ liệu minh họa được sinh khi chạy, không phải số liệu thật của Khải Minh.

## Dùng dữ liệu thật trên một máy

1. Dừng bản mẫu bằng Ctrl+C trong terminal.
2. Bấm **setup.cmd** để tạo tài khoản quản lý của riêng bạn, hoặc chạy:

   ```powershell
   python server.py --init
   ```

   Nhập tên đăng nhập, họ tên và mật khẩu ít nhất 12 ký tự. Mật khẩu không hiển thị khi gõ. Không có mật khẩu mặc định ở chế độ thật.

3. Chạy `python server.py`, hoặc bấm `start.cmd`.
4. Đăng nhập → **Nhân sự** → thêm người → **Công trình** → tạo hồ sơ và chọn đội phụ trách.
5. Vào hồ sơ → **Thêm quy trình mẫu**, sau đó giao từng việc và đặt thời hạn phù hợp.
6. Nhập danh sách vật tư và các đợt thanh toán; tải hợp đồng/bản vẽ/hóa đơn lên hồ sơ.

Dữ liệu nằm trong `data/solar.sqlite3` và `data/files/`. Có thể đổi thư mục qua biến môi trường `SOLAR_DATA_DIR`. Không xóa thư mục này khi nâng cấp mã nguồn. Khi đổi máy, cần mang theo **cả cơ sở dữ liệu và thư mục files**.

## Quy trình chạy thử trong công ty (đề xuất 1 tuần)

1. Chọn 1–2 công trình đang thi công và chỉ định một người giữ dữ liệu.
2. Nhập các đầu việc còn lại, người phụ trách, vật tư cần/đã nhận và các khoản đang chờ thanh toán.
3. Mỗi chiều đội thi công cập nhật việc và vướng mắc; người phụ trách kiểm vật tư; kế toán đối chiếu tiền thực tế và bổ sung chứng từ.
4. Đầu ngày quản lý nhìn **Ưu tiên hôm nay**, giải quyết điểm nghẽn và giao lại việc nếu cần.
5. Cuối tuần đối chiếu hồ sơ, tiền và vật tư với sổ hiện có. Chốt biểu mẫu/luồng việc trước khi triển khai nhiều người.

Trạng thái hoàn thành do người dùng cập nhật; tiến độ % là số công việc đã hoàn thành / tổng công việc, **không phải** % khối lượng thi công hay giá trị nghiệm thu. Thực thu − thực chi là dòng tiền, **không phải lợi nhuận**. Hệ thống không tự xác nhận chuyển khoản, xuất hóa đơn điện tử hoặc làm kế toán thuế.

## Sao lưu và phục hồi

Nên dừng nhập liệu/tải tệp trong lúc sao lưu, hoặc dừng server. Chạy lệnh dưới đây tại thư mục phần mềm; đặt file ZIP ngoài `data/` và không ghi đè bản cũ:

```powershell
python server.py --backup ..\solar-backup-2026-10-12.zip
```

Lệnh dùng SQLite backup API và đóng gói tệp đính kèm; loại bỏ các phiên đăng nhập khỏi bản sao. File ZIP chứa dữ liệu khách hàng và mật khẩu đã băm: lưu ở nơi riêng, có kiểm soát, không đưa lên GitHub. Dùng tên khác cho mỗi lần sao lưu.

Phục hồi: dừng server → giữ một bản sao của `data/` hiện tại → giải nén ZIP vào thư mục `data/` → kiểm tra có `solar.sqlite3` và `files/` → chạy lại → đăng nhập và đối chiếu một công trình/tệp. Chế độ demo dùng `data-demo/`, tách biệt.

## Kiểm thử

```powershell
python tests.py
```

Các kiểm thử tích hợp chạy HTTP server với cơ sở dữ liệu tạm tại `.test-data/`; không tác động dữ liệu thật. Kiểm tra đăng nhập/đăng xuất, CSRF, phân quyền, phạm vi công trình, chứng từ riêng tư, ngày thanh toán, số tiền hợp lệ, vật tư, chống ghi đè cập nhật đồng thời, xuất CSV và lưu trữ mềm.

## Triển khai nhiều nhân viên sau bản thử

Backend hỗ trợ nhiều phiên đăng nhập và SQLite khóa giao dịch khi ghi. Từ bản thử một máy sang truy cập từ xa vẫn cần người triển khai cấu hình máy chủ:

- Máy chủ riêng chạy liên tục; reverse proxy có HTTPS; cấu hình `SOLAR_SECURE_COOKIE=1` khi chạy HTTPS.
- Không mở bản demo, tài khoản mẫu hoặc cổng Python trực tiếp ra Internet. `http.server` trong bản này là server thử, không thay cho hạ tầng production.
- Sao lưu cơ sở dữ liệu/tệp hằng ngày, kiểm tra phục hồi và quy trình cấp/thu hồi tài khoản.
- Cân nhắc PostgreSQL, lưu trữ tệp riêng và kiểm thử tải khi số đội/công trình tăng.

GitHub Pages phục vụ **bản thử IndexedDB trên trình duyệt** ở link phía trên. GitHub Pages không chạy backend Python/SQLite và không cung cấp dữ liệu dùng chung; backend là lựa chọn triển khai máy chủ sau khi chốt quy trình.

## Giới hạn của bản 1.0

Chưa có kho tổng/phiếu nhập xuất, OCR hóa đơn, liên kết ngân hàng, chữ ký số, ứng dụng offline, thông báo Zalo, khấu trừ thuế, sổ kế toán đầy đủ, reset mật khẩu tự phục vụ hoặc quản trị thu hồi tài khoản trên giao diện. Thu hồi khẩn cấp ở bản thử: quản trị viên máy chủ đặt `active=0` cho user trong SQLite và xóa phiên của user; cần sao lưu trước khi thao tác. API lưu trữ mềm giữ lịch sử nhưng chưa có màn hình khôi phục.

Mã nguồn không chứa tài khoản hosting/CMS của website công ty. `.gitignore` loại cơ sở dữ liệu, tệp vận hành, bản sao lưu và biến môi trường.

**Tệp chính:** `server.py` (API, SQLite, xác thực), `app.js` (giao diện và luồng thao tác), `styles.css`, `index.html`, `tests.py`, `start-demo.cmd`, `start.cmd`.

## Kiểm thử chế độ trình duyệt

Nếu có Node.js 20+: `node --test browser-tests.cjs`. Các kiểm thử này chạy model trên bộ lưu trữ tạm; kiểm tra công trình, công việc, vai trò mẫu, vật tư, tiền, hồ sơ, sao lưu/khôi phục và xung đột phiên bản. Kiểm tra giao diện thực tế dùng link GitHub Pages phía trên.
