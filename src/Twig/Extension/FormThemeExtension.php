<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Twig\Extension;

use BetoCampoy\Champs\Frontend\Twig\FormStyleResolverInterface;
use BetoCampoy\Champs\Frontend\Twig\NullFormStyleResolver;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/** Backs templates/form/champs_theme.html.twig — exposes champs_form_style() to the theme's row blocks. */
final class FormThemeExtension extends AbstractExtension
{
    public function __construct(private readonly ?FormStyleResolverInterface $resolver = null)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('champs_form_style', [$this, 'formStyle']),
        ];
    }

    public function formStyle(): string
    {
        return ($this->resolver ?? new NullFormStyleResolver())->resolve();
    }
}
