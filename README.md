# TeaserPaste CLI (`tp`)
**TeaserPaste CLI** (`tp`) là một công cụ dòng lệnh mạnh mẽ giúp bạn tương tác với dịch vụ [TeaserPaste](https://paste.teaserverse.online) trực tiếp từ terminal. Dễ dàng xem, tạo, và quản lý snippets mà không cần rời khỏi môi trường làm việc của bạn.

**Phiên bản hiện tại:** 0.4.0 (Alpha) - *Vui lòng lưu ý rằng các tính năng và cú pháp có thể thay đổi.*

# Cài đặt

- Yêu cầu [Node.js](https://nodejs.org/en/download) v18 trở lên.
```
npm install -g teaserpaste-cli
```

# Cấu hình lần đầu
Để không phải gõ API key mỗi lần, hãy lưu private key của bạn một lần duy nhất:
```
tp config set token "priv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

# Hướng dẫn sử dụng nhanh
Tạo Snippet
```
# Cách thân thiện nhất (CLI sẽ hỏi bạn từng bước)
tp create -i

# Cách chuyên nghiệp (tạo snippet từ nội dung file)
cat my_script.js | tp create --title "My Script" --language "javascript"

# Cách nhanh nhất (cung cấp đủ tham số)
tp create --title "Ghi chú" --content "Nội dung ghi chú"
```

# Xem và Quản lý Snippet
```
# Liệt kê các snippet của bạn
tp list

# Xem chi tiết một snippet
tp view <snippet_id>

# Chỉ lấy nội dung thô (để dùng trong script)
tp view <snippet_id> --raw

# Sao chép nội dung vào clipboard
tp view <snippet_id> --copy

# Mở snippet trên trình duyệt
tp view <snippet_id> --web

# Tìm kiếm public snippets
tp search "javascript example"

# Xóa một snippet
tp delete <snippet_id>
```

# Trợ giúp
```
# Để xem tất cả các lệnh và tùy chọn có sẵn:
tp --help

# Để xem phiên bản CLI hiện tại:
tp --version
```

> Tài liệu chi tiết: https://docs.teaserverse.online/triple-tool/teaserpaste/cli

Giấy phép
[MIT](LICENSE.txt)