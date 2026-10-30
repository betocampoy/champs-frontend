<?php

namespace BetoCampoy\Champs\Frontend\Captcha;

/**
 * Confere no provedor o token que o widget de captcha gravou no formulário.
 *
 * O projeto consumidor depende desta interface (não da implementação) para trocar o verificador
 * por um fixo nos testes, sem chamada de rede.
 */
interface CaptchaVerifierInterface
{
    /** Campo POST onde o widget grava o token. */
    public function responseFieldName(): string;

    /**
     * Verdadeiro só quando o provedor confirma o token. Falha de rede, token vazio ou secret
     * ausente contam como recusa (fail closed).
     */
    public function verify(?string $token, ?string $remoteIp = null): bool;

    /**
     * Códigos de erro da última verificação (ex.: invalid-input-response, timeout-or-duplicate),
     * para log. Vazio quando passou.
     *
     * @return list<string>
     */
    public function lastErrorCodes(): array;
}
