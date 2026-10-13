# Phân tích nghiệp vụ và quyết định thiết kế

## Cải tiến điều phối — 13/10/2026

Qua rà soát giao diện và các luồng hiện có, vấn đề chính là người dùng phải nhớ mục nào nằm trong Công cụ và mở từng công trình để đối chiếu. Đây là đánh giá thiết kế, chưa phải kết quả phỏng vấn nhân viên công ty.

- Menu cố định bên trái trên máy tính, chia Điều hành / Hiện trường / Theo dõi. Vật tư, mua hàng, bản vẽ, dịch vụ và sơ đồ đi thẳng từ menu. Trên điện thoại, nút Mở menu mở cùng menu từ cạnh trái.
- Kiểm tra công trình tổng hợp sáu mục: lập / giao việc, vướng mắc / phát sinh, quá hạn, vật tư thiếu, điều kiện chuyển bước, tệp hồ sơ. Mỗi ô mở đúng tab công trình. Hồ sơ chưa có công việc và chưa có tệp vẫn được nhắc; công việc hoàn thành không bị tính quá hạn hoặc chưa giao người.
- Điều kiện chưa xác nhận không được suy thành đã sẵn sàng; tệp hồ sơ chỉ là số tệp, không khẳng định đầy đủ hay hợp lệ. Hoàn thành công việc vẫn tách khỏi nghiệm thu kỹ thuật.
- Cách sử dụng có sáu bước và nút mở màn hình: lập hồ sơ → giao người / hạn → chuẩn bị hiện trường → cập nhật → lưu bằng chứng / bàn giao → sao lưu.
- Bốn biểu đồ mở sẵn ở Hôm nay; số liệu lấy từ workspace hiện tại. Chưa có đo sản lượng hay đồng bộ giữa máy.

Tình huống cần tiếp tục hoàn thiện sau khi chốt nghiệp vụ thực tế: khách đổi phạm vi cần phiên bản thiết kế và duyệt thay đổi; xuất vật tư cần kho tổng và phiếu theo người nhận; bàn giao cần tồn tại còn mở và chữ ký; lịch đội cần ca theo giờ; bảo trì cần sổ thiết bị theo serial. Các phần này chưa được giả lập thành tính năng đã hoạt động.

Kiểm chứng bản này: 49 kiểm thử đạt; kiểm tra giao diện menu trái, tổng hợp công trình, mở vật tư từ ô thiếu và hướng dẫn sử dụng. Các phần cũ dưới đây mô tả những lần cải tiến trước; điều hướng và biểu đồ áp dụng thiết kế mới ở trên.

Ngày: 12/10/2026. Phạm vi: bản thử một trình duyệt tại repo solar; đã bỏ Thu chi & công nợ theo yêu cầu.

## Căn cứ và giới hạn của nghiên cứu

