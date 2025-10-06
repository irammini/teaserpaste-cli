#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { default: fetch } = require('node-fetch');
const ConfigManager = require('./config-manager');
const logger = require('./logger');
const pkg = require('./package.json');
const { spawn } = require('child_process');

const BASE_API_URL = 'https://paste-api.teaserverse.online';
const BASE_WEB_URL = 'https://paste.teaserverse.online';

// --- HANDLERS VÀ HELPERS ---

// Dynamic import các thư viện ESM
async function getInquirer() { const { default: inquirer } = await import('inquirer'); return inquirer; }
async function getClipboardy() { const { default: clipboardy } = await import('clipboardy'); return clipboardy; }

// Đọc nội dung từ stdin
function readFromStdin() {
    return new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', () => { let chunk; while ((chunk = process.stdin.read()) !== null) { data += chunk; } });
        process.stdin.on('end', () => { resolve(data.trim()); });
    });
}

// Gọi API
async function apiRequest(endpoint, method, body, token = null) {
    const finalToken = token || ConfigManager.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (finalToken) { headers['Authorization'] = `Bearer ${finalToken}`; }
    logger.log(`API Request: ${method} ${BASE_API_URL}${endpoint}`);
    if (body) { logger.log('Request Body:', JSON.stringify(body, null, 2)); }
    const response = await fetch(`${BASE_API_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const responseText = await response.text();
    logger.log(`API Response Status: ${response.status}`);
    logger.log('Response Body:', responseText);
    if (!response.ok) {
        try {
            const data = JSON.parse(responseText);
            if (data.requiresPassword) throw new Error(`Snippet yêu cầu mật khẩu.`);
            throw new Error(data.error || `Lỗi không xác định (${response.status})`);
        } catch (e) { throw new Error(`Lỗi máy chủ không hợp lệ (${response.status})`); }
    }
    try { return JSON.parse(responseText); } catch (e) { return responseText; }
}

// Các hàm hiển thị
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

// Các hàm tiện ích
const extensionToLang = { '.js': 'javascript', '.ts': 'typescript', '.py': 'python', '.html': 'html', '.css': 'css', '.json': 'json', '.md': 'markdown', '.txt': 'plaintext', '.sh': 'shell', '.java': 'java', '.cs': 'csharp', '.cpp': 'cpp', '.go': 'go', '.rs': 'rust', '.rb': 'ruby' };
function getFileExtension(language) { const map = { javascript: '.js', typescript: '.ts', python: '.py', html: '.html', css: '.css', json: '.json', markdown: '.md', text: '.txt', plaintext: '.txt', shell: '.sh', java: '.java', csharp: '.cs', cpp: '.cpp', go: '.go', rust: '.rs', ruby: '.rb' }; return map[language ? language.toLowerCase() : 'text'] || '.txt'; }
function getLangFromExtension(ext) { return extensionToLang[ext] || 'plaintext'; }
function sanitizeFilename(name) { if (!name) return 'snippet'; return name.replace(/[\s/\\?%*:|"<>]/g, '_').substring(0, 100); }

// Mở trình soạn thảo ngoài
async function openExternalEditor(initialContent = '') {
    return new Promise((resolve, reject) => {
        const tempFile = path.join(os.tmpdir(), `tp-editor-${Date.now()}.tmp`);
        fs.writeFileSync(tempFile, initialContent);
        const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vim');
        const child = spawn(editor, [tempFile], { 
            detached: true,
            stdio: 'ignore' 
        });
        child.unref();
        console.log(`\nTrình soạn thảo đã được mở. Vui lòng lưu và đóng nó lại.`);
        const inquirerPromise = getInquirer().then(inquirer => inquirer.prompt([{ type: 'confirm', name: 'done', message: 'Nhấn Enter khi bạn đã soạn thảo xong:' }]));
        inquirerPromise.then(answers => {
            if (answers.done) {
                 const content = fs.readFileSync(tempFile, 'utf-8');
                 fs.unlinkSync(tempFile);
                 resolve(content);
            } else {
                 fs.unlinkSync(tempFile);
                 reject(new Error(`Thao tác soạn thảo đã bị hủy.`));
            }
        });
        child.on('error', (err) => {
             fs.unlinkSync(tempFile);
             reject(err);
        });
    });
}

// --- LOGIC CÁC LỆNH ---

async function viewSnippet(id, token, password, { raw, copy, url: urlFlag }) {
    if (!id) {
        console.error('\n❌ Lỗi: Thiếu ID snippet cho lệnh \'view\'.\n');
        return;
    }

    if (urlFlag) {
        const url = `${BASE_WEB_URL}/snippet/${id}`;
        console.log(`\n${url}\n`);
        return;
    }
    
    try {
        const snippet = await apiRequest('/getSnippet', 'POST', { snippetId: id, password }, token);
        
        if (raw) {
            process.stdout.write(snippet.content);
            return;
        }

        if (copy) {
            const clipboardy = await getClipboardy();
            await clipboardy.write(snippet.content);
            console.log('\n✅ Đã sao chép nội dung snippet vào clipboard!\n');
            return;
        }
        
        printSnippet(snippet);
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

async function viewUser(token, args) {
    try {
        const parsedArgs = parseArgs(args);
        const user = await apiRequest('/getUserInfo', 'GET', null, token);
        printUser(user);
        if (parsedArgs.s) {
            console.log(`Đang tải các public snippet của ${user.displayName}...`);
            const snippets = await apiRequest('/getUserPublicSnippets', 'POST', { userId: user.userId });
            if (!snippets || snippets.length === 0) {
                console.log('\nNgười dùng này không có public snippet nào.\n');
                return;
            }
            console.log('\nPublic Snippets:');
            console.table(snippets.map(s => ({ ID: s.id, TITLE: s.title, LANGUAGE: s.language })));
        }
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

async function createSnippet(token, args) {
    try {
        let snippetData = {};
        const parsedArgs = parseArgs(args);
        const isInteractive = parsedArgs.i || parsedArgs.interactive;
        const hasContentFlag = parsedArgs.content;
        const hasFileFlag = parsedArgs.file;
        const inquirer = await getInquirer();
        if (isInteractive) {
            let answers = await inquirer.prompt([
                { type: 'input', name: 'title', message: 'Tiêu đề snippet:', default: 'Untitled' },
                { type: 'input', name: 'language', message: 'Ngôn ngữ:', default: 'plaintext' },
                { type: 'list', name: 'visibility', message: 'Chế độ hiển thị:', choices: ['unlisted', 'public', 'private'], default: 'unlisted' },
                { type: 'input', name: 'password', message: 'Mật khẩu (nếu cần):', when: (ans) => ans.visibility === 'unlisted' },
                { type: 'input', name: 'tags', message: 'Tags (phân cách bởi dấu phẩy):' },
                { type: 'input', name: 'expires', message: 'Thời gian hết hạn (ví dụ: 1h, 7d, 2w):' },
                { type: 'list', name: 'contentSource', message: 'Nguồn nội dung:', choices: ['Soạn thảo (mở Notepad, Vim,...)', 'Nhập từ file'], default: 0 },
            ]);
            if (answers.contentSource === 'Nhập từ file') {
                const { filePath } = await inquirer.prompt([{ type: 'input', name: 'filePath', message: 'Đường dẫn đến file:' }]);
                if (!fs.existsSync(filePath)) throw new Error(`File không tồn tại: ${filePath}`);
                answers.content = fs.readFileSync(filePath, 'utf-8');
                const fileExt = path.extname(filePath);
                const langFromFile = getLangFromExtension(fileExt);
                if (langFromFile !== 'plaintext' && answers.language !== langFromFile) {
                    const { confirmChange } = await inquirer.prompt([{
                        type: 'confirm', name: 'confirmChange',
                        message: `Ngôn ngữ bạn chọn là '${answers.language}' nhưng file có vẻ là '${langFromFile}'. Bạn có muốn đổi thành '${langFromFile}' không?`,
                        default: true
                    }]);
                    if (confirmChange) answers.language = langFromFile;
                }
            } else {
                 console.log('\nChuẩn bị mở trình soạn thảo mặc định...');
                 answers.content = await openExternalEditor();
            }
            snippetData = answers;
        } else if (hasFileFlag) {
            if (!fs.existsSync(hasFileFlag)) throw new Error(`File không tồn tại: ${hasFileFlag}`);
            snippetData.content = fs.readFileSync(hasFileFlag, 'utf-8');
            snippetData = { ...parsedArgs, ...snippetData };
        } else if (!process.stdin.isTTY && !hasContentFlag) {
            snippetData.content = await readFromStdin();
            snippetData = { ...parsedArgs, ...snippetData };
        } else {
            if (!parsedArgs.title || !parsedArgs.content) return console.error(`\n❌ Lỗi: Thiếu --title và --content. Dùng -i (tương tác) hoặc --file <path>.\n`);
            snippetData = parsedArgs;
        }
        snippetData.tags = (snippetData.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        const newSnippet = await apiRequest('/createSnippet', 'POST', snippetData, token);
        console.log(`\n✅ Đã tạo snippet thành công! ID: ${newSnippet.id}\n`);
    } catch (error) {
        if (error.message.includes('prompt was canceled') || error.message.includes('Thao tác soạn thảo đã bị hủy') || error.message.includes('Thoát trình soạn thảo')) {
            console.log('\nĐã hủy bỏ thao tác.\n');
        } else { console.error(`\n❌ Lỗi: ${error.message}\n`); }
    }
}

async function listSnippets(token, args) {
    try {
        const parsedArgs = parseArgs(args);
        const snippets = await apiRequest('/listSnippets', 'POST', { limit: parsedArgs.limit ? parseInt(parsedArgs.limit, 10) : 20, visibility: parsedArgs.visibility }, token);
        if (!snippets || snippets.length === 0) {
            console.log('\nKhông tìm thấy snippet nào.\n');
            return;
        }
        console.table(snippets.map(s => ({ ID: s.id, TITLE: s.title, VISIBILITY: s.visibility, LANGUAGE: s.language })));
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

async function cloneSnippet(id, filename, password, token) {
    if (!id) {
        console.error('\n❌ Lỗi: Thiếu ID snippet cho lệnh \'clone\'.\n');
        return;
    }
    try {
        const snippet = await apiRequest('/getSnippet', 'POST', { snippetId: id, password }, token);
        const correctExtension = getFileExtension(snippet.language);
        let baseFilename = filename;
        if (filename) {
            const userExtension = path.extname(filename);
            if (userExtension && userExtension !== correctExtension) {
                console.warn(`\n⚠️ Cảnh báo: Phần mở rộng file ('${userExtension}') không khớp ngôn ngữ ('${snippet.language}'). Sẽ lưu với phần mở rộng đúng là '${correctExtension}'.\n`);
                baseFilename = path.basename(filename, userExtension);
            } else if (!userExtension) { baseFilename = filename; }
        } else { baseFilename = sanitizeFilename(snippet.title); }
        const outputFilename = baseFilename + correctExtension;
        fs.writeFileSync(outputFilename, snippet.content);
        console.log(`\n✅ Snippet đã được lưu thành công vào file: ${outputFilename}\n`);
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

async function updateSnippet(id, token, args) {
    if (!id) {
        console.error('\n❌ Lỗi: Thiếu ID snippet cho lệnh \'update\'.\n');
        return;
    }
    try {
        const parsedArgs = parseArgs(args);
        delete parsedArgs['_']; delete parsedArgs.token;
        if (Object.keys(parsedArgs).length === 0) {
            console.error('\n❌ Lỗi: Phải cung cấp ít nhất một trường để cập nhật (ví dụ: --title "Tiêu đề mới").\n');
            return;
        }
        const updatedSnippet = await apiRequest('/updateSnippet', 'PATCH', { snippetId: id, updates: parsedArgs }, token);
        console.log(`\n✅ Snippet đã được cập nhật thành công!`);
        printSnippet(updatedSnippet);
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

async function deleteSnippet(id, token) {
    if (!id) {
        console.error('\n❌ Lỗi: Thiếu ID snippet cho lệnh \'delete\'.\n');
        return;
    }
    try {
        const inquirer = await getInquirer();
        const { confirmDelete } = await inquirer.prompt([{ type: 'confirm', name: 'confirmDelete', message: `Bạn có chắc chắn muốn xóa snippet '${id}' không?`, default: false }]);
        if (confirmDelete) {
            const result = await apiRequest('/deleteSnippet', 'DELETE', { snippetId: id }, token);
            console.log(`\n✅ ${result.message}\n`);
        } else { console.log('\nHủy bỏ thao tác xóa.\n'); }
    } catch (error) {
         if (error.message.includes('prompt was canceled')) {
            console.log('\nThoát chế độ tương tác.\n');
         }
         else {
            console.error(`\n❌ Lỗi: ${error.message}\n`);
         }
    }
}

async function searchSnippets(term, token) {
    if (!term) {
        console.error('\n❌ Lỗi: Thiếu từ khóa cho lệnh \'search\'.\n');
        return;
    }
    try {
        console.log(`\nĐang tìm kiếm với từ khóa "${term}"...`);
        const results = await apiRequest('/searchSnippets', 'POST', { term }, token);
        if (!results || results.length === 0) {
            console.log('\nKhông tìm thấy kết quả nào phù hợp.\n');
            return;
        }
        console.log('\nKết quả tìm kiếm:');
        console.table(results.map(s => ({ ID: s.id, TITLE: s.title, CREATOR: s.creatorName, LANGUAGE: s.language })));
    } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); }
}

function manageConfig(args) {
    const [action, key, value] = args;
    if (!action) {
        console.log(`\nSử dụng: tp config <set|get|clear> token [value]\n`);
        return;
    }
    switch (action.toLowerCase()) {
        case 'set':
            if (key === 'token' && value) { try { ConfigManager.setToken(value); console.log('\n✅ Token đã được lưu!\n'); } catch (error) { console.error(`\n❌ Lỗi: ${error.message}\n`); } } 
            else { console.error('\n❌ Lỗi: Cú pháp sai. Dùng: tp config set token <your_private_token>\n'); }
            break;
        case 'get':
            if (key === 'token') { const token = ConfigManager.getToken(); console.log(token ? `\n🔑 Token hiện tại: ${token}\n` : '\nBạn chưa thiết lập token nào.\n'); }
            break;
        case 'clear':
            if (key === 'token') { ConfigManager.clearToken(); console.log('\n✅ Token đã được xóa.\n'); }
            break;
        default: console.error(`\n❌ Lỗi: Hành động '${action}' không hợp lệ.\n`);
    }
}

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
                args[key] = argv[i + 1];
                i++;
            } else { args[key] = true; }
        } else if (arg.startsWith('-')) {
            const keys = arg.substring(1).split('');
            keys.forEach(key => args[key] = true);
        } else { args['_'].push(arg); }
    }
    return args;
}

function showHelp() {
    console.log(`
--- CLI TeaserPaste (v0.4.2) ---

Sử dụng: 
  tp <lệnh> [tham số] [tùy chọn]

Các lệnh:
  view <id>                 Xem một snippet.
  clone <id> [filename]     Tải nội dung snippet về thành một file.
  list                      Liệt kê các snippet của bạn.
  create                    Tạo một snippet mới.
  update <id>               Cập nhật một snippet đã có.
  delete <id>               Xóa một snippet.
  search <từ khóa>          Tìm kiếm public snippets.
  user view                 Xem thông tin người dùng của bạn.
  config <set|get|clear>    Quản lý cấu hình CLI.

Tùy chọn cho 'view':
  --raw                     Chỉ in ra nội dung thô của snippet.
  --copy                    Sao chép nội dung snippet vào clipboard.
  --url                     Hiển thị URL của snippet.

Tùy chọn chung:
  --token <key>
  --password <pass>
  -s                        (cho 'user view') Liệt kê public snippets của user.
  --debug                   Hiển thị log chi tiết để gỡ lỗi.
  -v, --version             Hiển thị phiên bản.
  -h, --help                Hiển thị trợ giúp.
    `);
}

async function main() {
    process.on('SIGINT', () => {
        console.log('\nĐã hủy bỏ thao tác. Hẹn gặp lại!');
        process.exit(0);
    });

    try {
        let rawArgs = process.argv.slice(2);
        const debugIndex = rawArgs.indexOf('--debug');
        if (debugIndex > -1) { logger.init(true); rawArgs.splice(debugIndex, 1); logger.log('Chế độ debug đã được kích hoạt.'); }

        if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
            showHelp();
            return;
        }
        if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
            console.log(pkg.version);
            return;
        }

        const args = parseArgs(rawArgs);
        const [command, ...subArgs] = args['_'];
        const token = args.token || null;

        switch (command) {
            case 'view': 
                await viewSnippet(subArgs[0], token, args.password, { 
                    raw: args.raw, 
                    copy: args.copy, 
                    url: args.url 
                }); 
                break;
            case 'clone': await cloneSnippet(subArgs[0], subArgs[1], args.password, token); break;
            case 'user':
                if (subArgs[0] === 'view') await viewUser(token, rawArgs);
                else console.error(`\n❌ Lỗi: Lệnh con '${subArgs[0] || ''}' không hợp lệ cho 'user'.\n`);
                break;
            case 'create': await createSnippet(token, rawArgs); break;
            case 'config': await manageConfig(subArgs); break;
            case 'list': await listSnippets(token, rawArgs); break;
            case 'update': await updateSnippet(subArgs[0], token, rawArgs); break;
            case 'delete': await deleteSnippet(subArgs[0], token); break;
            case 'search': await searchSnippets(subArgs[0], token); break;
            default:
                console.error(`\n❌ Lỗi: Lệnh '${command}' không tồn tại.\n`);
                showHelp();
        }
    } catch (error) {
        logger.error('Lỗi không xác định ở hàm main:', error);
        console.error(`\n❌ Đã xảy ra lỗi nghiêm trọng: ${error.message}\n`);
        process.exit(1);
    }
}

main();

