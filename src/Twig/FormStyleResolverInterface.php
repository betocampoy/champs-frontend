<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Twig;

/**
 * Resolves which formStyle ('prefixed'|'inline'|'floating') the
 * ui.input/ui.select macros should use when rendered through the
 * champs-frontend Symfony form theme (templates/form/champs_theme.html.twig).
 *
 * Each consuming Symfony app provides its own implementation (e.g. reading
 * the logged-in user's preference) and binds it to this interface. When no
 * implementation is bound, NullFormStyleResolver is used as a safe default.
 */
interface FormStyleResolverInterface
{
    public function resolve(): string;
}
