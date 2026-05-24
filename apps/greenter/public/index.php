<?php

declare(strict_types=1);

use Inventori\Greenter\GreenterEngine;

ini_set('display_errors', '0');
ini_set('default_socket_timeout', '180');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);

require __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json; charset=utf-8');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET' && $path === '/health') {
        echo json_encode([
            'ok' => true,
            'service' => 'inventori-greenter',
            'timestamp' => gmdate('c'),
        ], JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($method === 'POST' && in_array($path, ['/emitir', '/baja', '/ticket'], true)) {
        $raw = file_get_contents('php://input') ?: '';
        $payload = json_decode($raw, true);

        if (!is_array($payload)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_JSON',
                    'message' => 'El cuerpo debe ser JSON valido.',
                ],
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        $engine = new GreenterEngine();
        $result = match ($path) {
            '/emitir' => $engine->emitir($payload),
            '/baja' => $engine->comunicarBaja($payload),
            '/ticket' => $engine->consultarTicket($payload),
        };
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'NOT_FOUND',
            'message' => 'Ruta no encontrada.',
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'GREENTER_INTERNAL_ERROR',
            'message' => $error->getMessage(),
        ],
    ], JSON_UNESCAPED_UNICODE);
}
