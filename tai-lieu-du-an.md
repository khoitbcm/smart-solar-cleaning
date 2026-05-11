# Tài liệu dự án vệ sinh tấm pin mặt trời sử dụng trí tuệ nhân tạo

Ngày viết lại tài liệu: **05/05/2026**

Tài liệu này được viết lại sau khi rà soát trực tiếp thư mục `D:\DuAn`. Nội dung ưu tiên phản ánh mã nguồn và tài nguyên đang có trong dự án, đặc biệt là các file nguồn gốc ở thư mục gốc, `templates/` và `solar_clean_rn/`. Các thư mục `build/`, `dist/`, `venv/`, `node_modules/` và các log build được xem như tài nguyên đóng gói hoặc phát sinh, không phải nguồn chính để mô tả nghiệp vụ.

## 1. Tên đề tài

**Nghiên cứu và xây dựng hệ thống tự động giám sát, nhận diện tình trạng bề mặt tấm pin mặt trời bằng trí tuệ nhân tạo và điều khiển PLC để thực hiện vệ sinh tự động.**

Dự án kết hợp ba nhóm công nghệ chính:

- Thị giác máy tính và học sâu để nhận diện tấm pin, bụi bẩn và vật cản.
- Giao diện vận hành desktop, web và mobile để giám sát từ xa.
- Điều khiển công nghiệp qua PLC Siemens S7 bằng thư viện Snap7.

Mục tiêu của hệ thống là giảm kiểm tra thủ công, tự động phát hiện khi tấm pin cần vệ sinh, lưu snapshot làm bằng chứng vận hành và gửi tín hiệu đến PLC để kích cơ cấu vệ sinh.

## 2. Bối cảnh và lý do thực hiện

Tấm pin mặt trời khi hoạt động ngoài trời thường bị bụi, lá cây, phân chim, nước đọng, bóng che hoặc vết bám trên bề mặt. Các yếu tố này làm giảm lượng ánh sáng đến cell quang điện và làm giảm hiệu suất phát điện.

Nếu kiểm tra thủ công, hệ thống gặp các hạn chế:

- Tốn nhân lực khi số lượng tấm pin lớn.
- Khó phát hiện kịp thời vùng bẩn cục bộ.
- Khó lưu lại hình ảnh trước/sau để đối chiếu.
- Phụ thuộc nhiều vào kinh nghiệm người vận hành.
- Không phù hợp với yêu cầu giám sát liên tục hoặc từ xa.

Vì vậy dự án xây dựng một hệ thống gồm camera, AI, phần mềm giám sát và PLC. AI đánh giá tình trạng tấm pin, còn PLC điều khiển cơ cấu vệ sinh thực tế.

## 3. Mục tiêu dự án

Hệ thống hướng đến các mục tiêu:

- Quan sát bề mặt tấm pin bằng camera.
- Phát hiện vùng tấm pin trong khung hình để tránh phân tích nhầm nền.
- Chia vùng tấm pin thành 32 ô nhỏ để đánh giá mức độ bẩn cục bộ.
- Phân loại từng ô thành `sach` hoặc `ban`.
- Phát hiện thêm vật cản như lá cây hoặc phân chim bằng YOLO.
- Tính tỷ lệ ô bẩn và quyết định có cần vệ sinh hay không theo ngưỡng cấu hình.
- Gửi tín hiệu điều khiển PLC Siemens S7 khi cần vệ sinh.
- Cho phép giám sát/điều khiển qua desktop, web và mobile.
- Lưu snapshot định kỳ để phục vụ kiểm tra, báo cáo và hiệu chỉnh AI.

## 4. Thành phần chính trong thư mục dự án

