#!/usr/bin/env node
const { default: fetch } = require('node-fetch');
const ConfigManager = require('./config-manager');
const logger = require('./logger');
const pkg = require('./package.json');

const BASE_API_URL = 'https://paste-api.teaserverse.online';

function readFromStdin() {
    return new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => {
            let chunk;
            while ((chunk = process.stdin.read()) !== null) {
                data += chunk;
            }
        });
        process.stdin.on('end', () => {
            resolve(data.trim());
        });
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
        const isInteractive = args.includes('-i') || args.includes('--interactive');
        const hasContentFlag = args.includes('--content');

        if (isInteractive) {
            const { default: inquirer } = await import('inquirer');
            const answers = await inquirer.prompt([
                { type: 'input', name: 'title', message: 'Tiêu đề snippet:', default: 'Untitled' },
                { type: 'input', name: 'language', message: 'Ngôn ngữ (bỏ trống cho plaintext):', default: 'plaintext' },
                { type: 'list', name: 'visibility', message: 'Chế độ hiển thị:', choices: ['unlisted', 'public', 'private'], default: 'unlisted' },
                { type: 'password', name: 'password', message: 'Đặt mật khẩu (bỏ trống nếu không cần):', mask: '*', when: (ans) => ans.visibility === 'unlisted' },
                { type: 'editor', name: 'content', message: 'Nhập nội dung (lưu và đóng editor khi xong):' }
            ]);
            snippetData = answers;
        } else if (!process.stdin.isTTY && !hasContentFlag) {
            snippetData.content = await readFromStdin();
            const parsedArgs = parseArgs(args);
            snippetData.title = parsedArgs.title || 'Untitled';
            snippetData.language = parsedArgs.language || 'plaintext';
            snippetData.visibility = parsedArgs.visibility || 'unlisted';
            snippetData.password = parsedArgs.password || '';
            snippetData.tags = (parsedArgs.tags || '').split(',').filter(Boolean);
        } else {
            const parsedArgs = parseArgs(args);
            if (!parsedArgs.title || !parsedArgs.content) {
                console.error(`\n❌ Lỗi: Thiếu tham số --title hoặc --content. Dùng -i để vào chế độ tương tác.\n`);
                return;
            }
            snippetData = parsedArgs;
            snippetData.tags = (parsedArgs.tags || '').split(',').filter(Boolean);
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
        const parsedArgs = parseArgs(args);
        const snippets = await apiRequest('/listSnippets', 'POST', {
            limit: parsedArgs.limit ? parseInt(parsedArgs.limit, 10) : 20,
            visibility: parsedArgs.visibility
        }, token);

        if (!snippets || snippets.length === 0) {
            console.log('\nKhông tìm thấy snippet nào.\n');
            return;
        }

        console.table(snippets.map(s => ({
            ID: s.id,
            TITLE: s.title,
            VISIBILITY: s.visibility,
            LANGUAGE: s.language,
        })));
    } catch (error) {
        console.error(`\n❌ Lỗi: ${error.message}\n`);
    }
}

function manageConfig(args) {
    const [action, key, value] = args;
    if (!action) {
        console.log(`\nSử dụng: tp config <set|get|clear> [key] [value]`);
        console.log(`  tp config set token <private_token>`);
        console.log(`  tp config get token`);
        console.log(`  tp config clear token\n`);
        return;
    }
    switch (action.toLowerCase()) {
        case 'set':
            if (key === 'token' && value) {
                try {
                    ConfigManager.setToken(value);
                    console.log('\n✅ Token đã được lưu thành công!\n');
                } catch (error) {
                    console.error(`\n❌ Lỗi: ${error.message}\n`);
                }
            } else {
                console.error('\n❌ Lỗi: Cú pháp sai. Sử dụng: tp config set token <your_private_token>\n');
            }
            break;
        case 'get':
            if (key === 'token') {
                const token = ConfigManager.getToken();
                if (token) {
                    console.log(`\n🔑 Token hiện tại: ${token}\n`);
                } else {
                    console.log('\nBạn chưa thiết lập token nào, hoặc file cấu hình không thể đọc/ghi.\n');
                }
            }
            break;
        case 'clear':
            if (key === 'token') {
                ConfigManager.clearToken();
                console.log('\n✅ Token đã được xóa.\n');
            }
            break;
        default:
            console.error(`\n❌ Lỗi: Hành động '${action}' không hợp lệ cho lệnh 'config'.\n`);
    }
}

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
        } else if (arg.startsWith('-')) {
             args[arg.substring(1)] = true;
        } else {
            args['_'].push(arg);
        }
    }
    return args;
}

function showHelp() {
    console.log(`
--- CLI TeaserPaste (v0.3.0) ---

Sử dụng: 
  tp <lệnh> [tham số] [tùy chọn]

Các lệnh:
  view <id>                 Xem một snippet.
  list                      Liệt kê các snippet của bạn.
  create [tùy chọn]         Tạo một snippet mới.
  user view                 Xem thông tin người dùng của bạn.
  config <set|get|clear>    Quản lý cấu hình CLI.

Tùy chọn chung:
  --token <key>             Sử dụng một token cụ thể cho lệnh này.
  --debug                   Hiển thị log chi tiết để gỡ lỗi.
  --help, -h                Hiển thị trợ giúp.
  --version                 Hiển thị phiên bản.
    `);
}

async function main() {
    // Dynamically import ESM packages
    const { default: updateNotifier } = await import('update-notifier');
    updateNotifier({ pkg }).notify();

    let rawArgs = process.argv.slice(2);
    const debugIndex = rawArgs.indexOf('--debug');
    if (debugIndex > -1) {
        logger.init(true);
        rawArgs.splice(debugIndex, 1);
        logger.log('Chế độ debug đã được kích hoạt.');
    }

    if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
        showHelp();
        return;
    }
    if (rawArgs.includes('--version')) {
        console.log('0.3.0');
        return;
    }

    const args = parseArgs(rawArgs);
    const [command, ...subArgs] = args['_'];
    const token = args.token || null;

    switch (command) {
        case 'view':
            await viewSnippet(subArgs[0], token, args.password);
            break;
        case 'user':
            if (subArgs[0] === 'view') {
                await viewUser(token);
            } else {
                console.error(`\n❌ Lỗi: Lệnh con '${subArgs[0] || ''}' không hợp lệ cho 'user'.\n`);
            }
            break;
        case 'create':
            await createSnippet(token, rawArgs);
            break;
        case 'config':
            await manageConfig(subArgs);
            break;
        case 'list':
            await listSnippets(token, rawArgs);
            break;
        default:
            console.error(`\n❌ Lỗi: Lệnh '${command}' không tồn tại.\n`);
            showHelp();
    }
}

main();

