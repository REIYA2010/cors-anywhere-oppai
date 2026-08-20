// server.js
// CORS Anywhere プロキシサーバー（Accept-Encoding 強制版）

var cors_proxy = require('cors-anywhere');
var http = require('http');

// 環境変数から設定を読み込み
var host = process.env.HOST || '0.0.0.0';
var port = process.env.PORT || 8080;

// CORS Anywhere サーバーを作成
var server = cors_proxy.createServer({
    // ブラックリスト（空 = すべて許可）
    originBlacklist: [],
    
    // ホワイトリスト（空 = すべて許可）
    originWhitelist: [],
    
    // 必須ヘッダー（これらがないとリクエストを拒否）
    requireHeader: ['origin', 'x-requested-with'],
    
    // 削除するヘッダー（セキュリティ対策）
    removeHeaders: [
        'cookie',
        'set-cookie',
        'cookie2',
        'set-cookie2'
    ],
    
    // リダイレクトの処理
    redirectSameOrigin: false,
    
    // HTTP メソッドの制限（空 = すべて許可）
    httpProxyOptions: {
        followRedirect: true
    }
});

// ==========================================
// ⭐ Accept-Encoding を強制する処理（ここが重要！）
// ==========================================

// サーバーのリクエストイベントをキャッチ
server.on('request', function(req, res) {
    // リクエストヘッダーの Accept-Encoding を identity に強制変更
    req.headers['accept-encoding'] = 'identity';
    
    // デバッグログ（オプション）
    console.log('[CORS-Anywhere] Accept-Encoding forced to: identity');
    console.log('[CORS-Anywhere] Request URL:', req.url);
});

// プロキシリクエストが作成される前にヘッダーを強制（より確実な方法）
server.on('proxyReq', function(proxyReq, req, res, options) {
    // プロキシリクエストのヘッダーも強制
    proxyReq.setHeader('accept-encoding', 'identity');
    proxyReq.setHeader('user-agent', 'Mozilla/5.0 (compatible; CORS-Proxy)');
    
    console.log('[CORS-Anywhere] Proxy request headers set');
});

// ==========================================
// サーバー起動
// ==========================================
server.listen(port, host, function() {
    console.log('========================================');
    console.log('CORS Anywhere (修正版)');
    console.log('========================================');
    console.log('Server running on: ' + host + ':' + port);
    console.log('Accept-Encoding forced to: identity (compression disabled)');
    console.log('Ready to proxy requests!');
    console.log('========================================');
});

// ==========================================
// エラーハンドリング
// ==========================================
server.on('error', function(err) {
    console.error('[CORS-Anywhere] Server error:', err.message);
    process.exit(1);
});

// プロセス終了時の処理
process.on('SIGTERM', function() {
    console.log('[CORS-Anywhere] Received SIGTERM, shutting down...');
    server.close();
});

process.on('SIGINT', function() {
    console.log('[CORS-Anywhere] Received SIGINT, shutting down...');
    server.close();
});

// 未処理のエラーをキャッチ
process.on('uncaughtException', function(err) {
    console.error('[CORS-Anywhere] Uncaught exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', function(reason, promise) {
    console.error('[CORS-Anywhere] Unhandled rejection:', reason);
});
