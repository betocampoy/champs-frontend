<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Twig\Extension;

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

final class LegacyExtension extends AbstractExtension
{
    /**
     * @param array<string, string> $routes
     */
    public function __construct(
        private readonly array $routes = [],
        private readonly string $basePath = '',
        private readonly string $assetsBase = ''
    ) {}

    public function getFunctions(): array
    {
        return [
            new TwigFunction('path', [$this, 'path']),
            new TwigFunction('asset', [$this, 'asset']),
        ];
    }

    /**
     * @param array<string, scalar|null> $params
     */
    public function path(string $name, array $params = []): string
    {
        if (!isset($this->routes[$name])) {
            return 'index.php';
        }

        $url = $this->routes[$name];
        $basePath = rtrim($this->basePath, '/');

        if ($basePath !== '' && str_starts_with($url, '/')) {
            $url = $basePath . $url;
        }

        if ($params === []) {
            return $url;
        }

        $qs = http_build_query($params);

        return str_contains($url, '?') ? ($url . '&' . $qs) : ($url . '?' . $qs);
    }

    public function asset(string $path): string
    {
        $path = ltrim($path, '/');
        $base = rtrim($this->basePath, '/');

        if ($this->assetsBase !== '') {
            $assetsBase = '/' . trim($this->assetsBase, '/');
            return ($base !== '' ? $base : '') . $assetsBase . '/' . $path;
        }

        return ($base !== '' ? $base : '') . '/' . $path;
    }
}
