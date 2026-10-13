# Khải Minh Ops — quản lý công trình điện mặt trời

**Phần mềm nội bộ độc lập.** Không kết nối, chỉnh sửa hoặc dùng tài khoản website bán hàng. Đây là bản thử chạy trên một máy, có backend Python và cơ sở dữ liệu SQLite thật; giao diện web dùng được trên máy tính và điện thoại khi triển khai máy chủ nội bộ sau này.

## Thử trực tiếp trên GitHub Pages — không cần tải ZIP hay cài Python

**Mở [bản thử Khải Minh Ops](https://phannohope98-png.github.io/solar/)** rồi bấm **Quản lý**, **Kế toán** hoặc **Thi công** để thử.

Bản trình duyệt tự tạo bộ dữ liệu mẫu. Bạn có thể tạo/sửa công trình, thêm quy trình sáu giai đoạn, giao việc, nhập vật tư, ghi thu chi, tải/tải lại tệp hồ sơ và xuất báo cáo CSV. Dữ liệu cùng tệp được lưu thật trong **IndexedDB của trình duyệt bạn đang dùng**, không gửi dữ liệu nhập lên GitHub. Tải lại trang không làm mất hồ sơ.

Vào **Dữ liệu & sao lưu** để xuất JSON có kèm tệp, nhập lại bản sao lưu hoặc đặt lại dữ liệu mẫu. Khôi phục có bước xác nhận và kiểm tra dữ liệu trước khi thay thế. Nên sao lưu trước khi xóa dữ liệu trình duyệt hoặc đổi máy.

**Phạm vi:** đây là bản thử quy trình trên một trình duyệt; không đồng bộ giữa máy/nhân viên. Các vai trò mô phỏng quyền thao tác, không phải cơ chế bảo mật cho dữ liệu công ty. Không dùng mật khẩu thật cho tài khoản thử. Khi chốt quy trình, dùng backend/máy chủ có xác thực, phân quyền và sao lưu dùng chung.

GitHub Pages chạy các tệp `index.html`, `app.js`, `browser-store.js`, `styles.css`, `logo.svg` trong thư mục này. Backend Python ở các phần bên dưới là lựa chọn triển khai độc lập, không bắt buộc để mở link thử. Ứng dụng quản lý được phục vụ ngay tại thư mục gốc repo.

## Cập nhật trực tiếp & biểu đồ — 13/10/2026

Bắt đầu / Xong ngay trên dòng việc. Báo vướng hoặc Sửa tại dòng mở phần nhập ngay bên dưới, giữ ngữ cảnh. Có hoàn tác lần vừa sửa trong phiên hiện tại; không hoàn tác nếu việc đã được cập nhật tiếp. Việc chưa có người phải giao người trước khi bắt đầu / hoàn thành.

Việc của đội dùng danh sách có bộ lọc công trình, trạng thái, nhân sự; sửa trạng thái, người, hạn, ghi chú tại dòng. Hôm nay hiển thị sẵn biểu đồ trạng thái, tiến độ công trình, số việc đang mở theo nhân sự và nhóm hạn. Tiến độ là tỷ lệ số việc hoàn thành, không phải khối lượng nghiệm thu; phân bổ là số việc, không phải giờ công.

Kiểm thử: `node --test --test-isolation=none browser-tests.cjs workflow-tests.cjs project-tests.cjs focus-tests.cjs quick-tests.cjs`. **47/47 kiểm thử đạt.** Luồng trình duyệt đã kiểm tra: bắt đầu, hoàn tác, báo vướng tại dòng, lưu và tải lại trang.

## Bản điều phối Hôm nay — phân tích trước, tổ chức lại thao tác

Đọc [phân tích tình huống và quyết định thiết kế](PROJECT-ANALYSIS.md): phân biệt căn cứ nghiên cứu, suy luận nghiệp vụ, chức năng đã làm và giới hạn còn lại.

- Năm điểm vào chính: Hôm nay, Công trình, Việc của đội, Lịch đội, Hồ sơ. Công cụ gom các mục ít dùng. Biểu đồ và việc đã hoàn thành thu gọn mặc định.
- Hôm nay: ưu tiên điểm nghẽn gấp, việc vướng / quá hạn, chưa giao người, đến hạn, vật tư và điều kiện chưa xác nhận. Mỗi mục có người, công trình, hạn và nút xử lý. Có bộ lọc Việc của tôi.
- Điểm nghẽn riêng: nhóm vấn đề, ưu tiên, người xử lý, hạn, kết quả và lịch sử. Có thể đổi người, mức ưu tiên, mở lại việc đã xử lý; không mất báo cáo đầu tiên.
- Điều kiện: điều kiện riêng cho lắp đặt, vệ sinh, bảo trì. Ban đầu là Chưa xác nhận. Ghi căn cứ / lý do không áp dụng và tệp bằng chứng; quản lý xác nhận. Không thay nghiệm thu hay đánh giá kỹ thuật.
- Tạo công trình gọn: thông tin thiết yếu và đội; tạo sẵn tám việc đúng loại có người theo dõi. Thông tin thiết bị và lịch bổ sung sau. Công trình có bốn tab thường dùng: Việc & vướng, Điều kiện, Hồ sơ, Nhật ký.
- Bản sao lưu giữ phát sinh và lịch sử điều kiện; dữ liệu mới được kiểm tra trước khi khôi phục. Vai trò Pages vẫn chỉ mô phỏng và dữ liệu chỉ ở trình duyệt hiện tại. Backend v1 chưa hỗ trợ các luồng mới.

Kiểm thử model: **41/41 đạt**. Lệnh: `node --test --test-isolation=none browser-tests.cjs workflow-tests.cjs project-tests.cjs focus-tests.cjs`. Đã thử trên giao diện: tạo dịch vụ và việc mẫu, báo / đóng phát sinh, xác nhận thiếu căn cứ bị chặn, lưu căn cứ, mở vật tư qua Công cụ.

## Điều phối trực quan — cập nhật giao diện

Thu chi & công nợ đã gỡ khỏi giao diện Pages: menu, thẻ công trình, tab, nút lập tiền và trường hợp đồng. Dữ liệu cũ vẫn được giữ trong bản sao lưu; backend v1 và các model lịch sử chưa bị xóa.

Sơ đồ giai đoạn tương tác và biểu đồ vòng trạng thái dùng số công việc thực tế. Bấm nút giai đoạn/trạng thái để lọc danh sách, chọn công trình hoặc người phụ trách. Biểu đồ vật tư thể hiện đã nhận so với nhu cầu, bấm để mở hồ sơ vật tư. Chỉnh nhanh cho phép thay người, hạn, trạng thái và ghi chú trong một biểu mẫu; trạng thái Bị vướng yêu cầu ghi lý do tại biểu mẫu này. Phân quyền và phiên bản cập nhật vẫn do model kiểm tra.

## Bảng điều hành công trình và dịch vụ

- Bảng công trình dạng thẻ gọn: tiến độ, hạn, đội phụ trách, việc tiếp theo, vật tư thiếu và tiền; lọc theo loại dịch vụ, trạng thái, nhân sự. Biểu đồ dùng dữ liệu công việc thực tế.
- Bảng việc Kanban bốn trạng thái, đổi trạng thái ngay trên thẻ; lịch đội 7 ngày với thao tác điều đội tại ô trống và kiểm tra trùng lịch.
- Bản vẽ, ảnh hiện trường và biên bản: tải tệp, mở ảnh/PDF tại chỗ. Mã / phiên bản do người dùng nhập; chưa có hệ thống quản lý phiên bản bản vẽ tự động.
- Ba quy trình riêng: lắp đặt, vệ sinh pin, bảo trì / sửa chữa. Mỗi mẫu có tám việc, thêm lại không tạo trùng; cần giao người và điều chỉnh hạn thực tế.
- Lịch dịch vụ định kỳ, ghi chú thiết bị/vị trí; lập hồ sơ kỳ tiếp riêng để giữ lịch sử kỳ cũ. Kỳ mới cần nhập giá và giao việc, chưa tự gửi thông báo.

## Các luồng nghiệp vụ trên GitHub Pages

Mở https://phannohope98-png.github.io/solar/ và chọn **Quản lý**, **Kế toán** hoặc **Thi công**. Giao diện có menu phía trên, hành động trực tiếp trên từng dòng và nhóm thao tác nhanh trong công trình.

- **Đội & hiện trường:** lịch công tác theo ngày và nhân sự; chặn trùng lịch; hủy lịch để điều đội lại; giao việc, hoàn thành nhanh; nhật ký ngày có số người, việc đã làm, vướng mắc, kế hoạch và tệp ảnh.
- **Vật tư:** nhập kế hoạch; lập yêu cầu mua → duyệt/từ chối → đặt mua với nhà cung cấp → nhận một phần/đủ. Mỗi lần nhận/dùng/hoàn trả cập nhật tồn tại công trình và giữ phiếu lịch sử. Không cho sử dụng hoặc trả vượt số chưa dùng. Đây là sổ tại từng công trình, chưa phải kho tổng/điều chuyển giữa kho.
- **Tiền:** lập khoản phải thu/chi, ghi nhiều lần thanh toán trên cùng một khoản, tự tính còn lại; chặn ghi vượt khoản và gửi trùng cùng biểu mẫu. Tải chứng từ ngay khi ghi tiền hoặc đối soát. Quản lý có thể hủy phiếu nhập nhầm, giữ lý do và lịch sử. Đối soát là xác nhận của người dùng, chưa kết nối ngân hàng.
- **Bàn giao:** checklist liên kết tệp nghiệm thu, hoàn công, hướng dẫn, serial/bảo hành và lịch bảo trì. Chưa quản lý serial từng thiết bị hoặc tự gửi nhắc bảo trì.
- **Dữ liệu:** giữ dữ liệu bản 1, chuyển tiền đã thanh toán thành phiếu đầu kỳ đúng một lần; sao lưu/khôi phục có cả lịch, nhật ký, yêu cầu mua, phiếu vật tư và phiếu tiền.

Các luồng 2.0 hiện hoạt động trong **chế độ trình duyệt**. Chạy thử tại máy bằng static HTTP server và `?mode=browser`. Backend Python dưới đây giữ chức năng bản 1; chưa có API cho các luồng 2.0 và chưa phải bản dùng chung nhiều nhân viên. Vai trò trên Pages chỉ mô phỏng nghiệp vụ, không bảo vệ dữ liệu trước người có quyền truy cập trình duyệt. Chưa có đồng bộ nhiều thiết bị, xuất hóa đơn điện tử, sổ kế toán hoặc ứng dụng chạy ngoại tuyến. Dữ liệu chỉ ở trình duyệt hiện tại; xuất sao lưu thường xuyên.

Kiểm thử: `node --test browser-tests.cjs workflow-tests.cjs project-tests.cjs`. Trong môi trường không cho tạo tiến trình con: `node --test --test-isolation=none browser-tests.cjs workflow-tests.cjs project-tests.cjs` (Node hỗ trợ tùy chọn này).

## Chức năng nền của bản 1

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

Tải repository → mở thư mục gốc repository `solar` → bấm đúp **start-demo.cmd**. Hoặc mở terminal tại thư mục này:

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
# Menu trái & kiểm tra công trình — 13/10/2026

## Màn hình Điều hành tinh gọn — bản mới nhất 13/10/2026

Menu thường dùng chỉ còn sáu mục: Điều hành, Công trình, Đội & công việc, Vật tư & giao hàng, Lịch đội, Kết quả & KPI. Hồ sơ, bản vẽ, kiểm tra, mua hàng, sơ đồ, nhân sự và sao lưu nằm trong nhóm Hồ sơ & công cụ có thể mở rộng; không bỏ các chức năng hoặc dữ liệu cũ.

Điều hành gom hàng đợi từ việc vướng / quá hạn, kết quả chờ xác nhận, kiểm kê chờ đối chiếu, yêu cầu mua chờ duyệt và chuyến giao mở. Mỗi dòng có một nút xử lý đúng biểu mẫu; cập nhật công việc tại dòng. Có bộ lọc Ưu tiên / Chờ duyệt / Của tôi, công trình và tìm kiếm. Mặc định năm dòng, mở thêm khi cần. Kết quả đã báo chờ xác nhận không lặp thành việc quá hạn trong hàng đợi.

Bảng đội tách đang làm, vướng và chờ xác nhận, hiện công trình / việc đang theo dõi hoặc việc tiếp theo; đây là dữ liệu được cập nhật, không phải định vị GPS hay có mặt thời gian thực. Thẻ công trình chỉ giữ loại, trạng thái, hạn, tiến độ theo số việc, điểm vướng, chờ xác nhận và nút mở.

Biểu đồ trạng thái thu gọn và tiến độ nằm tại Điều hành. Nút Biểu đồ mở riêng bốn biểu đồ hiện có; trang báo cáo không lặp danh sách điều hành bên dưới.

**64 kiểm thử đạt**, bao gồm hàng đợi không tính trùng kết quả chờ, tách người đang làm / chờ và giữ các loại xác nhận riêng. Đã kiểm tra giao diện lọc công trình, mở cập nhật tại dòng, báo làm thêm → chờ duyệt → mở kiểm kết quả ngay từ Điều hành và bốn biểu đồ. Bản trình duyệt vẫn chưa đồng bộ nhiều máy.

## Vật tư, vận chuyển, thực hiện và KPI — bản tiếp theo 13/10/2026

- **Vận chuyển & kiểm kê:** chuyến giao có vật tư, số lượng, nguồn xuất, người giao, người nhận, hạn, mã phiếu. Luồng Chờ xuất → Đang vận chuyển → Nhận một phần / Đã nhận; quản lý có thể hủy trước xuất hoặc chốt thiếu có lý do. Nhận hàng tốt tăng tồn, hàng hỏng ghi riêng; nhận từng phần và lịch sử được giữ. Có thể liên kết yêu cầu mua đã đặt, chặn lập chuyến vượt phần chưa nhận / chưa có chuyến; hàng tốt cập nhật nhận của yêu cầu mua.
- **Tồn / thiếu / dư:** còn = đã nhận − đã dùng; nhu cầu còn lại = max(kế hoạch − đã dùng, 0); thiếu = max(nhu cầu còn lại − còn, 0); dư = max(còn − nhu cầu còn lại, 0). Bấm Ghi dùng / Trả dư / Yêu cầu bổ sung. Giao dịch dùng / trả có thể gắn công việc trong công trình, giữ người ghi, phiếu và ghi chú. Không tự suy hàng còn chưa dùng là hàng dư.
- **Kiểm kê:** nhân viên ghi số thực đếm và lý do. Quản lý đối chiếu mới điều chỉnh sổ; nếu vật tư đã đổi sau đếm, chặn ghi đè và yêu cầu đếm lại. Điều chỉnh giữ phiếu và mức chênh lệch. Không bao gồm kho tổng hay điều chuyển giữa các kho / công trình.
- **Ai đang làm gì:** chia theo sáu khâu; từng dòng có công trình, người, hạn, trạng thái, tiêu chí đạt và định mức. Việc cũ đã đánh dấu xong nhưng chưa có kết quả được xác nhận vẫn có thể bổ sung báo cáo.
- **Kết quả & KPI:** chọn khoảng ngày và công trình; biểu đồ điểm, việc được giao xác nhận, việc làm thêm xác nhận, đúng hạn, giờ khai báo và chờ xác nhận. Quản lý chốt 1–20 điểm nỗ lực và tiêu chí; nhân viên báo kết quả + giờ + tệp tùy chọn; quản lý xác nhận hoặc yêu cầu làm lại kèm căn cứ. Bấm Báo hoàn thành trên dòng việc mở báo cáo, không tự cộng KPI.
- **Làm thêm sau khi xong:** nhận việc được giao mới thì tạo việc mới và định mức như bình thường. Việc phát sinh đã làm dùng “Báo việc làm thêm”, ghi lý do / người yêu cầu, khâu, người, kết quả và giờ. Chỉ cộng điểm sau duyệt, tách khỏi việc được giao; không sửa kết quả cũ để lấy thêm điểm. Bị yêu cầu làm lại thì công việc mở lại và lần báo chưa đạt không có điểm.
- Điểm này phục vụ theo dõi vận hành, không tự tính lương / thưởng hoặc xếp hạng nhân viên. Số việc giao trong kỳ tính theo hạn; số kết quả trong kỳ tính theo ngày thực hiện, không chia hai số thành tỷ lệ hoàn thành. Dữ liệu cũ không tự sinh điểm.

Kiểm chứng: **62 kiểm thử đạt** (bổ sung `project-control-tests.cjs` vào lệnh kiểm thử); trình duyệt đã thử lập / xuất / nhận từng phần hàng tốt-hỏng, định mức → báo → xác nhận, làm thêm → duyệt điểm, kiểm kê → đối chiếu. Lưu trữ, phân quyền mẫu và chống cập nhật cũ vẫn theo bản thử trình duyệt; chưa triển khai máy chủ dùng chung cho các luồng này.

Menu máy tính cố định bên trái, chia Điều hành / Hiện trường / Theo dõi. Điện thoại dùng nút Mở menu để mở từ cạnh trái. Vật tư, mua hàng, bản vẽ, dịch vụ, sơ đồ và sao lưu mở trực tiếp.

Màn hình **Kiểm tra công trình** tổng hợp việc chưa giao, việc vướng / phát sinh, việc quá hạn, vật tư thiếu, điều kiện chưa xác nhận và số tệp. Bấm từng ô để mở tab xử lý của công trình; nút Lịch đội và Bàn giao mở luồng tương ứng. Có bộ lọc hồ sơ cần bổ sung / xử lý và tìm tên, khách, địa điểm. Số tệp không phải xác nhận đủ hồ sơ; điều kiện phần mềm không thay nghiệm thu kỹ thuật.

**Cách sử dụng** hướng dẫn sáu bước từ lập công trình đến bàn giao và sao lưu, có nút mở từng màn hình. Bốn biểu đồ và cập nhật tại dòng vẫn giữ.

Kiểm thử: `node --test --test-isolation=none browser-tests.cjs workflow-tests.cjs project-tests.cjs focus-tests.cjs quick-tests.cjs workbench-tests.cjs` — **49/49 đạt**. Bản Pages vẫn là một workspace trên một trình duyệt; backend v1 chưa hỗ trợ các luồng mới.