| Thành phần | Vai trò |
|---|---|
| `solar_panel_plc_auto_tflite.py` | Ứng dụng desktop chính: camera, AI, YOLO, PLC, Tkinter UI và khởi động web server |
| `web_monitor_fastapi.py` | Backend FastAPI cho web/mobile: API, WebSocket, auth, snapshot, frame preview |
| `templates/` | Giao diện web: đăng nhập, đăng ký và dashboard SCADA |
| `solar_clean_rn/` | Ứng dụng mobile React Native / Expo đang được phát triển |
| `SolarClean/` | Bản copy/triển khai cũ hơn, có README và script rút gọn |
| `snapshots/` | Ảnh snapshot do hệ thống lưu trong quá trình chạy |
| `captured_images/` | Ảnh chụp thủ công phục vụ thu thập dữ liệu |
| `test_yolo_results/` | Ảnh kết quả thử YOLO live |
| `taikhoan/accounts.json` | Danh sách tài khoản đăng ký, trạng thái duyệt và vai trò |
| `taikhoan/sessions.json` | Session đăng nhập đã lưu |
| `buiban.h5` | Trọng số model EfficientNet-B0 2 lớp `sach` / `ban` |
| `labels_2classes.txt` | Nhãn model: `0 sach`, `1 ban` |
| `panel 2.pt` | YOLOv8-Seg để phát hiện/segment vùng tấm pin |
| `Solar.pt` | YOLOv8 Detect để phát hiện vật cản/lỗi bề mặt |
| `snap7.dll` | DLL phục vụ kết nối PLC Siemens S7 |
| `SolarClean_Complete.spec` | File đóng gói PyInstaller đầy đủ nhất hiện có |
| `apk/app-release.apk`, `SolarClean.apk`, `app-release.apk` | Artifact Android đã build |

Ghi chú: trong thư mục hiện tại không thấy thư mục Flutter `solar_clean_app/`. Mobile app chính đang có trong dự án là `solar_clean_rn/`.

## 5. Kiến trúc vận hành tổng quát

Luồng xử lý hiện tại của desktop app:

```text
Camera
-> Chuẩn hóa hướng ảnh
-> Lưu snapshot định kỳ
-> YOLOv8 Detect tìm lá cây / phân chim
-> YOLOv8-Seg tìm vùng tấm pin
-> Crop vùng tấm pin, tự xoay về portrait nếu cần
-> EfficientNet-B0 phân loại 32 patch sạch/bẩn
-> Tổng hợp tỷ lệ bẩn và vật cản
-> So sánh ngưỡng + kiểm tra cooldown + trạng thái PLC
-> Gửi bit điều khiển đến PLC Siemens S7
-> Cập nhật desktop UI, FastAPI, WebSocket và mobile app
```

Desktop app là trung tâm của hệ thống. Web monitor và mobile app lấy trạng thái từ desktop thông qua module `web_monitor_fastapi.py`.

## 6. Cấu hình quan trọng của desktop app

Các cấu hình chính trong `solar_panel_plc_auto_tflite.py`:

```text
APP_VERSION:              2.4.0-Patch32
MODEL_PATH:               buiban.h5
LABELS_PATH:              labels_2classes.txt
PANEL_SEG_MODEL_PATH:     panel 2.pt
IMG_SIZE:                 224 x 224
CAMERA_ID:                0
CAMERA_FRAME_WIDTH:       1080
CAMERA_FRAME_HEIGHT:      1920
CAMERA_BACKENDS:          DSHOW
DISABLE_AUTOFOCUS:        True
FRAME_ROTATION_MODE:      none
FORCE_PORTRAIT_FRAME:     True
PORTRAIT_ROTATION:        ccw
TRIGGER_CLASS:            ban
MIN_CONFIDENCE:           0.60
DIRT_AREA_THRESHOLD:      0.0
TRIGGER_COOLDOWN:         5.0 giây
SNAPSHOT_INTERVAL:        600 giây
PATCH_ROWS:               8
PATCH_COLS:               4
PATCH_SIZE:               224
PATCH_FRAME_SIZE:         896 x 1792
MIN_VALID_PATCHES:        10
```

Một số tên trong code vẫn giữ di sản cũ, ví dụ class `DirtDetectorTFLite` và thông báo "TFLite model". Tuy nhiên luồng chính hiện tại đang dựng kiến trúc **TensorFlow/Keras EfficientNet-B0** và nạp trọng số từ `buiban.h5`, không còn là TFLite 3 lớp.

## 7. Camera và chuẩn hóa ảnh

Camera được mở bằng OpenCV, ưu tiên backend `cv2.CAP_DSHOW` trên Windows. Phần mềm đặt độ phân giải mong muốn là `1080 x 1920`, giảm buffer và tắt autofocus nếu camera hỗ trợ.

Hàm `apply_frame_rotation()` xử lý xoay ảnh theo cấu hình:

