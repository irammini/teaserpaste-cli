# TeaserPaste CLI (`tp`)

[](https://www.npmjs.com/package/teaserpaste-cli)

**TeaserPaste CLI (`tp`)** là một công cụ dòng lệnh mạnh mẽ giúp bạn tương tác với dịch vụ [TeaserPaste](https://paste.teaserverse.online) trực tiếp từ terminal. Dễ dàng xem, tạo và quản lý snippets mà không cần rời khỏi môi trường làm việc của bạn.

**Phiên bản hiện tại:** 0.1.3 (Alpha) - Vui lòng lưu ý rằng các tính năng và cú pháp có thể thay đổi.

## Cài đặt

Để cài đặt `teaserpaste-cli` trên toàn hệ thống, hãy sử dụng `npm`:

```bash
npm install -g teaserpaste-cli
```

## Hướng dẫn sử dụng

### 1\. Xem Snippet (`view`)

Hiển thị nội dung của một snippet.

**Cú pháp:** `tp view <id> [options]`

**Ví dụ:**

```bash
# Xem một snippet public
tp view publicSnippetID

# Xem snippet private của bạn (yêu cầu private key)
tp view privateSnippetID --token "priv_xxxxxxxx"

# Xem snippet unlisted có mật khẩu của bạn (tự động bỏ qua mật khẩu)
tp view unlistedSnippetID --token "priv_xxxxxxxx"
```

### 2\. Xem thông tin người dùng (`user view`)

Xem thông tin công khai của một người dùng bằng public key của họ.

**Cú pháp:** `tp user view --token <public-token>`

**Ví dụ:**

```bash
tp user view --token "pub_yyyyyyyy"
```

### 3\. Tạo Snippet (`create`)

Tạo một snippet mới. Lệnh này yêu cầu **private key**.

**Cú pháp:** `tp create --token <private-token> --title "..." --content "..." [options]`

**Các tùy chọn:**

  * `--language <lang>`: Ngôn ngữ lập trình (mặc định: `plaintext`).
  * `--visibility <public|unlisted|private>`: Chế độ hiển thị (mặc định: `unlisted`).
  * `--password <pass>`: Mật khẩu cho snippet `unlisted`.
  * `--tags "tag1,tag2"`: Các tag phân cách bởi dấu phẩy.

**Ví dụ:**

```bash
# Tạo một snippet unlisted đơn giản
tp create --token "priv_xxxxxxxx" --title "Ghi chú họp" --content "Nội dung cuộc họp..."

# Tạo một snippet public, ngôn ngữ javascript và có tag
tp create --token "priv_xxxxxxxx" --title "Ví dụ JS" --content "console.log('Hello NPM!')" --language "javascript" --visibility "public" --tags "js,example"
```

### 4\. Trợ giúp

Để xem tất cả các lệnh và tùy chọn có sẵn:

```bash
tp --help
```

> Tài liệu: https://docs.teaserverse.online/triple-tool/teaserpaste/cli

## Giấy phép

[MIT](LICENSE)