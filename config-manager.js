const fs = require('fs');
const path = require('path');
const os = require('os');

// Tạo đường dẫn tới file cấu hình một cách an toàn
// Ví dụ trên Windows: C:\Users\Username\.config\teaserpaste-cli\config.json
const configDir = path.join(os.homedir(), '.config', 'teaserpaste-cli');
const configFile = path.join(configDir, 'config.json');

// Hàm đọc file config
function readConfig() {
    try {
        if (!fs.existsSync(configFile)) {
            return {}; // Nếu file không tồn tại, trả về object rỗng
        }
        const rawData = fs.readFileSync(configFile, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        // Nếu file bị lỗi (ví dụ JSON không hợp lệ), coi như chưa có config
        console.warn('Cảnh báo: Không thể đọc file cấu hình.');
        return {};
    }
}

// Hàm ghi file config
function writeConfig(data) {
    try {
        // Đảm bảo thư mục tồn tại trước khi ghi file
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Lỗi: Không thể ghi file cấu hình.', error);
    }
}

// --- Các hàm export ra bên ngoài ---

function setToken(token) {
    if (typeof token !== 'string' || !token.startsWith('priv_')) {
        throw new Error('Token không hợp lệ. Private token phải bắt đầu bằng "priv_".');
    }
    const config = readConfig();
    config.token = token;
    writeConfig(config);
}

function getToken() {
    const config = readConfig();
    return config.token || null;
}

function clearToken() {
    const config = readConfig();
    delete config.token;
    writeConfig(config);
}

module.exports = { setToken, getToken, clearToken };