- `none`: giữ nguyên frame.
- `cw`, `ccw`, `180`: xoay cố định.
- `auto_cw`, `auto_ccw`: chỉ xoay khi frame đang landscape.

Trong luồng xử lý tấm pin, nếu YOLO-Seg crop ra vùng landscape nhưng CNN cần đầu vào portrait `896 x 1792`, desktop app tự xoay crop 90 độ để khớp cách chia `4 cột x 8 hàng`.

## 8. Model phát hiện tấm pin bằng YOLOv8-Seg

Model:

```text
panel 2.pt
```

Vai trò của model này là tìm vùng tấm pin trước khi chạy CNN. Các cấu hình chính:

```text
PANEL_SEG_CONF:             0.35
PANEL_SEG_MIN_AREA_RATIO:   0.03
PANEL_SEG_MAX_AREA_RATIO:   0.98
PANEL_MASK_ERODE_PX:        2
USE_PANEL_PERSPECTIVE_WARP: True
MASK_BACKGROUND_FOR_CNN:    False
PANEL_CROP_PADDING:         0.0
```

Luồng xử lý:

- Chạy YOLOv8-Seg trên frame gốc.
- Lấy các mask hợp lệ theo tỷ lệ diện tích trong frame.
- Ưu tiên mask có điểm tốt dựa trên diện tích và confidence.
- Tính bounding box từ mask.
- Crop vùng tấm pin để đưa vào CNN.
- Nếu không phát hiện tấm pin và model segment đã được tải, hệ thống đặt trạng thái `no_panel`, bỏ qua CNN và không kích PLC theo nhánh bụi bẩn.

Nếu không tải được `panel 2.pt`, desktop app fallback dùng full frame cho CNN, nhưng độ tin cậy thực tế sẽ thấp hơn vì CNN có thể nhận cả nền.

## 9. Model phân loại sạch/bẩn bằng EfficientNet-B0

Model:

```text
buiban.h5
labels_2classes.txt
```

Nội dung `labels_2classes.txt`:

```text
0 sach
1 ban
```

Trong `load_model()`, code dựng lại kiến trúc:

- `EfficientNetB0(include_top=False, weights=None)`.
- `GlobalAveragePooling2D`.
- `Dropout(0.2)`.
- `Dense(2, activation='softmax')`.
- Nạp trọng số bằng `model.load_weights('buiban.h5')`.

Đầu vào của mỗi patch:

- Kích thước `224 x 224 x 3`.
- Chuyển từ BGR sang RGB.
- Dạng `float32`.
- Giữ thang pixel `0-255` để phù hợp với pipeline EfficientNet hiện tại.

Khác với tài liệu cũ, code hiện tại không còn tiền xử lý patch bằng grayscale, Gaussian Blur, CLAHE hoặc normalize `0-1` trong luồng chính.

## 10. Chia patch và tính tỷ lệ bẩn

Vùng tấm pin sau khi crop/warp được chuẩn hóa về:

```text
896 x 1792 pixel
```

Sau đó chia thành:

```text
8 hàng x 4 cột = 32 patch
Mỗi patch: 224 x 224 pixel
```

Mỗi patch được phân loại thành:

- `clean`: nhãn `sach`, confidence đạt ngưỡng.
- `dirty`: nhãn `ban`, confidence đạt ngưỡng.
- `uncertain`: chưa đủ confidence.
- `noise`: ban đầu bị nhận là bẩn nhưng bị bộ lọc nhiễu loại bỏ.

Công thức:

```text
Tỷ lệ bẩn = Số patch bẩn / 32
```

Luồng 2 lớp hiện tại chưa trừ patch `nopanel`; `nopanel_patch_count` được giữ bằng `0` để tương thích UI/API cũ. Bài toán "không có tấm pin" được xử lý bởi YOLOv8-Seg trước khi chạy CNN.

Bộ lọc nhiễu:

- Nếu số patch bẩn nhỏ hơn `2`, các patch đó được coi là nhiễu.
- `dirty_ratio` được đưa về `0.0`.
- UI debug đánh dấu patch đó là `N`.

Mục đích là tránh trường hợp một ô bị nhận nhầm làm hệ thống kích PLC không cần thiết.

## 11. YOLO Detect cho vật cản và lỗi bề mặt

Model:

```text
Solar.pt
```

Desktop app tải model này bằng `ultralytics.YOLO`. Trong luồng hiện tại, YOLO Detect chạy với confidence `0.20`.

