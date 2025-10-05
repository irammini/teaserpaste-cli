#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { default: fetch } = require('node-fetch');

// --- CẤU HÌNH ---
const BASE_API_URL = 'https://paste-api.teaserverse.online';

// --- HÀM GỌI API ---
async function apiRequest(endpoint, method, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
        if (data.requiresPassword) {
             throw new Error(`Snippet yêu cầu mật khẩu. Vui lòng cung cấp với --password "pass"`);
        }
        throw new Error(data.error || `Lỗi không xác định (${response.status})`);
    }

    return data;
}

// --- LOGIC HIỂN THỊ ---
function printSnippet(snippet) {
    console.log('\n=====================================');
    console.log(`TEASERPASTE SNIPPET: ${snippet.id}`);
    console.log('=====================================');
    console.log(`Tiêu đề: ${snippet.title}`);
    if (snippet.isVerified) console.log("⭐ VERIFIED SNIPPET");
    if (snippet.passwordBypassed) console.log("🔑 Đã bypass mật khẩu vì bạn là chủ sở hữu.");
    console.log(`Người tạo: ${snippet.creatorName}`);
    console.log(`Ngôn ngữ: ${snippet.language}`);
    console.log(`Tags: ${(snippet.tags || []).join(', ')}`);
    console.log(`Visibility: ${snippet.visibility}`);
    console.log('-------------------------------------');
    console.log(snippet.content);
    console.log('-------------------------------------\n');
}

function printUser(user) {
    console.log('\n=====================================');
    console.log(`USER PROFILE: ${user.userId}`);
    console.log('=====================================');
    console.log(`Display Name: ${user.displayName}`);
    console.log(`Photo URL: ${user.photoURL || 'N/A'}`);
    console.log('-------------------------------------\n');
}

// --- CÁC LỆNH ---
async function viewSnippet(id, token, password) {
    try {
        const snippet = await apiRequest('/getSnippet', 'POST', { snippetId: id, password }, token);
        printSnippet(snippet);
    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

async function viewUser(token) {
     if (!token) {
        console.error(`\n❌ Lỗi: Lệnh 'user view' yêu cầu --token.\n`);
        return;
    }
    try {
        const user = await apiRequest('/getUserInfo', 'GET', null, token);
        printUser(user);
    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

async function createSnippet(token, args) {
     if (!token) {
        console.error(`\n❌ Lỗi: Lệnh 'create' yêu cầu --token.\n`);
        return;
    }
    try {
        // Lấy content từ stdin hoặc file (chưa implement, tạm thời lấy từ tham số)
        const contentIndex = args.indexOf('--content');
        if (contentIndex === -1 || !args[contentIndex + 1]) {
             console.error(`\n❌ Lỗi: Thiếu tham số --content "your content".\n`);
             return;
        }
        
        const snippetData = {
            title: args[args.indexOf('--title') + 1] || 'Untitled',
            content: args[contentIndex + 1],
            language: args[args.indexOf('--language') + 1] || 'plaintext',
            visibility: args[args.indexOf('--visibility') + 1] || 'unlisted',
            password: args[args.indexOf('--password') + 1] || '',
            tags: (args[args.indexOf('--tags') + 1] || '').split(',').filter(Boolean),
        };

        const newSnippet = await apiRequest('/createSnippet', 'POST', snippetData, token);
        console.log(`\n✅ Đã tạo snippet thành công!`);
        console.log(`ID: ${newSnippet.id}\n`);

    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

// --- XỬ LÝ DÒNG LỆNH ---
function parseArgs(argv) {
    const args = {};
    let lastKey = '_';
    args[lastKey] = [];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            lastKey = arg.substring(2);
            args[lastKey] = argv[i + 1] ? argv[i + 1] : true;
            i++; 
        } else {
            args['_'].push(arg);
        }
    }
    return args;
}

function showHelp() {
    console.log(`
--- CLI TeaserPaste (v0.1.3) ---

Sử dụng: 
  tp <lệnh> [tham số] [--token <key>]

Các lệnh:
  view <id> [--token <private_key>] [--password <pass>]
    Xem một snippet. Dùng private key để xem snippet private/unlisted của bạn và bypass mật khẩu.

  user view --token <public_key>
    Xem thông tin public của người dùng bằng public key.

  create --token <private_key> --title "Tiêu đề" --content "Nội dung" [tùy chọn]
    Tạo một snippet mới. Yêu cầu private key.
    Tùy chọn cho 'create':
      --language <lang>   (mặc định: plaintext)
      --visibility <vis>  (public|unlisted|private, mặc định: unlisted)
      --password <pass>   (nếu visibility là unlisted)
      --tags "tag1,tag2"  (phân cách bởi dấu phẩy)

  --help, -h      Hiển thị trợ giúp
  --version       Hiển thị phiên bản
    `);
}

async function main() {
    const rawArgs = process.argv.slice(2);
    if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
        showHelp();
        return;
    }
    if (rawArgs.includes('--version')) {
        console.log('0.1.3 (Alpha)');
        return;
    }

    const args = parseArgs(rawArgs);
    const [command, subCommand] = args['_'];
    const token = args.token || null;

    switch (command) {
        case 'view':
            await viewSnippet(subCommand, token, args.password);
            break;
        case 'user':
            if (subCommand === 'view') {
                await viewUser(token);
            } else {
                console.error(`\n❌ Lỗi: Lệnh con '${subCommand}' không hợp lệ cho 'user'.\n`);
            }
            break;
        case 'create':
            await createSnippet(token, rawArgs);
            break;
        default:
            console.error(`\n❌ Lỗi: Lệnh '${command}' không tồn tại.\n`);
            showHelp();
    }
}

main();