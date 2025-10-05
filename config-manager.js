const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const configDir = path.join(os.homedir(), '.config', 'teaserpaste-cli');
const configFile = path.join(configDir, 'config.json');

function readConfig() {
    try {
        logger.log(`readConfig: Đang kiểm tra file tại ${configFile}`);
        if (!fs.existsSync(configFile)) {
            logger.log(`readConfig: File không tồn tại. Trả về object rỗng.`);
            return {};
        }
        logger.log(`readConfig: File tồn tại. Đang đọc...`);
        const rawData = fs.readFileSync(configFile, 'utf-8');
        const parsedData = JSON.parse(rawData);
        logger.log(`readConfig: Đọc và parse JSON thành công.`);
        return parsedData;
    } catch (err) {
        logger.error('readConfig: ĐÃ XẢY RA LỖI!', err);
        return {};
    }
}

function writeConfig(data) {
    try {
        logger.log(`writeConfig: Đang kiểm tra thư mục tại ${configDir}`);
        if (!fs.existsSync(configDir)) {
            logger.log(`writeConfig: Thư mục không tồn tại. Đang tạo...`);
            fs.mkdirSync(configDir, { recursive: true });
            logger.log(`writeConfig: Đã tạo thư mục thành công.`);
        }
        logger.log(`writeConfig: Đang ghi vào file tại ${configFile}`);
        fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
        logger.log(`writeConfig: Ghi file thành công.`);
    } catch (err) {
        logger.error('writeConfig: ĐÃ XẢY RA LỖI!', err);
    }
}

function setToken(token) {
    logger.log(`setToken: Bắt đầu hàm setToken.`);
    if (typeof token !== 'string' || !token.startsWith('priv_')) {
        throw new Error('Token không hợp lệ. Private token phải bắt đầu bằng "priv_".');
    }
    const config = readConfig();
    config.token = token;
    writeConfig(config);
    logger.log(`setToken: Hoàn tất.`);
}

function getToken() {
    logger.log(`getToken: Bắt đầu hàm getToken.`);
    const config = readConfig();
    logger.log(`getToken: Token được đọc là: ${config.token || 'không có'}`);
    return config.token || null;
}

function clearToken() {
    logger.log(`clearToken: Bắt đầu hàm clearToken.`);
    const config = readConfig();
    delete config.token;
    writeConfig(config);
    logger.log(`clearToken: Hoàn tất.`);
}

module.exports = { setToken, getToken, clearToken };