Các class đang được xử lý để kích vệ sinh:

- `leaf` hoặc `lá cây`.
- `bird_drop` hoặc `phân chim`.

Class `crack` / `nứt vỡ` đang có dấu vết trong code và mobile app có sẵn luồng thông báo, nhưng trong desktop app hiện tại phần xử lý crack đang bị comment/tắt:

```text
Crack=DISABLED
```

Vì vậy tài liệu này xem nứt/vỡ là hướng mở rộng hoặc chức năng chưa bật ổn định, không phải nhánh vận hành chính hiện tại.

## 12. Điều kiện quyết định vệ sinh

Hệ thống quyết định cần vệ sinh khi một trong các điều kiện đúng:

- YOLO Detect phát hiện `leaf` / `lá cây`.
- YOLO Detect phát hiện `bird_drop` / `phân chim`.
- CNN kết luận nhãn chứa `ban`, confidence >= `MIN_CONFIDENCE` và tỷ lệ bẩn >= `DIRT_AREA_THRESHOLD`.

Hệ thống không kích vệ sinh theo nhánh CNN khi:

- YOLOv8-Seg không phát hiện tấm pin.
- CNN bị bỏ qua vì `no_panel`.
- Tỷ lệ bẩn bị bộ lọc nhiễu đưa về 0.
- PLC chưa kết nối.
- Đang trong thời gian cooldown.

`DIRT_AREA_THRESHOLD` hiện mặc định là `0.0`. Điều này phù hợp khi thử nghiệm, nhưng khi vận hành thực tế nên đặt ngưỡng cao hơn, ví dụ 10-30% tùy dữ liệu và cơ cấu vệ sinh.

## 13. Điều khiển PLC Siemens S7

Dự án dùng thư viện `python-snap7`. Nếu không import được Snap7, phần PLC bị tắt nhưng desktop app vẫn có thể chạy ở chế độ giám sát/demo.

Cấu hình PLC trong desktop:

```text
ENABLED:    True
IP:         192.168.0.1
Rack:       0
Slot:       1
DB number:  1
DB start:   0
DB size:    1 byte
```

Các bit điều khiển trong `PLCController.trigger_faults()`:

| Bit | Ý nghĩa |
|---|---|
| `DB1.DBX0.0` | Bụi bẩn/CNN báo cần vệ sinh |
| `DB1.DBX0.1` | Lá cây |
| `DB1.DBX0.2` | Phân chim |

Cách gửi lệnh thực tế:

```text
Đọc DB1
-> OR bit tương ứng lên 1
-> Ghi DB1 về PLC
-> Chờ khoảng 1 giây
-> Reset các bit về 0
```

`trigger_cleaning()` dùng cho nút vệ sinh thủ công và gọi `trigger_faults(has_dirt=True)`.

Lưu ý cấu hình: `web_monitor_fastapi.py` có `PLC_IP` mặc định là `192.168.1.1`, còn desktop có `192.168.0.1`. Khi web server được khởi động từ desktop, biến `APP_CONFIG_REF` được dùng để đồng bộ về cấu hình desktop. Nếu chạy web monitor độc lập, cần kiểm tra lại IP PLC.

## 14. Chế độ snapshot và xử lý định kỳ

Desktop app đang chạy theo cơ chế hybrid:

- Camera đọc frame liên tục để hiển thị và cấp frame cho web/mobile.
- AI không chạy trên mọi frame.
- AI chạy theo chu kỳ snapshot, mặc định `600 giây` tức 10 phút.

Khi đến chu kỳ:

- Lưu ảnh gốc vào `snapshots/`.
- Chạy YOLO Detect để tìm vật cản.
- Chạy YOLOv8-Seg để tìm vùng tấm pin.
- Crop/warp/tự xoay vùng tấm pin.
- Chạy CNN EfficientNet-B0 trên 32 patch.
- Cập nhật UI desktop, web status và mobile status.
- Nếu cần vệ sinh, gửi bit tương ứng đến PLC.
- Tự dọn ảnh cũ nếu thư mục snapshot vượt khoảng `1 GB`.

Các công cụ hỗ trợ thu thập và kiểm thử ảnh:

