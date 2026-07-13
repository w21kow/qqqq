const net = require('net');
const tls = require('tls');

function targetPort(url) {
    if (url.port) return Number(url.port);
    return url.protocol === 'https:' ? 443 : 80;
}

function connectTarget(url, tlsOptions, onSecure) {
    const port = targetPort(url);
    const host = url.hostname;

    if (url.protocol === 'https:') {
        return tls.connect({
            host,
            port,
            servername: url.hostname,
            ...(tlsOptions || {})
        }, onSecure);
    }

    const socket = net.connect({ host, port }, () => onSecure(socket));
    return socket;
}

module.exports = {
    connectTarget,
    targetPort
};
