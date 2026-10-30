<?php

namespace BetoCampoy\Champs\Frontend\Captcha;

/**
 * Verificação server-side do Cloudflare Turnstile (siteverify), em PHP puro: serve tanto para
 * Symfony quanto para os projetos legados.
 *
 * Uso:
 *   $verifier = new TurnstileVerifier($_ENV['TURNSTILE_SECRET_KEY']);
 *   if (!$verifier->verify($_POST[$verifier->responseFieldName()] ?? null, $clientIp)) { ... }
 *
 * O widget é o template @ChampsFrontend/components/ui/_captcha.html.twig + o módulo JS Captcha.
 *
 * Chaves de teste da Cloudflare (não chamam desafio real):
 *   site key   1x00000000000000000000AA (sempre passa) / 2x00000000000000000000AB (sempre bloqueia)
 *   secret     1x0000000000000000000000000000000AA (sempre passa) / 2x0000000000000000000000000000000AA (sempre falha)
 */
class TurnstileVerifier implements CaptchaVerifierInterface
{
    public const RESPONSE_FIELD = 'cf-turnstile-response';
    private const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    /** Limite documentado do token; acima disso a Cloudflare recusa sem precisar chamar. */
    private const MAX_TOKEN_LENGTH = 2048;

    /** @var list<string> */
    private array $lastErrorCodes = [];

    /**
     * @param \Closure(string $url, array $fields): ?string|null $httpPost devolve o corpo da
     *        resposta ou null em falha de rede. Padrão: curl. Injetável para teste.
     */
    public function __construct(
        private readonly string $secretKey,
        private readonly ?\Closure $httpPost = null,
        private readonly int $timeoutSeconds = 5,
    ) {}

    public function responseFieldName(): string
    {
        return self::RESPONSE_FIELD;
    }

    public function verify(?string $token, ?string $remoteIp = null): bool
    {
        $this->lastErrorCodes = [];

        if (trim($this->secretKey) === '') {
            return $this->fail('missing-input-secret');
        }

        $token = trim((string) $token);
        if ($token === '') {
            return $this->fail('missing-input-response');
        }
        if (strlen($token) > self::MAX_TOKEN_LENGTH) {
            return $this->fail('invalid-input-response');
        }

        $fields = ['secret' => $this->secretKey, 'response' => $token];
        if ($remoteIp !== null && $remoteIp !== '') {
            $fields['remoteip'] = $remoteIp;
        }

        $body = $this->httpPost !== null
            ? ($this->httpPost)(self::ENDPOINT, $fields)
            : $this->curlPost(self::ENDPOINT, $fields);

        if ($body === null) {
            return $this->fail('network-error');
        }

        $json = json_decode($body, true);
        if (!is_array($json)) {
            return $this->fail('invalid-provider-response');
        }

        if (($json['success'] ?? false) !== true) {
            $codes = array_values(array_filter((array) ($json['error-codes'] ?? []), 'is_string'));

            return $this->fail(...($codes ?: ['unknown-error']));
        }

        return true;
    }

    public function lastErrorCodes(): array
    {
        return $this->lastErrorCodes;
    }

    private function fail(string ...$codes): bool
    {
        $this->lastErrorCodes = array_values($codes);

        return false;
    }

    private function curlPost(string $url, array $fields): ?string
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($fields),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $this->timeoutSeconds,
            CURLOPT_TIMEOUT        => $this->timeoutSeconds,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode >= 500) {
            return null;
        }

        return (string) $response;
    }
}