- `camera_capture.py`: chụp ảnh thủ công từ camera vào `captured_images/`.
- `test_segmentation.py`: chạy `panel 2.pt` trên ảnh trong `snapshots/`.
- `test_yolo_live.py`: xem camera live và test YOLO-Seg bằng phím.

## 15. Giao diện desktop

Desktop app dùng Tkinter theo phong cách SCADA/HMI. Chức năng chính:

- Đăng nhập bằng admin mặc định hoặc tài khoản đã được duyệt.
- Quản lý tài khoản đăng ký: duyệt, từ chối, xóa, sửa trạng thái, sửa vai trò.
- Xem camera/video.
- Start/stop giám sát.
- Tải model CNN và YOLO khi khởi động.
- Hiển thị nhãn AI, confidence và tỷ lệ bẩn.
- Hiển thị ảnh debug CNN patch và ảnh YOLO/panel.
- Kết nối/reconnect PLC.
- Kích vệ sinh thủ công.
- Đổi camera.
- Cài ngưỡng bẩn.
- Cài chu kỳ snapshot.
- Tự động khởi động FastAPI server sau khi hệ thống sẵn sàng.

Các biến trạng thái desktop cấp cho web gồm:

- `p_dirty`, `area_ratio`, `label_name`, `pred_probs`.
- `confidence`, `dirty_patch_count`, `valid_patch_count`.
- `cnn_active`, `panel_detected`.
- `yolo_clean_faults`, `yolo_crack_faults`.
- `last_snapshot_path`, `last_snapshot_time`, `next_snapshot`.
- `clean_count`, `plc_connected`, `plc_status`.
- `camera_id`, `dirt_threshold`, `snapshot_interval`, `plc_ip`.

## 16. Web monitor FastAPI

File chính:

```text
web_monitor_fastapi.py
```

Web server dùng FastAPI/Uvicorn, mặc định:

```text
http://localhost:5000
http://<IP máy chạy>:5000
```

FastAPI app hiện có version `2.5.0-FastAPI` và tắt Swagger/OpenAPI public (`docs_url=None`, `redoc_url=None`, `openapi_url=None`).

Chức năng chính:

- Trang đăng nhập `/login`.
- Trang đăng ký `/register`.
- Đăng xuất `/logout`.
- Dashboard web `/`.
- API trạng thái `/api/status`.
- API cấu hình `/api/settings`.
- API frame hiện tại `/api/current_frame`.
- API ảnh debug CNN `/api/cnn_patch_frame`.
- API ảnh debug YOLO/panel `/api/yolo_panel_frame`.
- MJPEG video `/video_feed`.
- API đổi chu kỳ snapshot `/api/snapshot_interval`.
- API reconnect PLC `/api/plc/reconnect`.
- API vệ sinh thủ công `/api/plc/manual_clean`.
- API start/stop hệ thống `/api/system/start`, `/api/system/stop`.
- Phục vụ snapshot qua `/snapshots/{filename}`.
- WebSocket realtime `/ws`.
- Quản lý tài khoản admin qua `/api/accounts`.

WebSocket đẩy trạng thái realtime cho dashboard. Client cũng có thể gửi command, backend đưa lệnh vào `command_queue` để desktop xử lý thread-safe.

## 17. Xác thực và tài khoản

Tài khoản được lưu tại:

```text
taikhoan/accounts.json
taikhoan/sessions.json
```

Cơ chế hiện tại:

- Admin mặc định lấy từ config/env: `admin/admin` nếu không đặt `WEB_USERNAME`, `WEB_PASSWORD`.
- Người dùng có thể đăng ký tài khoản mới.
- Tài khoản mới có trạng thái chờ duyệt.
- Admin có thể duyệt, từ chối, sửa, xóa tài khoản.
- Vai trò gồm `admin` và `user`.
- Password tài khoản đăng ký được hash SHA-256 với salt cố định `solarpanel2025`.
- Session cookie được lưu lại để mobile có thể duy trì đăng nhập sau khi server restart.
- Nếu tài khoản bị xóa hoặc bị từ chối, session liên quan sẽ bị loại bỏ.

Khuyến nghị khi triển khai thật:

- Đổi mật khẩu admin mặc định.
- Không hard-code salt trong mã nguồn.
- Dùng biến môi trường hoặc cơ chế secret an toàn hơn.
- Cân nhắc nâng cấp sang bcrypt/argon2 và thêm thời hạn session.

