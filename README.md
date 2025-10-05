# TeaserPaste CLI (`tp`)
TeaserPaste CLI (`tp`) là một công cụ dòng lệnh mạnh mẽ giúp bạn tương tác với dịch vụ [TeaserPaste](https://paste.teaserverse.online) trực tiếp từ terminal. Dễ dàng xem, tạo, liệt kê và quản lý snippets mà không cần rời khỏi môi-trường-làm-việc của bạn.

Phiên bản hiện tại: 0.3.0 (Alpha) - Vui lòng lưu ý rằng các tính năng và cú pháp có thể thay đổi.

Cài đặt
Để cài đặt `teaserpaste-cli` trên toàn hệ thống, hãy sử dụng npm:
```
npm install -g teaserpaste-cli
```

**Hướng dẫn sử dụng**
1. Cấu hình (config)
Để không phải gõ `--token` mỗi lần, bạn hãy lưu private key của mình một lần duy nhất.

Cú pháp: `tp config set token <private_token>`

Ví dụ:
```
tp config set token "priv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**2. Tạo Snippet (create)**

Hỗ trợ nhiều cách tạo snippet linh hoạt. Lệnh này sẽ tự động dùng token bạn đã lưu.

Cú pháp: `tp create [options]`

Ví dụ:
```
# Tạo nhanh bằng các tham số
tp create --title "Ghi chú họp" --content "Nội dung cuộc họp..."

# Tạo từ nội dung file (siêu tiện!)
cat my-script.js | tp create --title "My Script" --language "javascript"

# Tạo bằng chế độ tương tác (dễ sử dụng)
tp create -i
```

**3. Liệt kê Snippets (list)**

Xem danh sách các snippet bạn đã tạo.

Cú pháp: `tp list [options]`

Ví dụ:
```
# Liệt kê 20 snippet mới nhất
tp list

# Liệt kê 5 snippet private mới nhất
tp list --visibility private --limit 5
```

**4. Xem Snippet (view)**

Hiển thị nội dung của một snippet. Lệnh này sẽ tự động dùng token đã lưu để xem snippet private và bỏ qua mật khẩu.

Cú pháp: `tp view <id> [options]`

Ví dụ:
```
# Xem một snippet public

tp view publicSnippetID

# Xem snippet private của bạn (không cần --token nếu đã config)
tp view privateSnippetID
```

**5. Các lệnh khác**
```
# Xem thông tin người dùng bằng public key
tp user view --token "pub_yyyyyyyy"

# Xem tất cả các lệnh và tùy chọn
tp --help
```

Tính năng nổi bật
Tự động cập nhật: CLI sẽ tự động thông báo khi có phiên bản mới trên NPM.

Gỡ lỗi: Sử dụng cờ --debug với bất kỳ lệnh nào để xem log chi tiết.

Hỗ trợ Stdin & Chế độ tương tác: Giúp việc tạo snippet trở nên cực kỳ linh hoạt.

> Tài liệu chi tiết: https://docs.teaserverse.online/triple-tool/teaserpaste/cli

Giấy phép
[MIT](LICENSE.txt)