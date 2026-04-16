<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend;

final class Package
{
    public static function rootPath(): string
    {
        return dirname(__DIR__);
    }

    public static function templatesPath(): string
    {
        return self::rootPath() . '/templates';
    }

    public static function assetsPath(): string
    {
        return self::rootPath() . '/assets';
    }
}