Nguồn chính: [DOE — Install and Commission](https://www.energy.gov/cmei/femp/life-cycle-photovoltaic-systems-install-and-commission-photovoltaic-system), [DOE — Procure a New PV System](https://www.energy.gov/cmei/femp/life-cycle-photovoltaic-systems-procure-new-photovoltaic-system), [NREL — Best Practices for PV and Energy Storage O&M](https://research-hub.nlr.gov/en/publications/best-practices-for-operation-and-maintenance-of-photovoltaic-and-/).

DOE đề cập đánh giá điều kiện địa điểm, chuẩn bị kế hoạch nghiệm thu trước thi công, kiểm tra và hồ sơ hệ thống. NREL nhấn mạnh chuẩn hóa kế hoạch cung cấp dịch vụ O&M để cải thiện hiệu quả và khả năng dự báo. Đây là tài liệu tham khảo nghiệp vụ; không áp các thủ tục/tiêu chuẩn Mỹ thành yêu cầu pháp lý của Việt Nam.

Các tình huống dưới đây là suy luận thiết kế từ vòng đời dự án, yêu cầu người dùng và luồng hiện có. Chưa có quan sát trực tiếp tại công ty hoặc phỏng vấn đội hiện trường; không khẳng định tần suất xảy ra. Cần thử với công trình thật để điều chỉnh mẫu.

## Tình huống → cách xử lý trong app

| Tình huống dự kiến | Hệ quả nếu chỉ ghi chú | Quyết định và trạng thái thực hiện |
|---|---|---|
| Khách thay phạm vi hoặc cấu hình sau khảo sát | Đội và vật tư làm theo thông tin cũ | Điểm nghẽn nhóm Thiết kế / phạm vi, người xử lý, hạn; điều kiện bản vẽ được xác nhận. Đã có. Chưa có version-control bản vẽ hoặc duyệt thay đổi nhiều cấp. |
| Nhà cung cấp giao thiếu, giao chậm | Ra công trình rồi mới biết thiếu | Kế hoạch vật tư, cảnh báo số thiếu / chậm, yêu cầu mua và nhận từng phần. Đã có; chưa có kho tổng hay tích hợp nhà cung cấp. |
| Việc không có người hoặc giao nhiều người nhưng không rõ trách nhiệm | Mọi người tưởng người khác làm | Mỗi việc có một người phụ trách, bộ lọc Chưa giao người; tạo mẫu có người theo dõi ngay. Đã có. |
| Một người bị điều đến hai công trình | Chậm cả hai đội | Lịch đội và kiểm tra trùng ngày khi điều đội. Đã có; chưa có ca theo giờ, giờ di chuyển hay GPS. |
| Khách chưa mở lối tiếp cận / chưa thống nhất thời gian | Đội phải chờ, phát sinh đi lại | Điểm nghẽn hiện trường, điều kiện tiếp cận trước khi làm. Đã có; người dùng tự xác nhận với khách. |
| Thời tiết hoặc điều kiện hiện trường thay đổi | Lịch không còn thực hiện được | Báo vướng mắc, cập nhật hạn, hủy và điều lịch hiện có. Đã có; không tự đánh giá an toàn hoặc lấy dự báo thời tiết. |
| Hoàn thành đầu việc nhưng thiếu kiểm tra / ảnh / biên bản | Hiểu nhầm đã nghiệm thu | Tách trạng thái công việc khỏi điều kiện được xác nhận, tệp chứng minh và checklist bàn giao. Đã có; không thay kiểm tra của kỹ thuật viên. |
| Sự cố được báo trong chat rồi bị quên | Không ai theo đến khi xong | Sổ điểm nghẽn Mở → Đang xử lý → Đã xử lý, chủ trách nhiệm, hạn, ưu tiên, kết quả. Đã có. |
| Đóng phát sinh quá sớm, lỗi tái diễn | Mất lý do và lịch sử xử lý | Mở lại trên cùng hồ sơ, giữ các lần cập nhật. Đã có. |
| Vệ sinh xong không lưu tình trạng trước/sau | Khó đối chiếu bất thường | Quy trình và điều kiện riêng cho vệ sinh, ảnh hồ sơ, ghi nhật ký bất thường. Đã có; chưa tự tính hiệu quả sản lượng. |
| Bảo trì thiếu thông tin thiết bị / bảo hành | Mất thời gian tìm serial, lịch sử lỗi | Ghi chú thiết bị, tệp, nhóm Thiết bị / bảo hành, hồ sơ kỳ dịch vụ. Đã có ở mức hồ sơ; chưa có sổ từng thiết bị hay kết nối inverter. |
| Quên lịch dịch vụ lặp lại | Bỏ sót khách đang cần phục vụ | Ngày / chu kỳ và hồ sơ kỳ tiếp; nhắc theo dõi khi đến hạn. Đã có; chưa gửi Zalo/email/push. |
| Nhiều menu / số liệu khiến không biết bắt đầu ở đâu | Người dùng không cập nhật thường xuyên | Năm điểm vào chính, Hôm nay xếp việc cần xử lý trước, mỗi mục có một hành động. Đã có. Công cụ và biểu đồ mở khi cần. |
| Hai người sửa hồ sơ cùng lúc hoặc bấm gửi lại | Ghi đè / trùng phát sinh | Kiểm tra phiên bản và request_id cho báo phát sinh; giao dịch IndexedDB nguyên tử. Đã có trong một trình duyệt. Chưa có máy chủ nhiều người. |
| Bản sao lưu thiếu hoặc sai cấu trúc phát sinh | Mất lịch sử / trang không mở được | Kiểm tra dữ liệu phát sinh và điều kiện trước khi thay thế, giữ bản cũ nếu lỗi. Đã có. |

## Thông tin ưu tiên và thiết kế giao diện

Hôm nay trả lời: việc cần làm gì, ở công trình nào, ai chịu trách nhiệm, hạn nào, bấm đâu để xử lý. Thứ tự: phát sinh gấp → việc vướng / quá hạn → việc chưa giao → việc đến hạn → vật tư cần kiểm tra. Số lượng lấy từ dữ liệu, không sinh cảnh báo giả cho mục đã hoàn thành. Ưu tiên này là quy tắc điều phối, không phải đánh giá rủi ro kỹ thuật.

Điều hướng chính: Hôm nay, Công trình, Việc của đội, Lịch đội, Hồ sơ. Công cụ chứa vật tư, mua hàng, bản vẽ, sơ đồ, nhân sự, sao lưu. Công trình chỉ có bốn tab thường dùng: Việc & vướng, Điều kiện, Hồ sơ, Nhật ký. Công cụ công trình mở lịch, vật tư, mua hàng và bàn giao. Việc đã xong và biểu đồ thu gọn mặc định.

Tạo hồ sơ cần tên dễ nhận biết, loại dịch vụ, khách, địa điểm, ngày và đội. Điện thoại, thiết bị, lịch định kỳ bổ sung sau. Mẫu tám việc là điểm khởi đầu; quản lý chỉnh người, hạn và việc theo tình huống. Không tự khóa thi công chỉ dựa trên checklist phần mềm.

## Kiểm chứng và phần chưa hoàn thiện

Model có kiểm thử phân quyền, phạm vi công trình, ngày hợp lệ, lịch sử, cập nhật cũ, chống trùng, khôi phục và thứ tự ưu tiên. Giao diện phải thử tạo hồ sơ → báo phát sinh → xử lý → mở lại; xác nhận thiếu căn cứ bị chặn; lịch, tệp và công cụ vẫn mở được. 41 kiểm thử model đạt. Trên giao diện đã thử tạo dịch vụ và việc mẫu, báo / đóng phát sinh, chặn xác nhận thiếu căn cứ, lưu căn cứ và mở vật tư qua Công cụ.

Chưa thể gọi đây là hệ thống công ty hoàn chỉnh: không đồng bộ nhiều máy, chưa có phân quyền máy chủ cho các luồng mới, ca làm theo giờ, quản lý tài sản từng serial, thay đổi thiết kế nhiều cấp, kho tổng, chữ ký nghiệm thu hoặc giám sát sản lượng tự động. Thu chi đã bỏ khỏi giao diện. Backend v1 không chứa các luồng mới; chỉ dùng bản Pages để thử và chốt nghiệp vụ trước khi triển khai máy chủ.
