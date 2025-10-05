#!/usr/bin/env node
const { default: fetch } = require('node-fetch');
const ConfigManager = require('./config-manager');
const inquirer = require('inquirer');

const BASE_API_URL = 'https://paste-api.teaserverse.online';

// --- HÀM TIỆN ÍCH ---
function readFromStdin() {
    return new Promise(resolve => {
        let data = '';
        process.stdin.on('readable', () => {
            let chunk;
            while (null !== (chunk = process.stdin.read())) {
                data += chunk;
            }
        });
        process.stdin.on('end', () => resolve(data.trim()));
    });
}

async function apiRequest(endpoint, method, body, token = null) {
    const finalToken = token || ConfigManager.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (finalToken) {
        headers['Authorization'] = `Bearer ${finalToken}`;
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
    try {
        const user = await apiRequest('/getUserInfo', 'GET', null, token);
        printUser(user);
    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

async function createSnippet(token, args) {
    try {
        let snippetData = {};

        // Ưu tiên 1: Đọc từ stdin nếu có
        if (!process.stdin.isTTY) {
            console.log("Đang đọc nội dung từ stdin...");
            const contentFromStdin = await readFromStdin();
            snippetData = {
                title: args.title || 'Snippet from stdin',
                content: contentFromStdin,
                language: args.language || 'plaintext',
                visibility: args.visibility || 'unlisted',
                password: args.password || '',
                tags: (args.tags || '').split(',').filter(Boolean),
            };
        }
        // Ưu tiên 2: Chế độ tương tác
        else if (args.interactive) {
             const answers = await inquirer.prompt([
                { name: 'title', message: 'Tiêu đề snippet:', default: 'Untitled' },
                { name: 'language', message: 'Ngôn ngữ:', default: 'plaintext' },
                { name: 'visibility', type: 'list', message: 'Chế độ hiển thị:', choices: ['unlisted', 'public', 'private'], default: 'unlisted' },
                { name: 'password', message: 'Mật khẩu (nếu unlisted):', when: (ans) => ans.visibility === 'unlisted' },
                { name: 'tags', message: 'Tags (phân cách bởi dấu phẩy):' },
                { name: 'content', type: 'editor', message: 'Nhập nội dung (Lưu & đóng editor để tiếp tục):' }
             ]);
             snippetData = { ...answers, tags: (answers.tags || '').split(',').filter(Boolean) };
        }
        // Ưu tiên 3: Đọc từ tham số dòng lệnh
        else {
             if (!args.title || !args.content) {
                console.error(`\n❌ Lỗi: Thiếu --title hoặc --content. Dùng 'tp create -i' để vào chế độ tương tác.\n`);
                return;
             }
             snippetData = {
                title: args.title,
                content: args.content,
                language: args.language || 'plaintext',
                visibility: args.visibility || 'unlisted',
                password: args.password || '',
                tags: (args.tags || '').split(',').filter(Boolean),
             };
        }

        const newSnippet = await apiRequest('/createSnippet', 'POST', snippetData, token);
        console.log(`\n✅ Đã tạo snippet thành công!`);
        console.log(`ID: ${newSnippet.id}\n`);

    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

async function listSnippets(token, args) {
    try {
        const params = new URLSearchParams();
        if (args.limit) params.append('limit', args.limit);
        if (args.visibility) params.append('visibility', args.visibility);

        const endpoint = `/listSnippets?${params.toString()}`;
        const snippets = await apiRequest(endpoint, 'GET', null, token);

        if (snippets.length === 0) {
            console.log("\nKhông tìm thấy snippet nào khớp với tiêu chí.\n");
            return;
        }

        console.log('\n--- DANH SÁCH SNIPPET CỦA BẠN ---');
        console.log(
            'ID'.padEnd(22) +
            'Tiêu đề'.padEnd(35) +
            'Visibility'.padEnd(15) +
            'Ngôn ngữ'
        );
        console.log('-'.repeat(90));

        snippets.forEach(s => {
            const title = s.title.length > 30 ? s.title.substring(0, 27) + '...' : s.title;
            console.log(
                s.id.padEnd(22) +
                title.padEnd(35) +
                s.visibility.padEnd(15) +
                s.language
            );
        });
        console.log('-'.repeat(90) + '\n');
    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

function manageConfig(args) { /* ... Giữ nguyên như phiên bản trước ... */ }

// --- XỬ LÝ DÒNG LỆNH ---
function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
                args[key] = argv[i + 1];
                i++;
            } else {
                args[key] = true;
            }
        } else if (arg.startsWith('-')) {
             const key = arg.substring(1);
             if (key === 'i') args['interactive'] = true;
        }
        else {
            args['_'].push(arg);
        }
    }
    return args;
}

function showHelp() {
    console.log(`
--- CLI TeaserPaste (v0.3.0) ---

Sử dụng: 
  tp <lệnh> [tham số]

Các lệnh:
  view <id> [--password <pass>]
    Xem một snippet.

  list [--limit 20] [--visibility <vis>]
    Liệt kê các snippet của bạn.
    Ví dụ: tp list --visibility private

  user view [--token <public_key>]
    Xem thông tin người dùng.

  create [tùy chọn]
    Tạo snippet mới. Có 3 cách dùng:
    1. Dùng tham số: tp create --title "..." --content "..."
    2. Tương tác:    tp create -i
    3. Dùng stdin:   cat file.js | tp create --title "Từ file"

  config <set|get|clear> token [value]
    Quản lý cấu hình, lưu private key.

  --help, -h      Hiển thị trợ giúp
  --version       Hiển thị phiên bản
    `);
}

async function main() {
    const rawArgs = process.argv.slice(2);
    if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) return showHelp();
    if (rawArgs.includes('--version')) return console.log('0.3.0');

    const args = parseArgs(rawArgs);
    const [command, ...subArgs] = args['_'];
    const token = args.token || null;

    switch (command) {
        case 'view':
            await viewSnippet(subArgs[0], token, args.password);
            break;
        case 'list':
            await listSnippets(token, args);
            break;
        case 'user':
            if (subArgs[0] === 'view') await viewUser(token || args.token);
            else console.error(`Lệnh con không hợp lệ cho 'user'.`);
            break;
        case 'create':
            await createSnippet(token, args);
            break;
        case 'config':
            manageConfig(subArgs);
            break;
        default:
            console.error(`\n❌ Lỗi: Lệnh '${command}' không tồn tại.\n`);
            showHelp();
    }
}

main();
