const Conf = require('conf');

const schema = {
	token: {
		type: 'string',
		description: 'API Private Key for TeaserPaste'
	}
};

const config = new Conf({
    projectName: 'teaserpaste-cli',
    schema
});

function setToken(token) {
    if (typeof token !== 'string' || !token.startsWith('priv_')) {
        throw new Error('Token không hợp lệ. Private token phải bắt đầu bằng "priv_".');
    }
    config.set('token', token);
}

function getToken() {
    return config.get('token');
}

function clearToken() {
    config.delete('token');
}

module.exports = { setToken, getToken, clearToken };