## 18. Ứng dụng mobile React Native / Expo

Thư mục:

```text
solar_clean_rn/
```

Stack hiện tại:

- Expo `52`.
- React Native `0.76.9`.
- React `18.3.1`.
- TypeScript.
- AsyncStorage.
- `@expo/vector-icons`.
- `expo-notifications`.
- HTTP API + WebSocket.

Server mặc định trong code:

```text
http://ctut.clean.id.vn
```

README cũng ghi app được pin vào domain này và không còn hiện cấu hình server ở màn hình login.

Chức năng chính:

- Đăng nhập/đăng xuất.
- Lưu session cookie.
- Đăng ký tài khoản.
- Dashboard hai tab `Monitor` và `Control`.
- Lấy trạng thái realtime qua WebSocket, fallback polling REST mỗi 2 giây nếu WebSocket lỗi.
- Xem frame hiện tại qua `/api/current_frame`.
- Xem ảnh debug CNN qua `/api/cnn_patch_frame`.
- Xem ảnh YOLO/panel qua `/api/yolo_panel_frame`.
- Xem snapshot gần nhất.
- Hiển thị KPI: CNN, PLC, FPS, số lần vệ sinh.
- Hiển thị xác suất `Sạch` / `Bẩn`.
- Start/stop hệ thống.
- Reconnect PLC.
- Manual clean.
- Cài PLC IP, camera ID, chu kỳ snapshot và ngưỡng bẩn.
- Có sẵn luồng notification khi `yoloCrackFaults` xuất hiện, dù desktop hiện chưa bật crack detection.

## 19. API chính cho web/mobile

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/login` | Trang đăng nhập |
| `POST` | `/login` | Đăng nhập form, nhận session cookie |
| `GET` | `/register` | Trang đăng ký |
| `POST` | `/register` | Đăng ký qua form web |
| `POST` | `/api/register` | Đăng ký qua API mobile |
| `GET` | `/logout` | Đăng xuất |
| `GET` | `/api/status` | Lấy trạng thái hệ thống |
| `GET` | `/api/settings` | Lấy cấu hình hiện tại |
| `POST` | `/api/settings` | Cập nhật camera, PLC IP, ngưỡng bẩn |
| `POST` | `/api/snapshot_interval` | Cập nhật chu kỳ snapshot |
| `POST` | `/api/plc/reconnect` | Gửi lệnh reconnect PLC |
| `POST` | `/api/plc/manual_clean` | Gửi lệnh vệ sinh thủ công |
| `POST` | `/api/system/start` | Start giám sát |
| `POST` | `/api/system/stop` | Stop giám sát |
| `GET` | `/api/current_frame` | Lấy frame hiện tại dạng JPEG |
| `GET` | `/api/cnn_patch_frame` | Lấy ảnh debug CNN patch |
| `GET` | `/api/yolo_panel_frame` | Lấy ảnh debug YOLO/panel |
| `GET` | `/video_feed` | Xem video MJPEG |
| `GET` | `/snapshots/{filename}` | Xem ảnh snapshot |
| `GET` | `/static/{filename}` | Chỉ phục vụ static file trong whitelist |
| `WS` | `/ws` | Realtime status và command |

Các API vận hành yêu cầu xác thực bằng session cookie hoặc Basic Auth fallback. Static file bị whitelist để tránh lộ source code.

## 20. Đóng gói và artifact

Dự án có nhiều file `.spec`. File đáng chú ý nhất là:

```text
SolarClean_Complete.spec
```

File này đưa vào gói:

- `buiban.h5`.
- `labels_2classes.txt`.
- `panel 2.pt`.
- `Solar.pt`.
- `web_monitor_fastapi.py`.
- `ctut.webp`.
- `templates/`.
- `taikhoan/`.
- `snap7.dll` nếu tìm thấy.

Các artifact hiện có:

- `dist/SolarClean_Complete/`.
- `dist/SolarClean_Final/`.
- `build/SolarClean_Complete/`, `build/SolarClean_Final/`.
- `SolarClean.apk`, `app-release.apk`, `apk/app-release.apk`.
- `SolarClean_APKs.zip`.

Lưu ý: các thư mục `dist/` và `build/` có nhiều file runtime lớn, không nên xem là nguồn chính để chỉnh sửa.

## 21. Dependency hiện tại

`requirements.txt` ở thư mục gốc đang ghi:

```text
opencv-python
numpy
Pillow
fastapi
uvicorn
python-multipart
tflite-runtime
python-snap7
```

Tuy nhiên luồng chính hiện tại còn cần:

- `tensorflow` để dựng EfficientNet-B0 và nạp `buiban.h5`.
- `ultralytics` để chạy `panel 2.pt` và `Solar.pt`.
- `torch`/`torchvision` theo dependency của Ultralytics.

Điều này nghĩa là `requirements.txt` chưa phản ánh đầy đủ pipeline hiện tại. Khi triển khai lại trên máy mới, cần cập nhật dependency hoặc dùng môi trường đã có sẵn trong `venv/`.

## 22. Quy trình vận hành đề xuất

1. Kiểm tra camera, PLC và mạng LAN.
2. Đảm bảo các model nằm đúng thư mục:
   - `buiban.h5`
   - `labels_2classes.txt`
   - `panel 2.pt`
   - `Solar.pt`
3. Chạy desktop app:

```text
python solar_panel_plc_auto_tflite.py
```

4. Đăng nhập bằng admin hoặc tài khoản đã duyệt.
5. Kiểm tra log tải model CNN, YOLO Detect và Panel-Seg.
6. Kiểm tra PLC đã kết nối đúng IP.
7. Chọn camera đúng.
8. Cài ngưỡng bẩn và chu kỳ snapshot.
9. Bấm Start để giám sát.
10. Mở web monitor tại `http://localhost:5000` hoặc truy cập từ máy khác trong LAN.
11. Dùng mobile app để theo dõi, start/stop, reconnect PLC hoặc manual clean.
12. Kiểm tra ảnh trong `snapshots/` khi cần đối chiếu kết quả AI.

