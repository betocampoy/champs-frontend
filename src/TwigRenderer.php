<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend;

use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use Twig\TwigFunction;

final class TwigRenderer
{
    private Environment $twig;
    private FilesystemLoader $loader;

    /**
     * @param list<string> $templatePaths
     */
    public function __construct(array $templatePaths, ?string $cachePath = null, bool $debug = false)
    {
        $this->loader = new FilesystemLoader();

        foreach ($templatePaths as $path) {
            $this->loader->addPath($path);
        }

        $options = [
            'debug' => $debug,
            'auto_reload' => $debug,
        ];

        if ($cachePath) {
            $options['cache'] = $cachePath;
        }

        $this->twig = new Environment($this->loader, $options);

        $this->twig->addFunction(new TwigFunction('legacy_include', function (string $path, array $vars = []): void {
            extract($vars, EXTR_SKIP);
            include $path;
        }));
    }

    public function addPath(string $path, ?string $namespace = null): self
    {
        if ($namespace) {
            $this->loader->addPath($path, $namespace);
        } else {
            $this->loader->addPath($path);
        }

        return $this;
    }

    public function addGlobal(string $name, mixed $value): self
    {
        $this->twig->addGlobal($name, $value);
        return $this;
    }

    public function render(string $template, array $data = []): string
    {
        return $this->twig->render($template, $data);
    }

    public function display(string $template, array $data = []): void
    {
        echo $this->render($template, $data);
    }

    public function getTwig(): Environment
    {
        return $this->twig;
    }
}
