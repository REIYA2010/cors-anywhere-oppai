// server.js
// CORS Anywhere サーバー（修正版）

// ⭐ ローカルの lib/cors-anywhere.js を読み込む
var cors_proxy = require('./lib/cors-anywhere');

// 環境変数から設定を読み込み
var host = process.env.HOST || '0.0.0.0';
var port = process.env.PORT || 8080;

// ブラックリスト・ホワイトリスト（環境変数から）
function parseEnvList(env) {
    if (!env) return [];
    return env.split(',');
}

var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);

// レート制限
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

// ⭐ サーバーを作成（Accept-Encoding は identity に強制）
var server = cors_proxy.createServer({
    originBlacklist: originBlacklist,
    originWhitelist: originWhitelist,
    requireHeader: ['origin', 'x-requested-with'],
    checkRateLimit: checkRateLimit,
    removeHeaders: [
        'cookie',
        'set-cookie'
    ],
    // ⭐ リクエストヘッダーを強制変更
    handleRequest: function(req, res) {
        // Accept-Encoding を identity に強制
        req.headers['accept-encoding'] = 'identity';
        console.log('[CORS-Anywhere] Accept-Encoding forced to: identity');
        console.log('[CORS-Anywhere] Request URL:', req.url);
        return true;
    },
    // ⭐ プロキシリクエストのヘッダー設定
    beforeRequest: function(req, res, proxyReq) {
        // プロキシリクエストのヘッダーも強制
        proxyReq.setHeader('accept-encoding', 'identity');
        proxyReq.setHeader('user-agent', 'Mozilla/5.0 (compatible; CORS-Proxy)');
        return true;
    }
});

// サーバー起動
server.listen(port, host, function() {
    console.log('CORS Anywhere (修正版) running on ' + host + ':' + port);
    console.log('Accept-Encoding forced to: identity (compression disabled)');
});

// エラーハンドリング
server.on('error', function(err) {
    console.error('Server error:', err.message);
    process.exit(1);
});

// プロセス終了時の処理
process.on('SIGTERM', function() {
    console.log('Received SIGTERM, shutting down...');
    server.close();
});

process.on('SIGINT', function() {
    console.log('Received SIGINT, shutting down...');
    server.close();
});