## 23. Điểm mạnh của dự án

- Đã có desktop app hoàn chỉnh, không chỉ là model AI riêng lẻ.
- Có tích hợp PLC Siemens S7 thực tế qua Snap7.
- Có AI hai tầng: YOLO-Seg tìm tấm pin, CNN phân loại sạch/bẩn.
- Có YOLO Detect để nhận diện vật cản như lá cây và phân chim.
- Có cơ chế chia 32 patch để định lượng mức độ bẩn cục bộ.
- Có cơ chế lọc nhiễu khi chỉ một patch bị nhận nhầm là bẩn.
- Có cooldown để tránh kích PLC liên tục.
- Có web monitor FastAPI, WebSocket và API cho mobile.
- Có app mobile React Native/Expo kết nối cùng backend.
- Có quản lý tài khoản và duyệt người dùng.
- Có snapshot định kỳ để lưu bằng chứng vận hành.
- Có cấu hình đóng gói PyInstaller tương đối đầy đủ.

## 24. Hạn chế và điểm cần chú ý

- Tên class `DirtDetectorTFLite` và một số thông báo lỗi vẫn nói TFLite, nhưng luồng chính đang dùng Keras `.h5`.
- `requirements.txt` chưa cập nhật đủ TensorFlow, Ultralytics và Torch.
- `DIRT_AREA_THRESHOLD` mặc định là `0.0`, nên cần đặt lại khi vận hành thật.
- Cấu hình PLC mặc định của desktop và web độc lập đang khác IP.
- `TRIGGER_DURATION` trong config là `5.0`, nhưng `trigger_faults()` hiện reset bit sau khoảng `1.0` giây.
- Crack/nứt vỡ đã có dấu vết trong code mobile và UI, nhưng nhánh desktop đang tắt.
- Chưa thấy cơ sở dữ liệu lịch sử sự kiện có cấu trúc; hiện chủ yếu dựa vào trạng thái runtime và ảnh snapshot.
- `accounts.json` và `sessions.json` đang nằm trong thư mục dự án/runtime, cần bảo vệ khi triển khai thật.
- Tài liệu/README trong `SolarClean/` còn mô tả model TFLite 3 lớp cũ, không khớp hoàn toàn với luồng mới.
- Workspace hiện tại không phải git repository, nên khó truy vết lịch sử thay đổi bằng commit.

## 25. Đề xuất cải tiến tiếp theo

Ưu tiên kỹ thuật:

