<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Push;

/**
 * Cliente para a FCM HTTP v1 API.
 *
 * Requer: extensão openssl e extensão curl (ambas padrão no PHP 8.1+).
 * Sem dependências externas — gera o JWT e o access token OAuth2 internamente.
 *
 * Pré-requisito: baixe o JSON de credenciais do service account em
 * Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada.
 */
final class FcmClient
{
    private const FCM_SEND_URL          = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';
    private const FCM_TOPIC_MANAGE_URL  = 'https://iid.googleapis.com/iid/v1';
    private const GOOGLE_TOKEN_URL      = 'https://oauth2.googleapis.com/token';
    private const FCM_SCOPE             = 'https://www.googleapis.com/auth/firebase.messaging';
    private const TOKEN_LEEWAY_SECONDS  = 60;

    private array $serviceAccount;
    private ?string $cachedAccessToken = null;
    private int $tokenExpiresAt = 0;

    public function __construct(string $serviceAccountJsonPath)
    {
        if (!file_exists($serviceAccountJsonPath)) {
            throw new \InvalidArgumentException(
                "Service account JSON não encontrado: {$serviceAccountJsonPath}"
            );
        }

        $json = file_get_contents($serviceAccountJsonPath);
        if ($json === false) {
            throw new \RuntimeException("Não foi possível ler o arquivo: {$serviceAccountJsonPath}");
        }

        $data = json_decode($json, true);
        if (!is_array($data) || ($data['type'] ?? '') !== 'service_account') {
            throw new \InvalidArgumentException(
                "Arquivo inválido. Esperado um service account JSON do Firebase."
            );
        }

        $this->serviceAccount = $data;
    }

    // ─── Envio ────────────────────────────────────────────────────────────────

    /**
     * Envia uma notificação para um token FCM individual.
     *
     * @return array Resposta decodificada da API FCM
     */
    public function sendToToken(PushNotification $notification, string $token): array
    {
        $payload = $notification->toArray();
        $payload['token'] = $token;

        return $this->send(['message' => $payload]);
    }

    /**
     * Envia a mesma notificação para múltiplos tokens (uma requisição por token).
     *
     * @param string[] $tokens
     * @return array[] Respostas indexadas por token
     */
    public function sendToTokens(PushNotification $notification, array $tokens): array
    {
        $results = [];
        foreach ($tokens as $token) {
            try {
                $results[$token] = $this->sendToToken($notification, $token);
            } catch (\Throwable $e) {
                $results[$token] = ['error' => $e->getMessage()];
            }
        }
        return $results;
    }

    /**
     * Envia uma notificação para um tópico FCM.
     *
     * @return array Resposta decodificada da API FCM
     */
    public function sendToTopic(PushNotification $notification, string $topic): array
    {
        $payload = $notification->toArray();
        $payload['topic'] = ltrim($topic, '/');

        return $this->send(['message' => $payload]);
    }

    // ─── Gerenciamento de tópicos ─────────────────────────────────────────────

    /**
     * Inscreve um ou mais tokens em um tópico.
     *
     * @param string|string[] $tokens
     */
    public function subscribeToTopic(string|array $tokens, string $topic): array
    {
        return $this->manageTopicSubscription(
            (array) $tokens,
            $topic,
            self::FCM_TOPIC_MANAGE_URL . ':batchAdd',
        );
    }

    /**
     * Remove a inscrição de um ou mais tokens em um tópico.
     *
     * @param string|string[] $tokens
     */
    public function unsubscribeFromTopic(string|array $tokens, string $topic): array
    {
        return $this->manageTopicSubscription(
            (array) $tokens,
            $topic,
            self::FCM_TOPIC_MANAGE_URL . ':batchRemove',
        );
    }

    // ─── Internos ─────────────────────────────────────────────────────────────

    private function send(array $body): array
    {
        $projectId  = $this->serviceAccount['project_id'];
        $url        = sprintf(self::FCM_SEND_URL, $projectId);
        $token      = $this->getAccessToken();

        return $this->httpPost($url, $body, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json; charset=UTF-8',
        ]);
    }

    private function manageTopicSubscription(array $tokens, string $topic, string $url): array
    {
        $serverKey = $this->serviceAccount['server_key'] ?? null;

        // A API de gerenciamento de tópicos ainda usa a Server Key legada
        // (disponível em Firebase Console > Configurações > Cloud Messaging > Chave do servidor)
        if (!$serverKey) {
            throw new \RuntimeException(
                'server_key não encontrada no service account. ' .
                'Adicione a chave do servidor do Firebase ao JSON para gerenciar tópicos.'
            );
        }

        return $this->httpPost($url, [
            'registration_tokens' => $tokens,
            'to'                  => "/topics/{$topic}",
        ], [
            "Authorization: key={$serverKey}",
            'Content-Type: application/json',
            'access_token_auth: true',
        ]);
    }

    // ─── OAuth2 / JWT ─────────────────────────────────────────────────────────

    private function getAccessToken(): string
    {
        if ($this->cachedAccessToken && time() < $this->tokenExpiresAt - self::TOKEN_LEEWAY_SECONDS) {
            return $this->cachedAccessToken;
        }

        $jwt   = $this->buildJwt();
        $response = $this->httpPost(self::GOOGLE_TOKEN_URL, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ], ['Content-Type: application/x-www-form-urlencoded'], asForm: true);

        if (empty($response['access_token'])) {
            throw new \RuntimeException(
                'Não foi possível obter o access token: ' . json_encode($response)
            );
        }

        $this->cachedAccessToken = $response['access_token'];
        $this->tokenExpiresAt    = time() + (int) ($response['expires_in'] ?? 3600);

        return $this->cachedAccessToken;
    }

    private function buildJwt(): string
    {
        $now = time();

        $header = $this->base64url(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        $claims = $this->base64url(json_encode([
            'iss'   => $this->serviceAccount['client_email'],
            'scope' => self::FCM_SCOPE,
            'aud'   => self::GOOGLE_TOKEN_URL,
            'iat'   => $now,
            'exp'   => $now + 3600,
        ]));

        $signingInput = "{$header}.{$claims}";
        $privateKey   = openssl_pkey_get_private($this->serviceAccount['private_key']);

        if ($privateKey === false) {
            throw new \RuntimeException('Chave privada do service account é inválida.');
        }

        $signature = '';
        if (!openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Falha ao assinar o JWT com a chave privada.');
        }

        return "{$signingInput}." . $this->base64url($signature);
    }

    private function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // ─── HTTP ─────────────────────────────────────────────────────────────────

    private function httpPost(string $url, array $body, array $headers, bool $asForm = false): array
    {
        $ch = curl_init($url);

        if ($ch === false) {
            throw new \RuntimeException('Não foi possível inicializar o cURL.');
        }

        $postFields = $asForm
            ? http_build_query($body)
            : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \RuntimeException("Erro cURL: {$curlError}");
        }

        $decoded = json_decode((string) $response, true);

        if ($httpCode >= 400) {
            $errorMessage = $decoded['error']['message']
                ?? $decoded['error']
                ?? "HTTP {$httpCode}";
            throw new \RuntimeException("FCM API erro ({$httpCode}): {$errorMessage}");
        }

        return is_array($decoded) ? $decoded : [];
    }
}
