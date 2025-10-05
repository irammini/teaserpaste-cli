let isDebug = false;

/**
 * Khởi tạo logger. Được gọi một lần từ cli.js.
 * @param {boolean} debugFlag - True nếu cờ --debug được bật.
 */
function init(debugFlag) {
    isDebug = !!debugFlag;
}

/**
 * Ghi log ra console nếu chế độ debug đang bật.
 * @param {...any} args - Các đối số cần ghi log.
 */
function log(...args) {
    if (isDebug) {
        console.log('[DEBUG]', ...args);
    }
}

/**
 * Ghi lỗi ra console nếu chế độ debug đang bật.
 * @param {...any} args - Các đối số lỗi cần ghi.
 */
function error(...args) {
     if (isDebug) {
        console.error('[DEBUG ERROR]', ...args);
    }
}

module.exports = {
    init,
    log,
    error,
};
