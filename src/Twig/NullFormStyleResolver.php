<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Twig;

/** Default resolver used when the consuming app doesn't bind its own — matches ui.input/ui.select's own default. */
final class NullFormStyleResolver implements FormStyleResolverInterface
{
    public function resolve(): string
    {
        return 'prefixed';
    }
}