- Đổi tên `DirtDetectorTFLite` thành `PatchDirtDetector` hoặc `EfficientNetPatchDetector`.
- Cập nhật toàn bộ thông báo "TFLite" trong UI/log nếu không còn dùng TFLite.
- Cập nhật `requirements.txt` theo pipeline thật.
- Chuẩn hóa một nguồn cấu hình PLC duy nhất.
- Làm rõ `TRIGGER_DURATION`: hoặc dùng đúng config, hoặc đổi tên thành pulse duration thực tế.
- Bật lại hoặc loại bỏ rõ ràng nhánh crack/nứt vỡ để tránh UI/mobile hiển thị chức năng chưa có.
- Lưu lịch sử sự kiện vào JSON/SQLite: thời gian, snapshot, kết quả AI, lỗi YOLO, hành động PLC.
- Thêm màn hình lịch sử snapshot/sự kiện trên web/mobile.
- Đặt ngưỡng bẩn mặc định thực tế hơn.
- Viết script kiểm tra nhanh camera/model/PLC trước vận hành.

Ưu tiên AI:

- Thu thêm ảnh thật ở nhiều điều kiện ánh sáng.
- Tách bộ dữ liệu train/validation/test rõ ràng.
- Đánh giá model bằng accuracy, precision, recall, F1-score và confusion matrix.
- Kiểm tra false positive để tránh vệ sinh quá nhiều.
- Kiểm tra false negative để tránh bỏ sót tấm pin bẩn.
- Nếu bật crack detection, ưu tiên recall cao vì bỏ sót lỗi vật lý có rủi ro bảo trì.

## 26. Bộ nhãn đề xuất khi mở rộng

Nếu muốn gom nhận diện vào một hệ thống nhãn rõ ràng hơn, có thể dùng:

```text
0 sach
1 bui_ban
2 la_cay
3 phan_chim
4 nut_vo
5 nopanel
```

Bảng hành động:

| Kết quả AI | Hành động |
|---|---|
| `sach` | Không vệ sinh |
| `bui_ban` | Vệ sinh nếu tỷ lệ vượt ngưỡng |
| `la_cay` | Vệ sinh ngay hoặc theo quy tắc ưu tiên |
| `phan_chim` | Vệ sinh ngay, ưu tiên cao |
| `nut_vo` | Cảnh báo bảo trì, lưu snapshot, không xem là bụi |
| `nopanel` | Bỏ qua, không kích PLC |

Logic ưu tiên đề xuất:

```text
Nếu không phát hiện tấm pin:
    Bỏ qua CNN và không kích PLC theo nhánh bụi
Ngược lại nếu phát hiện nứt/vỡ:
    Cảnh báo bảo trì và lưu sự kiện
Ngược lại nếu phát hiện phân chim:
    Kích PLC vệ sinh
Ngược lại nếu phát hiện lá cây:
    Kích PLC vệ sinh
Ngược lại nếu tỷ lệ bụi bẩn >= ngưỡng:
    Kích PLC vệ sinh
Ngược lại:
    Không vệ sinh
```

## 27. Kết luận

Dự án hiện đã vượt mức demo AI đơn giản và có cấu trúc gần với một hệ thống giám sát/vận hành thực tế. Desktop app là lõi điều khiển: đọc camera, chạy YOLOv8-Seg để xác định vùng tấm pin, chạy EfficientNet-B0 để phân loại 32 patch sạch/bẩn, chạy YOLO Detect để phát hiện lá cây/phân chim, sau đó quyết định kích PLC Siemens S7.

Web monitor FastAPI và mobile app React Native giúp hệ thống có khả năng giám sát từ xa, điều khiển start/stop, reconnect PLC, manual clean, cấu hình ngưỡng và xem snapshot. Thư mục snapshot và các công cụ test cho thấy dự án đã được chạy với ảnh thực tế, không chỉ tồn tại ở mức mã nguồn.

Việc nên làm tiếp là chuẩn hóa lại tên gọi quanh TFLite/Keras, cập nhật dependency, đồng bộ cấu hình PLC, đặt ngưỡng vận hành hợp lý, lưu lịch sử sự kiện và quyết định rõ trạng thái của chức năng phát hiện nứt/vỡ. Khi các phần này được hoàn thiện, dự án có nền tảng tốt để triển khai như một hệ thống vệ sinh và giám sát tấm pin mặt trời thông minh.
