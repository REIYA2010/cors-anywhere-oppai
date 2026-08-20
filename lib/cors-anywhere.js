// lib/cors-anywhere.js
// CORS Anywhere の主要ロジック（修正版）

'use strict';

var http = require('http');
var https = require('https');
var url = require('url');
var stream = require('stream');

// ==========================================
// メイン関数: createServer
// ==========================================
function createServer(options) {
    options = options || {};

    // デフォルト設定
    var originBlacklist = options.originBlacklist || [];
    var originWhitelist = options.originWhitelist || [];
    var rateLimit = options.rateLimit || 0;
    var redirectSameOrigin = options.redirectSameOrigin || false;
    var requireHeader = options.requireHeader || [];
    var removeHeaders = options.removeHeaders || [];
    var setHeaders = options.setHeaders || {};
    var corsMaxAge = options.corsMaxAge || 0;

    // ==========================================
    // リクエストハンドラ
    // ==========================================
    function handleRequest(req, res) {
        // ⭐ Accept-Encoding を強制的に identity に変更（圧縮を無効化）
        req.headers['accept-encoding'] = 'identity';
        console.log('[CORS-Anywhere] Accept-Encoding forced to: identity');
        console.log('[CORS-Anywhere] Request URL:', req.url);

        // 元のリクエストを解析
        var parsedUrl = url.parse(req.url);
        var targetUrl = parsedUrl.pathname + (parsedUrl.search || '');
        
        if (targetUrl.startsWith('//')) {
            targetUrl = 'http:' + targetUrl;
        }
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'http://' + targetUrl;
        }

        // ホワイトリスト・ブラックリストチェック
        var origin = req.headers.origin || '';
        if (originWhitelist.length > 0 && originWhitelist.indexOf(origin) === -1) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Origin not allowed');
            return;
        }
        if (originBlacklist.length > 0 && originBlacklist.indexOf(origin) !== -1) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Origin blocked');
            return;
        }

        // ターゲットURLを解析
        var parsedTarget = url.parse(targetUrl);
        var targetHost = parsedTarget.hostname;
        var targetPort = parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80);

        // ==========================================
        // プロキシリクエストを作成
        // ==========================================
        var requestOptions = {
            hostname: targetHost,
            port: targetPort,
            path: parsedTarget.path || '/',
            method: req.method,
            headers: {
                'accept-encoding': 'identity', // ⭐ 圧縮を強制無効化
                'user-agent': 'Mozilla/5.0 (compatible; CORS-Proxy)'
            }
        };

        // 元のヘッダーをコピー（ただし特定のヘッダーは除外）
        for (var key in req.headers) {
            if (removeHeaders.indexOf(key.toLowerCase()) !== -1) continue;
            if (key.toLowerCase() === 'accept-encoding') continue; // ⭐ 上書き防止
            requestOptions.headers[key] = req.headers[key];
        }

        console.log('[CORS-Anywhere] Target URL:', targetUrl);

        // ==========================================
        // プロキシリクエストを実行
        // ==========================================
        var proxyReq = (parsedTarget.protocol === 'https:' ? https : http).request(requestOptions, function(proxyRes) {
            console.log('[CORS-Anywhere] Response status:', proxyRes.statusCode);

            // レスポンスヘッダーを設定（CORSヘッダーを追加）
            var responseHeaders = proxyRes.headers || {};
            responseHeaders['access-control-allow-origin'] = '*';
            responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            responseHeaders['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';

            res.writeHead(proxyRes.statusCode, responseHeaders);
            proxyRes.pipe(res);
        });

        // リクエストボディを転送
        req.pipe(proxyReq);

        // エラーハンドリング
        proxyReq.on('error', function(err) {
            console.error('[CORS-Anywhere] Proxy error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                res.end('Proxy error: ' + err.message);
            }
        });

        req.on('error', function(err) {
            console.error('[CORS-Anywhere] Request error:', err.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Request error: ' + err.message);
            }
        });
    }

    // ==========================================
    // サーバーを作成
    // ==========================================
    var server = http.createServer(function(req, res) {
        // CORS プリフライトリクエスト（OPTIONS）に対応
        if (req.method === 'OPTIONS') {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
                'Access-Control-Max-Age': corsMaxAge || 86400
            });
            res.end();
            return;
        }

        // 通常のリクエストを処理
        handleRequest(req, res);
    });

    // ==========================================
    // サーバー起動
    // ==========================================
    server.listen = function(port, host, callback) {
        console.log('[CORS-Anywhere] Server starting...');
        console.log('[CORS-Anywhere] Accept-Encoding forced to: identity (compression disabled)');
        return server.__proto__.listen.call(this, port, host, callback);
    };

    // ⭐ 重要：これをエクスポートする！
    return server;
}

// ⭐ ここが一番重要！モジュールとしてエクスポート
module.exports = createServer;
