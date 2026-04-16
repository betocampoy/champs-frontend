<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend;

use BetoCampoy\Champs\Frontend\Twig\Extension\LegacyExtension;

final class LegacyBootstrap
{
    /**
     * @param array<string,string> $routes
     * @param array<string,mixed> $globals
     */
    public static function createRenderer(
        string $projectTemplatesPath,
        array $routes = [],
        ?string $cachePath = null,
        bool $debug = false,
        string $basePath = '',
        string $assetsBase = '/assets',
        array $globals = []
    ): TwigRenderer {
        $renderer = new TwigRenderer(
            templatePaths: [
                $projectTemplatesPath,
            ],
            cachePath: $debug ? null : $cachePath,
            debug: $debug
        );

        $renderer->addPath(Package::templatesPath(), 'ChampsFrontend');

        $renderer->getTwig()->addExtension(new LegacyExtension(
            routes: $routes,
            basePath: $basePath,
            assetsBase: $assetsBase
        ));

        foreach ($globals as $name => $value) {
            $renderer->addGlobal((string) $name, $value);
        }

        return $renderer;
    }
}
